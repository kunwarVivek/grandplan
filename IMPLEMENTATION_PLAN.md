# GrandPlan - Technical Debt Implementation Plan

> Generated: 2025-12-29
> Based on Critical Analysis of PRD/FRD vs Implementation

## Executive Summary

**Total Technical Debts Identified: 248+**
- Schema Layer: 78 items (23 P0, 38 P1, 17 P2)
- Backend Layer: 30 items (6 P0, 9 P1, 15 P2)
- Frontend Layer: 33 items (11 P0, 15 P1, 7 P2)
- Packages Layer: 87 items (29 P0, 42 P1, 16 P2)
- Worker Layer: 29 items (6 P0, 8 P1, 15 P2)

---

## Implementation Priority Order

Following the principle: **Schema -> Packages -> Backend -> Worker -> Frontend**

---

## PHASE 1: Schema Layer (P0 Items)

### 1.1 Soft Delete Fields
Add `deletedAt DateTime?` to critical models for GDPR compliance:
- [ ] User
- [ ] Organization
- [ ] TaskNode
- [ ] Project
- [ ] Workspace
- [ ] Team

### 1.2 Missing Critical Fields
- [ ] `TaskNode.blockedReason` - String? for explaining blocked status
- [ ] `TaskNode.originalEstimate` - Float? for tracking estimate changes
- [ ] `User.lastLoginAt` - DateTime? for security tracking
- [ ] `User.timezone` - String? for localization
- [ ] `Organization.timezone` - String? default timezone

### 1.3 Missing Indexes
Add composite indexes for common queries:
- [ ] `TaskNode: @@index([projectId, status])`
- [ ] `TaskNode: @@index([projectId, priority, status])`
- [ ] `TaskNode: @@index([assigneeId, status, dueDate])`
- [ ] `TaskHistory: @@index([taskId, createdAt])`
- [ ] `Notification: @@index([userId, read, type])`
- [ ] `AuditLog: @@index([organizationId, createdAt])`

### 1.4 Missing Enums
- [ ] Create `IntegrationType` enum (SLACK, TEAMS, JIRA, ASANA, LINEAR, NOTION, GOOGLE_CALENDAR, OUTLOOK)
- [ ] Create `AuditAction` enum for audit log actions

---

## PHASE 2: Packages Layer (P0 Items)

### 2.1 @grandplan/env - Missing Environment Variables
Add to server.ts:
- [ ] REDIS_URL
- [ ] SENDGRID_API_KEY
- [ ] VAPID_PUBLIC_KEY/PRIVATE_KEY
- [ ] STRIPE_SECRET_KEY/WEBHOOK_SECRET
- [ ] OPENAI_API_KEY
- [ ] ANTHROPIC_API_KEY
- [ ] AI_PROVIDER
- [ ] ENCRYPTION_KEY

### 2.2 @grandplan/core - Missing hashToken Implementation
- [ ] Implement proper crypto hash function (not just returning token)

### 2.3 @grandplan/auth - Fix Hardcoded Values
- [ ] Move productId to environment variable
- [ ] Export auth types

### 2.4 @grandplan/payments - Webhook Security
- [ ] Implement Polar webhook signature validation

### 2.5 @grandplan/tenant - bypassTenantFilter
- [ ] Actually implement the bypass (currently just returns fn())

### 2.6 @grandplan/db - Export Types
- [ ] Export Prisma types from index.ts
- [ ] Add connection pooling configuration
- [ ] Add graceful disconnect export

---

## PHASE 3: Backend Layer (P0 Items)

### 3.1 Missing Auth Middleware
- [ ] Create `/apps/server/src/middleware/auth.ts`
- [ ] JWT/session verification
- [ ] Populate req.user

### 3.2 Missing Rate Limiting Middleware
- [ ] Create `/apps/server/src/middleware/rate-limit.ts`
- [ ] Redis-backed sliding window
- [ ] Per-user, per-org, per-endpoint limits

### 3.3 AI Routes - Add RBAC
- [ ] Add `requirePermission("tasks:ai")` to AI routes

### 3.4 Billing Routes - Add RBAC
- [ ] Add permission guards to billing routes

### 3.5 Notification Routes - Add User Scope
- [ ] Add user verification to notification endpoints

### 3.6 Missing Integration Module
- [ ] Create `/apps/server/src/modules/integration/`
- [ ] Routes, controllers, services, repositories
- [ ] OAuth flow handlers
- [ ] Webhook ingestion with signature verification

---

## PHASE 4: Worker Layer (P0 Items)

### 4.1 Missing Workers
- [ ] Create `ai-suggestions-worker.ts`
- [ ] Create `analytics-worker.ts`

