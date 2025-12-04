# Probuild PVC - ERP & CRM System

## Overview
A comprehensive ERP & CRM system for Probuild PVC, a Western Australian PVC fencing manufacturer. The system manages the complete workflow from lead intake through quoting, production, scheduling, installation, and payments for both public customers and trade clients.

## Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, TanStack Query v5, Wouter (routing)
- **Backend**: Express.js, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Payments**: Stripe integration
- **Notifications**: Twilio SMS integration
- **Design**: Carbon Design System principles with brand colors

## Brand Colors
- **Dark Teal (Primary)**: #213d42
- **Orange (Accent)**: #db5c26
- **Pale Beige (Background)**: #f5e5d6

## Project Structure
```
├── client/src/
│   ├── components/
│   │   ├── shared/          # StatusBadge, StatCard, DataTable, etc.
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── inventory/       # InventoryTable
│   │   ├── layout/          # AppSidebar, ThemeToggle
│   │   └── ui/             # shadcn components
│   ├── pages/
│   │   ├── Dashboard.tsx    # Main dashboard with stats
│   │   ├── Leads.tsx        # Lead management
│   │   ├── Jobs.tsx         # Job tracking
│   │   ├── Production.tsx   # Production queue management
│   │   ├── Schedule.tsx     # Calendar & scheduling
│   │   ├── Clients.tsx      # Client database
│   │   ├── Inventory.tsx    # Products & stock management
│   │   ├── Payments.tsx     # Finance tracking
│   │   ├── Messages.tsx     # SMS conversations
│   │   ├── QuoteAnalytics.tsx # Quote performance dashboard
│   │   ├── AutomationCampaigns.tsx # Automated SMS campaigns
│   │   ├── Installer.tsx    # Mobile installer app
│   │   └── Trade.tsx        # Trade portal
│   └── lib/
│       └── queryClient.ts   # TanStack Query setup
├── server/
│   ├── routes.ts            # API endpoints
│   ├── storage.ts           # Database operations
│   ├── seed.ts              # Seed data
│   └── index.ts             # Express server
└── shared/
    └── schema.ts            # Drizzle ORM schemas
```

## Database Schema
16 main entities:
- users, clients, leads, fenceStyles, products
- quotes, jobs, bom, productionTasks, installTasks
- scheduleEvents, payments, notifications, smsLogs, activityLogs, documents
- quoteFollowUps, automationCampaigns, campaignEnrollments

## API Endpoints
All endpoints use `/api/` prefix:
- GET/POST/PATCH/DELETE for CRUD operations
- Stripe payment integration via `/api/payments/:id/create-checkout`
- Dashboard stats: `/api/dashboard/stats`

## User Roles
7 distinct roles with role-based permissions:
- admin, sales, scheduler, production_manager, warehouse, installer, trade_client

## Key Features
1. **Lead Management**: Track leads from initial contact to conversion
2. **Quote Builder**: Generate quotes with trade pricing rules
3. **Job Workflow**: Full lifecycle from acceptance to completion
4. **Production Queue**: Track manufacturing stages
5. **Scheduling**: Calendar-based install/delivery scheduling
6. **Inventory**: Stock management with reorder alerts
7. **Payments**: Stripe integration, deposit/final payment tracking
8. **Installer App**: Mobile-friendly installer interface
9. **Trade Portal**: Self-service for trade clients

## Hierarchical Numbering System
The system uses a hierarchical numbering format that links leads, quotes, jobs, and invoices:
- **Leads (Opportunities)**: Auto-generated sequential numbers in format `PVC-XXX` (e.g., PVC-001, PVC-002)
- **Quotes**: Derived from lead number with quote sequence `PVC-XXX-Q#` (e.g., PVC-001-Q1, PVC-001-Q2)
- **Jobs**: Derived from lead number with `-JOB` suffix `PVC-XXX-JOB` (e.g., PVC-001-JOB)
- **Invoices**: One per job, derived from lead number with `-INV` suffix `PVC-XXX-INV` (e.g., PVC-001-INV)

Each lead can have multiple quotes, but only one job and one invoice per job. The numbering is auto-generated:
- `createLead()`: Uses SQL MAX on numeric suffix to generate next sequential lead number (PVC-001, PVC-002, etc.) - handles gaps from deletions
- `createQuote()`: Uses SQL MAX sequence query on quotes matching lead prefix to generate next sequence (Q1, Q2, etc.) - prevents number reuse
- `createJob()`: Generates job number and invoice number from the lead's number

The numbering logic uses integer-based MAX calculations instead of lexicographic sorting to ensure correct sequencing beyond PVC-999.

## Recent Changes (December 2025)
- **Quotes Page** (NEW): Added dedicated Quotes page accessible from sidebar
  - Renamed sidebar "Leads & Quotes" to just "Leads" 
  - New "Quotes" menu item in sidebar for focused quotes management
  - Stats cards: Total Quotes, Approved, Total Value, Pending Value
  - Searchable and filterable table view of all quotes
  - Status filter (draft, sent, approved, rejected, expired)
  - Type filter (public, trade)
  - Sortable columns with click-to-sort headers
  - CSV export functionality
  - Quote detail dialog with full line items and pricing
  - Quick actions: Send Quote, Mark Approved
- **Hierarchical Numbering System**: Implemented linked numbering for leads, quotes, jobs, and invoices
  - Leads auto-generated as PVC-XXX format
  - Quotes linked to leads as PVC-XXX-Q# format (multiple per lead)
  - Jobs derived as PVC-XXX-JOB format
  - Invoices as PVC-XXX-INV format (one per job)
  - UI updated: "Convert to Quote" replaced with "Create Quote" for clarity
