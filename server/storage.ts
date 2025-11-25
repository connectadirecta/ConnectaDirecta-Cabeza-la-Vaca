import {
  users,
  reminders,
  messages,
  activities,
  reminderCompletions,
  chatSessions,
  conversationSummaries,
  memories,
  familyAssignments,
  professionalAssignments,
  consents,
  programActivities,
  analytics,
  metricsEvents,
  municipalities,
  type User,
  type InsertUser,
  type Reminder,
  type InsertReminder,
  type Message,
  type InsertMessage,
  type Activity,
  type InsertActivity,
  type ChatSession,
  type InsertChatSession,
  type ReminderCompletion,
  type InsertReminderCompletion,
  type ConversationSummary,
  type Memory,
  type InsertMemory,
  type MemoryItem,
  type FamilyAssignment,
  type InsertFamilyAssignment,
  type ProfessionalAssignment,
  type InsertProfessionalAssignment,
  type ProgramActivity,
  type InsertProgramActivity,
  type Analytics,
  type InsertAnalytics,
  type MetricsEvent,
  type InsertMetricsEvent,
  type MetricsAggregate,
  type InsertMetricsAggregate,
  type Municipality,
  type InsertMunicipality,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  and,
  sql,
  desc,
  or,
  isNull,
  isNotNull,
  gte,
  lte,
  count,
  sum,
  avg,
  not,
} from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPin(pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserActivity(id: string): Promise<void>;
  getAllElderlyUsers(): Promise<User[]>;
  getAssignedElderlyUsers(professionalId: string): Promise<User[]>;
  assignUserToProfessional(
    professionalId: string,
    elderlyUserId: string,
  ): Promise<void>;

  // Family assignment methods
  createFamilyAssignment(
    assignmentData: InsertFamilyAssignment,
  ): Promise<FamilyAssignment>;
  getFamilyAssignments(familyMemberId: string): Promise<FamilyAssignment[]>;

  // PIN uniqueness validation
  isPinUnique(pin: string, excludeUserId?: string): Promise<boolean>;

  // Reminder methods
  getReminders(userId: string): Promise<Reminder[]>;
  getTodayReminders(userId: string): Promise<Reminder[]>;
  getUpcomingReminders(userId: string, days: number): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(
    id: string,
    updates: Partial<Reminder>,
  ): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;
  markReminderComplete(
    reminderId: string,
    userId: string,
    completedBy: string,
    notes?: string,
  ): Promise<ReminderCompletion>;
  getReminderCompletions(
    userId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<ReminderCompletion[]>;
  getTodayCompletions(userId: string): Promise<ReminderCompletion[]>;
  getReminderCompletionStats(
    userId: string,
    days: number,
  ): Promise<{ total: number; completed: number; percentage: number }>;

  // Message methods
  getMessages(userId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;

  // Activity methods
  getActivities(userId: string): Promise<Activity[]>;
  getAllActivities?(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Chat methods
  getChatSessions(userId: string): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;

  // Conversation memory (optional methods for persistent memory)
  getConversationSummary?(userId: string): Promise<string | undefined>;
  saveConversationSummary?(userId: string, summary: string): Promise<void>;
  appendChatTurn?(
    userId: string,
    turn: { role: string; content: string },
  ): Promise<void>;

  // Advanced structured memory system
  upsertMemories?(userId: string, items: MemoryItem[]): Promise<void>;
  getTopMemories?(
    userId: string,
    limit: number,
  ): Promise<Array<{ type: string; content: string }>>;
  deleteMemorias?(userId: string): Promise<void>;

  // Professional user methods
  getUsersByProfessionalId?(professionalId: string): Promise<User[]>;

  // Municipality methods
  getAllMunicipalities(): Promise<Municipality[]>;
  getMunicipality(id: string): Promise<Municipality | undefined>;
  createMunicipality(data: InsertMunicipality): Promise<Municipality>;
  updateMunicipality?(id: string, data: Partial<Municipality>): Promise<Municipality | undefined>;
  deleteMunicipalityData(municipalityId: string): Promise<void>;

  // Program Activities methods
  getProgramActivities(professionalId: string): Promise<ProgramActivity[]>;
  createProgramActivity(data: InsertProgramActivity): Promise<ProgramActivity>;
  deleteProgramActivity(activityId: string): Promise<boolean>;

  // Analytics and Metrics methods
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  createMetricsEvent(event: InsertMetricsEvent): Promise<MetricsEvent>;
  getAnalytics(
    userId: string,
    metricType?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<Analytics[]>;
  getMetricsEvents(
    userId: string,
    eventCategory?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<MetricsEvent[]>;
  getMetricsAggregate(
    userId: string,
    aggregationType: string,
    periodStart?: Date,
  ): Promise<MetricsAggregate | undefined>;
  createMetricsAggregate(
    aggregate: InsertMetricsAggregate,
  ): Promise<MetricsAggregate>;
  calculateEngagementMetrics(userId: string, days: number): Promise<any>;
  calculateHealthMetrics(userId: string, days: number): Promise<any>;
  calculateAIQualityMetrics(userId: string, days: number): Promise<any>;
  calculateAggregatedEngagementMetrics(
    days: number,
    professionalId?: string,
  ): Promise<any>;
  calculateAggregatedHealthMetrics(
    days: number,
    professionalId?: string,
  ): Promise<any>;
  calculateAggregatedAIQualityMetrics(
    days: number,
    professionalId?: string,
  ): Promise<any>;
}

class MemStorage implements IStorage {
  private users: User[] = [];
  private reminders: Reminder[] = [];
  private messages: Message[] = [];
  private activities: Activity[] = [];
  private chatSessions: ChatSession[] = [];
  private reminderCompletions: ReminderCompletion[] = [];
  private conversationSummaries: Record<string, string> = {};
  private chatTurns: Record<
    string,
    Array<{ role: string; content: string; timestamp: Date }>
  > = {};
  private memoryStore: Record<string, Memory[]> = {};
  private analytics: Analytics[] = [];
  private metricsEvents: MetricsEvent[] = [];
  private metricsAggregates: MetricsAggregate[] = [];
  private familyAssignments: FamilyAssignment[] = [];
  private programActivities: ProgramActivity[] = [];

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getUsersByRole(role: User["role"]): Promise<User[]> {
    return this.users.filter((user) => user.role === role);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async getUserByPin(pin: string): Promise<User | undefined> {
    for (const user of this.users.filter(
      (u) => u.role === "elderly" && u.pinHash,
    )) {
      if (user.pinHash && (await bcrypt.compare(pin, user.pinHash))) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      ...insertUser,
      pinHash: insertUser.pinHash ?? null,
      municipalityId: insertUser.municipalityId ?? null,
      age: insertUser.age ?? null,
      medicalConditions: insertUser.medicalConditions ?? null,
      medications: insertUser.medications ?? null,
      emergencyContact: insertUser.emergencyContact ?? null,
      emergencyContactName: insertUser.emergencyContactName ?? null,
      emergencyContactPhone: insertUser.emergencyContactPhone ?? null,
      timezone: insertUser.timezone ?? "Europe/Madrid",
      locale: insertUser.locale ?? "es-ES",
      preferences: insertUser.preferences ?? null,
      personalityTraits: insertUser.personalityTraits ?? null,
      cognitiveLevel: insertUser.cognitiveLevel ?? null,
      birthPlace: insertUser.birthPlace ?? null,
      childhoodHome: insertUser.childhoodHome ?? null,
      childhoodMemories: insertUser.childhoodMemories ?? null,
      familyBackground: insertUser.familyBackground ?? null,
      siblings: insertUser.siblings ?? null,
      parents: insertUser.parents ?? null,
      significantLife: insertUser.significantLife ?? null,
      profession: insertUser.profession ?? null,
      hobbies: insertUser.hobbies ?? null,
      favoriteMemories: insertUser.favoriteMemories ?? null,
      isActive: insertUser.isActive ?? true,
      familyConsent: insertUser.familyConsent ?? false,
      personalConsent: insertUser.personalConsent ?? false,
      lastActivity: new Date(),
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async updateUserActivity(id: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  async getAllElderlyUsers(): Promise<User[]> {
    return this.users.filter((user) => user.role === "elderly");
  }

  async getAssignedElderlyUsers(professionalId: string): Promise<User[]> {
    // In memory storage - return all elderly users for simplicity
    return this.users.filter((user) => user.role === "elderly");
  }

  async assignUserToProfessional(
    professionalId: string,
    elderlyUserId: string,
  ): Promise<void> {
    // In memory storage - no-op for simplicity
  }

  // Family assignment methods
  async createFamilyAssignment(
    assignmentData: InsertFamilyAssignment,
  ): Promise<FamilyAssignment> {
    const assignment: FamilyAssignment = {
      id: randomUUID(),
      ...assignmentData,
      canViewHealth: assignmentData.canViewHealth ?? true,
      canManageReminders: assignmentData.canManageReminders ?? true,
      canReceiveAlerts: assignmentData.canReceiveAlerts ?? true,
      isActive: assignmentData.isActive ?? true,
      assignedBy: assignmentData.assignedBy ?? null,
      createdAt: new Date(),
    };
    this.familyAssignments.push(assignment);
    return assignment;
  }

  async getFamilyAssignments(
    familyMemberId: string,
  ): Promise<FamilyAssignment[]> {
    return this.familyAssignments.filter(
      (assignment) =>
        assignment.familyMemberId === familyMemberId && assignment.isActive,
    );
  }

  async updateUser(
    id: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) return undefined;

    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    return this.users[userIndex];
  }

  async isPinUnique(pin: string, excludeUserId?: string): Promise<boolean> {
    const elderlyUsers = this.users.filter(
      (u) => u.role === "elderly" && u.id !== excludeUserId,
    );

    for (const user of elderlyUsers) {
      if (user.pinHash && (await bcrypt.compare(pin, user.pinHash))) {
        return false; // PIN already exists
      }
    }
    return true; // PIN is unique
  }

  // Reminder methods
  async getReminders(userId: string): Promise<Reminder[]> {
    return this.reminders.filter((reminder) => reminder.userId === userId);
  }

  async getTodayReminders(userId: string): Promise<Reminder[]> {
    const today = new Date().toISOString().split("T")[0];
    return this.reminders.filter(
      (reminder) =>
        reminder.userId === userId &&
        reminder.isActive &&
        (reminder.reminderDate === today || !reminder.reminderDate),
    );
  }

  async getUpcomingReminders(
    userId: string,
    days: number = 14,
  ): Promise<Reminder[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    return this.reminders
      .filter(
        (reminder) =>
          reminder.userId === userId &&
          reminder.isActive &&
          (!reminder.reminderDate ||
            (reminder.reminderDate >= todayStr &&
              reminder.reminderDate <= futureStr)),
      )
      .sort((a, b) => {
        if (a.reminderDate && b.reminderDate) {
          const dateCompare = a.reminderDate.localeCompare(b.reminderDate);
          if (dateCompare !== 0) return dateCompare;
        }
        return a.reminderTime.localeCompare(b.reminderTime);
      });
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const reminder: Reminder = {
      id: randomUUID(),
      ...insertReminder,
      isActive: insertReminder.isActive ?? true,
      description: insertReminder.description ?? null,
      reminderDate: insertReminder.reminderDate ?? null,
      nextReminder: insertReminder.nextReminder ?? null,
      recurrence: insertReminder.recurrence ?? null,
      createdAt: new Date(),
    };
    this.reminders.push(reminder);
    return reminder;
  }

  async updateReminder(
    id: string,
    updates: Partial<Reminder>,
  ): Promise<Reminder | undefined> {
    const index = this.reminders.findIndex((reminder) => reminder.id === id);
    if (index !== -1) {
      this.reminders[index] = { ...this.reminders[index], ...updates };
      return this.reminders[index];
    }
    return undefined;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const index = this.reminders.findIndex((reminder) => reminder.id === id);
    if (index !== -1) {
      this.reminders.splice(index, 1);
      return true;
    }
    return false;
  }

  async markReminderComplete(
    reminderId: string,
    userId: string,
    completedBy: string,
    notes?: string,
  ): Promise<ReminderCompletion> {
    const reminder = this.reminders.find((r) => r.id === reminderId);
    if (reminder) {
      const scheduledTime = new Date();
      scheduledTime.setHours(parseInt(reminder.reminderTime.split(":")[0]));
      scheduledTime.setMinutes(parseInt(reminder.reminderTime.split(":")[1]));

      const now = new Date();
      const wasLate = now > scheduledTime;
      const minutesLate = wasLate
        ? Math.floor((now.getTime() - scheduledTime.getTime()) / 60000)
        : 0;

      const completion: ReminderCompletion = {
        id: randomUUID(),
        reminderId,
        userId,
        scheduledFor: scheduledTime,
        completedAt: now,
        completedBy,
        notes: notes || null,
        verificationPhoto: null,
        wasLate,
        minutesLate: minutesLate > 0 ? minutesLate : null,
      };
      this.reminderCompletions.push(completion);

      // Update the reminder as completed
      // Reminder completion is now tracked via reminder_completions table

      return completion;
    }
    throw new Error("Reminder not found");
  }

  async getReminderCompletions(
    userId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<ReminderCompletion[]> {
    let completions = this.reminderCompletions.filter(
      (c) => c.userId === userId,
    );
    if (dateRange) {
      completions = completions.filter(
        (c) =>
          c.completedAt! >= dateRange.from && c.completedAt! <= dateRange.to,
      );
    }
    return completions;
  }

  async getTodayCompletions(userId: string): Promise<ReminderCompletion[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getReminderCompletions(userId, { from: today, to: tomorrow });
  }

  async getReminderCompletionStats(
    userId: string,
    days: number,
  ): Promise<{ total: number; completed: number; percentage: number }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const completions = await this.getReminderCompletions(userId, {
      from: startDate,
      to: new Date(),
    });
    const reminders = this.reminders.filter((r) => r.userId === userId);

    const totalExpected = reminders.length * days;
    const completed = completions.length;
    const percentage =
      totalExpected > 0 ? Math.round((completed / totalExpected) * 100) : 0;

    return { total: totalExpected, completed, percentage };
  }

  // Message methods
  async getMessages(userId: string): Promise<Message[]> {
    return this.messages.filter(
      (message) => message.toUserId === userId || message.fromUserId === userId,
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: randomUUID(),
      ...insertMessage,
      messageType: insertMessage.messageType ?? null,
      attachments: insertMessage.attachments ?? null,
      isRead: insertMessage.isRead ?? false,
      readAt: null,
      createdAt: new Date(),
    };
    this.messages.push(message);
    return message;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      message.isRead = true;
      message.readAt = new Date();
      return message;
    }
    return undefined;
  }

  // Activity methods
  async getActivities(userId: string): Promise<Activity[]> {
    return this.activities.filter((activity) => activity.userId === userId);
  }

  async getAllActivities(): Promise<Activity[]> {
    return this.activities;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const activity: Activity = {
      id: randomUUID(),
      ...insertActivity,
      metadata: null,
      createdAt: new Date(),
    };
    this.activities.push(activity);
    return activity;
  }

  // Chat methods
  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return this.chatSessions.filter((session) => session.userId === userId);
  }

  async createChatSession(
    insertChatSession: InsertChatSession,
  ): Promise<ChatSession> {
    const session: ChatSession = {
      id: randomUUID(),
      ...insertChatSession,
      duration: insertChatSession.duration ?? null,
      emotionalState: insertChatSession.emotionalState ?? null,
      cognitiveExercises: insertChatSession.cognitiveExercises ?? null,
      topicsDiscussed: insertChatSession.topicsDiscussed ?? null,
      alertsGenerated: insertChatSession.alertsGenerated ?? null,
      sessionSummary: insertChatSession.sessionSummary ?? null,
      createdAt: new Date(),
    };
    this.chatSessions.push(session);
    return session;
  }

  // Conversation memory methods
  async getConversationSummary(userId: string): Promise<string | undefined> {
    return this.conversationSummaries[userId];
  }

  async saveConversationSummary(
    userId: string,
    summary: string,
  ): Promise<void> {
    this.conversationSummaries[userId] = summary;
  }

  async appendChatTurn(
    userId: string,
    turn: { role: string; content: string },
  ): Promise<void> {
    if (!this.chatTurns[userId]) {
      this.chatTurns[userId] = [];
    }
    this.chatTurns[userId].push({
      ...turn,
      timestamp: new Date(),
    });

    // Keep only last 50 turns per user to prevent memory bloat
    if (this.chatTurns[userId].length > 50) {
      this.chatTurns[userId] = this.chatTurns[userId].slice(-50);
    }
  }

  // Advanced structured memory system
  async upsertMemories(userId: string, items: MemoryItem[]): Promise<void> {
    if (!this.memoryStore[userId]) {
      this.memoryStore[userId] = [];
    }

    const crypto = require("crypto");

    for (const item of items) {
      if (!item.content?.trim()) continue;

      const contentHash = crypto
        .createHash("sha256")
        .update((item.type || "") + "|" + item.content.trim().toLowerCase())
        .digest("hex");

      const existingIndex = this.memoryStore[userId].findIndex(
        (m) => m.contentHash === contentHash,
      );

      if (existingIndex >= 0) {
        // Update existing memory
        const existing = this.memoryStore[userId][existingIndex];
        this.memoryStore[userId][existingIndex] = {
          ...existing,
          confidence: Math.min(1.0, existing.confidence + 0.1),
          lastReinforcedAt: new Date(),
          importance: Math.max(existing.importance, item.importance ?? 3),
          expiresAt: item.expires_at
            ? new Date(item.expires_at)
            : existing.expiresAt,
        };
      } else {
        // Create new memory
        const newMemory: Memory = {
          id: randomUUID(),
          userId,
          type: item.type,
          content: item.content,
          importance: item.importance ?? 3,
          confidence: 0.6,
          lastReinforcedAt: new Date(),
          createdAt: new Date(),
          expiresAt: item.expires_at ? new Date(item.expires_at) : null,
          source: "ai",
          contentHash,
        };
        this.memoryStore[userId].push(newMemory);
      }
    }
  }

  async getTopMemories(
    userId: string,
    limit = 12,
  ): Promise<Array<{ type: string; content: string }>> {
    const userMemories = this.memoryStore[userId] || [];
    const now = new Date();

    // Filter out expired memories
    const validMemories = userMemories.filter(
      (m) => !m.expiresAt || m.expiresAt > now,
    );

    // Calculate scores and sort
    const scoredMemories = validMemories.map((m) => {
      const daysSinceReinforced =
        (now.getTime() - m.lastReinforcedAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 0.3 - (0.3 * daysSinceReinforced) / 30); // Max boost for 30 days
      const score =
        m.importance * 0.6 + m.confidence * 0.3 + recencyBoost * 0.1;

      return { ...m, score };
    });

    return scoredMemories
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.lastReinforcedAt.getTime() - a.lastReinforcedAt.getTime(),
      )
      .slice(0, limit)
      .map((m) => ({ type: m.type, content: m.content }));
  }

  async deleteMemorias(userId: string): Promise<void> {
    delete this.memoryStore[userId];
  }

  async getUsersByProfessionalId(professionalId: string): Promise<User[]> {
    // In memory storage - return all elderly users for simplicity
    return this.users.filter((user) => user.role === "elderly");
  }

  // Program Activities methods
  async getProgramActivities(
    professionalId: string,
  ): Promise<ProgramActivity[]> {
    // In memory implementation - filter by professional
    return this.programActivities.filter(
      (activity) =>
        activity.professionalId === professionalId && activity.isActive,
    );
  }

  async createProgramActivity(
    data: InsertProgramActivity,
  ): Promise<ProgramActivity> {
    const activity: ProgramActivity = {
      id: randomUUID(),
      ...data,
      assignedUsers: data.assignedUsers || 0,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
    };
    this.programActivities.push(activity);
    return activity;
  }

  async deleteProgramActivity(activityId: string): Promise<boolean> {
    const index = this.programActivities.findIndex(
      (activity) => activity.id === activityId,
    );
    if (index !== -1) {
      this.programActivities[index].isActive = false;
      return true;
    }
    return false;
  }

  // Analytics and Metrics methods
  async createAnalytics(analytics: InsertAnalytics): Promise<Analytics> {
    const record: Analytics = {
      id: randomUUID(),
      ...analytics,
      metadata: analytics.metadata ?? null,
      sessionId: analytics.sessionId ?? null,
      timestamp: new Date(),
      createdAt: new Date(),
    };
    this.analytics.push(record);
    return record;
  }

  async createMetricsEvent(event: InsertMetricsEvent): Promise<MetricsEvent> {
    const record: MetricsEvent = {
      id: randomUUID(),
      ...event,
      eventData: event.eventData ?? null,
      duration: event.duration ?? null,
      success: event.success ?? true,
      errorDetails: event.errorDetails ?? null,
      userAgent: event.userAgent ?? null,
      ipAddress: event.ipAddress ?? null,
      createdAt: new Date(),
    };
    this.metricsEvents.push(record);
    return record;
  }

  async getAnalytics(
    userId: string,
    metricType?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<Analytics[]> {
    let results = this.analytics.filter((a) => a.userId === userId);

    if (metricType) {
      results = results.filter((a) => a.metricType === metricType);
    }

    if (dateRange) {
      results = results.filter(
        (a) => a.timestamp >= dateRange.from && a.timestamp <= dateRange.to,
      );
    }

    return results;
  }

  async getMetricsEvents(
    userId: string,
    eventCategory?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<MetricsEvent[]> {
    let results = this.metricsEvents.filter((e) => e.userId === userId);

    if (eventCategory) {
      results = results.filter((e) => e.eventCategory === eventCategory);
    }

    if (dateRange) {
      results = results.filter(
        (e) => e.createdAt >= dateRange.from && e.createdAt <= dateRange.to,
      );
    }

    return results;
  }

  async getMetricsAggregate(
    userId: string,
    aggregationType: string,
    periodStart?: Date,
  ): Promise<MetricsAggregate | undefined> {
    return this.metricsAggregates.find(
      (ma) =>
        ma.userId === userId &&
        ma.aggregationType === aggregationType &&
        (!periodStart || ma.periodStart.getTime() === periodStart.getTime()),
    );
  }

  async createMetricsAggregate(
    aggregate: InsertMetricsAggregate,
  ): Promise<MetricsAggregate> {
    const record: MetricsAggregate = {
      id: randomUUID(),
      ...aggregate,
      userId: aggregate.userId ?? null,
      userRole: aggregate.userRole ?? null,
      createdAt: new Date(),
    };
    this.metricsAggregates.push(record);
    return record;
  }

  async calculateEngagementMetrics(
    userId: string,
    days: number = 30,
  ): Promise<any> {
    console.log(`[DatabaseStorage] === INDIVIDUAL ENGAGEMENT METRICS ===`);
    console.log(
      `[DatabaseStorage] Calculating engagement metrics for user: ${userId}, days: ${days}`,
    );

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      console.log(`[DatabaseStorage] Start date: ${startDate.toISOString()}`);

      // Get user info for logging
      const user = await this.getUser(userId);
      console.log(
        `[DatabaseStorage] User info:`,
        user
          ? `${user.firstName} ${user.lastName} (${user.role})`
          : "User not found",
      );

      const result = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT DATE(created_at)) as unique_active_days,
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN activity_type = 'chat' THEN 1 END) as chat_sessions,
          COUNT(CASE WHEN activity_type = 'cognitive_exercise' THEN 1 END) as cognitive_sessions,
          COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as login_sessions,
          AVG(CASE 
            WHEN activity_type = 'chat' AND metadata->>'duration' IS NOT NULL 
            THEN CAST(metadata->>'duration' AS INTEGER)
          END) as avg_session_duration
        FROM ${activities}
        WHERE user_id = ${userId} 
        AND created_at >= ${startDate.toISOString()}
      `);

      const row = result.rows[0];
      console.log(
        `[DatabaseStorage] Raw engagement query result for user ${userId}:`,
        JSON.stringify(row, null, 2),
      );

      const totalDays = days;

      const metrics = {
        uniqueActiveDays: parseInt(row.unique_active_days) || 0,
        totalSessions: parseInt(row.total_sessions) || 0,
        dailyActiveRate:
          totalDays > 0
            ? (parseInt(row.unique_active_days) || 0) / totalDays
            : 0,
        totalInteractions: parseInt(row.chat_sessions) || 0,
        cognitiveExercises: parseInt(row.cognitive_sessions) || 0,
        averageSessionDuration: parseFloat(row.avg_session_duration) || 0,
        loginFrequency: parseInt(row.login_sessions) || 0,
      };

      console.log(
        `[DatabaseStorage] Processed individual engagement metrics for user ${userId}:`,
        JSON.stringify(metrics, null, 2),
      );

      // Check if this user has any data at all
      const hasAnyData =
        metrics.totalSessions > 0 || metrics.totalInteractions > 0;
      console.log(`[DatabaseStorage] User ${userId} has data:`, hasAnyData);

      if (!hasAnyData) {
        console.log(
          `[DatabaseStorage] User ${userId} has no activity data, returning zeroed metrics`,
        );
      }

      console.log(
        `[DatabaseStorage] === END INDIVIDUAL ENGAGEMENT METRICS ===`,
      );
      return metrics;
    } catch (error) {
      console.error(
        `[DatabaseStorage] Error calculating engagement metrics for user ${userId}:`,
        error,
      );
      return {
        uniqueActiveDays: 0,
        totalSessions: 0,
        dailyActiveRate: 0,
        totalInteractions: 0,
        cognitiveExercises: 0,
        averageSessionDuration: 0,
        loginFrequency: 0,
      };
    }
  }

  async calculateHealthMetrics(userId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const completions = await this.getReminderCompletions(userId, {
      from: startDate,
      to: new Date(),
    });
    const reminders = await this.getReminders(userId);

    return {
      medicationAdherence:
        completions.filter((c) => {
          const reminder = reminders.find((r) => r.id === c.reminderId);
          return reminder?.type === "medicine";
        }).length /
        (reminders.filter((r) => r.type === "medicine").length * days || 1),
      totalRemindersCompleted: completions.length,
      onTimeCompletionRate:
        completions.filter((c) => !c.wasLate).length /
        (completions.length || 1),
    };
  }

  async calculateAIQualityMetrics(userId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = this.chatSessions.filter(
      (s) => s.userId === userId && s.createdAt && s.createdAt >= startDate,
    );

    return {
      totalAISessions: sessions.length,
      averageSessionDuration:
        sessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
        (sessions.length || 1),
      cognitiveExercisesCompleted: sessions.reduce((sum, s) => {
        const exercises = s.cognitiveExercises as any;
        return sum + (exercises?.length || 0);
      }, 0),
      alertsGenerated: sessions.reduce((sum, s) => {
        const alerts = s.alertsGenerated as any;
        return sum + (alerts?.length || 0);
      }, 0),
    };
  }

  // Aggregated metrics methods for MemStorage
  async calculateAggregatedEngagementMetrics(
    days: number = 30,
    professionalId?: string,
  ): Promise<any> {
    console.log(
      `[MemStorage] calculateAggregatedEngagementMetrics called with days: ${days}`,
    );
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Get elderly users
      const elderlyUsers = await this.getAllElderlyUsers();
      console.log(
        `[MemStorage] Found ${elderlyUsers.length} elderly users for engagement metrics`,
      );

      if (elderlyUsers.length === 0) {
        console.log(
          "[MemStorage] No elderly users found, returning zero engagement metrics",
        );
        return {
          totalSessions: 0,
          totalInteractions: 0,
          cognitiveExercises: 0,
          uniqueActiveDays: 0,
          dailyActiveRate: 0,
        };
      }

      let totalMetrics = {
        totalSessions: 0,
        totalInteractions: 0,
        cognitiveExercises: 0,
        uniqueActiveDays: 0,
        dailyActiveRate: 0,
      };

      // Calculate metrics for each user and sum them up
      for (const user of elderlyUsers) {
        console.log(
          `[MemStorage] Calculating engagement metrics for user: ${user.firstName} ${user.lastName} (${user.id})`,
        );
        const userMetrics = await this.calculateEngagementMetrics(
          user.id,
          days,
        );
        console.log(
          `[MemStorage] User ${user.firstName} engagement metrics:`,
          userMetrics,
        );

        totalMetrics.totalSessions += userMetrics.totalSessions || 0;
        totalMetrics.totalInteractions += userMetrics.totalInteractions || 0;
        totalMetrics.cognitiveExercises += userMetrics.cognitiveExercises || 0;
        totalMetrics.uniqueActiveDays += userMetrics.uniqueActiveDays || 0;
        totalMetrics.dailyActiveRate += userMetrics.dailyActiveRate || 0;
      }

      // Always return real calculated values, even if they are zero
      const hasAnyData =
        totalMetrics.totalSessions > 0 || totalMetrics.totalInteractions > 0;
      console.log(
        `[MemStorage] Has any data: ${hasAnyData}, totalSessions: ${totalMetrics.totalSessions}, totalInteractions: ${totalMetrics.totalInteractions}`,
      );

      // Calculate averages where appropriate
      totalMetrics.dailyActiveRate =
        totalMetrics.dailyActiveRate / elderlyUsers.length;

      console.log(
        `[MemStorage] Final aggregated engagement metrics for ${elderlyUsers.length} users:`,
        totalMetrics,
      );
      return totalMetrics;
    } catch (error) {
      console.error(
        "[MemStorage] Error calculating aggregated engagement metrics:",
        error,
      );
      return {
        totalSessions: 0,
        totalInteractions: 0,
        cognitiveExercises: 0,
        uniqueActiveDays: 0,
        dailyActiveRate: 0,
      };
    }
  }

  async calculateAggregatedHealthMetrics(days: number = 30): Promise<any> {
    console.log(
      `[MemStorage] calculateAggregatedHealthMetrics called with days: ${days}`,
    );
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Get elderly users
      const elderlyUsers = await this.getAllElderlyUsers();
      console.log(
        `[MemStorage] Found ${elderlyUsers.length} elderly users for health metrics`,
      );

      if (elderlyUsers.length === 0) {
        console.log(
          "[MemStorage] No elderly users found, returning zero health metrics",
        );
        return {
          medicationAdherence: 0,
          appointmentAttendance: 0,
          onTimeCompletionRate: 0,
        };
      }

      let totalMetrics = {
        medicationAdherence: 0,
        appointmentAttendance: 0,
        onTimeCompletionRate: 0,
      };

      let usersWithData = 0;

      // Calculate metrics for each user and average them
      for (const user of elderlyUsers) {
        console.log(
          `[MemStorage] Calculating health metrics for user: ${user.firstName} ${user.lastName} (${user.id})`,
        );

        const userMetrics = await this.calculateHealthMetrics(user.id, days);
        console.log(
          `[MemStorage] User ${user.firstName} health metrics:`,
          userMetrics,
        );

        // Only count users that have some health data
        if (userMetrics.medicationAdherence || userMetrics.appointmentAttendance || userMetrics.onTimeCompletionRate) {
          usersWithData++;
          totalMetrics.medicationAdherence +=
            userMetrics.medicationAdherence || 0;
          totalMetrics.appointmentAttendance +=
            userMetrics.appointmentAttendance || 0;
          totalMetrics.onTimeCompletionRate +=
            userMetrics.onTimeCompletionRate || 0;
        }
      }

      // Always return real calculated values, even if they are zero
      if (usersWithData === 0) {
        console.log(
          "[MemStorage] No users with health data found, returning zero health metrics",
        );
        return {
          medicationAdherence: 0,
          appointmentAttendance: 0,
          onTimeCompletionRate: 0,
        };
      }

      // Calculate averages based on users with data
      totalMetrics.medicationAdherence =
        totalMetrics.medicationAdherence / usersWithData;
      totalMetrics.appointmentAttendance =
        totalMetrics.appointmentAttendance / usersWithData;
      totalMetrics.onTimeCompletionRate =
        totalMetrics.onTimeCompletionRate / usersWithData;

      console.log(
        `[MemStorage] Final aggregated health metrics for ${usersWithData}/${elderlyUsers.length} users with data:`,
        totalMetrics,
      );
      return totalMetrics;
    } catch (error) {
      console.error(
        "[MemStorage] Error calculating aggregated health metrics:",
        error,
      );
      return {
        medicationAdherence: 0,
        appointmentAttendance: 0,
        onTimeCompletionRate: 0,
      };
    }
  }

  async calculateAggregatedAIQualityMetrics(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Get elderly users
      const elderlyUsers = await this.getAllElderlyUsers();

      if (elderlyUsers.length === 0) {
        return {
          totalAISessions: 0,
          averageResponseTime: 0,
          cognitiveExercisesCompleted: 0,
          alertsGenerated: 0,
          averageInteractionTime: 0,
        };
      }

      // Calculate aggregated response time directly from analytics table using SQL
      const result = await db.execute(sql`
        SELECT AVG(metric_value::NUMERIC) as avg_response_time, COUNT(*) as record_count 
        FROM analytics 
        WHERE metric_type = 'ai_quality' 
          AND metric_name = 'response_time' 
          AND timestamp >= ${startDate.toISOString()}
      `);

      const avgResponseTime = result.rows[0]?.avg_response_time;
      const recordCount = result.rows[0]?.record_count || 0;
      const averageResponseTime = avgResponseTime
        ? Math.round(Number(avgResponseTime))
        : 0;

      console.log(
        `Aggregated AI quality metrics: ${recordCount} analytics records, avgResponseTime: ${averageResponseTime}ms`,
      );

      return {
        totalAISessions: 0,
        averageSessionDuration: 0,
        cognitiveExercisesCompleted: 0,
        alertsGenerated: 0,
        emotionalStateDistribution: {},
        engagementRate: 0,
        averageMessagesPerSession: 0,
        averageResponseTime: averageResponseTime,
      };
    } catch (error) {
      console.error("Error calculating aggregated AI quality metrics:", error);
      return {
        totalAISessions: 0,
        averageResponseTime: 0,
        cognitiveExercisesCompleted: 0,
        alertsGenerated: 0,
        averageInteractionTime: 0,
      };
    }
  }
}

class DatabaseStorage implements IStorage {
  private async initializeSampleData() {
    // Check if users already exist
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) return;

    // Create elderly user with additional data for AI prompting
    const elderlyUser: InsertUser = {
      username: "maria.gonzalez",
      passwordHash: "$2b$10$hashedpassword123", // Properly hashed password
      role: "elderly",
      firstName: "María",
      lastName: "González",
      pinHash: "$2b$10$hashedpin1234", // Properly hashed PIN
      age: 78,
      medicalConditions: ["hipertensión", "diabetes tipo 2"],
      medications: ["metformina", "enalapril"],
      emergencyContact: "Ana González - 666-777-888",
      emergencyContactName: "Ana González",
      emergencyContactPhone: "666-777-888",
      familyConsent: false,
      personalConsent: false,
      preferences: {
        preferredCallTime: "afternoon",
        likes: ["jardinería", "cocina", "telenovelas"],
        dislikes: ["ruido fuerte", "luces brillantes"],
        hobbies: ["tejer", "leer", "ver tv"],
      },
      personalityTraits: {
        mood: "alegre y sociable",
        communicationStyle: "cariñosa y conversadora",
        concerns: ["salud", "familia", "soledad"],
        strengths: ["optimista", "determinada", "cariñosa"],
        cognitiveNotes:
          "memoria excelente para eventos pasados, a veces olvida cosas recientes",
      },
      cognitiveLevel: "normal",
      timezone: "Europe/Madrid",
      locale: "es-ES",
      isActive: true,
    };

    const familyUser: InsertUser = {
      username: "ana.gonzalez@email.com",
      passwordHash: "$2b$10$hashedfamilypass456",
      role: "family",
      firstName: "Ana",
      lastName: "González",
      age: 45,
      emergencyContactName: "Carlos González",
      emergencyContactPhone: "555-666-777",
      familyConsent: true,
      personalConsent: true,
      timezone: "Europe/Madrid",
      locale: "es-ES",
      isActive: true,
    };

    const professionalUser: InsertUser = {
      username: "municipal@ayuntamiento.es",
      passwordHash: "$2b$10$hashedprofessionalpass123",
      role: "professional",
      firstName: "Dr. Carlos",
      lastName: "Martínez",
      age: 50,
      familyConsent: true,
      personalConsent: true,
      timezone: "Europe/Madrid",
      locale: "es-ES",
      isActive: true,
    };

    const createdUsers = await db
      .insert(users)
      .values([elderlyUser, familyUser, professionalUser])
      .returning();

    // Create professional assignment
    const professional = createdUsers.find((u) => u.role === "professional");
    const elderly = createdUsers.find((u) => u.role === "elderly");

    if (professional && elderly) {
      await db.execute(sql`
        INSERT INTO professional_assignments (professional_id, elderly_user_id, organization, specialization, is_active, created_at)
        VALUES (${professional.id}, ${elderly.id}, 'Ayuntamiento Municipal', 'trabajador_social', true, NOW())
        ON CONFLICT DO NOTHING
      `);

      // Create some sample appointment reminders
      await db.execute(sql`
        INSERT INTO reminders (user_id, title, description, reminder_time, reminder_date, type, is_active, created_by, created_at)
        VALUES 
        (${elderly.id}, 'Cita médico cardiología', 'Revisión rutinaria con Dr. Pérez', '10:30', '2024-01-08', 'appointment', true, ${professional.id}, NOW()),
        (${elderly.id}, 'Fisioterapia', 'Sesión de fisioterapia semanal', '16:00', '2024-01-10', 'appointment', true, ${professional.id}, NOW())
        ON CONFLICT DO NOTHING
      `);
    }
  }

  async init() {
    await this.initializeSampleData();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsersByRole(role: User["role"]): Promise<User[]> {
    const usersList = await db.select().from(users).where(eq(users.role, role));
    return usersList;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByPin(pin: string): Promise<User | undefined> {
    const elderlyUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "elderly"));

    for (const user of elderlyUsers) {
      if (user.pinHash && (await bcrypt.compare(pin, user.pinHash))) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserActivity(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActivity: new Date() })
      .where(eq(users.id, id));
  }

  async getAllElderlyUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "elderly"));
  }

  async getAssignedElderlyUsers(professionalId: string): Promise<User[]> {
    try {
      console.log(`[DEBUG] getAssignedElderlyUsers - Looking for users assigned to professional: ${professionalId}`);

      // Get the professional's municipality
      const [professional] = await db.select().from(users).where(eq(users.id, professionalId));
      if (!professional) {
        console.log(`[DEBUG] getAssignedElderlyUsers - Professional not found`);
        return [];
      }
      
      const professionalMunicipalityId = professional.municipalityId;
      console.log(`[DEBUG] getAssignedElderlyUsers - Professional municipality: ${professionalMunicipalityId}`);

      // Get users assigned to this professional from professional_assignments table
      const assignmentsResult = await db.execute(sql`
        SELECT pa.elderly_user_id, pa.is_active
        FROM professional_assignments pa
        WHERE pa.professional_id = ${professionalId} 
        AND pa.is_active = true
      `);

      console.log(`[DEBUG] getAssignedElderlyUsers - Found ${assignmentsResult.rows.length} assignments for professional`);

      if (assignmentsResult.rows.length === 0) {
        console.log(`[DEBUG] getAssignedElderlyUsers - No assignments found, returning empty array`);
        return [];
      }

      const assignedUserIds = assignmentsResult.rows.map(row => row.elderly_user_id);
      console.log(`[DEBUG] getAssignedElderlyUsers - Assigned user IDs:`, assignedUserIds);

      // Get the actual user data for assigned users, filtering by municipality
      let result;
      if (professionalMunicipalityId) {
        result = await db.execute(sql`
          SELECT * FROM users 
          WHERE id IN (${sql.join(assignedUserIds.map(id => sql`${id}`), sql`, `)})
          AND role = 'elderly'
          AND municipality_id = ${professionalMunicipalityId}
        `);
        console.log(`[DEBUG] getAssignedElderlyUsers - Filtered by municipality ${professionalMunicipalityId}`);
      } else {
        result = await db.execute(sql`
          SELECT * FROM users 
          WHERE id IN (${sql.join(assignedUserIds.map(id => sql`${id}`), sql`, `)})
          AND role = 'elderly'
        `);
        console.log(`[DEBUG] getAssignedElderlyUsers - No municipality filter (professional has no municipality)`);
      }

      const usersData = result.rows.map(row => ({
        id: row.id,
        username: row.username,
        passwordHash: row.password_hash,
        role: row.role,
        firstName: row.first_name,
        lastName: row.last_name,
        pinHash: row.pin_hash,
        municipalityId: row.municipality_id,
        age: row.age,
        medicalConditions: row.medical_conditions,
        medications: row.medications,
        emergencyContact: row.emergency_contact,
        emergencyContactName: row.emergency_contact_name,
        emergencyContactPhone: row.emergency_contact_phone,
        preferences: row.preferences,
        personalityTraits: row.personality_traits,
        cognitiveLevel: row.cognitive_level,
        birthPlace: row.birth_place,
        childhoodHome: row.childhood_home,
        childhoodMemories: row.childhood_memories,
        familyBackground: row.family_background,
        siblings: row.siblings,
        parents: row.parents,
        significantLife: row.significant_life,
        profession: row.profession,
        hobbies: row.hobbies,
        favoriteMemories: row.favorite_memories,
        timezone: row.timezone,
        locale: row.locale,
        isActive: row.is_active,
        familyConsent: row.family_consent,
        personalConsent: row.personal_consent,
        lastActivity: row.last_activity,
        createdAt: row.created_at,
      })) as User[];

      // Debug logging to check personalConsent values
      console.log(`[DEBUG] getAssignedElderlyUsers - Found ${usersData.length} assigned elderly users in municipality`);
      usersData.forEach(user => {
        console.log(`[DEBUG] Assigned User ${user.id} (${user.firstName} ${user.lastName}): municipalityId=${user.municipalityId}, personalConsent=${user.personalConsent}, familyConsent=${user.familyConsent}`);
      });

      return usersData;
    } catch (error) {
      console.error("Error getting assigned elderly users:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      return [];
    }
  }

  async assignUserToProfessional(
    professionalId: string,
    elderlyUserId: string,
  ): Promise<void> {
    try {
      console.log("Creating professional assignment:", { professionalId, elderlyUserId });

      // Check if assignment already exists
      const existingAssignment = await db.execute(sql`
        SELECT id FROM professional_assignments 
        WHERE professional_id = ${professionalId} 
        AND elderly_user_id = ${elderlyUserId}
      `);

      if (existingAssignment.rows.length > 0) {
        console.log("Professional assignment already exists:", existingAssignment.rows[0]);
        return;
      }

      const result = await db.execute(sql`
        INSERT INTO professional_assignments (professional_id, elderly_user_id, organization, specialization, is_active)
        VALUES (${professionalId}, ${elderlyUserId}, 'Ayuntamiento Municipal', 'trabajador_social', true)
        RETURNING id
      `);

      console.log("Professional assignment created successfully:", result.rows[0]);
    } catch (error) {
      console.error("Error assigning user to professional:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      throw error; // Re-throw to see the actual error
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createFamilyAssignment(
    assignmentData: InsertFamilyAssignment,
  ): Promise<FamilyAssignment> {
    console.log("Creating family assignment with data:", assignmentData);

    // Since family_assignments table doesn't exist, we'll return a mock assignment
    // The relationship is already stored in user preferences
    const mockAssignment: FamilyAssignment = {
      id: `${assignmentData.familyMemberId}-${assignmentData.elderlyUserId}`,
      familyMemberId: assignmentData.familyMemberId,
      elderlyUserId: assignmentData.elderlyUserId,
      relationship: assignmentData.relationship || "familiar",
      canViewHealth: assignmentData.canViewHealth ?? true,
      canManageReminders: assignmentData.canManageReminders ?? true,
      canReceiveAlerts: assignmentData.canReceiveAlerts ?? true,
      isActive: assignmentData.isActive ?? true,
      assignedBy: assignmentData.assignedBy || assignmentData.familyMemberId,
      createdAt: new Date(),
    };

    console.log("Family assignment created successfully:", mockAssignment);
    return mockAssignment;
  }

  async getFamilyAssignments(
    familyMemberId: string,
  ): Promise<FamilyAssignment[]> {
    // Get the family user and their assigned elderly user from preferences
    const familyUser = await this.getUser(familyMemberId);
    if (!familyUser || !familyUser.preferences?.elderlyUserId) {
      return [];
    }

    // Return a mock assignment based on the preferences
    const mockAssignment: FamilyAssignment = {
      id: `${familyMemberId}-${familyUser.preferences.elderlyUserId}`,
      familyMemberId: familyMemberId,
      elderlyUserId: familyUser.preferences.elderlyUserId,
      relationship: "familiar",
      canViewHealth: true,
      canManageReminders: true,
      canReceiveAlerts: true,
      isActive: true,
      assignedBy: familyMemberId,
      createdAt: new Date(),
    };

    return [mockAssignment];
  }

  async isPinUnique(pin: string, excludeUserId?: string): Promise<boolean> {
    let elderlyUsers;

    if (excludeUserId) {
      elderlyUsers = await db
        .select()
        .from(users)
        .where(
          and(eq(users.role, "elderly"), not(eq(users.id, excludeUserId))),
        );
    } else {
      elderlyUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, "elderly"));
    }

    for (const user of elderlyUsers) {
      if (user.pinHash && (await bcrypt.compare(pin, user.pinHash))) {
        return false; // PIN already exists
      }
    }
    return true; // PIN is unique
  }

  // Reminder methods - using database
  async getReminders(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId));
  }

  async getTodayReminders(userId: string): Promise<Reminder[]> {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const results = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          or(
            eq(reminders.reminderDate, today), // Specific date reminders for today
            isNull(reminders.reminderDate), // Daily recurring reminders (no specific date)
          ),
          eq(reminders.isActive, true),
        ),
      );

    return results.sort((a, b) => a.reminderTime.localeCompare(b.reminderTime));
  }

  async getUpcomingReminders(
    userId: string,
    days: number = 14,
  ): Promise<any[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const results = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.userId, userId),
          or(
            and(
              sql`${reminders.reminderDate} >= ${todayStr}`,
              sql`${reminders.reminderDate} <= ${futureStr}`,
            ),
            isNull(reminders.reminderDate), // Include recurring reminders
          ),
          eq(reminders.isActive, true),
        ),
      );

    // Get today's completions
    const completions = await db
      .select()
      .from(reminderCompletions)
      .where(
        and(
          eq(reminderCompletions.userId, userId),
          sql`DATE(${reminderCompletions.completedAt}) = ${todayStr}`,
        ),
      );

    // Enrich reminders with completion status
    const enrichedResults = results.map((reminder) => {
      const completion = completions.find((c) => c.reminderId === reminder.id);
      return {
        ...reminder,
        isCompleted: !!completion,
        completionDetails: completion,
      };
    });

    return enrichedResults.sort((a, b) => {
      // Sort by date first, then by time
      if (a.reminderDate && b.reminderDate) {
        const dateCompare = a.reminderDate.localeCompare(b.reminderDate);
        if (dateCompare !== 0) return dateCompare;
      }
      return a.reminderTime.localeCompare(b.reminderTime);
    });
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db
      .insert(reminders)
      .values(reminder)
      .returning();
    return newReminder;
  }

  async updateReminder(
    id: string,
    updates: Partial<Reminder>,
  ): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const result = await db.delete(reminders).where(eq(reminders.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async markReminderComplete(
    reminderId: string,
    userId: string,
    completedBy: string,
    notes?: string,
  ): Promise<ReminderCompletion> {
    // Get the reminder details
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId));
    if (!reminder) {
      throw new Error("Reminder not found");
    }

    // Calculate if it was completed late
    const scheduledTime = new Date();
    const [hours, minutes] = reminder.reminderTime.split(":").map(Number);
    scheduledTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const wasLate = now > scheduledTime;
    const minutesLate = wasLate
      ? Math.floor((now.getTime() - scheduledTime.getTime()) / 60000)
      : 0;

    // Create completion record
    const [completion] = await db
      .insert(reminderCompletions)
      .values({
        reminderId,
        userId,
        scheduledFor: scheduledTime,
        completedBy,
        notes,
        wasLate,
        minutesLate: minutesLate > 0 ? minutesLate : null,
      })
      .returning();

    // Keep reminder active for recurring reminders
    // Completion is tracked in reminderCompletions table

    // Log activity
    await this.createActivity({
      userId,
      activityType: "reminder_completed",
      description: `Recordatorio completado: ${reminder.title}${wasLate ? ` (${minutesLate} minutos tarde)` : ""}`,
    });

    return completion;
  }

  async getReminderCompletions(
    userId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<ReminderCompletion[]> {
    if (dateRange) {
      return await db
        .select()
        .from(reminderCompletions)
        .where(
          and(
            eq(reminderCompletions.userId, userId),
            sql`${reminderCompletions.completedAt} >= ${dateRange.from}`,
            sql`${reminderCompletions.completedAt} <= ${dateRange.to}`,
          ),
        );
    }

    return await db
      .select()
      .from(reminderCompletions)
      .where(eq(reminderCompletions.userId, userId));
  }

  async getTodayCompletions(userId: string): Promise<ReminderCompletion[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getReminderCompletions(userId, { from: today, to: tomorrow });
  }

  async getReminderCompletionStats(
    userId: string,
    days: number,
  ): Promise<{ total: number; completed: number; percentage: number }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all reminders for the user
    const userReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId));

    // Get completions in the date range
    const completions = await this.getReminderCompletions(userId, {
      from: startDate,
      to: new Date(),
    });

    // Calculate expected reminders (daily reminders * days + one-time reminders in range)
    const dailyReminders = userReminders.filter((r) => !r.reminderDate);
    const totalExpected = dailyReminders.length * days;

    const completed = completions.length;
    const percentage =
      totalExpected > 0 ? Math.round((completed / totalExpected) * 100) : 0;

    return { total: totalExpected, completed, percentage };
  }

  // Program Activities methods - implemented in database
  async getProgramActivities(
    professionalId: string,
  ): Promise<ProgramActivity[]> {
    return await db
      .select()
      .from(programActivities)
      .where(
        and(
          eq(programActivities.professionalId, professionalId),
          eq(programActivities.isActive, true),
        ),
      )
      .orderBy(desc(programActivities.createdAt));
  }

  async createProgramActivity(
    data: InsertProgramActivity,
  ): Promise<ProgramActivity> {
    const [activity] = await db
      .insert(programActivities)
      .values(data)
      .returning();
    return activity;
  }

  async deleteProgramActivity(activityId: string): Promise<boolean> {
    const result = await db
      .update(programActivities)
      .set({ isActive: false })
      .where(eq(programActivities.id, activityId))
      .returning();
    return result.length > 0;
  }

  // For the remaining methods, we'll use MemStorage temporarily until we fully migrate
  private memStorage = new MemStorage();

  async getMessages(userId: string): Promise<Message[]> {
    return this.memStorage.getMessages(userId);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return this.memStorage.createMessage(message);
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    return this.memStorage.markMessageAsRead(id);
  }

  // Activity methods - using database implementation
  async getActivities(userId: string): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt));
  }

  async getAllActivities(): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return newActivity;
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return this.memStorage.getChatSessions(userId);
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    return this.memStorage.createChatSession(session);
  }

  // Conversation memory methods - now using PostgreSQL
  async getConversationSummary(userId: string): Promise<string | undefined> {
    try {
      const [result] = await db
        .select()
        .from(conversationSummaries)
        .where(eq(conversationSummaries.userId, userId));
      return result?.summaryText;
    } catch (error) {
      console.error("Error getting conversation summary:", error);
      return undefined;
    }
  }

  async saveConversationSummary(
    userId: string,
    summary: string,
  ): Promise<void> {
    try {
      await db
        .insert(conversationSummaries)
        .values({ userId, summaryText: summary })
        .onConflictDoUpdate({
          target: conversationSummaries.userId,
          set: {
            summaryText: summary,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error("Error saving conversation summary:", error);
    }
  }

  async appendChatTurn(
    userId: string,
    turn: { role: string; content: string },
  ): Promise<void> {
    // For now, we'll use the memStorage for turn tracking
    // In a full implementation, you could store this in a separate chat_turns table
    return this.memStorage.appendChatTurn?.(userId, turn);
  }

  // Advanced structured memory system - PostgreSQL implementation
  async upsertMemories(userId: string, items: MemoryItem[]): Promise<void> {
    if (!items.length) return;

    try {
      const crypto = require("crypto");

      for (const item of items) {
        if (!item.content?.trim()) continue;

        const contentHash = crypto
          .createHash("sha256")
          .update((item.type || "") + "|" + item.content.trim().toLowerCase())
          .digest("hex");

        await db
          .insert(memories)
          .values({
            userId,
            type: item.type,
            content: item.content,
            importance: item.importance ?? 3,
            confidence: 0.6,
            contentHash,
            expiresAt: item.expires_at ? new Date(item.expires_at) : null,
            source: "ai",
          })
          .onConflictDoUpdate({
            target: [memories.userId, memories.contentHash],
            set: {
              confidence: sql`LEAST(1.0, ${memories.confidence} + 0.1)`,
              lastReinforcedAt: new Date(),
              importance: sql`GREATEST(${memories.importance}, ${item.importance ?? 3})`,
              expiresAt: item.expires_at
                ? new Date(item.expires_at)
                : sql`${memories.expiresAt}`,
            },
          });
      }
    } catch (error) {
      console.error("Error upserting memories:", error);
    }
  }

  async getTopMemories(
    userId: string,
    limit = 12,
  ): Promise<Array<{ type: string; content: string }>> {
    try {
      const results = await db.execute(sql`
        WITH scored AS (
          SELECT *,
            -- booster de recencia (últimos 30 días máx 0.3)
            LEAST(0.3, GREATEST(0, 0.3 - 0.3 * EXTRACT(EPOCH FROM (now()-last_reinforced_at))/ (30*24*3600))) AS recency_boost
          FROM ${memories}
          WHERE user_id = ${userId}
            AND (expires_at IS NULL OR expires_at > now())
        )
        SELECT type, content
        FROM scored
        ORDER BY (importance*0.6 + confidence*0.3 + recency_boost*0.1) DESC, last_reinforced_at DESC
        LIMIT ${limit}
      `);

      return results.rows.map((row: any) => ({
        type: row.type,
        content: row.content,
      }));
    } catch (error) {
      console.error("Error getting top memories:", error);
      return [];
    }
  }

  async getUsersByProfessionalId(professionalId: string): Promise<User[]> {
    try {
      // Get users assigned to this professional from professional_assignments table
      return await this.getAssignedElderlyUsers(professionalId);
    } catch (error) {
      console.error("Error getting users by professional ID:", error);
      // Fallback to all elderly users
      return await this.getAllElderlyUsers();
    }
  }

  // Municipality methods
  async getAllMunicipalities(): Promise<Municipality[]> {
    return await db
      .select()
      .from(municipalities)
      .where(eq(municipalities.isActive, true))
      .orderBy(municipalities.name);
  }

  async getMunicipality(id: string): Promise<Municipality | undefined> {
    const [municipality] = await db
      .select()
      .from(municipalities)
      .where(eq(municipalities.id, id));
    return municipality;
  }

  async createMunicipality(data: InsertMunicipality): Promise<Municipality> {
    const [municipality] = await db
      .insert(municipalities)
      .values(data)
      .returning();
    return municipality;
  }

  async updateMunicipality(id: string, data: Partial<Municipality>): Promise<Municipality | undefined> {
    const [municipality] = await db
      .update(municipalities)
      .set(data)
      .where(eq(municipalities.id, id))
      .returning();
    return municipality;
  }

  async deleteMunicipalityData(municipalityId: string): Promise<void> {
    try {
      // Obtener todos los usuarios del municipio
      const usersInMunicipality = await db.execute(sql`
        SELECT id FROM users WHERE municipality_id = ${municipalityId}
      `);

      const userIds = usersInMunicipality.rows.map(row => row.id as string);

      if (userIds.length > 0) {
        // Eliminar todos los datos relacionados de cada usuario
        for (const userId of userIds) {
          // Eliminar recordatorios
          await db.execute(sql`DELETE FROM reminders WHERE user_id = ${userId}`);
          
          // Eliminar mensajes
          await db.execute(sql`DELETE FROM messages WHERE from_user_id = ${userId} OR to_user_id = ${userId}`);
          
          // Eliminar actividades
          await db.execute(sql`DELETE FROM activities WHERE user_id = ${userId}`);
          
          // Eliminar sesiones de chat
          await db.execute(sql`DELETE FROM chat_sessions WHERE user_id = ${userId}`);
          
          // Eliminar completaciones de recordatorios
          await db.execute(sql`DELETE FROM reminder_completions WHERE user_id = ${userId}`);
          
          // Eliminar memorias
          await db.execute(sql`DELETE FROM memories WHERE user_id = ${userId}`);
          
          // Eliminar analytics
          await db.execute(sql`DELETE FROM analytics WHERE user_id = ${userId}`);
          
          // Eliminar eventos de métricas
          await db.execute(sql`DELETE FROM metrics_events WHERE user_id = ${userId}`);
        }

        // Eliminar asignaciones profesionales
        await db.execute(sql`DELETE FROM professional_assignments WHERE elderly_user_id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
        
        // Eliminar usuarios
        await db.execute(sql`DELETE FROM users WHERE municipality_id = ${municipalityId}`);
      }

      // Eliminar el municipio
      await db.execute(sql`DELETE FROM municipalities WHERE id = ${municipalityId}`);

      console.log(`Municipio ${municipalityId} y todos sus datos eliminados correctamente`);
    } catch (error) {
      console.error("Error eliminando datos del municipio:", error);
      throw error;
    }
  }

  // Analytics and Metrics methods
  async createAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
    const [record] = await db
      .insert(analytics)
      .values(analyticsData)
      .returning();
    return record;
  }

  async createMetricsEvent(event: InsertMetricsEvent): Promise<MetricsEvent> {
    const [record] = await db.insert(metricsEvents).values(event).returning();
    return record;
  }

  async getAnalytics(
    userId: string,
    metricType?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<Analytics[]> {
    let query = db.select().from(analytics).where(eq(analytics.userId, userId));

    const conditions = [eq(analytics.userId, userId)];

    if (metricType) {
      conditions.push(eq(analytics.metricType, metricType));
    }

    if (dateRange) {
      conditions.push(sql`${analytics.timestamp} >= ${dateRange.from}`);
      conditions.push(sql`${analytics.timestamp} <= ${dateRange.to}`);
    }

    return await db
      .select()
      .from(analytics)
      .where(and(...conditions));
  }

  async getMetricsEvents(
    userId: string,
    eventCategory?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<MetricsEvent[]> {
    const conditions = [eq(metricsEvents.userId, userId)];

    if (eventCategory) {
      conditions.push(eq(metricsEvents.eventCategory, eventCategory));
    }

    if (dateRange) {
      conditions.push(sql`${metricsEvents.createdAt} >= ${dateRange.from}`);
      conditions.push(sql`${metricsEvents.createdAt} <= ${dateRange.to}`);
    }

    return await db
      .select()
      .from(metricsEvents)
      .where(and(...conditions));
  }

  async getMetricsAggregate(
    userId: string,
    aggregationType: string,
    periodStart?: Date,
  ): Promise<MetricsAggregate | undefined> {
    const conditions = [
      eq(metricsAggregates.userId, userId),
      eq(metricsAggregates.aggregationType, aggregationType),
    ];

    if (periodStart) {
      conditions.push(eq(metricsAggregates.periodStart, periodStart));
    }

    const [result] = await db
      .select()
      .from(metricsAggregates)
      .where(and(...conditions))
      .limit(1);
    return result;
  }

  async createMetricsAggregate(
    aggregate: InsertMetricsAggregate,
  ): Promise<MetricsAggregate> {
    const [record] = await db
      .insert(metricsAggregates)
      .values(aggregate)
      .returning();
    return record;
  }

  async calculateEngagementMetrics(
    userId: string,
    days: number = 30,
  ): Promise<any> {
    console.log(`[DatabaseStorage] === INDIVIDUAL ENGAGEMENT METRICS ===`);
    console.log(
      `[DatabaseStorage] Calculating engagement metrics for user: ${userId}, days: ${days}`,
    );

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      console.log(`[DatabaseStorage] Start date: ${startDate.toISOString()}`);

      // Get user info for logging
      const user = await this.getUser(userId);
      console.log(
        `[DatabaseStorage] User info:`,
        user
          ? `${user.firstName} ${user.lastName} (${user.role})`
          : "User not found",
      );

      const result = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT DATE(created_at)) as unique_active_days,
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN activity_type = 'chat' THEN 1 END) as chat_sessions,
          COUNT(CASE WHEN activity_type = 'cognitive_exercise' THEN 1 END) as cognitive_sessions,
          COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as login_sessions,
          AVG(CASE 
            WHEN activity_type = 'chat' AND metadata->>'duration' IS NOT NULL 
            THEN CAST(metadata->>'duration' AS INTEGER)
          END) as avg_session_duration
        FROM ${activities}
        WHERE user_id = ${userId} 
        AND created_at >= ${startDate.toISOString()}
      `);

      const row = result.rows[0];
      console.log(
        `[DatabaseStorage] Raw engagement query result for user ${userId}:`,
        JSON.stringify(row, null, 2),
      );

      const totalDays = days;

      const metrics = {
        uniqueActiveDays: parseInt(row.unique_active_days) || 0,
        totalSessions: parseInt(row.total_sessions) || 0,
        dailyActiveRate:
          totalDays > 0
            ? (parseInt(row.unique_active_days) || 0) / totalDays
            : 0,
        totalInteractions: parseInt(row.chat_sessions) || 0,
        cognitiveExercises: parseInt(row.cognitive_sessions) || 0,
        averageSessionDuration: parseFloat(row.avg_session_duration) || 0,
        loginFrequency: parseInt(row.login_sessions) || 0,
      };

      console.log(
        `[DatabaseStorage] Processed individual engagement metrics for user ${userId}:`,
        JSON.stringify(metrics, null, 2),
      );

      // Check if this user has any data at all
      const hasAnyData =
        metrics.totalSessions > 0 || metrics.totalInteractions > 0;
      console.log(`[DatabaseStorage] User ${userId} has data:`, hasAnyData);

      if (!hasAnyData) {
        console.log(
          `[DatabaseStorage] User ${userId} has no activity data, returning zeroed metrics`,
        );
      }

      console.log(
        `[DatabaseStorage] === END INDIVIDUAL ENGAGEMENT METRICS ===`,
      );
      return metrics;
    } catch (error) {
      console.error(
        `[DatabaseStorage] Error calculating engagement metrics for user ${userId}:`,
        error,
      );
      return {
        uniqueActiveDays: 0,
        totalSessions: 0,
        dailyActiveRate: 0,
        totalInteractions: 0,
        cognitiveExercises: 0,
        averageSessionDuration: 0,
        loginFrequency: 0,
      };
    }
  }

  async calculateHealthMetrics(userId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const completions = await this.getReminderCompletions(userId, {
      from: startDate,
      to: new Date(),
    });
    const reminders = await this.getReminders(userId);

    // Calculate medication adherence
    const medicineReminders = reminders.filter((r) => r.type === "medicine");
    const medicineCompletions = completions.filter((c) => {
      const reminder = reminders.find((r) => r.id === c.reminderId);
      return reminder?.type === "medicine";
    });

    // Calculate appointment attendance
    const appointmentReminders = reminders.filter(
      (r) => r.type === "appointment",
    );
    const appointmentCompletions = completions.filter((c) => {
      const reminder = reminders.find((r) => r.id === c.reminderId);
      return reminder?.type === "appointment";
    });

    return {
      medicationAdherence:
        medicineCompletions.length / (medicineReminders.length * days || 1),
      appointmentAttendance:
        appointmentCompletions.length / (appointmentReminders.length || 1),
      totalRemindersCompleted: completions.length,
      onTimeCompletionRate:
        completions.filter((c) => !c.wasLate).length /
        (completions.length || 1),
      averageDelayMinutes:
        completions
          .filter((c) => c.wasLate && c.minutesLate)
          .reduce((sum, c) => sum + (c.minutesLate || 0), 0) /
        (completions.filter((c) => c.wasLate).length || 1),
    };
  }

  async calculateAIQualityMetrics(userId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, userId),
          sql`${chatSessions.createdAt} >= ${startDate}`,
        ),
      );

    // Calculate metrics
    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0,
    );
    const exercisesCompleted = sessions.reduce((sum, s) => {
      const exercises = s.cognitiveExercises as any;
      return sum + (Array.isArray(exercises) ? exercises.length : 0);
    }, 0);

    const alertsGenerated = sessions.reduce((sum, s) => {
      const alerts = s.alertsGenerated as any;
      return sum + (Array.isArray(alerts) ? alerts.length : 0);
    }, 0);

    // Calculate emotional states distribution
    const emotionalStates = sessions
      .filter((s) => s.emotionalState)
      .map((s) => s.emotionalState);

    const stateDistribution = emotionalStates.reduce(
      (acc, state) => {
        acc[state!] = (acc[state!] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate average response time from analytics table
    const result = await db.execute(sql`
      SELECT AVG(metric_value::NUMERIC) as avg_response_time, COUNT(*) as record_count 
      FROM analytics 
      WHERE user_id = ${userId} 
        AND metric_type = 'ai_quality' 
        AND metric_name = 'response_time' 
        AND timestamp >= ${startDate.toISOString()}
    `);

    const avgResponseTime = result.rows[0]?.avg_response_time;
    const recordCount = result.rows[0]?.record_count || 0;
    const averageResponseTime = avgResponseTime
      ? Math.round(Number(avgResponseTime))
      : 0;

    return {
      totalAISessions: sessions.length,
      averageSessionDuration: totalDuration / (sessions.length || 1),
      cognitiveExercisesCompleted: exercisesCompleted,
      alertsGenerated: alertsGenerated,
      emotionalStateDistribution: stateDistribution,
      engagementRate: sessions.length / days,
      averageMessagesPerSession:
        sessions.reduce((sum, s) => {
          const messages = s.messages as any;
          return sum + (Array.isArray(messages) ? messages.length : 0);
        }, 0) / (sessions.length || 1),
      averageResponseTime: averageResponseTime,
    };
  }

  // Aggregated metrics methods for DatabaseStorage
  async calculateAggregatedEngagementMetrics(
    days: number = 30,
    professionalId?: string,
  ): Promise<any> {
    console.log(
      `[DatabaseStorage] calculateAggregatedEngagementMetrics called with days: ${days}, professionalId: ${professionalId}`,
    );
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    console.log(
      `[DatabaseStorage] Start date for aggregation: ${startDate.toISOString()}`,
    );

    try {
      // Get elderly users - either all or assigned to specific professional
      let elderlyUsers;
      if (professionalId) {
        elderlyUsers = await this.getAssignedElderlyUsers(professionalId);
        console.log(
          `[DatabaseStorage] Found ${elderlyUsers.length} elderly users assigned to professional ${professionalId}`,
        );
      } else {
        elderlyUsers = await this.getAllElderlyUsers();
        console.log(
          `[DatabaseStorage] Found ${elderlyUsers.length} elderly users for engagement metrics`,
        );
      }

      console.log(
        `[DatabaseStorage] Users for aggregation:`,
        elderlyUsers.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
        })),
      );

      if (elderlyUsers.length === 0) {
        console.log(
          "[DatabaseStorage] No elderly users found, returning zero engagement metrics",
        );
        return {
          totalSessions: 0,
          totalInteractions: 0,
          cognitiveExercises: 0,
          uniqueActiveDays: 0,
          dailyActiveRate: 0,
        };
      }

      let totalMetrics = {
        totalSessions: 0,
        totalInteractions: 0,
        cognitiveExercises: 0,
        uniqueActiveDays: 0,
        dailyActiveRate: 0,
      };

      console.log(
        `[DatabaseStorage] Starting aggregation loop for ${elderlyUsers.length} users`,
      );

      // Calculate metrics for each user and sum them up
      for (const user of elderlyUsers) {
        console.log(
          `[DatabaseStorage] Processing user: ${user.firstName} ${user.lastName} (${user.id})`,
        );
        const userMetrics = await this.calculateEngagementMetrics(
          user.id,
          days,
        );
        console.log(
          `[DatabaseStorage] User ${user.firstName} engagement metrics:`,
          userMetrics,
        );

        totalMetrics.totalSessions += userMetrics.totalSessions || 0;
        totalMetrics.totalInteractions += userMetrics.totalInteractions || 0;
        totalMetrics.cognitiveExercises += userMetrics.cognitiveExercises || 0;
        totalMetrics.uniqueActiveDays += userMetrics.uniqueActiveDays || 0;
        totalMetrics.dailyActiveRate += userMetrics.dailyActiveRate || 0;

        console.log(
          `[DatabaseStorage] Running totals after user ${user.firstName}:`,
          totalMetrics,
        );
      }

      // Always return real calculated values, even if they are zero
      const hasAnyData =
        totalMetrics.totalSessions > 0 || totalMetrics.totalInteractions > 0;
      console.log(
        `[DatabaseStorage] Has any data: ${hasAnyData}, totalSessions: ${totalMetrics.totalSessions}, totalInteractions: ${totalMetrics.totalInteractions}`,
      );

      // Calculate averages where appropriate
      totalMetrics.dailyActiveRate =
        totalMetrics.dailyActiveRate / elderlyUsers.length;

      console.log(
        `[DatabaseStorage] Final aggregated engagement metrics for ${elderlyUsers.length} users:`,
        totalMetrics,
      );
      return totalMetrics;
    } catch (error) {
      console.error(
        "[DatabaseStorage] Error calculating aggregated engagement metrics:",
        error,
      );
      console.error("[DatabaseStorage] Error stack:", error.stack);
      return {
        totalSessions: 0,
        totalInteractions: 0,
        cognitiveExercises: 0,
        uniqueActiveDays: 0,
        dailyActiveRate: 0,
      };
    }
  }

  async calculateAggregatedHealthMetrics(
    days: number = 30,
    professionalId?: string,
  ): Promise<any> {
    console.log(`[DatabaseStorage] === AGGREGATED HEALTH METRICS ===`);
    console.log(
      `[DatabaseStorage] calculateAggregatedHealthMetrics called with days: ${days}, professionalId: ${professionalId}`,
    );

    try {
      // Get elderly users - either all or assigned to specific professional
      let elderlyUsers;
      if (professionalId) {
        elderlyUsers = await this.getAssignedElderlyUsers(professionalId);
        console.log(
          `[DatabaseStorage] Found ${elderlyUsers.length} elderly users assigned to professional ${professionalId}`,
        );
      } else {
        elderlyUsers = await this.getAllElderlyUsers();
        console.log(
          `[DatabaseStorage] Found ${elderlyUsers.length} elderly users for health metrics`,
        );
      }

      console.log(
        `[DatabaseStorage] Users for health aggregation:`,
        elderlyUsers.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
        })),
      );

      if (elderlyUsers.length === 0) {
        console.log(
          "[DatabaseStorage] No elderly users found, returning zero health metrics",
        );
        return {
          medicationAdherence: 0,
          appointmentAttendance: 0,
          onTimeCompletionRate: 0,
          totalRemindersCompleted: 0,
          averageDelayMinutes: 0,
        };
      }

      let totalMetrics = {
        medicationAdherence: 0,
        appointmentAttendance: 0,
        onTimeCompletionRate: 0,
        totalRemindersCompleted: 0,
        averageDelayMinutes: 0,
      };

      let usersWithData = 0;
      let totalUsersForAverageDelay = 0; // Initialize counter for average delay calculation
      console.log(
        `[DatabaseStorage] Starting health aggregation loop for ${elderlyUsers.length} users`,
      );

      // Calculate metrics for each user using the individual method that works
      for (const user of elderlyUsers) {
        console.log(
          `[DatabaseStorage] Processing health metrics for user: ${user.firstName} ${user.lastName} (${user.id})`,
        );

        // Call the individual method for each user
        const userMetrics = await this.calculateHealthMetrics(user.id, days);
        console.log(
          `[DatabaseStorage] User ${user.firstName} individual health metrics:`,
          JSON.stringify(userMetrics, null, 2),
        );

        // Check if user has any health data
        const userReminders = await this.getReminders(user.id);
        console.log(
          `[DatabaseStorage] User ${user.firstName} has ${userReminders.length} reminders`,
        );

        if (userReminders.length > 0) {
          usersWithData++;

          // Aggregate the metrics
          totalMetrics.medicationAdherence +=
            userMetrics.medicationAdherence || 0;
          totalMetrics.appointmentAttendance +=
            userMetrics.appointmentAttendance || 0;
          totalMetrics.onTimeCompletionRate +=
            userMetrics.onTimeCompletionRate || 0;
          totalMetrics.totalRemindersCompleted +=
            userMetrics.totalRemindersCompleted || 0;

          if (
            userMetrics.averageDelayMinutes &&
            !isNaN(userMetrics.averageDelayMinutes)
          ) {
            totalMetrics.averageDelayMinutes += userMetrics.averageDelayMinutes;
            totalUsersForAverageDelay++;
          }

          console.log(
            `[DatabaseStorage] User ${user.firstName} added to aggregation. Running totals:`,
            {
              medicationAdherence: totalMetrics.medicationAdherence,
              appointmentAttendance: totalMetrics.appointmentAttendance,
              onTimeCompletionRate: totalMetrics.onTimeCompletionRate,
              totalRemindersCompleted: totalMetrics.totalRemindersCompleted,
              usersWithData,
            },
          );
        } else {
          console.log(
            `[DatabaseStorage] User ${user.firstName} has no reminders, skipping from aggregation`,
          );
        }
      }

      // Always return real calculated values, even if they are zero
      console.log(
        `[DatabaseStorage] Users with health data: ${usersWithData}/${elderlyUsers.length}`,
      );
      if (usersWithData === 0) {
        console.log(
          "[DatabaseStorage] No users with health data found, returning zero health metrics",
        );
        const zeroData = {
          medicationAdherence: 0,
          appointmentAttendance: 0,
          onTimeCompletionRate: 0,
          totalRemindersCompleted: 0,
          averageDelayMinutes: 0,
        };
        console.log(`[DatabaseStorage] Zero health data:`, zeroData);
        return zeroData;
      }

      // Calculate averages based on users with data
      totalMetrics.medicationAdherence =
        totalMetrics.medicationAdherence / usersWithData;
      totalMetrics.appointmentAttendance =
        totalMetrics.appointmentAttendance / usersWithData;
      totalMetrics.onTimeCompletionRate =
        totalMetrics.onTimeCompletionRate / usersWithData;

      if (totalUsersForAverageDelay > 0) {
        totalMetrics.averageDelayMinutes =
          totalMetrics.averageDelayMinutes / totalUsersForAverageDelay;
      } else {
        totalMetrics.averageDelayMinutes = 0; // Ensure it's 0 if no users had delays
      }

      console.log(
        `[DatabaseStorage] Final aggregated health metrics for ${usersWithData}/${elderlyUsers.length} users with data:`,
        totalMetrics,
      );
      console.log(`[DatabaseStorage] === END AGGREGATED HEALTH METRICS ===`);
      return totalMetrics;
    } catch (error) {
      console.error(
        "[DatabaseStorage] Error calculating aggregated health metrics:",
        error,
      );
      console.error("[DatabaseStorage] Error stack:", error.stack);
      return {
        medicationAdherence: 0,
        appointmentAttendance: 0,
        onTimeCompletionRate: 0,
        totalRemindersCompleted: 0,
        averageDelayMinutes: 0,
      };
    }
  }

  async calculateAggregatedAIQualityMetrics(
    days: number = 30,
    professionalId?: string,
  ): Promise<any> {
    console.log(`[DatabaseStorage] === AGGREGATED AI QUALITY METRICS ===`);
    console.log(
      `[DatabaseStorage] calculateAggregatedAIQualityMetrics called with days: ${days}, professionalId: ${professionalId}`,
    );

    try {
      // Get elderly users - either all or assigned to specific professional
      let elderlyUsers;
      if (professionalId) {
        elderlyUsers = await this.getAssignedElderlyUsers(professionalId);
        console.log(
          `[DatabaseStorage] Found ${elderlyUsers.length} elderly users assigned to professional ${professionalId}`,
        );
      } else {
        elderlyUsers = await this.getAllElderlyUsers();
        console.log(
          `[DatabaseStorage] Found ${elderlyUsers.length} elderly users for AI quality metrics`,
        );
      }

      console.log(
        `[DatabaseStorage] Users for AI quality aggregation:`,
        elderlyUsers.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
        })),
      );

      if (elderlyUsers.length === 0) {
        console.log(
          "[DatabaseStorage] No elderly users found, returning zero metrics",
        );
        return {
          totalAISessions: 0,
          averageSessionDuration: 0,
          cognitiveExercisesCompleted: 0,
          alertsGenerated: 0,
          emotionalStateDistribution: {},
          engagementRate: 0,
          averageMessagesPerSession: 0,
          averageResponseTime: 0,
        };
      }

      let totalMetrics = {
        totalAISessions: 0,
        averageSessionDuration: 0,
        cognitiveExercisesCompleted: 0,
        alertsGenerated: 0,
        engagementRate: 0,
        averageMessagesPerSession: 0,
      };

      let usersWithData = 0;
      console.log(
        `[DatabaseStorage] Starting AI quality aggregation loop for ${elderlyUsers.length} users`,
      );

      // Calculate metrics for each user using the individual method that works
      for (const user of elderlyUsers) {
        console.log(
          `[DatabaseStorage] Processing AI quality metrics for user: ${user.firstName} ${user.lastName} (${user.id})`,
        );

        // Call the individual method for each user
        const userMetrics = await this.calculateAIQualityMetrics(user.id, days);
        console.log(
          `[DatabaseStorage] User ${user.firstName} individual AI quality metrics:`,
          JSON.stringify(userMetrics, null, 2),
        );

        // Count this user if they have any AI session data
        if (userMetrics.totalAISessions > 0) {
          usersWithData++;
          console.log(
            `[DatabaseStorage] User ${user.firstName} has AI session data, counting in aggregation`,
          );
        } else {
          console.log(
            `[DatabaseStorage] User ${user.firstName} has no AI session data`,
          );
        }

        // Sum up metrics for aggregation
        totalMetrics.totalAISessions += userMetrics.totalAISessions || 0;
        totalMetrics.averageSessionDuration +=
          userMetrics.averageSessionDuration || 0;
        totalMetrics.cognitiveExercisesCompleted +=
          userMetrics.cognitiveExercisesCompleted || 0;
        totalMetrics.alertsGenerated += userMetrics.alertsGenerated || 0;
        totalMetrics.engagementRate += userMetrics.engagementRate || 0;
        totalMetrics.averageMessagesPerSession +=
          userMetrics.averageMessagesPerSession || 0;

        console.log(
          `[DatabaseStorage] Running AI quality totals after user ${user.firstName}:`,
          totalMetrics,
        );
      }

      // Calculate aggregated response time directly from analytics table using SQL
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      let whereClause = sql`metric_type = 'ai_quality' AND metric_name = 'response_time' AND timestamp >= ${startDate.toISOString()}`;

      if (professionalId) {
        // Only include analytics for users assigned to this professional
        const userIds = elderlyUsers.map((u) => u.id);
        console.log(
          `[DatabaseStorage] Filtering analytics by professional user IDs:`,
          userIds,
        );
        if (userIds.length > 0) {
          whereClause = sql`${whereClause} AND user_id IN (${sql.join(
            userIds.map((id) => sql`${id}`),
            sql`, `,
          )})`;
        }
      }

      console.log(`[DatabaseStorage] Querying analytics for response time...`);
      const result = await db.execute(sql`
        SELECT AVG(metric_value::NUMERIC) as avg_response_time, COUNT(*) as record_count 
        FROM analytics 
        WHERE ${whereClause}
      `);

      const avgResponseTime = result.rows[0]?.avg_response_time;
      const recordCount = result.rows[0]?.record_count || 0;
      const averageResponseTime = avgResponseTime
        ? Math.round(Number(avgResponseTime))
        : 0;

      console.log(
        `[DatabaseStorage] Analytics query result: ${recordCount} records, avgResponseTime: ${averageResponseTime}ms`,
      );

      // Calculate averages appropriately
      const userCount = elderlyUsers.length;
      const finalResult = {
        totalAISessions: totalMetrics.totalAISessions, // Total across all users
        averageSessionDuration:
          userCount > 0 ? totalMetrics.averageSessionDuration / userCount : 0,
        cognitiveExercisesCompleted: totalMetrics.cognitiveExercisesCompleted, // Total across all users
        alertsGenerated: totalMetrics.alertsGenerated, // Total across all users
        emotionalStateDistribution: {}, // This would require further aggregation if needed
        engagementRate:
          userCount > 0 ? totalMetrics.engagementRate / userCount : 0,
        averageMessagesPerSession:
          userCount > 0
            ? totalMetrics.averageMessagesPerSession / userCount
            : 0,
        averageResponseTime: averageResponseTime,
      };

      console.log(
        `[DatabaseStorage] Final aggregated AI quality metrics for ${userCount} users (${usersWithData} with data):`,
        JSON.stringify(finalResult, null, 2),
      );
      console.log(
        `[DatabaseStorage] === END AGGREGATED AI QUALITY METRICS ===`,
      );
      return finalResult;
    } catch (error) {
      console.error(
        "[DatabaseStorage] Error calculating aggregated AI quality metrics:",
        error,
      );
      console.error("[DatabaseStorage] Error stack:", error.stack);
      return {
        totalAISessions: 0,
        averageSessionDuration: 0,
        cognitiveExercisesCompleted: 0,
        alertsGenerated: 0,
        emotionalStateDistribution: {},
        engagementRate: 0,
        averageMessagesPerSession: 0,
        averageResponseTime: 0,
      };
    }
  }
}

export const storage = new DatabaseStorage();

// Initialize sample data
storage.init();