import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
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
  section4ScheduleSchema, section5InstallSchema,
  insertLiveDocumentTemplateSchema,
  insertLeadActivitySchema, insertLeadTaskSchema,
  type User
} from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { getTwilioClient, getTwilioFromPhoneNumber, makeOutboundCall, generateTwimlForInbound, generateTwimlForOutbound, getCallRecording, generateVoiceToken, isVoiceSdkConfigured } from "./twilio";
import { processTranscriptUpdate, generateSuggestedResponse } from "./coaching";
import { initializeMediaStreamServer } from "./deepgram";

type UserRole = "admin" | "sales" | "scheduler" | "production_manager" | "warehouse" | "installer" | "trade_client";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userRole = req.session.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    next();
  };
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-04-30.basil" as any,
    })
  : null;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============ HEALTH CHECK ============
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service: "Probuild ERP"
    });
  });

  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: "connected",
      service: "Probuild ERP"
    });
  });
  
  // ============ AUTHENTICATION ============
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: "Account is inactive" });
      }
      
      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const sessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        positionTitle: user.positionTitle,
        profilePhotoUrl: user.profilePhotoUrl,
      };
      
      req.session.userId = user.id;
      req.session.user = sessionUser;
      
      res.json({ user: sessionUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error during login:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  
  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
  
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Session invalid" });
    }
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        positionTitle: user.positionTitle,
        profilePhotoUrl: user.profilePhotoUrl,
      }
    });
  });

  // ============ PERSONAL DASHBOARD ============
  app.get("/api/my-dashboard", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const [myTasks, myNotifications, leaveBalance, roleKpis] = await Promise.all([
        storage.getTasksAssignedToUser(userId),
        storage.getNotificationsByUser(userId),
        storage.getStaffLeaveBalance(userId),
        storage.getRoleBasedKpis(user.role, userId),
      ]);
      
      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          positionTitle: user.positionTitle,
          profilePhotoUrl: user.profilePhotoUrl,
        },
        tasks: myTasks,
        notifications: myNotifications,
        leaveBalance: leaveBalance || { 
          annualLeaveBalanceHours: "0", 
          sickLeaveBalanceHours: "0" 
        },
        kpis: roleKpis,
      });
    } catch (error) {
      console.error("Error fetching personal dashboard:", error);
      res.status(500).json({ error: "Failed to fetch personal dashboard" });
    }
  });

  // ============ DASHBOARD ============
  app.get("/api/dashboard/stats", requireRoles("admin"), async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ============ WEATHER (WA LOCATIONS) ============
  const waLocations: Record<string, { name: string; lat: number; lon: number }> = {
    malaga: { name: "Malaga", lat: -31.8583, lon: 115.8978 },
    perth: { name: "Perth CBD", lat: -31.9523, lon: 115.8613 },
    rockingham: { name: "Rockingham", lat: -32.2769, lon: 115.7294 },
    quinns: { name: "Quinns Rock", lat: -31.6722, lon: 115.7011 },
  };

  app.get("/api/weather/:location", async (req, res) => {
    try {
      const locationKey = req.params.location.toLowerCase();
      const location = waLocations[locationKey] || waLocations.malaga;
      
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Australia%2FPerth`;
      
      const response = await fetch(weatherUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      
      const data = await response.json();
      
      // Map weather codes to conditions
      const weatherCodeMap: Record<number, string> = {
        0: "Clear",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Foggy",
        51: "Light Drizzle",
        53: "Drizzle",
        55: "Heavy Drizzle",
        61: "Light Rain",
        63: "Rain",
        65: "Heavy Rain",
        71: "Light Snow",
        73: "Snow",
        75: "Heavy Snow",
        80: "Light Showers",
        81: "Showers",
        82: "Heavy Showers",
        95: "Thunderstorm",
        96: "Thunderstorm",
        99: "Thunderstorm",
      };
      
      const weatherCode = data.current?.weather_code || 0;
      const condition = weatherCodeMap[weatherCode] || "Clear";
      
      const weatherData = {
        location: location.name,
        temperature: Math.round(data.current?.temperature_2m || 25),
        condition,
        minTemp: Math.round(data.daily?.temperature_2m_min?.[0] || 18),
        maxTemp: Math.round(data.daily?.temperature_2m_max?.[0] || 30),
        humidity: Math.round(data.current?.relative_humidity_2m || 50),
      };
      
      res.json(weatherData);
    } catch (error) {
      console.error("Error fetching weather:", error);
      // Return fallback data if API fails
      res.json({
        location: "Malaga",
        temperature: 25,
        condition: "Unable to fetch",
        minTemp: 18,
        maxTemp: 30,
        humidity: 50,
      });
    }
  });

  // Get available weather locations
  app.get("/api/weather-locations", (req, res) => {
    res.json(Object.entries(waLocations).map(([key, val]) => ({
      id: key,
      name: val.name,
    })));
  });

  // ============ SOIL DATA ============
  // Perth Coastal Limestone Zone Detection (Tamala Limestone Formation)
  // This limestone belt runs along Perth's coast from Yanchep to Mandurah
  function isInPerthLimestoneZone(lat: number, lng: number): { inZone: boolean; zoneName: string | null } {
    // Perth metro area bounds with limestone
    const PERTH_LAT_MIN = -32.6;  // South of Mandurah
    const PERTH_LAT_MAX = -31.4;  // North of Yanchep
    const COAST_LNG = 115.75;     // Approximate coastline longitude
    const LIMESTONE_INLAND_EXTENT = 0.12; // ~12km inland from coast
    
    // Check if within Perth metro latitude range
    if (lat < PERTH_LAT_MIN || lat > PERTH_LAT_MAX) {
      return { inZone: false, zoneName: null };
    }
    
    // Check if within coastal limestone belt (within ~12km of coast)
    // The coast curves, so we use a simplified check
    const distanceFromCoast = Math.abs(lng - COAST_LNG);
    
    // Northern suburbs (Yanchep to Scarborough) - limestone extends further east
    if (lat > -31.9 && lng >= 115.70 && lng <= 115.85) {
      return { inZone: true, zoneName: "Tamala Limestone (Northern Coastal)" };
    }
    
    // Central coastal suburbs (Cottesloe, Mosman Park, Fremantle)
    if (lat >= -32.1 && lat <= -31.9 && lng >= 115.74 && lng <= 115.80) {
      return { inZone: true, zoneName: "Tamala Limestone (Central Coastal)" };
    }
    
    // Southern suburbs (Rockingham, Safety Bay)
    if (lat >= -32.4 && lat < -32.1 && lng >= 115.72 && lng <= 115.80) {
      return { inZone: true, zoneName: "Tamala Limestone (Southern Coastal)" };
    }
    
    // General coastal check - within 12km of coast
    if (distanceFromCoast <= LIMESTONE_INLAND_EXTENT) {
      return { inZone: true, zoneName: "Tamala Limestone (Coastal Belt)" };
    }
    
    return { inZone: false, zoneName: null };
  }
  
  app.get("/api/soil-data", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng || typeof lat !== "string" || typeof lng !== "string") {
        return res.status(400).json({ error: "Missing lat/lng parameters" });
      }
      
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid lat/lng values" });
      }
      
      // Check for Perth coastal limestone zone
      const limestoneCheck = isInPerthLimestoneZone(latitude, longitude);
      
      // Call ASRIS (CSIRO) Soil API with retry
      const asrisUrl = `https://asris.csiro.au/ASRISApi/api/APSIM/getApsoil?longitude=${longitude}&latitude=${latitude}`;
      
      let response: Response | null = null;
      let lastError: Error | null = null;
      
      // Retry up to 3 times with backoff
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetch(asrisUrl, { 
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          if (response.ok) break;
          lastError = new Error(`ASRIS returned ${response.status}`);
        } catch (err) {
          lastError = err as Error;
        }
        // Wait before retry (100ms, 300ms)
        if (attempt < 2) await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }
      
      // Return fallback if ASRIS unavailable
      if (!response?.ok) {
        console.warn("ASRIS API unavailable:", lastError?.message);
        return res.json({
          soilType: null,
          region: null,
          nearestTown: null,
          naturalVegetation: null,
          state: null,
          ascOrder: null,
          comments: null,
          installationNotes: null,
          source: "unavailable",
        });
      }
      
      const xmlText = await response.text();
      
      // Parse key soil information from XML
      const extractValue = (tag: string): string | null => {
        const match = xmlText.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
        return match ? match[1] : null;
      };
      
      const soilType = extractValue("SoilType");
      const region = extractValue("Region");
      const nearestTown = extractValue("NearestTown");
      const naturalVegetation = extractValue("NaturalVegetation");
      const state = extractValue("State");
      const ascOrder = extractValue("ASCOrder");
      const comments = extractValue("Comments");
      
      // If no soil type found in XML, return unavailable
      if (!soilType) {
        console.warn("ASRIS returned empty soil data for coordinates:", latitude, longitude);
        return res.json({
          soilType: null,
          region: null,
          nearestTown: null,
          naturalVegetation: null,
          state: null,
          ascOrder: null,
          comments: null,
          installationNotes: null,
          source: "unavailable",
        });
      }
      
      // Determine installation difficulty based on soil type and limestone zone
      let installationNotes = "";
      let geologyWarning: string | null = null;
      const soilLower = soilType.toLowerCase();
      
      // Check for limestone zone FIRST - this takes priority
      if (limestoneCheck.inZone) {
        installationNotes = "LIMESTONE ZONE - Core drill likely required. Shallow rock expected within 300-500mm.";
        geologyWarning = limestoneCheck.zoneName;
      } else if (soilLower.includes("rock") || soilLower.includes("limestone") || soilLower.includes("calcrete")) {
        installationNotes = "Core drill likely required";
      } else if (soilLower.includes("clay")) {
        installationNotes = "Harder digging - may require more time/effort";
      } else if (soilLower.includes("gravel")) {
        installationNotes = "Mixed conditions - check site for rock presence";
      } else if (soilLower.includes("loam") && !soilLower.includes("sand")) {
        installationNotes = "Moderate digging - standard equipment suitable";
      } else if (soilLower.includes("sand") || soilLower.includes("loamy sand")) {
        // Even in sandy areas, check if we're near limestone zone
        if (limestoneCheck.inZone) {
          installationNotes = "LIMESTONE ZONE - Sandy topsoil but rock likely below. Core drill recommended.";
          geologyWarning = limestoneCheck.zoneName;
        } else {
          installationNotes = "Easy digging - standard auger should work well";
        }
      }
      
      res.json({
        soilType,
        region: region || null,
        nearestTown: nearestTown || null,
        naturalVegetation: naturalVegetation || null,
        state: state || null,
        ascOrder: ascOrder !== "NA" ? ascOrder : null,
        comments: comments || null,
        installationNotes: installationNotes || null,
        geologyWarning: geologyWarning,
        source: "CSIRO ASRIS",
      });
    } catch (error) {
      console.error("Error fetching soil data:", error);
      // Return graceful fallback instead of 500
      res.json({
        soilType: null,
        region: null,
        nearestTown: null,
        naturalVegetation: null,
        state: null,
        ascOrder: null,
        comments: null,
        installationNotes: null,
        source: "unavailable",
      });
    }
  });

  // ============ GLOBAL SEARCH ============
  // Only internal staff roles can search - excludes trade_client and installer
  app.get("/api/search", requireRoles("admin", "sales", "scheduler", "production_manager", "warehouse"), async (req, res) => {
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
  app.get("/api/clients", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
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

  app.get("/api/clients/:id", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
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

  app.post("/api/clients/check-duplicate", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      const duplicates = await storage.checkClientDuplicates(name, email, phone);
      res.json({ duplicates });
    } catch (error) {
      console.error("Error checking client duplicates:", error);
      res.status(500).json({ error: "Failed to check duplicates" });
    }
  });

  app.post("/api/clients", requireRoles("admin", "sales"), async (req, res) => {
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

  app.patch("/api/clients/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.delete("/api/clients/:id", requireRoles("admin"), async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Get client's quotes
  app.get("/api/clients/:id/quotes", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const quotes = await storage.getQuotesByClient(req.params.id);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching client quotes:", error);
      res.status(500).json({ error: "Failed to fetch client quotes" });
    }
  });

  // Get client's jobs
  app.get("/api/clients/:id/jobs", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const jobs = await storage.getJobsByClient(req.params.id);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching client jobs:", error);
      res.status(500).json({ error: "Failed to fetch client jobs" });
    }
  });

  // Get client's payments
  app.get("/api/clients/:id/payments", requireRoles("admin"), async (req, res) => {
    try {
      const payments = await storage.getPaymentsByClient(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching client payments:", error);
      res.status(500).json({ error: "Failed to fetch client payments" });
    }
  });

  // ============ LEADS ============
  app.get("/api/leads", requireRoles("admin", "sales"), async (req, res) => {
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

  app.get("/api/leads/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.post("/api/leads", requireRoles("admin", "sales"), async (req, res) => {
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
        // Soil/site data from frontend
        soilWarning: leadData.soilWarning || null,
        soilInstallNotes: leadData.soilInstallNotes || null,
        siteLatitude: leadData.siteLatitude || null,
        siteLongitude: leadData.siteLongitude || null,
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

  app.patch("/api/leads/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.delete("/api/leads/:id", requireRoles("admin"), async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Lead Activities
  app.get("/api/leads/:leadId/activities", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const activities = await storage.getLeadActivities(req.params.leadId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching lead activities:", error);
      res.status(500).json({ error: "Failed to fetch lead activities" });
    }
  });

  app.post("/api/leads/:leadId/activities", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const { activityType, title, description, metadata,
        callDirection, callTimestamp, callDurationSeconds, staffMemberId,
        callNotes, audioRecordingUrl, aiSummaryText, callTranscriptionText, transcriptionStatus
      } = req.body;
      
      if (!activityType || !title) {
        return res.status(400).json({ error: "Activity type and title are required" });
      }
      
      const activityData: Record<string, unknown> = {
        leadId: req.params.leadId,
        activityType,
        title,
      };
      
      if (description) activityData.description = description;
      if (metadata) activityData.metadata = metadata;
      
      // Call-specific fields
      if (callDirection) activityData.callDirection = callDirection;
      if (callTimestamp) activityData.callTimestamp = new Date(callTimestamp);
      if (callDurationSeconds !== undefined) activityData.callDurationSeconds = callDurationSeconds;
      if (staffMemberId) activityData.staffMemberId = staffMemberId;
      if (callNotes) activityData.callNotes = callNotes;
      if (audioRecordingUrl) activityData.audioRecordingUrl = audioRecordingUrl;
      if (aiSummaryText) activityData.aiSummaryText = aiSummaryText;
      if (callTranscriptionText) activityData.callTranscriptionText = callTranscriptionText;
      if (transcriptionStatus) activityData.transcriptionStatus = transcriptionStatus;
      
      const validatedData = insertLeadActivitySchema.parse(activityData);
      
      const activity = await storage.createLeadActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating lead activity:", error);
      res.status(500).json({ error: "Failed to create lead activity" });
    }
  });

  // Get single activity with linked tasks
  app.get("/api/lead-activities/:id", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const activity = await storage.getLeadActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      
      const linkedTasks = await storage.getTasksByActivityId(req.params.id);
      res.json({ ...activity, linkedTasks });
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Update lead activity (for call logs - edit notes, direction, staff member)
  app.patch("/api/lead-activities/:id", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const { callNotes, callDirection, staffMemberId, aiSummaryText, 
              callTranscriptionText, transcriptionStatus } = req.body;
      
      const updateData: Record<string, unknown> = {};
      
      if (callNotes !== undefined) updateData.callNotes = callNotes;
      if (callDirection !== undefined) updateData.callDirection = callDirection;
      if (staffMemberId !== undefined) updateData.staffMemberId = staffMemberId;
      if (aiSummaryText !== undefined) updateData.aiSummaryText = aiSummaryText;
      if (callTranscriptionText !== undefined) updateData.callTranscriptionText = callTranscriptionText;
      if (transcriptionStatus !== undefined) updateData.transcriptionStatus = transcriptionStatus;
      
      const activity = await storage.updateLeadActivity(req.params.id, updateData);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ error: "Failed to update activity" });
    }
  });

  // Delete lead activity (call log)
  app.delete("/api/lead-activities/:id", requireRoles("admin", "sales"), async (req, res) => {
    try {
      // Clear the sourceActivityId from any linked tasks before deleting
      const linkedTasks = await storage.getTasksByActivityId(req.params.id);
      for (const task of linkedTasks) {
        await storage.updateLeadTask(task.id, { sourceActivityId: null });
      }
      
      await storage.deleteLeadActivity(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ error: "Failed to delete activity" });
    }
  });

  // Get tasks linked to a specific activity (call log)
  app.get("/api/lead-activities/:id/tasks", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const tasks = await storage.getTasksByActivityId(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching activity tasks:", error);
      res.status(500).json({ error: "Failed to fetch activity tasks" });
    }
  });

  // Lead Tasks
  app.get("/api/leads/:leadId/tasks", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const tasks = await storage.getLeadTasks(req.params.leadId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching lead tasks:", error);
      res.status(500).json({ error: "Failed to fetch lead tasks" });
    }
  });

  app.post("/api/leads/:leadId/tasks", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const { title, description, dueDate, priority, assignedTo, sourceActivityId } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Task title is required" });
      }
      
      const taskData: Record<string, unknown> = {
        leadId: req.params.leadId,
        title,
        status: "pending",
      };
      
      if (description) taskData.description = description;
      if (dueDate) taskData.dueDate = new Date(dueDate);
      if (priority) taskData.priority = priority;
      if (assignedTo) taskData.assignedTo = assignedTo;
      if (sourceActivityId) taskData.sourceActivityId = sourceActivityId;
      
      const validatedData = insertLeadTaskSchema.parse(taskData);
      
      const task = await storage.createLeadTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating lead task:", error);
      res.status(500).json({ error: "Failed to create lead task" });
    }
  });

  app.get("/api/lead-tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllLeadTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching lead tasks:", error);
      res.status(500).json({ error: "Failed to fetch lead tasks" });
    }
  });

  app.patch("/api/lead-tasks/:id", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const { status, title, description, priority, dueDate, assignedTo } = req.body;
      
      const updateData: Record<string, unknown> = {};
      
      const validStatuses = ["pending", "in_progress", "completed"];
      if (status) {
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
        }
        updateData.status = status;
        if (status === "completed") {
          updateData.completedAt = new Date();
        }
      }
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      
      const task = await storage.updateLeadTask(req.params.id, updateData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating lead task:", error);
      res.status(500).json({ error: "Failed to update lead task" });
    }
  });

  app.delete("/api/lead-tasks/:id", requireRoles("admin", "sales"), async (req, res) => {
    try {
      await storage.deleteLeadTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead task:", error);
      res.status(500).json({ error: "Failed to delete lead task" });
    }
  });

  // Convert lead to quote
  app.post("/api/leads/:id/convert-to-quote", requireRoles("admin", "sales"), async (req, res) => {
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
  app.get("/api/products", requireRoles("admin", "sales", "production_manager", "warehouse"), async (req, res) => {
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

  app.get("/api/products/:id", requireRoles("admin", "sales", "production_manager", "warehouse"), async (req, res) => {
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

  app.post("/api/products", requireRoles("admin", "production_manager", "warehouse"), async (req, res) => {
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

  app.patch("/api/products/:id", requireRoles("admin", "production_manager", "warehouse"), async (req, res) => {
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

  app.patch("/api/products/:id/stock", requireRoles("admin", "production_manager", "warehouse"), async (req, res) => {
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

  app.delete("/api/products/:id", requireRoles("admin"), async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // ============ QUOTES ============
  app.get("/api/quotes", requireRoles("admin", "sales"), async (req, res) => {
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

  app.get("/api/quotes/next-number", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const number = await storage.getNextQuoteNumber();
      res.json({ quoteNumber: number });
    } catch (error) {
      console.error("Error generating quote number:", error);
      res.status(500).json({ error: "Failed to generate quote number" });
    }
  });

  app.get("/api/quotes/analytics", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const analytics = await storage.getQuoteAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching quote analytics:", error);
      res.status(500).json({ error: "Failed to fetch quote analytics" });
    }
  });

  // ============ CORE ANALYTICS ============
  // Standardized KPI endpoints for dashboards

  app.get("/api/analytics/core", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const analytics = await storage.getCoreAnalytics(start, end);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching core analytics:", error);
      res.status(500).json({ error: "Failed to fetch core analytics" });
    }
  });

  app.get("/api/analytics/leads", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const analytics = await storage.getLeadAnalytics(start, end);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching lead analytics:", error);
      res.status(500).json({ error: "Failed to fetch lead analytics" });
    }
  });

  app.get("/api/analytics/sales", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const analytics = await storage.getSalesAnalytics(start, end);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ error: "Failed to fetch sales analytics" });
    }
  });

  app.get("/api/quotes/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.post("/api/quotes", requireRoles("admin", "sales"), async (req, res) => {
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

  app.patch("/api/quotes/:id", requireRoles("admin", "sales"), async (req, res) => {
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
  app.post("/api/quotes/:id/send", requireRoles("admin", "sales"), async (req, res) => {
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

  // Set quote as primary (updates lead opportunity_value)
  app.post("/api/quotes/:id/set-primary", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const result = await storage.setPrimaryQuote(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Error setting primary quote:", error);
      res.status(400).json({ error: error.message || "Failed to set primary quote" });
    }
  });

  // Accept quote and create job (also sets as primary and rejects other quotes)
  app.post("/api/quotes/:id/accept", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Use the new acceptQuote method which handles:
      // - Setting this quote as primary
      // - Updating lead stage to "won" and opportunity_value
      // - Rejecting all other quotes on this lead
      // - Creating the job
      const { quote: updatedQuote, lead, job } = await storage.acceptQuote(req.params.id);

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
      const jobType = job.jobType || "supply_install";
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

      res.status(201).json({ quote: updatedQuote, lead, job });
    } catch (error: any) {
      console.error("Error accepting quote:", error);
      res.status(500).json({ error: error.message || "Failed to accept quote" });
    }
  });

  app.delete("/api/quotes/:id", requireRoles("admin", "sales"), async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // ============ JOBS ============
  app.get("/api/jobs", requireRoles("admin", "sales", "scheduler", "production_manager", "warehouse", "installer"), async (req, res) => {
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

  app.get("/api/jobs/:id", requireRoles("admin", "sales", "scheduler", "production_manager", "warehouse", "installer"), async (req, res) => {
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

  // Create a job directly (without going through leads/quotes flow)
  app.post("/api/jobs/create-direct", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const { clientId, jobType, siteAddress, notes, totalAmount } = req.body;
      
      if (!clientId || !jobType || !siteAddress) {
        return res.status(400).json({ error: "clientId, jobType, and siteAddress are required" });
      }

      const result = await storage.createDirectJob({
        clientId,
        jobType,
        siteAddress,
        notes,
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating direct job:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.patch("/api/jobs/:id", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
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
  app.patch("/api/jobs/:id/status", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
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
  app.get("/api/jobs/:id/bom", requireRoles("admin", "sales", "scheduler", "production_manager", "warehouse"), async (req, res) => {
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
  app.post("/api/jobs/:id/bom", requireRoles("admin", "production_manager"), async (req, res) => {
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
  app.get("/api/jobs/:id/production-tasks", requireRoles("admin", "scheduler", "production_manager", "warehouse"), async (req, res) => {
    try {
      const tasks = await storage.getProductionTasksByJob(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching production tasks:", error);
      res.status(500).json({ error: "Failed to fetch production tasks" });
    }
  });

  // Get job install tasks
  app.get("/api/jobs/:id/install-tasks", requireRoles("admin", "scheduler", "production_manager", "installer"), async (req, res) => {
    try {
      const tasks = await storage.getInstallTasksByJob(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching install tasks:", error);
      res.status(500).json({ error: "Failed to fetch install tasks" });
    }
  });

  // Get job payments
  app.get("/api/jobs/:id/payments", requireRoles("admin"), async (req, res) => {
    try {
      const payments = await storage.getPaymentsByJob(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching job payments:", error);
      res.status(500).json({ error: "Failed to fetch job payments" });
    }
  });

  // ============ PRODUCTION TASKS ============
  app.get("/api/production-tasks", requireRoles("admin", "production_manager", "warehouse"), async (req, res) => {
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

  app.post("/api/production-tasks", requireRoles("admin", "production_manager"), async (req, res) => {
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
  app.get("/api/schedule", requireRoles("admin", "scheduler", "production_manager", "installer"), async (req, res) => {
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

  app.post("/api/schedule", requireRoles("admin", "scheduler"), async (req, res) => {
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

  app.patch("/api/schedule/:id", requireRoles("admin", "scheduler"), async (req, res) => {
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

  app.delete("/api/schedule/:id", requireRoles("admin", "scheduler"), async (req, res) => {
    try {
      await storage.deleteScheduleEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule event:", error);
      res.status(500).json({ error: "Failed to delete schedule event" });
    }
  });

  // ============ PAYMENTS ============
  app.get("/api/payments", requireRoles("admin"), async (req, res) => {
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

  app.post("/api/payments", requireRoles("admin"), async (req, res) => {
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

  app.patch("/api/payments/:id", requireRoles("admin"), async (req, res) => {
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
  app.get("/api/quotes/:quoteId/costs", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const components = await storage.getQuoteCostComponentsByQuote(req.params.quoteId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching cost components:", error);
      res.status(500).json({ error: "Failed to fetch cost components" });
    }
  });

  app.post("/api/quotes/:quoteId/costs", requireRoles("admin", "sales"), async (req, res) => {
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

  app.patch("/api/quotes/:quoteId/costs/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.delete("/api/quotes/:quoteId/costs/:id", requireRoles("admin", "sales"), async (req, res) => {
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
  app.get("/api/quotes/:quoteId/trips", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const trips = await storage.getQuoteTripsByQuote(req.params.quoteId);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.post("/api/quotes/:quoteId/trips", requireRoles("admin", "sales"), async (req, res) => {
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

  app.patch("/api/quotes/:quoteId/trips/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.delete("/api/quotes/:quoteId/trips/:id", requireRoles("admin", "sales"), async (req, res) => {
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
  app.get("/api/quotes/:quoteId/admin-time", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const adminTime = await storage.getQuoteAdminTimeByQuote(req.params.quoteId);
      res.json(adminTime);
    } catch (error) {
      console.error("Error fetching admin time:", error);
      res.status(500).json({ error: "Failed to fetch admin time" });
    }
  });

  app.post("/api/quotes/:quoteId/admin-time", requireRoles("admin", "sales"), async (req, res) => {
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

  app.patch("/api/quotes/:quoteId/admin-time/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.delete("/api/quotes/:quoteId/admin-time/:id", requireRoles("admin", "sales"), async (req, res) => {
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
  app.get("/api/quotes/:quoteId/ground-conditions", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const conditions = await storage.getQuoteGroundConditionsByQuote(req.params.quoteId);
      res.json(conditions);
    } catch (error) {
      console.error("Error fetching ground conditions:", error);
      res.status(500).json({ error: "Failed to fetch ground conditions" });
    }
  });

  app.post("/api/quotes/:quoteId/ground-conditions", requireRoles("admin", "sales"), async (req, res) => {
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

  app.patch("/api/quotes/:quoteId/ground-conditions/:id", requireRoles("admin", "sales"), async (req, res) => {
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

  app.delete("/api/quotes/:quoteId/ground-conditions/:id", requireRoles("admin", "sales"), async (req, res) => {
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
  app.get("/api/quotes/:quoteId/pl-summary", requireRoles("admin", "sales"), async (req, res) => {
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

  app.post("/api/quotes/:quoteId/pl-summary/recalculate", requireRoles("admin", "sales"), async (req, res) => {
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
  app.get("/api/jobs/:jobId/costs", requireRoles("admin", "sales", "production_manager"), async (req, res) => {
    try {
      const components = await storage.getQuoteCostComponentsByJob(req.params.jobId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching job costs:", error);
      res.status(500).json({ error: "Failed to fetch job costs" });
    }
  });

  app.get("/api/jobs/:jobId/trips", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
    try {
      const trips = await storage.getQuoteTripsByJob(req.params.jobId);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching job trips:", error);
      res.status(500).json({ error: "Failed to fetch job trips" });
    }
  });

  app.get("/api/jobs/:jobId/admin-time", requireRoles("admin", "sales", "production_manager"), async (req, res) => {
    try {
      const adminTime = await storage.getQuoteAdminTimeByJob(req.params.jobId);
      res.json(adminTime);
    } catch (error) {
      console.error("Error fetching job admin time:", error);
      res.status(500).json({ error: "Failed to fetch job admin time" });
    }
  });

  app.get("/api/jobs/:jobId/pl-summary", requireRoles("admin"), async (req, res) => {
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

  // ============ LIVE DOCUMENT TEMPLATES ============

  // Get all templates
  app.get("/api/live-doc-templates", async (req, res) => {
    try {
      const { active } = req.query;
      let templates;
      if (active === "true") {
        templates = await storage.getActiveLiveDocumentTemplates();
      } else {
        templates = await storage.getLiveDocumentTemplates();
      }
      res.json(templates);
    } catch (error) {
      console.error("Error fetching live document templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get default template
  app.get("/api/live-doc-templates/default", async (req, res) => {
    try {
      const template = await storage.getDefaultLiveDocumentTemplate();
      if (!template) {
        return res.status(404).json({ error: "No default template found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching default template:", error);
      res.status(500).json({ error: "Failed to fetch default template" });
    }
  });

  // Get a specific template by ID
  app.get("/api/live-doc-templates/:id", async (req, res) => {
    try {
      const template = await storage.getLiveDocumentTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Create a new template
  app.post("/api/live-doc-templates", async (req, res) => {
    try {
      const validatedData = insertLiveDocumentTemplateSchema.parse(req.body);
      const template = await storage.createLiveDocumentTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Update a template
  app.patch("/api/live-doc-templates/:id", async (req, res) => {
    try {
      const validatedData = insertLiveDocumentTemplateSchema.partial().parse(req.body);
      const template = await storage.updateLiveDocumentTemplate(req.params.id, validatedData);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Delete a template
  app.delete("/api/live-doc-templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLiveDocumentTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
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
  app.get("/api/jobs/:jobId/setup-document", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
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

  // Get live document by lead ID (auto-creates for supply_install leads if not exists)
  app.get("/api/leads/:leadId/live-document", requireRoles("admin", "sales"), async (req, res) => {
    try {
      let document = await storage.getJobSetupDocumentByLead(req.params.leadId);
      
      // If no document exists, auto-create one for supply_install leads
      if (!document) {
        const lead = await storage.getLead(req.params.leadId);
        if (!lead) {
          return res.status(404).json({ error: "Lead not found" });
        }
        
        if (lead.jobFulfillmentType === "supply_install") {
          // Get the default template to use for section configurations
          const defaultTemplate = await storage.getDefaultLiveDocumentTemplate();
          
          // Auto-create the live document linked to the lead
          document = await storage.createJobSetupDocument({
            leadId: lead.id,
            templateId: defaultTemplate?.id,
            jobType: lead.jobFulfillmentType,
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
        } else {
          return res.status(400).json({ error: "Live documents are only available for supply+install leads" });
        }
      }
      
      // Also fetch the products for this document
      const products = await storage.getJobSetupProductsByDocument(document!.id);
      res.json({ ...document, products });
    } catch (error) {
      console.error("Error fetching lead live document:", error);
      res.status(500).json({ error: "Failed to fetch lead live document" });
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
  app.get("/api/jobs/:jobId/validate-status-change", requireRoles("admin", "sales", "scheduler", "production_manager"), async (req, res) => {
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

  // ============ IMPORT DATA ============
  
  // Import clients
  app.post("/api/import/clients", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const clientData = {
            name: row.name?.trim() || "",
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            address: row.address?.trim() || null,
            clientType: (row.clientType === "trade" ? "trade" : "public") as "public" | "trade",
            companyName: row.companyName?.trim() || null,
            abn: row.abn?.trim() || null,
          };

          if (!clientData.name) {
            errors.push(`Row missing name`);
            failed++;
            continue;
          }

          await storage.createClient(clientData);
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import client: ${row.name || 'unknown'}`);
        }
      }

      res.json({ success, failed, errors });
    } catch (error) {
      console.error("Error importing clients:", error);
      res.status(500).json({ error: "Failed to import clients" });
    }
  });

  // Import leads (creates client if doesn't exist)
  app.post("/api/import/leads", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const clientName = row.clientName?.trim();
          const siteAddress = row.siteAddress?.trim();

          if (!clientName || !siteAddress) {
            errors.push(`Row missing clientName or siteAddress`);
            failed++;
            continue;
          }

          // Find or create client
          let client = await storage.getClientByEmail(row.clientEmail?.trim());
          if (!client && row.clientPhone?.trim()) {
            const clients = await storage.getClients();
            client = clients.find(c => c.phone === row.clientPhone?.trim()) || null;
          }

          if (!client) {
            const clientData = {
              name: clientName,
              email: row.clientEmail?.trim() || null,
              phone: row.clientPhone?.trim() || null,
              address: null,
              clientType: (row.leadType === "trade" ? "trade" : "public") as "public" | "trade",
              companyName: null,
              abn: null,
            };
            client = await storage.createClient(clientData);
          }

          // Parse source value
          const validSources = ["website", "phone", "referral", "trade_account", "walk_in", "other"];
          const source = validSources.includes(row.source?.toLowerCase()) 
            ? row.source.toLowerCase() 
            : "other";

          // Parse leadType
          const leadType = row.leadType === "trade" ? "trade" : "public";

          // Parse jobFulfillmentType
          const validFulfillment = ["supply_install", "supply_only"];
          const jobFulfillmentType = validFulfillment.includes(row.jobFulfillmentType?.toLowerCase())
            ? row.jobFulfillmentType.toLowerCase()
            : "supply_install";

          const leadData = {
            clientId: client.id,
            source: source as any,
            leadType: leadType as any,
            jobFulfillmentType: jobFulfillmentType as any,
            description: row.description?.trim() || null,
            siteAddress,
            measurementsProvided: false,
            fenceLength: row.fenceLength?.trim() || null,
            fenceStyle: row.fenceStyle?.trim() || null,
            stage: "new" as const,
            assignedTo: null,
            followUpDate: null,
            notes: null,
          };

          await storage.createLead(leadData);
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import lead for: ${row.clientName || 'unknown'}`);
        }
      }

      res.json({ success, failed, errors });
    } catch (error) {
      console.error("Error importing leads:", error);
      res.status(500).json({ error: "Failed to import leads" });
    }
  });

  // Import jobs (creates client and lead if doesn't exist)
  app.post("/api/import/jobs", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const clientName = row.clientName?.trim();
          const siteAddress = row.siteAddress?.trim();

          if (!clientName || !siteAddress) {
            errors.push(`Row missing clientName or siteAddress`);
            failed++;
            continue;
          }

          // Find or create client
          let client = await storage.getClientByEmail(row.clientEmail?.trim());
          if (!client && row.clientPhone?.trim()) {
            const clients = await storage.getClients();
            client = clients.find(c => c.phone === row.clientPhone?.trim()) || null;
          }

          if (!client) {
            const clientData = {
              name: clientName,
              email: row.clientEmail?.trim() || null,
              phone: row.clientPhone?.trim() || null,
              address: siteAddress,
              clientType: "public" as const,
              companyName: null,
              abn: null,
            };
            client = await storage.createClient(clientData);
          }

          // Parse job type
          const validJobTypes = ["supply_install", "supply_only"];
          const jobType = validJobTypes.includes(row.jobType?.toLowerCase())
            ? row.jobType.toLowerCase()
            : "supply_install";

          // Parse job status  
          const validStatuses = ["pending", "awaiting_deposit", "in_production", "ready_for_install", "scheduled", "installing", "completed", "on_hold", "cancelled"];
          const status = validStatuses.includes(row.status?.toLowerCase())
            ? row.status.toLowerCase()
            : "pending";

          // Create a lead for the job
          const leadData = {
            clientId: client.id,
            source: "other" as const,
            leadType: "public" as const,
            jobFulfillmentType: jobType as any,
            description: row.notes?.trim() || "Imported job",
            siteAddress,
            measurementsProvided: !!row.fenceLength,
            fenceLength: row.fenceLength?.trim() || null,
            fenceStyle: row.fenceStyle?.trim() || null,
            stage: "won" as const,
            assignedTo: null,
            followUpDate: null,
            notes: null,
          };

          const lead = await storage.createLead(leadData);

          // Create the job
          const jobData = {
            leadId: lead.id,
            clientId: client.id,
            jobType: jobType as any,
            siteAddress,
            fenceLength: row.fenceLength?.trim() || null,
            fenceStyle: row.fenceStyle?.trim() || null,
            status: status as any,
            assignedTeam: null,
            scheduledDate: null,
            notes: row.notes?.trim() || null,
            depositPaid: false,
            depositAmount: null,
            totalAmount: null,
          };

          await storage.createJob(jobData);
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import job for: ${row.clientName || 'unknown'}`);
        }
      }

      res.json({ success, failed, errors });
    } catch (error) {
      console.error("Error importing jobs:", error);
      res.status(500).json({ error: "Failed to import jobs" });
    }
  });

  // ============================================
  // DASHBOARD BUILDER ROUTES
  // ============================================

  // Get all available widgets
  app.get("/api/dashboard-builder/widgets", requireRoles("admin"), async (req, res) => {
    try {
      const widgets = await storage.getActiveWidgets();
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching widgets:", error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  // Get widgets by category
  app.get("/api/dashboard-builder/widgets/category/:category", requireRoles("admin"), async (req, res) => {
    try {
      const widgets = await storage.getDashboardWidgetsByCategory(req.params.category);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching widgets by category:", error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  // Get all dashboard layouts
  app.get("/api/dashboard-builder/layouts", requireRoles("admin"), async (req, res) => {
    try {
      const layouts = await storage.getRoleDashboardLayouts();
      res.json(layouts);
    } catch (error) {
      console.error("Error fetching layouts:", error);
      res.status(500).json({ error: "Failed to fetch layouts" });
    }
  });

  // Get layouts for a specific role
  app.get("/api/dashboard-builder/layouts/role/:role", requireRoles("admin"), async (req, res) => {
    try {
      const layouts = await storage.getRoleDashboardLayoutsByRole(req.params.role);
      res.json(layouts);
    } catch (error) {
      console.error("Error fetching layouts by role:", error);
      res.status(500).json({ error: "Failed to fetch layouts" });
    }
  });

  // Get a specific layout with its widget instances
  app.get("/api/dashboard-builder/layouts/:id", requireRoles("admin"), async (req, res) => {
    try {
      const layout = await storage.getRoleDashboardLayout(req.params.id);
      if (!layout) {
        return res.status(404).json({ error: "Layout not found" });
      }
      const instances = await storage.getDashboardWidgetInstancesByLayout(req.params.id);
      const widgets = await storage.getDashboardWidgets();
      
      // Enrich instances with widget details
      const enrichedInstances = instances.map(instance => {
        const widget = widgets.find(w => w.id === instance.widgetId);
        return { ...instance, widget };
      });
      
      res.json({ ...layout, instances: enrichedInstances });
    } catch (error) {
      console.error("Error fetching layout:", error);
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Create a new layout
  app.post("/api/dashboard-builder/layouts", requireRoles("admin"), async (req, res) => {
    try {
      const layout = await storage.createRoleDashboardLayout({
        ...req.body,
        createdBy: req.user?.id,
        updatedBy: req.user?.id,
      });
      res.status(201).json(layout);
    } catch (error) {
      console.error("Error creating layout:", error);
      res.status(500).json({ error: "Failed to create layout" });
    }
  });

  // Update a layout
  app.patch("/api/dashboard-builder/layouts/:id", requireRoles("admin"), async (req, res) => {
    try {
      const layout = await storage.updateRoleDashboardLayout(req.params.id, {
        ...req.body,
        updatedBy: req.user?.id,
      });
      if (!layout) {
        return res.status(404).json({ error: "Layout not found" });
      }
      res.json(layout);
    } catch (error) {
      console.error("Error updating layout:", error);
      res.status(500).json({ error: "Failed to update layout" });
    }
  });

  // Delete a layout
  app.delete("/api/dashboard-builder/layouts/:id", requireRoles("admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteRoleDashboardLayout(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Layout not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting layout:", error);
      res.status(500).json({ error: "Failed to delete layout" });
    }
  });

  // Publish a layout (make it the active default for the role)
  app.post("/api/dashboard-builder/layouts/:id/publish", requireRoles("admin"), async (req, res) => {
    try {
      const layout = await storage.publishRoleDashboardLayout(req.params.id);
      if (!layout) {
        return res.status(404).json({ error: "Layout not found" });
      }
      res.json(layout);
    } catch (error) {
      console.error("Error publishing layout:", error);
      res.status(500).json({ error: "Failed to publish layout" });
    }
  });

  // Save all widget instances for a layout (bulk update)
  app.put("/api/dashboard-builder/layouts/:id/instances", requireRoles("admin"), async (req, res) => {
    try {
      const { instances } = req.body;
      if (!Array.isArray(instances)) {
        return res.status(400).json({ error: "instances must be an array" });
      }
      const savedInstances = await storage.saveDashboardLayout(req.params.id, instances);
      res.json(savedInstances);
    } catch (error) {
      console.error("Error saving layout instances:", error);
      res.status(500).json({ error: "Failed to save layout" });
    }
  });

  // Add a widget instance to a layout
  app.post("/api/dashboard-builder/layouts/:id/instances", requireRoles("admin"), async (req, res) => {
    try {
      const instance = await storage.createDashboardWidgetInstance({
        ...req.body,
        layoutId: req.params.id,
      });
      res.status(201).json(instance);
    } catch (error) {
      console.error("Error adding widget instance:", error);
      res.status(500).json({ error: "Failed to add widget" });
    }
  });

  // Update a widget instance
  app.patch("/api/dashboard-builder/instances/:id", requireRoles("admin"), async (req, res) => {
    try {
      const instance = await storage.updateDashboardWidgetInstance(req.params.id, req.body);
      if (!instance) {
        return res.status(404).json({ error: "Widget instance not found" });
      }
      res.json(instance);
    } catch (error) {
      console.error("Error updating widget instance:", error);
      res.status(500).json({ error: "Failed to update widget" });
    }
  });

  // Delete a widget instance
  app.delete("/api/dashboard-builder/instances/:id", requireRoles("admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteDashboardWidgetInstance(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Widget instance not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting widget instance:", error);
      res.status(500).json({ error: "Failed to delete widget" });
    }
  });

  // Get the published dashboard for a user's role (used by MyDashboard)
  app.get("/api/dashboard/my-layout", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const role = req.session.user.role;
      const layout = await storage.getPublishedLayoutForRole(role);
      
      if (!layout) {
        // Return null to indicate no custom layout - use default dashboard
        return res.json(null);
      }
      
      const instances = await storage.getDashboardWidgetInstancesByLayout(layout.id);
      const widgets = await storage.getDashboardWidgets();
      
      // Enrich instances with widget details
      const enrichedInstances = instances.map(instance => {
        const widget = widgets.find(w => w.id === instance.widgetId);
        return { ...instance, widget };
      });
      
      res.json({ ...layout, instances: enrichedInstances });
    } catch (error) {
      console.error("Error fetching user dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  // ============ FINANCIAL / BANKING (Basiq CDR Open Banking Integration) ============
  // IMPORTANT: This uses ONLY the CDR consent flow - NO login credentials are ever collected
  
  // Create CDR consent and get Connect URL - initiates the Open Banking flow
  app.post("/api/financial/connect-bank", requireRoles("admin"), async (req, res) => {
    try {
      const { businessName, businessIdNo, businessIdNoType, businessAddress, organisationType, sharingDuration, email } = req.body;
      
      if (!businessName || !businessIdNo || !businessIdNoType || !businessAddress || !organisationType || !sharingDuration || !email) {
        return res.status(400).json({ error: "businessName, businessIdNo, businessIdNoType, businessAddress, organisationType, sharingDuration, and email are all required" });
      }
      
      const { BasiqService } = await import("./services/basiq");
      const basiq = new BasiqService();
      
      // Create Basiq user and get Consent UI URL
      const { userId, connectUrl } = await basiq.createCDRConsent(businessName, businessIdNo, businessIdNoType, businessAddress, organisationType, sharingDuration, email);
      
      // Store the pending connection with Basiq user ID
      const connection = await storage.createBankConnection({
        ownerUserId: req.session?.user?.id || null,
        basiqConsentId: null, // Will be set after consent is completed
        basiqUserId: userId,
        basiqConnectionId: null,
        institutionId: null,
        institutionName: null,
        status: "pending_consent",
        refreshJobId: null,
        metadata: { 
          createdAt: new Date().toISOString(),
          businessName,
          businessIdNo
        }
      });

      res.status(201).json({ 
        connectionId: connection.id,
        basiqUserId: userId,
        connectUrl,
        message: "Redirect user to connectUrl to complete bank authorization in Basiq Consent UI" 
      });
    } catch (error: any) {
      console.error("Error creating CDR consent:", error);
      res.status(500).json({ error: error.message || "Failed to create consent" });
    }
  });

  // Basiq callback endpoint - handles redirect after user completes consent on Westpac
  app.get("/api/financial/callback", async (req, res) => {
    try {
      const { consentId, error, connectionId } = req.query;
      
      if (error) {
        console.error("Basiq callback error:", error);
        return res.redirect(`/financial?error=${encodeURIComponent(error as string)}`);
      }

      if (consentId) {
        console.log("Consent callback received, consentId:", consentId);
        
        // Find the connection with this consent ID and activate it
        const { BasiqService } = await import("./services/basiq");
        const basiq = new BasiqService();
        
        // Verify consent is active
        const consent = await basiq.getConsent(consentId as string);
        console.log("Consent status:", consent);
        
        if (consent.status === "active") {
          // Find connection by consent ID and update it
          const connections = await storage.getBankConnections();
          const connection = connections.find(c => c.basiqConsentId === consentId);
          
          if (connection) {
            // Fetch accounts from the consent
            const accounts = await basiq.getAccountsByConsent(consentId as string);
            console.log("Fetched accounts:", accounts.length);
            
            // Get institution info from first account
            const firstAccount = accounts[0];
            const institutionName = firstAccount?.institution?.shortName || firstAccount?.institution?.name || "Unknown Bank";
            const institutionId = firstAccount?.institution?.id;
            
            // Update connection to active
            await storage.updateBankConnection(connection.id, {
              status: "active",
              institutionId,
              institutionName,
              lastSyncedAt: new Date(),
              consentExpiresAt: consent.expiresAt ? new Date(consent.expiresAt) : null
            });
            
            // Sync accounts to database
            await basiq.syncAccountsToDatabase(connection.id);
          }
        }
        
        return res.redirect(`/financial?success=true&consentId=${consentId}`);
      }
      
      // Fallback redirect
      res.redirect("/financial?success=true");
    } catch (error) {
      console.error("Error handling Basiq callback:", error);
      res.redirect("/financial?error=callback_failed");
    }
  });

  // Basiq webhook endpoint - receives notifications about data updates
  app.post("/api/basiq/webhook", async (req, res) => {
    try {
      console.log("Basiq webhook received:", JSON.stringify(req.body, null, 2));
      
      const { type, consentId, data } = req.body;
      
      // Log the webhook event for future processing
      console.log(`Webhook event: ${type} for consent: ${consentId}`);
      
      // Handle different webhook events
      if (type === "transactions.available") {
        // New transactions are available - trigger sync
        console.log("New transactions available for sync");
        // TODO: Implement automatic transaction sync
      } else if (type === "consent.revoked") {
        // User revoked consent - update connection status
        console.log("Consent revoked for:", consentId);
        const connections = await storage.getBankConnections();
        const connection = connections.find(c => c.basiqConsentId === consentId);
        if (connection) {
          await storage.updateBankConnection(connection.id, {
            status: "inactive"
          });
        }
      }
      
      // Always respond 200 to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error handling Basiq webhook:", error);
      res.status(200).json({ received: true, error: "Processing error" });
    }
  });

  // Get all bank connections
  app.get("/api/financial/connections", requireRoles("admin", "scheduler", "production_manager"), async (req, res) => {
    try {
      const connections = await storage.getBankConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching bank connections:", error);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  // Refresh accounts for a connection
  app.post("/api/financial/connections/:id/refresh", requireRoles("admin"), async (req, res) => {
    try {
      const connection = await storage.getBankConnectionById(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      if (!connection.basiqConsentId) {
        return res.status(400).json({ error: "Connection has no consent ID" });
      }

      const { BasiqService } = await import("./services/basiq");
      const basiq = new BasiqService();
      
      // Verify consent is still active
      const consent = await basiq.getConsent(connection.basiqConsentId);
      if (consent.status !== "active") {
        await storage.updateBankConnection(connection.id, { status: "inactive" });
        return res.status(400).json({ error: "Consent is no longer active. Please reconnect." });
      }
      
      // Sync accounts
      await basiq.syncAccountsToDatabase(connection.id);
      
      // Update last synced time
      await storage.updateBankConnection(connection.id, {
        lastSyncedAt: new Date()
      });

      const updated = await storage.getBankConnectionById(connection.id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error refreshing connection:", error);
      res.status(500).json({ error: error.message || "Failed to refresh connection" });
    }
  });

  // Get all bank accounts
  app.get("/api/financial/accounts", requireRoles("admin", "scheduler", "production_manager"), async (req, res) => {
    try {
      const accounts = await storage.getBankAccounts();
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  // Get account by ID with connection info
  app.get("/api/financial/accounts/:id", requireRoles("admin", "scheduler", "production_manager"), async (req, res) => {
    try {
      const account = await storage.getBankAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Error fetching bank account:", error);
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  // Get transactions for an account
  app.get("/api/financial/accounts/:id/transactions", requireRoles("admin", "scheduler", "production_manager"), async (req, res) => {
    try {
      const { fromDate, toDate, category, direction, limit = "100", offset = "0" } = req.query;
      
      const transactions = await storage.getBankTransactions(req.params.id, {
        fromDate: fromDate as string,
        toDate: toDate as string,
        category: category as string,
        direction: direction as "credit" | "debit",
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Get all transactions across all accounts
  app.get("/api/financial/transactions", requireRoles("admin", "scheduler", "production_manager"), async (req, res) => {
    try {
      const { fromDate, toDate, category, direction, limit = "100", offset = "0", search } = req.query;
      
      const transactions = await storage.getAllBankTransactions({
        fromDate: fromDate as string,
        toDate: toDate as string,
        category: category as string,
        direction: direction as "credit" | "debit",
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        search: search as string
      });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Sync transactions for an account
  app.post("/api/financial/accounts/:id/sync", requireRoles("admin"), async (req, res) => {
    try {
      const { fromDate } = req.body;
      
      const { BasiqService } = await import("./services/basiq");
      const basiq = new BasiqService();
      
      const importedCount = await basiq.syncTransactionsToDatabase(req.params.id, fromDate);
      
      // Update account balance using consent-based account fetch
      const account = await storage.getBankAccountById(req.params.id);
      if (account) {
        const connection = await storage.getBankConnectionById(account.connectionId);
        if (connection?.basiqConsentId) {
          // Use consent-based account fetch
          const accounts = await basiq.getAccountsByConsent(connection.basiqConsentId);
          const basiqAccount = accounts.find((a: any) => a.id === account.basiqAccountId);
          if (basiqAccount) {
            await storage.updateBankAccount(account.id, {
              balance: basiqAccount.balance,
              availableFunds: basiqAccount.availableFunds,
              lastUpdatedAt: new Date()
            });
          }
        }
      }
      
      res.json({ 
        success: true, 
        importedCount,
        message: `Imported ${importedCount} new transactions` 
      });
    } catch (error: any) {
      console.error("Error syncing transactions:", error);
      res.status(500).json({ error: error.message || "Failed to sync transactions" });
    }
  });

  // Get financial overview/summary
  app.get("/api/financial/overview", requireRoles("admin", "scheduler", "production_manager"), async (req, res) => {
    try {
      const accounts = await storage.getBankAccounts();
      const connections = await storage.getBankConnections();
      
      // Calculate totals
      let totalBalance = 0;
      let totalAvailable = 0;
      
      for (const account of accounts) {
        if (account.isActive) {
          totalBalance += parseFloat(account.balance || "0");
          totalAvailable += parseFloat(account.availableFunds || "0");
        }
      }

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentTransactions = await storage.getAllBankTransactions({
        fromDate: thirtyDaysAgo.toISOString().split("T")[0],
        limit: 10
      });

      // Calculate income/expenses for the month
      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      const allRecentTx = await storage.getAllBankTransactions({
        fromDate: thirtyDaysAgo.toISOString().split("T")[0],
        limit: 1000
      });

      for (const tx of allRecentTx) {
        const amount = parseFloat(tx.amount || "0");
        if (tx.direction === "credit") {
          monthlyIncome += amount;
        } else {
          monthlyExpenses += amount;
        }
      }

      res.json({
        totalBalance,
        totalAvailable,
        monthlyIncome,
        monthlyExpenses,
        accountCount: accounts.filter(a => a.isActive).length,
        connectionCount: connections.filter(c => c.status === "active").length,
        recentTransactions,
        lastSyncedAt: connections.length > 0 ? connections[0].lastSyncedAt : null
      });
    } catch (error) {
      console.error("Error fetching financial overview:", error);
      res.status(500).json({ error: "Failed to fetch overview" });
    }
  });

  // ============================================
  // STAFF TRANSACTIONS / EXPENSE MANAGEMENT
  // ============================================

  // Get staff transaction summary
  app.get("/api/financial/staff-summary", requireRoles("admin"), async (req, res) => {
    try {
      const summary = await storage.getStaffTransactionSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching staff summary:", error);
      res.status(500).json({ error: "Failed to fetch staff summary" });
    }
  });

  // Get transactions for specific staff member
  app.get("/api/financial/staff/:staffId/transactions", requireRoles("admin"), async (req, res) => {
    try {
      const { staffId } = req.params;
      const { fromDate, toDate, category, limit } = req.query;
      
      const transactions = await storage.getTransactionsByStaff(staffId, {
        fromDate: fromDate as string,
        toDate: toDate as string,
        category: category as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching staff transactions:", error);
      res.status(500).json({ error: "Failed to fetch staff transactions" });
    }
  });

  // Update transaction (allocate to staff/job, set category)
  app.patch("/api/financial/transactions/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { allocatedStaffId, allocatedJobId, expenseCategoryId, allocationNotes } = req.body;
      
      const updated = await storage.updateBankTransaction(id, {
        allocatedStaffId,
        allocatedJobId,
        expenseCategoryId,
        allocationNotes
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Auto-allocate transactions by card number
  app.post("/api/financial/auto-allocate", requireRoles("admin"), async (req, res) => {
    try {
      const count = await storage.autoAllocateTransactionsByCardNumber();
      res.json({ 
        success: true, 
        allocatedCount: count,
        message: `Auto-allocated ${count} transactions` 
      });
    } catch (error) {
      console.error("Error auto-allocating transactions:", error);
      res.status(500).json({ error: "Failed to auto-allocate transactions" });
    }
  });

  // ============================================
  // EXPENSE CATEGORIES
  // ============================================

  // Get all expense categories
  app.get("/api/expense-categories", requireRoles("admin", "scheduler", "production_manager"), async (req, res) => {
    try {
      const categories = await storage.getExpenseCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({ error: "Failed to fetch expense categories" });
    }
  });

  // Get active expense categories only
  app.get("/api/expense-categories/active", async (req, res) => {
    try {
      const categories = await storage.getActiveExpenseCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching active expense categories:", error);
      res.status(500).json({ error: "Failed to fetch expense categories" });
    }
  });

  // Create expense category
  app.post("/api/expense-categories", requireRoles("admin"), async (req, res) => {
    try {
      const category = await storage.createExpenseCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating expense category:", error);
      res.status(500).json({ error: "Failed to create expense category" });
    }
  });

  // Update expense category
  app.patch("/api/expense-categories/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateExpenseCategory(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating expense category:", error);
      res.status(500).json({ error: "Failed to update expense category" });
    }
  });

  // Delete expense category
  app.delete("/api/expense-categories/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExpenseCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense category:", error);
      res.status(500).json({ error: "Failed to delete expense category" });
    }
  });

  // ============================================
  // RECEIPT SUBMISSIONS
  // ============================================

  // Get all receipt submissions (admin)
  app.get("/api/receipts", requireRoles("admin"), async (req, res) => {
    try {
      const { status } = req.query;
      const receipts = await storage.getReceiptSubmissions(
        status ? { status: status as string } : undefined
      );
      res.json(receipts);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  // Get pending receipts (admin)
  app.get("/api/receipts/pending", requireRoles("admin"), async (req, res) => {
    try {
      const receipts = await storage.getPendingReceipts();
      res.json(receipts);
    } catch (error) {
      console.error("Error fetching pending receipts:", error);
      res.status(500).json({ error: "Failed to fetch pending receipts" });
    }
  });

  // Create receipt submission link (admin generates link for staff)
  app.post("/api/receipts/create-link", requireRoles("admin"), async (req, res) => {
    try {
      const { staffId, description, amount, expenseCategoryId } = req.body;
      
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry
      
      const receipt = await storage.createReceiptSubmission({
        submissionToken: token,
        staffId,
        description,
        expectedAmount: amount,
        expenseCategoryId,
        status: "pending",
        expiresAt
      });
      
      const submissionUrl = `${req.protocol}://${req.get("host")}/submit-receipt/${token}`;
      
      res.status(201).json({
        receipt,
        submissionUrl,
        expiresAt
      });
    } catch (error) {
      console.error("Error creating receipt link:", error);
      res.status(500).json({ error: "Failed to create receipt link" });
    }
  });

  // Validate receipt submission link (public - for checking link validity)
  app.get("/api/receipts/validate/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const receipt = await storage.getReceiptSubmissionByToken(token);
      
      if (!receipt) {
        return res.status(404).json({ error: "Receipt link not found or expired" });
      }
      
      if (receipt.expiresAt && new Date(receipt.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Receipt link has expired" });
      }
      
      // Return minimal info for validation
      res.json({
        id: receipt.id,
        status: receipt.status,
        expectedAmount: receipt.expectedAmount,
        notes: receipt.notes,
        expiresAt: receipt.expiresAt,
        createdAt: receipt.createdAt
      });
    } catch (error) {
      console.error("Error validating receipt token:", error);
      res.status(500).json({ error: "Failed to validate receipt link" });
    }
  });

  // Get receipt submission by token (public - for staff to upload)
  app.get("/api/receipts/submit/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const receipt = await storage.getReceiptSubmissionByToken(token);
      
      if (!receipt) {
        return res.status(404).json({ error: "Receipt link not found or expired" });
      }
      
      if (receipt.expiresAt && new Date(receipt.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Receipt link has expired" });
      }
      
      if (receipt.status !== "pending") {
        return res.status(400).json({ error: "Receipt has already been submitted" });
      }
      
      // Get active categories for the form
      const categories = await storage.getActiveExpenseCategories();
      
      res.json({ receipt, categories });
    } catch (error) {
      console.error("Error fetching receipt by token:", error);
      res.status(500).json({ error: "Failed to fetch receipt" });
    }
  });

  // Submit receipt (public - staff uploads via link)
  app.post("/api/receipts/submit/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { imageUrl, actualAmount, expenseCategoryId, notes, merchantName, purchaseDate } = req.body;
      
      const receipt = await storage.getReceiptSubmissionByToken(token);
      
      if (!receipt) {
        return res.status(404).json({ error: "Receipt link not found" });
      }
      
      if (receipt.expiresAt && new Date(receipt.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Receipt link has expired" });
      }
      
      if (receipt.status !== "pending") {
        return res.status(400).json({ error: "Receipt has already been submitted" });
      }
      
      const updated = await storage.updateReceiptSubmission(receipt.id, {
        imageUrl,
        actualAmount,
        expenseCategoryId: expenseCategoryId || receipt.expenseCategoryId,
        notes,
        merchantName,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        status: "submitted",
        submittedAt: new Date()
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error submitting receipt:", error);
      res.status(500).json({ error: "Failed to submit receipt" });
    }
  });

  // Match receipt to transaction (admin)
  app.post("/api/receipts/:id/match", requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { transactionId } = req.body;
      const user = req.user as User;
      
      if (!transactionId) {
        return res.status(400).json({ error: "Transaction ID required" });
      }
      
      await storage.matchReceiptToTransaction(id, transactionId, user.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error matching receipt:", error);
      res.status(500).json({ error: "Failed to match receipt" });
    }
  });

  // Update receipt (admin)
  app.patch("/api/receipts/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateReceiptSubmission(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating receipt:", error);
      res.status(500).json({ error: "Failed to update receipt" });
    }
  });

  // Delete receipt (admin)
  app.delete("/api/receipts/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteReceiptSubmission(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting receipt:", error);
      res.status(500).json({ error: "Failed to delete receipt" });
    }
  });

  // Import Products/Inventory
  app.post("/api/import/products", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const sku = row.sku?.trim();
          const name = row.name?.trim();
          const category = row.category?.trim();
          const costPrice = row.costPrice;
          const sellPrice = row.sellPrice;

          if (!sku || !name || !category || costPrice === undefined || sellPrice === undefined) {
            errors.push(`Row missing required fields: sku=${sku || 'missing'}`);
            failed++;
            continue;
          }

          const validCategories = ["fencing", "gates", "hardware", "accessories", "other"];
          if (!validCategories.includes(category)) {
            errors.push(`Invalid category for ${sku}: ${category}`);
            failed++;
            continue;
          }

          await storage.createProduct({
            sku,
            name,
            description: row.description?.trim() || null,
            category: category as any,
            dimensions: row.dimensions?.trim() || null,
            color: row.color?.trim() || null,
            costPrice: String(costPrice),
            sellPrice: String(sellPrice),
            tradePrice: row.tradePrice ? String(row.tradePrice) : null,
            stockOnHand: parseInt(row.stockOnHand) || 0,
            reorderPoint: parseInt(row.reorderPoint) || 10,
            isActive: row.isActive !== "false" && row.isActive !== false
          });
          success++;
        } catch (err: any) {
          failed++;
          errors.push(`Failed to import product: ${row.sku || 'unknown'} - ${err.message || ''}`);
        }
      }

      res.json({ success, failed, errors });
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ error: "Failed to import products" });
    }
  });

  // ==========================================
  // JOB PIPELINE CONFIGURATION
  // ==========================================

  // Get all job pipelines
  app.get("/api/job-pipelines", async (req, res) => {
    try {
      const pipelines = await storage.getJobPipelines();
      res.json(pipelines);
    } catch (error) {
      console.error("Error fetching job pipelines:", error);
      res.status(500).json({ error: "Failed to fetch job pipelines" });
    }
  });

  // Get a single job pipeline with stages
  app.get("/api/job-pipelines/:id", async (req, res) => {
    try {
      const pipeline = await storage.getJobPipeline(req.params.id);
      if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
      }
      const stages = await storage.getJobPipelineStages(req.params.id);
      res.json({ ...pipeline, stages });
    } catch (error) {
      console.error("Error fetching job pipeline:", error);
      res.status(500).json({ error: "Failed to fetch job pipeline" });
    }
  });

  // Create a new job pipeline
  app.post("/api/job-pipelines", requireRoles("admin"), async (req, res) => {
    try {
      const { name, description, isActive } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const pipeline = await storage.createJobPipeline({
        name,
        description: description || null,
        isActive: isActive !== false
      });
      res.status(201).json(pipeline);
    } catch (error) {
      console.error("Error creating job pipeline:", error);
      res.status(500).json({ error: "Failed to create job pipeline" });
    }
  });

  // Update a job pipeline
  app.patch("/api/job-pipelines/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { name, description, isActive } = req.body;
      const pipeline = await storage.updateJobPipeline(req.params.id, {
        name,
        description,
        isActive
      });
      if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
      }
      res.json(pipeline);
    } catch (error) {
      console.error("Error updating job pipeline:", error);
      res.status(500).json({ error: "Failed to update job pipeline" });
    }
  });

  // Delete a job pipeline
  app.delete("/api/job-pipelines/:id", requireRoles("admin"), async (req, res) => {
    try {
      await storage.deleteJobPipeline(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting job pipeline:", error);
      res.status(500).json({ error: "Failed to delete job pipeline" });
    }
  });

  // Get stages for a pipeline
  app.get("/api/job-pipelines/:pipelineId/stages", async (req, res) => {
    try {
      const stages = await storage.getJobPipelineStages(req.params.pipelineId);
      res.json(stages);
    } catch (error) {
      console.error("Error fetching pipeline stages:", error);
      res.status(500).json({ error: "Failed to fetch pipeline stages" });
    }
  });

  // Create a new stage
  app.post("/api/job-pipelines/:pipelineId/stages", requireRoles("admin"), async (req, res) => {
    try {
      const { name, icon, completionType, isActive, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      // Get current max sort order if not provided
      let order = sortOrder;
      if (order === undefined) {
        const existingStages = await storage.getJobPipelineStages(req.params.pipelineId);
        order = existingStages.length > 0 
          ? Math.max(...existingStages.map(s => s.sortOrder)) + 1 
          : 0;
      }
      
      const stage = await storage.createJobPipelineStage({
        pipelineId: req.params.pipelineId,
        name,
        icon: icon || null,
        completionType: completionType || "manual",
        isActive: isActive !== false,
        sortOrder: order
      });
      res.status(201).json(stage);
    } catch (error) {
      console.error("Error creating pipeline stage:", error);
      res.status(500).json({ error: "Failed to create pipeline stage" });
    }
  });

  // Update a stage
  app.patch("/api/job-pipeline-stages/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { name, icon, completionType, isActive, sortOrder } = req.body;
      const stage = await storage.updateJobPipelineStage(req.params.id, {
        name,
        icon,
        completionType,
        isActive,
        sortOrder
      });
      if (!stage) {
        return res.status(404).json({ error: "Stage not found" });
      }
      res.json(stage);
    } catch (error) {
      console.error("Error updating pipeline stage:", error);
      res.status(500).json({ error: "Failed to update pipeline stage" });
    }
  });

  // Delete a stage
  app.delete("/api/job-pipeline-stages/:id", requireRoles("admin"), async (req, res) => {
    try {
      await storage.deleteJobPipelineStage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pipeline stage:", error);
      res.status(500).json({ error: "Failed to delete pipeline stage" });
    }
  });

  // Reorder stages
  app.post("/api/job-pipelines/:pipelineId/stages/reorder", requireRoles("admin"), async (req, res) => {
    try {
      const { stageIds } = req.body;
      if (!Array.isArray(stageIds)) {
        return res.status(400).json({ error: "stageIds must be an array" });
      }
      await storage.reorderJobPipelineStages(req.params.pipelineId, stageIds);
      const stages = await storage.getJobPipelineStages(req.params.pipelineId);
      res.json(stages);
    } catch (error) {
      console.error("Error reordering stages:", error);
      res.status(500).json({ error: "Failed to reorder stages" });
    }
  });

  // ============================================
  // JOB STAGE COMPLETIONS
  // ============================================

  // Get stage completions for a job
  app.get("/api/jobs/:jobId/stage-completions", async (req, res) => {
    try {
      const completions = await storage.getJobStageCompletions(req.params.jobId);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching job stage completions:", error);
      res.status(500).json({ error: "Failed to fetch stage completions" });
    }
  });

  // Toggle stage completion for a job
  app.post("/api/jobs/:jobId/stage-completions/:stageId/toggle", async (req, res) => {
    try {
      const userId = req.user?.id;
      const result = await storage.toggleJobStageCompletion(
        req.params.jobId, 
        req.params.stageId, 
        userId
      );
      res.json(result);
    } catch (error) {
      console.error("Error toggling stage completion:", error);
      res.status(500).json({ error: "Failed to toggle stage completion" });
    }
  });

  // ============================================
  // KANBAN COLUMNS CONFIGURATION
  // ============================================

  // Get all kanban columns
  app.get("/api/kanban-columns", async (req, res) => {
    try {
      const columns = await storage.getKanbanColumns();
      res.json(columns);
    } catch (error) {
      console.error("Error fetching kanban columns:", error);
      res.status(500).json({ error: "Failed to fetch kanban columns" });
    }
  });

  // Get single kanban column
  app.get("/api/kanban-columns/:id", async (req, res) => {
    try {
      const column = await storage.getKanbanColumn(req.params.id);
      if (!column) {
        return res.status(404).json({ error: "Kanban column not found" });
      }
      res.json(column);
    } catch (error) {
      console.error("Error fetching kanban column:", error);
      res.status(500).json({ error: "Failed to fetch kanban column" });
    }
  });

  // Create kanban column
  app.post("/api/kanban-columns", requireRoles("admin"), async (req, res) => {
    try {
      const { title, statuses, defaultStatus, color, isActive } = req.body;
      if (!title || !statuses || !defaultStatus || !color) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const column = await storage.createKanbanColumn({
        title,
        statuses,
        defaultStatus,
        color,
        isActive: isActive ?? true
      });
      res.status(201).json(column);
    } catch (error) {
      console.error("Error creating kanban column:", error);
      res.status(500).json({ error: "Failed to create kanban column" });
    }
  });

  // Update kanban column
  app.patch("/api/kanban-columns/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { title, statuses, defaultStatus, color, isActive, sortOrder } = req.body;
      const column = await storage.updateKanbanColumn(req.params.id, {
        title,
        statuses,
        defaultStatus,
        color,
        isActive,
        sortOrder
      });
      if (!column) {
        return res.status(404).json({ error: "Kanban column not found" });
      }
      res.json(column);
    } catch (error) {
      console.error("Error updating kanban column:", error);
      res.status(500).json({ error: "Failed to update kanban column" });
    }
  });

  // Delete kanban column
  app.delete("/api/kanban-columns/:id", requireRoles("admin"), async (req, res) => {
    try {
      await storage.deleteKanbanColumn(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting kanban column:", error);
      res.status(500).json({ error: "Failed to delete kanban column" });
    }
  });

  // Reorder kanban columns
  app.post("/api/kanban-columns/reorder", requireRoles("admin"), async (req, res) => {
    try {
      const { columnIds } = req.body;
      if (!Array.isArray(columnIds)) {
        return res.status(400).json({ error: "columnIds must be an array" });
      }
      await storage.reorderKanbanColumns(columnIds);
      const columns = await storage.getKanbanColumns();
      res.json(columns);
    } catch (error) {
      console.error("Error reordering kanban columns:", error);
      res.status(500).json({ error: "Failed to reorder kanban columns" });
    }
  });

  // ============================================
  // JOB STATUSES
  // ============================================

  // Get all job statuses
  app.get("/api/job-statuses", async (req, res) => {
    try {
      const statuses = await storage.getJobStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching job statuses:", error);
      res.status(500).json({ error: "Failed to fetch job statuses" });
    }
  });

  // Get single job status
  app.get("/api/job-statuses/:id", async (req, res) => {
    try {
      const status = await storage.getJobStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ error: "Job status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error fetching job status:", error);
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });

  // Create job status
  app.post("/api/job-statuses", requireRoles("admin"), async (req, res) => {
    try {
      const { key, label, description, isActive } = req.body;
      if (!key || !label) {
        return res.status(400).json({ error: "Missing required fields: key and label" });
      }
      const status = await storage.createJobStatus({
        key,
        label,
        description,
        isActive: isActive ?? true
      });
      res.json(status);
    } catch (error) {
      console.error("Error creating job status:", error);
      res.status(500).json({ error: "Failed to create job status" });
    }
  });

  // Update job status
  app.patch("/api/job-statuses/:id", requireRoles("admin"), async (req, res) => {
    try {
      const { key, label, description, isActive, sortOrder } = req.body;
      const status = await storage.updateJobStatus(req.params.id, {
        key,
        label,
        description,
        isActive,
        sortOrder
      });
      if (!status) {
        return res.status(404).json({ error: "Job status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ error: "Failed to update job status" });
    }
  });

  // Delete job status
  app.delete("/api/job-statuses/:id", requireRoles("admin"), async (req, res) => {
    try {
      await storage.deleteJobStatus(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting job status:", error);
      res.status(500).json({ error: "Failed to delete job status" });
    }
  });

  // Reorder job statuses
  app.post("/api/job-statuses/reorder", requireRoles("admin"), async (req, res) => {
    try {
      const { statusIds } = req.body;
      if (!Array.isArray(statusIds)) {
        return res.status(400).json({ error: "statusIds must be an array" });
      }
      await storage.reorderJobStatuses(statusIds);
      const statuses = await storage.getJobStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error reordering job statuses:", error);
      res.status(500).json({ error: "Failed to reorder job statuses" });
    }
  });

  // ============================================
  // JOB STATUS DEPENDENCIES
  // ============================================

  // Get all status dependencies
  app.get("/api/job-status-dependencies", async (req, res) => {
    try {
      const dependencies = await storage.getAllStatusDependencies();
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching status dependencies:", error);
      res.status(500).json({ error: "Failed to fetch status dependencies" });
    }
  });

  // Get dependencies for a specific status
  app.get("/api/job-status-dependencies/:statusKey", async (req, res) => {
    try {
      const dependencies = await storage.getStatusDependencies(req.params.statusKey);
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching status dependencies:", error);
      res.status(500).json({ error: "Failed to fetch status dependencies" });
    }
  });

  // Set dependencies for a status (replaces all existing)
  app.put("/api/job-status-dependencies/:statusKey", requireRoles("admin"), async (req, res) => {
    try {
      const { dependencies } = req.body;
      if (!Array.isArray(dependencies)) {
        return res.status(400).json({ error: "dependencies must be an array" });
      }
      await storage.setStatusDependencies(req.params.statusKey, dependencies);
      const updated = await storage.getStatusDependencies(req.params.statusKey);
      res.json(updated);
    } catch (error) {
      console.error("Error setting status dependencies:", error);
      res.status(500).json({ error: "Failed to set status dependencies" });
    }
  });

  // ============================================
  // PRODUCTION STAGES
  // ============================================

  // Get all production stages
  app.get("/api/production-stages", async (req, res) => {
    try {
      const stages = await storage.getProductionStages();
      res.json(stages);
    } catch (error) {
      console.error("Error fetching production stages:", error);
      res.status(500).json({ error: "Failed to fetch production stages" });
    }
  });

  // Get single production stage
  app.get("/api/production-stages/:id", async (req, res) => {
    try {
      const stage = await storage.getProductionStage(req.params.id);
      if (!stage) {
        return res.status(404).json({ error: "Production stage not found" });
      }
      res.json(stage);
    } catch (error) {
      console.error("Error fetching production stage:", error);
      res.status(500).json({ error: "Failed to fetch production stage" });
    }
  });

  // Create production stage
  app.post("/api/production-stages", requireRoles("admin"), async (req, res) => {
    try {
      const stage = await storage.createProductionStage(req.body);
      res.status(201).json(stage);
    } catch (error) {
      console.error("Error creating production stage:", error);
      res.status(500).json({ error: "Failed to create production stage" });
    }
  });

  // Update production stage
  app.patch("/api/production-stages/:id", requireRoles("admin"), async (req, res) => {
    try {
      const stage = await storage.updateProductionStage(req.params.id, req.body);
      if (!stage) {
        return res.status(404).json({ error: "Production stage not found" });
      }
      res.json(stage);
    } catch (error) {
      console.error("Error updating production stage:", error);
      res.status(500).json({ error: "Failed to update production stage" });
    }
  });

  // Delete production stage
  app.delete("/api/production-stages/:id", requireRoles("admin"), async (req, res) => {
    try {
      const success = await storage.deleteProductionStage(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Production stage not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting production stage:", error);
      res.status(500).json({ error: "Failed to delete production stage" });
    }
  });

  // Reorder production stages
  app.post("/api/production-stages/reorder", requireRoles("admin"), async (req, res) => {
    try {
      const { stageIds } = req.body;
      if (!Array.isArray(stageIds)) {
        return res.status(400).json({ error: "stageIds must be an array" });
      }
      await storage.reorderProductionStages(stageIds);
      const stages = await storage.getProductionStages();
      res.json(stages);
    } catch (error) {
      console.error("Error reordering production stages:", error);
      res.status(500).json({ error: "Failed to reorder production stages" });
    }
  });

  // ============================================
  // SALES CHECKLIST ITEMS
  // ============================================

  // Get all sales checklist items (admin only - for configuration page)
  app.get("/api/sales-checklist-items", requireRoles("admin"), async (req, res) => {
    try {
      const items = await storage.getSalesChecklistItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching sales checklist items:", error);
      res.status(500).json({ error: "Failed to fetch sales checklist items" });
    }
  });

  // Get active sales checklist items (sales/admin can access - needed during calls)
  app.get("/api/sales-checklist-items/active", requireRoles("admin", "sales"), async (req, res) => {
    try {
      const items = await storage.getActiveSalesChecklistItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching active sales checklist items:", error);
      res.status(500).json({ error: "Failed to fetch active sales checklist items" });
    }
  });

  // Get single sales checklist item (admin only - for configuration)
  app.get("/api/sales-checklist-items/:id", requireRoles("admin"), async (req, res) => {
    try {
      const item = await storage.getSalesChecklistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Sales checklist item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching sales checklist item:", error);
      res.status(500).json({ error: "Failed to fetch sales checklist item" });
    }
  });

  // Create sales checklist item
  app.post("/api/sales-checklist-items", requireRoles("admin"), async (req, res) => {
    try {
      const item = await storage.createSalesChecklistItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating sales checklist item:", error);
      res.status(500).json({ error: "Failed to create sales checklist item" });
    }
  });

  // Update sales checklist item
  app.patch("/api/sales-checklist-items/:id", requireRoles("admin"), async (req, res) => {
    try {
      const item = await storage.updateSalesChecklistItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Sales checklist item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating sales checklist item:", error);
      res.status(500).json({ error: "Failed to update sales checklist item" });
    }
  });

  // Delete sales checklist item
  app.delete("/api/sales-checklist-items/:id", requireRoles("admin"), async (req, res) => {
    try {
      const success = await storage.deleteSalesChecklistItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Sales checklist item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting sales checklist item:", error);
      res.status(500).json({ error: "Failed to delete sales checklist item" });
    }
  });

  // Reorder sales checklist items
  app.post("/api/sales-checklist-items/reorder", requireRoles("admin"), async (req, res) => {
    try {
      const { itemIds } = req.body;
      if (!Array.isArray(itemIds)) {
        return res.status(400).json({ error: "itemIds must be an array" });
      }
      await storage.reorderSalesChecklistItems(itemIds);
      const items = await storage.getSalesChecklistItems();
      res.json(items);
    } catch (error) {
      console.error("Error reordering sales checklist items:", error);
      res.status(500).json({ error: "Failed to reorder sales checklist items" });
    }
  });

  // ============================================
  // VOICE CALLS & AI COACHING
  // ============================================

  // Get all voice calls
  app.get("/api/voice-calls", requireAuth, async (req, res) => {
    try {
      const calls = await storage.getVoiceCalls();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching voice calls:", error);
      res.status(500).json({ error: "Failed to fetch voice calls" });
    }
  });

  // Get active voice calls (for live coach panel)
  app.get("/api/voice-calls/active", requireAuth, async (req, res) => {
    try {
      const calls = await storage.getActiveVoiceCalls();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching active voice calls:", error);
      res.status(500).json({ error: "Failed to fetch active voice calls" });
    }
  });

  // Get single voice call with full details
  app.get("/api/voice-calls/:id", requireAuth, async (req, res) => {
    try {
      const call = await storage.getVoiceCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Voice call not found" });
      }
      const [transcripts, checklistStatus, coachingPrompts] = await Promise.all([
        storage.getCallTranscripts(req.params.id),
        storage.getCallChecklistStatus(req.params.id),
        storage.getCallCoachingPrompts(req.params.id),
      ]);
      res.json({ call, transcripts, checklistStatus, coachingPrompts });
    } catch (error) {
      console.error("Error fetching voice call:", error);
      res.status(500).json({ error: "Failed to fetch voice call" });
    }
  });

  // Get voice calls by lead
  app.get("/api/leads/:leadId/voice-calls", requireAuth, async (req, res) => {
    try {
      const calls = await storage.getVoiceCallsByLead(req.params.leadId);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching voice calls for lead:", error);
      res.status(500).json({ error: "Failed to fetch voice calls for lead" });
    }
  });

  // Create voice call (manual or via Twilio webhook)
  app.post("/api/voice-calls", requireAuth, async (req, res) => {
    try {
      const call = await storage.createVoiceCall(req.body);
      // Initialize checklist status for the call
      await storage.initializeCallChecklistStatus(call.id);
      res.status(201).json(call);
    } catch (error) {
      console.error("Error creating voice call:", error);
      res.status(500).json({ error: "Failed to create voice call" });
    }
  });

  // Update voice call status
  app.patch("/api/voice-calls/:id", requireAuth, async (req, res) => {
    try {
      const call = await storage.updateVoiceCall(req.params.id, req.body);
      if (!call) {
        return res.status(404).json({ error: "Voice call not found" });
      }
      res.json(call);
    } catch (error) {
      console.error("Error updating voice call:", error);
      res.status(500).json({ error: "Failed to update voice call" });
    }
  });

  // Add transcript entry (from real-time transcription service)
  app.post("/api/voice-calls/:callId/transcripts", requireAuth, async (req, res) => {
    try {
      const transcript = await storage.createCallTranscript({
        callId: req.params.callId,
        ...req.body,
      });
      res.status(201).json(transcript);
    } catch (error) {
      console.error("Error creating transcript:", error);
      res.status(500).json({ error: "Failed to create transcript" });
    }
  });

  // Update checklist item status during call
  app.patch("/api/voice-calls/:callId/checklist/:checklistItemId", requireAuth, async (req, res) => {
    try {
      const { isCovered, detectedText } = req.body;
      const status = await storage.updateCallChecklistItemStatus(
        req.params.callId,
        req.params.checklistItemId,
        isCovered,
        detectedText
      );
      if (!status) {
        return res.status(404).json({ error: "Checklist status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error updating checklist status:", error);
      res.status(500).json({ error: "Failed to update checklist status" });
    }
  });

  // Create coaching prompt (from AI coaching service)
  app.post("/api/voice-calls/:callId/coaching-prompts", requireAuth, async (req, res) => {
    try {
      const prompt = await storage.createCallCoachingPrompt({
        callId: req.params.callId,
        ...req.body,
      });
      res.status(201).json(prompt);
    } catch (error) {
      console.error("Error creating coaching prompt:", error);
      res.status(500).json({ error: "Failed to create coaching prompt" });
    }
  });

  // Acknowledge coaching prompt
  app.post("/api/coaching-prompts/:id/acknowledge", requireAuth, async (req, res) => {
    try {
      const prompt = await storage.acknowledgeCallCoachingPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ error: "Coaching prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error acknowledging coaching prompt:", error);
      res.status(500).json({ error: "Failed to acknowledge coaching prompt" });
    }
  });

  // ============================================
  // TWILIO VOICE WEBHOOKS
  // ============================================

  // Get Voice SDK token for browser-based calling
  app.get("/api/voice/token", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const isConfigured = await isVoiceSdkConfigured();
      if (!isConfigured) {
        return res.json({ 
          configured: false,
          message: "Voice SDK not configured. Set TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_TWIML_APP_SID"
        });
      }

      const token = await generateVoiceToken(userId);
      if (!token) {
        return res.status(500).json({ error: "Failed to generate voice token" });
      }

      res.json({ 
        configured: true,
        token,
        identity: userId
      });
    } catch (error) {
      console.error("Error generating voice token:", error);
      res.status(500).json({ error: "Failed to generate voice token" });
    }
  });

  // Initiate outbound call
  app.post("/api/voice/call", requireAuth, async (req, res) => {
    try {
      const { phoneNumber, leadId, clientId } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number required" });
      }

      const webhookBaseUrl = `${req.protocol}://${req.get('host')}`;
      
      const result = await makeOutboundCall({
        to: phoneNumber,
        webhookBaseUrl,
        staffUserId: req.session?.userId,
        leadId,
        clientId,
      });

      if (!result) {
        return res.status(500).json({ error: "Failed to initiate call" });
      }

      const call = await storage.createVoiceCall({
        twilioCallSid: result.sid,
        direction: "outbound",
        status: "ringing",
        fromNumber: await getTwilioFromPhoneNumber() || "",
        toNumber: phoneNumber,
        staffUserId: req.session?.userId,
        leadId,
        clientId,
      });

      await storage.initializeCallChecklistStatus(call.id);

      res.json({ callId: call.id, callSid: result.sid });
    } catch (error) {
      console.error("Error initiating call:", error);
      res.status(500).json({ error: "Failed to initiate call" });
    }
  });

  // End/hangup a call
  app.post("/api/voice-calls/:id/hangup", requireAuth, async (req, res) => {
    try {
      const call = await storage.getVoiceCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }

      if (call.twilioCallSid) {
        try {
          const twilioClient = await getTwilioClient();
          if (twilioClient) {
            await twilioClient.calls(call.twilioCallSid).update({ status: 'completed' });
          }
        } catch (twilioError: any) {
          console.log("Twilio hangup error (may already be ended):", twilioError.message);
        }
      }

      await storage.updateVoiceCall(call.id, { 
        status: "completed",
        endedAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error hanging up call:", error);
      res.status(500).json({ error: "Failed to hang up call" });
    }
  });

  // Twilio inbound call webhook
  app.post("/api/twilio/voice/inbound", async (req, res) => {
    try {
      const { CallSid, From, To, CallStatus } = req.body;
      console.log("Inbound call webhook:", { CallSid, From, To, CallStatus });

      const webhookBaseUrl = `${req.protocol}://${req.get('host')}`;
      
      const call = await storage.createVoiceCall({
        twilioCallSid: CallSid,
        direction: "inbound",
        status: "ringing",
        fromNumber: From,
        toNumber: To,
      });

      await storage.initializeCallChecklistStatus(call.id);

      const twiml = generateTwimlForInbound({
        greeting: "Thank you for calling Probuild PVC. Connecting you now.",
        webhookBaseUrl,
        callId: call.id,
        callSid: CallSid,
      });

      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling inbound call:", error);
      res.status(500).send("Error");
    }
  });

  // Twilio outbound call answer webhook (also handles TwiML App for Voice SDK)
  app.post("/api/twilio/voice/outbound", async (req, res) => {
    try {
      const { CallSid, To, From, Caller } = req.body;
      console.log("Outbound/TwiML App webhook:", req.body);

      const webhookBaseUrl = `${req.protocol}://${req.get('host')}`;
      const VoiceResponse = require('twilio').twiml.VoiceResponse;
      const response = new VoiceResponse();
      
      // If To parameter exists, this is from the Voice SDK making an outbound call
      if (To && To.startsWith('+')) {
        // Voice SDK call - dial the actual phone number
        console.log(`Voice SDK dialing: ${To}`);
        
        // Create call record in database
        const call = await storage.createVoiceCall({
          twilioCallSid: CallSid,
          direction: "outbound",
          status: "ringing",
          fromNumber: From || Caller || "",
          toNumber: To,
        });
        
        await storage.initializeCallChecklistStatus(call.id);
        
        // Set up media stream for transcription
        const wsUrl = webhookBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
        const start = response.start() as any;
        start.stream({
          url: `${wsUrl}/api/twilio/media-stream?callSid=${CallSid}&callId=${call.id}`,
          track: 'both_tracks'
        });
        
        // Dial the destination number
        const dial = response.dial({
          callerId: From || await getTwilioFromPhoneNumber(),
          record: 'record-from-answer-dual',
          recordingStatusCallback: `${webhookBaseUrl}/api/twilio/voice/recording`,
          recordingStatusCallbackMethod: 'POST',
        });
        dial.number(To);
      } else {
        // Legacy API-initiated call - just set up media stream
        const call = await storage.getVoiceCallBySid(CallSid);
        
        if (call) {
          const wsUrl = webhookBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
          const start = response.start() as any;
          start.stream({
            url: `${wsUrl}/api/twilio/media-stream?callSid=${CallSid}&callId=${call.id}`,
            track: 'both_tracks'
          });
        }
        
        // Say a greeting since this is an answered API-initiated call
        response.say({ voice: 'Polly.Matthew' }, 'Connected.');
      }

      res.type('text/xml');
      res.send(response.toString());
    } catch (error) {
      console.error("Error handling outbound call:", error);
      const VoiceResponse = require('twilio').twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say({ voice: 'Polly.Matthew' }, 'Sorry, there was an error connecting your call.');
      res.type('text/xml');
      res.send(response.toString());
    }
  });
  
  // Also handle GET requests for TwiML app
  app.get("/api/twilio/voice/outbound", async (req, res) => {
    res.status(200).send("TwiML App endpoint - use POST");
  });

  // Twilio call status webhook
  app.post("/api/twilio/voice/status", async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration, Timestamp } = req.body;
      console.log("Call status webhook:", { CallSid, CallStatus, CallDuration });

      const call = await storage.getVoiceCallBySid(CallSid);
      if (!call) {
        console.log("Call not found for SID:", CallSid);
        return res.status(200).send("OK");
      }

      const statusMap: Record<string, any> = {
        'initiated': 'ringing',
        'ringing': 'ringing',
        'in-progress': 'in_progress',
        'completed': 'completed',
        'busy': 'busy',
        'failed': 'failed',
        'no-answer': 'no_answer',
        'canceled': 'canceled',
      };

      const updates: any = {
        status: statusMap[CallStatus] || call.status,
      };

      if (CallStatus === 'in-progress' && !call.answeredAt) {
        updates.answeredAt = new Date();
      }

      if (['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(CallStatus)) {
        updates.endedAt = new Date();
        if (CallDuration) {
          updates.duration = parseInt(CallDuration);
        }
      }

      await storage.updateVoiceCall(call.id, updates);

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error handling call status:", error);
      res.status(200).send("OK");
    }
  });

  // Twilio recording status webhook
  app.post("/api/twilio/voice/recording", async (req, res) => {
    try {
      const { CallSid, RecordingSid, RecordingUrl, RecordingStatus, RecordingDuration } = req.body;
      console.log("Recording webhook:", { CallSid, RecordingSid, RecordingStatus });

      if (RecordingStatus !== 'completed') {
        return res.status(200).send("OK");
      }

      const call = await storage.getVoiceCallBySid(CallSid);
      if (!call) {
        console.log("Call not found for recording SID:", CallSid);
        return res.status(200).send("OK");
      }

      await storage.updateVoiceCall(call.id, {
        recordingUrl: RecordingUrl,
        recordingSid: RecordingSid,
        duration: RecordingDuration ? parseInt(RecordingDuration) : call.duration,
      });

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error handling recording:", error);
      res.status(200).send("OK");
    }
  });

  // ============================================
  // AI COACHING ENDPOINTS
  // ============================================

  // Trigger AI analysis of call transcript
  app.post("/api/voice-calls/:callId/analyze", requireAuth, async (req, res) => {
    try {
      await processTranscriptUpdate(req.params.callId);
      
      const [checklistStatus, coachingPrompts] = await Promise.all([
        storage.getCallChecklistStatus(req.params.callId),
        storage.getCallCoachingPrompts(req.params.callId),
      ]);

      res.json({ checklistStatus, coachingPrompts });
    } catch (error) {
      console.error("Error analyzing transcript:", error);
      res.status(500).json({ error: "Failed to analyze transcript" });
    }
  });

  // Get AI-suggested response for customer question
  app.post("/api/voice-calls/:callId/suggest-response", requireAuth, async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question required" });
      }

      const response = await generateSuggestedResponse(req.params.callId, question);
      res.json({ suggestedResponse: response });
    } catch (error) {
      console.error("Error generating suggested response:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // ============================================
  // TWILIO MEDIA STREAM WEBSOCKET
  // ============================================

  // Initialize singleton WebSocket server for Twilio Media Streams
  initializeMediaStreamServer(httpServer);

  return httpServer;
}
