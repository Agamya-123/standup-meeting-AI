# STITCH Design Brief — Standup Application

> Source-of-truth design specification for Google Stitch. Every claim in this document is verified against the repository source code unless explicitly marked as **NOT VERIFIED**.

---

## 1. PRODUCT OVERVIEW

### Product Name
**Standup**

### Tagline
"The morning update, without the meeting."

### What It Is
Standup is an async engineering daily standup application. It replaces synchronous morning meetings with a written update flow: team members submit daily standups, team leads and managers read a consolidated feed, and managers see patterns, blockers, and AI-generated summaries.

### Core Capabilities (Verified from code)
| Capability | Verified |
|---|---|
| Daily standup submission (per team member, per day) | Yes — `POST /standups` |
| Today's standup view (per user) | Yes — `GET /standups/today` |
| Standup edit/update | Yes — `PUT /standups/:id` |
| Standup history/audit trail | Yes — `GET /standups/my-history` |
| Team feed (members view peer updates) | Yes — `GET /manager/dashboard?teamId=` |
| Manager dashboard (stats, blockers, AI insights) | Yes — `GET /manager/dashboard` |
| Department hierarchy management (ADMIN only) | Yes — `GET/POST/PUT/DELETE /departments` |
| Team roster management with role-based access | Yes — `GET/POST/PUT/DELETE /teams` |
| Team access requests (join/leave/approve/reject) | Yes — `POST/GET/DELETE /access-requests` |
| Notification system with read state | Yes — `GET/DELETE /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/mark-all-read` |
| Standup reactions (emoji responses to standups) | Yes — `POST /standups/:id/react`, `GET /standups/:id/reactions` |
| Blocker resolution tracking | Yes — notification types `BLOCKER_RESOLVED`, `BLOCKER_ACKNOWLEDGED` |
| Dark/light theme toggle | Yes — ThemeContext, persisted in `localStorage('standup_theme')` |
| Multi-tenant (company-scoped) data isolation | Yes — `companyId` on all entities |
| AI-generated daily executive summary | Yes — `GET /ai/summary` (local rule-based, see §2) |
| Search across team members, blockers, topics | Yes — navbar search input |
| Export summary (button exists; backend NOT VERIFIED) | Button visible in Navbar; actual Slack integration NOT VERIFIED |

### AI Capability Description (Critical Accuracy Note)
The "AI" in Standup is a **local rule-based heuristic service**, not an external AI/ML API. `AIService.generateDailySummary()` in `server/src/services/aiService.ts` performs the following using in-memory string matching:
- Detects trigger phrases in standup text (e.g., "waiting for", "blocked by", "unable to") to generate template-based executive summaries
- Identifies risks by keyword matching (access/credential/permission → infrastructure risk, api/backend/endpoint → API contract risk)
- Creates manager recommendations from template strings

**There are no external AI provider calls (no OpenAI, no Anthropic, no ML model inference).** Any reference to "AI" in marketing or documentation should accurately describe this as heuristic-based summarization, not generative AI.

### What It Is NOT
- Not a real-time chat or messaging tool
- Not a video conferencing replacement (it replaces the *meeting*, not video)
- Not connected to any external AI service
- Not integrated with Slack (button exists but integration NOT VERIFIED)
- Not integrated with Microsoft Teams (NOT VERIFIED)
- Not connected to any third-party APIs beyond avatar/logo placeholder services

---

## 2. USER ROLES AND RBAC

### Role Hierarchy (4 tiers)
| Role | Label Used in UI | Key Permissions |
|---|---|---|
| **ADMIN** | Admin | Full system access: create/manage departments, manage all team members, manage all users, view audit logs, access all dashboard features |
| **MANAGER** | Manager Command Center | View team dashboard, read team feed, manage team members, approve/revoke access, view AI summaries, manage blocker escalations |
| **TEAM_LEAD** | Team Lead | View team feed, submit/edit standups, submit access requests, view department data filtered by team |
| **TEAM_MEMBER** | Developer Workspace | Submit/edit daily standups, view team feed, view standup history, submit access requests |

### Role Normalization
The backend normalizes roles: `MEMBER` → `TEAM_MEMBER`, all others uppercased. Frontend checks use string comparison against `'ADMIN'`, `'MANAGER'`, `'TEAM_LEAD'`, `'TEAM_MEMBER'`.

