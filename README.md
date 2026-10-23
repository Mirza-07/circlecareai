# CircleCare AI — Family Coordination & Alexa+ MCP Assistant

> **Target Event**: Build, Ship, Shape: Amazon Developer Hackathon 2026 (Alexa+ Track)  
> **Firebase Project**: `circlecare-ai` (ID: `circlecare-ai`)  
> **MCP Specification**: Spec 2025-11-25+ over Streamable HTTP & SSE  

---

## Executive Summary

**CircleCare AI** is a family coordination web application and self-hosted Model Context Protocol (MCP) server. It integrates:
1. **Shared Tasks & Chores**: Task lifecycle (`open`, `in_progress`, `done`), assignee filtering, priority, overdue detection, soft-delete with 30-day restore, and an append-only audit trail.
2. **Family Calendar with Conflict Detection**: Day, week, and upcoming list views in the viewer's timezone, 30-minute reminder offsets, recurrence, and instant overlap warnings when family members are double-booked.
3. **Multi-Tenant Family Workspace**: Role-based access control matrix (Owner, Admin, Member, Viewer), single-use 7-day expiring invite codes, and ownership transfer.
4. **Alexa+ Web Client & MCP Server**: A self-hosted MCP server implementing Streamable HTTP and SSE (using `@modelcontextprotocol/sdk`) with Bearer token authentication, paired with an interactive Echo Show / Alexa+ screen simulator and live JSON-RPC protocol inspector.
5. **AI Assistant with Confirmation Flow**: Safe, validated tool calling where state-changing actions (creating tasks, scheduling events) return pending actions requiring explicit user confirmation before modifying records.
6. **Privacy & Legal Compliance**: Public legal pages, data inventory table (NFR-PRIV-001), unticked AI conversation storage consent (FR-SET-003), and cookie consent controls.

---

## Architecture Overview

```
+-----------------------------------------------------------+
|                   CircleCare AI Web App                   |
|           (React 19 + TypeScript + Vite + Tailwind)       |
+-----------------------------+-----------------------------+
                              |
              +---------------+---------------+
              |                               |
    [Session / Token Auth]           [MCP Streamable HTTP]
              |                               |
              v                               v
+-----------------------------+-----------------------------+
|               Express API & MCP Server                    |
|             (Port 3001, Proxied via Vite)                 |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|              Shared Tool Layer (FR-AI-002)                |
|               (Zod Input & Output Validation)             |
|                                                           |
| 1. get_family_tasks         4. get_daily_schedule         |
| 2. create_family_task       5. create_family_event        |
| 3. update_family_task       6. get_family_summary         |
+-----------------------------+-----------------------------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
+-----------------------------+ +---------------------------+
|   Pending Action Store      | |   Multi-Tenant Data Store |
| (5-min expiry confirmation) | | (Family isolation checks) |
+-----------------------------+ +---------------------------+
```

---

## Quick Start & Judge Setup (NFR-DOC-001)

### Prerequisites
- **Node.js**: v18+ LTS (Tested on v24.21.0)
- **npm**: v9+ (Tested on v11.19.0)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Full Application (Backend + MCP + Frontend)
```bash
npm run dev
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend & MCP Server**: [http://localhost:3001](http://localhost:3001)
- **MCP Endpoint**: `POST http://localhost:3001/mcp`
- **MCP SSE Stream**: `GET http://localhost:3001/mcp/sse`

### 3. Run Test Suite
```bash
npm test
```
Runs 12 automated unit and security tests covering Zod validation, role matrix enforcement, pending action confirmation, conflict detection, and cross-family tenant isolation.

---

## Hackathon Journey C Demo (Under 3 Minutes)

CircleCare AI includes a seeded demo family (**The Miller Family**) ready for instant review:

1. **Open the Application**: Navigate to [http://localhost:5173](http://localhost:5173).
2. **Review Dashboard**:
   - Notice the live metric cards (**2 Due Today**, **4 Open/Pending**, **1 Overdue**, **3 Upcoming Events**).
   - Observe the live audit trail showing recent family updates.
3. **Switch Personas in the Top Bar**:
   - Click **Sarah** (Owner) &rarr; Full permissions to manage members, rename family, and transfer ownership.
   - Click **David** (Admin) &rarr; Manage tasks, create events, and invite new members.
   - Click **Emily** (Member) &rarr; Edit own tasks, view schedule.
   - Click **Leo** (Viewer) &rarr; Child read-only view; task creation disabled.
   - Click **Bob Baker** (Other Family) &rarr; Notice complete isolation: zero tasks from the Miller family are leaked!
4. **Open the Alexa+ Simulator**:
   - Click **Alexa+ MCP Live** in the top bar or header.
   - Observe the **MCP Server: CONNECTED** status badge.
   - Inspect the **MCP Protocol Inspector** on the right, which logs real-time JSON-RPC 2.0 frames (`initialize`, `tools/list`).
5. **Test Alexa+ Utterance & Conflict Detection**:
   - Click the prompt chip: *"What is on our schedule today?"*
   - Alexa+ calls `get_daily_schedule` via MCP and renders the **Daily Schedule Rich Card** (FR-MCP-006).
   - Notice the flagged overlap: **David has a conflict between Dentist Appointment and Leo's Soccer Practice!**
6. **Test Safe Pending Action Confirmation**:
   - Click *"Schedule dentist appointment tomorrow"*.
   - Because creating an event changes state, the tool returns a **Pending Action Card** with a 5-minute expiry.
   - Click **Confirm & Schedule**. The server executes the write and immediately updates the calendar and dashboard live!
7. **Test Multi-Tenant Defense**:
   - Click *"Show Baker family data (Test Refusal)"*.
   - The assistant and MCP server strictly refuse to expose cross-family records, returning an explicit access refusal.

---

## MCP Tools Reference (FR-AI-002)

| Tool Name | Parameters | Min Role | Confirmation Required? | Output |
| :--- | :--- | :--- | :--- | :--- |
| `get_family_tasks` | `status?`, `assigneeId?`, `dueFrom?`, `dueTo?`, `limit?` | Viewer | No | Array of tasks |
| `create_family_task` | `title`, `notes?`, `assigneeId?`, `dueAt?`, `priority?` | Member | **Yes** | Pending action / Created task |
| `update_family_task` | `taskId`, `patch` | Member / Admin | **Yes** | Pending action / Updated task |
| `get_daily_schedule` | `date` (ISO), `timeZone?` | Viewer | No | Events, tasks due, flagged overlaps |
| `create_family_event` | `title`, `startAt`, `endAt`, `timeZone`, `attendeeIds?`, `notes?` | Member | **Yes** | Conflicts, pending action / Created event |
| `get_family_summary` | `range` (`today` \| `week`) | Viewer | No | Counts of due, overdue, upcoming |

---

## Security & Privacy Highlights

- **Server-Side Token Verification**: Every MCP and assistant request requires a valid Bearer token.
- **Tenant Isolation**: Family ID is derived server-side from session auth; client or model-supplied family IDs are strictly ignored.
- **Data Inventory**: Detailed in [Privacy Policy & Data Inventory](file:///c:/alexa/src/pages/legal/LegalPages.tsx) (NFR-PRIV-001).
- **Opt-in AI History**: Unticked by default (FR-SET-003).
- **Firestore Rules**: Strict deny-all by default with family membership checks in `firestore.rules`.