- **Global Search**: Added search API endpoint (`/api/search/global`) and GlobalSearch component in header with dropdown showing results across leads, quotes, and jobs
- **Edit/Delete functionality**: Full CRUD operations for Clients, Leads, and Jobs including:
  - Edit dialogs with form validation
  - Delete confirmation dialogs with warnings
  - Inline icon buttons on detail views
  - Context menu actions on LeadCard component
- **Quote Builder**: Comprehensive quote creation system accessible from Leads page:
  - Line items with product selection from inventory
  - Quick add buttons for posts, rails, pickets
  - Trade quote toggle with discount calculations
  - Materials subtotal, labour, and deposit calculations
  - Draft save or direct send options
- **CRM Messaging/SMS**: Bidirectional SMS system via Twilio integration:
  - Conversation threads grouped by phone number
  - Real-time message display with optimistic updates
  - Automated notifications for leads, quotes, payments
  - SMS logs stored in database with isOutbound field
- **Notification System**: Real-time notifications with database persistence:
  - Automatic triggers for leads, quotes, payments, job status
  - Header bell icon with unread count (30-second polling)
  - Mark as read and dismiss functionality
  - NotificationPanel with virtualized list
- **Calendar Event Management**: Full CRUD for schedule events:
  - Create/Edit/Delete dialogs with react-hook-form
  - Event types: install, delivery, pickup, site_measure
  - Installer assignment and job linking
  - Backend ISO string to Date object conversion
- **CSV Export**: Data export for all major entities:
  - Export buttons on Payments, Jobs, Clients, Leads, Inventory pages
  - Proper CSV headers (Content-Type, Content-Disposition)
  - Field escaping for commas/quotes
  - AU date formatting (DD/MM/YYYY)
- **Quote Analytics Dashboard** (NEW):
  - Conversion rates and win rates tracking
  - Quotes per week with trend indicators
  - Performance by team member with bar charts
  - Quote pipeline breakdown with pie charts
  - Recent quotes list with status badges
  - API endpoint: `/api/quotes/analytics`
- **Automation Campaigns** (NEW):
  - Create/Edit/Delete automated SMS campaigns
  - Trigger types: quote_sent, quote_no_response_3_days, quote_no_response_7_days, quote_expiring_soon, quote_expired, lead_new, lead_no_contact_24h, job_completed, payment_due
  - Client type targeting (public, trade, or all)
  - Configurable delay (days + hours) and send windows
  - Message templates with placeholders ({client_name}, {quote_number}, {quote_amount})
  - Active/Paused toggle for campaigns
  - Campaign enrollments tracking
  - API endpoints: `/api/automation-campaigns`, `/api/campaign-enrollments`
- **P&L Calculator** (NEW):
  - Staff-only comprehensive job costing analysis accessible from Quote detail dialog
  - Tabbed interface: "Quote Details" and "P&L Analysis" tabs in quote dialog
  - Real-time profit calculations with margin warnings (< 20% target)
  - Cost components tracking: materials, manufacturing labour, install labour, travel, admin, supplier fees, third party, ground conditions
  - Trip tracking: site_quote, post_install, panel_install, gate_install, welder_dropoff/pickup, powder_coat_dropoff/pickup, supplier_delivery, follow_up, warranty
  - Admin time tracking per staff member with hourly rate calculations
  - Activity types: quote_creation, client_messaging, client_call, spec_gathering, scheduling, invoicing, follow_up, general_admin
  - Collapsible cost sections with add/delete functionality
  - Recalculate button for refreshing P&L summary
  - API endpoints: `/api/quotes/:id/costs`, `/api/quotes/:id/trips`, `/api/quotes/:id/admin-time`, `/api/quotes/:id/pl-summary`
  - Database tables: quote_cost_components, quote_trips, quote_admin_time, quote_ground_conditions, travel_sessions, quote_pl_summary, staff_rate_cards
- **Organisation Hub** (NEW):
  - Internal staff hub for company workflows, policies, and knowledge management
  - Sidebar navigation with 5 sub-sections under "Organisation" group
  - **Departments Page**: Create/edit/delete departments, assign managers
  - **Workflows & SOPs Page**: Standard operating procedures with category, status, and version history
    - Categories: sales, production, install, warehouse, admin, hr, safety, other
    - Status: active, draft, archived
    - Version tracking with change summaries
  - **Policies Page**: Company policies with acknowledgement tracking
    - Categories: safety, hr, warehouse, vehicles, equipment, operations, other
    - Policy version history
    - Staff acknowledgement records
  - **Resources Page**: Centralized file and link library
    - Resource types: file, link
    - Department filtering
  - **Knowledge Base Page**: Internal documentation with markdown content
    - Slug-based URLs for easy sharing
    - Published/draft status toggle
    - Department categorization
  - API endpoints: `/api/organisation/departments`, `/api/organisation/workflows`, `/api/organisation/policies`, `/api/organisation/resources`, `/api/organisation/knowledge`
  - Database tables: departments, workflows, workflow_versions, policies, policy_versions, policy_acknowledgements, resources, knowledge_articles

## Development Notes
- All pages connected to real backend APIs
- Mock data removed and replaced with database queries
- StatusBadge component supports all job status types
- TanStack Query v5 object syntax used throughout

## Running the Project
```bash
npm run dev    # Starts Express + Vite dev server
npm run db:push # Push schema to database
npm run db:seed # Seed test data
```