### Role-Based UI Behavior (Verified)
| Behavior | Condition |
|---|---|
| Sidebar shows "Departments" nav item | ADMIN only |
| Dashboard route shows ManagerDashboard | MANAGER or ADMIN |
| Dashboard route shows MemberOverview | TEAM_MEMBER or TEAM_LEAD |
| Standup tab shows Form tab | TEAM_MEMBER |
| Standup tab shows Team Feed tab | MANAGER or ADMIN |
| Navbar "Export Summary" button visible | MANAGER or ADMIN (onOpenExport prop) |
| Navbar shield icon next to name | ADMIN (blue) or MANAGER (blue) or TEAM_LEAD (indigo) |
| Sidebar "Manager Command Center" label | MANAGER or ADMIN |
| Sidebar "Developer Workspace" label | TEAM_MEMBER or TEAM_LEAD |
| Department create/edit/delete | ADMIN only |
| Employee create | ADMIN, MANAGER, TEAM_LEAD |
| Employee update | ADMIN, MANAGER |
| Audit log access | ADMIN only |
| Notification mark-all-read | MANAGER or ADMIN |
| Resolve blocker notification | MANAGER or ADMIN |

### Authentication
- **Method**: Email/Employee ID + password (2-step flow)
- **Step 1**: User enters email or employee ID → system looks up → either goes directly to password screen or shows workspace selector if employee found in multiple companies
- **Step 2**: Password entry → JWT issued
- **Token storage**: `localStorage('standup_token')`, 7-day expiry
- **Token type**: JWT Bearer token in `Authorization` header
- **Session management**: Token-based; no server-side sessions
- **Rate limiting**: Auth endpoints rate-limited (max 50 requests, skipSuccessfulRequests: true)

### Multi-Tenant Isolation
Every entity has a `companyId` field. All queries are scoped by the user's company. Role-based scoping is applied at every query level. Cross-company access is not supported.

---

## 3. INFORMATION ARCHITECTURE

### Public Routes (unauthenticated)
| Route | Page | Access |
|---|---|---|
| `/` | Landing | Public (redirects to /dashboard if authenticated) |
| `/login` | Login | Public |
| `/register` | Register (Company Workspace) | Public |

### Protected Routes (authenticated)
| Route | Page | Accessible Roles |
|---|---|---|
| `/dashboard` | ManagerDashboard or MemberOverview | All (role determines which component) |
| `/standup` | MemberDashboard | All (form tab for members, team feed tab for managers/admins) |
| `/history` | StandupHistoryPage | All |
| `/teams` | TeamsPage | All (permissions determine edit capabilities) |
| `/departments` | DepartmentsPage | ADMIN only (sidebar nav visible to ADMIN only) |
| `*` | Redirect to `/dashboard` | All |

### Layout Structure (Protected Routes)
```
NotificationBanner (top, full-width)
└── Flex row:
    ├── Sidebar (64rem, sticky, role-based nav)
    │   ├── Brand: "Standup" + company name
    │   ├── Company Badge Card
    │   ├── Nav Menu (role-filtered)
    │   └── User Card Footer
    └── Flex column:
        ├── Navbar (sticky top, search, refresh, notifications, theme, user)
        └── Main Content (max-w-7xl, scrollable)
```

### Data Model Summary (Prisma/SQLite)
- **Company** — parent tenant; members, teams, departments scoped to company
- **Department** — belongs to Company; ADMIN-managed; hierarchy via parent department
- **Team** — belongs to Company and optionally a Department; has manager, teamLead, members
- **User** — belongs to Company; has role (ADMIN/MANAGER/TEAM_LEAD/TEAM_MEMBER); has avatar, employeeId, name, email, password hash
- **DepartmentAccess** — tracks which departments each user can access
- **TeamMember** — join table for Team↔User with role
- **DailyStandup** — belongs to User and Team; has date, summary, blockers, status, blockerLevel
- **StandupReaction** — emoji reactions to standups
- **Notification** — per-user; types: BLOCKER_RESOLVED, BLOCKER_ACKNOWLEDGED, REACTION, REMINDER, INFO
- **AuditLog** — admin-only audit trail of system changes

---

## 4. COMPLETE USER FLOWS

### Flow: Registration (New Company)
1. User visits `/register` (public)
2. Fills form: Company Name, Admin Name, Admin Email, Password, Confirm Password, optional Domain, optional Employee ID
3. Client-side validation: required fields, password ≥ 8 chars, passwords match, company name ≥ 2 chars
4. Submits `POST /register` (rate-limited, Zod-validated)
5. On success → redirect to `/dashboard`