### 4.2 Service Initialization
- [ ] Initialize emailService with API key
- [ ] Initialize pushService with VAPID keys

### 4.3 Integration Adapter Registration
- [ ] Register all adapters on worker startup

### 4.4 API Key Decryption
- [ ] Implement actual decryption in AI worker

### 4.5 Input Validation
- [ ] Add Zod validation to ALL job handlers

### 4.6 Health Check Endpoint
- [ ] Add HTTP server with /health and /ready endpoints

---

## PHASE 5: Frontend Layer (P0 Items)

### 5.1 Replace Mock Data
- [ ] `/routes/_authenticated/projects/$projectId/index.tsx` - use real API

### 5.2 Create Task Form Component
- [ ] TanStack Form + Zod validation
- [ ] Full task CRUD support

### 5.3 Migrate Forms to TanStack Form
- [ ] Migrate from react-hook-form
- [ ] Standardize validation patterns

### 5.4 Wire Real-time Socket Events
- [ ] Add listeners in task detail panel
- [ ] Add notification listener
- [ ] Add presence awareness

### 5.5 Initialize Yjs Documents
- [ ] Call useYjsDocument in project pages
- [ ] Connect task forms to collaborative editing

### 5.6 Create AI Decomposition Modal
- [ ] Dialog component using ui-store modal system
- [ ] Wire to backend AI endpoints

### 5.7 Create Task Store
- [ ] Zustand store for active filters, selected tasks, view mode

### 5.8 Missing API Hooks
- [ ] Comments/Activity
- [ ] File uploads
- [ ] AI suggestions
- [ ] Audit logs (admin)

### 5.9 Accessibility
- [ ] Add ARIA labels
- [ ] Fix keyboard navigation in Kanban
- [ ] Add focus management in modals

### 5.10 Loading States
- [ ] Add disabled={isPending} to all async buttons
- [ ] Add loading spinners

---

## Implementation Order (This Session)

### Batch 1: Schema Fixes
1. Add soft delete fields
2. Add missing critical fields
3. Add composite indexes
4. Create missing enums

### Batch 2: Package Fixes
1. Fix @grandplan/env with all env vars
2. Implement hashToken in @grandplan/core
3. Fix @grandplan/auth exports
4. Implement tenant bypass

### Batch 3: Backend Fixes
1. Create auth middleware
2. Create rate limit middleware
3. Add RBAC to AI routes
4. Add RBAC to billing routes

### Batch 4: Worker Fixes
1. Add service initialization
2. Register integration adapters
3. Add Zod validation
4. Add health check

### Batch 5: Frontend Fixes
1. Replace mock data with API
2. Create task form
3. Wire socket listeners
4. Create task store

---

## Files to Modify

### Schema Files
- `packages/db/prisma/schema/auth.prisma`
- `packages/db/prisma/schema/organization.prisma`
- `packages/db/prisma/schema/tasks.prisma`
- `packages/db/prisma/schema/billing.prisma`
- `packages/db/prisma/schema/integrations.prisma`

### Package Files
- `packages/env/src/server.ts`
- `packages/core/src/utils/index.ts`
- `packages/db/src/index.ts`
- `packages/auth/src/index.ts`
- `packages/tenant/src/prisma-extension.ts`

### Backend Files
- `apps/server/src/middleware/auth.ts` (NEW)
- `apps/server/src/middleware/rate-limit.ts` (NEW)
- `apps/server/src/modules/ai/api/routes.ts`
- `apps/server/src/modules/billing/api/routes.ts`
- `apps/server/src/modules/notification/api/routes.ts`

### Worker Files
- `apps/worker/src/index.ts`
- `apps/worker/src/workers/*.ts`

### Frontend Files
- `apps/web/src/routes/_authenticated/projects/$projectId/index.tsx`
- `apps/web/src/features/tasks/components/task-form.tsx` (NEW)
- `apps/web/src/stores/task-store.ts` (NEW)
- `apps/web/src/providers/socket-provider.tsx`

---

## Success Criteria

1. All P0 items addressed
2. Database migrations run cleanly
3. Backend builds without errors
4. Worker starts successfully with all services initialized
5. Frontend replaces mock data with real API calls
6. Forms use consistent TanStack Form + Zod pattern
7. Real-time features connected

---

## Notes

- This plan follows bottom-up approach: fix where issues originate, not where they surface
- DDD/SOLID/KISS/YAGNI principles guide backend changes
- Atomic/Gestalt/Visual Hierarchy principles guide frontend changes
- All changes should be incremental and testable
