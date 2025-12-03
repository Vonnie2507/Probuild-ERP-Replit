# Probuild PVC ERP & CRM Design Guidelines

## Design Approach

**Selected Framework**: Carbon Design System (IBM) with Material Design principles for mobile components

**Justification**: This enterprise manufacturing ERP requires clarity, efficiency, and scalability across multiple user roles. Carbon excels at data-heavy interfaces with complex workflows while maintaining accessibility and consistency. Material Design enhances mobile experiences for the Installer App.

**Core Principles**:
1. **Clarity over decoration** - information hierarchy drives every decision
2. **Role-based consistency** - each user type gets optimized layouts for their tasks
3. **Progressive disclosure** - reveal complexity only when needed
4. **Action-oriented** - primary actions always clear and accessible

---

## Typography

**Font Family**: 
- Primary: IBM Plex Sans (via Google Fonts)
- Monospace: IBM Plex Mono (for job numbers, SKUs, technical data)

**Type Scale**:
- Page Titles: text-4xl font-semibold (36px)
- Section Headers: text-2xl font-semibold (24px)
- Card/Panel Headers: text-lg font-medium (18px)
- Body Text: text-base (16px)
- Secondary/Labels: text-sm (14px)
- Helper Text: text-xs (12px)

**Hierarchy Rules**:
- All caps for status badges and category labels
- Semibold for critical data points (totals, statuses)
- Regular weight for descriptive content
- Maintain 1.5 line-height for readability in data tables

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16** (8px base grid)
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card margins: m-4, gap-6
- Dense data tables: p-2, space-y-2

**Grid System**:
- Desktop: 12-column grid with max-w-7xl container
- Tablets: 8-column grid, max-w-4xl
- Mobile: Single column, full-width with px-4 gutters

**Layout Patterns**:
- **Dashboard**: 3-column grid (lg:grid-cols-3) for widgets, 2-column on tablets
- **Data Tables**: Full-width with horizontal scroll on mobile
- **Forms**: 2-column (md:grid-cols-2) with full-width on mobile
- **Sidebars**: Fixed 256px left navigation for internal tools, collapsible on mobile

---

## Component Library

### Navigation
**Internal System (Admin/Production/Sales)**:
- Fixed left sidebar (w-64) with collapsible menu
- Top bar: breadcrumbs, user profile, notifications, quick actions
- Bottom navigation for mobile (4-5 primary actions)

**Trade Portal**:
- Horizontal top navigation with dropdown menus
- Sticky header on scroll
- Mobile: hamburger menu

### Data Display
**Tables**:
- Striped rows for readability
- Sticky headers on scroll
- Sortable columns with icon indicators
- Row actions in rightmost column (kebab menu)
- Pagination: 20/50/100 items per page

**Cards**:
- Elevated shadow (shadow-md) for clickable items
- Flat (border border-gray-200) for static content
- Header with title + action buttons
- Body with consistent p-6 padding

**Status Indicators**:
- Pills/badges with icon + label
- Size: px-3 py-1 rounded-full text-xs font-semibold
- Icons from Heroicons (outline style)

### Forms & Inputs
**Input Fields**:
- Height: h-10 (40px touch target)
- Border: border-2 with focus:ring-2 states
- Labels: text-sm font-medium mb-1
- Helper text: text-xs below input
- Error states: red border + message

**Buttons**:
- Primary: px-6 py-2.5 rounded-md font-medium
- Secondary: outlined variant
- Tertiary: text-only with underline on hover
- Icon buttons: w-10 h-10 rounded-md (square)

**Selects/Dropdowns**:
- Match input height (h-10)
- Chevron icon right-aligned
- Multi-select with tag display

### Specialized Components
**Calendar (Scheduling)**:
- Week view as default
- Color-coded event types (Production: blue, Install: green, Delivery: orange)
- Drag-and-drop capability
- Mini calendar sidebar for date selection

**Kanban Board (Leads)**:
- 4-6 columns with horizontal scroll
- Card width: w-80 (320px)
- Drag handles, compact card design
- Column headers with count badges

**Photo Upload (Installer App)**:
- Grid display (grid-cols-2 gap-4)
- Thumbnail preview with expand modal
- Camera icon for new uploads
- Before/After labels

**Production Task Lists**:
- Checkbox with strikethrough on completion
- Progress bar showing overall completion
- Time tracking inline (start/stop buttons)
- Material usage input fields

---

## Module-Specific Layouts

### Dashboard
- 3-column widget grid (1-2 columns on mobile)
- Each widget: h-auto min-h-64, consistent padding
- Quick action buttons at top right
- Notification center: slide-out panel from right

### Job Manager
- Split view: Left 30% (job list), Right 70% (job details)
- Tabbed interface for Details/Materials/Timeline/Documents
- Timeline: vertical with icons and status updates
- Mobile: stack vertically with tabs

### Production Manager
- Top: filters and date selector
- Main: task queue as sortable table
- Right sidebar: active timers and alerts
- Bottom: stock usage summary

### Trade Portal
- Hero section with account overview (orders, credit, status)
- Grid of recent quotes (3 columns desktop, 1 mobile)
- Footer with installation resources and support links

---

## Mobile Strategy (Installer App)

**Framework**: Material Design principles
- Bottom navigation (4 tabs: Home, Jobs, Photos, Profile)
- FAB (Floating Action Button) for primary actions
- Swipe gestures for job transitions
- Large touch targets (min 44px)
- Bottom sheets for forms

---

## Animations

**Minimal, purposeful only**:
- Page transitions: fade (200ms)
- Dropdown menus: slide down (150ms)
- Modals: scale + fade (200ms)
- Loading states: skeleton screens (no spinners)
- Success confirmations: checkmark animation (300ms)

**NO animations for**:
- Table sorting
- Form validation
- Status updates
- Card interactions

---

## Accessibility

- WCAG 2.1 AA compliance minimum
- Focus indicators: ring-2 ring-offset-2
- Skip navigation links
- ARIA labels on all interactive elements
- Keyboard navigation: Tab, Enter, Escape patterns
- Screen reader announcements for status changes

---

## Images

**No hero images** - this is a utility application focused on data and workflows.

**Image Usage**:
- **Product thumbnails**: 80x80px in tables, 200x200px in details
- **Job site photos**: Full-width in modals, thumbnails in grids
- **Installer photos**: Before/after comparison layout
- **Profile avatars**: 32px circular (navigation), 48px (profiles)
- **Empty states**: Simple illustrations (400x300px) for empty lists/tables

All images: lazy-loaded, optimized WebP format with fallbacks.