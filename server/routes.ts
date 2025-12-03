import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, insertLeadSchema, insertProductSchema, 
  insertQuoteSchema, insertJobSchema, insertBOMSchema,
  insertProductionTaskSchema, insertInstallTaskSchema,
  insertScheduleEventSchema, insertPaymentSchema,
  insertFenceStyleSchema, insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { getTwilioClient, getTwilioFromPhoneNumber } from "./twilio";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-04-30.basil" as any,
    })
  : null;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============ DASHBOARD ============
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ============ GLOBAL SEARCH ============
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string" || q.length < 2) {
        return res.json({ clients: [], leads: [], jobs: [], quotes: [] });
      }

      const [clients, leads, jobs, quotes] = await Promise.all([
        storage.searchClients(q),
        storage.searchLeads(q),
        storage.searchJobs(q),
        storage.searchQuotes(q),
      ]);

      res.json({
        clients: clients.slice(0, 5),
        leads: leads.slice(0, 5),
        jobs: jobs.slice(0, 5),
        quotes: quotes.slice(0, 5),
      });
    } catch (error) {
      console.error("Error performing global search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // ============ CLIENTS ============
  app.get("/api/clients", async (req, res) => {
    try {
      const { type, search } = req.query;
      let clients;
      if (search) {
        clients = await storage.searchClients(search as string);
      } else if (type) {
        clients = await storage.getClientsByType(type as string);
      } else {
        clients = await storage.getClients();
      }
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Get client's quotes
  app.get("/api/clients/:id/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotesByClient(req.params.id);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching client quotes:", error);
      res.status(500).json({ error: "Failed to fetch client quotes" });
    }
  });

  // Get client's jobs
  app.get("/api/clients/:id/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobsByClient(req.params.id);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching client jobs:", error);
      res.status(500).json({ error: "Failed to fetch client jobs" });
    }
  });

  // Get client's payments
  app.get("/api/clients/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByClient(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching client payments:", error);
      res.status(500).json({ error: "Failed to fetch client payments" });
    }
  });

  // ============ LEADS ============
  app.get("/api/leads", async (req, res) => {
    try {
      const { stage, assignee } = req.query;
      let leads;
      if (stage) {
        leads = await storage.getLeadsByStage(stage as string);
      } else if (assignee) {
        leads = await storage.getLeadsByAssignee(assignee as string);
      } else {
        leads = await storage.getLeads();
      }
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.updateLead(req.params.id, req.body);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Convert lead to quote
  app.post("/api/leads/:id/convert-to-quote", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get next quote number
      const quoteNumber = await storage.getNextQuoteNumber();

      // Create quote from lead
      const quoteData = {
        quoteNumber,
        clientId: lead.clientId!,
        leadId: lead.id,
        siteAddress: lead.siteAddress,
        totalAmount: "0",
        status: "draft" as const,
        isTradeQuote: lead.leadType === "trade",
        ...req.body,
      };

      const quote = await storage.createQuote(quoteData);

      // Update lead stage
      await storage.updateLead(lead.id, { stage: "quote_sent" });

      res.status(201).json(quote);
    } catch (error) {
      console.error("Error converting lead to quote:", error);
      res.status(500).json({ error: "Failed to convert lead to quote" });
    }
  });

  // ============ FENCE STYLES ============
  app.get("/api/fence-styles", async (req, res) => {
    try {
      const styles = await storage.getFenceStyles();
      res.json(styles);
    } catch (error) {
      console.error("Error fetching fence styles:", error);
      res.status(500).json({ error: "Failed to fetch fence styles" });
    }
  });

  app.post("/api/fence-styles", async (req, res) => {
    try {
      const validatedData = insertFenceStyleSchema.parse(req.body);
      const style = await storage.createFenceStyle(validatedData);
      res.status(201).json(style);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating fence style:", error);
      res.status(500).json({ error: "Failed to create fence style" });
    }
  });

  // ============ PRODUCTS / INVENTORY ============
  app.get("/api/products", async (req, res) => {
    try {
      const { category, lowStock } = req.query;
      let products;
      if (lowStock === "true") {
        products = await storage.getLowStockProducts();
      } else if (category) {
        products = await storage.getProductsByCategory(category as string);
      } else {
        products = await storage.getProducts();
      }
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.patch("/api/products/:id/stock", async (req, res) => {
    try {
      const { quantity } = req.body;
      const product = await storage.updateStock(req.params.id, quantity);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating stock:", error);
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // ============ QUOTES ============
  app.get("/api/quotes", async (req, res) => {
    try {
      const { status, clientId } = req.query;
      let quotes;
      if (status) {
        quotes = await storage.getQuotesByStatus(status as string);
      } else if (clientId) {
        quotes = await storage.getQuotesByClient(clientId as string);
      } else {
        quotes = await storage.getQuotes();
      }
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/next-number", async (req, res) => {
    try {
      const number = await storage.getNextQuoteNumber();
      res.json({ quoteNumber: number });
    } catch (error) {
      console.error("Error generating quote number:", error);
      res.status(500).json({ error: "Failed to generate quote number" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const quoteNumber = await storage.getNextQuoteNumber();
      const validatedData = insertQuoteSchema.parse({
        ...req.body,
        quoteNumber,
      });
      const quote = await storage.createQuote(validatedData);
      res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.updateQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Send quote
  app.post("/api/quotes/:id/send", async (req, res) => {
    try {
      const quote = await storage.updateQuote(req.params.id, {
        status: "sent",
        sentAt: new Date(),
      } as any);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error sending quote:", error);
      res.status(500).json({ error: "Failed to send quote" });
    }
  });

  // Accept quote and create job
  app.post("/api/quotes/:id/accept", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Update quote status
      await storage.updateQuote(req.params.id, {
        status: "approved",
        approvedAt: new Date(),
      } as any);

      // Get next job number and create job
      const jobNumber = await storage.getNextJobNumber();
      const jobData = {
        jobNumber,
        clientId: quote.clientId,
        quoteId: quote.id,
        jobType: req.body.jobType || "supply_install",
        siteAddress: quote.siteAddress || "",
        status: "awaiting_deposit" as const,
        fenceStyle: req.body.fenceStyle,
        totalLength: quote.totalLength,
        fenceHeight: quote.fenceHeight,
        totalAmount: quote.totalAmount,
        depositAmount: quote.depositRequired,
      };

      const job = await storage.createJob(jobData);

      // Create deposit payment record
      if (quote.depositRequired) {
        await storage.createPayment({
          clientId: quote.clientId,
          jobId: job.id,
          quoteId: quote.id,
          amount: quote.depositRequired,
          paymentType: "deposit",
          status: "pending",
        });
      }

      res.status(201).json(job);
    } catch (error) {
      console.error("Error accepting quote:", error);
      res.status(500).json({ error: "Failed to accept quote" });
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // ============ JOBS ============
  app.get("/api/jobs", async (req, res) => {
    try {
      const { status, clientId, installerId } = req.query;
      let jobs;
      if (status) {
        jobs = await storage.getJobsByStatus(status as string);
      } else if (clientId) {
        jobs = await storage.getJobsByClient(clientId as string);
      } else if (installerId) {
        jobs = await storage.getJobsByInstaller(installerId as string);
      } else {
        jobs = await storage.getJobs();
      }
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.updateJob(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  // Update job status
  app.patch("/api/jobs/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const job = await storage.updateJob(req.params.id, { status });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ error: "Failed to update job status" });
    }
  });

  // Get job BOM
  app.get("/api/jobs/:id/bom", async (req, res) => {
    try {
      const bomData = await storage.getBOMByJob(req.params.id);
      if (!bomData) {
        return res.status(404).json({ error: "BOM not found" });
      }
      res.json(bomData);
    } catch (error) {
      console.error("Error fetching BOM:", error);
      res.status(500).json({ error: "Failed to fetch BOM" });
    }
  });

  // Create/Update job BOM
  app.post("/api/jobs/:id/bom", async (req, res) => {
    try {
      const existingBOM = await storage.getBOMByJob(req.params.id);
      if (existingBOM) {
        const updated = await storage.updateBOM(existingBOM.id, req.body);
        return res.json(updated);
      }
      
      const validatedData = insertBOMSchema.parse({
        ...req.body,
        jobId: req.params.id,
      });
      const bomData = await storage.createBOM(validatedData);
      res.status(201).json(bomData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating BOM:", error);
      res.status(500).json({ error: "Failed to create BOM" });
    }
  });

  // Get job production tasks
  app.get("/api/jobs/:id/production-tasks", async (req, res) => {
    try {
      const tasks = await storage.getProductionTasksByJob(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching production tasks:", error);
      res.status(500).json({ error: "Failed to fetch production tasks" });
    }
  });

  // Get job install tasks
  app.get("/api/jobs/:id/install-tasks", async (req, res) => {
    try {
      const tasks = await storage.getInstallTasksByJob(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching install tasks:", error);
      res.status(500).json({ error: "Failed to fetch install tasks" });
    }
  });

  // Get job payments
  app.get("/api/jobs/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByJob(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching job payments:", error);
      res.status(500).json({ error: "Failed to fetch job payments" });
    }
  });

  // ============ PRODUCTION TASKS ============
  app.get("/api/production-tasks", async (req, res) => {
    try {
      const { status, assignee, jobId } = req.query;
      let tasks;
      if (jobId) {
        tasks = await storage.getProductionTasksByJob(jobId as string);
      } else if (status) {
        tasks = await storage.getProductionTasksByStatus(status as string);
      } else if (assignee) {
        tasks = await storage.getProductionTasksByAssignee(assignee as string);
      } else {
        tasks = await storage.getProductionTasks();
      }
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching production tasks:", error);
      res.status(500).json({ error: "Failed to fetch production tasks" });
    }
  });

  app.post("/api/production-tasks", async (req, res) => {
    try {
      const validatedData = insertProductionTaskSchema.parse(req.body);
      const task = await storage.createProductionTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating production task:", error);
      res.status(500).json({ error: "Failed to create production task" });
    }
  });

  app.patch("/api/production-tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateProductionTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Production task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating production task:", error);
      res.status(500).json({ error: "Failed to update production task" });
    }
  });

  // Start production task
  app.post("/api/production-tasks/:id/start", async (req, res) => {
    try {
      const task = await storage.updateProductionTask(req.params.id, {
        status: "in_progress",
        startTime: new Date(),
        assignedTo: req.body.assignedTo,
      });
      if (!task) {
        return res.status(404).json({ error: "Production task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error starting production task:", error);
      res.status(500).json({ error: "Failed to start production task" });
    }
  });

  // Complete production task
  app.post("/api/production-tasks/:id/complete", async (req, res) => {
    try {
      const existingTask = await storage.getProductionTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ error: "Production task not found" });
      }

      const endTime = new Date();
      const startTime = existingTask.startTime ? new Date(existingTask.startTime) : endTime;
      const timeSpentMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const task = await storage.updateProductionTask(req.params.id, {
        status: "completed",
        endTime,
        timeSpentMinutes,
        qaResult: req.body.qaResult,
        qaPassedAt: req.body.qaResult === "passed" ? new Date() : undefined,
      });
      res.json(task);
    } catch (error) {
      console.error("Error completing production task:", error);
      res.status(500).json({ error: "Failed to complete production task" });
    }
  });

  // ============ INSTALL TASKS ============
  app.get("/api/install-tasks", async (req, res) => {
    try {
      const { installerId, date, jobId } = req.query;
      let tasks;
      if (jobId) {
        tasks = await storage.getInstallTasksByJob(jobId as string);
      } else if (installerId) {
        tasks = await storage.getInstallTasksByInstaller(installerId as string);
      } else if (date) {
        tasks = await storage.getInstallTasksByDate(new Date(date as string));
      } else {
        tasks = await storage.getInstallTasks();
      }
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching install tasks:", error);
      res.status(500).json({ error: "Failed to fetch install tasks" });
    }
  });

  app.post("/api/install-tasks", async (req, res) => {
    try {
      const validatedData = insertInstallTaskSchema.parse(req.body);
      const task = await storage.createInstallTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating install task:", error);
      res.status(500).json({ error: "Failed to create install task" });
    }
  });

  app.patch("/api/install-tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateInstallTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Install task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating install task:", error);
      res.status(500).json({ error: "Failed to update install task" });
    }
  });

  // Installer check-in
  app.post("/api/install-tasks/:id/check-in", async (req, res) => {
    try {
      const task = await storage.updateInstallTask(req.params.id, {
        status: "on_site",
        checkInTime: new Date(),
      });
      if (!task) {
        return res.status(404).json({ error: "Install task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error checking in:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  // Complete install task
  app.post("/api/install-tasks/:id/complete", async (req, res) => {
    try {
      const task = await storage.updateInstallTask(req.params.id, {
        status: "completed",
        checkOutTime: new Date(),
        notes: req.body.notes,
        variationsFound: req.body.variationsFound,
        photos: req.body.photos,
      });
      if (!task) {
        return res.status(404).json({ error: "Install task not found" });
      }

      // Update job status
      if (task.jobId) {
        await storage.updateJob(task.jobId, { status: "install_complete" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error completing install task:", error);
      res.status(500).json({ error: "Failed to complete install task" });
    }
  });

  // ============ SCHEDULE EVENTS ============
  app.get("/api/schedule", async (req, res) => {
    try {
      const { start, end, assignee } = req.query;
      let events;
      if (start && end) {
        events = await storage.getScheduleEventsByDateRange(
          new Date(start as string),
          new Date(end as string)
        );
      } else if (assignee) {
        events = await storage.getScheduleEventsByAssignee(assignee as string);
      } else {
        events = await storage.getScheduleEvents();
      }
      res.json(events);
    } catch (error) {
      console.error("Error fetching schedule events:", error);
      res.status(500).json({ error: "Failed to fetch schedule events" });
    }
  });

  app.post("/api/schedule", async (req, res) => {
    try {
      const validatedData = insertScheduleEventSchema.parse(req.body);
      const event = await storage.createScheduleEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating schedule event:", error);
      res.status(500).json({ error: "Failed to create schedule event" });
    }
  });

  app.patch("/api/schedule/:id", async (req, res) => {
    try {
      const event = await storage.updateScheduleEvent(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Schedule event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating schedule event:", error);
      res.status(500).json({ error: "Failed to update schedule event" });
    }
  });

  app.delete("/api/schedule/:id", async (req, res) => {
    try {
      await storage.deleteScheduleEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule event:", error);
      res.status(500).json({ error: "Failed to delete schedule event" });
    }
  });

  // ============ PAYMENTS ============
  app.get("/api/payments", async (req, res) => {
    try {
      const { status, clientId, jobId } = req.query;
      let payments;
      if (status === "pending") {
        payments = await storage.getPendingPayments();
      } else if (clientId) {
        payments = await storage.getPaymentsByClient(clientId as string);
      } else if (jobId) {
        payments = await storage.getPaymentsByJob(jobId as string);
      } else {
        payments = await storage.getPayments();
      }
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.updatePayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  // ============ STRIPE PAYMENTS ============
  app.post("/api/payments/:id/create-checkout", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Payment service not configured" });
      }

      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const client = await storage.getClient(payment.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "aud",
              product_data: {
                name: `${payment.paymentType === "deposit" ? "Deposit" : "Final Payment"} - ${payment.invoiceNumber || payment.id}`,
              },
              unit_amount: Math.round(parseFloat(payment.amount) * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/payments/cancelled`,
        customer_email: client.email || undefined,
        metadata: {
          paymentId: payment.id,
          jobId: payment.jobId || "",
          clientId: payment.clientId,
        },
      });

      await storage.updatePayment(payment.id, {
        stripeSessionId: session.id,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Stripe webhook
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      let event;
      if (webhookSecret && sig && stripe) {
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      } else {
        event = req.body;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const paymentId = session.metadata?.paymentId;

        if (paymentId) {
          const payment = await storage.updatePayment(paymentId, {
            status: "completed",
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent,
          });

          // Update job if this was a deposit
          if (payment?.jobId && payment.paymentType === "deposit") {
            await storage.updateJob(payment.jobId, {
              depositPaid: true,
              depositPaidAt: new Date(),
              status: "ready_for_production",
            });
          } else if (payment?.jobId && payment.paymentType === "final") {
            await storage.updateJob(payment.jobId, {
              finalPaid: true,
              finalPaidAt: new Date(),
              status: "paid_in_full",
            });
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook error" });
    }
  });

  // ============ TWILIO SMS ============
  const smsSendSchema = z.object({
    to: z.string().min(1, "Phone number is required"),
    message: z.string().min(1, "Message is required"),
    recipientName: z.string().optional(),
    relatedEntityType: z.string().optional(),
    relatedEntityId: z.string().optional(),
  });

  app.post("/api/sms/send", async (req, res) => {
    try {
      const parseResult = smsSendSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      const { to, message, recipientName, relatedEntityType, relatedEntityId } = parseResult.data;

      const twilioClient = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();

      if (!twilioClient || !fromNumber) {
        return res.status(503).json({ error: "SMS service not configured" });
      }

      const smsLog = await storage.createSMSLog({
        recipientPhone: to,
        recipientName,
        message,
        status: "pending",
        isOutbound: true,
        relatedEntityType,
        relatedEntityId,
      });

      try {
        const twilioMessage = await twilioClient.messages.create({
          body: message,
          from: fromNumber,
          to,
        });

        await storage.updateSMSLog(smsLog.id, {
          twilioMessageSid: twilioMessage.sid,
          status: "sent",
          sentAt: new Date(),
        });

        res.json({ success: true, messageSid: twilioMessage.sid, smsLog: { ...smsLog, status: "sent", sentAt: new Date() } });
      } catch (twilioError: any) {
        await storage.updateSMSLog(smsLog.id, {
          status: "failed",
          errorMessage: twilioError.message,
        });
        throw twilioError;
      }
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ error: error.message || "Failed to send SMS" });
    }
  });

  // Send install reminder
  app.post("/api/sms/install-reminder", async (req, res) => {
    try {
      const { jobId } = req.body;
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const client = await storage.getClient(job.clientId);
      if (!client || !client.phone) {
        return res.status(400).json({ error: "Client phone not found" });
      }

      const scheduledDate = job.scheduledStartDate
        ? new Date(job.scheduledStartDate).toLocaleDateString("en-AU", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "soon";

      const message = `Hi ${client.name}, this is a reminder that your PVC fence installation with Probuild PVC is scheduled for ${scheduledDate}. If you have any questions, please call us. Thank you!`;

      // Use the SMS send endpoint
      const response = await fetch(`http://localhost:5000/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: client.phone,
          message,
          recipientName: client.name,
          relatedEntityType: "job",
          relatedEntityId: jobId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send SMS");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending install reminder:", error);
      res.status(500).json({ error: "Failed to send install reminder" });
    }
  });

  // Get all SMS logs
  app.get("/api/sms/logs", async (req, res) => {
    try {
      const logs = await storage.getSMSLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching SMS logs:", error);
      res.status(500).json({ error: "Failed to fetch SMS logs" });
    }
  });

  // Get SMS conversation by phone
  app.get("/api/sms/conversation/:phone", async (req, res) => {
    try {
      const { phone } = req.params;
      const messages = await storage.getSMSLogsByPhone(phone);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching SMS conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get SMS logs by related entity (client, job, quote)
  app.get("/api/sms/entity/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const messages = await storage.getSMSLogsByEntity(entityType, entityId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching SMS logs by entity:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  const smsQuoteReadySchema = z.object({
    quoteId: z.string().min(1, "Quote ID is required"),
  });

  // Send quote notification
  app.post("/api/sms/quote-ready", async (req, res) => {
    try {
      const parseResult = smsQuoteReadySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      const { quoteId } = parseResult.data;

      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const client = await storage.getClient(quote.clientId);
      if (!client || !client.phone) {
        return res.status(400).json({ error: "Client phone not found" });
      }

      const twilioClient = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();

      if (!twilioClient || !fromNumber) {
        return res.status(503).json({ error: "SMS service not configured" });
      }

      const formattedAmount = parseFloat(quote.totalAmount || "0").toLocaleString("en-AU", { 
        style: "currency", 
        currency: "AUD" 
      });

      const message = `Hi ${client.name}, your quote ${quote.quoteNumber} from Probuild PVC is ready for review. Total: ${formattedAmount}. Please contact us to discuss. Thank you!`;

      const smsLog = await storage.createSMSLog({
        recipientPhone: client.phone,
        recipientName: client.name,
        message,
        status: "pending",
        isOutbound: true,
        relatedEntityType: "quote",
        relatedEntityId: quoteId,
      });

      try {
        const twilioMessage = await twilioClient.messages.create({
          body: message,
          from: fromNumber,
          to: client.phone,
        });

        await storage.updateSMSLog(smsLog.id, {
          twilioMessageSid: twilioMessage.sid,
          status: "sent",
          sentAt: new Date(),
        });

        res.json({ success: true, messageSid: twilioMessage.sid });
      } catch (twilioError: any) {
        await storage.updateSMSLog(smsLog.id, {
          status: "failed",
          errorMessage: twilioError.message,
        });
        throw twilioError;
      }
    } catch (error: any) {
      console.error("Error sending quote notification:", error);
      res.status(500).json({ error: error.message || "Failed to send notification" });
    }
  });

  const smsPaymentReceivedSchema = z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
  });

  // Send payment received confirmation
  app.post("/api/sms/payment-received", async (req, res) => {
    try {
      const parseResult = smsPaymentReceivedSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      const { paymentId } = parseResult.data;

      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const client = await storage.getClient(payment.clientId);
      if (!client || !client.phone) {
        return res.status(400).json({ error: "Client phone not found" });
      }

      const twilioClient = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();

      if (!twilioClient || !fromNumber) {
        return res.status(503).json({ error: "SMS service not configured" });
      }

      const formattedAmount = parseFloat(payment.amount).toLocaleString("en-AU", { 
        style: "currency", 
        currency: "AUD" 
      });

      const message = `Hi ${client.name}, thank you for your payment of ${formattedAmount}. Invoice: ${payment.invoiceNumber || "N/A"}. Probuild PVC appreciates your business!`;

      const smsLog = await storage.createSMSLog({
        recipientPhone: client.phone,
        recipientName: client.name,
        message,
        status: "pending",
        isOutbound: true,
        relatedEntityType: "payment",
        relatedEntityId: paymentId,
      });

      try {
        const twilioMessage = await twilioClient.messages.create({
          body: message,
          from: fromNumber,
          to: client.phone,
        });

        await storage.updateSMSLog(smsLog.id, {
          twilioMessageSid: twilioMessage.sid,
          status: "sent",
          sentAt: new Date(),
        });

        res.json({ success: true, messageSid: twilioMessage.sid });
      } catch (twilioError: any) {
        await storage.updateSMSLog(smsLog.id, {
          status: "failed",
          errorMessage: twilioError.message,
        });
        throw twilioError;
      }
    } catch (error: any) {
      console.error("Error sending payment confirmation:", error);
      res.status(500).json({ error: error.message || "Failed to send confirmation" });
    }
  });

  // ============ NOTIFICATIONS ============
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId, unread } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      let notifications;
      if (unread === "true") {
        notifications = await storage.getUnreadNotifications(userId as string);
      } else {
        notifications = await storage.getNotificationsByUser(userId as string);
      }
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all notifications read" });
    }
  });

  // ============ USERS ============
  app.get("/api/users", async (req, res) => {
    try {
      const { role } = req.query;
      let userList;
      if (role) {
        userList = await storage.getUsersByRole(role as string);
      } else {
        userList = await storage.getUsers();
      }
      res.json(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ============ ACTIVITY LOGS ============
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const { userId, entityType, entityId } = req.query;
      let logs;
      if (entityType && entityId) {
        logs = await storage.getActivityLogsByEntity(entityType as string, entityId as string);
      } else if (userId) {
        logs = await storage.getActivityLogsByUser(userId as string);
      } else {
        logs = await storage.getActivityLogs();
      }
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  return httpServer;
}
