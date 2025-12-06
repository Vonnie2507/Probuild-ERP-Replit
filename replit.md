# Probuild PVC - ERP & CRM System

## Overview
This project is a comprehensive ERP & CRM system for Probuild PVC, a Western Australian PVC fencing manufacturer. The system streamlines the entire business workflow, from initial lead management and quoting to production, scheduling, installation, and payment processing. It caters to both public customers and trade clients, aiming to enhance operational efficiency and customer relationship management.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development with frequent, small updates. Ask before making major architectural changes.

## System Architecture
The system employs a modern web architecture with a clear separation of concerns.

**UI/UX Decisions:**
-   **Design System:** Adheres to Carbon Design System principles.
-   **Color Scheme:** Utilizes a brand palette of Dark Teal (`#213d42`), Orange (`#db5c26`), and Pale Beige (`#f5e5d6`).
-   **Components:** Leverages `shadcn/ui` for UI components.

**Technical Implementations:**
-   **Frontend:** Built with React 18, TypeScript, Vite, TanStack Query v5, and Wouter for routing.
-   **Backend:** Developed using Express.js with Drizzle ORM.
-   **Database:** PostgreSQL, hosted on Neon.
-   **Styling:** Achieved with Tailwind CSS.

**Feature Specifications:**
-   **Core Modules:** Includes modules for Lead Management, Quote Builder, Job Workflow, Production Queue, Scheduling, Inventory, Payments, and CRM Messaging (SMS).
-   **Staff Login & Personal Dashboard:** Session-based authentication system with personalized dashboard for each staff member. Features:
    -   Login page with email/password authentication
    -   AuthContext and useAuth hook for frontend state management
    -   Personal Dashboard (/) with 5 widgets: My To-Do List, My Notifications, Role-Based KPIs, Weather (Perth, WA), and My Leave Balances
    -   Business Dashboard (/business-dashboard) for company-wide metrics
    -   Dynamic sidebar with user info display and logout functionality
    -   Role-based KPI metrics calculated from real database data (leads, quotes, jobs, production tasks)
    -   Leave balance tracking via staff_leave_balances table
    -   **Role-specific Quick Actions:** Dynamic quick action buttons tailored to each user role (admin gets New Lead, Schedule, Business Dashboard; sales gets leads and quotes; scheduler gets scheduling tools; etc.)
    -   **Task Navigation:** Click any task in the dashboard to open the corresponding lead detail dialog directly at the Activity tab with the specific task highlighted
    -   **Completed Tasks View:** Toggle button to show/hide completed tasks on the dashboard, with count displayed in the widget header
-   **Lead Card Detail Dialog:** Tabbed interface showing Details, Quotes, Activity (notes, tasks, activity log), and Live Document tabs. Supports adding notes, creating tasks, logging calls, and viewing/creating live documents for supply_install leads.
-   **Call Log & Transcription System:** Full call logging with direction (inbound/outbound/missed), duration tracking, notes, and collapsible detail panels. Supports creating tasks linked to specific calls. Prepared for future AI transcription integration.
-   **Specialized Applications:** Features a dedicated Installer Mobile App and a Trade Client Portal for self-service.
-   **Hierarchical Numbering:** Implements a strict hierarchical numbering system for Leads (`PVC-XXX`), Quotes (`PVC-XXX-Q#`), Jobs (`PVC-XXX-JOB`), and Invoices (`PVC-XXX-INV`) to ensure consistent tracking and data linkage.
-   **Direct Job Creation:** Allows creating jobs directly from the Jobs module without going through the leads/quotes flow:
    -   "New Job" button in Jobs page (both list and kanban views)
    -   System automatically creates a hidden Lead with source="direct_job" and stage="won"
    -   Hidden leads appear in analytics (lead counts, win rates, source reporting)
    -   Can be filtered out using lead_source if only "normal" leads are needed
    -   Job and Lead share the same base ID (PVC-XXX → PVC-XXX-JOB)
