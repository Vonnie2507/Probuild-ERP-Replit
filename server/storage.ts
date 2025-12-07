import { eq, desc, and, gte, lte, like, ilike, or, sql, isNull, isNotNull, ne, inArray } from "drizzle-orm";
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
  jobSetupDocuments, jobSetupProducts, liveDocumentTemplates,
  leadActivities, leadTasks, staffLeaveBalances,
  bankConnections, bankAccounts, bankTransactions,
  jobPipelines, jobPipelineStages,
  expenseCategories, receiptSubmissions,
  type User, type InsertUser,
  type StaffLeaveBalance, type InsertStaffLeaveBalance,
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
  type LiveDocumentTemplate, type InsertLiveDocumentTemplate,
  type LeadActivity, type InsertLeadActivity,
  type LeadTask, type InsertLeadTask,
  type DashboardWidget, type InsertDashboardWidget,
  type RoleDashboardLayout, type InsertRoleDashboardLayout,
  type DashboardWidgetInstance, type InsertDashboardWidgetInstance,
  type BankConnection, type InsertBankConnection,
  type BankAccount, type InsertBankAccount,
  type BankTransaction, type InsertBankTransaction,
  type JobPipeline, type InsertJobPipeline,
  type JobPipelineStage, type InsertJobPipelineStage,
  type JobStageCompletion, jobStageCompletions,
  type KanbanColumn, type InsertKanbanColumn, kanbanColumns,
  type JobStatus, type InsertJobStatus, jobStatuses,
  type JobStatusDependency, jobStatusDependencies,
  type ProductionStage, type InsertProductionStage, productionStages,
  dashboardWidgets, roleDashboardLayouts, dashboardWidgetInstances,
  // Voice Calls & AI Coaching
  voiceCalls, callTranscripts, salesChecklistItems, callChecklistStatus, callCoachingPrompts,
  type VoiceCall, type InsertVoiceCall,
  type CallTranscript, type InsertCallTranscript,
  type SalesChecklistItem, type InsertSalesChecklistItem,
  type CallChecklistStatus, type InsertCallChecklistStatus,
  type CallCoachingPrompt, type InsertCallCoachingPrompt,
  type ExpenseCategory, type InsertExpenseCategory,
  type ReceiptSubmission, type InsertReceiptSubmission,
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

  // Lead Activities
  getLeadActivities(leadId: string): Promise<LeadActivity[]>;
  getLeadActivity(id: string): Promise<LeadActivity | undefined>;
  createLeadActivity(activity: InsertLeadActivity): Promise<LeadActivity>;
  updateLeadActivity(id: string, activity: Partial<InsertLeadActivity>): Promise<LeadActivity | undefined>;
  deleteLeadActivity(id: string): Promise<boolean>;
  getTasksByActivityId(activityId: string): Promise<LeadTask[]>;

  // Lead Tasks
  getLeadTasks(leadId: string): Promise<LeadTask[]>;
  getAllLeadTasks(): Promise<LeadTask[]>;
  getTasksAssignedToUser(userId: string): Promise<LeadTask[]>;
  createLeadTask(task: InsertLeadTask): Promise<LeadTask>;
  updateLeadTask(id: string, task: Partial<InsertLeadTask>): Promise<LeadTask | undefined>;
  deleteLeadTask(id: string): Promise<boolean>;

  // Staff Leave Balances
  getStaffLeaveBalance(userId: string): Promise<StaffLeaveBalance | undefined>;
  createStaffLeaveBalance(balance: InsertStaffLeaveBalance): Promise<StaffLeaveBalance>;
  updateStaffLeaveBalance(userId: string, balance: Partial<InsertStaffLeaveBalance>): Promise<StaffLeaveBalance | undefined>;
  
  // Role-Based KPIs
  getRoleBasedKpis(role: string, userId: string): Promise<{ label: string; value: string | number; trend?: string }[]>;

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
  createDirectJob(data: { clientId: string; jobType: "supply_only" | "supply_install"; siteAddress: string; notes?: string; totalAmount?: number }): Promise<{ lead: Lead; job: Job }>;
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

  // Core Analytics (standardized KPIs)
  getCoreAnalytics(startDate?: Date, endDate?: Date): Promise<CoreAnalytics>;
  getLeadAnalytics(startDate?: Date, endDate?: Date): Promise<LeadAnalytics>;
  getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics>;

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

  // Live Document Templates
  getLiveDocumentTemplate(id: string): Promise<LiveDocumentTemplate | undefined>;
  getLiveDocumentTemplates(): Promise<LiveDocumentTemplate[]>;
  getActiveLiveDocumentTemplates(): Promise<LiveDocumentTemplate[]>;
  getDefaultLiveDocumentTemplate(): Promise<LiveDocumentTemplate | undefined>;
  createLiveDocumentTemplate(template: InsertLiveDocumentTemplate): Promise<LiveDocumentTemplate>;
  updateLiveDocumentTemplate(id: string, template: Partial<InsertLiveDocumentTemplate>): Promise<LiveDocumentTemplate | undefined>;
  deleteLiveDocumentTemplate(id: string): Promise<boolean>;

  // Job Setup Documents
  getJobSetupDocument(id: string): Promise<JobSetupDocument | undefined>;
  getJobSetupDocumentByJob(jobId: string): Promise<JobSetupDocument | undefined>;
  getJobSetupDocumentByLead(leadId: string): Promise<JobSetupDocument | undefined>;
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

  // ============================================
  // DASHBOARD BUILDER
  // ============================================

  // Dashboard Widgets (library)
  getDashboardWidget(id: string): Promise<DashboardWidget | undefined>;
  getDashboardWidgets(): Promise<DashboardWidget[]>;
  getDashboardWidgetsByCategory(category: string): Promise<DashboardWidget[]>;
  getActiveWidgets(): Promise<DashboardWidget[]>;
  createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget>;
  updateDashboardWidget(id: string, widget: Partial<InsertDashboardWidget>): Promise<DashboardWidget | undefined>;

  // Role Dashboard Layouts
  getRoleDashboardLayout(id: string): Promise<RoleDashboardLayout | undefined>;
  getRoleDashboardLayouts(): Promise<RoleDashboardLayout[]>;
  getRoleDashboardLayoutsByRole(role: string): Promise<RoleDashboardLayout[]>;
  getPublishedLayoutForRole(role: string): Promise<RoleDashboardLayout | undefined>;
  getDefaultLayoutForRole(role: string): Promise<RoleDashboardLayout | undefined>;
  createRoleDashboardLayout(layout: InsertRoleDashboardLayout): Promise<RoleDashboardLayout>;
  updateRoleDashboardLayout(id: string, layout: Partial<InsertRoleDashboardLayout>): Promise<RoleDashboardLayout | undefined>;
  deleteRoleDashboardLayout(id: string): Promise<boolean>;
  publishRoleDashboardLayout(id: string): Promise<RoleDashboardLayout | undefined>;

  // Dashboard Widget Instances
  getDashboardWidgetInstance(id: string): Promise<DashboardWidgetInstance | undefined>;
  getDashboardWidgetInstancesByLayout(layoutId: string): Promise<DashboardWidgetInstance[]>;
  createDashboardWidgetInstance(instance: InsertDashboardWidgetInstance): Promise<DashboardWidgetInstance>;
  updateDashboardWidgetInstance(id: string, instance: Partial<InsertDashboardWidgetInstance>): Promise<DashboardWidgetInstance | undefined>;
  deleteDashboardWidgetInstance(id: string): Promise<boolean>;
  deleteDashboardWidgetInstancesByLayout(layoutId: string): Promise<boolean>;
  saveDashboardLayout(layoutId: string, instances: InsertDashboardWidgetInstance[]): Promise<DashboardWidgetInstance[]>;

  // ============================================
  // BANKING / FINANCIAL
  // ============================================

  // Bank Connections
  getBankConnections(): Promise<BankConnection[]>;
  getBankConnectionById(id: string): Promise<BankConnection | undefined>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnection(id: string, connection: Partial<InsertBankConnection>): Promise<BankConnection | undefined>;
  deleteBankConnection(id: string): Promise<boolean>;

  // Bank Accounts
  getBankAccounts(): Promise<BankAccount[]>;
  getBankAccountsByConnection(connectionId: string): Promise<BankAccount[]>;
  getBankAccountById(id: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: string, account: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: string): Promise<boolean>;

  // Bank Transactions
  getBankTransactions(accountId: string, filters?: TransactionFilters): Promise<BankTransaction[]>;
  getAllBankTransactions(filters?: TransactionFilters): Promise<BankTransaction[]>;
  getBankTransactionById(id: string): Promise<BankTransaction | undefined>;
  createBankTransaction(transaction: InsertBankTransaction): Promise<BankTransaction>;
  createBankTransactions(transactions: InsertBankTransaction[]): Promise<BankTransaction[]>;
  updateBankTransaction(id: string, transaction: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined>;
  getTransactionsByStaff(staffId: string, filters?: TransactionFilters): Promise<BankTransaction[]>;
  getStaffTransactionSummary(): Promise<{ staffId: string; staffName: string; totalSpent: number; transactionCount: number }[]>;
  autoAllocateTransactionsByCardNumber(): Promise<number>;

  // Expense Categories
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  getActiveExpenseCategories(): Promise<ExpenseCategory[]>;
  getExpenseCategory(id: string): Promise<ExpenseCategory | undefined>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: string): Promise<boolean>;

  // Receipt Submissions
  getReceiptSubmissions(filters?: { status?: string }): Promise<ReceiptSubmission[]>;
  getReceiptSubmission(id: string): Promise<ReceiptSubmission | undefined>;
  getReceiptSubmissionByToken(token: string): Promise<ReceiptSubmission | undefined>;
  createReceiptSubmission(submission: InsertReceiptSubmission): Promise<ReceiptSubmission>;
  updateReceiptSubmission(id: string, submission: Partial<InsertReceiptSubmission>): Promise<ReceiptSubmission | undefined>;
  deleteReceiptSubmission(id: string): Promise<boolean>;
  getPendingReceipts(): Promise<ReceiptSubmission[]>;
  matchReceiptToTransaction(receiptId: string, transactionId: string, reviewedBy: string): Promise<boolean>;

  // ============================================
  // JOB PIPELINE CONFIGURATION
  // ============================================

  // Job Pipelines
  getJobPipeline(id: string): Promise<JobPipeline | undefined>;
  getJobPipelines(): Promise<JobPipeline[]>;
  getActiveJobPipelines(): Promise<JobPipeline[]>;
  createJobPipeline(pipeline: InsertJobPipeline): Promise<JobPipeline>;
  updateJobPipeline(id: string, pipeline: Partial<InsertJobPipeline>): Promise<JobPipeline | undefined>;
  deleteJobPipeline(id: string): Promise<boolean>;

  // Job Pipeline Stages
  getJobPipelineStage(id: string): Promise<JobPipelineStage | undefined>;
  getJobPipelineStages(pipelineId: string): Promise<JobPipelineStage[]>;
  createJobPipelineStage(stage: InsertJobPipelineStage): Promise<JobPipelineStage>;
  updateJobPipelineStage(id: string, stage: Partial<InsertJobPipelineStage>): Promise<JobPipelineStage | undefined>;
  deleteJobPipelineStage(id: string): Promise<boolean>;
  reorderJobPipelineStages(pipelineId: string, stageIds: string[]): Promise<boolean>;

  // Job Stage Completions
  getJobStageCompletions(jobId: string): Promise<JobStageCompletion[]>;
  toggleJobStageCompletion(jobId: string, stageId: string, userId?: string): Promise<{ completed: boolean }>;

  // Kanban Columns
  getKanbanColumns(): Promise<KanbanColumn[]>;
  getKanbanColumn(id: string): Promise<KanbanColumn | undefined>;
  createKanbanColumn(column: InsertKanbanColumn): Promise<KanbanColumn>;
  updateKanbanColumn(id: string, column: Partial<InsertKanbanColumn>): Promise<KanbanColumn | undefined>;
  deleteKanbanColumn(id: string): Promise<boolean>;
  reorderKanbanColumns(columnIds: string[]): Promise<boolean>;

  // Job Statuses
  getJobStatuses(): Promise<JobStatus[]>;
  getJobStatus(id: string): Promise<JobStatus | undefined>;
  createJobStatus(status: InsertJobStatus): Promise<JobStatus>;
  updateJobStatus(id: string, status: Partial<InsertJobStatus>): Promise<JobStatus | undefined>;
  deleteJobStatus(id: string): Promise<boolean>;
  reorderJobStatuses(statusIds: string[]): Promise<boolean>;

  // Job Status Dependencies
  getStatusDependencies(statusKey: string): Promise<JobStatusDependency[]>;
  getAllStatusDependencies(): Promise<JobStatusDependency[]>;
  setStatusDependencies(statusKey: string, dependencies: { prerequisiteKey: string; dependencyType: string }[]): Promise<boolean>;

  // Production Stages
  getProductionStages(): Promise<ProductionStage[]>;
  getProductionStage(id: string): Promise<ProductionStage | undefined>;
  createProductionStage(stage: InsertProductionStage): Promise<ProductionStage>;
  updateProductionStage(id: string, stage: Partial<InsertProductionStage>): Promise<ProductionStage | undefined>;
  deleteProductionStage(id: string): Promise<boolean>;
  reorderProductionStages(stageIds: string[]): Promise<boolean>;

  // ============================================
  // VOICE CALLS & AI COACHING
  // ============================================

  // Voice Calls
  getVoiceCall(id: string): Promise<VoiceCall | undefined>;
  getVoiceCallBySid(twilioCallSid: string): Promise<VoiceCall | undefined>;
  getVoiceCalls(): Promise<VoiceCall[]>;
  getActiveVoiceCalls(): Promise<VoiceCall[]>;
  getVoiceCallsByStaff(userId: string): Promise<VoiceCall[]>;
  getVoiceCallsByClient(clientId: string): Promise<VoiceCall[]>;
  getVoiceCallsByLead(leadId: string): Promise<VoiceCall[]>;
  createVoiceCall(call: InsertVoiceCall): Promise<VoiceCall>;
  updateVoiceCall(id: string, call: Partial<InsertVoiceCall>): Promise<VoiceCall | undefined>;

  // Call Transcripts
  getCallTranscripts(callId: string): Promise<CallTranscript[]>;
  createCallTranscript(transcript: InsertCallTranscript): Promise<CallTranscript>;
  createCallTranscripts(transcripts: InsertCallTranscript[]): Promise<CallTranscript[]>;

  // Sales Checklist Items
  getSalesChecklistItem(id: string): Promise<SalesChecklistItem | undefined>;
  getSalesChecklistItems(): Promise<SalesChecklistItem[]>;
  getActiveSalesChecklistItems(): Promise<SalesChecklistItem[]>;
  createSalesChecklistItem(item: InsertSalesChecklistItem): Promise<SalesChecklistItem>;
  updateSalesChecklistItem(id: string, item: Partial<InsertSalesChecklistItem>): Promise<SalesChecklistItem | undefined>;
  deleteSalesChecklistItem(id: string): Promise<boolean>;
  reorderSalesChecklistItems(itemIds: string[]): Promise<boolean>;

  // Call Checklist Status
  getCallChecklistStatus(callId: string): Promise<CallChecklistStatus[]>;
  initializeCallChecklistStatus(callId: string): Promise<CallChecklistStatus[]>;
  updateCallChecklistItemStatus(callId: string, checklistItemId: string, isCovered: boolean, detectedText?: string): Promise<CallChecklistStatus | undefined>;

  // Call Coaching Prompts
  getCallCoachingPrompts(callId: string): Promise<CallCoachingPrompt[]>;
  createCallCoachingPrompt(prompt: InsertCallCoachingPrompt): Promise<CallCoachingPrompt>;
  acknowledgeCallCoachingPrompt(id: string): Promise<CallCoachingPrompt | undefined>;
}