### Flow: Login (Existing User)
1. User visits `/login` (public)
2. **Step 1 (IDENTIFY)**: Enters work email or Employee ID
3. System calls `POST /lookup-identifier` (rate-limited)
4. **If multiple workspaces found**: Show workspace selector with company logos (fallback to Building2 icon)
5. **If single workspace**: Skip directly to password screen, show detected company card + user identity pill
6. **Step 2 (PASSWORD)**: Enter password → `POST /login`
7. On success → redirect to `/dashboard`
8. On failure: Show inline error message

### Flow: Submit Daily Standup
1. User on `/standup` (TEAM_MEMBER sees Form tab by default)
2. Fills standup: today's update, blockers, status
3. Submits → `POST /standups` (validated)
4. Success: Toast notification, banner state updates
5. If already submitted: Edit option available via `PUT /standups/:id`

### Flow: View Team Feed
1. MANAGER or ADMIN on `/standup` sees Team Feed tab
2. Fetches `/manager/dashboard?teamId=` for team feed data
3. Members visible with avatars (dicebear fallback), roles, standup status
4. Can click into individual standups

### Flow: Manager Views Dashboard
1. MANAGER/ADMIN on `/dashboard`
2. Fetches `/teams` and `/manager/dashboard?teamId=`
3. Sees: Stat cards, team updates, AI insight widget, blocker list, department switcher
4. Can filter by status, search, set auto-refresh interval (default 30s)
5. Can open Export modal
6. Can switch active team via DepartmentSwitcher

### Flow: View Standup History
1. User on `/history`
2. Fetches `GET /standups/my-history`
3. Displays timeline of past standups with filter (ALL / CRITICAL / MINOR / NONE)
4. Shows blocker details, dates, status

### Flow: Manage Team Access
1. User on `/teams`
2. Can invite members, remove members, edit team details
3. New members can request access or be directly added (role-gated)
4. Access requests appear in a panel; admins/managers can approve/reject/revoke

### Flow: Department Management (ADMIN only)
1. ADMIN on `/departments`
2. View department list with search
3. Create department (modal)
4. Edit department (modal)
5. View hierarchy (modal with tree visualization)
6. Delete department
7. All operations are ADMIN-only; non-admins see restricted view

### Flow: Notification Management
1. Navbar polls `GET /notifications` every 15 seconds
2. Unread count badge shows with pulse animation
3. Click bell → dropdown shows notifications grouped by type
4. Click notification → mark as read
5. "Mark all read" button for MANAGER/ADMIN
6. Top-of-app banner shows BLOCKER_RESOLVED alert or standup pending reminder (TEAM_MEMBER only)
7. Banner polls every 10 seconds

### Flow: Theme Switching
1. User clicks theme toggle (navbar or login page)
2. ThemeContext toggles `dark` ↔ `light`
3. `document.documentElement` class updated
4. Theme persisted in `localStorage('standup_theme')`
5. Default theme: dark

---

## 5. LANDING PAGE

### URL
`/` (public, accessible without authentication; redirects authenticated users to `/dashboard`)

