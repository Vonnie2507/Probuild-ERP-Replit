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

// Job Setup Document status enum
export const jobSetupStatusEnum = pgEnum("job_setup_status", [
  "draft",
  "in_progress",
  "ready_for_production",
  "ready_for_scheduling",
  "ready_for_install",
  "completed"
]);

// Old fence material enum for job setup
export const oldFenceMaterialEnum = pgEnum("old_fence_material", [
  "wood",
  "colorbond",
  "limestone",
  "brick",
  "other",
  "none"
]);

// Job setup product category enum
export const jobSetupProductCategoryEnum = pgEnum("job_setup_product_category", [
  "post",
  "rail",
  "panel",
  "cap",
  "gate",
  "hardware",
  "accessory",
  "cement",
  "pallet",
  "other"
]);

// Lead activity type enum
export const leadActivityTypeEnum = pgEnum("lead_activity_type", [
  "call_logged",
  "call_missed",
  "call_scheduled",
  "email_sent",
  "email_received",
  "sms_sent",
  "note_added",
  "quote_created",
  "quote_sent",
  "quote_approved",
  "quote_declined",
  "site_visit_scheduled",
  "site_visit_completed",
  "catalogue_sent",
  "form_sent",
  "lead_created",
  "lead_updated",
  "stage_changed",
  "assigned_changed",
  "converted_to_job"
]);

// Lead task status enum
export const leadTaskStatusEnum = pgEnum("lead_task_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled"
]);

// Lead task priority enum
export const leadTaskPriorityEnum = pgEnum("lead_task_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);

// Call direction enum for call logs
export const callDirectionEnum = pgEnum("call_direction", [
  "outbound",
  "inbound",
  "missed"
]);

// Transcription status enum for call logs
export const transcriptionStatusEnum = pgEnum("transcription_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "not_applicable"
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
  // Staff profile fields
  positionTitle: text("position_title"),
  profilePhotoUrl: text("profile_photo_url"),
});