export interface TransactionFilters {
  fromDate?: string;
  toDate?: string;
  category?: string;
  direction?: "credit" | "debit";
  limit?: number;
  offset?: number;
  search?: string;
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
  pipelineValue: number;
  wonValue: number;
}

// ============================================
// CORE ANALYTICS INTERFACES
// ============================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface LeadAnalytics {
  newLeads: number;
  totalActiveLeads: number;
  leadsByStage: { stage: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  averageTimeToFirstResponse: number | null; // in hours
  averageTimeToQuote: number | null; // in hours
  averageTimeToClose: number | null; // in days
  leadsByAssignee: { userId: string; userName: string; count: number }[];
}

export interface SalesAnalytics {
  pendingQuotes: number;
  quoteConversionRate: number; // Won Leads ÷ Leads that received quotes
  averageDealSize: number; // Mean value of accepted quotes
  quotePipelineValue: number; // Sum of sent quotes
  monthlyRevenue: number; // Sum of paid invoices
  yearToDateRevenue: number;
  wonValue: number; // Value of won quotes in period
  lostValue: number; // Value of lost quotes in period
}

export interface CoreAnalytics {
  leads: LeadAnalytics;
  sales: SalesAnalytics;
  dateRange: DateRange;
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

  async checkClientDuplicates(name?: string, email?: string, phone?: string): Promise<Client[]> {
    const conditions = [];
    
    if (name && name.trim()) {
      conditions.push(ilike(clients.name, `%${name.trim()}%`));
    }
    if (email && email.trim()) {
      conditions.push(ilike(clients.email, `%${email.trim()}%`));
    }
    if (phone && phone.trim()) {
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length >= 6) {
        conditions.push(sql`REPLACE(REPLACE(REPLACE(${clients.phone}, ' ', ''), '-', ''), '+', '') LIKE ${'%' + normalizedPhone + '%'}`);
      }
    }
    
    if (conditions.length === 0) {
      return [];
    }
    
    return db.select().from(clients).where(or(...conditions)).limit(5);
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
        ilike(clients.name, `%${query}%`),
        ilike(clients.email, `%${query}%`),
        ilike(clients.phone, `%${query}%`),
        ilike(clients.address, `%${query}%`)
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
    const now = new Date();
    
    // Set analytics timestamps based on initial stage
    const leadData: any = {
      ...lead,
      leadNumber,
    };
    
    // If lead is created in a stage past 'new', set timestamps appropriately
    if (lead.stage && lead.stage !== 'new') {
      leadData.firstResponseAt = now;
    }
    if (lead.stage === 'quote_sent' || lead.stage === 'follow_up') {
      leadData.quoteSentAt = now;
    }
    if (lead.stage === 'won') {
      leadData.wonAt = now;
    }
    if (lead.stage === 'lost') {
      leadData.lostAt = now;
    }
    
    const [created] = await db.insert(leads).values(leadData).returning();
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
    const now = new Date();
    const updateData: Partial<InsertLead> & { updatedAt: Date } = {
      ...lead,
      updatedAt: now,
    };

    // Auto-populate analytics timestamps based on stage transitions
    if (lead.stage) {
      // Get current lead to check for stage changes
      const currentLead = await this.getLead(id);
      if (currentLead) {
        const oldStage = currentLead.stage;
        const newStage = lead.stage;

        // First response: when lead moves from 'new' to any other stage
        if (oldStage === 'new' && newStage !== 'new' && !currentLead.firstResponseAt) {
          (updateData as any).firstResponseAt = now;
        }

        // Quote sent: when lead moves to 'quote_sent' stage
        if (newStage === 'quote_sent' && !currentLead.quoteSentAt) {
          (updateData as any).quoteSentAt = now;
        }

        // Won: when lead moves to 'won' stage
        if (newStage === 'won' && !currentLead.wonAt) {
          (updateData as any).wonAt = now;
        }

        // Lost: when lead moves to 'lost' stage
        if (newStage === 'lost' && !currentLead.lostAt) {
          (updateData as any).lostAt = now;
        }
      }
    }

