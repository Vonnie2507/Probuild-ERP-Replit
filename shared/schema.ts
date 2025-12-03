import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "sales",
  "scheduler",
  "production_manager",
  "warehouse",
  "installer",
  "trade_client"
]);

export const clientTypeEnum = pgEnum("client_type", ["public", "trade"]);

export const tradeDiscountLevelEnum = pgEnum("trade_discount_level", [
  "bronze",
  "silver",
  "gold",
  "platinum"
]);

export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "contacted",
  "needs_quote",
  "quote_sent",
  "follow_up",
  "won",
  "lost"
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "website",
  "phone",
  "referral",
  "trade",
  "walk_in",
  "social_media",
  "other"
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "approved",
  "declined",
  "expired"
]);

export const jobTypeEnum = pgEnum("job_type", ["supply_only", "supply_install"]);

export const jobStatusEnum = pgEnum("job_status", [
  "accepted",
  "awaiting_deposit",
  "deposit_paid",
  "ready_for_production",
  "manufacturing_posts",
  "manufacturing_panels",
  "manufacturing_gates",
  "qa_check",
  "ready_for_scheduling",
  "scheduled",
  "install_posts",
  "install_panels",
  "install_gates",
  "install_complete",
  "awaiting_final_payment",
  "paid_in_full",
  "archived"
]);

export const productCategoryEnum = pgEnum("product_category", [
  "posts",
  "rails",
  "pickets",
  "caps",
  "gates",
  "hardware",
  "accessories"
]);

export const productionTaskTypeEnum = pgEnum("production_task_type", [
  "cutting",
  "routing",
  "assembly",
  "qa"
]);

export const productionTaskStatusEnum = pgEnum("production_task_status", [
  "pending",
  "in_progress",
  "completed",
  "on_hold"
]);

export const installTaskStatusEnum = pgEnum("install_task_status", [
  "scheduled",
  "on_site",
  "in_progress",
  "completed",
  "rescheduled"
]);

export const paymentTypeEnum = pgEnum("payment_type", [
  "deposit",
  "final",
  "refund",
  "credit_note",
  "adjustment"
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "stripe",
  "bank_transfer",
  "cash",
  "cheque"
]);

