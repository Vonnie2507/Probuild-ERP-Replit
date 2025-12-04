import { eq, desc, and, gte, lte, like, or, sql, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  users, clients, leads, fenceStyles, products, quotes, jobs, bom,
  productionTasks, installTasks, scheduleEvents, payments, notifications,
  smsLogs, smsConversations, messageRanges, activityLogs, documents,
  quoteFollowUps, automationCampaigns, campaignEnrollments,
  staffRateCards, quoteCostComponents, quoteTrips, quoteAdminTime,
  travelSessions, quoteGroundConditions, quotePLSummary,
  departments, workflows, workflowVersions, policies, policyVersions,
  policyAcknowledgements, resources, knowledgeArticles,
  jobSetupDocuments, jobSetupProducts,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Lead, type InsertLead,
  type FenceStyle, type InsertFenceStyle,
  type Product, type InsertProduct,
  type Quote, type InsertQuote,
  type Job, type InsertJob,
  type BOM, type InsertBOM,
  type ProductionTask, type InsertProductionTask,
  type InstallTask, type InsertInstallTask,
  type ScheduleEvent, type InsertScheduleEvent,
  type Payment, type InsertPayment,
  type Notification, type InsertNotification,
  type SMSLog, type InsertSMSLog,
  type SMSConversation, type InsertSMSConversation,
  type MessageRange, type InsertMessageRange,
  type ActivityLog, type InsertActivityLog,
  type Document, type InsertDocument,
  type QuoteFollowUp, type InsertQuoteFollowUp,
  type AutomationCampaign, type InsertAutomationCampaign,
  type CampaignEnrollment, type InsertCampaignEnrollment,
  type StaffRateCard, type InsertStaffRateCard,
  type QuoteCostComponent, type InsertQuoteCostComponent,
  type QuoteTrip, type InsertQuoteTrip,
  type QuoteAdminTime, type InsertQuoteAdminTime,
  type TravelSession, type InsertTravelSession,
  type QuoteGroundCondition, type InsertQuoteGroundCondition,
  type QuotePLSummary, type InsertQuotePLSummary,
  type Department, type InsertDepartment,
  type Workflow, type InsertWorkflow,
  type WorkflowVersion, type InsertWorkflowVersion,
  type Policy, type InsertPolicy,
  type PolicyVersion, type InsertPolicyVersion,
  type PolicyAcknowledgement, type InsertPolicyAcknowledgement,
  type Resource, type InsertResource,
  type KnowledgeArticle, type InsertKnowledgeArticle,
  type JobSetupDocument, type InsertJobSetupDocument,
  type JobSetupProduct, type InsertJobSetupProduct,
  type JobSetupSection1Sales,
  type JobSetupSection2ProductsMeta,
  type JobSetupSection3Production,
  type JobSetupSection4Schedule,
  type JobSetupSection5Install,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  getClientsByType(clientType: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  searchClients(query: string): Promise<Client[]>;

  // Leads
  getLead(id: string): Promise<Lead | undefined>;
  getLeads(): Promise<Lead[]>;
  getLeadsByStage(stage: string): Promise<Lead[]>;
  getLeadsByAssignee(userId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  searchLeads(query: string): Promise<Lead[]>;

  // Fence Styles
  getFenceStyle(id: string): Promise<FenceStyle | undefined>;
  getFenceStyles(): Promise<FenceStyle[]>;
  createFenceStyle(style: InsertFenceStyle): Promise<FenceStyle>;
  updateFenceStyle(id: string, style: Partial<InsertFenceStyle>): Promise<FenceStyle | undefined>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getProducts(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getLowStockProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  updateStock(id: string, quantity: number): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Quotes
  getQuote(id: string): Promise<Quote | undefined>;
  getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined>;
  getQuotes(): Promise<Quote[]>;
  getQuotesByClient(clientId: string): Promise<Quote[]>;
  getQuotesByStatus(status: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<boolean>;
  getNextQuoteNumber(): Promise<string>;
  searchQuotes(query: string): Promise<Quote[]>;

  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobByNumber(jobNumber: string): Promise<Job | undefined>;
  getJobs(): Promise<Job[]>;
  getJobsByClient(clientId: string): Promise<Job[]>;
  getJobsByStatus(status: string): Promise<Job[]>;
  getJobsByInstaller(installerId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  getNextJobNumber(): Promise<string>;
  searchJobs(query: string): Promise<Job[]>;
  deleteJob(id: string): Promise<boolean>;

  // BOM
  getBOM(id: string): Promise<BOM | undefined>;
  getBOMByJob(jobId: string): Promise<BOM | undefined>;
  createBOM(bomData: InsertBOM): Promise<BOM>;
  updateBOM(id: string, bomData: Partial<InsertBOM>): Promise<BOM | undefined>;

  // Production Tasks
  getProductionTask(id: string): Promise<ProductionTask | undefined>;
  getProductionTasks(): Promise<ProductionTask[]>;
  getProductionTasksByJob(jobId: string): Promise<ProductionTask[]>;
  getProductionTasksByAssignee(userId: string): Promise<ProductionTask[]>;
  getProductionTasksByStatus(status: string): Promise<ProductionTask[]>;
  createProductionTask(task: InsertProductionTask): Promise<ProductionTask>;
  updateProductionTask(id: string, task: Partial<InsertProductionTask>): Promise<ProductionTask | undefined>;

  // Install Tasks
  getInstallTask(id: string): Promise<InstallTask | undefined>;
  getInstallTasks(): Promise<InstallTask[]>;
  getInstallTasksByJob(jobId: string): Promise<InstallTask[]>;
  getInstallTasksByInstaller(installerId: string): Promise<InstallTask[]>;
  getInstallTasksByDate(date: Date): Promise<InstallTask[]>;
  createInstallTask(task: InsertInstallTask): Promise<InstallTask>;
  updateInstallTask(id: string, task: Partial<InsertInstallTask>): Promise<InstallTask | undefined>;

  // Schedule Events
  getScheduleEvent(id: string): Promise<ScheduleEvent | undefined>;
  getScheduleEvents(): Promise<ScheduleEvent[]>;
  getScheduleEventsByDateRange(start: Date, end: Date): Promise<ScheduleEvent[]>;
  getScheduleEventsByAssignee(userId: string): Promise<ScheduleEvent[]>;
  createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent>;
  updateScheduleEvent(id: string, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined>;
  deleteScheduleEvent(id: string): Promise<boolean>;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getPayments(): Promise<Payment[]>;
  getPaymentsByClient(clientId: string): Promise<Payment[]>;
  getPaymentsByJob(jobId: string): Promise<Payment[]>;
  getPendingPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;

  // Notifications
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // SMS Logs
  getSMSLog(id: string): Promise<SMSLog | undefined>;
  getSMSLogs(): Promise<SMSLog[]>;
  getSMSLogsByPhone(phone: string): Promise<SMSLog[]>;
  getSMSLogsByEntity(entityType: string, entityId: string): Promise<SMSLog[]>;
  createSMSLog(log: InsertSMSLog): Promise<SMSLog>;
  updateSMSLog(id: string, log: Partial<InsertSMSLog>): Promise<SMSLog | undefined>;
  markMessagesRead(messageIds: string[]): Promise<void>;
  getUnreadMessageCount(): Promise<number>;
  
  // SMS Conversations
  getSMSConversation(id: string): Promise<SMSConversation | undefined>;
  getSMSConversationByPhone(phone: string): Promise<SMSConversation | undefined>;
  getSMSConversations(): Promise<SMSConversation[]>;
  getUnresolvedConversations(): Promise<SMSConversation[]>;
  createSMSConversation(conversation: InsertSMSConversation): Promise<SMSConversation>;
  updateSMSConversation(id: string, conversation: Partial<InsertSMSConversation>): Promise<SMSConversation | undefined>;
  getOrCreateConversation(phone: string): Promise<SMSConversation>;
  findClientByPhone(phone: string): Promise<Client | undefined>;
  
  // Message Ranges
  getMessageRange(id: string): Promise<MessageRange | undefined>;
  getMessageRangesByConversation(conversationId: string): Promise<MessageRange[]>;
  getMessageRangesByLead(leadId: string): Promise<MessageRange[]>;
  getMessageRangesByJob(jobId: string): Promise<MessageRange[]>;
  createMessageRange(range: InsertMessageRange): Promise<MessageRange>;
  deleteMessageRange(id: string): Promise<boolean>;

  // Activity Logs
  getActivityLogs(): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;
  getActivityLogsByEntity(entityType: string, entityId: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Documents
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocumentsByJob(jobId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;

  // Quote Follow-ups
  getQuoteFollowUp(id: string): Promise<QuoteFollowUp | undefined>;
  getQuoteFollowUpsByQuote(quoteId: string): Promise<QuoteFollowUp[]>;
  getPendingFollowUps(): Promise<QuoteFollowUp[]>;
  getFollowUpsByAssignee(userId: string): Promise<QuoteFollowUp[]>;
  createQuoteFollowUp(followUp: InsertQuoteFollowUp): Promise<QuoteFollowUp>;
  updateQuoteFollowUp(id: string, followUp: Partial<InsertQuoteFollowUp>): Promise<QuoteFollowUp | undefined>;
  deleteQuoteFollowUp(id: string): Promise<boolean>;

  // Automation Campaigns
  getAutomationCampaign(id: string): Promise<AutomationCampaign | undefined>;
  getAutomationCampaigns(): Promise<AutomationCampaign[]>;
  getActiveCampaigns(): Promise<AutomationCampaign[]>;
  getCampaignsByTrigger(trigger: string): Promise<AutomationCampaign[]>;
  createAutomationCampaign(campaign: InsertAutomationCampaign): Promise<AutomationCampaign>;
  updateAutomationCampaign(id: string, campaign: Partial<InsertAutomationCampaign>): Promise<AutomationCampaign | undefined>;
  deleteAutomationCampaign(id: string): Promise<boolean>;

  // Campaign Enrollments
  getCampaignEnrollment(id: string): Promise<CampaignEnrollment | undefined>;
  getCampaignEnrollmentsByCampaign(campaignId: string): Promise<CampaignEnrollment[]>;
  getCampaignEnrollmentsByClient(clientId: string): Promise<CampaignEnrollment[]>;
  getPendingEnrollments(): Promise<CampaignEnrollment[]>;
  createCampaignEnrollment(enrollment: InsertCampaignEnrollment): Promise<CampaignEnrollment>;
  updateCampaignEnrollment(id: string, enrollment: Partial<InsertCampaignEnrollment>): Promise<CampaignEnrollment | undefined>;
  cancelCampaignEnrollment(id: string, reason: string): Promise<CampaignEnrollment | undefined>;

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;
  
  // Quote Analytics
  getQuoteAnalytics(): Promise<QuoteAnalytics>;

  // ============================================
  // PROFIT & LOSS COST TRACKING
  // ============================================
  
  // Staff Rate Cards
  getStaffRateCard(id: string): Promise<StaffRateCard | undefined>;
  getStaffRateCards(): Promise<StaffRateCard[]>;
  getStaffRateCardsByUser(userId: string): Promise<StaffRateCard[]>;
  getActiveRateByType(userId: string, rateType: string): Promise<StaffRateCard | undefined>;
  createStaffRateCard(rateCard: InsertStaffRateCard): Promise<StaffRateCard>;
  updateStaffRateCard(id: string, rateCard: Partial<InsertStaffRateCard>): Promise<StaffRateCard | undefined>;
  deleteStaffRateCard(id: string): Promise<boolean>;

  // Quote Cost Components
  getQuoteCostComponent(id: string): Promise<QuoteCostComponent | undefined>;
  getQuoteCostComponentsByQuote(quoteId: string): Promise<QuoteCostComponent[]>;
  getQuoteCostComponentsByJob(jobId: string): Promise<QuoteCostComponent[]>;
  createQuoteCostComponent(component: InsertQuoteCostComponent): Promise<QuoteCostComponent>;
  updateQuoteCostComponent(id: string, component: Partial<InsertQuoteCostComponent>): Promise<QuoteCostComponent | undefined>;
  deleteQuoteCostComponent(id: string): Promise<boolean>;

  // Quote Trips
  getQuoteTrip(id: string): Promise<QuoteTrip | undefined>;
  getQuoteTripsByQuote(quoteId: string): Promise<QuoteTrip[]>;
  getQuoteTripsByJob(jobId: string): Promise<QuoteTrip[]>;
  getQuoteTripsByStaff(staffId: string): Promise<QuoteTrip[]>;
  createQuoteTrip(trip: InsertQuoteTrip): Promise<QuoteTrip>;
  updateQuoteTrip(id: string, trip: Partial<InsertQuoteTrip>): Promise<QuoteTrip | undefined>;
  deleteQuoteTrip(id: string): Promise<boolean>;

  // Quote Admin Time
  getQuoteAdminTime(id: string): Promise<QuoteAdminTime | undefined>;
  getQuoteAdminTimeByQuote(quoteId: string): Promise<QuoteAdminTime[]>;
  getQuoteAdminTimeByJob(jobId: string): Promise<QuoteAdminTime[]>;
  getQuoteAdminTimeByStaff(staffId: string): Promise<QuoteAdminTime[]>;
  createQuoteAdminTime(adminTime: InsertQuoteAdminTime): Promise<QuoteAdminTime>;
  updateQuoteAdminTime(id: string, adminTime: Partial<InsertQuoteAdminTime>): Promise<QuoteAdminTime | undefined>;
  deleteQuoteAdminTime(id: string): Promise<boolean>;

  // Travel Sessions
  getTravelSession(id: string): Promise<TravelSession | undefined>;
  getTravelSessionsByTrip(tripId: string): Promise<TravelSession[]>;
  getActiveTravelSessions(): Promise<TravelSession[]>;
  createTravelSession(session: InsertTravelSession): Promise<TravelSession>;
  updateTravelSession(id: string, session: Partial<InsertTravelSession>): Promise<TravelSession | undefined>;

  // Quote Ground Conditions
  getQuoteGroundCondition(id: string): Promise<QuoteGroundCondition | undefined>;
  getQuoteGroundConditionsByQuote(quoteId: string): Promise<QuoteGroundCondition[]>;
  createQuoteGroundCondition(condition: InsertQuoteGroundCondition): Promise<QuoteGroundCondition>;
  updateQuoteGroundCondition(id: string, condition: Partial<InsertQuoteGroundCondition>): Promise<QuoteGroundCondition | undefined>;
  deleteQuoteGroundCondition(id: string): Promise<boolean>;

  // Quote P&L Summary
  getQuotePLSummary(id: string): Promise<QuotePLSummary | undefined>;
  getQuotePLSummaryByQuote(quoteId: string): Promise<QuotePLSummary | undefined>;
  getQuotePLSummaryByJob(jobId: string): Promise<QuotePLSummary | undefined>;
  createQuotePLSummary(summary: InsertQuotePLSummary): Promise<QuotePLSummary>;
  updateQuotePLSummary(id: string, summary: Partial<InsertQuotePLSummary>): Promise<QuotePLSummary | undefined>;
  recalculateQuotePLSummary(quoteId: string): Promise<QuotePLSummary | undefined>;

  // ============================================
  // ORGANISATION HUB
  // ============================================

  // Departments
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;

  // Workflows
  getWorkflow(id: string): Promise<Workflow | undefined>;
  getWorkflows(): Promise<Workflow[]>;
  getWorkflowsByDepartment(departmentId: string): Promise<Workflow[]>;
  getWorkflowsByCategory(category: string): Promise<Workflow[]>;
  getActiveWorkflows(): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, workflow: Partial<InsertWorkflow>): Promise<Workflow | undefined>;
  deleteWorkflow(id: string): Promise<boolean>;

  // Workflow Versions
  getWorkflowVersion(id: string): Promise<WorkflowVersion | undefined>;
  getWorkflowVersionsByWorkflow(workflowId: string): Promise<WorkflowVersion[]>;
  getLatestWorkflowVersion(workflowId: string): Promise<WorkflowVersion | undefined>;
  createWorkflowVersion(version: InsertWorkflowVersion): Promise<WorkflowVersion>;
  updateWorkflowVersion(id: string, version: Partial<InsertWorkflowVersion>): Promise<WorkflowVersion | undefined>;

  // Policies
  getPolicy(id: string): Promise<Policy | undefined>;
  getPolicies(): Promise<Policy[]>;
  getPoliciesByDepartment(departmentId: string): Promise<Policy[]>;
  getPoliciesByCategory(category: string): Promise<Policy[]>;
  getActivePolicies(): Promise<Policy[]>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: string, policy: Partial<InsertPolicy>): Promise<Policy | undefined>;
  deletePolicy(id: string): Promise<boolean>;

  // Policy Versions
  getPolicyVersion(id: string): Promise<PolicyVersion | undefined>;
  getPolicyVersionsByPolicy(policyId: string): Promise<PolicyVersion[]>;
  getLatestPolicyVersion(policyId: string): Promise<PolicyVersion | undefined>;
  createPolicyVersion(version: InsertPolicyVersion): Promise<PolicyVersion>;
  updatePolicyVersion(id: string, version: Partial<InsertPolicyVersion>): Promise<PolicyVersion | undefined>;

  // Policy Acknowledgements
  getPolicyAcknowledgement(id: string): Promise<PolicyAcknowledgement | undefined>;
  getPolicyAcknowledgementsByPolicy(policyId: string): Promise<PolicyAcknowledgement[]>;
  getPolicyAcknowledgementsByUser(userId: string): Promise<PolicyAcknowledgement[]>;
  hasUserAcknowledgedPolicy(userId: string, policyVersionId: string): Promise<boolean>;
  createPolicyAcknowledgement(acknowledgement: InsertPolicyAcknowledgement): Promise<PolicyAcknowledgement>;

  // Resources
  getResource(id: string): Promise<Resource | undefined>;
  getResources(): Promise<Resource[]>;
  getResourcesByDepartment(departmentId: string): Promise<Resource[]>;
  searchResources(query: string): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: string, resource: Partial<InsertResource>): Promise<Resource | undefined>;
  deleteResource(id: string): Promise<boolean>;

  // Knowledge Articles
  getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined>;
  getKnowledgeArticleBySlug(slug: string): Promise<KnowledgeArticle | undefined>;
  getKnowledgeArticles(): Promise<KnowledgeArticle[]>;
  getPublishedKnowledgeArticles(): Promise<KnowledgeArticle[]>;
  getKnowledgeArticlesByDepartment(departmentId: string): Promise<KnowledgeArticle[]>;
  searchKnowledgeArticles(query: string): Promise<KnowledgeArticle[]>;
  createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  updateKnowledgeArticle(id: string, article: Partial<InsertKnowledgeArticle>): Promise<KnowledgeArticle | undefined>;
  deleteKnowledgeArticle(id: string): Promise<boolean>;

  // ============================================
  // JOB SETUP DOCUMENTS
  // ============================================

  // Job Setup Documents
  getJobSetupDocument(id: string): Promise<JobSetupDocument | undefined>;
  getJobSetupDocumentByJob(jobId: string): Promise<JobSetupDocument | undefined>;
  getJobSetupDocuments(): Promise<JobSetupDocument[]>;
  getJobSetupDocumentsByStatus(status: string): Promise<JobSetupDocument[]>;
  createJobSetupDocument(document: InsertJobSetupDocument): Promise<JobSetupDocument>;
  updateJobSetupDocument(id: string, document: Partial<InsertJobSetupDocument>): Promise<JobSetupDocument | undefined>;
  deleteJobSetupDocument(id: string): Promise<boolean>;
  
  // Section-specific updates
  updateJobSetupSection1(id: string, section: JobSetupSection1Sales): Promise<JobSetupDocument | undefined>;
  updateJobSetupSection2Meta(id: string, section: JobSetupSection2ProductsMeta): Promise<JobSetupDocument | undefined>;
  updateJobSetupSection3(id: string, section: JobSetupSection3Production): Promise<JobSetupDocument | undefined>;
  updateJobSetupSection4(id: string, section: JobSetupSection4Schedule): Promise<JobSetupDocument | undefined>;
  updateJobSetupSection5(id: string, section: JobSetupSection5Install): Promise<JobSetupDocument | undefined>;
  
  // Section completion
  markSectionComplete(id: string, sectionNumber: 1 | 2 | 3 | 4 | 5, complete: boolean): Promise<JobSetupDocument | undefined>;
  recalculateDocumentStatus(id: string): Promise<JobSetupDocument | undefined>;
  
  // Job Setup Products (BOM items)
  getJobSetupProduct(id: string): Promise<JobSetupProduct | undefined>;
  getJobSetupProductsByDocument(documentId: string): Promise<JobSetupProduct[]>;
  createJobSetupProduct(product: InsertJobSetupProduct): Promise<JobSetupProduct>;
  createJobSetupProducts(products: InsertJobSetupProduct[]): Promise<JobSetupProduct[]>;
  updateJobSetupProduct(id: string, product: Partial<InsertJobSetupProduct>): Promise<JobSetupProduct | undefined>;
  deleteJobSetupProduct(id: string): Promise<boolean>;
  deleteJobSetupProductsByDocument(documentId: string): Promise<boolean>;
  
  // Seed products from quote
  seedJobSetupProductsFromQuote(documentId: string, quoteId: string): Promise<JobSetupProduct[]>;
}

export interface DashboardStats {
  newLeadsCount: number;
  quotesAwaitingFollowUp: number;
  jobsInProduction: number;
  jobsReadyForInstall: number;
  todayInstalls: number;
  pendingPaymentsTotal: number;
}

export interface QuoteAnalytics {
  totalQuotes: number;
  sentQuotes: number;
  approvedQuotes: number;
  declinedQuotes: number;
  pendingQuotes: number;
  conversionRate: number;
  totalValue: number;
  averageQuoteValue: number;
  quotesThisWeek: number;
  quotesLastWeek: number;
  quotesByStatus: { status: string; count: number }[];
  quotesByCreator: { userId: string; userName: string; total: number; approved: number; declined: number }[];
  recentQuotes: Quote[];
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.role, role as any), eq(users.isActive, true)));
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClientsByType(clientType: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.clientType, clientType as any)).orderBy(clients.name);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  async searchClients(query: string): Promise<Client[]> {
    return db.select().from(clients).where(
      or(
        like(clients.name, `%${query}%`),
        like(clients.email, `%${query}%`),
        like(clients.phone, `%${query}%`),
        like(clients.address, `%${query}%`)
      )
    );
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.stage, stage as any)).orderBy(desc(leads.createdAt));
  }

  async getLeadsByAssignee(userId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.assignedTo, userId)).orderBy(desc(leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const leadNumber = await this.generateLeadNumber();
    const [created] = await db.insert(leads).values({
      ...lead,
      leadNumber,
    }).returning();
    return created;
  }

  private async generateLeadNumber(): Promise<string> {
    const [result] = await db.select({ 
      maxNumber: sql<number>`COALESCE(MAX(CAST(SUBSTRING(lead_number FROM 5) AS INTEGER)), 0)` 
    }).from(leads);
    const nextNum = (result?.maxNumber || 0) + 1;
    return `PVC-${nextNum.toString().padStart(3, '0')}`;
  }

  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set({
      ...lead,
      updatedAt: new Date(),
    }).where(eq(leads.id, id)).returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  async searchLeads(query: string): Promise<Lead[]> {
    return db.select().from(leads).where(
      or(
        like(leads.description, `%${query}%`),
        like(leads.siteAddress, `%${query}%`),
        like(leads.fenceStyle, `%${query}%`)
      )
    );
  }

  // Fence Styles
  async getFenceStyle(id: string): Promise<FenceStyle | undefined> {
    const [style] = await db.select().from(fenceStyles).where(eq(fenceStyles.id, id));
    return style;
  }

  async getFenceStyles(): Promise<FenceStyle[]> {
    return db.select().from(fenceStyles).where(eq(fenceStyles.isActive, true)).orderBy(fenceStyles.name);
  }

  async createFenceStyle(style: InsertFenceStyle): Promise<FenceStyle> {
    const [created] = await db.insert(fenceStyles).values(style as any).returning();
    return created;
  }

  async updateFenceStyle(id: string, style: Partial<InsertFenceStyle>): Promise<FenceStyle | undefined> {
    const [updated] = await db.update(fenceStyles).set(style as any).where(eq(fenceStyles.id, id)).returning();
    return updated;
  }

  // Products
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.name);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return db.select().from(products).where(
      and(eq(products.category, category as any), eq(products.isActive, true))
    ).orderBy(products.name);
  }

  async getLowStockProducts(): Promise<Product[]> {
    return db.select().from(products).where(
      and(
        eq(products.isActive, true),
        sql`${products.stockOnHand} <= ${products.reorderPoint}`
      )
    );
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async updateStock(id: string, quantity: number): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ stockOnHand: quantity })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
    return true;
  }

  // Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, quoteNumber));
    return quote;
  }

  async getQuotes(): Promise<Quote[]> {
    return db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuotesByClient(clientId: string): Promise<Quote[]> {
    return db.select().from(quotes).where(eq(quotes.clientId, clientId)).orderBy(desc(quotes.createdAt));
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return db.select().from(quotes).where(eq(quotes.status, status as any)).orderBy(desc(quotes.createdAt));
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    let quoteNumber = quote.quoteNumber;
    
    if (quote.leadId) {
      quoteNumber = await this.generateQuoteNumber(quote.leadId);
    } else if (!quoteNumber) {
      quoteNumber = await this.getNextQuoteNumber();
    }
    
    const [created] = await db.insert(quotes).values({
      ...quote,
      quoteNumber,
    } as any).returning();
    return created;
  }

  private async generateQuoteNumber(leadId: string): Promise<string> {
    const lead = await this.getLead(leadId);
    if (!lead?.leadNumber) {
      return this.getNextQuoteNumber();
    }
    
    const prefix = `${lead.leadNumber}-Q`;
    const [result] = await db.select({ 
      maxSeq: sql<number>`COALESCE(MAX(CAST(SUBSTRING(quote_number FROM ${prefix.length + 1}) AS INTEGER)), 0)` 
    }).from(quotes).where(like(quotes.quoteNumber, `${prefix}%`));
    const nextSeq = (result?.maxSeq || 0) + 1;
    return `${prefix}${nextSeq}`;
  }

  async updateQuote(id: string, quote: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes).set(quote as any).where(eq(quotes.id, id)).returning();
    return updated;
  }

  async deleteQuote(id: string): Promise<boolean> {
    await db.delete(quotes).where(eq(quotes.id, id));
    return true;
  }

  async searchQuotes(query: string): Promise<Quote[]> {
    return db.select().from(quotes).where(
      or(
        like(quotes.quoteNumber, `%${query}%`),
        like(quotes.siteAddress, `%${query}%`)
      )
    );
  }

  async getNextQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(like(quotes.quoteNumber, `Q-${year}-%`));
    const count = (result?.count || 0) + 1;
    return `Q-${year}-${String(count).padStart(4, '0')}`;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobByNumber(jobNumber: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.jobNumber, jobNumber));
    return job;
  }

  async getJobs(): Promise<Job[]> {
    return db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJobsByClient(clientId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.clientId, clientId)).orderBy(desc(jobs.createdAt));
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.status, status as any)).orderBy(desc(jobs.createdAt));
  }

  async getJobsByInstaller(installerId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.assignedInstaller, installerId)).orderBy(desc(jobs.scheduledStartDate));
  }

  async createJob(job: InsertJob): Promise<Job> {
    let jobNumber = job.jobNumber;
    let invoiceNumber = (job as any).invoiceNumber;
    let leadId = (job as any).leadId;
    let jobType = job.jobType;
    
    if (job.quoteId && !leadId) {
      const quote = await this.getQuote(job.quoteId);
      if (quote?.leadId) {
        leadId = quote.leadId;
      }
    }
    
    if (leadId) {
      const lead = await this.getLead(leadId);
      if (lead?.leadNumber) {
        jobNumber = `${lead.leadNumber}-JOB`;
        invoiceNumber = `${lead.leadNumber}-INV`;
      }
      // Propagate job fulfillment type from lead if not explicitly set
      if (!jobType && lead?.jobFulfillmentType) {
        jobType = lead.jobFulfillmentType as "supply_only" | "supply_install";
      }
    }
    
    if (!jobNumber) {
      jobNumber = await this.getNextJobNumber();
    }
    
    const [created] = await db.insert(jobs).values({
      ...job,
      jobNumber,
      invoiceNumber,
      leadId,
      jobType: jobType || "supply_install",
    } as any).returning();
    return created;
  }

  async updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined> {
    const [updated] = await db.update(jobs).set({
      ...job,
      updatedAt: new Date(),
    } as any).where(eq(jobs.id, id)).returning();
    return updated;
  }

  async getNextJobNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(like(jobs.jobNumber, `JOB-${year}-%`));
    const count = (result?.count || 0) + 1;
    return `JOB-${year}-${String(count).padStart(4, '0')}`;
  }

  async searchJobs(query: string): Promise<Job[]> {
    return db.select().from(jobs).where(
      or(
        like(jobs.jobNumber, `%${query}%`),
        like(jobs.siteAddress, `%${query}%`),
        like(jobs.fenceStyle, `%${query}%`)
      )
    );
  }

  async deleteJob(id: string): Promise<boolean> {
    await db.delete(jobs).where(eq(jobs.id, id));
    return true;
  }

  // BOM
  async getBOM(id: string): Promise<BOM | undefined> {
    const [bomResult] = await db.select().from(bom).where(eq(bom.id, id));
    return bomResult;
  }

  async getBOMByJob(jobId: string): Promise<BOM | undefined> {
    const [bomResult] = await db.select().from(bom).where(eq(bom.jobId, jobId));
    return bomResult;
  }

  async createBOM(bomData: InsertBOM): Promise<BOM> {
    const [created] = await db.insert(bom).values(bomData as any).returning();
    return created;
  }

  async updateBOM(id: string, bomData: Partial<InsertBOM>): Promise<BOM | undefined> {
    const [updated] = await db.update(bom).set(bomData as any).where(eq(bom.id, id)).returning();
    return updated;
  }

  // Production Tasks
  async getProductionTask(id: string): Promise<ProductionTask | undefined> {
    const [task] = await db.select().from(productionTasks).where(eq(productionTasks.id, id));
    return task;
  }

  async getProductionTasks(): Promise<ProductionTask[]> {
    return db.select().from(productionTasks).orderBy(desc(productionTasks.createdAt));
  }

  async getProductionTasksByJob(jobId: string): Promise<ProductionTask[]> {
    return db.select().from(productionTasks).where(eq(productionTasks.jobId, jobId)).orderBy(productionTasks.taskType);
  }

  async getProductionTasksByAssignee(userId: string): Promise<ProductionTask[]> {
    return db.select().from(productionTasks).where(eq(productionTasks.assignedTo, userId)).orderBy(desc(productionTasks.createdAt));
  }

  async getProductionTasksByStatus(status: string): Promise<ProductionTask[]> {
    return db.select().from(productionTasks).where(eq(productionTasks.status, status as any)).orderBy(desc(productionTasks.createdAt));
  }

  async createProductionTask(task: InsertProductionTask): Promise<ProductionTask> {
    const [created] = await db.insert(productionTasks).values(task).returning();
    return created;
  }

  async updateProductionTask(id: string, task: Partial<InsertProductionTask>): Promise<ProductionTask | undefined> {
    const [updated] = await db.update(productionTasks).set(task).where(eq(productionTasks.id, id)).returning();
    return updated;
  }

  // Install Tasks
  async getInstallTask(id: string): Promise<InstallTask | undefined> {
    const [task] = await db.select().from(installTasks).where(eq(installTasks.id, id));
    return task;
  }

  async getInstallTasks(): Promise<InstallTask[]> {
    return db.select().from(installTasks).orderBy(desc(installTasks.scheduledDate));
  }

  async getInstallTasksByJob(jobId: string): Promise<InstallTask[]> {
    return db.select().from(installTasks).where(eq(installTasks.jobId, jobId)).orderBy(installTasks.scheduledDate);
  }

  async getInstallTasksByInstaller(installerId: string): Promise<InstallTask[]> {
    return db.select().from(installTasks).where(eq(installTasks.installerId, installerId)).orderBy(desc(installTasks.scheduledDate));
  }

  async getInstallTasksByDate(date: Date): Promise<InstallTask[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return db.select().from(installTasks).where(
      and(
        gte(installTasks.scheduledDate, startOfDay),
        lte(installTasks.scheduledDate, endOfDay)
      )
    );
  }

  async createInstallTask(task: InsertInstallTask): Promise<InstallTask> {
    const [created] = await db.insert(installTasks).values(task as any).returning();
    return created;
  }

  async updateInstallTask(id: string, task: Partial<InsertInstallTask>): Promise<InstallTask | undefined> {
    const [updated] = await db.update(installTasks).set(task as any).where(eq(installTasks.id, id)).returning();
    return updated;
  }

  // Schedule Events
  async getScheduleEvent(id: string): Promise<ScheduleEvent | undefined> {
    const [event] = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, id));
    return event;
  }

  async getScheduleEvents(): Promise<ScheduleEvent[]> {
    return db.select().from(scheduleEvents).orderBy(scheduleEvents.startDate);
  }

  async getScheduleEventsByDateRange(start: Date, end: Date): Promise<ScheduleEvent[]> {
    return db.select().from(scheduleEvents).where(
      and(
        gte(scheduleEvents.startDate, start),
        lte(scheduleEvents.endDate, end)
      )
    ).orderBy(scheduleEvents.startDate);
  }

  async getScheduleEventsByAssignee(userId: string): Promise<ScheduleEvent[]> {
    return db.select().from(scheduleEvents).where(eq(scheduleEvents.assignedTo, userId)).orderBy(scheduleEvents.startDate);
  }

  async createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent> {
    const [created] = await db.insert(scheduleEvents).values(event).returning();
    return created;
  }

  async updateScheduleEvent(id: string, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined> {
    const [updated] = await db.update(scheduleEvents).set(event).where(eq(scheduleEvents.id, id)).returning();
    return updated;
  }

  async deleteScheduleEvent(id: string): Promise<boolean> {
    await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id));
    return true;
  }

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPayments(): Promise<Payment[]> {
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByClient(clientId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.clientId, clientId)).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByJob(jobId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.jobId, jobId)).orderBy(desc(payments.createdAt));
  }

  async getPendingPayments(): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.status, 'pending')).orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments).set(payment).where(eq(payments.id, id)).returning();
    return updated;
  }

  // Notifications
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    ).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  // SMS Logs
  async getSMSLog(id: string): Promise<SMSLog | undefined> {
    const [log] = await db.select().from(smsLogs).where(eq(smsLogs.id, id));
    return log;
  }

  async getSMSLogs(): Promise<SMSLog[]> {
    return db.select().from(smsLogs).orderBy(desc(smsLogs.createdAt));
  }

  async getSMSLogsByPhone(phone: string): Promise<SMSLog[]> {
    // Get last 9 digits for matching (handles both 0xxx and +61xxx formats)
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    const allLogs = await db.select().from(smsLogs).orderBy(smsLogs.createdAt);
    // Filter in JS to handle phone number matching correctly
    return allLogs.filter(log => {
      const logPhone = log.recipientPhone.replace(/\D/g, '').slice(-9);
      return logPhone === normalizedPhone;
    });
  }

  async getSMSLogsByEntity(entityType: string, entityId: string): Promise<SMSLog[]> {
    return db.select().from(smsLogs)
      .where(and(
        eq(smsLogs.relatedEntityType, entityType),
        eq(smsLogs.relatedEntityId, entityId)
      ))
      .orderBy(smsLogs.createdAt);
  }

  async createSMSLog(log: InsertSMSLog): Promise<SMSLog> {
    const [created] = await db.insert(smsLogs).values(log).returning();
    return created;
  }

  async updateSMSLog(id: string, log: Partial<InsertSMSLog>): Promise<SMSLog | undefined> {
    const [updated] = await db.update(smsLogs).set(log).where(eq(smsLogs.id, id)).returning();
    return updated;
  }

  async markMessagesRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    for (const id of messageIds) {
      await db.update(smsLogs).set({ isRead: true }).where(eq(smsLogs.id, id));
    }
  }

  async getUnreadMessageCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(smsLogs)
      .where(and(eq(smsLogs.isRead, false), eq(smsLogs.isOutbound, false)));
    return Number(result?.count || 0);
  }

  // SMS Conversations
  async getSMSConversation(id: string): Promise<SMSConversation | undefined> {
    const [conversation] = await db.select().from(smsConversations).where(eq(smsConversations.id, id));
    return conversation;
  }

  async getSMSConversationByPhone(phone: string): Promise<SMSConversation | undefined> {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    const allConversations = await db.select().from(smsConversations);
    return allConversations.find(conv => {
      const convPhone = conv.phoneNumber.replace(/\D/g, '').slice(-9);
      return convPhone === normalizedPhone;
    });
  }

  async getSMSConversations(): Promise<SMSConversation[]> {
    return db.select().from(smsConversations).orderBy(desc(smsConversations.lastMessageAt));
  }

  async getUnresolvedConversations(): Promise<SMSConversation[]> {
    return db.select().from(smsConversations)
      .where(eq(smsConversations.isResolved, false))
      .orderBy(desc(smsConversations.lastMessageAt));
  }

  async createSMSConversation(conversation: InsertSMSConversation): Promise<SMSConversation> {
    const [created] = await db.insert(smsConversations).values(conversation).returning();
    return created;
  }

  async updateSMSConversation(id: string, conversation: Partial<InsertSMSConversation>): Promise<SMSConversation | undefined> {
    const [updated] = await db.update(smsConversations).set(conversation).where(eq(smsConversations.id, id)).returning();
    return updated;
  }

  async findClientByPhone(phone: string): Promise<Client | undefined> {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    const allClients = await db.select().from(clients);
    return allClients.find(client => {
      if (!client.phone) return false;
      const clientPhone = client.phone.replace(/\D/g, '').slice(-9);
      return clientPhone === normalizedPhone;
    });
  }

  async getOrCreateConversation(phone: string): Promise<SMSConversation> {
    let conversation = await this.getSMSConversationByPhone(phone);
    if (conversation) return conversation;
    
    // Try to find matching client
    const client = await this.findClientByPhone(phone);
    
    // Create new conversation
    return this.createSMSConversation({
      phoneNumber: phone,
      clientId: client?.id || null,
      lastMessageAt: new Date(),
      unreadCount: 0,
    });
  }

  // Message Ranges
  async getMessageRange(id: string): Promise<MessageRange | undefined> {
    const [range] = await db.select().from(messageRanges).where(eq(messageRanges.id, id));
    return range;
  }

  async getMessageRangesByConversation(conversationId: string): Promise<MessageRange[]> {
    return db.select().from(messageRanges)
      .where(eq(messageRanges.conversationId, conversationId))
      .orderBy(desc(messageRanges.createdAt));
  }

  async getMessageRangesByLead(leadId: string): Promise<MessageRange[]> {
    return db.select().from(messageRanges)
      .where(eq(messageRanges.leadId, leadId))
      .orderBy(desc(messageRanges.createdAt));
  }

  async getMessageRangesByJob(jobId: string): Promise<MessageRange[]> {
    return db.select().from(messageRanges)
      .where(eq(messageRanges.jobId, jobId))
      .orderBy(desc(messageRanges.createdAt));
  }

  async createMessageRange(range: InsertMessageRange): Promise<MessageRange> {
    const [created] = await db.insert(messageRanges).values(range).returning();
    return created;
  }

  async deleteMessageRange(id: string): Promise<boolean> {
    await db.delete(messageRanges).where(eq(messageRanges.id, id));
    return true;
  }

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(100);
  }

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByEntity(entityType: string, entityId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(
      and(
        eq(activityLogs.entityType, entityType),
        eq(activityLogs.entityId, entityId)
      )
    ).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  // Documents
  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByJob(jobId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.jobId, jobId)).orderBy(desc(documents.createdAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async deleteDocument(id: string): Promise<boolean> {
    await db.delete(documents).where(eq(documents.id, id));
    return true;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [newLeadsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.stage, 'new'));

    const [quotesFollowUpResult] = await db.select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(eq(quotes.status, 'sent'));

    const [jobsInProductionResult] = await db.select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(
        or(
          eq(jobs.status, 'manufacturing_posts'),
          eq(jobs.status, 'manufacturing_panels'),
          eq(jobs.status, 'manufacturing_gates'),
          eq(jobs.status, 'qa_check')
        )
      );

    const [jobsReadyInstallResult] = await db.select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, 'scheduled'));

    const [todayInstallsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(installTasks)
      .where(
        and(
          gte(installTasks.scheduledDate, today),
          lte(installTasks.scheduledDate, tomorrow)
        )
      );

    const [pendingPaymentsResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(eq(payments.status, 'pending'));

    return {
      newLeadsCount: Number(newLeadsResult?.count || 0),
      quotesAwaitingFollowUp: Number(quotesFollowUpResult?.count || 0),
      jobsInProduction: Number(jobsInProductionResult?.count || 0),
      jobsReadyForInstall: Number(jobsReadyInstallResult?.count || 0),
      todayInstalls: Number(todayInstallsResult?.count || 0),
      pendingPaymentsTotal: Number(pendingPaymentsResult?.total || 0),
    };
  }

  // Quote Follow-ups
  async getQuoteFollowUp(id: string): Promise<QuoteFollowUp | undefined> {
    const [followUp] = await db.select().from(quoteFollowUps).where(eq(quoteFollowUps.id, id));
    return followUp;
  }

  async getQuoteFollowUpsByQuote(quoteId: string): Promise<QuoteFollowUp[]> {
    return db.select().from(quoteFollowUps)
      .where(eq(quoteFollowUps.quoteId, quoteId))
      .orderBy(desc(quoteFollowUps.scheduledDate));
  }

  async getPendingFollowUps(): Promise<QuoteFollowUp[]> {
    return db.select().from(quoteFollowUps)
      .where(isNull(quoteFollowUps.completedAt))
      .orderBy(quoteFollowUps.scheduledDate);
  }

  async getFollowUpsByAssignee(userId: string): Promise<QuoteFollowUp[]> {
    return db.select().from(quoteFollowUps)
      .where(and(eq(quoteFollowUps.assignedTo, userId), isNull(quoteFollowUps.completedAt)))
      .orderBy(quoteFollowUps.scheduledDate);
  }

  async createQuoteFollowUp(followUp: InsertQuoteFollowUp): Promise<QuoteFollowUp> {
    const [created] = await db.insert(quoteFollowUps).values(followUp).returning();
    return created;
  }

  async updateQuoteFollowUp(id: string, followUp: Partial<InsertQuoteFollowUp>): Promise<QuoteFollowUp | undefined> {
    const [updated] = await db.update(quoteFollowUps).set(followUp).where(eq(quoteFollowUps.id, id)).returning();
    return updated;
  }

  async deleteQuoteFollowUp(id: string): Promise<boolean> {
    await db.delete(quoteFollowUps).where(eq(quoteFollowUps.id, id));
    return true;
  }

  // Automation Campaigns
  async getAutomationCampaign(id: string): Promise<AutomationCampaign | undefined> {
    const [campaign] = await db.select().from(automationCampaigns).where(eq(automationCampaigns.id, id));
    return campaign;
  }

  async getAutomationCampaigns(): Promise<AutomationCampaign[]> {
    return db.select().from(automationCampaigns).orderBy(desc(automationCampaigns.createdAt));
  }

  async getActiveCampaigns(): Promise<AutomationCampaign[]> {
    return db.select().from(automationCampaigns)
      .where(eq(automationCampaigns.isActive, true))
      .orderBy(automationCampaigns.name);
  }

  async getCampaignsByTrigger(trigger: string): Promise<AutomationCampaign[]> {
    return db.select().from(automationCampaigns)
      .where(and(eq(automationCampaigns.trigger, trigger as any), eq(automationCampaigns.isActive, true)));
  }

  async createAutomationCampaign(campaign: InsertAutomationCampaign): Promise<AutomationCampaign> {
    const [created] = await db.insert(automationCampaigns).values(campaign).returning();
    return created;
  }

  async updateAutomationCampaign(id: string, campaign: Partial<InsertAutomationCampaign>): Promise<AutomationCampaign | undefined> {
    const [updated] = await db.update(automationCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(automationCampaigns.id, id))
      .returning();
    return updated;
  }

  async deleteAutomationCampaign(id: string): Promise<boolean> {
    await db.delete(automationCampaigns).where(eq(automationCampaigns.id, id));
    return true;
  }

  // Campaign Enrollments
  async getCampaignEnrollment(id: string): Promise<CampaignEnrollment | undefined> {
    const [enrollment] = await db.select().from(campaignEnrollments).where(eq(campaignEnrollments.id, id));
    return enrollment;
  }

  async getCampaignEnrollmentsByCampaign(campaignId: string): Promise<CampaignEnrollment[]> {
    return db.select().from(campaignEnrollments)
      .where(eq(campaignEnrollments.campaignId, campaignId))
      .orderBy(desc(campaignEnrollments.enrolledAt));
  }

  async getCampaignEnrollmentsByClient(clientId: string): Promise<CampaignEnrollment[]> {
    return db.select().from(campaignEnrollments)
      .where(eq(campaignEnrollments.clientId, clientId))
      .orderBy(desc(campaignEnrollments.enrolledAt));
  }

  async getPendingEnrollments(): Promise<CampaignEnrollment[]> {
    return db.select().from(campaignEnrollments)
      .where(and(eq(campaignEnrollments.status, 'active'), isNull(campaignEnrollments.sentAt)))
      .orderBy(campaignEnrollments.scheduledSendAt);
  }

  async createCampaignEnrollment(enrollment: InsertCampaignEnrollment): Promise<CampaignEnrollment> {
    const [created] = await db.insert(campaignEnrollments).values(enrollment).returning();
    return created;
  }

  async updateCampaignEnrollment(id: string, enrollment: Partial<InsertCampaignEnrollment>): Promise<CampaignEnrollment | undefined> {
    const [updated] = await db.update(campaignEnrollments).set(enrollment).where(eq(campaignEnrollments.id, id)).returning();
    return updated;
  }

  async cancelCampaignEnrollment(id: string, reason: string): Promise<CampaignEnrollment | undefined> {
    const [updated] = await db.update(campaignEnrollments)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: reason })
      .where(eq(campaignEnrollments.id, id))
      .returning();
    return updated;
  }

  // Quote Analytics
  async getQuoteAnalytics(): Promise<QuoteAnalytics> {
    const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
    
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const totalQuotes = allQuotes.length;
    const sentQuotes = allQuotes.filter(q => q.status === 'sent').length;
    const approvedQuotes = allQuotes.filter(q => q.status === 'approved').length;
    const declinedQuotes = allQuotes.filter(q => q.status === 'declined').length;
    const pendingQuotes = allQuotes.filter(q => q.status === 'sent' || q.status === 'draft').length;
    
    const quotesThisWeek = allQuotes.filter(q => new Date(q.createdAt) >= startOfThisWeek).length;
    const quotesLastWeek = allQuotes.filter(q => {
      const date = new Date(q.createdAt);
      return date >= startOfLastWeek && date < startOfThisWeek;
    }).length;

    const totalValue = allQuotes.reduce((sum, q) => sum + Number(q.totalAmount || 0), 0);
    const averageQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;
    
    const decidedQuotes = approvedQuotes + declinedQuotes;
    const conversionRate = decidedQuotes > 0 ? (approvedQuotes / decidedQuotes) * 100 : 0;

    // Group by status
    const statusCounts = ['draft', 'sent', 'approved', 'declined', 'expired'].map(status => ({
      status,
      count: allQuotes.filter(q => q.status === status).length,
    }));

    // Group by creator (get users data)
    const allUsers = await db.select().from(users);
    const creatorStats: { [key: string]: { total: number; approved: number; declined: number; userName: string } } = {};
    
    allQuotes.forEach(q => {
      if (q.createdBy) {
        if (!creatorStats[q.createdBy]) {
          const user = allUsers.find(u => u.id === q.createdBy);
          creatorStats[q.createdBy] = {
            total: 0,
            approved: 0,
            declined: 0,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          };
        }
        creatorStats[q.createdBy].total++;
        if (q.status === 'approved') creatorStats[q.createdBy].approved++;
        if (q.status === 'declined') creatorStats[q.createdBy].declined++;
      }
    });

    const quotesByCreator = Object.entries(creatorStats).map(([userId, stats]) => ({
      userId,
      userName: stats.userName,
      total: stats.total,
      approved: stats.approved,
      declined: stats.declined,
    }));

    return {
      totalQuotes,
      sentQuotes,
      approvedQuotes,
      declinedQuotes,
      pendingQuotes,
      conversionRate,
      totalValue,
      averageQuoteValue,
      quotesThisWeek,
      quotesLastWeek,
      quotesByStatus: statusCounts,
      quotesByCreator,
      recentQuotes: allQuotes.slice(0, 10),
    };
  }

  // ============================================
  // PROFIT & LOSS COST TRACKING IMPLEMENTATION
  // ============================================

  // Staff Rate Cards
  async getStaffRateCard(id: string): Promise<StaffRateCard | undefined> {
    const [card] = await db.select().from(staffRateCards).where(eq(staffRateCards.id, id));
    return card;
  }

  async getStaffRateCards(): Promise<StaffRateCard[]> {
    return db.select().from(staffRateCards).orderBy(desc(staffRateCards.createdAt));
  }

  async getStaffRateCardsByUser(userId: string): Promise<StaffRateCard[]> {
    return db.select().from(staffRateCards)
      .where(eq(staffRateCards.userId, userId))
      .orderBy(desc(staffRateCards.effectiveFrom));
  }

  async getActiveRateByType(userId: string, rateType: string): Promise<StaffRateCard | undefined> {
    const now = new Date();
    const [rate] = await db.select().from(staffRateCards)
      .where(and(
        eq(staffRateCards.userId, userId),
        eq(staffRateCards.rateType, rateType),
        eq(staffRateCards.isActive, true),
        lte(staffRateCards.effectiveFrom, now),
        or(isNull(staffRateCards.effectiveUntil), gte(staffRateCards.effectiveUntil, now))
      ))
      .orderBy(desc(staffRateCards.effectiveFrom))
      .limit(1);
    return rate;
  }

  async createStaffRateCard(rateCard: InsertStaffRateCard): Promise<StaffRateCard> {
    const [created] = await db.insert(staffRateCards).values(rateCard).returning();
    return created;
  }

  async updateStaffRateCard(id: string, rateCard: Partial<InsertStaffRateCard>): Promise<StaffRateCard | undefined> {
    const [updated] = await db.update(staffRateCards).set(rateCard).where(eq(staffRateCards.id, id)).returning();
    return updated;
  }

  async deleteStaffRateCard(id: string): Promise<boolean> {
    await db.delete(staffRateCards).where(eq(staffRateCards.id, id));
    return true;
  }

  // Quote Cost Components
  async getQuoteCostComponent(id: string): Promise<QuoteCostComponent | undefined> {
    const [component] = await db.select().from(quoteCostComponents).where(eq(quoteCostComponents.id, id));
    return component;
  }

  async getQuoteCostComponentsByQuote(quoteId: string): Promise<QuoteCostComponent[]> {
    return db.select().from(quoteCostComponents)
      .where(eq(quoteCostComponents.quoteId, quoteId))
      .orderBy(quoteCostComponents.category, quoteCostComponents.createdAt);
  }

  async getQuoteCostComponentsByJob(jobId: string): Promise<QuoteCostComponent[]> {
    return db.select().from(quoteCostComponents)
      .where(eq(quoteCostComponents.jobId, jobId))
      .orderBy(quoteCostComponents.category, quoteCostComponents.createdAt);
  }

  async createQuoteCostComponent(component: InsertQuoteCostComponent): Promise<QuoteCostComponent> {
    const [created] = await db.insert(quoteCostComponents).values(component).returning();
    return created;
  }

  async updateQuoteCostComponent(id: string, component: Partial<InsertQuoteCostComponent>): Promise<QuoteCostComponent | undefined> {
    const [updated] = await db.update(quoteCostComponents)
      .set({ ...component, updatedAt: new Date() })
      .where(eq(quoteCostComponents.id, id))
      .returning();
    return updated;
  }

  async deleteQuoteCostComponent(id: string): Promise<boolean> {
    await db.delete(quoteCostComponents).where(eq(quoteCostComponents.id, id));
    return true;
  }

  // Quote Trips
  async getQuoteTrip(id: string): Promise<QuoteTrip | undefined> {
    const [trip] = await db.select().from(quoteTrips).where(eq(quoteTrips.id, id));
    return trip;
  }

  async getQuoteTripsByQuote(quoteId: string): Promise<QuoteTrip[]> {
    return db.select().from(quoteTrips)
      .where(eq(quoteTrips.quoteId, quoteId))
      .orderBy(quoteTrips.scheduledDate, quoteTrips.createdAt);
  }

  async getQuoteTripsByJob(jobId: string): Promise<QuoteTrip[]> {
    return db.select().from(quoteTrips)
      .where(eq(quoteTrips.jobId, jobId))
      .orderBy(quoteTrips.scheduledDate, quoteTrips.createdAt);
  }

  async getQuoteTripsByStaff(staffId: string): Promise<QuoteTrip[]> {
    return db.select().from(quoteTrips)
      .where(eq(quoteTrips.staffId, staffId))
      .orderBy(desc(quoteTrips.scheduledDate));
  }

  async createQuoteTrip(trip: InsertQuoteTrip): Promise<QuoteTrip> {
    const [created] = await db.insert(quoteTrips).values(trip).returning();
    return created;
  }

  async updateQuoteTrip(id: string, trip: Partial<InsertQuoteTrip>): Promise<QuoteTrip | undefined> {
    const [updated] = await db.update(quoteTrips).set(trip).where(eq(quoteTrips.id, id)).returning();
    return updated;
  }

  async deleteQuoteTrip(id: string): Promise<boolean> {
    await db.delete(quoteTrips).where(eq(quoteTrips.id, id));
    return true;
  }

  // Quote Admin Time
  async getQuoteAdminTime(id: string): Promise<QuoteAdminTime | undefined> {
    const [adminTime] = await db.select().from(quoteAdminTime).where(eq(quoteAdminTime.id, id));
    return adminTime;
  }

  async getQuoteAdminTimeByQuote(quoteId: string): Promise<QuoteAdminTime[]> {
    return db.select().from(quoteAdminTime)
      .where(eq(quoteAdminTime.quoteId, quoteId))
      .orderBy(desc(quoteAdminTime.createdAt));
  }

  async getQuoteAdminTimeByJob(jobId: string): Promise<QuoteAdminTime[]> {
    return db.select().from(quoteAdminTime)
      .where(eq(quoteAdminTime.jobId, jobId))
      .orderBy(desc(quoteAdminTime.createdAt));
  }

  async getQuoteAdminTimeByStaff(staffId: string): Promise<QuoteAdminTime[]> {
    return db.select().from(quoteAdminTime)
      .where(eq(quoteAdminTime.staffId, staffId))
      .orderBy(desc(quoteAdminTime.createdAt));
  }

  async createQuoteAdminTime(adminTime: InsertQuoteAdminTime): Promise<QuoteAdminTime> {
    const [created] = await db.insert(quoteAdminTime).values(adminTime).returning();
    return created;
  }

  async updateQuoteAdminTime(id: string, adminTime: Partial<InsertQuoteAdminTime>): Promise<QuoteAdminTime | undefined> {
    const [updated] = await db.update(quoteAdminTime).set(adminTime).where(eq(quoteAdminTime.id, id)).returning();
    return updated;
  }

  async deleteQuoteAdminTime(id: string): Promise<boolean> {
    await db.delete(quoteAdminTime).where(eq(quoteAdminTime.id, id));
    return true;
  }

  // Travel Sessions
  async getTravelSession(id: string): Promise<TravelSession | undefined> {
    const [session] = await db.select().from(travelSessions).where(eq(travelSessions.id, id));
    return session;
  }

  async getTravelSessionsByTrip(tripId: string): Promise<TravelSession[]> {
    return db.select().from(travelSessions)
      .where(eq(travelSessions.tripId, tripId))
      .orderBy(desc(travelSessions.createdAt));
  }

  async getActiveTravelSessions(): Promise<TravelSession[]> {
    return db.select().from(travelSessions)
      .where(eq(travelSessions.status, 'in_transit'))
      .orderBy(travelSessions.startedAt);
  }

  async createTravelSession(session: InsertTravelSession): Promise<TravelSession> {
    const [created] = await db.insert(travelSessions).values(session).returning();
    return created;
  }

  async updateTravelSession(id: string, session: Partial<InsertTravelSession>): Promise<TravelSession | undefined> {
    const [updated] = await db.update(travelSessions).set(session).where(eq(travelSessions.id, id)).returning();
    return updated;
  }

  // Quote Ground Conditions
  async getQuoteGroundCondition(id: string): Promise<QuoteGroundCondition | undefined> {
    const [condition] = await db.select().from(quoteGroundConditions).where(eq(quoteGroundConditions.id, id));
    return condition;
  }

  async getQuoteGroundConditionsByQuote(quoteId: string): Promise<QuoteGroundCondition[]> {
    return db.select().from(quoteGroundConditions)
      .where(eq(quoteGroundConditions.quoteId, quoteId))
      .orderBy(quoteGroundConditions.createdAt);
  }

  async createQuoteGroundCondition(condition: InsertQuoteGroundCondition): Promise<QuoteGroundCondition> {
    const [created] = await db.insert(quoteGroundConditions).values(condition).returning();
    return created;
  }

  async updateQuoteGroundCondition(id: string, condition: Partial<InsertQuoteGroundCondition>): Promise<QuoteGroundCondition | undefined> {
    const [updated] = await db.update(quoteGroundConditions).set(condition).where(eq(quoteGroundConditions.id, id)).returning();
    return updated;
  }

  async deleteQuoteGroundCondition(id: string): Promise<boolean> {
    await db.delete(quoteGroundConditions).where(eq(quoteGroundConditions.id, id));
    return true;
  }

  // Quote P&L Summary
  async getQuotePLSummary(id: string): Promise<QuotePLSummary | undefined> {
    const [summary] = await db.select().from(quotePLSummary).where(eq(quotePLSummary.id, id));
    return summary;
  }

  async getQuotePLSummaryByQuote(quoteId: string): Promise<QuotePLSummary | undefined> {
    const [summary] = await db.select().from(quotePLSummary).where(eq(quotePLSummary.quoteId, quoteId));
    return summary;
  }

  async getQuotePLSummaryByJob(jobId: string): Promise<QuotePLSummary | undefined> {
    const [summary] = await db.select().from(quotePLSummary).where(eq(quotePLSummary.jobId, jobId));
    return summary;
  }

  async createQuotePLSummary(summary: InsertQuotePLSummary): Promise<QuotePLSummary> {
    const [created] = await db.insert(quotePLSummary).values(summary).returning();
    return created;
  }

  async updateQuotePLSummary(id: string, summary: Partial<InsertQuotePLSummary>): Promise<QuotePLSummary | undefined> {
    const [updated] = await db.update(quotePLSummary)
      .set({ ...summary, updatedAt: new Date(), lastCalculatedAt: new Date() })
      .where(eq(quotePLSummary.id, id))
      .returning();
    return updated;
  }

  async recalculateQuotePLSummary(quoteId: string): Promise<QuotePLSummary | undefined> {
    // Get the quote
    const quote = await this.getQuote(quoteId);
    if (!quote) return undefined;

    // Get all cost components
    const costComponents = await this.getQuoteCostComponentsByQuote(quoteId);
    
    // Get all trips
    const trips = await this.getQuoteTripsByQuote(quoteId);
    
    // Get all admin time
    const adminTimes = await this.getQuoteAdminTimeByQuote(quoteId);
    
    // Get ground conditions
    const groundConditions = await this.getQuoteGroundConditionsByQuote(quoteId);

    // Calculate costs by category
    const materialsCost = costComponents
      .filter(c => c.category === 'materials')
      .reduce((sum, c) => sum + Number(c.totalCost || 0), 0);

    const manufacturingLabourCost = costComponents
      .filter(c => c.category === 'manufacturing_labour')
      .reduce((sum, c) => sum + Number(c.totalCost || 0), 0);

    const installationLabourCost = costComponents
      .filter(c => c.category === 'install_labour')
      .reduce((sum, c) => sum + Number(c.totalCost || 0), 0);

    const supplierDeliveryFees = costComponents
      .filter(c => c.category === 'supplier_fees')
      .reduce((sum, c) => sum + Number(c.totalCost || 0), 0);

    const thirdPartyCost = costComponents
      .filter(c => c.category === 'third_party')
      .reduce((sum, c) => sum + Number(c.totalCost || 0), 0);

    // Calculate travel costs from trips
    const travelCost = trips.reduce((sum, t) => sum + Number(t.travelCostTotal || 0), 0);
    const totalTravelMinutes = trips.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);

    // Calculate admin costs
    const adminCost = adminTimes.reduce((sum, a) => sum + Number(a.totalCost || 0), 0);
    const totalAdminMinutes = adminTimes.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);

    // Calculate ground conditions costs
    const groundConditionsCost = groundConditions.reduce((sum, g) => sum + Number(g.additionalCost || 0), 0);

    // Total revenue is from the quote
    const totalRevenue = Number(quote.totalAmount || 0);

    // Calculate totals
    const totalCost = materialsCost + manufacturingLabourCost + installationLabourCost + 
                      travelCost + adminCost + supplierDeliveryFees + thirdPartyCost + groundConditionsCost;
    
    const profitAmount = totalRevenue - totalCost;
    const profitMarginPercent = totalRevenue > 0 ? (profitAmount / totalRevenue) * 100 : 0;

    // Manufacturing minutes from production cost components
    const totalManufacturingMinutes = costComponents
      .filter(c => c.category === 'manufacturing_labour')
      .reduce((sum, c) => sum + Number(c.quantity || 0) * 60, 0); // Assuming quantity is hours

    // Install minutes
    const totalInstallMinutes = costComponents
      .filter(c => c.category === 'install_labour')
      .reduce((sum, c) => sum + Number(c.quantity || 0) * 60, 0);

    const summaryData = {
      quoteId,
      totalRevenue: totalRevenue.toString(),
      materialsCost: materialsCost.toString(),
      manufacturingLabourCost: manufacturingLabourCost.toString(),
      installationLabourCost: installationLabourCost.toString(),
      travelCost: travelCost.toString(),
      adminCost: adminCost.toString(),
      supplierDeliveryFees: supplierDeliveryFees.toString(),
      thirdPartyCost: thirdPartyCost.toString(),
      groundConditionsCost: groundConditionsCost.toString(),
      totalCost: totalCost.toString(),
      profitAmount: profitAmount.toString(),
      profitMarginPercent: profitMarginPercent.toFixed(2),
      isSupplyOnly: !quote.labourEstimate || Number(quote.labourEstimate) === 0,
      actualTripCount: trips.length,
      totalManufacturingMinutes: Math.round(totalManufacturingMinutes),
      totalInstallMinutes: Math.round(totalInstallMinutes),
      totalAdminMinutes,
      totalTravelMinutes,
    };

    // Check if summary exists, update or create
    const existing = await this.getQuotePLSummaryByQuote(quoteId);
    if (existing) {
      return this.updateQuotePLSummary(existing.id, summaryData);
    } else {
      return this.createQuotePLSummary(summaryData);
    }
  }

  // ============================================
  // ORGANISATION HUB IMPLEMENTATIONS
  // ============================================

  // Departments
  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async getDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(departments.name);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(department).returning();
    return created;
  }

  async updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updated] = await db.update(departments)
      .set({ ...department, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const result = await db.delete(departments).where(eq(departments.id, id)).returning();
    return result.length > 0;
  }

  // Workflows
  async getWorkflow(id: string): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow;
  }

  async getWorkflows(): Promise<Workflow[]> {
    return db.select().from(workflows).orderBy(desc(workflows.updatedAt));
  }

  async getWorkflowsByDepartment(departmentId: string): Promise<Workflow[]> {
    return db.select().from(workflows).where(eq(workflows.departmentId, departmentId)).orderBy(workflows.title);
  }

  async getWorkflowsByCategory(category: string): Promise<Workflow[]> {
    return db.select().from(workflows).where(eq(workflows.category, category as any)).orderBy(workflows.title);
  }

  async getActiveWorkflows(): Promise<Workflow[]> {
    return db.select().from(workflows).where(eq(workflows.status, 'active')).orderBy(workflows.title);
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const [created] = await db.insert(workflows).values(workflow).returning();
    return created;
  }

  async updateWorkflow(id: string, workflow: Partial<InsertWorkflow>): Promise<Workflow | undefined> {
    const [updated] = await db.update(workflows)
      .set({ ...workflow, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return updated;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const result = await db.delete(workflows).where(eq(workflows.id, id)).returning();
    return result.length > 0;
  }

  // Workflow Versions
  async getWorkflowVersion(id: string): Promise<WorkflowVersion | undefined> {
    const [version] = await db.select().from(workflowVersions).where(eq(workflowVersions.id, id));
    return version;
  }

  async getWorkflowVersionsByWorkflow(workflowId: string): Promise<WorkflowVersion[]> {
    return db.select().from(workflowVersions)
      .where(eq(workflowVersions.workflowId, workflowId))
      .orderBy(desc(workflowVersions.versionNumber));
  }

  async getLatestWorkflowVersion(workflowId: string): Promise<WorkflowVersion | undefined> {
    const [version] = await db.select().from(workflowVersions)
      .where(eq(workflowVersions.workflowId, workflowId))
      .orderBy(desc(workflowVersions.versionNumber))
      .limit(1);
    return version;
  }

  async createWorkflowVersion(version: InsertWorkflowVersion): Promise<WorkflowVersion> {
    const [created] = await db.insert(workflowVersions).values(version).returning();
    return created;
  }

  async updateWorkflowVersion(id: string, version: Partial<InsertWorkflowVersion>): Promise<WorkflowVersion | undefined> {
    const [updated] = await db.update(workflowVersions)
      .set(version)
      .where(eq(workflowVersions.id, id))
      .returning();
    return updated;
  }

  // Policies
  async getPolicy(id: string): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async getPolicies(): Promise<Policy[]> {
    return db.select().from(policies).orderBy(desc(policies.updatedAt));
  }

  async getPoliciesByDepartment(departmentId: string): Promise<Policy[]> {
    return db.select().from(policies).where(eq(policies.departmentId, departmentId)).orderBy(policies.title);
  }

  async getPoliciesByCategory(category: string): Promise<Policy[]> {
    return db.select().from(policies).where(eq(policies.category, category as any)).orderBy(policies.title);
  }

  async getActivePolicies(): Promise<Policy[]> {
    return db.select().from(policies).where(eq(policies.status, 'active')).orderBy(policies.title);
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const [created] = await db.insert(policies).values(policy).returning();
    return created;
  }

  async updatePolicy(id: string, policy: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const [updated] = await db.update(policies)
      .set({ ...policy, updatedAt: new Date() })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await db.delete(policies).where(eq(policies.id, id)).returning();
    return result.length > 0;
  }

  // Policy Versions
  async getPolicyVersion(id: string): Promise<PolicyVersion | undefined> {
    const [version] = await db.select().from(policyVersions).where(eq(policyVersions.id, id));
    return version;
  }

  async getPolicyVersionsByPolicy(policyId: string): Promise<PolicyVersion[]> {
    return db.select().from(policyVersions)
      .where(eq(policyVersions.policyId, policyId))
      .orderBy(desc(policyVersions.versionNumber));
  }

  async getLatestPolicyVersion(policyId: string): Promise<PolicyVersion | undefined> {
    const [version] = await db.select().from(policyVersions)
      .where(eq(policyVersions.policyId, policyId))
      .orderBy(desc(policyVersions.versionNumber))
      .limit(1);
    return version;
  }

  async createPolicyVersion(version: InsertPolicyVersion): Promise<PolicyVersion> {
    const [created] = await db.insert(policyVersions).values(version).returning();
    return created;
  }

  async updatePolicyVersion(id: string, version: Partial<InsertPolicyVersion>): Promise<PolicyVersion | undefined> {
    const [updated] = await db.update(policyVersions)
      .set(version)
      .where(eq(policyVersions.id, id))
      .returning();
    return updated;
  }

  // Policy Acknowledgements
  async getPolicyAcknowledgement(id: string): Promise<PolicyAcknowledgement | undefined> {
    const [ack] = await db.select().from(policyAcknowledgements).where(eq(policyAcknowledgements.id, id));
    return ack;
  }

  async getPolicyAcknowledgementsByPolicy(policyId: string): Promise<PolicyAcknowledgement[]> {
    return db.select().from(policyAcknowledgements)
      .where(eq(policyAcknowledgements.policyId, policyId))
      .orderBy(desc(policyAcknowledgements.acknowledgedAt));
  }

  async getPolicyAcknowledgementsByUser(userId: string): Promise<PolicyAcknowledgement[]> {
    return db.select().from(policyAcknowledgements)
      .where(eq(policyAcknowledgements.userId, userId))
      .orderBy(desc(policyAcknowledgements.acknowledgedAt));
  }

  async hasUserAcknowledgedPolicy(userId: string, policyVersionId: string): Promise<boolean> {
    const [ack] = await db.select().from(policyAcknowledgements)
      .where(and(
        eq(policyAcknowledgements.userId, userId),
        eq(policyAcknowledgements.policyVersionId, policyVersionId)
      ));
    return !!ack;
  }

  async createPolicyAcknowledgement(acknowledgement: InsertPolicyAcknowledgement): Promise<PolicyAcknowledgement> {
    const [created] = await db.insert(policyAcknowledgements).values(acknowledgement).returning();
    return created;
  }

  // Resources
  async getResource(id: string): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }

  async getResources(): Promise<Resource[]> {
    return db.select().from(resources).orderBy(desc(resources.uploadedAt));
  }

  async getResourcesByDepartment(departmentId: string): Promise<Resource[]> {
    return db.select().from(resources).where(eq(resources.departmentId, departmentId)).orderBy(resources.title);
  }

  async searchResources(query: string): Promise<Resource[]> {
    return db.select().from(resources)
      .where(or(
        like(resources.title, `%${query}%`),
        like(resources.description, `%${query}%`)
      ))
      .orderBy(desc(resources.uploadedAt));
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(resource).returning();
    return created;
  }

  async updateResource(id: string, resource: Partial<InsertResource>): Promise<Resource | undefined> {
    const [updated] = await db.update(resources)
      .set(resource)
      .where(eq(resources.id, id))
      .returning();
    return updated;
  }

  async deleteResource(id: string): Promise<boolean> {
    const result = await db.delete(resources).where(eq(resources.id, id)).returning();
    return result.length > 0;
  }

  // Knowledge Articles
  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle | undefined> {
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    return article;
  }

  async getKnowledgeArticleBySlug(slug: string): Promise<KnowledgeArticle | undefined> {
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.slug, slug));
    return article;
  }

  async getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
    return db.select().from(knowledgeArticles).orderBy(desc(knowledgeArticles.updatedAt));
  }

  async getPublishedKnowledgeArticles(): Promise<KnowledgeArticle[]> {
    return db.select().from(knowledgeArticles)
      .where(eq(knowledgeArticles.isPublished, true))
      .orderBy(knowledgeArticles.title);
  }

  async getKnowledgeArticlesByDepartment(departmentId: string): Promise<KnowledgeArticle[]> {
    return db.select().from(knowledgeArticles)
      .where(eq(knowledgeArticles.departmentId, departmentId))
      .orderBy(knowledgeArticles.title);
  }

  async searchKnowledgeArticles(query: string): Promise<KnowledgeArticle[]> {
    return db.select().from(knowledgeArticles)
      .where(or(
        like(knowledgeArticles.title, `%${query}%`),
        like(knowledgeArticles.contentMarkdown, `%${query}%`)
      ))
      .orderBy(desc(knowledgeArticles.updatedAt));
  }

  async createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const [created] = await db.insert(knowledgeArticles).values(article).returning();
    return created;
  }

  async updateKnowledgeArticle(id: string, article: Partial<InsertKnowledgeArticle>): Promise<KnowledgeArticle | undefined> {
    const [updated] = await db.update(knowledgeArticles)
      .set({ ...article, updatedAt: new Date() })
      .where(eq(knowledgeArticles.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeArticle(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeArticles).where(eq(knowledgeArticles.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // JOB SETUP DOCUMENTS
  // ============================================

  async getJobSetupDocument(id: string): Promise<JobSetupDocument | undefined> {
    const [document] = await db.select().from(jobSetupDocuments).where(eq(jobSetupDocuments.id, id));
    return document;
  }

  async getJobSetupDocumentByJob(jobId: string): Promise<JobSetupDocument | undefined> {
    const [document] = await db.select().from(jobSetupDocuments).where(eq(jobSetupDocuments.jobId, jobId));
    return document;
  }

  async getJobSetupDocuments(): Promise<JobSetupDocument[]> {
    return db.select().from(jobSetupDocuments).orderBy(desc(jobSetupDocuments.createdAt));
  }

  async getJobSetupDocumentsByStatus(status: string): Promise<JobSetupDocument[]> {
    return db.select().from(jobSetupDocuments)
      .where(eq(jobSetupDocuments.status, status as any))
      .orderBy(desc(jobSetupDocuments.createdAt));
  }

  async createJobSetupDocument(document: InsertJobSetupDocument): Promise<JobSetupDocument> {
    const [created] = await db.insert(jobSetupDocuments).values(document as any).returning();
    return created;
  }

  async updateJobSetupDocument(id: string, document: Partial<InsertJobSetupDocument>): Promise<JobSetupDocument | undefined> {
    const [updated] = await db.update(jobSetupDocuments)
      .set({ ...document, updatedAt: new Date() } as any)
      .where(eq(jobSetupDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteJobSetupDocument(id: string): Promise<boolean> {
    // First delete associated products
    await db.delete(jobSetupProducts).where(eq(jobSetupProducts.jobSetupDocumentId, id));
    // Then delete the document
    const result = await db.delete(jobSetupDocuments).where(eq(jobSetupDocuments.id, id)).returning();
    return result.length > 0;
  }

  // Section-specific updates
  async updateJobSetupSection1(id: string, section: JobSetupSection1Sales): Promise<JobSetupDocument | undefined> {
    const [updated] = await db.update(jobSetupDocuments)
      .set({ section1Sales: section, updatedAt: new Date() })
      .where(eq(jobSetupDocuments.id, id))
      .returning();
    return updated;
  }

  async updateJobSetupSection2Meta(id: string, section: JobSetupSection2ProductsMeta): Promise<JobSetupDocument | undefined> {
    const [updated] = await db.update(jobSetupDocuments)
      .set({ section2ProductsMeta: section, updatedAt: new Date() })
      .where(eq(jobSetupDocuments.id, id))
      .returning();
    return updated;
  }

  async updateJobSetupSection3(id: string, section: JobSetupSection3Production): Promise<JobSetupDocument | undefined> {
    const [updated] = await db.update(jobSetupDocuments)
      .set({ section3Production: section, updatedAt: new Date() })
      .where(eq(jobSetupDocuments.id, id))
      .returning();
    return updated;
  }

  async updateJobSetupSection4(id: string, section: JobSetupSection4Schedule): Promise<JobSetupDocument | undefined> {
    const [updated] = await db.update(jobSetupDocuments)
      .set({ section4Schedule: section, updatedAt: new Date() })
      .where(eq(jobSetupDocuments.id, id))
      .returning();
    return updated;
  }

  async updateJobSetupSection5(id: string, section: JobSetupSection5Install): Promise<JobSetupDocument | undefined> {
    const [updated] = await db.update(jobSetupDocuments)
      .set({ section5Install: section, updatedAt: new Date() })
      .where(eq(jobSetupDocuments.id, id))
      .returning();
    return updated;
  }

  // Section completion
  async markSectionComplete(id: string, sectionNumber: 1 | 2 | 3 | 4 | 5, complete: boolean): Promise<JobSetupDocument | undefined> {
    const sectionField = `section${sectionNumber}Complete` as keyof typeof jobSetupDocuments.$inferInsert;
    const [updated] = await db.update(jobSetupDocuments)
      .set({ [sectionField]: complete, updatedAt: new Date() } as any)
      .where(eq(jobSetupDocuments.id, id))
      .returning();
    
    // Recalculate document status after marking section
    if (updated) {
      return this.recalculateDocumentStatus(id);
    }
    return updated;
  }

  async recalculateDocumentStatus(id: string): Promise<JobSetupDocument | undefined> {
    const document = await this.getJobSetupDocument(id);
    if (!document) return undefined;

    let newStatus: string = document.status;

    // Determine new status based on section completion
    if (document.section5Complete) {
      newStatus = "completed";
    } else if (document.section4Complete) {
      newStatus = "ready_for_install";
    } else if (document.section3Complete) {
      newStatus = "ready_for_scheduling";
    } else if (document.section1Complete && document.section2Complete) {
      newStatus = "ready_for_production";
    } else if (document.section1Complete || document.section2Complete) {
      newStatus = "in_progress";
    } else {
      newStatus = "draft";
    }

    if (newStatus !== document.status) {
      const [updated] = await db.update(jobSetupDocuments)
        .set({ status: newStatus as any, updatedAt: new Date() })
        .where(eq(jobSetupDocuments.id, id))
        .returning();
      return updated;
    }

    return document;
  }

  // Job Setup Products
  async getJobSetupProduct(id: string): Promise<JobSetupProduct | undefined> {
    const [product] = await db.select().from(jobSetupProducts).where(eq(jobSetupProducts.id, id));
    return product;
  }

  async getJobSetupProductsByDocument(documentId: string): Promise<JobSetupProduct[]> {
    return db.select().from(jobSetupProducts)
      .where(eq(jobSetupProducts.jobSetupDocumentId, documentId))
      .orderBy(jobSetupProducts.category, jobSetupProducts.productName);
  }

  async createJobSetupProduct(product: InsertJobSetupProduct): Promise<JobSetupProduct> {
    const [created] = await db.insert(jobSetupProducts).values(product).returning();
    return created;
  }

  async createJobSetupProducts(productsToCreate: InsertJobSetupProduct[]): Promise<JobSetupProduct[]> {
    if (productsToCreate.length === 0) return [];
    return db.insert(jobSetupProducts).values(productsToCreate).returning();
  }

  async updateJobSetupProduct(id: string, product: Partial<InsertJobSetupProduct>): Promise<JobSetupProduct | undefined> {
    const [updated] = await db.update(jobSetupProducts)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(jobSetupProducts.id, id))
      .returning();
    return updated;
  }

  async deleteJobSetupProduct(id: string): Promise<boolean> {
    const result = await db.delete(jobSetupProducts).where(eq(jobSetupProducts.id, id)).returning();
    return result.length > 0;
  }

  async deleteJobSetupProductsByDocument(documentId: string): Promise<boolean> {
    const result = await db.delete(jobSetupProducts)
      .where(eq(jobSetupProducts.jobSetupDocumentId, documentId))
      .returning();
    return result.length > 0;
  }

  // Seed products from quote
  async seedJobSetupProductsFromQuote(documentId: string, quoteId: string): Promise<JobSetupProduct[]> {
    const quote = await this.getQuote(quoteId);
    if (!quote || !quote.lineItems) return [];

    // Get all products to validate productId references
    const allProducts = await this.getProducts();
    const productIdSet = new Set(allProducts.map(p => p.id));

    // Map quote line items to job setup products
    const productsToCreate: InsertJobSetupProduct[] = quote.lineItems.map((item: any) => {
      // Determine category based on product name or other indicators
      let category: string = "other";
      const nameLower = item.productName?.toLowerCase() || "";
      if (nameLower.includes("post")) category = "post";
      else if (nameLower.includes("rail")) category = "rail";
      else if (nameLower.includes("panel") || nameLower.includes("picket")) category = "panel";
      else if (nameLower.includes("cap")) category = "cap";
      else if (nameLower.includes("gate")) category = "gate";
      else if (nameLower.includes("hardware") || nameLower.includes("screw") || nameLower.includes("bracket")) category = "hardware";
      else if (nameLower.includes("cement") || nameLower.includes("concrete")) category = "cement";

      // Only use productId if it's a valid UUID that exists in the products table
      // Quote line items might have SKUs instead of UUIDs, so we need to validate
      const validProductId = item.productId && productIdSet.has(item.productId) ? item.productId : null;

      return {
        jobSetupDocumentId: documentId,
        productId: validProductId,
        productName: item.productName || "Unknown Product",
        sku: !validProductId && item.productId ? item.productId : null,
        category: category as any,
        quantity: item.quantity || 0,
        unitInfo: null,
        notes: item.notes || null,
        sourceQuoteLineId: null,
        addedBy: null,
      };
    });

    // Update section 2 metadata
    await this.updateJobSetupSection2Meta(documentId, {
      autoPopulatedFromQuote: true,
      quoteId: quoteId,
      lastUpdatedAt: new Date().toISOString(),
    });

    return this.createJobSetupProducts(productsToCreate);
  }
}

export const storage = new DatabaseStorage();
