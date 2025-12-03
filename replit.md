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
13 main entities:
- users, clients, leads, fenceStyles, products
- quotes, jobs, bom, productionTasks, installTasks
- scheduleEvents, payments, notifications, smsLogs, activityLogs, documents

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

## Recent Changes (December 2025)
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