export const scheduleEventTypeEnum = pgEnum("schedule_event_type", [
  "install",
  "site_measure",
  "pickup",
  "delivery",
  "production"
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("sales"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  clientType: clientTypeEnum("client_type").notNull().default("public"),
  tradeDiscountLevel: tradeDiscountLevelEnum("trade_discount_level"),
  companyName: text("company_name"),
  abn: text("abn"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  source: leadSourceEnum("source").notNull().default("website"),
  leadType: clientTypeEnum("lead_type").notNull().default("public"),
  description: text("description"),
  siteAddress: text("site_address"),
  measurementsProvided: boolean("measurements_provided").default(false),
  fenceLength: decimal("fence_length", { precision: 10, scale: 2 }),
  fenceStyle: text("fence_style"),
  stage: leadStageEnum("stage").notNull().default("new"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Fence Styles table
export const fenceStyles = pgTable("fence_styles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  standardHeights: jsonb("standard_heights").$type<number[]>(),
  postTypes: jsonb("post_types").$type<string[]>(),
  picketSpacingOptions: jsonb("picket_spacing_options").$type<number[]>(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: productCategoryEnum("category").notNull(),
  dimensions: text("dimensions"),
  color: text("color"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellPrice: decimal("sell_price", { precision: 10, scale: 2 }).notNull(),
  tradePrice: decimal("trade_price", { precision: 10, scale: 2 }),
  stockOnHand: integer("stock_on_hand").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quotes table
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteNumber: text("quote_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  leadId: varchar("lead_id").references(() => leads.id),
  fenceStyleId: varchar("fence_style_id").references(() => fenceStyles.id),
  siteAddress: text("site_address"),
  totalLength: decimal("total_length", { precision: 10, scale: 2 }),
  fenceHeight: decimal("fence_height", { precision: 10, scale: 2 }),
  lineItems: jsonb("line_items").$type<QuoteLineItem[]>(),
  materialsSubtotal: decimal("materials_subtotal", { precision: 10, scale: 2 }),
  labourEstimate: decimal("labour_estimate", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositRequired: decimal("deposit_required", { precision: 10, scale: 2 }),
  depositPercent: integer("deposit_percent").default(50),
  status: quoteStatusEnum("status").notNull().default("draft"),
  isTradeQuote: boolean("is_trade_quote").default(false),
  tradeDiscount: decimal("trade_discount", { precision: 5, scale: 2 }),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
  approvedAt: timestamp("approved_at"),
});

// Quote Line Item type
export type QuoteLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
};

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobNumber: text("job_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  quoteId: varchar("quote_id").references(() => quotes.id).notNull(),
  jobType: jobTypeEnum("job_type").notNull().default("supply_install"),
  siteAddress: text("site_address").notNull(),
  status: jobStatusEnum("status").notNull().default("accepted"),
  fenceStyle: text("fence_style"),
  totalLength: decimal("total_length", { precision: 10, scale: 2 }),
  fenceHeight: decimal("fence_height", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  depositPaid: boolean("deposit_paid").default(false),
  depositPaidAt: timestamp("deposit_paid_at"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }),
  finalPaid: boolean("final_paid").default(false),
  finalPaidAt: timestamp("final_paid_at"),
  assignedInstaller: varchar("assigned_installer").references(() => users.id),
  scheduledStartDate: timestamp("scheduled_start_date"),
  scheduledEndDate: timestamp("scheduled_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  completionDate: timestamp("completion_date"),
  notes: text("notes"),
  installerNotes: text("installer_notes"),
  variationNotes: text("variation_notes"),
  photos: jsonb("photos").$type<JobPhoto[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Job Photo type
export type JobPhoto = {
  url: string;
  type: "before" | "during" | "after" | "variation";
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
};

// Bill of Materials (BOM) table
export const bom = pgTable("bom", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  items: jsonb("items").$type<BOMItem[]>(),
  wastagePercent: decimal("wastage_percent", { precision: 5, scale: 2 }).default("5"),
  estimatedMachineTime: decimal("estimated_machine_time", { precision: 10, scale: 2 }),
  estimatedLabourTime: decimal("estimated_labour_time", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// BOM Item type
export type BOMItem = {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  cutLength?: number;
  notes?: string;
};

// Production Tasks table
export const productionTasks = pgTable("production_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  taskType: productionTaskTypeEnum("task_type").notNull(),
  status: productionTaskStatusEnum("status").notNull().default("pending"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  machineUsed: text("machine_used"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  timeSpentMinutes: integer("time_spent_minutes"),
  notes: text("notes"),
  qaResult: text("qa_result"),
  qaPassedAt: timestamp("qa_passed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Install Tasks table
export const installTasks = pgTable("install_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  installerId: varchar("installer_id").references(() => users.id).notNull(),
  status: installTaskStatusEnum("status").notNull().default("scheduled"),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  notes: text("notes"),
  variationsFound: text("variations_found"),
  photos: jsonb("photos").$type<JobPhoto[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schedule Events table
export const scheduleEvents = pgTable("schedule_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id),
  eventType: scheduleEventTypeEnum("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isConfirmed: boolean("is_confirmed").default(false),
  clientNotified: boolean("client_notified").default(false),
  installerNotified: boolean("installer_notified").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  jobId: varchar("job_id").references(() => jobs.id),
  quoteId: varchar("quote_id").references(() => quotes.id),
  invoiceNumber: text("invoice_number"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: paymentTypeEnum("payment_type").notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSessionId: text("stripe_session_id"),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  xeroInvoiceId: text("xero_invoice_id"),
  xeroSyncStatus: text("xero_sync_status"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// SMS Log table
export const smsLogs = pgTable("sms_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientPhone: text("recipient_phone").notNull(),
  recipientName: text("recipient_name"),
  message: text("message").notNull(),
  twilioMessageSid: text("twilio_message_sid"),
  status: text("status").notNull().default("pending"),
  isOutbound: boolean("is_outbound").notNull().default(true),
  isRead: boolean("is_read").notNull().default(false),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// SMS Conversations table - tracks conversation metadata per phone number
export const smsConversations = pgTable("sms_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  unreadCount: integer("unread_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Message Ranges - bundles of messages attached to opportunities
export const messageRanges = pgTable("message_ranges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => smsConversations.id).notNull(),
  leadId: varchar("lead_id").references(() => leads.id),
  jobId: varchar("job_id").references(() => jobs.id),
  quoteId: varchar("quote_id").references(() => quotes.id),
  startMessageId: varchar("start_message_id").references(() => smsLogs.id).notNull(),
  endMessageId: varchar("end_message_id").references(() => smsLogs.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  messageCount: integer("message_count").notNull(),
  summary: text("summary"),
  attachedBy: varchar("attached_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Activity Log table
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  jobId: varchar("job_id").references(() => jobs.id),
  quoteId: varchar("quote_id").references(() => quotes.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFenceStyleSchema = createInsertSchema(fenceStyles).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  approvedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBOMSchema = createInsertSchema(bom).omit({
  id: true,
  createdAt: true,
});

export const insertProductionTaskSchema = createInsertSchema(productionTasks).omit({
  id: true,
  createdAt: true,
});

export const insertInstallTaskSchema = createInsertSchema(installTasks).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSMSLogSchema = createInsertSchema(smsLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSMSConversationSchema = createInsertSchema(smsConversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageRangeSchema = createInsertSchema(messageRanges).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export type InsertFenceStyle = z.infer<typeof insertFenceStyleSchema>;
export type FenceStyle = typeof fenceStyles.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertBOM = z.infer<typeof insertBOMSchema>;
export type BOM = typeof bom.$inferSelect;

export type InsertProductionTask = z.infer<typeof insertProductionTaskSchema>;
export type ProductionTask = typeof productionTasks.$inferSelect;

export type InsertInstallTask = z.infer<typeof insertInstallTaskSchema>;
export type InstallTask = typeof installTasks.$inferSelect;

export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertSMSLog = z.infer<typeof insertSMSLogSchema>;
export type SMSLog = typeof smsLogs.$inferSelect;

export type InsertSMSConversation = z.infer<typeof insertSMSConversationSchema>;
export type SMSConversation = typeof smsConversations.$inferSelect;

export type InsertMessageRange = z.infer<typeof insertMessageRangeSchema>;
export type MessageRange = typeof messageRanges.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
