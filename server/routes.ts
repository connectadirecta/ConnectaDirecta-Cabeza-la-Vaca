import type { Express } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertUserSchema, insertReminderSchema, insertMessageSchema, insertActivitySchema, insertChatSessionSchema } from "@shared/schema";
import { z } from "zod";
import { generateAIResponse } from "./openai";
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, municipalityId } = req.body;
      const user = await storage.getUserByUsername(username);

      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      // Validate municipality access
      if (municipalityId && user.municipalityId && user.municipalityId !== municipalityId) {
        return res.status(403).json({ message: "No tiene acceso a este municipio" });
      }

      await storage.updateUserActivity(user.id);
      await storage.createActivity({
        userId: user.id,
        activityType: "login",
        description: `Inicio de sesión ${user.role}`,
      });

      res.json({ user: { ...user, passwordHash: undefined, pinHash: undefined } });
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/auth/login-pin", async (req, res) => {
    try {
      const { pin, username, municipalityId } = req.body;
      let user = null;

      if (username) {
        // If username is provided, find user by username first
        user = await storage.getUserByUsername(username);
        if (user && user.pinHash && !bcrypt.compareSync(pin, user.pinHash)) {
          return res.status(401).json({ message: "PIN inválido para este usuario" });
        }
      } else {
        // If no username, search all elderly users for matching PIN
        const users = await storage.getAllElderlyUsers();
        user = users.find(u => u.pinHash && bcrypt.compareSync(pin, u.pinHash));
      }

      if (!user) {
        return res.status(401).json({ message: "PIN inválido" });
      }

      // Validate municipality access
      if (municipalityId && user.municipalityId && user.municipalityId !== municipalityId) {
        return res.status(403).json({ message: "No tiene acceso a este municipio" });
      }

      await storage.updateUserActivity(user.id);
      await storage.createActivity({
        userId: user.id,
        activityType: "login",
        description: "Inicio de sesión con PIN",
      });

      res.json({ user: { ...user, passwordHash: undefined, pinHash: undefined } });
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.json({ ...user, passwordHash: undefined, pinHash: undefined });
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllElderlyUsers();
      const sanitizedUsers = users.map(user => ({ ...user, passwordHash: undefined, pinHash: undefined }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Get users assigned to a specific professional
  app.get("/api/professional/:professionalId/users", async (req, res) => {
    try {
      console.log(`[DEBUG] API Route - Getting users for professional: ${req.params.professionalId}`);
      
      // Get all users assigned to this professional
      const users = await storage.getAssignedElderlyUsers(req.params.professionalId);
      
      console.log(`[DEBUG] API Route - Retrieved ${users.length} users from storage`);
      
      // Get professional info for logging
      const professional = await storage.getUser(req.params.professionalId);
      console.log(`[DEBUG] API Route - Professional municipalityId: ${professional?.municipalityId}`);
      
      // Log municipality info for each user
      users.forEach(user => {
        console.log(`[DEBUG] API Route - User ${user.firstName} ${user.lastName}: municipalityId=${user.municipalityId}, matches professional=${user.municipalityId === professional?.municipalityId}`);
      });
      
      // Mostrar todos los usuarios asignados, sin filtrar por municipio
      const sanitizedUsers = users.map(user => {
        console.log(`[DEBUG] API Route - User ${user.firstName} ${user.lastName} (${user.id}): personalConsent=${user.personalConsent} (${typeof user.personalConsent}), familyConsent=${user.familyConsent} (${typeof user.familyConsent})`);
        return {
          ...user,
          passwordHash: undefined,
          pinHash: undefined
        };
      });
      
      const consentedCount = sanitizedUsers.filter(u => u.personalConsent === true).length;
      console.log(`[DEBUG] API Route - Total users fetched: ${sanitizedUsers.length}, with personalConsent=true: ${consentedCount}`);
      console.log(`[DEBUG] API Route - Users with personalConsent=true:`, sanitizedUsers.filter(u => u.personalConsent === true).map(u => `${u.firstName} ${u.lastName} (${u.id})`));
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching professional users:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Get appointments for this week for professional users
  app.get("/api/professional/:professionalId/appointments", async (req, res) => {
    try {
      const users = await storage.getAssignedElderlyUsers(req.params.professionalId);
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
      const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

      const appointments = [];

      for (const user of users) {
        // Query reminders from database directly for this user
        const userAppointments = await db.execute(sql`
          SELECT r.*, u.first_name, u.last_name
          FROM reminders r
          INNER JOIN users u ON r.user_id = u.id
          WHERE r.user_id = ${user.id}
          AND r.type = 'appointment'
          AND r.is_active = true
          AND r.reminder_date IS NOT NULL
          AND r.reminder_date >= ${startOfWeekStr}
          AND r.reminder_date <= ${endOfWeekStr}
          ORDER BY r.reminder_date, r.reminder_time
        `);

        for (const row of userAppointments.rows) {
          appointments.push({
            id: row.id,
            title: row.title,
            description: row.description,
            date: row.reminder_date,
            time: row.reminder_time,
            userName: `${row.first_name} ${row.last_name}`,
            userId: user.id
          });
        }
      }

      res.json(appointments);
    } catch (error) {
      console.error("Error getting appointments:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Update user information
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updates = req.body;
      const updatedUser = await storage.updateUser(req.params.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.json({ ...updatedUser, passwordHash: undefined, pinHash: undefined });
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Update user PIN
  app.patch("/api/users/:id/pin", async (req, res) => {
    try {
      const { pin } = req.body;

      if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ message: "PIN debe ser 4 dígitos" });
      }

      // Check if PIN is unique
      if (storage.isPinUnique) {
        const isUnique = await storage.isPinUnique(pin, req.params.id);
        if (!isUnique) {
          return res.status(400).json({ message: "Este PIN ya está en uso por otro usuario" });
        }
      }

      const pinHash = await bcrypt.hash(pin, 10);
      const updatedUser = await storage.updateUser(req.params.id, { pinHash });

      if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.json({ message: "PIN actualizado exitosamente" });
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Get user consents
  app.get("/api/users/me/consents/:userId", async (req, res) => {
    try {
      console.log("[ConsentAPI] GET /api/users/me/consents/:userId - userId:", req.params.userId);
      
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        console.log("[ConsentAPI] User not found for userId:", req.params.userId);
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      console.log("[ConsentAPI] Found user:", {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        familyConsent: user.familyConsent,
        personalConsent: user.personalConsent
      });

      const response = {
        familyConsent: user.familyConsent || false,
        personalConsent: user.personalConsent || false
      };

      console.log("[ConsentAPI] Sending response:", response);
      res.json(response);
    } catch (error) {
      console.error("[ConsentAPI] Error getting user consents:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Update user consents
  app.put("/api/users/me/consents", async (req, res) => {
    try {
      const { userId, familyConsent, personalConsent } = req.body;
      
      console.log("[ConsentAPI] PUT /api/users/me/consents - Request body:", {
        userId,
        familyConsent,
        personalConsent
      });

      if (!userId) {
        console.log("[ConsentAPI] Missing userId in request");
        return res.status(400).json({ message: "userId es requerido" });
      }

      const updateData = {
        familyConsent: familyConsent === true,
        personalConsent: personalConsent === true
      };

      console.log("[ConsentAPI] Updating user with data:", updateData);

      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        console.log("[ConsentAPI] User not found for update, userId:", userId);
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      console.log("[ConsentAPI] User updated successfully:", {
        id: updatedUser.id,
        familyConsent: updatedUser.familyConsent,
        personalConsent: updatedUser.personalConsent
      });

      const response = {
        familyConsent: updatedUser.familyConsent,
        personalConsent: updatedUser.personalConsent
      };

      console.log("[ConsentAPI] Sending update response:", response);
      res.json(response);
    } catch (error) {
      console.error("[ConsentAPI] Error updating user consents:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Register new family user
  app.post("/api/family/register", async (req, res) => {
    try {
      const { firstName, lastName, username, password, elderlyUserName } = req.body;
      console.log("Family registration attempt:", { firstName, lastName, username, elderlyUserName });

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      console.log("Existing user check:", { username, exists: !!existingUser });
      if (existingUser) {
        console.log("User already exists:", existingUser);
        return res.status(400).json({ message: "Este usuario ya existe" });
      }

      // Check if elderly user exists - try by username first, then by firstName if not found
      console.log("Searching for elderly user:", elderlyUserName);
      let elderlyUser = await storage.getUserByUsername(elderlyUserName);
      console.log("Elderly user by username:", elderlyUser);
      if (!elderlyUser) {
        // Try to find by firstName as a fallback
        const allElderlyUsers = await storage.getAllElderlyUsers();
        console.log("All elderly users:", allElderlyUsers.map(u => ({ username: u.username, firstName: u.firstName })));
        elderlyUser = allElderlyUsers.find(user => 
          user.firstName?.toLowerCase() === elderlyUserName.toLowerCase() ||
          user.username?.toLowerCase() === elderlyUserName.toLowerCase()
        );
        console.log("Elderly user found by search:", elderlyUser);
      }

      if (!elderlyUser || elderlyUser.role !== "elderly") {
        console.log("Elderly user validation failed:", { elderlyUser, role: elderlyUser?.role });
        return res.status(400).json({ message: "El usuario anciano no existe. Verifique el nombre de usuario o nombre completo." });
      }

      console.log("Creating family user for elderly:", { elderlyUserId: elderlyUser.id, elderlyName: elderlyUser.firstName + " " + elderlyUser.lastName });

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create family user with the same municipality as the elderly user
      console.log("Creating family user with data:", {
        username,
        role: "family",
        firstName,
        lastName,
        municipalityId: elderlyUser.municipalityId,
        preferences: { elderlyUserId: elderlyUser.id }
      });

      const newUser = await storage.createUser({
        username,
        passwordHash,
        role: "family",
        firstName,
        lastName,
        municipalityId: elderlyUser.municipalityId,
        preferences: { elderlyUserId: elderlyUser.id },
        timezone: "Europe/Madrid",
        locale: "es-ES",
        isActive: true
      });

      console.log("Family user created successfully:", { id: newUser.id, username: newUser.username });

      // Family assignment relationship is already stored in user preferences
      console.log("Family registration completed successfully - relationship stored in user preferences");
      res.json({ user: { ...newUser, passwordHash: undefined } });
    } catch (error) {
      console.error("Error creating family user:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Municipality routes
  app.get("/api/municipalities", async (req, res) => {
    try {
      const municipalitiesList = await storage.getAllMunicipalities();
      res.json(municipalitiesList);
    } catch (error) {
      console.error("Error getting municipalities:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/municipalities/:id", async (req, res) => {
    try {
      const municipality = await storage.getMunicipality(req.params.id);
      if (!municipality) {
        return res.status(404).json({ message: "Municipio no encontrado" });
      }
      res.json(municipality);
    } catch (error) {
      console.error("Error getting municipality:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/municipalities", async (req, res) => {
    try {
      const { name, photoData } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "El nombre es obligatorio" });
      }

      const municipality = await storage.createMunicipality({
        name,
        photoUrl: photoData,
      });

      res.json(municipality);
    } catch (error) {
      console.error("Error creating municipality:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.put("/api/municipalities/:id", async (req, res) => {
    try {
      const { name, photoData } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "El nombre es obligatorio" });
      }

      const municipality = await storage.updateMunicipality(req.params.id, {
        name,
        photoUrl: photoData,
      });

      if (!municipality) {
        return res.status(404).json({ message: "Municipio no encontrado" });
      }

      res.json(municipality);
    } catch (error) {
      console.error("Error updating municipality:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.delete("/api/municipalities/:id", async (req, res) => {
    try {
      const municipalityId = req.params.id;

      // Eliminar todos los datos asociados al municipio
      await storage.deleteMunicipalityData(municipalityId);

      res.json({ message: "Municipio y todos sus datos eliminados correctamente" });
    } catch (error) {
      console.error("Error deleting municipality:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Register new professional user
  app.post("/api/professional/register", async (req, res) => {
    try {
      const { firstName, lastName, username, password, municipality, municipalityId } = req.body;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Este usuario ya existe" });
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create professional user
      const newUser = await storage.createUser({
        username,
        passwordHash,
        role: "professional",
        firstName,
        lastName,
        municipalityId,
        preferences: { municipality },
        timezone: "Europe/Madrid",
        locale: "es-ES",
        isActive: true
      });

      res.json({ user: { ...newUser, passwordHash: undefined } });
    } catch (error) {
      console.error("Error creating professional:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Check and create professional assignments for debugging
  app.post("/api/professional/:professionalId/assign-all-users", async (req, res) => {
    try {
      const professionalId = req.params.professionalId;
      console.log(`[DEBUG] Creating assignments for professional: ${professionalId}`);
      
      // Get all elderly users
      const elderlyUsers = await storage.getAllElderlyUsers();
      console.log(`[DEBUG] Found ${elderlyUsers.length} elderly users to assign`);
      
      let assignmentsCreated = 0;
      
      for (const user of elderlyUsers) {
        try {
          await storage.assignUserToProfessional(professionalId, user.id);
          assignmentsCreated++;
          console.log(`[DEBUG] Assigned user ${user.firstName} ${user.lastName} (${user.id}) to professional`);
        } catch (error) {
          console.log(`[DEBUG] Assignment for user ${user.firstName} ${user.lastName} already exists or failed:`, error.message);
        }
      }
      
      res.json({ 
        message: `Created ${assignmentsCreated} new assignments out of ${elderlyUsers.length} elderly users`,
        assignmentsCreated,
        totalElderlyUsers: elderlyUsers.length
      });
    } catch (error) {
      console.error("Error creating professional assignments:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Create new elderly user (by professional)
  app.post("/api/professional/create-elderly-user", async (req, res) => {
    try {
      const { professionalId, municipalityId, pin, ...userData } = req.body;

      console.log("Creating elderly user with professional assignment:", { professionalId, municipalityId, userData: { ...userData, pin: '****' } });

      if (!professionalId) {
        return res.status(400).json({ message: "professionalId es requerido" });
      }

      // Hash the PIN
      const pinHash = await bcrypt.hash(pin, 10);

      // Create user with the same municipality as the professional
      const newUser = await storage.createUser({
        ...userData,
        municipalityId,
        pinHash,
        passwordHash: "$2b$10$dummy.hash.for.elderly.users",
        role: "elderly",
        isActive: true,
        timezone: "Europe/Madrid",
        locale: "es-ES"
      });

      console.log("User created successfully:", { id: newUser.id, username: newUser.username, municipalityId: newUser.municipalityId });

      // Assign to professional - this is critical for the user to appear in the professional's panel
      try {
        await storage.assignUserToProfessional(professionalId, newUser.id);
        console.log("Professional assignment created successfully:", { professionalId, elderlyUserId: newUser.id });
      } catch (assignmentError) {
        console.error("Error creating professional assignment:", assignmentError);
        // If assignment fails, delete the created user to maintain consistency
        await db.execute(sql`DELETE FROM users WHERE id = ${newUser.id}`);
        return res.status(500).json({ message: "Error al asignar el usuario al profesional" });
      }

      res.json({ ...newUser, passwordHash: undefined, pinHash: undefined });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Reminder routes
  app.get("/api/reminders/:userId", async (req, res) => {
    try {
      // Verificar si el usuario que hace la petición es profesional accediendo a recordatorios
      const requestingUserRole = req.headers['user-role'];
      const requestingUserId = req.headers['user-id'];

      if (requestingUserRole === 'professional' && requestingUserId !== req.params.userId) {
        // Solo aplicar filtro de consentimiento cuando un profesional accede a recordatorios de otro usuario
        const targetUser = await storage.getUser(req.params.userId);
        if (!targetUser?.personalConsent) {
          return res.json([]); // Devolver array vacío si no hay consentimiento
        }
      }

      const reminders = await storage.getReminders(req.params.userId);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/reminders/:userId/today", async (req, res) => {
    try {
      const reminders = await storage.getTodayReminders(req.params.userId);
      const completions = await storage.getTodayCompletions(req.params.userId);

      // Mark which reminders are completed today
      const remindersWithCompletion = reminders.map(reminder => {
        const completion = completions.find(c => c.reminderId === reminder.id);
        return {
          ...reminder,
          completedToday: !!completion,
          completionDetails: completion
        };
      });

      res.json(remindersWithCompletion);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/reminders/:userId/upcoming", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 14;
      const reminders = await storage.getUpcomingReminders(req.params.userId, days);
      res.json(reminders);
    } catch (error) {
      console.error("Error getting upcoming reminders:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/reminders/:reminderId/complete", async (req, res) => {
    try {
      const { userId, completedBy, notes } = req.body;

      if (!userId || !completedBy) {
        return res.status(400).json({ message: "userId y completedBy son requeridos" });
      }

      const completion = await storage.markReminderComplete(
        req.params.reminderId,
        userId,
        completedBy,
        notes
      );

      res.json(completion);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/reminders/:userId/completions", async (req, res) => {
    try {
      const { from, to } = req.query;
      let dateRange;

      if (from && to) {
        dateRange = {
          from: new Date(from as string),
          to: new Date(to as string)
        };
      }

      const completions = await storage.getReminderCompletions(req.params.userId, dateRange);
      res.json(completions);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/reminders/:userId/stats", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const stats = await storage.getReminderCompletionStats(req.params.userId, days);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Help alert endpoint
  app.post("/api/help/alert", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "userId es requerido" });
      }

      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Create activity log
      await storage.createActivity({
        userId,
        activityType: "health_alert",
        description: `${user.firstName} ${user.lastName} ha solicitado ayuda urgente`,
      });

      // Find professional users and create messages for them
      const professionals = await storage.getUsersByRole("professional");
      for (const professional of professionals) {
        await storage.createMessage({
          fromUserId: userId,
          toUserId: professional.id,
          content: `⚠️ ALERTA DE AYUDA: ${user.firstName} ${user.lastName} ha solicitado ayuda urgente. Por favor, contacte inmediatamente.`,
        });
      }

      res.status(201).json({ 
        message: "Alerta enviada al personal profesional",
        notifiedCount: professionals.length 
      });
    } catch (error) {
      console.error("Error sending help alert:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Get help alerts for professional
  app.get("/api/professional/:professionalId/alerts", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.professionalId);
      const alerts = messages.filter((msg: any) => 
        msg.content.includes("⚠️ ALERTA DE AYUDA") && !msg.isRead
      );
      res.json(alerts);
    } catch (error) {
      console.error("Error getting alerts:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Dismiss alert (mark as read)
  app.patch("/api/alerts/:alertId/dismiss", async (req, res) => {
    try {
      const message = await storage.markMessageAsRead(req.params.alertId);
      if (!message) {
        return res.status(404).json({ message: "Alerta no encontrada" });
      }
      res.json({ message: "Alerta eliminada correctamente" });
    } catch (error) {
      console.error("Error dismissing alert:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/reminders", async (req, res) => {
    try {
      console.log("Creating reminder with data:", req.body);

      // Validate required fields manually first
      const { title, reminderTime, userId, type } = req.body;
      if (!title || !reminderTime || !userId || !type) {
        return res.status(400).json({ 
          message: "Faltan campos requeridos", 
          missing: { title: !title, reminderTime: !reminderTime, userId: !userId, type: !type }
        });
      }

      const reminderData = {
        title,
        description: req.body.description || "",
        reminderTime,
        reminderDate: req.body.reminderDate || null,
        userId,
        type,
        isActive: true,
        createdBy: req.body.createdBy || userId,
        recurrence: req.body.recurrence || null
      };

      console.log("Processed reminder data:", reminderData);

      const reminder = await storage.createReminder(reminderData);
      console.log("Created reminder:", reminder);

      await storage.createActivity({
        userId: reminderData.userId,
        activityType: "reminder_created",
        description: `Recordatorio creado: ${reminder.title}`,
      });

      res.json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error del servidor", error: String(error) });
    }
  });

  app.patch("/api/reminders/:id", async (req, res) => {
    try {
      const reminder = await storage.updateReminder(req.params.id, req.body);
      if (!reminder) {
        return res.status(404).json({ message: "Recordatorio no encontrado" });
      }
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.delete("/api/reminders/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReminder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Recordatorio no encontrado" });
      }
      res.json({ message: "Recordatorio eliminado" });
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Message routes
  app.get("/api/messages/:userId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.patch("/api/messages/:messageId", async (req, res) => {
    try {
      const { isRead } = req.body;
      if (isRead) {
        const message = await storage.markMessageAsRead(req.params.messageId);

        if (message) {
          await storage.createActivity({
            userId: message.toUserId,
            activityType: "message_read",
            description: "Mensaje leído",
          });
          res.json(message);
        } else {
          res.status(404).json({ message: "Mensaje no encontrado" });
        }
      } else {
        res.json({ message: "No message update required" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = req.body;

      // Validate the data
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);

      // Log activity for the recipient
      await storage.createActivity({
        userId: message.toUserId,
        activityType: "message_received",
        description: `Nuevo mensaje de familia recibido`,
      });

      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Activity routes
  app.get("/api/activities/:userId", async (req, res) => {
    try {
      const activities = await storage.getActivities(req.params.userId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Get all activities for professional dashboard
  app.get("/api/activities/all", async (req, res) => {
    try {
      const allActivities = await storage.getAllActivities();
      res.json(allActivities);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      console.log("Creating activity with data:", req.body);
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      console.log("Activity created successfully:", activity);
      res.json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Chat routes
  app.get("/api/chat/:userId", async (req, res) => {
    try {
      const sessions = await storage.getChatSessions(req.params.userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);

      await storage.createActivity({
        userId: sessionData.userId,
        activityType: "chat",
        description: `Conversación con asistente IA (${sessionData.duration || 0} minutos)`,
      });

      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // AI Chat endpoint
  app.post("/api/chat/ai", async (req, res) => {
    try {
      const { userId, message, messageHistory, sessionId } = req.body;
      const startTime = Date.now();

      if (!userId || !message) {
        return res.status(400).json({ message: "userId y message son requeridos" });
      }

      // Get user data for AI context
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Generate AI response with user context
      const aiResponse = await generateAIResponse(message, {
        user,
        messageHistory: messageHistory || []
      });

      const responseTime = Date.now() - startTime;

      // Update user activity
      await storage.updateUserActivity(userId);

      // Log activity with more detail
      const topic = detectTopicFromMessage(message);
      await storage.createActivity({
        userId,
        activityType: "chat",
        description: `Conversación con asistente IA - ${topic}`,
      });

      // Check for health alerts in the message
      const healthAlert = detectHealthAlert(message);
      if (healthAlert) {
        await storage.createActivity({
          userId,
          activityType: "health_alert",
          description: `Alerta de salud detectada: ${healthAlert}`,
        });
      }

      // Capture AI interaction metrics
      await storage.createMetricsEvent({
        userId,
        eventCategory: "ai_interaction",
        eventType: "chat_response",
        eventData: {
          topic,
          messageLength: message.length,
          responseLength: aiResponse.length,
          hasHealthAlert: !!healthAlert,
          responseTimeMs: responseTime
        },
        duration: responseTime,
        success: true
      });

      // Capture AI quality analytics
      await storage.createAnalytics({
        userId,
        userRole: user.role,
        metricType: "ai_quality",
        metricName: "response_time",
        metricValue: responseTime,
        metadata: {
          topic,
          messageComplexity: message.length > 100 ? "complex" : "simple",
          healthAlert: !!healthAlert
        }
      });

      // Track cognitive exercises if detected
      if (topic === "Ejercicio cognitivo") {
        await storage.createMetricsEvent({
          userId,
          eventCategory: "cognitive",
          eventType: "exercise_completed",
          eventData: { exerciseType: "memory" },
          success: true
        });
      }

      res.json({ 
        response: aiResponse,
        healthAlert: healthAlert 
      });
    } catch (error) {
      console.error("Error in AI chat:", error);

      // Log error metrics
      if (req.body.userId) {
        await storage.createMetricsEvent({
          userId: req.body.userId,
          eventCategory: "ai_interaction",
          eventType: "chat_error",
          eventData: { error: String(error) },
          success: false,
          errorDetails: String(error)
        });
      }

      res.status(500).json({ message: "Error del servidor en AI chat" });
    }
  });

  // Metrics routes - Aggregated routes must come before parameterized routes
  app.get("/api/metrics/engagement/aggregated", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const professionalId = req.query.professionalId as string;
      const consentOnly = req.query.consentOnly === 'true';

      if (!professionalId) {
        return res.status(400).json({ message: "professionalId is required" });
      }

      // Get all users assigned to this professional
      let users = await storage.getUsersByProfessionalId(professionalId);

      // Filter by personalConsent if requested
      if (consentOnly) {
        users = users.filter(user => user.personalConsent === true);
      }

      if (!users || users.length === 0) {
        return res.json({
          totalSessions: 0,
          totalInteractions: 0,
          cognitiveExercises: 0,
          uniqueActiveDays: 0,
          dailyActiveRate: 0
        });
      }

      let totalSessions = 0;
      let totalInteractions = 0;
      let totalCognitiveExercises = 0;
      let totalUniqueDays = 0;

      // Calculate aggregated metrics for all users
      for (const user of users) {
        const metrics = await storage.calculateEngagementMetrics(user.id, days);
        totalSessions += metrics.totalSessions;
        totalInteractions += metrics.totalInteractions;
        totalCognitiveExercises += metrics.cognitiveExercises;
        totalUniqueDays += metrics.uniqueActiveDays;
      }

      const aggregatedMetrics = {
        totalSessions,
        totalInteractions,
        cognitiveExercises: totalCognitiveExercises,
        uniqueActiveDays: totalUniqueDays,
        dailyActiveRate: totalUniqueDays / (days * users.length)
      };

      res.json(aggregatedMetrics);
    } catch (error) {
      console.error("Error getting aggregated engagement metrics:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/metrics/engagement/:userId", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const metrics = await storage.calculateEngagementMetrics(req.params.userId, days);
      res.json(metrics);
    } catch (error) {
      console.error("Error getting engagement metrics:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/metrics/health/aggregated", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const professionalId = req.query.professionalId as string;
      const consentOnly = req.query.consentOnly === 'true';

      if (!professionalId) {
        return res.status(400).json({ message: "professionalId is required" });
      }

      // Get all users assigned to this professional
      let users = await storage.getUsersByProfessionalId(professionalId);

      // Filter by personalConsent if requested
      if (consentOnly) {
        users = users.filter(user => user.personalConsent === true);
      }

      if (!users || users.length === 0) {
        return res.json({
          medicationAdherence: 0,
          appointmentAttendance: 0,
          totalRemindersCompleted: 0,
          onTimeCompletionRate: 0,
          averageDelayMinutes: 0
        });
      }

      let totalMedicationAdherence = 0;
      let totalAppointmentAttendance = 0;
      let totalRemindersCompleted = 0;
      let totalOnTimeRate = 0;
      let totalDelayMinutes = 0;
      let usersWithData = 0;

      // Calculate aggregated metrics for all users
      for (const user of users) {
        const metrics = await storage.calculateHealthMetrics(user.id, days);
        if (metrics.totalRemindersCompleted > 0) {
          totalMedicationAdherence += metrics.medicationAdherence;
          totalAppointmentAttendance += metrics.appointmentAttendance;
          totalRemindersCompleted += metrics.totalRemindersCompleted;
          totalOnTimeRate += metrics.onTimeCompletionRate;
          totalDelayMinutes += metrics.averageDelayMinutes;
          usersWithData++;
        }
      }

      const aggregatedMetrics = {
        medicationAdherence: usersWithData > 0 ? totalMedicationAdherence / usersWithData : 0,
        appointmentAttendance: usersWithData > 0 ? totalAppointmentAttendance / usersWithData : 0,
        totalRemindersCompleted,
        onTimeCompletionRate: usersWithData > 0 ? totalOnTimeRate / usersWithData : 0,
        averageDelayMinutes: usersWithData > 0 ? totalDelayMinutes / usersWithData : 0
      };

      res.json(aggregatedMetrics);
    } catch (error) {
      console.error("Error getting aggregated health metrics:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/metrics/health/:userId", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const metrics = await storage.calculateHealthMetrics(req.params.userId, days);
      res.json(metrics);
    } catch (error) {
      console.error("Error getting health metrics:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/metrics/ai-quality/aggregated", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const professionalId = req.query.professionalId as string;
      const consentOnly = req.query.consentOnly === 'true';

      if (!professionalId) {
        return res.status(400).json({ message: "professionalId is required" });
      }

      // Get all users assigned to this professional
      let users = await storage.getUsersByProfessionalId(professionalId);

      // Filter by personalConsent if requested
      if (consentOnly) {
        users = users.filter(user => user.personalConsent === true);
      }

      if (!users || users.length === 0) {
        return res.json({
          totalAISessions: 0,
          averageSessionDuration: 0,
          cognitiveExercisesCompleted: 0,
          alertsGenerated: 0,
          emotionalStateDistribution: {},
          engagementRate: 0,
          averageMessagesPerSession: 0,
          averageResponseTime: 0
        });
      }

      let totalAISessions = 0;
      let totalSessionDuration = 0;
      let totalCognitiveExercises = 0;
      let totalAlerts = 0;
      let totalEngagementRate = 0;
      let totalMessagesPerSession = 0;
      let totalResponseTime = 0;
      let usersWithData = 0;
      const emotionalStateDistribution: Record<string, number> = {};

      // Calculate aggregated metrics for all users
      for (const user of users) {
        const metrics = await storage.calculateAIQualityMetrics(user.id, days);
        if (metrics.totalAISessions > 0) {
          totalAISessions += metrics.totalAISessions;
          totalSessionDuration += metrics.averageSessionDuration;
          totalCognitiveExercises += metrics.cognitiveExercisesCompleted;
          totalAlerts += metrics.alertsGenerated;
          totalEngagementRate += metrics.engagementRate;
          totalMessagesPerSession += metrics.averageMessagesPerSession;
          totalResponseTime += metrics.averageResponseTime;
          usersWithData++;

          // Aggregate emotional state distribution
          Object.entries(metrics.emotionalStateDistribution || {}).forEach(([state, count]) => {
            emotionalStateDistribution[state] = (emotionalStateDistribution[state] || 0) + count;
          });
        }
      }

      const aggregatedMetrics = {
        totalAISessions,
        averageSessionDuration: usersWithData > 0 ? totalSessionDuration / usersWithData : 0,
        cognitiveExercisesCompleted: totalCognitiveExercises,
        alertsGenerated: totalAlerts,
        emotionalStateDistribution,
        engagementRate: usersWithData > 0 ? totalEngagementRate / usersWithData : 0,
        averageMessagesPerSession: usersWithData > 0 ? totalMessagesPerSession / usersWithData : 0,
        averageResponseTime: usersWithData > 0 ? totalResponseTime / usersWithData : 0
      };

      res.json(aggregatedMetrics);
    } catch (error) {
      console.error("Error getting aggregated AI quality metrics:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/metrics/ai-quality/:userId", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const metrics = await storage.calculateAIQualityMetrics(req.params.userId, days);
      res.json(metrics);
    } catch (error) {
      console.error("Error getting AI quality metrics:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/metrics/analytics/:userId", async (req, res) => {
    try {
      const { metricType, from, to } = req.query;
      let dateRange;

      if (from && to) {
        dateRange = {
          from: new Date(from as string),
          to: new Date(to as string)
        };
      }

      const analytics = await storage.getAnalytics(
        req.params.userId,
        metricType as string,
        dateRange
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.get("/api/metrics/events/:userId", async (req, res) => {
    try {
      const { eventCategory, from, to } = req.query;
      let dateRange;

      if (from && to) {
        dateRange = {
          from: new Date(from as string),
          to: new Date(to as string)
        };
      }

      const events = await storage.getMetricsEvents(
        req.params.userId,
        eventCategory as string,
        dateRange
      );
      res.json(events);
    } catch (error) {
      console.error("Error getting metrics events:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Get program activities created by professional
  app.get("/api/professional/:professionalId/program-activities", async (req, res) => {
    try {
      const activities = await storage.getProgramActivities(req.params.professionalId);
      res.json(activities);
    } catch (error) {
      console.error("Error getting program activities:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Create new program activity
  app.post("/api/professional/program-activities", async (req, res) => {
    try {
      const { professionalId, ...activityData } = req.body;

      if (!professionalId) {
        return res.status(400).json({ message: "professionalId es requerido" });
      }

      // Get all users assigned to this professional
      const assignedUsers = await storage.getAssignedElderlyUsers(professionalId);

      if (assignedUsers.length === 0) {
        return res.status(400).json({ message: "No hay usuarios asignados a este profesional" });
      }

      // Create the program activity record
      const programActivity = await storage.createProgramActivity({
        ...activityData,
        professionalId,
        assignedUsers: assignedUsers.length
      });

      // Create individual reminders for each assigned user
      for (const user of assignedUsers) {
        const reminderData = {
          userId: user.id,
          title: activityData.title,
          description: `${activityData.description}\n\nInstrucciones: ${activityData.instructions || 'Ver detalles de la actividad'}`,
          reminderTime: activityData.scheduledTime || "09:00",
          reminderDate: activityData.scheduledDate || null,
          type: "activity" as const,
          isActive: true,
          createdBy: professionalId,
          recurrence: activityData.recurrence === "once" ? null : { type: activityData.recurrence }
        };

        await storage.createReminder(reminderData);

        // Create activity log
        await storage.createActivity({
          userId: user.id,
          activityType: "reminder_created",
          description: `Nueva actividad del programa asignada: ${activityData.title}`,
          metadata: {
            programActivityId: programActivity.id,
            activityType: activityData.activityType,
            difficulty: activityData.difficulty,
            instructions: activityData.instructions,
            scheduledDate: activityData.scheduledDate,
            scheduledTime: activityData.scheduledTime
          }
        });
      }

      res.json({
        ...programActivity,
        remindersCreated: assignedUsers.length,
        assignedUserNames: assignedUsers.map(u => `${u.firstName} ${u.lastName}`)
      });
    } catch (error) {
      console.error("Error creating program activity:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Delete program activity
  app.delete("/api/professional/program-activities/:activityId", async (req, res) => {
    try {
      const deleted = await storage.deleteProgramActivity(req.params.activityId);
      if (!deleted) {
        return res.status(404).json({ message: "Actividad no encontrada" });
      }
      res.json({ message: "Actividad eliminada correctamente" });
    } catch (error) {
      console.error("Error deleting program activity:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // Helper functions for chat analysis
  function detectTopicFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("medicina") || lowerMessage.includes("medicamento")) return "Medicación";
    if (lowerMessage.includes("dolor") || lowerMessage.includes("duele")) return "Salud";
    if (lowerMessage.includes("memoria") || lowerMessage.includes("recordar")) return "Ejercicio cognitivo";
    if (lowerMessage.includes("triste") || lowerMessage.includes("solo")) return "Estado emocional";
    if (lowerMessage.includes("familia") || lowerMessage.includes("hijo")) return "Familia";
    return "Conversación general";
  }

  function detectHealthAlert(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("dolor de pecho") || lowerMessage.includes("pecho")) {
      return "Posible dolor de pecho - contactar médico";
    }
    if (lowerMessage.includes("mareado") || lowerMessage.includes("mareo")) {
      return "Mareos reportados - verificar con familiar";
    }
    if (lowerMessage.includes("caí") || lowerMessage.includes("caída")) {
      return "Posible caída - verificar estado físico";
    }
    if (lowerMessage.includes("no puedo respirar") || lowerMessage.includes("falta de aire")) {
      return "Dificultad respiratoria - contactar emergencias";
    }
    if (lowerMessage.includes("confundido") || lowerMessage.includes("no recuerdo nada")) {
      return "Confusión severa - evaluar estado cognitivo";
    }
    return null;
  }

  const httpServer = createServer(app);
  return httpServer;
}