-   **Inline Client Creation:** When creating a new job, users can create clients on-the-fly:
    -   UserPlus button next to client dropdown opens CreateClientDialog
    -   Real-time duplicate detection checks name, email, and phone as user types
    -   Red warning banner shows when similar clients are found
    -   Click to view existing client card without closing the dialog
    -   "Use This Client" button to select existing client instead of creating new
    -   "Not This Client" button to dismiss and continue creating new client
    -   Race condition handling prevents stale API results from appearing
    -   Components: CreateClientDialog.tsx, use-debounce.ts hook
    -   API: POST /api/clients/check-duplicate, checkClientDuplicates() storage method
-   **Role-Based Access Control:** Comprehensive RBAC implementation with:
    -   7 distinct user roles: admin, sales, scheduler, production_manager, warehouse, installer, trade_client
    -   Centralized permissions configuration in `client/src/lib/permissions.ts`
    -   Frontend sidebar filtering based on user role
    -   Frontend route protection with unauthorized page redirect
    -   Backend API protection via `requireRoles` middleware on all sensitive endpoints
    -   Trade clients automatically redirected to `/trade` portal
    -   Role-specific route access: admin (full), sales (leads/quotes/clients), scheduler (jobs/schedule), production_manager (jobs/production/inventory), warehouse (production/inventory), installer (installer app), trade_client (trade portal only)
-   **Live Document System:** Manages dynamic job setup and handover documents, with template support and lead-level access.
-   **Analytics & Automation:** Incorporates Quote Analytics Dashboard and configurable Automation Campaigns for SMS, triggered by various business events.
-   **Core Reporting & Analytics System:** Centralized KPI logic for production-ready dashboards:
    -   Lead Analytics: New Leads count, Total Active Leads, Leads by Stage/Source, Time to First Response, Time to Quote, Time to Close
    -   Sales Analytics: Pending Quotes, Lead Conversion Rate (Won Leads ÷ Leads with quotes sent), Average Deal Size, Pipeline Forecast (opportunity_value from active leads), Monthly/YTD Revenue, Won/Lost Value
    -   Lead timestamp fields: first_response_at, quote_sent_at, won_at, lost_at, lost_reason
    -   Analytics rules: Multiple quotes = one opportunity; conversion uses lead.status not quote status; direct job creation generates background lead with source="direct_job"
    -   API endpoints: GET /api/analytics/core, /api/analytics/leads, /api/analytics/sales (all support startDate/endDate query params)
    -   Quote Analytics page displays both quote-level and lead-level KPIs for accurate forecasting
-   **Opportunity Value & Primary Quote System:** Prevents forecasting inflation from multiple quotes:
    -   Each lead has opportunity_value (set from primary quote) and primary_quote_id
    -   Each quote has is_primary flag (only one per lead can be primary)
    -   Setting a new primary quote updates the lead's opportunity_value automatically
    -   Pipeline Forecast uses opportunity_value from active leads (not sum of all quotes)
    -   Quote acceptance: sets quote as primary, marks lead as won, rejects other quotes, creates job
    -   Quote Analytics displays: Total Quote Value (all quotes for activity metrics) and Pipeline Forecast (opportunity_value for accurate forecasting)
-   **Internal Management:** Features an "Organisation Hub" for managing departments, workflows, policies, resources, and a knowledge base.
-   **P&L Calculator:** Provides a staff-only comprehensive job costing and profit/loss analysis tool.
-   **Job Stage Configuration:** Admin-only feature for managing job pipelines and stages:
    -   Located at `/job-stage-configuration` (admin access only via Settings)
    -   Create, edit, and delete job pipelines (e.g., Supply Only, Supply + Install)
    -   Add, edit, delete, and reorder stages within each pipeline
    -   Configure stage properties: name, icon (Lucide icon name), completion type (manual/automatic), active status
    -   Database tables: job_pipelines (workflow definitions), job_pipeline_stages (stage definitions with sortOrder)
    -   API routes: /api/job-pipelines, /api/job-pipelines/:id/stages, /api/job-pipeline-stages/:id, /api/job-pipelines/:id/stages/reorder
    -   Pipelines are configured independently before being applied to job types (future enhancement)
