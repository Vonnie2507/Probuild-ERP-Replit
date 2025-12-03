import { eq, desc, and, gte, lte, like, or, sql, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  users, clients, leads, fenceStyles, products, quotes, jobs, bom,
  productionTasks, installTasks, scheduleEvents, payments, notifications,
  smsLogs, activityLogs, documents,
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
  type ActivityLog, type InsertActivityLog,
  type Document, type InsertDocument,
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

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;
}

export interface DashboardStats {
  newLeadsCount: number;
  quotesAwaitingFollowUp: number;
  jobsInProduction: number;
  jobsReadyForInstall: number;
  todayInstalls: number;
  pendingPaymentsTotal: number;
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
        like(clients.phone, `%${query}%`)
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
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
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
    const [created] = await db.insert(quotes).values(quote as any).returning();
    return created;
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
    const [created] = await db.insert(jobs).values(job as any).returning();
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
    const normalizedPhone = phone.replace(/\D/g, '');
    return db.select().from(smsLogs)
      .where(sql`regexp_replace(${smsLogs.recipientPhone}, '[^0-9]', '', 'g') LIKE '%' || ${normalizedPhone} || '%'`)
      .orderBy(smsLogs.createdAt);
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
}

export const storage = new DatabaseStorage();
