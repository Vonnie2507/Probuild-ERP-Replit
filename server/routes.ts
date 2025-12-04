import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, insertLeadSchema, insertProductSchema, 
  insertQuoteSchema, insertJobSchema, insertBOMSchema,
  insertProductionTaskSchema, insertInstallTaskSchema,
  insertScheduleEventSchema, insertPaymentSchema,
  insertFenceStyleSchema, insertNotificationSchema,
  insertSMSConversationSchema, insertMessageRangeSchema,
  insertDepartmentSchema, insertWorkflowSchema, insertWorkflowVersionSchema,
  insertPolicySchema, insertPolicyVersionSchema, insertPolicyAcknowledgementSchema,
  insertResourceSchema, insertKnowledgeArticleSchema,
  insertJobSetupDocumentSchema, insertJobSetupProductSchema,
  section1SalesSchema, section2ProductsMetaSchema, section3ProductionSchema,
  section4ScheduleSchema, section5InstallSchema
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
      const { clientName, clientPhone, clientEmail, ...leadData } = req.body;
      
      // Validate clientName is required when no existing clientId
      const trimmedName = (clientName || "").trim();
      const trimmedPhone = (clientPhone || "").trim();
      const trimmedEmail = (clientEmail || "").trim();
      
      let clientId = leadData.clientId;
      
      // Require clientName if no existing client linked
      if (!clientId && !trimmedName) {
        return res.status(400).json({ error: "Client name is required" });
      }
      
      // If client info is provided, create or find client
      if (trimmedName && !clientId) {
        // Try to find existing client by phone or email
        const allClients = await storage.getClients();
        let existingClient = null;
        
        if (trimmedPhone) {
          existingClient = allClients.find(c => c.phone === trimmedPhone);
        }
        if (!existingClient && trimmedEmail) {
          existingClient = allClients.find(c => c.email === trimmedEmail);
        }
        
        if (existingClient) {
          clientId = existingClient.id;
          // Only update if values actually changed
          const needsUpdate = existingClient.name !== trimmedName || 
              existingClient.phone !== trimmedPhone || 
              existingClient.email !== trimmedEmail;
          if (needsUpdate) {
            await storage.updateClient(existingClient.id, {
              name: trimmedName,
              phone: trimmedPhone || existingClient.phone || "",
              email: trimmedEmail || existingClient.email || "",
              address: leadData.siteAddress || existingClient.address || "",
            });
          }
        } else {
          // Create new client
          const newClient = await storage.createClient({
            name: trimmedName,
            phone: trimmedPhone,
            email: trimmedEmail,
            address: leadData.siteAddress || "",
            clientType: leadData.leadType === "trade" ? "trade" : "public",
          });
          clientId = newClient.id;
        }
      }
      
      // Build clean lead payload - only include valid lead fields
      const cleanLeadPayload = {
        source: leadData.source,
        leadType: leadData.leadType,
        description: leadData.description,
        siteAddress: leadData.siteAddress,
        stage: leadData.stage || "new",
        jobFulfillmentType: leadData.jobFulfillmentType,
        clientId,
      };
      
      const validatedData = insertLeadSchema.parse(cleanLeadPayload);
      const lead = await storage.createLead(validatedData);

      const admins = await storage.getUsersByRole("admin");
      const sales = await storage.getUsersByRole("sales");
      const notifyUsers = [...admins, ...sales];
      
      for (const user of notifyUsers) {
        await storage.createNotification({
          userId: user.id,
          type: "lead_new",
          title: "New Lead Created",
          message: lead.description || `New ${lead.leadType} lead from ${lead.source}`,
          relatedEntityType: "lead",
          relatedEntityId: lead.id,
        });
      }

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
      const { clientName, clientPhone, clientEmail, clientId: passedClientId, ...rawLeadData } = req.body;
      
      // Get existing lead to find clientId
      const existingLead = await storage.getLead(req.params.id);
      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Trim and validate client data
      const trimmedName = (clientName || "").trim();
      const trimmedPhone = (clientPhone || "").trim();
      const trimmedEmail = (clientEmail || "").trim();
      
      let newClientId: string | null = null;
      
      // If a specific client ID is passed, use that (user selected existing client)
      if (passedClientId && !existingLead.clientId) {
        newClientId = passedClientId;
        // Update the existing client's info if provided
        if (trimmedName || trimmedPhone || trimmedEmail) {
          const existingClient = await storage.getClient(passedClientId);
          if (existingClient) {
            const updates: Record<string, string> = {};
            if (trimmedName && trimmedName !== existingClient.name) updates.name = trimmedName;
            if (trimmedPhone && trimmedPhone !== (existingClient.phone || "")) updates.phone = trimmedPhone;
            if (trimmedEmail && trimmedEmail !== (existingClient.email || "")) updates.email = trimmedEmail;
            if (Object.keys(updates).length > 0) {
              await storage.updateClient(passedClientId, updates);
            }
          }
        }
      }
      // If lead has no client and client info is provided, create or find client
      else if (!existingLead.clientId && trimmedName) {
        // Try to find existing client by phone or email first
        const allClients = await storage.getClients();
        let matchingClient = null;
        
        if (trimmedPhone) {
          matchingClient = allClients.find(c => c.phone === trimmedPhone);
        }
        if (!matchingClient && trimmedEmail) {
          matchingClient = allClients.find(c => c.email === trimmedEmail);
        }
        
        if (matchingClient) {
          newClientId = matchingClient.id;
          // Update client info if different
          const needsUpdate = matchingClient.name !== trimmedName || 
              matchingClient.phone !== trimmedPhone || 
              matchingClient.email !== trimmedEmail;
          if (needsUpdate) {
            await storage.updateClient(matchingClient.id, {
              name: trimmedName,
              phone: trimmedPhone || matchingClient.phone || "",
              email: trimmedEmail || matchingClient.email || "",
              address: rawLeadData.siteAddress || matchingClient.address || "",
            });
          }
        } else {
          // Create new client
          const newClient = await storage.createClient({
            name: trimmedName,
            phone: trimmedPhone,
            email: trimmedEmail,
            address: rawLeadData.siteAddress || existingLead.siteAddress || "",
            clientType: existingLead.leadType === "trade" ? "trade" : "public",
          });
          newClientId = newClient.id;
        }
      }
      // If passed a different client ID than existing, switch to that client
      else if (passedClientId && existingLead.clientId && passedClientId !== existingLead.clientId) {
        newClientId = passedClientId;
        // Optionally update the new client's info
        if (trimmedName || trimmedPhone || trimmedEmail) {
          const existingClient = await storage.getClient(passedClientId);
          if (existingClient) {
            const updates: Record<string, string> = {};
            if (trimmedName && trimmedName !== existingClient.name) updates.name = trimmedName;
            if (trimmedPhone && trimmedPhone !== (existingClient.phone || "")) updates.phone = trimmedPhone;
            if (trimmedEmail && trimmedEmail !== (existingClient.email || "")) updates.email = trimmedEmail;
            if (Object.keys(updates).length > 0) {
              await storage.updateClient(passedClientId, updates);
            }
          }
        }
      }
      // Update client info if lead already has a client and no new clientId passed
      else if (existingLead.clientId && (trimmedName || trimmedPhone || trimmedEmail)) {
        // Fetch existing client to compare values
        const existingClient = await storage.getClient(existingLead.clientId);
        if (existingClient) {
          const updates: Record<string, string> = {};
          // Only include fields that actually changed
          if (trimmedName && trimmedName !== existingClient.name) {
            updates.name = trimmedName;
          }
          if (trimmedPhone !== undefined && trimmedPhone !== (existingClient.phone || "")) {
            updates.phone = trimmedPhone;
          }
          if (trimmedEmail !== undefined && trimmedEmail !== (existingClient.email || "")) {
            updates.email = trimmedEmail;
          }
          if (rawLeadData.siteAddress && rawLeadData.siteAddress !== (existingClient.address || "")) {
            updates.address = rawLeadData.siteAddress;
          }
          
          // Only call update if there are actual changes
          if (Object.keys(updates).length > 0) {
            await storage.updateClient(existingLead.clientId, updates);
          }
        }
      }
      
      // Build clean lead update payload - only include valid lead fields
      const cleanLeadPayload: Record<string, any> = {};
      if (rawLeadData.source !== undefined) cleanLeadPayload.source = rawLeadData.source;
      if (rawLeadData.leadType !== undefined) cleanLeadPayload.leadType = rawLeadData.leadType;
      if (rawLeadData.description !== undefined) cleanLeadPayload.description = rawLeadData.description;
      if (rawLeadData.siteAddress !== undefined) cleanLeadPayload.siteAddress = rawLeadData.siteAddress;
      if (rawLeadData.stage !== undefined) cleanLeadPayload.stage = rawLeadData.stage;
      if (rawLeadData.jobFulfillmentType !== undefined) cleanLeadPayload.jobFulfillmentType = rawLeadData.jobFulfillmentType;
      if (rawLeadData.assignedTo !== undefined) cleanLeadPayload.assignedTo = rawLeadData.assignedTo;
      if (rawLeadData.followUpDate !== undefined) cleanLeadPayload.followUpDate = rawLeadData.followUpDate;
      if (rawLeadData.notes !== undefined) cleanLeadPayload.notes = rawLeadData.notes;
      
      // Link new client if one was created
      if (newClientId) {
        cleanLeadPayload.clientId = newClientId;
      }
      
      const lead = await storage.updateLead(req.params.id, cleanLeadPayload);
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

  app.get("/api/quotes/analytics", async (req, res) => {
    try {
      const analytics = await storage.getQuoteAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching quote analytics:", error);
      res.status(500).json({ error: "Failed to fetch quote analytics" });
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

      const client = quote.clientId ? await storage.getClient(quote.clientId) : null;
      const admins = await storage.getUsersByRole("admin");
      
      for (const user of admins) {
        await storage.createNotification({
          userId: user.id,
          type: "quote_created",
          title: "New Quote Created",
          message: `Quote ${quote.quoteNumber} for ${client?.name || "Unknown client"} - $${parseFloat(quote.totalAmount || "0").toLocaleString()}`,
          relatedEntityType: "quote",
          relatedEntityId: quote.id,
        });
      }

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
      const oldQuote = await storage.getQuote(req.params.id);
      const quote = await storage.updateQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      if (oldQuote && oldQuote.status !== quote.status) {
        if (quote.status === "approved") {
          const client = quote.clientId ? await storage.getClient(quote.clientId) : null;
          const admins = await storage.getUsersByRole("admin");
          const sales = await storage.getUsersByRole("sales");
          const notifyUsers = [...admins, ...sales];
          
          for (const user of notifyUsers) {
            await storage.createNotification({
              userId: user.id,
              type: "quote_approved",
              title: "Quote Approved",
              message: `Quote ${quote.quoteNumber} approved by ${client?.name || "client"} - $${parseFloat(quote.totalAmount || "0").toLocaleString()}`,
              relatedEntityType: "quote",
              relatedEntityId: quote.id,
            });
          }
        }
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
      const jobType = req.body.jobType || "supply_install";
      const jobData = {
        jobNumber,
        clientId: quote.clientId,
        quoteId: quote.id,
        jobType: jobType,
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

      // Auto-create Job Setup Document for supply+install jobs
      if (jobType === "supply_install") {
        try {
          const setupDocument = await storage.createJobSetupDocument({
            jobId: job.id,
            jobType: jobType,
            status: "draft",
            section1Sales: {},
            section2ProductsMeta: {},
            section3Production: {},
            section4Schedule: {},
            section5Install: {},
          } as any);

          // Seed BOM products from quote line items
          if (quote.lineItems && Array.isArray(quote.lineItems) && quote.lineItems.length > 0) {
            await storage.seedJobSetupProductsFromQuote(setupDocument.id, quote.id);
          }
        } catch (setupError) {
          // Log but don't fail the job creation
          console.error("Error creating job setup document:", setupError);
        }
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
      const { status, bypassValidation } = req.body;
      const oldJob = await storage.getJob(req.params.id);
      if (!oldJob) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Validate setup document completion for supply+install jobs (unless bypassed)
      if (oldJob.jobType === "supply_install" && !bypassValidation) {
        const statusRequirements: Record<string, { sections: number[]; message: string }> = {
          "in_production": { 
            sections: [1, 2], 
            message: "Sections 1 (Sales Info) and 2 (Products) must be completed before production" 
          },
          "manufacturing_panels": { 
            sections: [1, 2], 
            message: "Sections 1 (Sales Info) and 2 (Products) must be completed before production" 
          },
          "ready_for_install": { 
            sections: [1, 2, 3, 4], 
            message: "Sections 1-4 must be completed before marking ready for install" 
          },
          "scheduled": { 
            sections: [1, 2, 3, 4], 
            message: "Sections 1-4 must be completed before scheduling" 
          },
          "installing": { 
            sections: [1, 2, 3, 4], 
            message: "Sections 1-4 must be completed before install can begin" 
          },
          "completed": { 
            sections: [1, 2, 3, 4, 5], 
            message: "All sections must be completed before marking job complete" 
          },
        };

        const requirements = statusRequirements[status];
        if (requirements) {
          const document = await storage.getJobSetupDocumentByJob(oldJob.id);
          if (!document) {
            return res.status(400).json({ 
              error: "Job setup document must be created and completed before changing status",
              requiresSetupDocument: true
            });
          }

          const incompleteSections: number[] = [];
          if (requirements.sections.includes(1) && !document.section1Complete) incompleteSections.push(1);
          if (requirements.sections.includes(2) && !document.section2Complete) incompleteSections.push(2);
          if (requirements.sections.includes(3) && !document.section3Complete) incompleteSections.push(3);
          if (requirements.sections.includes(4) && !document.section4Complete) incompleteSections.push(4);
          if (requirements.sections.includes(5) && !document.section5Complete) incompleteSections.push(5);

          if (incompleteSections.length > 0) {
            return res.status(400).json({ 
              error: requirements.message,
              incompleteSections,
              requiredSections: requirements.sections
            });
          }
        }
      }

      const job = await storage.updateJob(req.params.id, { status });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (oldJob && oldJob.status !== job.status) {
        const client = await storage.getClient(job.clientId);
        const admins = await storage.getUsersByRole("admin");
        
        const statusMessages: Record<string, { title: string; type: string }> = {
          "scheduled": { title: "Job Scheduled", type: "job_scheduled" },
          "ready_for_install": { title: "Job Ready for Installation", type: "job_ready" },
          "in_progress": { title: "Job Installation Started", type: "job_started" },
          "completed": { title: "Job Completed", type: "job_complete" },
          "manufacturing_panels": { title: "Job in Production", type: "job_production" },
        };

        const statusInfo = statusMessages[job.status];
        if (statusInfo) {
          for (const user of admins) {
            await storage.createNotification({
              userId: user.id,
              type: statusInfo.type,
              title: statusInfo.title,
              message: `${job.jobNumber} - ${client?.name || "Unknown client"} - ${job.fenceStyle || "Fence"}`,
              relatedEntityType: "job",
              relatedEntityId: job.id,
            });
          }

          if (job.assignedInstaller) {
            await storage.createNotification({
              userId: job.assignedInstaller,
              type: statusInfo.type,
              title: statusInfo.title,
              message: `${job.jobNumber} - ${job.siteAddress}`,
              relatedEntityType: "job",
              relatedEntityId: job.id,
            });
          }
        }
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
      const body = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      const validatedData = insertScheduleEventSchema.parse(body);
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
      const body = { ...req.body };
      if (body.startDate) body.startDate = new Date(body.startDate);
      if (body.endDate) body.endDate = new Date(body.endDate);
      
      const event = await storage.updateScheduleEvent(req.params.id, body);
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
      const oldPayment = await storage.getPayment(req.params.id);
      const payment = await storage.updatePayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (oldPayment && oldPayment.status !== payment.status && payment.status === "completed") {
        const client = await storage.getClient(payment.clientId);
        const admins = await storage.getUsersByRole("admin");
        const sales = await storage.getUsersByRole("sales");
        const notifyUsers = [...admins, ...sales];
        
        const formattedAmount = parseFloat(payment.amount).toLocaleString("en-AU", { 
          style: "currency", 
          currency: "AUD" 
        });

        for (const user of notifyUsers) {
          await storage.createNotification({
            userId: user.id,
            type: "payment_received",
            title: "Payment Received",
            message: `${formattedAmount} ${payment.paymentType} payment from ${client?.name || "Unknown client"}`,
            relatedEntityType: "payment",
            relatedEntityId: payment.id,
          });
        }
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

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+61' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+61' + cleaned;
    }
    return cleaned;
  };

  app.post("/api/sms/send", async (req, res) => {
    try {
      const parseResult = smsSendSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      const { to, message, recipientName, relatedEntityType, relatedEntityId } = parseResult.data;
      
      const formattedTo = formatPhoneNumber(to);

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
        console.log('Sending SMS to:', formattedTo, 'from:', fromNumber);
        const twilioMessage = await twilioClient.messages.create({
          body: message,
          from: fromNumber,
          to: formattedTo,
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

  // Webhook endpoint to receive incoming SMS from Twilio
  app.post("/api/sms/incoming", async (req, res) => {
    try {
      console.log("Incoming SMS webhook received:", req.body);
      
      // Twilio sends these fields in the webhook
      const { From, Body, MessageSid } = req.body;
      
      if (!From || !Body) {
        console.log("Missing From or Body in incoming SMS");
        return res.status(400).send("Missing required fields");
      }

      // Find client by phone number to get their name
      let recipientName = "Unknown";
      const matchingClient = await storage.findClientByPhone(From);

      if (matchingClient) {
        recipientName = matchingClient.name;
      }

      // Store the incoming message (unread by default)
      const smsLog = await storage.createSMSLog({
        recipientPhone: From,
        recipientName,
        message: Body,
        twilioMessageSid: MessageSid || null,
        status: "received",
        isOutbound: false,
        isRead: false,
        sentAt: new Date(),
        relatedEntityType: matchingClient ? "client" : null,
        relatedEntityId: matchingClient?.id || null,
      });

      // Get or create conversation and update it
      const conversation = await storage.getOrCreateConversation(From);
      
      // If conversation was resolved, unresolve it (customer replied = action required)
      // Also increment unread count
      await storage.updateSMSConversation(conversation.id, {
        isResolved: false,
        resolvedAt: null,
        resolvedBy: null,
        lastMessageAt: new Date(),
        unreadCount: (conversation.unreadCount || 0) + 1,
      });

      // Create notification for new incoming message
      await storage.createNotification({
        type: "new_message",
        title: "New SMS Message",
        message: `${recipientName}: ${Body.substring(0, 100)}${Body.length > 100 ? '...' : ''}`,
        relatedEntityType: "sms_conversation",
        relatedEntityId: conversation.id,
      });

      console.log("Incoming SMS saved:", smsLog.id, "from:", From);

      // Return TwiML response (empty response, no auto-reply)
      res.set("Content-Type", "text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (error) {
      console.error("Error processing incoming SMS:", error);
      res.status(500).send("Error processing message");
    }
  });

  // ============ SMS CONVERSATIONS ============
  
  // Get all conversations
  app.get("/api/sms/conversations", async (req, res) => {
    try {
      const conversations = await storage.getSMSConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get unread message count
  app.get("/api/sms/unread-count", async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Get conversation by ID
  app.get("/api/sms/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getSMSConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Update conversation (assign, resolve, link to client)
  app.patch("/api/sms/conversations/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        assignedTo: z.string().nullable().optional(),
        isResolved: z.boolean().optional(),
        resolvedBy: z.string().nullable().optional(),
        clientId: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const { assignedTo, isResolved, resolvedBy, clientId, notes } = validatedData;
      const updates: any = {};
      
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (clientId !== undefined) updates.clientId = clientId;
      if (notes !== undefined) updates.notes = notes;
      
      if (isResolved !== undefined) {
        updates.isResolved = isResolved;
        if (isResolved) {
          updates.resolvedAt = new Date();
          updates.resolvedBy = resolvedBy || null;
        } else {
          updates.resolvedAt = null;
          updates.resolvedBy = null;
        }
      }
      
      const conversation = await storage.updateSMSConversation(req.params.id, updates);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // Mark messages as read
  app.post("/api/sms/mark-read", async (req, res) => {
    try {
      const { messageIds, conversationId } = req.body;
      
      if (messageIds && messageIds.length > 0) {
        await storage.markMessagesRead(messageIds);
      }
      
      // Reset unread count on conversation
      if (conversationId) {
        await storage.updateSMSConversation(conversationId, { unreadCount: 0 });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // ============ MESSAGE RANGES ============
  
  // Create a message range (bundle of messages attached to an opportunity)
  app.post("/api/sms/message-ranges", async (req, res) => {
    try {
      const messageRangeInputSchema = insertMessageRangeSchema
        .omit({ messageCount: true })
        .extend({
          startDate: z.string(),
          endDate: z.string(),
        });
      
      const validatedData = messageRangeInputSchema.parse(req.body);
      const { conversationId, leadId, jobId, quoteId, startMessageId, endMessageId, startDate, endDate, summary } = validatedData;
      
      // Count messages in range
      const conversation = await storage.getSMSConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const messages = await storage.getSMSLogsByPhone(conversation.phoneNumber);
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      const messagesInRange = messages.filter(m => {
        const msgTime = new Date(m.createdAt).getTime();
        return msgTime >= startTime && msgTime <= endTime;
      });
      
      const range = await storage.createMessageRange({
        conversationId,
        leadId: leadId || null,
        jobId: jobId || null,
        quoteId: quoteId || null,
        startMessageId,
        endMessageId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        messageCount: messagesInRange.length,
        summary: summary || null,
      });
      
      res.status(201).json(range);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating message range:", error);
      res.status(500).json({ error: "Failed to create message range" });
    }
  });

  // Get message ranges by lead
  app.get("/api/sms/message-ranges/lead/:leadId", async (req, res) => {
    try {
      const ranges = await storage.getMessageRangesByLead(req.params.leadId);
      res.json(ranges);
    } catch (error) {
      console.error("Error fetching message ranges:", error);
      res.status(500).json({ error: "Failed to fetch message ranges" });
    }
  });

  // Get message ranges by job
  app.get("/api/sms/message-ranges/job/:jobId", async (req, res) => {
    try {
      const ranges = await storage.getMessageRangesByJob(req.params.jobId);
      res.json(ranges);
    } catch (error) {
      console.error("Error fetching message ranges:", error);
      res.status(500).json({ error: "Failed to fetch message ranges" });
    }
  });

  // Delete message range
  app.delete("/api/sms/message-ranges/:id", async (req, res) => {
    try {
      await storage.deleteMessageRange(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message range:", error);
      res.status(500).json({ error: "Failed to delete message range" });
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

  // ============ CSV EXPORTS ============
  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) return "";
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatCurrency = (amount: string | number | null): string => {
    if (amount === null || amount === undefined) return "$0.00";
    return `$${Number(amount).toFixed(2)}`;
  };

  app.get("/api/export/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      const clients = await storage.getClients();
      const jobs = await storage.getJobs();
      
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const jobMap = new Map(jobs.map(j => [j.id, j]));
      
      const headers = ["Invoice Number", "Client Name", "Job Number", "Amount", "Payment Type", "Payment Method", "Status", "Paid Date", "Created Date"];
      const rows = payments.map(p => {
        const client = clientMap.get(p.clientId);
        const job = p.jobId ? jobMap.get(p.jobId) : null;
        return [
          escapeCSVField(p.invoiceNumber),
          escapeCSVField(client?.name || "Unknown"),
          escapeCSVField(job?.jobNumber || ""),
          escapeCSVField(formatCurrency(p.amount)),
          escapeCSVField(p.paymentType),
          escapeCSVField(p.paymentMethod || ""),
          escapeCSVField(p.status),
          escapeCSVField(formatDate(p.paidAt)),
          escapeCSVField(formatDate(p.createdAt)),
        ].join(",");
      });
      
      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `payments-export-${new Date().toISOString().split("T")[0]}.csv`;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting payments:", error);
      res.status(500).json({ error: "Failed to export payments" });
    }
  });

  app.get("/api/export/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      
      const headers = ["SKU", "Name", "Category", "Cost Price", "Sell Price", "Stock on Hand", "Reorder Point", "Is Active"];
      const rows = products.map(p => [
        escapeCSVField(p.sku),
        escapeCSVField(p.name),
        escapeCSVField(p.category),
        escapeCSVField(formatCurrency(p.costPrice)),
        escapeCSVField(formatCurrency(p.sellPrice)),
        escapeCSVField(p.stockOnHand),
        escapeCSVField(p.reorderPoint),
        escapeCSVField(p.isActive ? "Yes" : "No"),
      ].join(","));
      
      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting products:", error);
      res.status(500).json({ error: "Failed to export products" });
    }
  });

  app.get("/api/export/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const clients = await storage.getClients();
      const users = await storage.getUsers();
      
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const headers = ["Job Number", "Client Name", "Job Type", "Site Address", "Fence Style", "Total Length (m)", "Fence Height (mm)", "Total Amount", "Deposit Paid", "Status", "Assigned Installer", "Scheduled Start", "Created Date"];
      const rows = jobs.map(j => {
        const client = clientMap.get(j.clientId);
        const installer = j.assignedInstaller ? userMap.get(j.assignedInstaller) : null;
        return [
          escapeCSVField(j.jobNumber),
          escapeCSVField(client?.name || "Unknown"),
          escapeCSVField(j.jobType),
          escapeCSVField(j.siteAddress),
          escapeCSVField(j.fenceStyle),
          escapeCSVField(j.totalLength),
          escapeCSVField(j.fenceHeight),
          escapeCSVField(formatCurrency(j.totalAmount)),
          escapeCSVField(j.depositPaid ? "Yes" : "No"),
          escapeCSVField(j.status),
          escapeCSVField(installer ? `${installer.firstName} ${installer.lastName}` : ""),
          escapeCSVField(formatDate(j.scheduledStartDate)),
          escapeCSVField(formatDate(j.createdAt)),
        ].join(",");
      });
      
      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `jobs-export-${new Date().toISOString().split("T")[0]}.csv`;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting jobs:", error);
      res.status(500).json({ error: "Failed to export jobs" });
    }
  });

  app.get("/api/export/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      
      const headers = ["Name", "Company", "Client Type", "Phone", "Email", "Address", "ABN", "Trade Discount Level", "Created Date"];
      const rows = clients.map(c => [
        escapeCSVField(c.name),
        escapeCSVField(c.companyName),
        escapeCSVField(c.clientType),
        escapeCSVField(c.phone),
        escapeCSVField(c.email),
        escapeCSVField(c.address),
        escapeCSVField(c.abn),
        escapeCSVField(c.tradeDiscountLevel),
        escapeCSVField(formatDate(c.createdAt)),
      ].join(","));
      
      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `clients-export-${new Date().toISOString().split("T")[0]}.csv`;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting clients:", error);
      res.status(500).json({ error: "Failed to export clients" });
    }
  });

  app.get("/api/export/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const clients = await storage.getClients();
      const users = await storage.getUsers();
      
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const userMap = new Map(users.map(u => [u.id, u]));
      
      const headers = ["Lead Type", "Source", "Stage", "Client Name", "Site Address", "Description", "Fence Style", "Fence Length (m)", "Assigned To", "Created Date"];
      const rows = leads.map(l => {
        const client = l.clientId ? clientMap.get(l.clientId) : null;
        const assignee = l.assignedTo ? userMap.get(l.assignedTo) : null;
        return [
          escapeCSVField(l.leadType),
          escapeCSVField(l.source),
          escapeCSVField(l.stage),
          escapeCSVField(client?.name || ""),
          escapeCSVField(l.siteAddress),
          escapeCSVField(l.description),
          escapeCSVField(l.fenceStyle),
          escapeCSVField(l.fenceLength),
          escapeCSVField(assignee ? `${assignee.firstName} ${assignee.lastName}` : ""),
          escapeCSVField(formatDate(l.createdAt)),
        ].join(",");
      });
      
      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting leads:", error);
      res.status(500).json({ error: "Failed to export leads" });
    }
  });

  // ============ QUOTE FOLLOW-UPS ============

  app.get("/api/quote-follow-ups", async (req, res) => {
    try {
      const followUps = await storage.getPendingFollowUps();
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      res.status(500).json({ error: "Failed to fetch follow-ups" });
    }
  });

  app.get("/api/quote-follow-ups/quote/:quoteId", async (req, res) => {
    try {
      const followUps = await storage.getQuoteFollowUpsByQuote(req.params.quoteId);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      res.status(500).json({ error: "Failed to fetch follow-ups" });
    }
  });

  app.post("/api/quote-follow-ups", async (req, res) => {
    try {
      const followUp = await storage.createQuoteFollowUp({
        ...req.body,
        scheduledDate: new Date(req.body.scheduledDate),
      });
      res.status(201).json(followUp);
    } catch (error) {
      console.error("Error creating follow-up:", error);
      res.status(500).json({ error: "Failed to create follow-up" });
    }
  });

  app.patch("/api/quote-follow-ups/:id", async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.scheduledDate) {
        updates.scheduledDate = new Date(updates.scheduledDate);
      }
      if (updates.completedAt) {
        updates.completedAt = new Date(updates.completedAt);
      }
      const followUp = await storage.updateQuoteFollowUp(req.params.id, updates);
      if (!followUp) {
        return res.status(404).json({ error: "Follow-up not found" });
      }
      res.json(followUp);
    } catch (error) {
      console.error("Error updating follow-up:", error);
      res.status(500).json({ error: "Failed to update follow-up" });
    }
  });

  app.delete("/api/quote-follow-ups/:id", async (req, res) => {
    try {
      await storage.deleteQuoteFollowUp(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting follow-up:", error);
      res.status(500).json({ error: "Failed to delete follow-up" });
    }
  });

  // ============ AUTOMATION CAMPAIGNS ============

  app.get("/api/automation-campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAutomationCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/automation-campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getAutomationCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/automation-campaigns", async (req, res) => {
    try {
      const campaign = await storage.createAutomationCampaign(req.body);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.patch("/api/automation-campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.updateAutomationCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/automation-campaigns/:id", async (req, res) => {
    try {
      await storage.deleteAutomationCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // ============ CAMPAIGN ENROLLMENTS ============

  app.get("/api/campaign-enrollments", async (req, res) => {
    try {
      const enrollments = await storage.getPendingEnrollments();
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  app.get("/api/campaign-enrollments/campaign/:campaignId", async (req, res) => {
    try {
      const enrollments = await storage.getCampaignEnrollmentsByCampaign(req.params.campaignId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  app.post("/api/campaign-enrollments", async (req, res) => {
    try {
      const enrollment = await storage.createCampaignEnrollment({
        ...req.body,
        scheduledSendAt: req.body.scheduledSendAt ? new Date(req.body.scheduledSendAt) : null,
      });
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ error: "Failed to create enrollment" });
    }
  });

  app.patch("/api/campaign-enrollments/:id/cancel", async (req, res) => {
    try {
      const enrollment = await storage.cancelCampaignEnrollment(req.params.id, req.body.reason || "Cancelled by user");
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }
      res.json(enrollment);
    } catch (error) {
      console.error("Error cancelling enrollment:", error);
      res.status(500).json({ error: "Failed to cancel enrollment" });
    }
  });

  // ============ PROFIT & LOSS COST TRACKING ============
  // Staff-only endpoints for job costing analysis

  // Staff Rate Cards
  app.get("/api/staff-rate-cards", async (req, res) => {
    try {
      const rateCards = await storage.getStaffRateCards();
      res.json(rateCards);
    } catch (error) {
      console.error("Error fetching rate cards:", error);
      res.status(500).json({ error: "Failed to fetch rate cards" });
    }
  });

  app.get("/api/staff-rate-cards/user/:userId", async (req, res) => {
    try {
      const rateCards = await storage.getStaffRateCardsByUser(req.params.userId);
      res.json(rateCards);
    } catch (error) {
      console.error("Error fetching rate cards:", error);
      res.status(500).json({ error: "Failed to fetch rate cards" });
    }
  });

  app.get("/api/staff-rate-cards/:id", async (req, res) => {
    try {
      const rateCard = await storage.getStaffRateCard(req.params.id);
      if (!rateCard) {
        return res.status(404).json({ error: "Rate card not found" });
      }
      res.json(rateCard);
    } catch (error) {
      console.error("Error fetching rate card:", error);
      res.status(500).json({ error: "Failed to fetch rate card" });
    }
  });

  app.post("/api/staff-rate-cards", async (req, res) => {
    try {
      const data = {
        ...req.body,
        effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : new Date(),
        effectiveUntil: req.body.effectiveUntil ? new Date(req.body.effectiveUntil) : null,
      };
      const rateCard = await storage.createStaffRateCard(data);
      res.status(201).json(rateCard);
    } catch (error) {
      console.error("Error creating rate card:", error);
      res.status(500).json({ error: "Failed to create rate card" });
    }
  });

  app.patch("/api/staff-rate-cards/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.effectiveFrom) data.effectiveFrom = new Date(data.effectiveFrom);
      if (data.effectiveUntil) data.effectiveUntil = new Date(data.effectiveUntil);
      const rateCard = await storage.updateStaffRateCard(req.params.id, data);
      if (!rateCard) {
        return res.status(404).json({ error: "Rate card not found" });
      }
      res.json(rateCard);
    } catch (error) {
      console.error("Error updating rate card:", error);
      res.status(500).json({ error: "Failed to update rate card" });
    }
  });

  app.delete("/api/staff-rate-cards/:id", async (req, res) => {
    try {
      await storage.deleteStaffRateCard(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rate card:", error);
      res.status(500).json({ error: "Failed to delete rate card" });
    }
  });

  // Quote Cost Components
  app.get("/api/quotes/:quoteId/costs", async (req, res) => {
    try {
      const components = await storage.getQuoteCostComponentsByQuote(req.params.quoteId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching cost components:", error);
      res.status(500).json({ error: "Failed to fetch cost components" });
    }
  });

  app.post("/api/quotes/:quoteId/costs", async (req, res) => {
    try {
      const component = await storage.createQuoteCostComponent({
        ...req.body,
        quoteId: req.params.quoteId,
      });
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.status(201).json(component);
    } catch (error) {
      console.error("Error creating cost component:", error);
      res.status(500).json({ error: "Failed to create cost component" });
    }
  });

  app.patch("/api/quotes/:quoteId/costs/:id", async (req, res) => {
    try {
      const component = await storage.updateQuoteCostComponent(req.params.id, req.body);
      if (!component) {
        return res.status(404).json({ error: "Cost component not found" });
      }
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json(component);
    } catch (error) {
      console.error("Error updating cost component:", error);
      res.status(500).json({ error: "Failed to update cost component" });
    }
  });

  app.delete("/api/quotes/:quoteId/costs/:id", async (req, res) => {
    try {
      await storage.deleteQuoteCostComponent(req.params.id);
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cost component:", error);
      res.status(500).json({ error: "Failed to delete cost component" });
    }
  });

  // Quote Trips
  app.get("/api/quotes/:quoteId/trips", async (req, res) => {
    try {
      const trips = await storage.getQuoteTripsByQuote(req.params.quoteId);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.post("/api/quotes/:quoteId/trips", async (req, res) => {
    try {
      const trip = await storage.createQuoteTrip({
        ...req.body,
        quoteId: req.params.quoteId,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : null,
      });
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.status(201).json(trip);
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  app.patch("/api/quotes/:quoteId/trips/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
      const trip = await storage.updateQuoteTrip(req.params.id, data);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json(trip);
    } catch (error) {
      console.error("Error updating trip:", error);
      res.status(500).json({ error: "Failed to update trip" });
    }
  });

  app.delete("/api/quotes/:quoteId/trips/:id", async (req, res) => {
    try {
      await storage.deleteQuoteTrip(req.params.id);
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trip:", error);
      res.status(500).json({ error: "Failed to delete trip" });
    }
  });

  // Quote Admin Time
  app.get("/api/quotes/:quoteId/admin-time", async (req, res) => {
    try {
      const adminTime = await storage.getQuoteAdminTimeByQuote(req.params.quoteId);
      res.json(adminTime);
    } catch (error) {
      console.error("Error fetching admin time:", error);
      res.status(500).json({ error: "Failed to fetch admin time" });
    }
  });

  app.post("/api/quotes/:quoteId/admin-time", async (req, res) => {
    try {
      const adminTime = await storage.createQuoteAdminTime({
        ...req.body,
        quoteId: req.params.quoteId,
      });
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.status(201).json(adminTime);
    } catch (error) {
      console.error("Error creating admin time:", error);
      res.status(500).json({ error: "Failed to create admin time" });
    }
  });

  app.patch("/api/quotes/:quoteId/admin-time/:id", async (req, res) => {
    try {
      const adminTime = await storage.updateQuoteAdminTime(req.params.id, req.body);
      if (!adminTime) {
        return res.status(404).json({ error: "Admin time not found" });
      }
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json(adminTime);
    } catch (error) {
      console.error("Error updating admin time:", error);
      res.status(500).json({ error: "Failed to update admin time" });
    }
  });

  app.delete("/api/quotes/:quoteId/admin-time/:id", async (req, res) => {
    try {
      await storage.deleteQuoteAdminTime(req.params.id);
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting admin time:", error);
      res.status(500).json({ error: "Failed to delete admin time" });
    }
  });

  // Travel Sessions (for real-time tracking)
  app.get("/api/trips/:tripId/travel-sessions", async (req, res) => {
    try {
      const sessions = await storage.getTravelSessionsByTrip(req.params.tripId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching travel sessions:", error);
      res.status(500).json({ error: "Failed to fetch travel sessions" });
    }
  });

  app.get("/api/travel-sessions/active", async (req, res) => {
    try {
      const sessions = await storage.getActiveTravelSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  app.post("/api/trips/:tripId/travel-sessions/start", async (req, res) => {
    try {
      const session = await storage.createTravelSession({
        tripId: req.params.tripId,
        staffId: req.body.staffId,
        clientId: req.body.clientId,
        startLatitude: req.body.startLatitude,
        startLongitude: req.body.startLongitude,
        startedAt: new Date(),
        status: 'in_transit',
        estimatedArrivalTime: req.body.estimatedArrivalTime ? new Date(req.body.estimatedArrivalTime) : null,
      });
      
      // Optional: Send SMS notification to client
      if (req.body.notifyClient && req.body.clientPhone) {
        const twilio = await getTwilioClient();
        if (twilio) {
          try {
            const fromPhone = await getTwilioFromPhoneNumber();
            await twilio.messages.create({
              body: `Probuild PVC: Our team is now on their way to your site. Estimated arrival time: ${req.body.etaMinutes || 30} minutes.`,
              from: fromPhone || '',
              to: req.body.clientPhone,
            });
            // Update session with notification info
            await storage.updateTravelSession(session.id, {
              clientNotificationSent: true,
              clientNotificationSentAt: new Date(),
            });
          } catch (smsError) {
            console.error("Failed to send travel notification SMS:", smsError);
          }
        }
      }
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Error starting travel session:", error);
      res.status(500).json({ error: "Failed to start travel session" });
    }
  });

  app.patch("/api/travel-sessions/:id/arrive", async (req, res) => {
    try {
      const session = await storage.updateTravelSession(req.params.id, {
        endLatitude: req.body.endLatitude,
        endLongitude: req.body.endLongitude,
        actualArrivalTime: new Date(),
        status: 'arrived',
        completedAt: new Date(),
      });
      
      if (!session) {
        return res.status(404).json({ error: "Travel session not found" });
      }
      
      // Update trip totals if duration/distance provided
      if (session.tripId && (req.body.durationMinutes || req.body.distanceKm)) {
        const trip = await storage.getQuoteTrip(session.tripId);
        if (trip) {
          await storage.updateQuoteTrip(session.tripId, {
            durationMinutes: req.body.durationMinutes || trip.durationMinutes,
            distanceKm: req.body.distanceKm?.toString() || trip.distanceKm,
          });
          
          // Recalculate P&L if we have a quoteId
          if (trip.quoteId) {
            await storage.recalculateQuotePLSummary(trip.quoteId);
          }
        }
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error completing travel session:", error);
      res.status(500).json({ error: "Failed to complete travel session" });
    }
  });

  // Quote Ground Conditions
  app.get("/api/quotes/:quoteId/ground-conditions", async (req, res) => {
    try {
      const conditions = await storage.getQuoteGroundConditionsByQuote(req.params.quoteId);
      res.json(conditions);
    } catch (error) {
      console.error("Error fetching ground conditions:", error);
      res.status(500).json({ error: "Failed to fetch ground conditions" });
    }
  });

  app.post("/api/quotes/:quoteId/ground-conditions", async (req, res) => {
    try {
      const condition = await storage.createQuoteGroundCondition({
        ...req.body,
        quoteId: req.params.quoteId,
      });
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.status(201).json(condition);
    } catch (error) {
      console.error("Error creating ground condition:", error);
      res.status(500).json({ error: "Failed to create ground condition" });
    }
  });

  app.patch("/api/quotes/:quoteId/ground-conditions/:id", async (req, res) => {
    try {
      const condition = await storage.updateQuoteGroundCondition(req.params.id, req.body);
      if (!condition) {
        return res.status(404).json({ error: "Ground condition not found" });
      }
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json(condition);
    } catch (error) {
      console.error("Error updating ground condition:", error);
      res.status(500).json({ error: "Failed to update ground condition" });
    }
  });

  app.delete("/api/quotes/:quoteId/ground-conditions/:id", async (req, res) => {
    try {
      await storage.deleteQuoteGroundCondition(req.params.id);
      // Recalculate summary
      await storage.recalculateQuotePLSummary(req.params.quoteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ground condition:", error);
      res.status(500).json({ error: "Failed to delete ground condition" });
    }
  });

  // Quote P&L Summary
  app.get("/api/quotes/:quoteId/pl-summary", async (req, res) => {
    try {
      let summary = await storage.getQuotePLSummaryByQuote(req.params.quoteId);
      
      // If no summary exists, calculate it
      if (!summary) {
        summary = await storage.recalculateQuotePLSummary(req.params.quoteId);
      }
      
      if (!summary) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching P&L summary:", error);
      res.status(500).json({ error: "Failed to fetch P&L summary" });
    }
  });

  app.post("/api/quotes/:quoteId/pl-summary/recalculate", async (req, res) => {
    try {
      const summary = await storage.recalculateQuotePLSummary(req.params.quoteId);
      if (!summary) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(summary);
    } catch (error) {
      console.error("Error recalculating P&L:", error);
      res.status(500).json({ error: "Failed to recalculate P&L" });
    }
  });

  // Job-based P&L (for completed jobs)
  app.get("/api/jobs/:jobId/costs", async (req, res) => {
    try {
      const components = await storage.getQuoteCostComponentsByJob(req.params.jobId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching job costs:", error);
      res.status(500).json({ error: "Failed to fetch job costs" });
    }
  });

  app.get("/api/jobs/:jobId/trips", async (req, res) => {
    try {
      const trips = await storage.getQuoteTripsByJob(req.params.jobId);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching job trips:", error);
      res.status(500).json({ error: "Failed to fetch job trips" });
    }
  });

  app.get("/api/jobs/:jobId/admin-time", async (req, res) => {
    try {
      const adminTime = await storage.getQuoteAdminTimeByJob(req.params.jobId);
      res.json(adminTime);
    } catch (error) {
      console.error("Error fetching job admin time:", error);
      res.status(500).json({ error: "Failed to fetch job admin time" });
    }
  });

  app.get("/api/jobs/:jobId/pl-summary", async (req, res) => {
    try {
      const summary = await storage.getQuotePLSummaryByJob(req.params.jobId);
      if (!summary) {
        return res.status(404).json({ error: "P&L summary not found for this job" });
      }
      res.json(summary);
    } catch (error) {
      console.error("Error fetching job P&L summary:", error);
      res.status(500).json({ error: "Failed to fetch job P&L summary" });
    }
  });

  // ============================================
  // ORGANISATION HUB
  // ============================================

  // ============ DEPARTMENTS ============
  app.get("/api/organisation/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/organisation/departments/:id", async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      console.error("Error fetching department:", error);
      res.status(500).json({ error: "Failed to fetch department" });
    }
  });

  app.post("/api/organisation/departments", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.managerUserId === "") data.managerUserId = null;
      const validatedData = insertDepartmentSchema.parse(data);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating department:", error);
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  app.patch("/api/organisation/departments/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.managerUserId === "") data.managerUserId = null;
      const validatedData = insertDepartmentSchema.partial().parse(data);
      const department = await storage.updateDepartment(req.params.id, validatedData);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating department:", error);
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  app.delete("/api/organisation/departments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDepartment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  });

  // ============ WORKFLOWS ============
  app.get("/api/organisation/workflows", async (req, res) => {
    try {
      const { department, category, status } = req.query;
      let workflowList;
      if (department) {
        workflowList = await storage.getWorkflowsByDepartment(department as string);
      } else if (category) {
        workflowList = await storage.getWorkflowsByCategory(category as string);
      } else if (status === 'active') {
        workflowList = await storage.getActiveWorkflows();
      } else {
        workflowList = await storage.getWorkflows();
      }
      res.json(workflowList);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.get("/api/organisation/workflows/:id", async (req, res) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  app.post("/api/organisation/workflows", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertWorkflowSchema.parse(data);
      const workflow = await storage.createWorkflow(validatedData);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.patch("/api/organisation/workflows/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertWorkflowSchema.partial().parse(data);
      const workflow = await storage.updateWorkflow(req.params.id, validatedData);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  app.delete("/api/organisation/workflows/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWorkflow(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  // Workflow Versions
  app.get("/api/organisation/workflows/:workflowId/versions", async (req, res) => {
    try {
      const versions = await storage.getWorkflowVersionsByWorkflow(req.params.workflowId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching workflow versions:", error);
      res.status(500).json({ error: "Failed to fetch workflow versions" });
    }
  });

  app.get("/api/organisation/workflows/:workflowId/versions/latest", async (req, res) => {
    try {
      const version = await storage.getLatestWorkflowVersion(req.params.workflowId);
      if (!version) {
        return res.status(404).json({ error: "No versions found" });
      }
      res.json(version);
    } catch (error) {
      console.error("Error fetching latest workflow version:", error);
      res.status(500).json({ error: "Failed to fetch latest version" });
    }
  });

  app.post("/api/organisation/workflows/:workflowId/versions", async (req, res) => {
    try {
      const validatedData = insertWorkflowVersionSchema.parse({
        ...req.body,
        workflowId: req.params.workflowId
      });
      const version = await storage.createWorkflowVersion(validatedData);
      res.status(201).json(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating workflow version:", error);
      res.status(500).json({ error: "Failed to create workflow version" });
    }
  });

  // ============ POLICIES ============
  app.get("/api/organisation/policies", async (req, res) => {
    try {
      const { department, category, status } = req.query;
      let policyList;
      if (department) {
        policyList = await storage.getPoliciesByDepartment(department as string);
      } else if (category) {
        policyList = await storage.getPoliciesByCategory(category as string);
      } else if (status === 'active') {
        policyList = await storage.getActivePolicies();
      } else {
        policyList = await storage.getPolicies();
      }
      res.json(policyList);
    } catch (error) {
      console.error("Error fetching policies:", error);
      res.status(500).json({ error: "Failed to fetch policies" });
    }
  });

  app.get("/api/organisation/policies/:id", async (req, res) => {
    try {
      const policy = await storage.getPolicy(req.params.id);
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      console.error("Error fetching policy:", error);
      res.status(500).json({ error: "Failed to fetch policy" });
    }
  });

  app.post("/api/organisation/policies", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertPolicySchema.parse(data);
      const policy = await storage.createPolicy(validatedData);
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating policy:", error);
      res.status(500).json({ error: "Failed to create policy" });
    }
  });

  app.patch("/api/organisation/policies/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertPolicySchema.partial().parse(data);
      const policy = await storage.updatePolicy(req.params.id, validatedData);
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating policy:", error);
      res.status(500).json({ error: "Failed to update policy" });
    }
  });

  app.delete("/api/organisation/policies/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePolicy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting policy:", error);
      res.status(500).json({ error: "Failed to delete policy" });
    }
  });

  // Policy Versions
  app.get("/api/organisation/policies/:policyId/versions", async (req, res) => {
    try {
      const versions = await storage.getPolicyVersionsByPolicy(req.params.policyId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching policy versions:", error);
      res.status(500).json({ error: "Failed to fetch policy versions" });
    }
  });

  app.get("/api/organisation/policies/:policyId/versions/latest", async (req, res) => {
    try {
      const version = await storage.getLatestPolicyVersion(req.params.policyId);
      if (!version) {
        return res.status(404).json({ error: "No versions found" });
      }
      res.json(version);
    } catch (error) {
      console.error("Error fetching latest policy version:", error);
      res.status(500).json({ error: "Failed to fetch latest version" });
    }
  });

  app.post("/api/organisation/policies/:policyId/versions", async (req, res) => {
    try {
      const validatedData = insertPolicyVersionSchema.parse({
        ...req.body,
        policyId: req.params.policyId
      });
      const version = await storage.createPolicyVersion(validatedData);
      res.status(201).json(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating policy version:", error);
      res.status(500).json({ error: "Failed to create policy version" });
    }
  });

  // Policy Acknowledgements
  app.get("/api/organisation/policies/:policyId/acknowledgements", async (req, res) => {
    try {
      const acknowledgements = await storage.getPolicyAcknowledgementsByPolicy(req.params.policyId);
      res.json(acknowledgements);
    } catch (error) {
      console.error("Error fetching acknowledgements:", error);
      res.status(500).json({ error: "Failed to fetch acknowledgements" });
    }
  });

  app.post("/api/organisation/policies/:policyId/acknowledge", async (req, res) => {
    try {
      const { userId, policyVersionId } = req.body;
      if (!userId || !policyVersionId) {
        return res.status(400).json({ error: "userId and policyVersionId are required" });
      }
      
      const alreadyAcknowledged = await storage.hasUserAcknowledgedPolicy(userId, policyVersionId);
      if (alreadyAcknowledged) {
        return res.status(400).json({ error: "Policy already acknowledged" });
      }
      
      const acknowledgement = await storage.createPolicyAcknowledgement({
        policyId: req.params.policyId,
        policyVersionId,
        userId
      });
      res.status(201).json(acknowledgement);
    } catch (error) {
      console.error("Error creating acknowledgement:", error);
      res.status(500).json({ error: "Failed to create acknowledgement" });
    }
  });

  app.get("/api/organisation/users/:userId/acknowledgements", async (req, res) => {
    try {
      const acknowledgements = await storage.getPolicyAcknowledgementsByUser(req.params.userId);
      res.json(acknowledgements);
    } catch (error) {
      console.error("Error fetching user acknowledgements:", error);
      res.status(500).json({ error: "Failed to fetch user acknowledgements" });
    }
  });

  // ============ RESOURCES ============
  app.get("/api/organisation/resources", async (req, res) => {
    try {
      const { department, search } = req.query;
      let resourceList;
      if (search) {
        resourceList = await storage.searchResources(search as string);
      } else if (department) {
        resourceList = await storage.getResourcesByDepartment(department as string);
      } else {
        resourceList = await storage.getResources();
      }
      res.json(resourceList);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.get("/api/organisation/resources/:id", async (req, res) => {
    try {
      const resource = await storage.getResource(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }
      res.json(resource);
    } catch (error) {
      console.error("Error fetching resource:", error);
      res.status(500).json({ error: "Failed to fetch resource" });
    }
  });

  app.post("/api/organisation/resources", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertResourceSchema.parse(data);
      const resource = await storage.createResource(validatedData);
      res.status(201).json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating resource:", error);
      res.status(500).json({ error: "Failed to create resource" });
    }
  });

  app.patch("/api/organisation/resources/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertResourceSchema.partial().parse(data);
      const resource = await storage.updateResource(req.params.id, validatedData);
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }
      res.json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating resource:", error);
      res.status(500).json({ error: "Failed to update resource" });
    }
  });

  app.delete("/api/organisation/resources/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteResource(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Resource not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ error: "Failed to delete resource" });
    }
  });

  // ============ KNOWLEDGE ARTICLES ============
  app.get("/api/organisation/knowledge", async (req, res) => {
    try {
      const { department, search, published } = req.query;
      let articleList;
      if (search) {
        articleList = await storage.searchKnowledgeArticles(search as string);
      } else if (department) {
        articleList = await storage.getKnowledgeArticlesByDepartment(department as string);
      } else if (published === 'true') {
        articleList = await storage.getPublishedKnowledgeArticles();
      } else {
        articleList = await storage.getKnowledgeArticles();
      }
      res.json(articleList);
    } catch (error) {
      console.error("Error fetching knowledge articles:", error);
      res.status(500).json({ error: "Failed to fetch knowledge articles" });
    }
  });

  app.get("/api/organisation/knowledge/:id", async (req, res) => {
    try {
      const article = await storage.getKnowledgeArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.get("/api/organisation/knowledge/slug/:slug", async (req, res) => {
    try {
      const article = await storage.getKnowledgeArticleBySlug(req.params.slug);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching article by slug:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.post("/api/organisation/knowledge", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertKnowledgeArticleSchema.parse(data);
      const article = await storage.createKnowledgeArticle(validatedData);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating article:", error);
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  app.patch("/api/organisation/knowledge/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.departmentId === "") data.departmentId = null;
      const validatedData = insertKnowledgeArticleSchema.partial().parse(data);
      const article = await storage.updateKnowledgeArticle(req.params.id, validatedData);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating article:", error);
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  app.delete("/api/organisation/knowledge/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteKnowledgeArticle(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  // ============ JOB SETUP DOCUMENTS ============

  // Get all job setup documents
  app.get("/api/job-setup-documents", async (req, res) => {
    try {
      const { status } = req.query;
      let documents;
      if (status && typeof status === "string") {
        documents = await storage.getJobSetupDocumentsByStatus(status);
      } else {
        documents = await storage.getJobSetupDocuments();
      }
      res.json(documents);
    } catch (error) {
      console.error("Error fetching job setup documents:", error);
      res.status(500).json({ error: "Failed to fetch job setup documents" });
    }
  });

  // Get a specific job setup document by ID
  app.get("/api/job-setup-documents/:id", async (req, res) => {
    try {
      const document = await storage.getJobSetupDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching job setup document:", error);
      res.status(500).json({ error: "Failed to fetch job setup document" });
    }
  });

  // Get job setup document by job ID (auto-creates for supply_install jobs if not exists)
  app.get("/api/jobs/:jobId/setup-document", async (req, res) => {
    try {
      let document = await storage.getJobSetupDocumentByJob(req.params.jobId);
      
      // If no document exists, auto-create one for supply_install jobs
      if (!document) {
        const job = await storage.getJob(req.params.jobId);
        if (!job) {
          return res.status(404).json({ error: "Job not found" });
        }
        
        if (job.jobType === "supply_install") {
          // Auto-create the setup document
          document = await storage.createJobSetupDocument({
            jobId: job.id,
            quoteId: job.quoteId,
            jobType: job.jobType,
            status: "in_progress",
            section1Sales: {},
            section2ProductsMeta: { autoPopulatedFromQuote: false },
            section3Production: {},
            section4Schedule: {},
            section5Install: {},
            section1Complete: false,
            section2Complete: false,
            section3Complete: false,
            section4Complete: false,
            section5Complete: false,
          } as any);
          
          // If there's a quote, seed products from it
          if (job.quoteId) {
            await storage.seedJobSetupProductsFromQuote(document.id, job.quoteId);
            // Update meta to indicate auto-population
            document = await storage.updateJobSetupDocument(document.id, {
              section2ProductsMeta: { autoPopulatedFromQuote: true }
            });
          }
        } else {
          return res.status(404).json({ error: "Job setup document not found" });
        }
      }
      
      // Also fetch the products for this document
      const products = await storage.getJobSetupProductsByDocument(document!.id);
      res.json({ ...document, products });
    } catch (error) {
      console.error("Error fetching job setup document:", error);
      res.status(500).json({ error: "Failed to fetch job setup document" });
    }
  });

  // Create a new job setup document
  app.post("/api/job-setup-documents", async (req, res) => {
    try {
      const validatedData = insertJobSetupDocumentSchema.parse(req.body);
      const document = await storage.createJobSetupDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating job setup document:", error);
      res.status(500).json({ error: "Failed to create job setup document" });
    }
  });

  // Update a job setup document
  app.patch("/api/job-setup-documents/:id", async (req, res) => {
    try {
      const validatedData = insertJobSetupDocumentSchema.partial().parse(req.body);
      const document = await storage.updateJobSetupDocument(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating job setup document:", error);
      res.status(500).json({ error: "Failed to update job setup document" });
    }
  });

  // Delete a job setup document
  app.delete("/api/job-setup-documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteJobSetupDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting job setup document:", error);
      res.status(500).json({ error: "Failed to delete job setup document" });
    }
  });

  // ============ JOB SETUP SECTIONS ============

  // Update Section 1 (Sales Info)
  app.patch("/api/job-setup-documents/:id/section1", async (req, res) => {
    try {
      const validatedData = section1SalesSchema.parse(req.body);
      const document = await storage.updateJobSetupSection1(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating section 1:", error);
      res.status(500).json({ error: "Failed to update section 1" });
    }
  });

  // Update Section 2 Meta (Products metadata)
  app.patch("/api/job-setup-documents/:id/section2-meta", async (req, res) => {
    try {
      const validatedData = section2ProductsMetaSchema.parse(req.body);
      const document = await storage.updateJobSetupSection2Meta(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating section 2 meta:", error);
      res.status(500).json({ error: "Failed to update section 2 meta" });
    }
  });

  // Update Section 3 (Production)
  app.patch("/api/job-setup-documents/:id/section3", async (req, res) => {
    try {
      const validatedData = section3ProductionSchema.parse(req.body);
      const document = await storage.updateJobSetupSection3(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating section 3:", error);
      res.status(500).json({ error: "Failed to update section 3" });
    }
  });

  // Update Section 4 (Schedule)
  app.patch("/api/job-setup-documents/:id/section4", async (req, res) => {
    try {
      const validatedData = section4ScheduleSchema.parse(req.body);
      const document = await storage.updateJobSetupSection4(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating section 4:", error);
      res.status(500).json({ error: "Failed to update section 4" });
    }
  });

  // Update Section 5 (Install Notes)
  app.patch("/api/job-setup-documents/:id/section5", async (req, res) => {
    try {
      const validatedData = section5InstallSchema.parse(req.body);
      const document = await storage.updateJobSetupSection5(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating section 5:", error);
      res.status(500).json({ error: "Failed to update section 5" });
    }
  });

  // Mark section as complete/incomplete
  app.post("/api/job-setup-documents/:id/section/:sectionNumber/complete", async (req, res) => {
    try {
      const sectionNumber = parseInt(req.params.sectionNumber);
      if (sectionNumber < 1 || sectionNumber > 5) {
        return res.status(400).json({ error: "Invalid section number. Must be 1-5" });
      }
      const { complete } = req.body;
      if (typeof complete !== "boolean") {
        return res.status(400).json({ error: "complete field must be a boolean" });
      }
      const document = await storage.markSectionComplete(req.params.id, sectionNumber as 1 | 2 | 3 | 4 | 5, complete);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error marking section complete:", error);
      res.status(500).json({ error: "Failed to mark section complete" });
    }
  });

  // Recalculate document status
  app.post("/api/job-setup-documents/:id/recalculate-status", async (req, res) => {
    try {
      const document = await storage.recalculateDocumentStatus(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Job setup document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error recalculating status:", error);
      res.status(500).json({ error: "Failed to recalculate status" });
    }
  });

  // ============ JOB SETUP PRODUCTS ============

  // Get products for a document
  app.get("/api/job-setup-documents/:id/products", async (req, res) => {
    try {
      const products = await storage.getJobSetupProductsByDocument(req.params.id);
      res.json(products);
    } catch (error) {
      console.error("Error fetching job setup products:", error);
      res.status(500).json({ error: "Failed to fetch job setup products" });
    }
  });

  // Add a product to a document
  app.post("/api/job-setup-documents/:documentId/products", async (req, res) => {
    try {
      const data = { ...req.body, jobSetupDocumentId: req.params.documentId };
      // Convert empty strings to null for optional FK fields
      if (data.productId === "") data.productId = null;
      if (data.addedBy === "") data.addedBy = null;
      if (data.sourceQuoteLineId === "") data.sourceQuoteLineId = null;
      const validatedData = insertJobSetupProductSchema.parse(data);
      const product = await storage.createJobSetupProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating job setup product:", error);
      res.status(500).json({ error: "Failed to create job setup product" });
    }
  });

  // Update a product
  app.patch("/api/job-setup-products/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      // Convert empty strings to null for optional FK fields
      if (data.productId === "") data.productId = null;
      if (data.addedBy === "") data.addedBy = null;
      if (data.sourceQuoteLineId === "") data.sourceQuoteLineId = null;
      const validatedData = insertJobSetupProductSchema.partial().parse(data);
      const product = await storage.updateJobSetupProduct(req.params.id, validatedData);
      if (!product) {
        return res.status(404).json({ error: "Job setup product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating job setup product:", error);
      res.status(500).json({ error: "Failed to update job setup product" });
    }
  });

  // Delete a product
  app.delete("/api/job-setup-products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteJobSetupProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Job setup product not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting job setup product:", error);
      res.status(500).json({ error: "Failed to delete job setup product" });
    }
  });

  // Seed products from quote
  app.post("/api/job-setup-documents/:id/seed-from-quote", async (req, res) => {
    try {
      const { quoteId } = req.body;
      if (!quoteId) {
        return res.status(400).json({ error: "quoteId is required" });
      }
      const products = await storage.seedJobSetupProductsFromQuote(req.params.id, quoteId);
      res.json({ products, count: products.length });
    } catch (error) {
      console.error("Error seeding products from quote:", error);
      res.status(500).json({ error: "Failed to seed products from quote" });
    }
  });

  // Validate if job can transition to a new status (based on setup document completion)
  app.get("/api/jobs/:jobId/validate-status-change", async (req, res) => {
    try {
      const { newStatus } = req.query;
      if (!newStatus || typeof newStatus !== "string") {
        return res.status(400).json({ error: "newStatus query parameter is required" });
      }

      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Only supply+install jobs require setup document validation
      if (job.jobType === "supply_only") {
        return res.json({ valid: true, message: "Supply only job - no validation required" });
      }

      const document = await storage.getJobSetupDocumentByJob(req.params.jobId);
      if (!document) {
        // If transitioning to any status beyond 'pending', need document
        const blockedStatuses = ["awaiting_deposit", "in_production", "ready_for_install", "scheduled", "installing", "completed"];
        if (blockedStatuses.includes(newStatus)) {
          return res.json({ 
            valid: false, 
            message: "Job setup document must be created before changing status",
            requiredSections: []
          });
        }
        return res.json({ valid: true, message: "Status change allowed" });
      }

      // Define required sections for each status transition
      const statusRequirements: Record<string, { sections: number[]; message: string }> = {
        "in_production": { 
          sections: [1, 2], 
          message: "Section 1 (Sales Info) and Section 2 (Products) must be completed before production" 
        },
        "ready_for_install": { 
          sections: [1, 2, 3, 4], 
          message: "Sections 1-4 must be completed before marking ready for install" 
        },
        "scheduled": { 
          sections: [1, 2, 3, 4], 
          message: "Sections 1-4 must be completed before scheduling" 
        },
        "installing": { 
          sections: [1, 2, 3, 4], 
          message: "Sections 1-4 must be completed before install can begin" 
        },
        "completed": { 
          sections: [1, 2, 3, 4, 5], 
          message: "All sections must be completed before marking job complete" 
        },
      };

      const requirements = statusRequirements[newStatus];
      if (!requirements) {
        return res.json({ valid: true, message: "Status change allowed" });
      }

      // Check which sections are not complete
      const incompleteSections: number[] = [];
      if (requirements.sections.includes(1) && !document.section1Complete) incompleteSections.push(1);
      if (requirements.sections.includes(2) && !document.section2Complete) incompleteSections.push(2);
      if (requirements.sections.includes(3) && !document.section3Complete) incompleteSections.push(3);
      if (requirements.sections.includes(4) && !document.section4Complete) incompleteSections.push(4);
      if (requirements.sections.includes(5) && !document.section5Complete) incompleteSections.push(5);

      if (incompleteSections.length > 0) {
        return res.json({ 
          valid: false, 
          message: requirements.message,
          requiredSections: requirements.sections,
          incompleteSections
        });
      }

      return res.json({ valid: true, message: "Status change allowed" });
    } catch (error) {
      console.error("Error validating status change:", error);
      res.status(500).json({ error: "Failed to validate status change" });
    }
  });

  return httpServer;
}