-   **Dashboard Builder:** Admin-only feature for configuring role-specific dashboards:
    -   Located at `/dashboard-builder` (admin access only)
    -   Create, edit, and delete dashboard layouts per role
    -   Widget library with 29 pre-seeded widgets (KPIs, charts, tables, analytics)
    -   Drag-and-drop widget arrangement with position and size configuration
    -   Publish layouts to make them active for each role
    -   Database tables: dashboard_widgets (widget library), role_dashboard_layouts (layout configs), dashboard_widget_instances (placed widgets)
    -   API routes: /api/dashboard-builder/widgets, /api/dashboard-builder/layouts, /api/dashboard-builder/instances
-   **Jobs Kanban View:** Visual job tracking with List/Kanban toggle:
    -   View toggle button (ViewToggle component) switches between List and Kanban views
    -   Kanban columns organized by job lifecycle: Pipeline, Production, Scheduling, Installation, Complete
    -   Job cards with colored left borders (yellow for supply_install, green for supply_only)
    -   Status badges: THIS WEEK (calendar icon), DELAYED (warning), WAITING ON CLIENT (hourglass)
    -   Stage progress visualization with Lucide icons showing completion state
    -   Stage complexity varies by job type: supply_install (5 or 8 stages with gate), supply_only (4 stages)
    -   Components: JobKanbanBoard.tsx, JobKanbanCard.tsx, JobStageProgress.tsx, ViewToggle.tsx
-   **Automatic Soil Type Detection:** When creating a new lead:
    -   User enters address and selects from Google Maps autocomplete
    -   System automatically geocodes address to get latitude/longitude
    -   Calls CSIRO ASRIS API to fetch detailed soil information
    -   Returns soil type (limestone, clay, gravel, sand, rock), installation notes, and geology warnings
    -   Displays soil information preview in the lead form before saving
    -   Saves soil type and installation notes to lead record in database
    -   LIMESTONE zones trigger special warning due to drilling requirements
    -   Soil types display on lead cards with LIMESTONE in red badge, others as gray text

**System Design Choices:**
-   **API:** All endpoints are prefixed with `/api/` and support standard CRUD operations.
-   **Database Schema:** Consists of 18 main entities, including users, clients, leads, quotes, jobs, and various operational and logging tables. JSONB columns are used for flexible data storage in live documents.
-   **Global Search:** A global search functionality is implemented to search across leads, quotes, and jobs.
-   **Notifications:** Real-time notification system with persistent storage and UI alerts.

## External Dependencies
-   **Database:** Neon (PostgreSQL)
-   **Payment Gateway:** Stripe
-   **SMS Messaging:** Twilio
-   **Open Banking:** Basiq CDR (Consumer Data Right) Integration for Westpac Business account connectivity

## Banking Integration (Basiq CDR)
The system integrates with Basiq's CDR Open Banking API for secure bank account access:

**CDR Consent Flow:**
-   Uses hosted Consent UI - no bank credentials collected by the application
-   POST `/api/financial/connect-bank` creates CDR consent and returns connect URL
-   User redirected to bank's secure login (Westpac) to authorize access
-   GET `/api/financial/callback` handles redirect after consent completion
-   POST `/api/basiq/webhook` receives transaction update notifications

**Key Features:**
-   Account balances and transaction sync via consent
-   365-day consent validity with renewal support
-   Business details: Probuild PVC (ABN: 29 688 327 479)
-   Database tracks consent lifecycle via `basiqConsentId` on `bank_connections`

**Frontend (client/src/pages/Financial.tsx):**
-   Simple "Connect Bank Account" button - no form fields
-   Displays connection status, consent info, and expiry dates
-   Overview, Accounts, Transactions, and Connections tabs
-   Admin-only bank connection management