    const [updated] = await db.update(leads).set(updateData).where(eq(leads.id, id)).returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  async searchLeads(query: string): Promise<Lead[]> {
    return db.select().from(leads).where(
      or(
        ilike(leads.leadNumber, `%${query}%`),
        ilike(leads.description, `%${query}%`),
        ilike(leads.siteAddress, `%${query}%`),
        ilike(leads.fenceStyle, `%${query}%`)
      )
    );
  }

  // Lead Activities
  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    return db.select().from(leadActivities)
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(desc(leadActivities.createdAt));
  }

  async getLeadActivity(id: string): Promise<LeadActivity | undefined> {
    const [activity] = await db.select().from(leadActivities).where(eq(leadActivities.id, id));
    return activity;
  }

  async createLeadActivity(activity: InsertLeadActivity): Promise<LeadActivity> {
    const [newActivity] = await db.insert(leadActivities).values(activity).returning();
    return newActivity;
  }

  async updateLeadActivity(id: string, activity: Partial<InsertLeadActivity>): Promise<LeadActivity | undefined> {
    const [updated] = await db.update(leadActivities)
      .set(activity)
      .where(eq(leadActivities.id, id))
      .returning();
    return updated;
  }

  async deleteLeadActivity(id: string): Promise<boolean> {
    await db.delete(leadActivities).where(eq(leadActivities.id, id));
    return true;
  }

  async getTasksByActivityId(activityId: string): Promise<LeadTask[]> {
    return db.select().from(leadTasks)
      .where(eq(leadTasks.sourceActivityId, activityId))
      .orderBy(desc(leadTasks.createdAt));
  }

  // Lead Tasks
  async getLeadTasks(leadId: string): Promise<LeadTask[]> {
    return db.select().from(leadTasks)
      .where(eq(leadTasks.leadId, leadId))
      .orderBy(desc(leadTasks.createdAt));
  }

  async getAllLeadTasks(): Promise<LeadTask[]> {
    return db.select().from(leadTasks).orderBy(desc(leadTasks.createdAt));
  }

  async createLeadTask(task: InsertLeadTask): Promise<LeadTask> {
    const [newTask] = await db.insert(leadTasks).values(task).returning();
    return newTask;
  }

  async updateLeadTask(id: string, task: Partial<InsertLeadTask>): Promise<LeadTask | undefined> {
    const [updatedTask] = await db.update(leadTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(leadTasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteLeadTask(id: string): Promise<boolean> {
    const result = await db.delete(leadTasks).where(eq(leadTasks.id, id));
    return true;
  }

  async getTasksAssignedToUser(userId: string): Promise<LeadTask[]> {
    return db.select().from(leadTasks)
      .where(eq(leadTasks.assignedTo, userId))
      .orderBy(desc(leadTasks.dueDate));
  }

  // Staff Leave Balances
  async getStaffLeaveBalance(userId: string): Promise<StaffLeaveBalance | undefined> {
    const [balance] = await db.select().from(staffLeaveBalances)
      .where(eq(staffLeaveBalances.userId, userId));
    return balance;
  }

  async createStaffLeaveBalance(balance: InsertStaffLeaveBalance): Promise<StaffLeaveBalance> {
    const [newBalance] = await db.insert(staffLeaveBalances).values(balance).returning();
    return newBalance;
  }

  async updateStaffLeaveBalance(userId: string, balance: Partial<InsertStaffLeaveBalance>): Promise<StaffLeaveBalance | undefined> {
    const [updated] = await db.update(staffLeaveBalances)
      .set({ ...balance, updatedAt: new Date() })
      .where(eq(staffLeaveBalances.userId, userId))
      .returning();
    return updated;
  }
  
  // Role-Based KPIs
  async getRoleBasedKpis(role: string, userId: string): Promise<{ label: string; value: string | number; trend?: string }[]> {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    // Define active job statuses (in manufacturing or installation phases)
    const activeJobStatuses = [
      'ready_for_production', 'manufacturing_posts', 'manufacturing_panels', 
      'manufacturing_gates', 'qa_check', 'ready_for_scheduling', 'scheduled',
      'install_posts', 'install_panels', 'install_gates'
    ];
    
    // Jobs waiting for scheduling
    const pendingSchedulingStatuses = ['ready_for_scheduling'];
    
    // Jobs in installation phase
    const installPhaseStatuses = ['install_posts', 'install_panels', 'install_gates'];
    
    // Completed job statuses
    const completedJobStatuses = ['install_complete', 'paid_in_full', 'archived'];
    
    switch (role) {
      case 'admin': {
        const [allLeads, allQuotes, allJobs, activeJobs] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(leads).where(gte(leads.createdAt, thisMonthStart)),
          db.select({ count: sql<number>`count(*)` }).from(quotes).where(gte(quotes.createdAt, thisMonthStart)),
          db.select({ count: sql<number>`count(*)` }).from(jobs).where(gte(jobs.createdAt, thisMonthStart)),
          db.select({ count: sql<number>`count(*)` }).from(jobs).where(
            sql`${jobs.status} IN (${sql.join(activeJobStatuses.map(s => sql`${s}`), sql`, `)})`
          ),
        ]);
        return [
          { label: "Leads This Month", value: Number(allLeads[0]?.count || 0), trend: "+12%" },
          { label: "Quotes Created", value: Number(allQuotes[0]?.count || 0), trend: "+8%" },
          { label: "Jobs Created", value: Number(allJobs[0]?.count || 0), trend: "+15%" },
          { label: "Active Jobs", value: Number(activeJobs[0]?.count || 0) },
        ];
      }
      case 'sales': {
        const [myLeads, myQuotes, convertedQuotes] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(leads).where(
            and(eq(leads.assignedTo, userId), gte(leads.createdAt, thisMonthStart))
          ),
          db.select({ count: sql<number>`count(*)` }).from(quotes).where(gte(quotes.createdAt, thisMonthStart)),
          db.select({ count: sql<number>`count(*)` }).from(quotes).where(
            and(eq(quotes.status, 'approved'), gte(quotes.createdAt, thisMonthStart))
          ),
        ]);
        const conversionRate = Number(myQuotes[0]?.count || 0) > 0 
          ? Math.round((Number(convertedQuotes[0]?.count || 0) / Number(myQuotes[0]?.count || 1)) * 100) 
          : 0;
        return [
          { label: "My Active Leads", value: Number(myLeads[0]?.count || 0), trend: "+5%" },
          { label: "Quotes This Month", value: Number(myQuotes[0]?.count || 0), trend: "+10%" },
          { label: "Conversion Rate", value: `${conversionRate}%` },
        ];
      }
      case 'scheduler': {
        const [scheduledThisWeek, unscheduledJobs] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(scheduleEvents).where(
            gte(scheduleEvents.startDate, thisWeekStart)
          ),
          db.select({ count: sql<number>`count(*)` }).from(jobs).where(
            eq(jobs.status, 'ready_for_scheduling')
          ),
        ]);
        return [
          { label: "Scheduled This Week", value: Number(scheduledThisWeek[0]?.count || 0) },
          { label: "Pending Scheduling", value: Number(unscheduledJobs[0]?.count || 0) },
        ];
      }
      case 'production_manager': {
        const [activeTasks, completedTasks] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(productionTasks).where(
            ne(productionTasks.status, 'completed')
          ),
          db.select({ count: sql<number>`count(*)` }).from(productionTasks).where(
            and(eq(productionTasks.status, 'completed'), gte(productionTasks.endTime, thisWeekStart))
          ),
        ]);
        return [
          { label: "Active Production Tasks", value: Number(activeTasks[0]?.count || 0) },
          { label: "Completed This Week", value: Number(completedTasks[0]?.count || 0), trend: "+20%" },
        ];
      }
      case 'warehouse': {
        const [lowStockItems] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(products).where(
            sql`${products.stockOnHand}::int <= ${products.reorderPoint}::int`
          ),
        ]);
        return [
          { label: "Low Stock Items", value: Number(lowStockItems[0]?.count || 0) },
          { label: "Pending Shipments", value: 0 },
        ];
      }
      case 'installer': {
        const [myActiveJobs, completedJobs] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(jobs).where(
            and(
              eq(jobs.assignedInstaller, userId),
              sql`${jobs.status} IN (${sql.join(installPhaseStatuses.map(s => sql`${s}`), sql`, `)})`
            )
          ),
          db.select({ count: sql<number>`count(*)` }).from(jobs).where(
            and(
              eq(jobs.assignedInstaller, userId),
              eq(jobs.status, 'install_complete'),
              gte(jobs.updatedAt, thisMonthStart)
            )
          ),
        ]);
        return [
          { label: "My Active Installs", value: Number(myActiveJobs[0]?.count || 0) },
          { label: "Completed This Month", value: Number(completedJobs[0]?.count || 0), trend: "+3" },
        ];
      }
      case 'trade_client': {
        const [myQuotes, myActiveJobs] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(quotes).where(gte(quotes.createdAt, thisMonthStart)),
          db.select({ count: sql<number>`count(*)` }).from(jobs).where(
            sql`${jobs.status} IN (${sql.join(activeJobStatuses.map(s => sql`${s}`), sql`, `)})`
          ),
        ]);
        return [
          { label: "My Quotes", value: Number(myQuotes[0]?.count || 0) },
          { label: "Active Orders", value: Number(myActiveJobs[0]?.count || 0) },
        ];
      }
      default:
        return [
          { label: "No KPIs available", value: "-" },
        ];
    }
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
    const existingQuotes = await db.select({ quoteNumber: quotes.quoteNumber })
      .from(quotes)
      .where(like(quotes.quoteNumber, `${prefix}%`));
    
    let maxSeq = 0;
    for (const q of existingQuotes) {
      const match = q.quoteNumber.match(/-Q(\d+)$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
    
    return `${prefix}${maxSeq + 1}`;
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
        ilike(quotes.quoteNumber, `%${query}%`),
        ilike(quotes.siteAddress, `%${query}%`)
      )
    );
  }

  async setPrimaryQuote(quoteId: string): Promise<{ quote: Quote; lead: Lead }> {
    const quote = await this.getQuote(quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }
    if (!quote.leadId) {
      throw new Error("Quote must be associated with a lead to be set as primary");
    }

    await db.update(quotes)
      .set({ isPrimary: false } as any)
      .where(eq(quotes.leadId, quote.leadId));

    const [updatedQuote] = await db.update(quotes)
      .set({ isPrimary: true } as any)
      .where(eq(quotes.id, quoteId))
      .returning();

    // Safely parse opportunity value to ensure numeric consistency
    const opportunityValue = quote.totalAmount ? String(parseFloat(quote.totalAmount) || 0) : "0";

    const [updatedLead] = await db.update(leads)
      .set({
        primaryQuoteId: quoteId,
        opportunityValue: opportunityValue,
        updatedAt: new Date(),
      } as any)
      .where(eq(leads.id, quote.leadId))
      .returning();

    return { quote: updatedQuote, lead: updatedLead };
  }

  async acceptQuote(quoteId: string): Promise<{ quote: Quote; lead: Lead; job: Job }> {
    const quote = await this.getQuote(quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }
    if (!quote.leadId) {
      throw new Error("Quote must be associated with a lead to be accepted");
    }

    const lead = await this.getLead(quote.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await db.update(quotes)
      .set({ isPrimary: false, status: "rejected" } as any)
      .where(and(
        eq(quotes.leadId, quote.leadId),
        ne(quotes.id, quoteId)
      ));

    const [updatedQuote] = await db.update(quotes)
      .set({ 
        isPrimary: true, 
        status: "approved",
        approvedAt: new Date()
      } as any)
      .where(eq(quotes.id, quoteId))
      .returning();

    // Safely parse values to prevent NaN
    const totalAmount = parseFloat(quote.totalAmount) || 0;
    const depositRequired = parseFloat(quote.depositRequired || "0") || 0;
    const opportunityValue = String(totalAmount);
    const balanceDue = String(totalAmount - depositRequired);

    const now = new Date();
    const [updatedLead] = await db.update(leads)
      .set({
        primaryQuoteId: quoteId,
        opportunityValue: opportunityValue,
        stage: "won",
        wonAt: now, // Set analytics timestamp when lead is won
        updatedAt: now,
      } as any)
      .where(eq(leads.id, quote.leadId))
      .returning();

    // Create job with awaiting_deposit status to align with existing workflow
    const job = await this.createJob({
      clientId: quote.clientId,
      quoteId: quoteId,
      jobType: lead.jobFulfillmentType || "supply_install",
      siteAddress: quote.siteAddress || lead.siteAddress || "",
      fenceStyle: lead.fenceStyle || "Standard",
      totalAmount: String(totalAmount),
      depositAmount: String(depositRequired),
      balanceDue: balanceDue,
      status: "awaiting_deposit",
    });

    return { quote: updatedQuote, lead: updatedLead, job };
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
        const baseJobNumber = `${lead.leadNumber}-JOB`;
        const baseInvoiceNumber = `${lead.leadNumber}-INV`;
        
        const existingJob = await this.getJobByNumber(baseJobNumber);
        if (existingJob) {
          const existingJobs = await db.select({ jobNumber: jobs.jobNumber })
            .from(jobs)
            .where(like(jobs.jobNumber, `${lead.leadNumber}-JOB%`));
          
          let maxSuffix = 0;
          for (const j of existingJobs) {
            const match = j.jobNumber.match(/-JOB(\d+)?$/);
            if (match) {
              const suffix = match[1] ? parseInt(match[1], 10) : 1;
              if (suffix > maxSuffix) maxSuffix = suffix;
            }
          }
          jobNumber = `${lead.leadNumber}-JOB${maxSuffix + 1}`;
          invoiceNumber = `${lead.leadNumber}-INV${maxSuffix + 1}`;
        } else {
          jobNumber = baseJobNumber;
          invoiceNumber = baseInvoiceNumber;
        }
      }
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
        ilike(jobs.jobNumber, `%${query}%`),
        ilike(jobs.siteAddress, `%${query}%`),
        ilike(jobs.fenceStyle, `%${query}%`)
      )
    );
  }

  async deleteJob(id: string): Promise<boolean> {
    await db.delete(jobs).where(eq(jobs.id, id));
    return true;
  }

  async createDirectJob(data: { clientId: string; jobType: "supply_only" | "supply_install"; siteAddress: string; notes?: string; totalAmount?: number }): Promise<{ lead: Lead; job: Job }> {
    const client = await this.getClient(data.clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    const lead = await this.createLead({
      clientId: data.clientId,
      source: "direct_job",
      stage: "won",
      jobFulfillmentType: data.jobType,
      siteAddress: data.siteAddress,
      notes: data.notes || "Created via Direct Job",
      expectedValue: data.totalAmount ? String(data.totalAmount) : undefined,
    });

    const job = await this.createJob({
      clientId: data.clientId,
      jobType: data.jobType,
      siteAddress: data.siteAddress,
      fenceStyle: "Standard",
      notes: data.notes,
      totalAmount: data.totalAmount ? String(data.totalAmount) : "0",
      depositAmount: "0",
      balanceDue: data.totalAmount ? String(data.totalAmount) : "0",
      status: "accepted",
      leadId: lead.id,
    } as any);

    return { lead, job };
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

    // Calculate pipeline value from leads' opportunity_value (for forecasting)
    // Pipeline = leads that are not won/lost (active opportunities only)
    const allLeads = await db.select().from(leads);
    const activeLeadStages = ['new', 'contacted', 'needs_quote', 'quote_sent', 'follow_up'];
    // Exclude lost leads from pipeline - only active leads with opportunity value
    const pipelineValue = allLeads
      .filter(l => activeLeadStages.includes(l.stage))
      .reduce((sum, l) => {
        const value = parseFloat((l as any).opportunityValue) || 0;
        return sum + value;
      }, 0);
    
    // Won value = opportunity_value of leads that are won (for actual converted revenue)
    const wonValue = allLeads
      .filter(l => l.stage === 'won')
      .reduce((sum, l) => {
        const value = parseFloat((l as any).opportunityValue) || 0;
        return sum + value;
      }, 0);

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
      pipelineValue,
      wonValue,
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
  // LIVE DOCUMENT TEMPLATES
  // ============================================

  async getLiveDocumentTemplate(id: string): Promise<LiveDocumentTemplate | undefined> {
    const [template] = await db.select().from(liveDocumentTemplates).where(eq(liveDocumentTemplates.id, id));
    return template;
  }

  async getLiveDocumentTemplates(): Promise<LiveDocumentTemplate[]> {
    return db.select().from(liveDocumentTemplates).orderBy(desc(liveDocumentTemplates.createdAt));
  }

  async getActiveLiveDocumentTemplates(): Promise<LiveDocumentTemplate[]> {
    return db.select().from(liveDocumentTemplates)
      .where(eq(liveDocumentTemplates.isActive, true))
      .orderBy(desc(liveDocumentTemplates.createdAt));
  }

  async getDefaultLiveDocumentTemplate(): Promise<LiveDocumentTemplate | undefined> {
    const [template] = await db.select().from(liveDocumentTemplates)
      .where(and(
        eq(liveDocumentTemplates.isDefault, true),
        eq(liveDocumentTemplates.isActive, true)
      ));
    return template;
  }

  async createLiveDocumentTemplate(template: InsertLiveDocumentTemplate): Promise<LiveDocumentTemplate> {
    // If this template is being set as default, unset other defaults
    if (template.isDefault) {
      await db.update(liveDocumentTemplates).set({ isDefault: false });
    }
    const [created] = await db.insert(liveDocumentTemplates).values(template as any).returning();
    return created;
  }

  async updateLiveDocumentTemplate(id: string, template: Partial<InsertLiveDocumentTemplate>): Promise<LiveDocumentTemplate | undefined> {
    // If setting this as default, unset other defaults first
    if (template.isDefault) {
      await db.update(liveDocumentTemplates).set({ isDefault: false }).where(sql`id != ${id}`);
    }
    const [updated] = await db.update(liveDocumentTemplates)
      .set({ ...template, updatedAt: new Date() } as any)
      .where(eq(liveDocumentTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteLiveDocumentTemplate(id: string): Promise<boolean> {
    const result = await db.delete(liveDocumentTemplates).where(eq(liveDocumentTemplates.id, id));
    return true;
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

  async getJobSetupDocumentByLead(leadId: string): Promise<JobSetupDocument | undefined> {
    const [document] = await db.select().from(jobSetupDocuments).where(eq(jobSetupDocuments.leadId, leadId));
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

  // ============================================
  // DASHBOARD BUILDER IMPLEMENTATIONS
  // ============================================

  // Dashboard Widgets (library)
  async getDashboardWidget(id: string): Promise<DashboardWidget | undefined> {
    const [widget] = await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.id, id));
    return widget;
  }

  async getDashboardWidgets(): Promise<DashboardWidget[]> {
    return db.select().from(dashboardWidgets).orderBy(dashboardWidgets.category, dashboardWidgets.name);
  }

  async getDashboardWidgetsByCategory(category: string): Promise<DashboardWidget[]> {
    return db.select().from(dashboardWidgets).where(eq(dashboardWidgets.category, category as any));
  }

  async getActiveWidgets(): Promise<DashboardWidget[]> {
    return db.select().from(dashboardWidgets).where(eq(dashboardWidgets.isActive, true)).orderBy(dashboardWidgets.category, dashboardWidgets.name);
  }

  async createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget> {
    const [created] = await db.insert(dashboardWidgets).values(widget).returning();
    return created;
  }

  async updateDashboardWidget(id: string, widget: Partial<InsertDashboardWidget>): Promise<DashboardWidget | undefined> {
    const [updated] = await db.update(dashboardWidgets)
      .set(widget)
      .where(eq(dashboardWidgets.id, id))
      .returning();
    return updated;
  }

  // Role Dashboard Layouts
  async getRoleDashboardLayout(id: string): Promise<RoleDashboardLayout | undefined> {
    const [layout] = await db.select().from(roleDashboardLayouts).where(eq(roleDashboardLayouts.id, id));
    return layout;
  }

  async getRoleDashboardLayouts(): Promise<RoleDashboardLayout[]> {
    return db.select().from(roleDashboardLayouts).orderBy(roleDashboardLayouts.role, roleDashboardLayouts.name);
  }

  async getRoleDashboardLayoutsByRole(role: string): Promise<RoleDashboardLayout[]> {
    return db.select().from(roleDashboardLayouts).where(eq(roleDashboardLayouts.role, role as any));
  }

  async getPublishedLayoutForRole(role: string): Promise<RoleDashboardLayout | undefined> {
    const [layout] = await db.select().from(roleDashboardLayouts)
      .where(and(
        eq(roleDashboardLayouts.role, role as any),
        eq(roleDashboardLayouts.isPublished, true),
        eq(roleDashboardLayouts.isDefault, true)
      ));
    return layout;
  }

  async getDefaultLayoutForRole(role: string): Promise<RoleDashboardLayout | undefined> {
    const [layout] = await db.select().from(roleDashboardLayouts)
      .where(and(
        eq(roleDashboardLayouts.role, role as any),
        eq(roleDashboardLayouts.isDefault, true)
      ));
    return layout;
  }

  async createRoleDashboardLayout(layout: InsertRoleDashboardLayout): Promise<RoleDashboardLayout> {
    const [created] = await db.insert(roleDashboardLayouts).values(layout).returning();
    return created;
  }

  async updateRoleDashboardLayout(id: string, layout: Partial<InsertRoleDashboardLayout>): Promise<RoleDashboardLayout | undefined> {
    const [updated] = await db.update(roleDashboardLayouts)
      .set({ ...layout, updatedAt: new Date() })
      .where(eq(roleDashboardLayouts.id, id))
      .returning();
    return updated;
  }

  async deleteRoleDashboardLayout(id: string): Promise<boolean> {
    const result = await db.delete(roleDashboardLayouts).where(eq(roleDashboardLayouts.id, id)).returning();
    return result.length > 0;
  }

  async publishRoleDashboardLayout(id: string): Promise<RoleDashboardLayout | undefined> {
    // First get the layout to find its role
    const layout = await this.getRoleDashboardLayout(id);
    if (!layout) return undefined;

    // Unpublish any existing published layouts for this role
    await db.update(roleDashboardLayouts)
      .set({ isPublished: false, isDefault: false })
      .where(and(
        eq(roleDashboardLayouts.role, layout.role),
        eq(roleDashboardLayouts.isPublished, true)
      ));

    // Publish this layout
    const [updated] = await db.update(roleDashboardLayouts)
      .set({ isPublished: true, isDefault: true, updatedAt: new Date() })
      .where(eq(roleDashboardLayouts.id, id))
      .returning();
    return updated;
  }

  // Dashboard Widget Instances
  async getDashboardWidgetInstance(id: string): Promise<DashboardWidgetInstance | undefined> {
    const [instance] = await db.select().from(dashboardWidgetInstances).where(eq(dashboardWidgetInstances.id, id));
    return instance;
  }

  async getDashboardWidgetInstancesByLayout(layoutId: string): Promise<DashboardWidgetInstance[]> {
    return db.select().from(dashboardWidgetInstances)
      .where(eq(dashboardWidgetInstances.layoutId, layoutId))
      .orderBy(dashboardWidgetInstances.positionY, dashboardWidgetInstances.positionX);
  }

  async createDashboardWidgetInstance(instance: InsertDashboardWidgetInstance): Promise<DashboardWidgetInstance> {
    const [created] = await db.insert(dashboardWidgetInstances).values(instance).returning();
    return created;
  }

  async updateDashboardWidgetInstance(id: string, instance: Partial<InsertDashboardWidgetInstance>): Promise<DashboardWidgetInstance | undefined> {
    const [updated] = await db.update(dashboardWidgetInstances)
      .set(instance)
      .where(eq(dashboardWidgetInstances.id, id))
      .returning();
    return updated;
  }

  async deleteDashboardWidgetInstance(id: string): Promise<boolean> {
    const result = await db.delete(dashboardWidgetInstances).where(eq(dashboardWidgetInstances.id, id)).returning();
    return result.length > 0;
  }

  async deleteDashboardWidgetInstancesByLayout(layoutId: string): Promise<boolean> {
    await db.delete(dashboardWidgetInstances).where(eq(dashboardWidgetInstances.layoutId, layoutId));
    return true;
  }

  async saveDashboardLayout(layoutId: string, instances: InsertDashboardWidgetInstance[]): Promise<DashboardWidgetInstance[]> {
    // Delete existing instances for this layout
    await this.deleteDashboardWidgetInstancesByLayout(layoutId);

    // Insert new instances
    if (instances.length === 0) return [];
    
    const result = await db.insert(dashboardWidgetInstances)
      .values(instances.map(i => ({ ...i, layoutId })))
      .returning();
    return result;
  }

  // ============================================
  // BANKING / FINANCIAL
  // ============================================

  // Bank Connections
  async getBankConnections(): Promise<BankConnection[]> {
    return db.select().from(bankConnections).orderBy(desc(bankConnections.createdAt));
  }

  async getBankConnectionById(id: string): Promise<BankConnection | undefined> {
    const [connection] = await db.select().from(bankConnections).where(eq(bankConnections.id, id));
    return connection;
  }

  async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> {
    const [created] = await db.insert(bankConnections).values(connection).returning();
    return created;
  }

  async updateBankConnection(id: string, connection: Partial<InsertBankConnection>): Promise<BankConnection | undefined> {
    const [updated] = await db.update(bankConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(bankConnections.id, id))
      .returning();
    return updated;
  }

  async deleteBankConnection(id: string): Promise<boolean> {
    const result = await db.delete(bankConnections).where(eq(bankConnections.id, id)).returning();
    return result.length > 0;
  }

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return db.select().from(bankAccounts).where(eq(bankAccounts.isActive, true)).orderBy(bankAccounts.name);
  }

  async getBankAccountsByConnection(connectionId: string): Promise<BankAccount[]> {
    return db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.connectionId, connectionId), eq(bankAccounts.isActive, true)))
      .orderBy(bankAccounts.name);
  }

  async getBankAccountById(id: string): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account;
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const [created] = await db.insert(bankAccounts).values(account).returning();
    return created;
  }

  async updateBankAccount(id: string, account: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [updated] = await db.update(bankAccounts)
      .set(account)
      .where(eq(bankAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteBankAccount(id: string): Promise<boolean> {
    const result = await db.delete(bankAccounts).where(eq(bankAccounts.id, id)).returning();
    return result.length > 0;
  }

  // Bank Transactions
  async getBankTransactions(accountId: string, filters?: TransactionFilters): Promise<BankTransaction[]> {
    const conditions = [eq(bankTransactions.accountId, accountId)];
    
    if (filters?.fromDate) {
      conditions.push(gte(bankTransactions.postDate, new Date(filters.fromDate)));
    }
    if (filters?.toDate) {
      conditions.push(lte(bankTransactions.postDate, new Date(filters.toDate)));
    }
    if (filters?.category) {
      conditions.push(eq(bankTransactions.category, filters.category));
    }
    if (filters?.direction) {
      conditions.push(eq(bankTransactions.direction, filters.direction));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(bankTransactions.description, `%${filters.search}%`),
        ilike(bankTransactions.merchantName, `%${filters.search}%`)
      )!);
    }

    let query = db.select().from(bankTransactions)
      .where(and(...conditions))
      .orderBy(desc(bankTransactions.postDate));
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return query;
  }

  async getAllBankTransactions(filters?: TransactionFilters): Promise<BankTransaction[]> {
    const conditions: any[] = [];
    
    if (filters?.fromDate) {
      conditions.push(gte(bankTransactions.postDate, new Date(filters.fromDate)));
    }
    if (filters?.toDate) {
      conditions.push(lte(bankTransactions.postDate, new Date(filters.toDate)));
    }
    if (filters?.category) {
      conditions.push(eq(bankTransactions.category, filters.category));
    }
    if (filters?.direction) {
      conditions.push(eq(bankTransactions.direction, filters.direction));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(bankTransactions.description, `%${filters.search}%`),
        ilike(bankTransactions.merchantName, `%${filters.search}%`)
      ));
    }

    let query = conditions.length > 0 
      ? db.select().from(bankTransactions).where(and(...conditions)).orderBy(desc(bankTransactions.postDate))
      : db.select().from(bankTransactions).orderBy(desc(bankTransactions.postDate));
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return query;
  }

  async getBankTransactionById(id: string): Promise<BankTransaction | undefined> {
    const [transaction] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, id));
    return transaction;
  }

  async createBankTransaction(transaction: InsertBankTransaction): Promise<BankTransaction> {
    const [created] = await db.insert(bankTransactions).values(transaction).returning();
    return created;
  }

  async createBankTransactions(transactions: InsertBankTransaction[]): Promise<BankTransaction[]> {
    if (transactions.length === 0) return [];
    const result = await db.insert(bankTransactions).values(transactions).returning();
    return result;
  }

  async updateBankTransaction(id: string, transaction: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined> {
    const [updated] = await db.update(bankTransactions)
      .set(transaction)
      .where(eq(bankTransactions.id, id))
      .returning();
    return updated;
  }

  async getTransactionsByStaff(staffId: string, filters?: TransactionFilters): Promise<BankTransaction[]> {
    const conditions: any[] = [eq(bankTransactions.allocatedStaffId, staffId)];
    
    if (filters?.fromDate) {
      conditions.push(gte(bankTransactions.postDate, new Date(filters.fromDate)));
    }
    if (filters?.toDate) {
      conditions.push(lte(bankTransactions.postDate, new Date(filters.toDate)));
    }
    if (filters?.category) {
      conditions.push(eq(bankTransactions.expenseCategoryId, filters.category));
    }
    if (filters?.direction) {
      conditions.push(eq(bankTransactions.direction, filters.direction));
    }

    return db.select().from(bankTransactions)
      .where(and(...conditions))
      .orderBy(desc(bankTransactions.postDate))
      .limit(filters?.limit || 100);
  }

  async getStaffTransactionSummary(): Promise<{ staffId: string; staffName: string; totalSpent: number; transactionCount: number }[]> {
    const result = await db.select({
      staffId: bankTransactions.allocatedStaffId,
      totalSpent: sql<string>`COALESCE(SUM(CASE WHEN ${bankTransactions.direction} = 'debit' THEN ABS(${bankTransactions.amount}::numeric) ELSE 0 END), 0)`,
      transactionCount: sql<string>`COUNT(*)`,
    })
    .from(bankTransactions)
    .where(isNotNull(bankTransactions.allocatedStaffId))
    .groupBy(bankTransactions.allocatedStaffId);

    const staffIds = result.map(r => r.staffId).filter(Boolean) as string[];
    if (staffIds.length === 0) return [];

    const staffUsers = await db.select().from(users).where(inArray(users.id, staffIds));
    const staffMap = new Map(staffUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    return result.map(r => ({
      staffId: r.staffId!,
      staffName: staffMap.get(r.staffId!) || 'Unknown',
      totalSpent: parseFloat(r.totalSpent) || 0,
      transactionCount: parseInt(r.transactionCount) || 0,
    }));
  }

  async autoAllocateTransactionsByCardNumber(): Promise<number> {
    const staffWithCards = await db.select().from(users).where(isNotNull(users.bankCardNumber));
    if (staffWithCards.length === 0) return 0;

    let allocated = 0;
    for (const staff of staffWithCards) {
      if (!staff.bankCardNumber) continue;
      
      const result = await db.update(bankTransactions)
        .set({ 
          allocatedStaffId: staff.id,
          cardNumberUsed: staff.bankCardNumber 
        })
        .where(and(
          isNull(bankTransactions.allocatedStaffId),
          ilike(bankTransactions.description, `%${staff.bankCardNumber}%`)
        ))
        .returning();
      
      allocated += result.length;
    }
    return allocated;
  }

  // Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return db.select().from(expenseCategories).orderBy(expenseCategories.sortOrder);
  }

  async getActiveExpenseCategories(): Promise<ExpenseCategory[]> {
    return db.select().from(expenseCategories)
      .where(eq(expenseCategories.isActive, true))
      .orderBy(expenseCategories.sortOrder);
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
    return category;
  }

  async createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [created] = await db.insert(expenseCategories).values(category).returning();
    return created;
  }

  async updateExpenseCategory(id: string, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [updated] = await db.update(expenseCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(expenseCategories.id, id))
      .returning();
    return updated;
  }

  async deleteExpenseCategory(id: string): Promise<boolean> {
    const result = await db.delete(expenseCategories).where(eq(expenseCategories.id, id)).returning();
    return result.length > 0;
  }

  // Receipt Submissions
  async getReceiptSubmissions(filters?: { status?: string }): Promise<ReceiptSubmission[]> {
    if (filters?.status) {
      return db.select().from(receiptSubmissions)
        .where(eq(receiptSubmissions.status, filters.status as any))
        .orderBy(desc(receiptSubmissions.createdAt));
    }
    return db.select().from(receiptSubmissions).orderBy(desc(receiptSubmissions.createdAt));
  }

  async getReceiptSubmission(id: string): Promise<ReceiptSubmission | undefined> {
    const [receipt] = await db.select().from(receiptSubmissions).where(eq(receiptSubmissions.id, id));
    return receipt;
  }

  async getReceiptSubmissionByToken(token: string): Promise<ReceiptSubmission | undefined> {
    const [receipt] = await db.select().from(receiptSubmissions)
      .where(eq(receiptSubmissions.submissionToken, token));
    return receipt;
  }

  async createReceiptSubmission(submission: InsertReceiptSubmission): Promise<ReceiptSubmission> {
    const [created] = await db.insert(receiptSubmissions).values(submission).returning();
    return created;
  }

  async updateReceiptSubmission(id: string, submission: Partial<InsertReceiptSubmission>): Promise<ReceiptSubmission | undefined> {
    const [updated] = await db.update(receiptSubmissions)
      .set({ ...submission, updatedAt: new Date() })
      .where(eq(receiptSubmissions.id, id))
      .returning();
    return updated;
  }

  async deleteReceiptSubmission(id: string): Promise<boolean> {
    const result = await db.delete(receiptSubmissions).where(eq(receiptSubmissions.id, id)).returning();
    return result.length > 0;
  }

  async getPendingReceipts(): Promise<ReceiptSubmission[]> {
    return db.select().from(receiptSubmissions)
      .where(eq(receiptSubmissions.status, 'pending'))
      .orderBy(desc(receiptSubmissions.createdAt));
  }

  async matchReceiptToTransaction(receiptId: string, transactionId: string, reviewedBy: string): Promise<boolean> {
    await db.update(receiptSubmissions)
      .set({ 
        matchedTransactionId: transactionId, 
        status: 'matched',
        reviewedByUserId: reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(receiptSubmissions.id, receiptId));
    
    await db.update(bankTransactions)
      .set({ receiptId })
      .where(eq(bankTransactions.id, transactionId));
    
    return true;
  }

  // ============================================
  // JOB PIPELINE CONFIGURATION
  // ============================================

  // Job Pipelines
  async getJobPipeline(id: string): Promise<JobPipeline | undefined> {
    const [pipeline] = await db.select().from(jobPipelines).where(eq(jobPipelines.id, id));
    return pipeline;
  }

  async getJobPipelines(): Promise<JobPipeline[]> {
    return db.select().from(jobPipelines).orderBy(jobPipelines.name);
  }

  async getActiveJobPipelines(): Promise<JobPipeline[]> {
    return db.select().from(jobPipelines)
      .where(eq(jobPipelines.isActive, true))
      .orderBy(jobPipelines.name);
  }

  async createJobPipeline(pipeline: InsertJobPipeline): Promise<JobPipeline> {
    const [created] = await db.insert(jobPipelines).values(pipeline).returning();
    return created;
  }

  async updateJobPipeline(id: string, pipeline: Partial<InsertJobPipeline>): Promise<JobPipeline | undefined> {
    const [updated] = await db.update(jobPipelines)
      .set({ ...pipeline, updatedAt: new Date() })
      .where(eq(jobPipelines.id, id))
      .returning();
    return updated;
  }

  async deleteJobPipeline(id: string): Promise<boolean> {
    const result = await db.delete(jobPipelines).where(eq(jobPipelines.id, id));
    return true;
  }

  // Job Pipeline Stages
  async getJobPipelineStage(id: string): Promise<JobPipelineStage | undefined> {
    const [stage] = await db.select().from(jobPipelineStages).where(eq(jobPipelineStages.id, id));
    return stage;
  }

  async getJobPipelineStages(pipelineId: string): Promise<JobPipelineStage[]> {
    return db.select().from(jobPipelineStages)
      .where(eq(jobPipelineStages.pipelineId, pipelineId))
      .orderBy(jobPipelineStages.sortOrder);
  }

  async createJobPipelineStage(stage: InsertJobPipelineStage): Promise<JobPipelineStage> {
    const [created] = await db.insert(jobPipelineStages).values(stage).returning();
    return created;
  }

  async updateJobPipelineStage(id: string, stage: Partial<InsertJobPipelineStage>): Promise<JobPipelineStage | undefined> {
    const [updated] = await db.update(jobPipelineStages)
      .set({ ...stage, updatedAt: new Date() })
      .where(eq(jobPipelineStages.id, id))
      .returning();
    return updated;
  }

  async deleteJobPipelineStage(id: string): Promise<boolean> {
    await db.delete(jobPipelineStages).where(eq(jobPipelineStages.id, id));
    return true;
  }

  async reorderJobPipelineStages(pipelineId: string, stageIds: string[]): Promise<boolean> {
    for (let i = 0; i < stageIds.length; i++) {
      await db.update(jobPipelineStages)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(
          eq(jobPipelineStages.id, stageIds[i]),
          eq(jobPipelineStages.pipelineId, pipelineId)
        ));
    }
    return true;
  }

  // Job Stage Completions
  async getJobStageCompletions(jobId: string): Promise<JobStageCompletion[]> {
    return db.select().from(jobStageCompletions)
      .where(eq(jobStageCompletions.jobId, jobId));
  }

  async toggleJobStageCompletion(jobId: string, stageId: string, userId?: string): Promise<{ completed: boolean }> {
    // Check if this stage is already completed for this job
    const [existing] = await db.select().from(jobStageCompletions)
      .where(and(
        eq(jobStageCompletions.jobId, jobId),
        eq(jobStageCompletions.stageId, stageId)
      ));

    let completed: boolean;
    
    if (existing) {
      // Remove the completion (toggle off)
      await db.delete(jobStageCompletions)
        .where(and(
          eq(jobStageCompletions.jobId, jobId),
          eq(jobStageCompletions.stageId, stageId)
        ));
      completed = false;
    } else {
      // Add the completion (toggle on)
      await db.insert(jobStageCompletions).values({
        jobId,
        stageId,
        completedBy: userId,
      });
      completed = true;
    }

    // Sync the legacy stagesCompleted array for kanban view
    // Get all completions for this job
    const allCompletions = await db.select().from(jobStageCompletions)
      .where(eq(jobStageCompletions.jobId, jobId));
    
    // Get the stages with their sortOrder
    const stageIds = allCompletions.map(c => c.stageId);
    if (stageIds.length > 0) {
      const stages = await db.select().from(jobPipelineStages)
        .where(inArray(jobPipelineStages.id, stageIds));
      
      // Convert to legacy format: array of (sortOrder + 1) for each completed stage
      const stagesCompletedArray = stages.map(s => s.sortOrder + 1);
      
      await db.update(jobs)
        .set({ stagesCompleted: stagesCompletedArray, updatedAt: new Date() })
        .where(eq(jobs.id, jobId));
    } else {
      await db.update(jobs)
        .set({ stagesCompleted: [], updatedAt: new Date() })
        .where(eq(jobs.id, jobId));
    }
    
    return { completed };
  }

  // ============================================
  // CORE ANALYTICS IMPLEMENTATION
  // ============================================

  async getLeadAnalytics(startDate?: Date, endDate?: Date): Promise<LeadAnalytics> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1); // Default to start of month
    const end = endDate || now;

    // Get all leads for analysis
    const allLeads = await db.select().from(leads);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    // New leads in date range
    const newLeads = allLeads.filter(l => {
      const created = new Date(l.createdAt);
      return created >= start && created <= end;
    }).length;

    // Total active leads (not won or lost)
    const totalActiveLeads = allLeads.filter(l => 
      l.stage !== 'won' && l.stage !== 'lost'
    ).length;

    // Leads by stage (for pipeline chart)
    const stageValues = ['new', 'contacted', 'needs_quote', 'quote_sent', 'follow_up', 'won', 'lost'];
    const leadsByStage = stageValues.map(stage => ({
      stage,
      count: allLeads.filter(l => l.stage === stage).length
    }));

    // Leads by source
    const sourceMap = new Map<string, number>();
    allLeads.forEach(l => {
      const source = l.source || 'unknown';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));

    // Calculate average time metrics
    let totalFirstResponseTime = 0;
    let firstResponseCount = 0;
    let totalQuoteTime = 0;
    let quoteTimeCount = 0;
    let totalCloseTime = 0;
    let closeTimeCount = 0;

    allLeads.forEach(l => {
      if (l.firstResponseAt) {
        const responseTime = (new Date(l.firstResponseAt).getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
        totalFirstResponseTime += responseTime;
        firstResponseCount++;
      }
      if (l.quoteSentAt) {
        const quoteTime = (new Date(l.quoteSentAt).getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
        totalQuoteTime += quoteTime;
        quoteTimeCount++;
      }
      if (l.wonAt && l.stage === 'won') {
        const closeTime = (new Date(l.wonAt).getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        totalCloseTime += closeTime;
        closeTimeCount++;
      }
    });

    // Leads by assignee
    const assigneeMap = new Map<string, number>();
    allLeads.forEach(l => {
      if (l.assignedTo) {
        assigneeMap.set(l.assignedTo, (assigneeMap.get(l.assignedTo) || 0) + 1);
      }
    });
    const leadsByAssignee = Array.from(assigneeMap.entries()).map(([userId, count]) => ({
      userId,
      userName: userMap.get(userId) || 'Unknown',
      count
    }));

    return {
      newLeads,
      totalActiveLeads,
      leadsByStage,
      leadsBySource,
      averageTimeToFirstResponse: firstResponseCount > 0 ? totalFirstResponseTime / firstResponseCount : null,
      averageTimeToQuote: quoteTimeCount > 0 ? totalQuoteTime / quoteTimeCount : null,
      averageTimeToClose: closeTimeCount > 0 ? totalCloseTime / closeTimeCount : null,
      leadsByAssignee
    };
  }

  async getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get all leads and payments (using lead-centric approach per spec)
    const allLeads = await db.select().from(leads);
    const allPayments = await db.select().from(payments);

    // Pending quotes: Count leads awaiting client decision
    // Includes quote_sent, follow_up, or any lead with quoteSentAt that isn't won/lost
    const pendingQuotes = allLeads.filter(l => 
      (l.stage === 'quote_sent' || l.stage === 'follow_up') ||
      (l.quoteSentAt && l.stage !== 'won' && l.stage !== 'lost')
    ).length;

    // Quote Conversion Rate: Won Leads ÷ Leads that ever received quotes
    // A lead "received a quote" when: quoteSentAt is set OR stage indicates quote was sent
    // This includes leads in any stage if quoteSentAt is populated
    const leadsWithQuotesSent = allLeads.filter(l => 
      l.quoteSentAt !== null || 
      ['quote_sent', 'follow_up', 'won', 'lost'].includes(l.stage)
    );
    const wonLeadsWithQuotes = leadsWithQuotesSent.filter(l => l.stage === 'won').length;
    const quoteConversionRate = leadsWithQuotesSent.length > 0 
      ? (wonLeadsWithQuotes / leadsWithQuotesSent.length) * 100 
      : 0;

    // Average Deal Size: Mean value of opportunity_value from won leads
    const wonLeads = allLeads.filter(l => l.stage === 'won' && l.opportunityValue);
    const totalWonValue = wonLeads.reduce((sum, l) => sum + Number(l.opportunityValue || 0), 0);
    const averageDealSize = wonLeads.length > 0 ? totalWonValue / wonLeads.length : 0;

    // Quote Pipeline Value: Sum of opportunity_value from active leads (not won/lost)
    // This uses the lead's opportunity_value which is set from the primary quote
    const activeLeadsWithOpportunity = allLeads.filter(l => 
      l.stage !== 'won' && l.stage !== 'lost' && l.opportunityValue
    );
    const quotePipelineValue = activeLeadsWithOpportunity.reduce((sum, l) => 
      sum + Number(l.opportunityValue || 0), 0
    );

    // Monthly Revenue: Sum of paid payments (status='paid' with paidAt set)
    const paidPaymentsInRange = allPayments.filter(p => {
      if (p.status !== 'paid' || !p.paidAt) return false;
      const paidDate = new Date(p.paidAt);
      return paidDate >= start && paidDate <= end;
    });
    const monthlyRevenue = paidPaymentsInRange.reduce((sum, p) => sum + Number(p.amount), 0);

    // Year-to-date Revenue
    const ytdPayments = allPayments.filter(p => {
      if (p.status !== 'paid' || !p.paidAt) return false;
      const paidDate = new Date(p.paidAt);
      return paidDate >= yearStart && paidDate <= end;
    });
    const yearToDateRevenue = ytdPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Won value in period (leads that became won in the date range)
    // Uses wonAt timestamp when available, falls back to createdAt for legacy data
    const wonInPeriod = allLeads.filter(l => {
      if (l.stage !== 'won') return false;
      const wonDate = l.wonAt ? new Date(l.wonAt) : null;
      if (!wonDate) return false;
      return wonDate >= start && wonDate <= end;
    });
    const wonValue = wonInPeriod.reduce((sum, l) => sum + Number(l.opportunityValue || 0), 0);

    // Lost value in period
    const lostInPeriod = allLeads.filter(l => {
      if (l.stage !== 'lost') return false;
      const lostDate = l.lostAt ? new Date(l.lostAt) : null;
      if (!lostDate) return false;
      return lostDate >= start && lostDate <= end;
    });
    const lostValue = lostInPeriod.reduce((sum, l) => sum + Number(l.opportunityValue || 0), 0);

    return {
      pendingQuotes,
      quoteConversionRate,
      averageDealSize,
      quotePipelineValue,
      monthlyRevenue,
      yearToDateRevenue,
      wonValue,
      lostValue
    };
  }

  async getCoreAnalytics(startDate?: Date, endDate?: Date): Promise<CoreAnalytics> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;

    const [leadsAnalytics, salesAnalytics] = await Promise.all([
      this.getLeadAnalytics(start, end),
      this.getSalesAnalytics(start, end)
    ]);

    return {
      leads: leadsAnalytics,
      sales: salesAnalytics,
      dateRange: { startDate: start, endDate: end }
    };
  }

  // Kanban Columns
  async getKanbanColumns(): Promise<KanbanColumn[]> {
    return db.select().from(kanbanColumns)
      .where(eq(kanbanColumns.isActive, true))
      .orderBy(kanbanColumns.sortOrder);
  }

  async getKanbanColumn(id: string): Promise<KanbanColumn | undefined> {
    const [column] = await db.select().from(kanbanColumns).where(eq(kanbanColumns.id, id));
    return column;
  }

  async createKanbanColumn(column: InsertKanbanColumn): Promise<KanbanColumn> {
    const maxOrder = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(kanbanColumns);
    const sortOrder = (maxOrder[0]?.max ?? -1) + 1;
    
    const [newColumn] = await db.insert(kanbanColumns)
      .values({ ...column, sortOrder })
      .returning();
    return newColumn;
  }

  async updateKanbanColumn(id: string, column: Partial<InsertKanbanColumn>): Promise<KanbanColumn | undefined> {
    const [updated] = await db.update(kanbanColumns)
      .set({ ...column, updatedAt: new Date() })
      .where(eq(kanbanColumns.id, id))
      .returning();
    return updated;
  }

  async deleteKanbanColumn(id: string): Promise<boolean> {
    const result = await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorderKanbanColumns(columnIds: string[]): Promise<boolean> {
    for (let i = 0; i < columnIds.length; i++) {
      await db.update(kanbanColumns)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(kanbanColumns.id, columnIds[i]));
    }
    return true;
  }

  // Job Statuses
  async getJobStatuses(): Promise<JobStatus[]> {
    return db.select().from(jobStatuses)
      .where(eq(jobStatuses.isActive, true))
      .orderBy(jobStatuses.sortOrder);
  }

  async getJobStatus(id: string): Promise<JobStatus | undefined> {
    const [status] = await db.select().from(jobStatuses).where(eq(jobStatuses.id, id));
    return status;
  }

  async createJobStatus(status: InsertJobStatus): Promise<JobStatus> {
    const maxOrder = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(jobStatuses);
    const sortOrder = (maxOrder[0]?.max ?? -1) + 1;
    
    const [newStatus] = await db.insert(jobStatuses)
      .values({ ...status, sortOrder })
      .returning();
    return newStatus;
  }

  async updateJobStatus(id: string, status: Partial<InsertJobStatus>): Promise<JobStatus | undefined> {
    const [updated] = await db.update(jobStatuses)
      .set({ ...status, updatedAt: new Date() })
      .where(eq(jobStatuses.id, id))
      .returning();
    return updated;
  }

  async deleteJobStatus(id: string): Promise<boolean> {
    const result = await db.delete(jobStatuses).where(eq(jobStatuses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorderJobStatuses(statusIds: string[]): Promise<boolean> {
    for (let i = 0; i < statusIds.length; i++) {
      await db.update(jobStatuses)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(jobStatuses.id, statusIds[i]));
    }
    return true;
  }

  // Job Status Dependencies
  async getStatusDependencies(statusKey: string): Promise<JobStatusDependency[]> {
    return db.select().from(jobStatusDependencies)
      .where(eq(jobStatusDependencies.statusKey, statusKey));
  }

  async getAllStatusDependencies(): Promise<JobStatusDependency[]> {
    return db.select().from(jobStatusDependencies);
  }

  async setStatusDependencies(statusKey: string, dependencies: { prerequisiteKey: string; dependencyType: string }[]): Promise<boolean> {
    await db.delete(jobStatusDependencies)
      .where(eq(jobStatusDependencies.statusKey, statusKey));
    
    if (dependencies.length > 0) {
      await db.insert(jobStatusDependencies)
        .values(dependencies.map(dep => ({
          statusKey,
          prerequisiteKey: dep.prerequisiteKey,
          dependencyType: dep.dependencyType
        })));
    }
    return true;
  }

  // Production Stages
  async getProductionStages(): Promise<ProductionStage[]> {
    return db.select().from(productionStages)
      .where(eq(productionStages.isActive, true))
      .orderBy(productionStages.sortOrder);
  }

  async getProductionStage(id: string): Promise<ProductionStage | undefined> {
    const [stage] = await db.select().from(productionStages).where(eq(productionStages.id, id));
    return stage;
  }

  async createProductionStage(stage: InsertProductionStage): Promise<ProductionStage> {
    const maxOrder = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` }).from(productionStages);
    const sortOrder = (maxOrder[0]?.max ?? -1) + 1;
    
    const [created] = await db.insert(productionStages)
      .values({ ...stage, sortOrder })
      .returning();
    return created;
  }

  async updateProductionStage(id: string, stage: Partial<InsertProductionStage>): Promise<ProductionStage | undefined> {
    const [updated] = await db.update(productionStages)
      .set({ ...stage, updatedAt: new Date() })
      .where(eq(productionStages.id, id))
      .returning();
    return updated;
  }

  async deleteProductionStage(id: string): Promise<boolean> {
    const result = await db.delete(productionStages).where(eq(productionStages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorderProductionStages(stageIds: string[]): Promise<boolean> {
    for (let i = 0; i < stageIds.length; i++) {
      await db.update(productionStages)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(productionStages.id, stageIds[i]));
    }
    return true;
  }

  // ============================================
  // VOICE CALLS & AI COACHING
  // ============================================

  // Voice Calls
  async getVoiceCall(id: string): Promise<VoiceCall | undefined> {
    const [call] = await db.select().from(voiceCalls).where(eq(voiceCalls.id, id));
    return call;
  }

  async getVoiceCallBySid(twilioCallSid: string): Promise<VoiceCall | undefined> {
    const [call] = await db.select().from(voiceCalls).where(eq(voiceCalls.twilioCallSid, twilioCallSid));
    return call;
  }

  async getVoiceCalls(): Promise<VoiceCall[]> {
    return db.select().from(voiceCalls).orderBy(desc(voiceCalls.createdAt));
  }

  async getActiveVoiceCalls(): Promise<VoiceCall[]> {
    return db.select().from(voiceCalls)
      .where(or(
        eq(voiceCalls.status, "ringing"),
        eq(voiceCalls.status, "in_progress")
      ))
      .orderBy(desc(voiceCalls.startedAt));
  }

  async getVoiceCallsByStaff(userId: string): Promise<VoiceCall[]> {
    return db.select().from(voiceCalls)
      .where(eq(voiceCalls.staffUserId, userId))
      .orderBy(desc(voiceCalls.createdAt));
  }

  async getVoiceCallsByClient(clientId: string): Promise<VoiceCall[]> {
    return db.select().from(voiceCalls)
      .where(eq(voiceCalls.clientId, clientId))
      .orderBy(desc(voiceCalls.createdAt));
  }

  async getVoiceCallsByLead(leadId: string): Promise<VoiceCall[]> {
    return db.select().from(voiceCalls)
      .where(eq(voiceCalls.leadId, leadId))
      .orderBy(desc(voiceCalls.createdAt));
  }

  async createVoiceCall(call: InsertVoiceCall): Promise<VoiceCall> {
    const [created] = await db.insert(voiceCalls).values(call).returning();
    return created;
  }

  async updateVoiceCall(id: string, call: Partial<InsertVoiceCall>): Promise<VoiceCall | undefined> {
    const [updated] = await db.update(voiceCalls)
      .set(call)
      .where(eq(voiceCalls.id, id))
      .returning();
    return updated;
  }

  // Call Transcripts
  async getCallTranscripts(callId: string): Promise<CallTranscript[]> {
    return db.select().from(callTranscripts)
      .where(eq(callTranscripts.callId, callId))
      .orderBy(callTranscripts.startTime);
  }

  async createCallTranscript(transcript: InsertCallTranscript): Promise<CallTranscript> {
    const [created] = await db.insert(callTranscripts).values(transcript).returning();
    return created;
  }

  async createCallTranscripts(transcripts: InsertCallTranscript[]): Promise<CallTranscript[]> {
    if (transcripts.length === 0) return [];
    return db.insert(callTranscripts).values(transcripts).returning();
  }

  // Sales Checklist Items
  async getSalesChecklistItem(id: string): Promise<SalesChecklistItem | undefined> {
    const [item] = await db.select().from(salesChecklistItems).where(eq(salesChecklistItems.id, id));
    return item;
  }

  async getSalesChecklistItems(): Promise<SalesChecklistItem[]> {
    return db.select().from(salesChecklistItems).orderBy(salesChecklistItems.sortOrder);
  }

  async getActiveSalesChecklistItems(): Promise<SalesChecklistItem[]> {
    return db.select().from(salesChecklistItems)
      .where(eq(salesChecklistItems.isActive, true))
      .orderBy(salesChecklistItems.sortOrder);
  }

  async createSalesChecklistItem(item: InsertSalesChecklistItem): Promise<SalesChecklistItem> {
    const maxOrder = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(salesChecklistItems);
    const sortOrder = (maxOrder[0]?.max ?? -1) + 1;
    
    const [created] = await db.insert(salesChecklistItems)
      .values({ ...item, sortOrder })
      .returning();
    return created;
  }

  async updateSalesChecklistItem(id: string, item: Partial<InsertSalesChecklistItem>): Promise<SalesChecklistItem | undefined> {
    const [updated] = await db.update(salesChecklistItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(salesChecklistItems.id, id))
      .returning();
    return updated;
  }

  async deleteSalesChecklistItem(id: string): Promise<boolean> {
    const result = await db.delete(salesChecklistItems).where(eq(salesChecklistItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorderSalesChecklistItems(itemIds: string[]): Promise<boolean> {
    for (let i = 0; i < itemIds.length; i++) {
      await db.update(salesChecklistItems)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(salesChecklistItems.id, itemIds[i]));
    }
    return true;
  }

  // Call Checklist Status
  async getCallChecklistStatus(callId: string): Promise<CallChecklistStatus[]> {
    return db.select().from(callChecklistStatus)
      .where(eq(callChecklistStatus.callId, callId));
  }

  async initializeCallChecklistStatus(callId: string): Promise<CallChecklistStatus[]> {
    const activeItems = await this.getActiveSalesChecklistItems();
    if (activeItems.length === 0) return [];
    
    const statuses = activeItems.map(item => ({
      callId,
      checklistItemId: item.id,
      isCovered: false,
    }));
    
    return db.insert(callChecklistStatus).values(statuses).returning();
  }

  async updateCallChecklistItemStatus(
    callId: string, 
    checklistItemId: string, 
    isCovered: boolean, 
    detectedText?: string
  ): Promise<CallChecklistStatus | undefined> {
    const [updated] = await db.update(callChecklistStatus)
      .set({ 
        isCovered, 
        coveredAt: isCovered ? new Date() : null,
        detectedText 
      })
      .where(and(
        eq(callChecklistStatus.callId, callId),
        eq(callChecklistStatus.checklistItemId, checklistItemId)
      ))
      .returning();
    return updated;
  }

  // Call Coaching Prompts
  async getCallCoachingPrompts(callId: string): Promise<CallCoachingPrompt[]> {
    return db.select().from(callCoachingPrompts)
      .where(eq(callCoachingPrompts.callId, callId))
      .orderBy(desc(callCoachingPrompts.createdAt));
  }

  async createCallCoachingPrompt(prompt: InsertCallCoachingPrompt): Promise<CallCoachingPrompt> {
    const [created] = await db.insert(callCoachingPrompts).values(prompt).returning();
    return created;
  }

  async acknowledgeCallCoachingPrompt(id: string): Promise<CallCoachingPrompt | undefined> {
    const [updated] = await db.update(callCoachingPrompts)
      .set({ wasAcknowledged: true, acknowledgedAt: new Date() })
      .where(eq(callCoachingPrompts.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
