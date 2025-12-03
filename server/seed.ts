import { db } from "./db";
import {
  users, clients, leads, fenceStyles, products, quotes, jobs,
  productionTasks, installTasks, scheduleEvents, payments, notifications
} from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (order matters due to foreign key constraints)
  await db.delete(notifications);
  await db.delete(payments);
  await db.delete(scheduleEvents);
  await db.delete(installTasks);
  await db.delete(productionTasks);
  await db.delete(jobs);
  await db.delete(quotes);
  await db.delete(leads);
  await db.delete(clients);
  await db.delete(products);
  await db.delete(fenceStyles);
  await db.delete(users);

  // Create Users
  const [adminUser] = await db.insert(users).values({
    username: "vonnie",
    password: "password123",
    email: "vonnie@probuildpvc.com.au",
    firstName: "Vonnie",
    lastName: "Bradley",
    phone: "0412 345 678",
    role: "admin",
  }).returning();

  const [salesUser] = await db.insert(users).values({
    username: "dave",
    password: "password123",
    email: "dave@probuildpvc.com.au",
    firstName: "Dave",
    lastName: "Smith",
    phone: "0423 456 789",
    role: "sales",
  }).returning();

  const [schedulerUser] = await db.insert(users).values({
    username: "craig",
    password: "password123",
    email: "craig@probuildpvc.com.au",
    firstName: "Craig",
    lastName: "Johnson",
    phone: "0434 567 890",
    role: "scheduler",
  }).returning();

  const [productionUser] = await db.insert(users).values({
    username: "david.turner",
    password: "password123",
    email: "david.turner@probuildpvc.com.au",
    firstName: "David",
    lastName: "Turner",
    phone: "0445 678 901",
    role: "production_manager",
  }).returning();

  const [warehouseUser] = await db.insert(users).values({
    username: "george",
    password: "password123",
    email: "george@probuildpvc.com.au",
    firstName: "George",
    lastName: "Williams",
    phone: "0456 789 012",
    role: "warehouse",
  }).returning();

  const [installer1] = await db.insert(users).values({
    username: "jake",
    password: "password123",
    email: "jake@probuildpvc.com.au",
    firstName: "Jake",
    lastName: "Miller",
    phone: "0467 890 123",
    role: "installer",
  }).returning();

  const [installer2] = await db.insert(users).values({
    username: "jarrad",
    password: "password123",
    email: "jarrad@probuildpvc.com.au",
    firstName: "Jarrad",
    lastName: "Brown",
    phone: "0478 901 234",
    role: "installer",
  }).returning();

  console.log("Created users");

  // Create Fence Styles
  const [hamptonStyle] = await db.insert(fenceStyles).values({
    name: "Hampton",
    description: "Classic horizontal slat design with clean lines",
    standardHeights: [1200, 1500, 1800],
    postTypes: ["65x65", "90x90"],
    picketSpacingOptions: [10, 15, 20],
    basePrice: "185.00",
  }).returning();

  const [picketStyle] = await db.insert(fenceStyles).values({
    name: "Picket",
    description: "Traditional picket fence design",
    standardHeights: [900, 1200, 1500],
    postTypes: ["65x65"],
    picketSpacingOptions: [50, 75, 100],
    basePrice: "155.00",
  }).returning();

  const [colonialStyle] = await db.insert(fenceStyles).values({
    name: "Colonial",
    description: "Elegant colonial-style with decorative caps",
    standardHeights: [1500, 1800, 2100],
    postTypes: ["90x90", "127x127"],
    picketSpacingOptions: [0],
    basePrice: "220.00",
  }).returning();

  const [nautilusStyle] = await db.insert(fenceStyles).values({
    name: "Nautilus",
    description: "Modern horizontal slat design with wider gaps",
    standardHeights: [1200, 1500, 1800],
    postTypes: ["65x65", "90x90"],
    picketSpacingOptions: [25, 35, 50],
    basePrice: "195.00",
  }).returning();

  console.log("Created fence styles");

  // Create Products
  const productsData = [
    { sku: "POST-65-1800", name: "Post 65x65mm 1800mm", category: "posts" as const, costPrice: "45.00", sellPrice: "85.00", stockOnHand: 150 },
    { sku: "POST-90-1800", name: "Post 90x90mm 1800mm", category: "posts" as const, costPrice: "65.00", sellPrice: "120.00", stockOnHand: 80 },
    { sku: "POST-90-2400", name: "Post 90x90mm 2400mm", category: "posts" as const, costPrice: "85.00", sellPrice: "155.00", stockOnHand: 45 },
    { sku: "RAIL-65-2400", name: "Rail 65x40mm 2400mm", category: "rails" as const, costPrice: "22.00", sellPrice: "42.00", stockOnHand: 200 },
    { sku: "RAIL-65-3000", name: "Rail 65x40mm 3000mm", category: "rails" as const, costPrice: "28.00", sellPrice: "52.00", stockOnHand: 180 },
    { sku: "PICKET-65-900", name: "Picket 65x16mm 900mm", category: "pickets" as const, costPrice: "8.00", sellPrice: "16.00", stockOnHand: 500 },
    { sku: "PICKET-65-1200", name: "Picket 65x16mm 1200mm", category: "pickets" as const, costPrice: "10.00", sellPrice: "20.00", stockOnHand: 450 },
    { sku: "PICKET-65-1500", name: "Picket 65x16mm 1500mm", category: "pickets" as const, costPrice: "12.00", sellPrice: "24.00", stockOnHand: 320 },
    { sku: "CAP-65", name: "Post Cap 65mm", category: "caps" as const, costPrice: "4.00", sellPrice: "8.50", stockOnHand: 300 },
    { sku: "CAP-90", name: "Post Cap 90mm", category: "caps" as const, costPrice: "6.00", sellPrice: "12.00", stockOnHand: 200 },
    { sku: "GATE-S-900", name: "Single Gate 900mm", category: "gates" as const, costPrice: "180.00", sellPrice: "380.00", stockOnHand: 12 },
    { sku: "GATE-S-1200", name: "Single Gate 1200mm", category: "gates" as const, costPrice: "220.00", sellPrice: "450.00", stockOnHand: 8 },
    { sku: "GATE-D-2400", name: "Double Gate 2400mm", category: "gates" as const, costPrice: "450.00", sellPrice: "850.00", stockOnHand: 6 },
    { sku: "BRACKET-RAIL", name: "Rail Bracket", category: "hardware" as const, costPrice: "2.50", sellPrice: "5.50", stockOnHand: 1000 },
    { sku: "SCREW-SS-50", name: "SS Screws 50mm (100pk)", category: "hardware" as const, costPrice: "12.00", sellPrice: "25.00", stockOnHand: 50 },
  ];

  await db.insert(products).values(productsData as any[]);
  console.log("Created products");

  // Create Clients
  const [client1] = await db.insert(clients).values({
    name: "John & Sarah Smith",
    phone: "0412 111 222",
    email: "smith.family@email.com",
    address: "45 Coastal Drive, Scarborough WA 6019",
    clientType: "public",
    notes: "Referred by neighbour",
  }).returning();

  const [client2] = await db.insert(clients).values({
    name: "Michael Johnson",
    phone: "0423 222 333",
    email: "m.johnson@email.com",
    address: "128 Beach Road, Cottesloe WA 6011",
    clientType: "public",
  }).returning();

  const [client3] = await db.insert(clients).values({
    name: "Premium Fencing Solutions",
    phone: "0434 333 444",
    email: "orders@premiumfencing.com.au",
    address: "Unit 5, 22 Industrial Way, Malaga WA 6090",
    clientType: "trade",
    companyName: "Premium Fencing Solutions Pty Ltd",
    abn: "12 345 678 901",
    tradeDiscountLevel: "gold",
  }).returning();

  const [client4] = await db.insert(clients).values({
    name: "WA Landscape Co",
    phone: "0445 444 555",
    email: "info@walandscape.com.au",
    address: "88 Garden Street, Subiaco WA 6008",
    clientType: "trade",
    companyName: "WA Landscape Co Pty Ltd",
    abn: "23 456 789 012",
    tradeDiscountLevel: "silver",
  }).returning();

  const [client5] = await db.insert(clients).values({
    name: "Emma Thompson",
    phone: "0456 555 666",
    email: "emma.t@email.com",
    address: "15 Ocean View Terrace, City Beach WA 6015",
    clientType: "public",
  }).returning();

  console.log("Created clients");

  // Create Leads
  const [lead1] = await db.insert(leads).values({
    clientId: client1.id,
    source: "website",
    leadType: "public",
    description: "Looking for Hampton style fence for backyard",
    siteAddress: "45 Coastal Drive, Scarborough WA 6019",
    measurementsProvided: true,
    fenceLength: "35.5",
    fenceStyle: "Hampton",
    stage: "quote_sent",
    assignedTo: salesUser.id,
    notes: "Customer wants 1800mm height. Has existing colorbond to remove.",
  }).returning();

  const [lead2] = await db.insert(leads).values({
    clientId: client2.id,
    source: "phone",
    leadType: "public",
    description: "Pool fencing enquiry",
    siteAddress: "128 Beach Road, Cottesloe WA 6011",
    measurementsProvided: false,
    stage: "contacted",
    assignedTo: salesUser.id,
    notes: "Needs site measure. Pool compliance required.",
  }).returning();

  const [lead3] = await db.insert(leads).values({
    clientId: client5.id,
    source: "referral",
    leadType: "public",
    description: "Front fence and side gates",
    siteAddress: "15 Ocean View Terrace, City Beach WA 6015",
    measurementsProvided: true,
    fenceLength: "22.0",
    fenceStyle: "Colonial",
    stage: "new",
    assignedTo: salesUser.id,
  }).returning();

  const [lead4] = await db.insert(leads).values({
    source: "walk_in",
    leadType: "public",
    description: "Picket fence for heritage home",
    siteAddress: "88 Heritage Lane, Claremont WA 6010",
    stage: "new",
  }).returning();

  console.log("Created leads");

  // Create Quotes
  const [quote1] = await db.insert(quotes).values({
    quoteNumber: "Q-2024-0001",
    clientId: client1.id,
    leadId: lead1.id,
    fenceStyleId: hamptonStyle.id,
    siteAddress: "45 Coastal Drive, Scarborough WA 6019",
    totalLength: "35.5",
    fenceHeight: "1800",
    lineItems: [
      { productId: "POST-90-2400", productName: "Post 90x90mm 2400mm", quantity: 15, unitPrice: 155, totalPrice: 2325 },
      { productId: "RAIL-65-3000", productName: "Rail 65x40mm 3000mm", quantity: 48, unitPrice: 52, totalPrice: 2496 },
      { productId: "PICKET-65-1500", productName: "Picket 65x16mm 1500mm", quantity: 180, unitPrice: 24, totalPrice: 4320 },
      { productId: "CAP-90", productName: "Post Cap 90mm", quantity: 15, unitPrice: 12, totalPrice: 180 },
    ],
    materialsSubtotal: "9321.00",
    labourEstimate: "3200.00",
    totalAmount: "12521.00",
    depositRequired: "6260.50",
    depositPercent: 50,
    status: "sent",
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdBy: salesUser.id,
    notes: "Includes removal of existing colorbond fence",
  } as any).returning();

  const [quote2] = await db.insert(quotes).values({
    quoteNumber: "Q-2024-0002",
    clientId: client3.id,
    fenceStyleId: hamptonStyle.id,
    siteAddress: "Various Trade Jobs",
    totalLength: "100.0",
    fenceHeight: "1800",
    materialsSubtotal: "18500.00",
    labourEstimate: "0",
    totalAmount: "14800.00",
    depositRequired: "7400.00",
    depositPercent: 50,
    status: "approved",
    isTradeQuote: true,
    tradeDiscount: "20.00",
    approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdBy: salesUser.id,
  } as any).returning();

  console.log("Created quotes");

  // Create Jobs
  const [job1] = await db.insert(jobs).values({
    jobNumber: "JOB-2024-0089",
    clientId: client3.id,
    quoteId: quote2.id,
    jobType: "supply_only",
    siteAddress: "Various Trade Jobs",
    status: "manufacturing_panels",
    fenceStyle: "Hampton",
    totalLength: "100.0",
    fenceHeight: "1800",
    totalAmount: "14800.00",
    depositAmount: "7400.00",
    depositPaid: true,
    depositPaidAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    notes: "Trade order - Hampton panels bulk",
  } as any).returning();

  const [job2] = await db.insert(jobs).values({
    jobNumber: "JOB-2024-0088",
    clientId: client1.id,
    quoteId: quote1.id,
    jobType: "supply_install",
    siteAddress: "45 Coastal Drive, Scarborough WA 6019",
    status: "scheduled",
    fenceStyle: "Hampton",
    totalLength: "35.5",
    fenceHeight: "1800",
    totalAmount: "12521.00",
    depositAmount: "6260.50",
    depositPaid: true,
    depositPaidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    assignedInstaller: installer1.id,
    scheduledStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    notes: "Remove existing colorbond. Customer aware of timeline.",
  } as any).returning();

  const [job3] = await db.insert(jobs).values({
    jobNumber: "JOB-2024-0087",
    clientId: client4.id,
    quoteId: quote2.id,
    jobType: "supply_only",
    siteAddress: "88 Garden Street, Subiaco WA 6008",
    status: "ready_for_scheduling",
    fenceStyle: "Colonial",
    totalLength: "45.0",
    fenceHeight: "1500",
    totalAmount: "8950.00",
    depositAmount: "4475.00",
    depositPaid: true,
    depositPaidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  } as any).returning();

  console.log("Created jobs");

  // Create Production Tasks
  await db.insert(productionTasks).values([
    {
      jobId: job1.id,
      taskType: "cutting",
      status: "completed",
      assignedTo: warehouseUser.id,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
      timeSpentMinutes: 180,
    },
    {
      jobId: job1.id,
      taskType: "routing",
      status: "completed",
      assignedTo: warehouseUser.id,
      startTime: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      timeSpentMinutes: 120,
    },
    {
      jobId: job1.id,
      taskType: "assembly",
      status: "in_progress",
      assignedTo: warehouseUser.id,
      startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      jobId: job1.id,
      taskType: "qa",
      status: "pending",
    },
    {
      jobId: job2.id,
      taskType: "cutting",
      status: "completed",
      assignedTo: warehouseUser.id,
      timeSpentMinutes: 90,
    },
    {
      jobId: job2.id,
      taskType: "routing",
      status: "completed",
      assignedTo: warehouseUser.id,
      timeSpentMinutes: 60,
    },
    {
      jobId: job2.id,
      taskType: "assembly",
      status: "completed",
      assignedTo: warehouseUser.id,
      timeSpentMinutes: 150,
    },
    {
      jobId: job2.id,
      taskType: "qa",
      status: "completed",
      assignedTo: productionUser.id,
      qaResult: "passed",
      qaPassedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ] as any[]);

  console.log("Created production tasks");

  // Create Install Tasks
  await db.insert(installTasks).values([
    {
      jobId: job2.id,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      installerId: installer1.id,
      status: "scheduled",
      notes: "Day 1 - Posts and rails",
    },
    {
      jobId: job2.id,
      scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      installerId: installer1.id,
      status: "scheduled",
      notes: "Day 2 - Panels and finishing",
    },
  ] as any[]);

  console.log("Created install tasks");

  // Create Schedule Events
  await db.insert(scheduleEvents).values([
    {
      jobId: job2.id,
      eventType: "install",
      title: "Install - Smith Residence",
      description: "Hampton fence installation Day 1",
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      assignedTo: installer1.id,
      isConfirmed: true,
      clientNotified: true,
    },
    {
      jobId: job2.id,
      eventType: "install",
      title: "Install - Smith Residence",
      description: "Hampton fence installation Day 2",
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      assignedTo: installer1.id,
      isConfirmed: true,
    },
    {
      jobId: job3.id,
      eventType: "pickup",
      title: "Pickup - WA Landscape Co",
      description: "Colonial fence materials ready for pickup",
      startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      isConfirmed: false,
    },
    {
      eventType: "site_measure",
      title: "Site Measure - Johnson Pool",
      description: "Pool fencing site measure",
      startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
      assignedTo: salesUser.id,
    },
  ] as any[]);

  console.log("Created schedule events");

  // Create Payments
  await db.insert(payments).values([
    {
      clientId: client1.id,
      jobId: job2.id,
      quoteId: quote1.id,
      invoiceNumber: "INV-2024-0156",
      amount: "6260.50",
      paymentType: "deposit",
      paymentMethod: "stripe",
      status: "completed",
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      clientId: client3.id,
      jobId: job1.id,
      quoteId: quote2.id,
      invoiceNumber: "INV-2024-0155",
      amount: "7400.00",
      paymentType: "deposit",
      paymentMethod: "bank_transfer",
      status: "completed",
      paidAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      clientId: client1.id,
      jobId: job2.id,
      invoiceNumber: "INV-2024-0158",
      amount: "6260.50",
      paymentType: "final",
      status: "pending",
    },
    {
      clientId: client3.id,
      jobId: job1.id,
      invoiceNumber: "INV-2024-0157",
      amount: "7400.00",
      paymentType: "final",
      status: "pending",
    },
  ] as any[]);

  console.log("Created payments");

  // Create Notifications
  await db.insert(notifications).values([
    {
      userId: salesUser.id,
      type: "lead_new",
      title: "New Lead Created",
      message: "Looking for Hampton style fence for backyard - Sarah Smith",
      relatedEntityType: "lead",
      relatedEntityId: lead1.id,
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      userId: salesUser.id,
      type: "quote_approved",
      title: "Quote Approved",
      message: "Quote Q-2024-0002 approved by WA Landscape Co - $14,800.00",
      relatedEntityType: "quote",
      relatedEntityId: quote2.id,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      userId: salesUser.id,
      type: "payment_received",
      title: "Payment Received",
      message: "$6,260.50 deposit payment from Sarah Smith",
      relatedEntityType: "payment",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      userId: salesUser.id,
      type: "job_scheduled",
      title: "Job Scheduled",
      message: "JOB-2024-0088 - Sarah Smith - Hampton fence installation",
      relatedEntityType: "job",
      relatedEntityId: job2.id,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      userId: salesUser.id,
      type: "lead_assigned",
      title: "Lead Assigned to You",
      message: "Pool fencing enquiry from James Johnson assigned to you",
      relatedEntityType: "lead",
      relatedEntityId: lead3.id,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      userId: schedulerUser.id,
      type: "job_ready",
      title: "Job ready for scheduling",
      message: "JOB-2024-0087 is ready for scheduling",
      relatedEntityType: "job",
      relatedEntityId: job3.id,
    },
    {
      userId: productionUser.id,
      type: "production_complete",
      title: "Production complete",
      message: "JOB-2024-0088 production is complete and ready for install",
      relatedEntityType: "job",
      relatedEntityId: job2.id,
    },
  ] as any[]);

  console.log("Created notifications");

  console.log("Database seeded successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error seeding database:", err);
    process.exit(1);
  });
