import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, pgEnum, smallint, real, jsonb, time, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for type safety
export const roleEnum = pgEnum("user_role", ["elderly", "family", "professional"]);
export const reminderTypeEnum = pgEnum("reminder_type", ["medicine", "appointment", "call", "activity"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "photo", "image"]);
export const activityTypeEnum = pgEnum("activity_type", ["login", "chat", "reminder_completed", "message_read", "message_received", "reminder_created", "health_alert", "cognitive_exercise"]);
export const cognitiveLevelEnum = pgEnum("cognitive_level", ["normal", "mild", "moderate"]);
export const memoryTypeEnum = pgEnum("memory_type", ["PREFERENCE", "ROUTINE", "CONTACT", "FACT", "GOAL", "HEALTH_NOTE"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Renamed from password for security clarity
  role: roleEnum("role").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  pinHash: text("pin_hash"), // Renamed from pin for security clarity
  municipalityId: varchar("municipality_id").references(() => municipalities.id), // Filtro por municipio
  age: integer("age"),
  medicalConditions: text("medical_conditions").array(),
  medications: text("medications").array(),
  emergencyContact: text("emergency_contact"),
  emergencyContactName: text("emergency_contact_name"), // Separated for clarity
  emergencyContactPhone: text("emergency_contact_phone"), // Separated for clarity
  preferences: jsonb("preferences"), // Changed to jsonb for better querying
  personalityTraits: jsonb("personality_traits"), // Changed to jsonb for better querying
  cognitiveLevel: cognitiveLevelEnum("cognitive_level").default("normal"),
  // Biographical information for reminiscence therapy
  birthPlace: text("birth_place"), // Lugar de nacimiento
  childhoodHome: text("childhood_home"), // Hogar de infancia
  childhoodMemories: text("childhood_memories"), // Recuerdos de infancia importantes
  familyBackground: text("family_background"), // Historia familiar
  siblings: text("siblings"), // Información sobre hermanos
  parents: text("parents"), // Información sobre padres
  significantLife: text("significant_life"), // Eventos significativos de vida
  profession: text("profession"), // Profesión/trabajo
  hobbies: text("hobbies"), // Hobbies y pasatiempos
  favoriteMemories: text("favorite_memories"), // Recuerdos favoritos
  timezone: text("timezone").default("Europe/Madrid"), // Added timezone support
  locale: text("locale").default("es-ES"), // Added locale support
  isActive: boolean("is_active").default(true),
  familyConsent: boolean("family_consent").default(false), // GDPR consent for family access
  personalConsent: boolean("personal_consent").default(false), // GDPR consent for municipal access
  lastActivity: timestamp("last_activity", { withTimezone: true }).default(sql`now()`), // Added timezone
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`), // Added timezone
});

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  reminderTime: time("reminder_time").notNull(), // Proper time type instead of text
  reminderDate: date("reminder_date"), // Proper date type, null for daily reminders
  nextReminder: timestamp("next_reminder", { withTimezone: true }), // Next occurrence timestamp
  recurrence: jsonb("recurrence"), // JSON for complex recurrence patterns
  type: reminderTypeEnum("type").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").default("text"),
  attachments: text("attachments").array(), // Array of attachment URLs
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at", { withTimezone: true }), // When message was read
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  activityType: activityTypeEnum("activity_type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional structured data about the activity
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const reminderCompletions = pgTable("reminder_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reminderId: varchar("reminder_id").notNull().references(() => reminders.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  completedAt: timestamp("completed_at", { withTimezone: true }).default(sql`now()`),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(), // When it was supposed to happen
  completedBy: varchar("completed_by").references(() => users.id),
  notes: text("notes"),
  verificationPhoto: text("verification_photo"),
  wasLate: boolean("was_late").default(false),
  minutesLate: integer("minutes_late"),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  messages: jsonb("messages").notNull(), // Changed to jsonb for better querying/processing
  duration: integer("duration"),
  emotionalState: text("emotional_state"),
  cognitiveExercises: jsonb("cognitive_exercises"), // Changed to jsonb for structured data
  topicsDiscussed: text("topics_discussed").array(),
  alertsGenerated: jsonb("alerts_generated"), // Changed to jsonb for structured alerts
  sessionSummary: text("session_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

export const insertReminderCompletionSchema = createInsertSchema(reminderCompletions).omit({
  id: true,
  completedAt: true,
});

// Conversation summaries table
export const conversationSummaries = pgTable("conversation_summaries", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  summaryText: text("summary_text").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Memories table with proper UNIQUE constraint
export const memories = pgTable("memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: memoryTypeEnum("type").notNull(),
  content: text("content").notNull(),
  importance: smallint("importance").notNull().default(3), // 1-5
  confidence: real("confidence").notNull().default(0.6), // 0-1  
  lastReinforcedAt: timestamp("last_reinforced_at", { withTimezone: true }).notNull().default(sql`now()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  source: text("source").notNull().default("ai"), // 'ai' | 'caregiver' | 'import'
  contentHash: text("content_hash").notNull(),
}, (table) => ({
  // Critical: Add UNIQUE constraint for deduplication
  uniqueUserContent: unique().on(table.userId, table.contentHash),
}));

// Family assignments table for RBAC
export const familyAssignments = pgTable("family_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyMemberId: varchar("family_member_id").notNull().references(() => users.id),
  elderlyUserId: varchar("elderly_user_id").notNull().references(() => users.id),
  relationship: text("relationship").notNull(), // 'hijo', 'hija', 'nieto', 'cónyuge', etc.
  canViewHealth: boolean("can_view_health").default(true),
  canManageReminders: boolean("can_manage_reminders").default(true),
  canReceiveAlerts: boolean("can_receive_alerts").default(true),
  isActive: boolean("is_active").default(true),
  assignedBy: varchar("assigned_by").references(() => users.id), // Who created this assignment
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  // Prevent duplicate assignments
  uniqueAssignment: unique().on(table.familyMemberId, table.elderlyUserId),
}));