// Staff Leave Balances table
export const staffLeaveBalances = pgTable("staff_leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  annualLeaveBalanceHours: decimal("annual_leave_balance_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  sickLeaveBalanceHours: decimal("sick_leave_balance_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  upcomingLeaveStart: timestamp("upcoming_leave_start"),
  upcomingLeaveEnd: timestamp("upcoming_leave_end"),
  upcomingLeaveType: text("upcoming_leave_type"), // 'annual' | 'sick' | 'other'
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  leadNumber: text("lead_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id),
  source: leadSourceEnum("source").notNull().default("website"),
  leadType: clientTypeEnum("lead_type").notNull().default("public"),
  jobFulfillmentType: jobTypeEnum("job_fulfillment_type").default("supply_install"),
  description: text("description"),
  siteAddress: text("site_address"),
  measurementsProvided: boolean("measurements_provided").default(false),
  fenceLength: decimal("fence_length", { precision: 10, scale: 2 }),
  fenceStyle: text("fence_style"),
  stage: leadStageEnum("stage").notNull().default("new"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  // Soil/site assessment data
  soilWarning: text("soil_warning"), // Short label: LIMESTONE, CLAY, ROCK, etc.
  soilInstallNotes: text("soil_install_notes"), // Full installation notes
  siteLatitude: decimal("site_latitude", { precision: 10, scale: 7 }),
  siteLongitude: decimal("site_longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Lead Activities table - activity log for leads
export const leadActivities = pgTable("lead_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  activityType: leadActivityTypeEnum("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  
  // Call-specific fields (used when activityType is call_logged/call_missed/call_scheduled)
  callDirection: callDirectionEnum("call_direction"),
  callTimestamp: timestamp("call_timestamp"),
  callDurationSeconds: integer("call_duration_seconds"),
  staffMemberId: varchar("staff_member_id").references(() => users.id),
  callNotes: text("call_notes"),
  audioRecordingUrl: text("audio_recording_url"),
  aiSummaryText: text("ai_summary_text"),
  callTranscriptionText: text("call_transcription_text"),
  transcriptionStatus: transcriptionStatusEnum("transcription_status").default("not_applicable"),
});

// Lead Tasks table - follow-up reminders and tasks for leads
export const leadTasks = pgTable("lead_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: leadTaskPriorityEnum("priority").notNull().default("medium"),
  status: leadTaskStatusEnum("status").notNull().default("pending"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Link task back to a specific activity (e.g., task created from a call log)
  sourceActivityId: varchar("source_activity_id").references(() => leadActivities.id),
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
  invoiceNumber: text("invoice_number").unique(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  leadId: varchar("lead_id").references(() => leads.id),
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
  hasGate: boolean("has_gate").default(false),
  isDelayed: boolean("is_delayed").default(false),
  isWaitingOnClient: boolean("is_waiting_on_client").default(false),
  stagesCompleted: jsonb("stages_completed").$type<number[]>().default([]),
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

// ============================================
// JOB SETUP DOCUMENT TYPES (JSONB Sections)
// ============================================

// Section 1: Sales Setup - Site Conditions & Requirements
export type JobSetupSection1Sales = {
  // Property & Access
  oldFenceBeingRemoved?: boolean;
  oldFenceMaterial?: string;
  oldFenceAgeYears?: string;
  allFootingsRemoved?: boolean;
  reticInGround?: boolean;
  reticNotes?: string;
  undergroundServicesKnown?: boolean;
  undergroundServicesNotes?: string;
  poolArea?: boolean;
  dogsOnSite?: boolean;
  lockedGatesOrRestrictedAccess?: boolean;
  someoneHomeOnInstallDay?: boolean;
  drivewayAccessDescription?: string;
  steepOrSlopingSite?: boolean;
  siteHazardsNotes?: string;
  
  // Equipment Required
  needsCoreDrill?: boolean;
  needsChainsaw?: boolean;
  needsAuger?: boolean;
  needsSkipBin?: boolean;
  needsExtraLabor?: boolean;
  equipmentOtherNotes?: string;
  
  // Measurements / Fence Layout
  fenceTotalMetres?: number;
  fenceHeightMm?: number;
  numGates?: number;
  gateOpeningsDescription?: string;
  rakedOrStepped?: string;
  panelsLayoutNotes?: string;
  
  // Site Plan / Visual
  sitePlanImageUrl?: string;
  additionalPhotosUrls?: string[];
  
  // Client Confirmation
  clientConfirmationText?: string;
  clientSignedSalesSetup?: boolean;
  clientSignedAt?: string;
};

// Section 2: Product List / BOM metadata (actual products in job_setup_products table)
export type JobSetupSection2ProductsMeta = {
  autoPopulatedFromQuote?: boolean;
  quoteId?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  notes?: string;
};

// Section 3: Production Handover
export type JobSetupSection3Production = {
  postsManufactured?: boolean;
  panelsManufactured?: boolean;
  gatesFabricated?: boolean;
  hardwarePacked?: boolean;
  accessoriesPacked?: boolean;
  cementAndMaterialsPrepared?: boolean;
  productionSpecialNotes?: string;
  productionCompletedBy?: string;
  productionCompletedAt?: string;
};

// Section 4: Scheduling Setup
export type JobSetupSection4Schedule = {
  schedulingReadyForInstall?: boolean;
  proposedInstallDate?: string;
  confirmInstallDateWithClient?: boolean;
  installTimeWindow?: string;
  installerTeamAssigned?: string;
  isSupplyOnlyPickup?: boolean;
  pickupOrDeliveryNotes?: string;
  schedulerNotes?: string;
  scheduledBy?: string;
  scheduledAt?: string;
  
  // Equipment summary (derived from Section 1 for visibility)
  requiresCoreDrill?: boolean;
  requiresChainsaw?: boolean;
  requiresAuger?: boolean;
  requiresSkipBin?: boolean;
};

// Section 5: Installer Checklist & Client Signoff
export type JobSetupSection5Install = {
  // Pre-start checklist
  installerCheckedMaterialsComplete?: boolean;
  installerCheckedToolsLoaded?: boolean;
  installerConfirmedSiteAccessOk?: boolean;
  installerReadSiteNotes?: boolean;
  installerPrestartNotes?: string;
  installerPrestartCompletedBy?: string;
  installerPrestartCompletedAt?: string;
  
  // Completion on site
  installCompleted?: boolean;
  installPhotosUrls?: string[];
  completionNotes?: string;
  clientSignedCompletion?: boolean;
  clientSignedCompletionAt?: string;
  installerCompletionBy?: string;
  installerCompletionAt?: string;
};

// ============================================
// LIVE DOCUMENT TEMPLATES
// ============================================

// Template section configuration type
export type TemplateSectionConfig = {
  title?: string;
  description?: string;
  enabledFields?: string[];
  defaultValues?: Record<string, unknown>;
  requiredBeforeComplete?: string[];
};

// Live Document Templates - reusable templates for job setup documents
export const liveDocumentTemplates = pgTable("live_document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  // Section configurations (customize which fields are shown/required)
  section1Config: jsonb("section1_config").$type<TemplateSectionConfig>(),
  section2Config: jsonb("section2_config").$type<TemplateSectionConfig>(),
  section3Config: jsonb("section3_config").$type<TemplateSectionConfig>(),
  section4Config: jsonb("section4_config").$type<TemplateSectionConfig>(),
  section5Config: jsonb("section5_config").$type<TemplateSectionConfig>(),
  
  // Default values for new documents
  section1Defaults: jsonb("section1_defaults").$type<JobSetupSection1Sales>(),
  section2Defaults: jsonb("section2_defaults").$type<JobSetupSection2ProductsMeta>(),
  section3Defaults: jsonb("section3_defaults").$type<JobSetupSection3Production>(),
  section4Defaults: jsonb("section4_defaults").$type<JobSetupSection4Schedule>(),
  section5Defaults: jsonb("section5_defaults").$type<JobSetupSection5Install>(),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLiveDocumentTemplateSchema = createInsertSchema(liveDocumentTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLiveDocumentTemplate = z.infer<typeof insertLiveDocumentTemplateSchema>;
export type LiveDocumentTemplate = typeof liveDocumentTemplates.$inferSelect;

// ============================================
// JOB SETUP DOCUMENT TABLES
// ============================================

// Job Setup Documents - main document table (now supports lead-level documents too)
export const jobSetupDocuments = pgTable("job_setup_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Can be linked to either a job OR a lead (one must be set)
  jobId: varchar("job_id").references(() => jobs.id).unique(),
  leadId: varchar("lead_id").references(() => leads.id),
  templateId: varchar("template_id").references(() => liveDocumentTemplates.id),
  jobType: jobTypeEnum("job_type").notNull(),
  status: jobSetupStatusEnum("status").notNull().default("draft"),
  
  // Section completion flags
  section1Complete: boolean("section1_complete").default(false),
  section2Complete: boolean("section2_complete").default(false),
  section3Complete: boolean("section3_complete").default(false),
  section4Complete: boolean("section4_complete").default(false),
  section5Complete: boolean("section5_complete").default(false),
  
  // JSONB sections
  section1Sales: jsonb("section1_sales").$type<JobSetupSection1Sales>(),
  section2ProductsMeta: jsonb("section2_products_meta").$type<JobSetupSection2ProductsMeta>(),
  section3Production: jsonb("section3_production").$type<JobSetupSection3Production>(),
  section4Schedule: jsonb("section4_schedule").$type<JobSetupSection4Schedule>(),
  section5Install: jsonb("section5_install").$type<JobSetupSection5Install>(),
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Job Setup Products - BOM items for the job setup document
export const jobSetupProducts = pgTable("job_setup_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobSetupDocumentId: varchar("job_setup_document_id").references(() => jobSetupDocuments.id).notNull(),
  productId: varchar("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  category: jobSetupProductCategoryEnum("category").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unitInfo: text("unit_info"),
  notes: text("notes"),
  sourceQuoteLineId: varchar("source_quote_line_id"),
  addedBy: varchar("added_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

// Quote Follow-ups table - track follow-up activities for quotes
export const quoteFollowUps = pgTable("quote_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedAt: timestamp("completed_at"),
  followUpType: text("follow_up_type").notNull(), // call, email, sms, meeting
  notes: text("notes"),
  outcome: text("outcome"), // no_answer, left_message, spoke_with_client, meeting_scheduled, quote_approved, quote_declined
  assignedTo: varchar("assigned_to").references(() => users.id),
  completedBy: varchar("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Automation campaign status enum
export const campaignStatusEnum = pgEnum("campaign_status", [
  "active",
  "paused",
  "completed",
  "cancelled"
]);

// Automation campaign trigger enum
export const campaignTriggerEnum = pgEnum("campaign_trigger", [
  "quote_sent",
  "quote_no_response_3_days",
  "quote_no_response_7_days",
  "quote_expiring_soon",
  "quote_expired",
  "lead_new",
  "lead_no_contact_24h",
  "job_completed",
  "payment_due"
]);

// Automation Campaigns table - define automated message sequences
export const automationCampaigns = pgTable("automation_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  trigger: campaignTriggerEnum("trigger").notNull(),
  clientType: clientTypeEnum("client_type"), // null means apply to all
  isActive: boolean("is_active").notNull().default(true),
  messageTemplate: text("message_template").notNull(),
  delayDays: integer("delay_days").notNull().default(0), // days after trigger to send
  delayHours: integer("delay_hours").notNull().default(0), // additional hours
  sendWindow: text("send_window"), // e.g. "09:00-17:00" to only send during business hours
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// PROFIT & LOSS COST TRACKING SYSTEM
// ============================================

// Trip type enum - different types of site visits
export const tripTypeEnum = pgEnum("trip_type", [
  "site_quote",        // Initial site measurement/quote
  "post_install",      // Installing posts
  "panel_install",     // Installing panels
  "gate_install",      // Installing sliding gate
  "welder_dropoff",    // Dropping materials at welder
  "welder_pickup",     // Picking up from welder
  "powder_coat_dropoff", // Dropping at powder coater
  "powder_coat_pickup",  // Picking up from powder coater
  "supplier_delivery",   // Supplier delivering materials
  "follow_up",           // Follow-up visit
  "warranty"             // Warranty/repair visit
]);

// Admin activity type enum
export const adminActivityEnum = pgEnum("admin_activity_type", [
  "quote_creation",      // Time spent creating the quote
  "client_messaging",    // SMS/email correspondence
  "client_call",         // Phone calls
  "spec_gathering",      // Getting fence specifications
  "scheduling",          // Scheduling activities
  "invoicing",           // Creating/sending invoices
  "follow_up",           // Following up on quote/payment
  "general_admin"        // Other admin tasks
]);

// Travel status enum
export const travelStatusEnum = pgEnum("travel_status", [
  "not_started",
  "in_transit",
  "arrived",
  "completed",
  "cancelled"
]);

// Ground condition enum - affects installation costs
export const groundConditionEnum = pgEnum("ground_condition", [
  "standard",           // Normal ground, no obstacles
  "rocky",              // Rocky ground - extra work
  "concrete",           // Existing concrete/footings
  "existing_fence",     // Need to remove existing fence
  "existing_footings",  // Need to remove existing footings
  "sloped",             // Sloped ground
  "sandy",              // Sandy soil
  "clay"                // Clay soil
]);

// Material source enum - where products come from
export const materialSourceEnum = pgEnum("material_source", [
  "manufactured",       // Made in-house (PVC)
  "glass_supplier",     // External glass supplier
  "colorbond_supplier", // External colorbond supplier
  "hardware_supplier",  // Hardware/accessories
  "other"
]);

// Staff Rate Cards - configurable hourly rates by role
export const staffRateCards = pgTable("staff_rate_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  role: userRoleEnum("role"),
  rateType: text("rate_type").notNull(), // manufacturing, installation, admin, travel
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quote Cost Components - individual cost line items for a quote/job
export const quoteCostComponents = pgTable("quote_cost_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id).notNull(),
  jobId: varchar("job_id").references(() => jobs.id),
  category: text("category").notNull(), // materials, manufacturing_labour, install_labour, travel, admin, supplier_fees, third_party
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  staffId: varchar("staff_id").references(() => users.id),
  materialSource: materialSourceEnum("material_source"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Quote Trips - track each site visit with time and mileage
export const quoteTrips = pgTable("quote_trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id),
  jobId: varchar("job_id").references(() => jobs.id),
  tripType: tripTypeEnum("trip_type").notNull(),
  staffId: varchar("staff_id").references(() => users.id).notNull(),
  scheduledDate: timestamp("scheduled_date"),
  actualDate: timestamp("actual_date"),
  departureTime: timestamp("departure_time"),
  arrivalTime: timestamp("arrival_time"),
  departureReturnTime: timestamp("departure_return_time"),
  returnArrivalTime: timestamp("return_arrival_time"),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
  durationMinutes: integer("duration_minutes"),
  fuelCost: decimal("fuel_cost", { precision: 10, scale: 2 }),
  travelCostTotal: decimal("travel_cost_total", { precision: 10, scale: 2 }),
  status: travelStatusEnum("status").notNull().default("not_started"),
  clientNotified: boolean("client_notified").default(false),
  clientNotifiedAt: timestamp("client_notified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quote Admin Time - track time spent on admin activities
export const quoteAdminTime = pgTable("quote_admin_time", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id),
  jobId: varchar("job_id").references(() => jobs.id),
  staffId: varchar("staff_id").references(() => users.id).notNull(),
  activityType: adminActivityEnum("activity_type").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  description: text("description"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  isAutoTracked: boolean("is_auto_tracked").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Travel Sessions - active navigation sessions for real-time tracking
export const travelSessions = pgTable("travel_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => quoteTrips.id).notNull(),
  staffId: varchar("staff_id").references(() => users.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  startLatitude: decimal("start_latitude", { precision: 10, scale: 7 }),
  startLongitude: decimal("start_longitude", { precision: 10, scale: 7 }),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 7 }),
  currentLongitude: decimal("current_longitude", { precision: 10, scale: 7 }),
  endLatitude: decimal("end_latitude", { precision: 10, scale: 7 }),
  endLongitude: decimal("end_longitude", { precision: 10, scale: 7 }),
  estimatedArrivalTime: timestamp("estimated_arrival_time"),
  actualArrivalTime: timestamp("actual_arrival_time"),
  status: travelStatusEnum("status").notNull().default("not_started"),
  clientNotificationSent: boolean("client_notification_sent").default(false),
  clientNotificationSentAt: timestamp("client_notification_sent_at"),
  twilioMessageSid: text("twilio_message_sid"),
  routeData: jsonb("route_data"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quote Ground Conditions - track site conditions affecting costs
export const quoteGroundConditions = pgTable("quote_ground_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id).notNull(),
  condition: groundConditionEnum("condition").notNull(),
  affectedLengthMeters: decimal("affected_length_meters", { precision: 10, scale: 2 }),
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }),
  additionalTimeMinutes: integer("additional_time_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quote P&L Summary - aggregated profit/loss data for quick access
export const quotePLSummary = pgTable("quote_pl_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id).notNull().unique(),
  jobId: varchar("job_id").references(() => jobs.id),
  
  // Revenue
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  
  // Costs by category
  materialsCost: decimal("materials_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  manufacturingLabourCost: decimal("manufacturing_labour_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  installationLabourCost: decimal("installation_labour_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  travelCost: decimal("travel_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  adminCost: decimal("admin_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  supplierDeliveryFees: decimal("supplier_delivery_fees", { precision: 10, scale: 2 }).notNull().default("0"),
  thirdPartyCost: decimal("third_party_cost", { precision: 10, scale: 2 }).notNull().default("0"), // welder, powder coater
  groundConditionsCost: decimal("ground_conditions_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  
  // Totals
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  profitAmount: decimal("profit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  profitMarginPercent: decimal("profit_margin_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  
  // Metadata
  isSupplyOnly: boolean("is_supply_only").default(false),
  estimatedTripCount: integer("estimated_trip_count").default(1),
  actualTripCount: integer("actual_trip_count").default(0),
  totalManufacturingMinutes: integer("total_manufacturing_minutes").default(0),
  totalInstallMinutes: integer("total_install_minutes").default(0),
  totalAdminMinutes: integer("total_admin_minutes").default(0),
  totalTravelMinutes: integer("total_travel_minutes").default(0),
  
  lastCalculatedAt: timestamp("last_calculated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Campaign Enrollments table - track entities enrolled in campaigns
export const campaignEnrollments = pgTable("campaign_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => automationCampaigns.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  quoteId: varchar("quote_id").references(() => quotes.id),
  leadId: varchar("lead_id").references(() => leads.id),
  jobId: varchar("job_id").references(() => jobs.id),
  status: campaignStatusEnum("status").notNull().default("active"),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  scheduledSendAt: timestamp("scheduled_send_at"),
  sentAt: timestamp("sent_at"),
  messageId: varchar("message_id").references(() => smsLogs.id),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertStaffLeaveBalanceSchema = createInsertSchema(staffLeaveBalances).omit({
  id: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  leadNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadActivitySchema = createInsertSchema(leadActivities).omit({
  id: true,
  createdAt: true,
});

export const insertLeadTaskSchema = createInsertSchema(leadTasks).omit({
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

export const insertQuoteFollowUpSchema = createInsertSchema(quoteFollowUps).omit({
  id: true,
  createdAt: true,
});

export const insertAutomationCampaignSchema = createInsertSchema(automationCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignEnrollmentSchema = createInsertSchema(campaignEnrollments).omit({
  id: true,
  createdAt: true,
  enrolledAt: true,
});

// P&L System Insert Schemas
export const insertStaffRateCardSchema = createInsertSchema(staffRateCards).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteCostComponentSchema = createInsertSchema(quoteCostComponents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteTripSchema = createInsertSchema(quoteTrips).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteAdminTimeSchema = createInsertSchema(quoteAdminTime).omit({
  id: true,
  createdAt: true,
});

export const insertTravelSessionSchema = createInsertSchema(travelSessions).omit({
  id: true,
  createdAt: true,
});

export const insertQuoteGroundConditionSchema = createInsertSchema(quoteGroundConditions).omit({
  id: true,
  createdAt: true,
});

export const insertQuotePLSummarySchema = createInsertSchema(quotePLSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalculatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStaffLeaveBalance = z.infer<typeof insertStaffLeaveBalanceSchema>;
export type StaffLeaveBalance = typeof staffLeaveBalances.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;
export type LeadActivity = typeof leadActivities.$inferSelect;

export type InsertLeadTask = z.infer<typeof insertLeadTaskSchema>;
export type LeadTask = typeof leadTasks.$inferSelect;

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

export type InsertQuoteFollowUp = z.infer<typeof insertQuoteFollowUpSchema>;
export type QuoteFollowUp = typeof quoteFollowUps.$inferSelect;

export type InsertAutomationCampaign = z.infer<typeof insertAutomationCampaignSchema>;
export type AutomationCampaign = typeof automationCampaigns.$inferSelect;

export type InsertCampaignEnrollment = z.infer<typeof insertCampaignEnrollmentSchema>;
export type CampaignEnrollment = typeof campaignEnrollments.$inferSelect;

// P&L System Types
export type InsertStaffRateCard = z.infer<typeof insertStaffRateCardSchema>;
export type StaffRateCard = typeof staffRateCards.$inferSelect;

export type InsertQuoteCostComponent = z.infer<typeof insertQuoteCostComponentSchema>;
export type QuoteCostComponent = typeof quoteCostComponents.$inferSelect;

export type InsertQuoteTrip = z.infer<typeof insertQuoteTripSchema>;
export type QuoteTrip = typeof quoteTrips.$inferSelect;

export type InsertQuoteAdminTime = z.infer<typeof insertQuoteAdminTimeSchema>;
export type QuoteAdminTime = typeof quoteAdminTime.$inferSelect;

export type InsertTravelSession = z.infer<typeof insertTravelSessionSchema>;
export type TravelSession = typeof travelSessions.$inferSelect;

export type InsertQuoteGroundCondition = z.infer<typeof insertQuoteGroundConditionSchema>;
export type QuoteGroundCondition = typeof quoteGroundConditions.$inferSelect;

export type InsertQuotePLSummary = z.infer<typeof insertQuotePLSummarySchema>;
export type QuotePLSummary = typeof quotePLSummary.$inferSelect;

// ============================================
// ORGANISATION HUB MODULE
// ============================================

// Organisation Hub Enums
export const orgContentStatusEnum = pgEnum("org_content_status", ["active", "draft", "archived"]);
export const workflowCategoryEnum = pgEnum("workflow_category", ["sales", "production", "install", "warehouse", "admin", "hr", "safety", "other"]);
export const policyCategoryEnum = pgEnum("policy_category", ["safety", "hr", "warehouse", "vehicles", "equipment", "operations", "other"]);
export const hrFormTypeEnum = pgEnum("hr_form_type", ["incident_report", "leave_request", "training_request", "other"]);
export const hrFormStatusEnum = pgEnum("hr_form_status", ["open", "under_review", "approved", "rejected", "closed"]);
export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "part_time", "casual", "contractor"]);
export const documentTypeEnum = pgEnum("document_type", ["contract", "license", "certificate", "other"]);
export const onboardingStatusEnum = pgEnum("onboarding_status", ["not_started", "in_progress", "complete"]);
export const sessionStatusEnum = pgEnum("session_status", ["scheduled", "completed", "cancelled"]);
export const noteVisibilityEnum = pgEnum("note_visibility", ["shared_with_employee", "manager_only", "hr_only"]);
export const actionItemStatusEnum = pgEnum("action_item_status", ["open", "in_progress", "done"]);
export const mediaEntityTypeEnum = pgEnum("media_entity_type", ["one_on_one_session", "hr_form", "workflow", "policy", "other"]);
export const mediaFileTypeEnum = pgEnum("media_file_type", ["audio", "video", "image", "pdf", "other"]);
export const diagramTypeEnum = pgEnum("diagram_type", ["uploaded_image", "embedded_tool", "json_flow"]);
export const resourceTypeEnum = pgEnum("resource_type", ["file", "link"]);
export const knowledgeSourceTypeEnum = pgEnum("knowledge_source_type", ["manual", "imported_from_workflow", "imported_from_policy", "external"]);

// Departments table - organisational structure
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  managerUserId: varchar("manager_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workflows table - standard operating procedures
export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  departmentId: varchar("department_id").references(() => departments.id),
  category: workflowCategoryEnum("category").notNull(),
  status: orgContentStatusEnum("status").notNull().default("draft"),
  currentVersionId: varchar("current_version_id"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workflow versions - version history for workflows
export const workflowVersions = pgTable("workflow_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").references(() => workflows.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  contentMarkdown: text("content_markdown"),
  jsonSteps: jsonb("json_steps"),
  changeSummary: text("change_summary"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(false),
});

// Policies table - company policies
export const policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: policyCategoryEnum("category").notNull(),
  departmentId: varchar("department_id").references(() => departments.id),
  status: orgContentStatusEnum("status").notNull().default("draft"),
  currentVersionId: varchar("current_version_id"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Policy versions - version history for policies
export const policyVersions = pgTable("policy_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => policies.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  contentMarkdown: text("content_markdown"),
  fileUrl: text("file_url"),
  changeSummary: text("change_summary"),
  effectiveFrom: timestamp("effective_from"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPublished: boolean("is_published").notNull().default(false),
});

// Policy acknowledgements - track who has read/acknowledged policies
export const policyAcknowledgements = pgTable("policy_acknowledgements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => policies.id).notNull(),
  policyVersionId: varchar("policy_version_id").references(() => policyVersions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").notNull().defaultNow(),
});

// Knowledge articles - internal how-to content
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  contentMarkdown: text("content_markdown"),
  departmentId: varchar("department_id").references(() => departments.id),
  tags: jsonb("tags"),
  sourceType: knowledgeSourceTypeEnum("source_type").notNull().default("manual"),
  relatedWorkflowId: varchar("related_workflow_id").references(() => workflows.id),
  relatedPolicyId: varchar("related_policy_id").references(() => policies.id),
  isPublished: boolean("is_published").notNull().default(false),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// HR Forms - generic form submissions
export const hrForms = pgTable("hr_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: hrFormTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: hrFormStatusEnum("status").notNull().default("open"),
  submittedByUserId: varchar("submitted_by_user_id").references(() => users.id).notNull(),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  departmentId: varchar("department_id").references(() => departments.id),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Staff Records - HR profile for employees
export const staffRecords = pgTable("staff_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  positionTitle: text("position_title"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  employmentType: employmentTypeEnum("employment_type"),
  managerUserId: varchar("manager_user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Staff Documents - contracts, licenses, certificates
export const staffDocuments = pgTable("staff_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffRecordId: varchar("staff_record_id").references(() => staffRecords.id).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  issuedDate: timestamp("issued_date"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Onboarding Checklists - templates for onboarding
export const onboardingChecklists = pgTable("onboarding_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  departmentId: varchar("department_id").references(() => departments.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Onboarding Tasks - tasks in a checklist template
export const onboardingTasks = pgTable("onboarding_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  onboardingChecklistId: varchar("onboarding_checklist_id").references(() => onboardingChecklists.id).notNull(),
  taskOrder: integer("task_order").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(true),
});

// Onboarding Assignments - assign checklist to staff member
export const onboardingAssignments = pgTable("onboarding_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffRecordId: varchar("staff_record_id").references(() => staffRecords.id).notNull(),
  onboardingChecklistId: varchar("onboarding_checklist_id").references(() => onboardingChecklists.id).notNull(),
  assignedDate: timestamp("assigned_date").notNull().defaultNow(),
  completedDate: timestamp("completed_date"),
  status: onboardingStatusEnum("status").notNull().default("not_started"),
});

// Onboarding Assignment Tasks - individual task completion
export const onboardingAssignmentTasks = pgTable("onboarding_assignment_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  onboardingAssignmentId: varchar("onboarding_assignment_id").references(() => onboardingAssignments.id).notNull(),
  onboardingTaskId: varchar("onboarding_task_id").references(() => onboardingTasks.id).notNull(),
  status: onboardingStatusEnum("status").notNull().default("not_started"),
  completedAt: timestamp("completed_at"),
  completedByUserId: varchar("completed_by_user_id").references(() => users.id),
});

// One-on-One Sessions - 1:1 meetings
export const oneOnOneSessions = pgTable("one_on_one_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeUserId: varchar("employee_user_id").references(() => users.id).notNull(),
  managerUserId: varchar("manager_user_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes"),
  location: text("location"),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  overallSummary: text("overall_summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One-on-One Notes - notes from meetings
export const oneOnOneNotes = pgTable("one_on_one_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => oneOnOneSessions.id).notNull(),
  authorUserId: varchar("author_user_id").references(() => users.id).notNull(),
  visibility: noteVisibilityEnum("visibility").notNull().default("shared_with_employee"),
  noteText: text("note_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One-on-One Action Items - action items from meetings
export const oneOnOneActionItems = pgTable("one_on_one_action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => oneOnOneSessions.id).notNull(),
  description: text("description").notNull(),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id).notNull(),
  dueDate: timestamp("due_date"),
  status: actionItemStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Media Files - attachments for various entities
export const orgMediaFiles = pgTable("org_media_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: mediaEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileType: mediaFileTypeEnum("file_type").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// Visual Flows - process diagrams
export const visualFlows = pgTable("visual_flows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  departmentId: varchar("department_id").references(() => departments.id),
  diagramType: diagramTypeEnum("diagram_type").notNull(),
  fileUrl: text("file_url"),
  jsonDefinition: jsonb("json_definition"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Resources - central resource library
export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  resourceType: resourceTypeEnum("resource_type").notNull(),
  fileUrl: text("file_url"),
  externalUrl: text("external_url"),
  tags: jsonb("tags"),
  departmentId: varchar("department_id").references(() => departments.id),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// ============================================
// ORGANISATION HUB INSERT SCHEMAS
// ============================================

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkflowVersionSchema = createInsertSchema(workflowVersions).omit({ id: true, createdAt: true });
export const insertPolicySchema = createInsertSchema(policies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPolicyVersionSchema = createInsertSchema(policyVersions).omit({ id: true, createdAt: true });
export const insertPolicyAcknowledgementSchema = createInsertSchema(policyAcknowledgements).omit({ id: true, acknowledgedAt: true });
export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHRFormSchema = createInsertSchema(hrForms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStaffRecordSchema = createInsertSchema(staffRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStaffDocumentSchema = createInsertSchema(staffDocuments).omit({ id: true, createdAt: true });
export const insertOnboardingChecklistSchema = createInsertSchema(onboardingChecklists).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks).omit({ id: true });
export const insertOnboardingAssignmentSchema = createInsertSchema(onboardingAssignments).omit({ id: true, assignedDate: true });
export const insertOnboardingAssignmentTaskSchema = createInsertSchema(onboardingAssignmentTasks).omit({ id: true });
export const insertOneOnOneSessionSchema = createInsertSchema(oneOnOneSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOneOnOneNoteSchema = createInsertSchema(oneOnOneNotes).omit({ id: true, createdAt: true });
export const insertOneOnOneActionItemSchema = createInsertSchema(oneOnOneActionItems).omit({ id: true, createdAt: true });
export const insertOrgMediaFileSchema = createInsertSchema(orgMediaFiles).omit({ id: true, uploadedAt: true });
export const insertVisualFlowSchema = createInsertSchema(visualFlows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, uploadedAt: true });

// ============================================
// ORGANISATION HUB TYPES
// ============================================

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;

export type InsertWorkflowVersion = z.infer<typeof insertWorkflowVersionSchema>;
export type WorkflowVersion = typeof workflowVersions.$inferSelect;

export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policies.$inferSelect;

export type InsertPolicyVersion = z.infer<typeof insertPolicyVersionSchema>;
export type PolicyVersion = typeof policyVersions.$inferSelect;

export type InsertPolicyAcknowledgement = z.infer<typeof insertPolicyAcknowledgementSchema>;
export type PolicyAcknowledgement = typeof policyAcknowledgements.$inferSelect;

export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

export type InsertHRForm = z.infer<typeof insertHRFormSchema>;
export type HRForm = typeof hrForms.$inferSelect;

export type InsertStaffRecord = z.infer<typeof insertStaffRecordSchema>;
export type StaffRecord = typeof staffRecords.$inferSelect;

export type InsertStaffDocument = z.infer<typeof insertStaffDocumentSchema>;
export type StaffDocument = typeof staffDocuments.$inferSelect;

export type InsertOnboardingChecklist = z.infer<typeof insertOnboardingChecklistSchema>;
export type OnboardingChecklist = typeof onboardingChecklists.$inferSelect;

export type InsertOnboardingTask = z.infer<typeof insertOnboardingTaskSchema>;
export type OnboardingTask = typeof onboardingTasks.$inferSelect;

export type InsertOnboardingAssignment = z.infer<typeof insertOnboardingAssignmentSchema>;
export type OnboardingAssignment = typeof onboardingAssignments.$inferSelect;

export type InsertOnboardingAssignmentTask = z.infer<typeof insertOnboardingAssignmentTaskSchema>;
export type OnboardingAssignmentTask = typeof onboardingAssignmentTasks.$inferSelect;

export type InsertOneOnOneSession = z.infer<typeof insertOneOnOneSessionSchema>;
export type OneOnOneSession = typeof oneOnOneSessions.$inferSelect;

export type InsertOneOnOneNote = z.infer<typeof insertOneOnOneNoteSchema>;
export type OneOnOneNote = typeof oneOnOneNotes.$inferSelect;

export type InsertOneOnOneActionItem = z.infer<typeof insertOneOnOneActionItemSchema>;
export type OneOnOneActionItem = typeof oneOnOneActionItems.$inferSelect;

export type InsertOrgMediaFile = z.infer<typeof insertOrgMediaFileSchema>;
export type OrgMediaFile = typeof orgMediaFiles.$inferSelect;

export type InsertVisualFlow = z.infer<typeof insertVisualFlowSchema>;
export type VisualFlow = typeof visualFlows.$inferSelect;

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

// ============================================
// JOB SETUP DOCUMENT INSERT SCHEMAS
// ============================================

export const insertJobSetupDocumentSchema = createInsertSchema(jobSetupDocuments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertJobSetupProductSchema = createInsertSchema(jobSetupProducts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Zod schemas for section validation
export const section1SalesSchema = z.object({
  oldFenceBeingRemoved: z.boolean().optional(),
  oldFenceMaterial: z.string().optional(),
  oldFenceAgeYears: z.string().optional(),
  allFootingsRemoved: z.boolean().optional(),
  reticInGround: z.boolean().optional(),
  reticNotes: z.string().optional(),
  undergroundServicesKnown: z.boolean().optional(),
  undergroundServicesNotes: z.string().optional(),
  poolArea: z.boolean().optional(),
  dogsOnSite: z.boolean().optional(),
  lockedGatesOrRestrictedAccess: z.boolean().optional(),
  someoneHomeOnInstallDay: z.boolean().optional(),
  drivewayAccessDescription: z.string().optional(),
  steepOrSlopingSite: z.boolean().optional(),
  siteHazardsNotes: z.string().optional(),
  needsCoreDrill: z.boolean().optional(),
  needsChainsaw: z.boolean().optional(),
  needsAuger: z.boolean().optional(),
  needsSkipBin: z.boolean().optional(),
  needsExtraLabor: z.boolean().optional(),
  equipmentOtherNotes: z.string().optional(),
  fenceTotalMetres: z.number().optional(),
  fenceHeightMm: z.number().optional(),
  numGates: z.number().optional(),
  gateOpeningsDescription: z.string().optional(),
  rakedOrStepped: z.string().optional(),
  panelsLayoutNotes: z.string().optional(),
  sitePlanImageUrl: z.string().optional(),
  additionalPhotosUrls: z.array(z.string()).optional(),
  clientConfirmationText: z.string().optional(),
  clientSignedSalesSetup: z.boolean().optional(),
  clientSignedAt: z.string().optional(),
});

export const section2ProductsMetaSchema = z.object({
  autoPopulatedFromQuote: z.boolean().optional(),
  quoteId: z.string().optional(),
  lastUpdatedBy: z.string().optional(),
  lastUpdatedAt: z.string().optional(),
  notes: z.string().optional(),
});

export const section3ProductionSchema = z.object({
  postsManufactured: z.boolean().optional(),
  panelsManufactured: z.boolean().optional(),
  gatesFabricated: z.boolean().optional(),
  hardwarePacked: z.boolean().optional(),
  accessoriesPacked: z.boolean().optional(),
  cementAndMaterialsPrepared: z.boolean().optional(),
  productionSpecialNotes: z.string().optional(),
  productionCompletedBy: z.string().optional(),
  productionCompletedAt: z.string().optional(),
});

export const section4ScheduleSchema = z.object({
  schedulingReadyForInstall: z.boolean().optional(),
  proposedInstallDate: z.string().optional(),
  confirmInstallDateWithClient: z.boolean().optional(),
  installTimeWindow: z.string().optional(),
  installerTeamAssigned: z.string().optional(),
  isSupplyOnlyPickup: z.boolean().optional(),
  pickupOrDeliveryNotes: z.string().optional(),
  schedulerNotes: z.string().optional(),
  scheduledBy: z.string().optional(),
  scheduledAt: z.string().optional(),
  requiresCoreDrill: z.boolean().optional(),
  requiresChainsaw: z.boolean().optional(),
  requiresAuger: z.boolean().optional(),
  requiresSkipBin: z.boolean().optional(),
});

export const section5InstallSchema = z.object({
  installerCheckedMaterialsComplete: z.boolean().optional(),
  installerCheckedToolsLoaded: z.boolean().optional(),
  installerConfirmedSiteAccessOk: z.boolean().optional(),
  installerReadSiteNotes: z.boolean().optional(),
  installerPrestartNotes: z.string().optional(),
  installerPrestartCompletedBy: z.string().optional(),
  installerPrestartCompletedAt: z.string().optional(),
  installCompleted: z.boolean().optional(),
  installPhotosUrls: z.array(z.string()).optional(),
  completionNotes: z.string().optional(),
  clientSignedCompletion: z.boolean().optional(),
  clientSignedCompletionAt: z.string().optional(),
  installerCompletionBy: z.string().optional(),
  installerCompletionAt: z.string().optional(),
});

// ============================================
// JOB SETUP DOCUMENT TYPES
// ============================================

export type InsertJobSetupDocument = z.infer<typeof insertJobSetupDocumentSchema>;
export type JobSetupDocument = typeof jobSetupDocuments.$inferSelect;

export type InsertJobSetupProduct = z.infer<typeof insertJobSetupProductSchema>;
export type JobSetupProduct = typeof jobSetupProducts.$inferSelect;

// ============================================
// DASHBOARD BUILDER TABLES
// ============================================

export const widgetTypeEnum = pgEnum("widget_type", [
  "kpi_card",
  "bar_chart",
  "line_chart", 
  "pie_chart",
  "area_chart",
  "table",
  "recent_items",
  "status_breakdown",
  "trend_metric",
  "progress_bar",
  "weather",
  "tasks",
  "notifications",
  "leave_balance",
  "quick_actions"
]);

export const widgetCategoryEnum = pgEnum("widget_category", [
  "kpis",
  "charts",
  "tables",
  "analytics",
  "personal"
]);

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  widgetType: widgetTypeEnum("widget_type").notNull(),
  category: widgetCategoryEnum("category").notNull(),
  dataSource: varchar("data_source", { length: 100 }).notNull(),
  defaultWidth: integer("default_width").default(1).notNull(),
  defaultHeight: integer("default_height").default(1).notNull(),
  minWidth: integer("min_width").default(1),
  minHeight: integer("min_height").default(1),
  maxWidth: integer("max_width").default(4),
  maxHeight: integer("max_height").default(4),
  configSchema: jsonb("config_schema"),
  defaultConfig: jsonb("default_config"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roleDashboardLayouts = pgTable("role_dashboard_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: userRoleEnum("role").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  gridColumns: integer("grid_columns").default(12).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const dashboardWidgetInstances = pgTable("dashboard_widget_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutId: varchar("layout_id").notNull().references(() => roleDashboardLayouts.id, { onDelete: "cascade" }),
  widgetId: varchar("widget_id").notNull().references(() => dashboardWidgets.id),
  positionX: integer("position_x").default(0).notNull(),
  positionY: integer("position_y").default(0).notNull(),
  width: integer("width").default(1).notNull(),
  height: integer("height").default(1).notNull(),
  config: jsonb("config"),
  title: varchar("title", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({ 
  id: true, 
  createdAt: true 
});

export const insertRoleDashboardLayoutSchema = createInsertSchema(roleDashboardLayouts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertDashboardWidgetInstanceSchema = createInsertSchema(dashboardWidgetInstances).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;

export type InsertRoleDashboardLayout = z.infer<typeof insertRoleDashboardLayoutSchema>;
export type RoleDashboardLayout = typeof roleDashboardLayouts.$inferSelect;

export type InsertDashboardWidgetInstance = z.infer<typeof insertDashboardWidgetInstanceSchema>;
export type DashboardWidgetInstance = typeof dashboardWidgetInstances.$inferSelect;

// ==================== BANKING / FINANCIAL TABLES ====================

// Bank connection status enum
export const bankConnectionStatusEnum = pgEnum("bank_connection_status", [
  "active",
  "inactive",
  "invalid",
  "processing",
  "deleted"
]);

// Bank account type enum
export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "transaction",
  "savings",
  "credit_card",
  "loan",
  "mortgage",
  "investment",
  "term_deposit",
  "other"
]);

// Transaction direction enum
export const transactionDirectionEnum = pgEnum("transaction_direction", [
  "credit",
  "debit"
]);

// Bank Connections - stores Basiq connection info
export const bankConnections = pgTable("bank_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").references(() => users.id),
  basiqUserId: varchar("basiq_user_id", { length: 100 }),
  basiqConnectionId: varchar("basiq_connection_id", { length: 100 }),
  institutionId: varchar("institution_id", { length: 50 }).notNull(),
  institutionName: varchar("institution_name", { length: 100 }),
  status: bankConnectionStatusEnum("status").default("inactive").notNull(),
  consentExpiresAt: timestamp("consent_expires_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  refreshJobId: varchar("refresh_job_id", { length: 100 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bank Accounts - stores account details from Basiq
export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").notNull().references(() => bankConnections.id, { onDelete: "cascade" }),
  basiqAccountId: varchar("basiq_account_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  accountHolder: varchar("account_holder", { length: 200 }),
  accountNumberMasked: varchar("account_number_masked", { length: 50 }),
  bsbMasked: varchar("bsb_masked", { length: 20 }),
  accountType: bankAccountTypeEnum("account_type").default("transaction"),
  currency: varchar("currency", { length: 10 }).default("AUD"),
  balance: decimal("balance", { precision: 15, scale: 2 }),
  availableFunds: decimal("available_funds", { precision: 15, scale: 2 }),
  lastUpdatedAt: timestamp("last_updated_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bank Transactions - stores transaction history from Basiq
export const bankTransactions = pgTable("bank_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  basiqTransactionId: varchar("basiq_transaction_id", { length: 100 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  direction: transactionDirectionEnum("direction").notNull(),
  status: varchar("status", { length: 50 }).default("posted"),
  transactionDate: timestamp("transaction_date"),
  postDate: timestamp("post_date"),
  category: varchar("category", { length: 100 }),
  subCategory: varchar("sub_category", { length: 100 }),
  merchantName: varchar("merchant_name", { length: 200 }),
  merchantLocation: varchar("merchant_location", { length: 200 }),
  runningBalance: decimal("running_balance", { precision: 15, scale: 2 }),
  rawData: jsonb("raw_data"),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
});

// Insert schemas for banking
export const insertBankConnectionSchema = createInsertSchema(bankConnections).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ 
  id: true, 
  createdAt: true 
});

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ 
  id: true, 
  importedAt: true 
});

// Types for banking
export type InsertBankConnection = z.infer<typeof insertBankConnectionSchema>;
export type BankConnection = typeof bankConnections.$inferSelect;

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;

export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
