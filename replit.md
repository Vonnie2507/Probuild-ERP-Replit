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
-   **Lead Card Detail Dialog:** Tabbed interface showing Details, Quotes, Activity (notes, tasks, activity log), and Live Document tabs. Supports adding notes, creating tasks, logging calls, and viewing/creating live documents for supply_install leads.
-   **Specialized Applications:** Features a dedicated Installer Mobile App and a Trade Client Portal for self-service.
-   **Hierarchical Numbering:** Implements a strict hierarchical numbering system for Leads (`PVC-XXX`), Quotes (`PVC-XXX-Q#`), Jobs (`PVC-XXX-JOB`), and Invoices (`PVC-XXX-INV`) to ensure consistent tracking and data linkage.
-   **Role-Based Access Control:** Supports 7 distinct user roles (admin, sales, scheduler, production_manager, warehouse, installer, trade_client) with granular permissions.
-   **Live Document System:** Manages dynamic job setup and handover documents, with template support and lead-level access.
-   **Analytics & Automation:** Incorporates Quote Analytics Dashboard and configurable Automation Campaigns for SMS, triggered by various business events.
-   **Internal Management:** Features an "Organisation Hub" for managing departments, workflows, policies, resources, and a knowledge base.
-   **P&L Calculator:** Provides a staff-only comprehensive job costing and profit/loss analysis tool.

**System Design Choices:**
-   **API:** All endpoints are prefixed with `/api/` and support standard CRUD operations.
-   **Database Schema:** Consists of 18 main entities, including users, clients, leads, quotes, jobs, and various operational and logging tables. JSONB columns are used for flexible data storage in live documents.
-   **Global Search:** A global search functionality is implemented to search across leads, quotes, and jobs.
-   **Notifications:** Real-time notification system with persistent storage and UI alerts.

## External Dependencies
-   **Database:** Neon (PostgreSQL)
-   **Payment Gateway:** Stripe
-   **SMS Messaging:** Twilio