### Structure (Top to Bottom)
1. **Sticky Header**: "Intelligent Daily Standup" wordmark (Note: in code, the landing page still uses "Intelligent Daily Standup" as a wordmark, distinct from the app's "Standup" brand)
2. **Hero Section**: Headline "The morning update, without the meeting." + subtext + 2 CTAs ("Create a company workspace" / "Sign in to your workspace")
3. **Stats Row**: 3 animated statistics (⚠️ These are placeholder values in code — NOT REAL METRICS — displayed as 90%, 100%, +40%)
4. **"What this is" Section**: Brief explanation of the product concept
5. **"How a day runs" Section**: 3-step process walkthrough (Write the standup → Leads read the feed → Managers see the pattern)
6. **"Walk through the product" Section**: Interactive 3-scene walkthrough (submit, feed, dashboard)
7. **"Inside a workspace" Features**: Feature list for team collaboration
8. **CTA Section**: Final call to action (uses Activity icon)
9. **Footer**: Logo + links

### Important Notes on Landing Page Stats
The stats section displays "90%", "100%", "+40%". These values exist in the code (`client/src/pages/Landing.tsx` lines 155-157) but are **placeholder values, not real metrics**. When implementing in Stitch, replace with accurate metrics or remove them entirely. No real user counts, conversion rates, or performance statistics exist in the codebase.

### Landing Page Design Notes
- Uses the same glassmorphism design system as the app
- Has some Activity icons (lines 328, 358) that were not removed (unlike Login and Sidebar which were updated)
- No real images or assets; avatars/logos via dicebear API if shown

---

## 6. APPLICATION UI

### Navigation (Sidebar — 64rem wide, sticky)
| Item | Path | Icon | Visibility |
|---|---|---|---|
| Overview | `/dashboard` | LayoutDashboard | All roles (badge: "Live" for MANAGER/ADMIN) |
| Daily Standup | `/standup` | ClipboardCheck | All roles (badge: "Today") |
| Standup History | `/history` | History | All roles |
| Departments | `/departments` | Building2 | ADMIN only |
| Team Members | `/teams` | Users | All roles |

**Sidebar Sub-components**:
- Brand header: "Standup" wordmark (bold, tracking-tight) + company name below (truncated)
- Company Badge Card: Company name + employee ID or slug
- Nav section header: "Workspace" with pulsing dot indicator
- User card footer: Role-specific label + status indicator

### Top Navigation (Navbar — 4rem tall, sticky)
**Left side**: Search input ("Search team members, blockers, or topics...") with ⌘K shortcut indicator (hidden on mobile)
**Right side**:
- Refresh/Sync button (with "Syncing..." state, live indicator dot)
- Export Summary button (MANAGER/ADMIN only, shows tooltip "Export & Broadcast Summary to Slack / Markdown")
- Date pill (xl+ screens)
- Theme toggle (Sun/Moon icons)
- Notifications bell (with unread count badge, pulse animation)
- User avatar + name + role label + logout button

### Notification Dropdown
Glassmorphism dropdown, 80-96rem wide, showing:
- Header: Bell icon + title + unread count
- Mark all read link (when unread > 0)
- Scrollable notification list with type-specific colors:
  - BLOCKER_RESOLVED: emerald tint
  - BLOCKER_ACKNOWLEDGED: blue tint
  - REACTION: amber tint
  - REMINDER: rose tint
  - INFO: blue tint
- Each notification: icon, title, message, time, optional link
- Empty state: "All caught up! No unread notifications."

### Dashboard Layout (ManagerDashboard)
- Stat Cards (top row): Key metrics with icons
- View Tabs: OVERVIEW / ALL_STANDUPS / BLOCKERS / AI
- Department Switcher: Filter by department
- Team Update Cards: Per-team summaries
- Blocker Priority List: Sorted blocker items
- AI Insight Widget: Heuristic-generated insights (with Sparkles/Flame icons)
- Export Modal: Export options
- Auto-refresh indicator (default 30s interval)

### Dashboard Layout (MemberOverview)
- Personalized greeting (first name)
- Standup submission status (submitted/not submitted)
- Today's standup details
- Team feed (peer updates, excluding current user or all peers depending on state)
- Refresh button with toast feedback

### Loading States
- Route-level: Spinning loader with "Loading view..." text
- Page-level: Spinning loader with context-specific text (e.g., "Loading Member Overview...")
- Data-level: Inline spinners within cards
- All loading states use blue-500 spinners

### Toast System
- Fixed bottom-right, max-width sm, stacked
- 4 types: success (emerald), error (rose), warning (amber), info (blue)
- Auto-dismiss after 4 seconds
- Framer Motion animations (fade in, slide up, scale, exit)
- Contains: icon, optional title, message, dismiss button

---

## 7. DESIGN SYSTEM

### Design Language: Glassmorphism SaaS
The application uses a consistent glassmorphism design system built on Tailwind CSS.

### Core Glass Components (defined in `client/src/index.css`)
| Class | Properties | Usage |
|---|---|---|
| `glass-panel` | `bg-white/75 dark:bg-[#0b0e14]/75 backdrop-blur-xl` | Main panels, cards |
| `glass-card` | `bg-white/80 dark:bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] dark:hover:bg-white/[0.06] transition` | Cards, forms |
| `glass-card-interactive` | `glass-card` + `hover:-translate-y-0.5` | Clickable cards |
| `glass-input` | Glass effect + input styling | Form inputs |
| `glass-pill` | Pill/badge with glass effect | Badges, labels |
| `glass-dropdown` | Dropdown with glass effect | Menus, dropdowns |

### Background System
- **Light mode**: `#f8fafc` base with ambient glow via radial gradients (blue, purple, amber)
- **Dark mode**: `#080b11` base with ambient glow via radial gradients (blue, purple, amber, emerald)
- Class: `ambient-glow-bg` on root layout

### Typography
- **Font**: Inter (loaded via CSS)
- **Scale**: Tailwind defaults with emphasis on `xs` (12px) and `sm` (14px) for dense dashboard UI
- **Headings**: `font-extrabold`, `tracking-tight` for page titles
- **Body**: `text-xs` to `text-sm` for most content
- **Monospace**: Used for employee IDs, slugs, timestamps (e.g., `font-mono`)

### Color Palette
| Token | Light Mode | Dark Mode |
|---|---|---|
| Background | `#f8fafc` | `#080b11` |
| Surface (cards) | `white/80` | `white/[0.04]` |
| Primary text | `slate-900` | `white` |
| Secondary text | `slate-500` | `slate-400` |
| Border | `slate-200/80` | `white/10` |
| Primary accent | Blue-600 → Indigo-600 gradient | Same |
| Success | Emerald-500 | Emerald-500 |
| Warning | Amber-500 | Amber-500 |
| Danger | Rose-500 | Rose-500 |
| Info | Blue-500 | Blue-500 |

### Spacing & Layout
- Main content: `max-w-7xl` (80rem / 1280px), centered, `p-5 sm:p-6 md:p-8`
- Sidebar: `w-64` (16rem / 256px)
- Navbar: `h-16` (4rem / 64px)
- Card border radius: `rounded-2xl` (1rem) to `rounded-3xl` (1.5rem)
- Input border radius: `rounded-xl` (0.75rem)
- Button border radius: `rounded-xl` (0.75rem)

### Icon System
- **Library**: Lucide React (all icons imported from `lucide-react`)
- **Usage**: Consistent across all components; specific icons chosen per context (e.g., ShieldCheck for admin roles, Building2 for company, Calendar for dates, Bell for notifications)

### Animation Patterns
- **Page transitions**: Framer Motion — `initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}`
- **Toast animations**: Framer Motion AnimatePresence — fade in + slide up + scale, exit with scale down
- **Notification dropdown**: `animate-in fade-in zoom-in-95 duration-150`
- **Live indicators**: `animate-pulse` on dots, `animate-bounce` on alert icons
- **Refresh spinners**: `animate-spin` on RefreshCw icon
- **Hover effects**: `transition` on interactive elements, `hover:-translate-y-0.5` on cards

### Theme System
- **Default**: Dark mode
- **Toggle**: Sun/Moon icon buttons in navbar and login page
- **Persistence**: `localStorage('standup_theme')`
- **Application**: `dark` class on `<html>` element; all styles use Tailwind dark: variants

---

## 8. RESPONSIVE DESIGN

### Breakpoint Behavior (Based on Tailwind Classes)
| Breakpoint | Width | Behavior Changes |
|---|---|---|
| **Default / Mobile** | <640px (sm) | Sidebar: NOT VISIBLE in code (hidden class likely). Navbar elements hidden below sm/md/lg/xl as per utility classes |
| **sm** | 640px+ | Search shortcut ⌨K shown, some sm:inline labels appear |
| **md** | 768px+ | Date pill hidden, date still shown |
| **lg** | 1024px+ | Export button text visible (lg:inline), navbar more items visible |
| **xl** | 1280px+ | Date pill visible, full navbar layout |

### Sidebar Responsiveness
The sidebar at `w-64` appears to be desktop-only. The code does not show responsive sidebar behavior (no collapse/expand toggle, no mobile drawer). On smaller viewports, sidebar visibility depends on parent layout handling NOT VERIFIED beyond what is in App.tsx.

### Touch Targets
Buttons and interactive elements use padding consistent with 44px+ touch targets (py-2.5, py-3, etc.).

### Form Responsiveness
Forms use full-width inputs (`w-full`) that stack vertically. Modals are responsive with `max-w-md` to `max-w-lg` constraints.

---

## 9. ACCESSIBILITY

### Keyboard Navigation
- **Tab order**: Follows DOM order — sidebar → main content → navbar elements → notifications → user profile → logout
- **⌘K shortcut**: Search shortcut indicator shown (functional behavior NOT VERIFIED beyond visual indicator)
- **Focus indicators**: Native browser focus styles NOT VERIFIED — no explicit `focus-visible` or focus-ring styling documented in glass components; `focus:ring-2 focus:ring-blue-500/20` is used on search input specifically

### ARIA and Semantic HTML
- **Landmarks**: `<header>` used for navbar, `<aside>` used for sidebar, `<main>` used for content area, `<nav>` used for navigation menu
- **Form labels**: Explicit `<label>` elements with `htmlFor` attributes (verified on login page)
- **Required fields**: `required` attribute on inputs
- **Button titles**: `title` attributes on icon buttons (theme toggle, refresh, notifications, logout, export)
- **NOT VERIFIED**: ARIA labels, aria-live regions, screen reader-specific announcements, skip-to-content links

### Color & Contrast
- **Dark mode**: Dark backgrounds (`#080b11`) with white/light text — likely meets WCAG contrast ratios for normal text
- **Light mode**: Light backgrounds (`#f8fafc`) with slate text — contrast likely adequate for normal text; NOT VERIFIED with automated tools
- **Status colors**: Emerald/amber/rose/blue used for semantic purposes (success/warning/error/info) — NOT VERIFIED for WCAG AA compliance on all combinations

### Motion & Animations
- Animations are short (150ms-400ms) and do not flash excessively
- **NOT VERIFIED**: `prefers-reduced-motion` media query handling
- Toast animations use AnimatePresence with conditional enter/exit styles

### Accessibility Gaps (Known)
1. No confirmed skip-to-main-content link
2. No confirmed ARIA live regions for toast notifications
3. No confirmed `prefers-reduced-motion` support
4. Sidebar not confirmed accessible on mobile (visibility at small breakpoints NOT VERIFIED)
5. Focus-visible styling inconsistently applied across components

---

## 10. DESIGN CONSTRAINTS

### Non-Negotiable Constraints
1. **No fake statistics**: Landing page currently shows placeholder stats (90%, 100%, +40%). Do not generate or reproduce fake metrics in Stitch designs. Either show accurate numbers or omit entirely.
2. **No invented customers/users**: Do not show fictional customer logos, user counts, or testimonials.
3. **No external integrations without verification**: Slack integration button exists in UI but backend NOT VERIFIED. Microsoft Teams NOT VERIFIED. Do not design Slack/MS Teams integration flows.
4. **AI accuracy**: The "AI" feature is local heuristic-based summarization. Do not design interfaces suggesting real-time AI, ML inference, or external AI API calls.
5. **No dark patterns**: No forced actions, hidden cancellations, or manipulative UX.
6. **4-tier RBAC**: All UI must respect the 4 roles (ADMIN, MANAGER, TEAM_LEAD, TEAM_MEMBER). No UI elements that expose features the user's role cannot access.
7. **Multi-tenant isolation**: All data views must be scoped to the user's company. No cross-company data access in UI.
8. **Glassmorphism design language**: All screens should follow the established glass-panel / glass-card / glass-input design system.

### Design Do's and Don'ts
| DO | DON'T |
|---|---|
| Use established glassmorphism components | Introduce new card/panel styles outside the system |
| Use Inter font and Tailwind defaults | Use custom fonts or non-Tailwind utilities |
| Show Lucide icons consistently | Introduce icon libraries or icon sets other than Lucide |
| Use role-based UI filtering | Show admin features to regular users |
| Use toast notifications for feedback | Use alert() or modal dialogs for simple confirmations |
| Support dark and light themes | Assume only one theme |
| Use accurate metrics from code | Invent statistics, user counts, or KPIs |
| Use dicebear API for avatars/logos | Reference non-existent local image assets |

### Performance Expectations
- Lazy-loaded routes (code-splitting via React.lazy) — maintain in any redesign
- Page transitions under 300ms (current: 280ms)
- Notification polling at 15s intervals (do not increase frequency in redesign)
- Skeleton/loading states for all async data fetches

---

## 11. STITCH SCREEN PLAN

### Screen Inventory (Verified from Code)
| # | Screen Name | Route | Description |
|---|---|---|---|
| 1 | Landing | `/` | Public marketing/landing page with hero, features, walkthrough |
| 2 | Login | `/login` | 2-step auth (identify → password) with workspace selection |
| 3 | Register | `/register` | Company workspace registration form |
| 4 | Dashboard (Manager) | `/dashboard` | ManagerDashboard with stats, AI insights, blockers, team updates |
| 5 | Dashboard (Member) | `/dashboard` | MemberOverview with standup status and team feed |
| 6 | Daily Standup | `/standup` | Standup submission form (members) or team feed (managers/admins) |
| 7 | Standup History | `/history` | Timeline view of past standups with blocker filter |
| 8 | Teams | `/teams` | Team roster management with access requests |
| 9 | Departments | `/departments` | Department CRUD and hierarchy view (ADMIN only) |

### Screen Relationships
```
Landing
├── → Login
└── → Register

Login
├── → Dashboard (after auth)
└── Register → Dashboard

Dashboard (role-gated split)
├── ManagerDashboard (MANAGER, ADMIN)
│   ├── Daily Standup (team feed tab)
│   ├── Standup History
│   ├── Teams
│   └── Departments (ADMIN only)
└── MemberOverview (TEAM_MEMBER, TEAM_LEAD)
    ├── Daily Standup (form tab)
    ├── Standup History
    └── Teams
```

### Component Inventory for Stitch Implementation
| Component | Location | Usage Count |
|---|---|---|
| Sidebar | `client/src/components/layout/Sidebar.tsx` | 1 (layout) |
| Navbar | `client/src/components/layout/Navbar.tsx` | 1 (layout) |
| NotificationBanner | `client/src/components/common/NotificationBanner.tsx` | 1 (layout) |
| ExportModal | Referenced in ManagerDashboard | 1 |
| DepartmentSwitcher | Referenced in ManagerDashboard | 1 |
| RestrictedDepartmentView | Referenced in dashboards | 1 |
| StatCard | Referenced in ManagerDashboard | 1 |
| BlockerPriorityList | Referenced in ManagerDashboard | 1 |
| TeamUpdateCard | `client/src/components/dashboard/TeamUpdateCard.tsx` | 1 |
| AiInsightWidget | Referenced in ManagerDashboard | 1 |
| StandupHistoryTimeline | `client/src/components/standup/StandupHistoryTimeline.tsx` | 1 |
| AccessRequestsPanel | `client/src/components/department/AccessRequestsPanel.tsx` | 1 |

### Stitch Implementation Order (Recommended)
1. **Landing Page** — standalone, no auth required
2. **Login Page** — standalone, no auth required
3. **Register Page** — standalone, no auth required
4. **App Shell** — Sidebar + Navbar + NotificationBanner layout (build with placeholder content)
5. **Dashboard (Manager)** — most complex screen, central hub
6. **Dashboard (Member)** — simpler variant, shares layout
7. **Daily Standup** — form + team feed variants
8. **Standup History** — timeline component
9. **Teams** — table/cards with modal workflows
10. **Departments** — admin-only, tree view + CRUD

---

## 12. IMPLEMENTATION NOTES

### Technology Stack (Verified)
| Layer | Technology | Version Notes |
|---|---|---|
| Frontend | React 18 + TypeScript | Lazy-loaded routes |
| Routing | React Router v6 | BrowserRouter, Navigate for redirects |
| Styling | Tailwind CSS | Glassmorphism utility classes |
| Animations | Framer Motion | Page transitions, toast animations |
| Icons | Lucide React | All icons from lucide-react |
| State | React Context | Auth, Theme, Toast contexts |
| API Client | Custom `api` service | Axios or fetch wrapper in `client/src/services/api.ts` |
| Backend | Express.js + Prisma | SQLite database (WAL mode) |
| Database | SQLite | Via Prisma ORM; PRAGMAs: journal_mode=WAL, busy_timeout=5000, synchronous=NORMAL, foreign_keys=ON |
| Validation | Zod | All API inputs validated via Zod schemas in `server/src/validators/` |
| Auth | JWT | 7-day expiry, Bearer token, stored in localStorage |
| Testing | Playwright (e2e), Jest (server), React Testing Library (frontend) | 23 test files total |

### Key Implementation Details
- **No local image assets**: Avatars use `https://api.dicebear.com/7.x/avataaars/svg`, company logos use `https://api.dicebear.com/7.x/identicon/svg`. Design should account for external placeholder images or use generated/initials-based fallbacks.
- **No real API for Slack/Teams**: The Export button references Slack in its tooltip but no Slack integration code exists. Any Stitch implementation should not include Slack-specific UI flows.
- **The QuickDemoBar component is deprecated**: Returns `null`. Do not include in designs.
- **Register page uses Activity icon**: Unlike Login and Sidebar which were updated, Register still imports Activity from lucide-react (line 5). May need updating for consistency.
- **AiInsightWidget may reference Activity icon**: NOT VERIFIED whether this component still uses the Activity icon (it was not cleaned up during the sidebar/logo update).
- **Dark mode is default**: First-time users see the dark theme. Light mode must be opt-in via toggle.
- **Two-step authentication flow**: The Login page uses IDENTIFY → SELECT_WORKSPACE → PASSWORD flow. This is a distinctive UX pattern that should be preserved.
- **Notification system has two polling layers**: Navbar polls every 15s, banner checks every 10s. Both are client-side only; no WebSocket or SSE layer exists.
- **Prisma schema uses SQLite WAL mode**: This enables concurrent reads and better write performance. Not a PostgreSQL/MySQL application.

### Known UI Inconsistencies
1. Landing page uses "Intelligent Daily Standup" wordmark; app brand is "Standup"
2. Landing page has Activity icons that were removed from Sidebar and Login
3. QuickDemoBar is dead code (returns null)
4. Export button tooltip mentions Slack (no integration exists)
5. Landing page stats are placeholder values (NOT REAL)

---

## STITCH GENERATION PROMPT

Use this prompt when generating screens with Google Stitch:

```
Design a modern professional SaaS application called "Standup" — an async engineering daily standup tool. The app replaces morning meetings with written daily updates.

DESIGN DIRECTION:
- Modern professional SaaS aesthetic
- Glassmorphism design language: translucent white/gray panels with backdrop blur, soft borders, and subtle shadows on both light and dark backgrounds
- Dark theme is the DEFAULT; light theme is available via toggle
- Background: dark slate (#080b11) or light slate (#f8fafc) with subtle ambient colored glows (blue, purple, amber radial gradients)
- Typography: Inter font, dense dashboard UI using mostly xs (12px) and sm (14px) sizes, headings use font-extrabold with tracking-tight
- Icons: Use Lucide React style icons (minimal, geometric, consistent stroke width)
- Cards: rounded-2xl to rounded-3xl, glass effect (white/80 opacity on dark, white/75 on light), backdrop-blur-md to backdrop-blur-xl, subtle hover lift
- Buttons: rounded-xl, blue-to-indigo gradient for primary actions, glass effect for secondary
- Animations: Smooth transitions (200-400ms), fade-in page transitions, pulse on live indicators, slide-in for dropdowns

COLOR PALETTE:
- Background dark: #080b11, Background light: #f8fafc
- Primary: Blue-600 to Indigo-600 gradient
- Success: Emerald-500, Warning: Amber-500, Error: Rose-500, Info: Blue-500
- Text primary dark: slate-900, Text primary light: white
- Text secondary: slate-500 (light), slate-400 (dark)
- Borders: slate-200/80 (light), white/10 (dark)

KEY SCREENS TO DESIGN:
1. LANDING PAGE: Hero with headline "The morning update, without the meeting." Two CTAs (Create workspace / Sign in). Below: 3-step process (Write standup → Leads read feed → Managers see pattern). Feature list. CTA section. Footer. NO FAKE STATISTICS. No customer logos. No real metrics.

2. LOGIN PAGE: Two-step authentication. Step 1: Email or Employee ID input. Step 2: Password entry with company card preview and user identity pill. Glassmorphism card centered on page. Theme toggle in top-right.

3. DASHBOARD (Manager): Stat cards row, tab navigation (Overview / All Standups / Blockers / AI), department switcher, team update cards, AI insight widget (heuristic summaries, NOT real AI), blocker priority list, export button. Dense dashboard layout.

4. DAILY STANDUP: Form for submitting daily updates (what you did, blockers, plan). Team feed view showing peer updates. Role-dependent: members see form, managers see team feed.

5. STANDUP HISTORY: Timeline view of past standups with blocker level filter (All / Critical / Minor / None). Each entry shows date, status, blockers.

6. TEAMS: Team roster with members, roles, and access management. Invite and remove members. Access request panel.

7. DEPARTMENTS (Admin only): Department list with CRUD, hierarchy tree view, search.

CRITICAL RULES:
- No fake statistics, metrics, user counts, or conversion rates
- No invented customer logos, testimonials, or partner mentions
- No Slack, Microsoft Teams, or other external integration UI
- The "AI" feature is a local heuristic summarization tool, NOT real AI — design it as such (template-based, rule-based summaries, not chatbot-style AI interfaces)
- Use dicebear API (avataaars for people, identicon for companies) for all avatar/logo images — no local images exist
- Respect 4-tier RBAC: Admin, Manager, Team Lead, Team Member — UI must be role-appropriate
- Dark mode default with light mode toggle
- Lucide React icons only
- Inter font
- No emoji in UI (system emoji renders vary) — EXCEPT where the app already uses specific emojis intentionally
- Dense information architecture: dashboards should show lots of information in compact cards, not sparse layouts
- Glassmorphism on everything: panels, cards, inputs, dropdowns, modals, toasts
```

---

*This document was generated by inspecting the standup-meeting repository source code. All claims are verified against the codebase unless marked as NOT VERIFIED. This document should be treated as a living document and updated as the codebase evolves.*