// Municipalities table
export const municipalities = pgTable("municipalities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  photoUrl: text("photo_url"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// Professional assignments table for RBAC
export const professionalAssignments = pgTable("professional_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => users.id),
  elderlyUserId: varchar("elderly_user_id").notNull().references(() => users.id),
  municipalityId: varchar("municipality_id").references(() => municipalities.id), // Nuevo: filtro por municipio
  organization: text("organization"), // Municipality, health center, etc.
  specialization: text("specialization"), // 'enfermero', 'trabajador_social', 'médico', etc.
  canViewFullProfile: boolean("can_view_full_profile").default(true),
  canManageAllReminders: boolean("can_manage_all_reminders").default(true),
  canReceiveCriticalAlerts: boolean("can_receive_critical_alerts").default(true),
  isActive: boolean("is_active").default(true),
  assignedBy: varchar("assigned_by").references(() => users.id), // Who created this assignment
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  // Prevent duplicate assignments
  uniqueAssignment: unique().on(table.professionalId, table.elderlyUserId),
}));

// Consent records for privacy compliance
export const consents = pgTable("consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  elderlyUserId: varchar("elderly_user_id").notNull().references(() => users.id),
  consentType: text("consent_type").notNull(), // 'data_sharing', 'health_monitoring', 'family_access', etc.
  granted: boolean("granted").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).default(sql`now()`),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  witnessByFamily: varchar("witness_by_family").references(() => users.id),
  witnessByProfessional: varchar("witness_by_professional").references(() => users.id),
  details: jsonb("details"), // Additional consent details
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ReminderCompletion = typeof reminderCompletions.$inferSelect;
export type InsertReminderCompletion = z.infer<typeof insertReminderCompletionSchema>;

// Memory types and schemas
export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type InsertMemory = typeof memories.$inferInsert;

// RBAC types
export type FamilyAssignment = typeof familyAssignments.$inferSelect;
export type InsertFamilyAssignment = typeof familyAssignments.$inferInsert;
export type ProfessionalAssignment = typeof professionalAssignments.$inferSelect;
export type InsertProfessionalAssignment = typeof professionalAssignments.$inferInsert;
export type Consent = typeof consents.$inferSelect;
export type InsertConsent = typeof consents.$inferInsert;

// Municipality types
export type Municipality = typeof municipalities.$inferSelect;
export type InsertMunicipality = typeof municipalities.$inferInsert;

// Program activities table
export const programActivities = pgTable("program_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  activityType: text("activity_type").notNull(), // cognitive_exercise, physical_activity, etc.
  instructions: text("instructions"),
  difficulty: text("difficulty").default("medium"), // easy, medium, hard
  assignedUsers: integer("assigned_users").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const insertProgramActivitySchema = createInsertSchema(programActivities).omit({
  id: true,
  createdAt: true,
});

export type ProgramActivity = typeof programActivities.$inferSelect;
export type InsertProgramActivity = z.infer<typeof insertProgramActivitySchema>;

// Memory item interface for AI extraction
export type MemoryItem = {
  type: "PREFERENCE" | "ROUTINE" | "CONTACT" | "FACT" | "GOAL" | "HEALTH_NOTE";
  content: string;
  importance?: number;
  expires_at?: string | null;
};

// Analytics and Metrics Tables
export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  userRole: text("user_role").notNull(), // elderly, family, professional
  metricType: text("metric_type").notNull(), // engagement, health, effectiveness, ai_quality
  metricName: text("metric_name").notNull(), // specific metric name
  metricValue: real("metric_value").notNull(),
  metadata: jsonb("metadata"), // additional context
  timestamp: timestamp("timestamp", { withTimezone: true }).default(sql`now()`).notNull(),
  sessionId: varchar("session_id"), // optional link to chat session
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull()
});

export const metricsEvents = pgTable("metrics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(), // login, reminder_completed, ai_interaction, etc
  eventCategory: text("event_category").notNull(), // engagement, health, communication
  eventData: jsonb("event_data"), // flexible data for different event types
  duration: integer("duration"), // for timed events in seconds
  success: boolean("success").default(true),
  errorDetails: text("error_details"),
  userAgent: text("user_agent"), // browser/device info
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull()
});

// Aggregated metrics view (computed periodically)
export const metricsAggregates = pgTable("metrics_aggregates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userRole: text("user_role"),
  aggregationType: text("aggregation_type").notNull(), // daily, weekly, monthly
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  metrics: jsonb("metrics").notNull(), // aggregated metrics data
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull()
});

// Create insert schemas for the new tables
export const insertAnalyticsSchema = createInsertSchema(analytics).omit({ id: true, createdAt: true, timestamp: true });
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;

export const insertMetricsEventSchema = createInsertSchema(metricsEvents).omit({ id: true, createdAt: true });
export type InsertMetricsEvent = z.infer<typeof insertMetricsEventSchema>;
export type MetricsEvent = typeof metricsEvents.$inferSelect;

export const insertMetricsAggregateSchema = createInsertSchema(metricsAggregates).omit({ id: true, createdAt: true });
export type InsertMetricsAggregate = z.infer<typeof insertMetricsAggregateSchema>;
export type MetricsAggregate = typeof metricsAggregates.$inferSelect;
