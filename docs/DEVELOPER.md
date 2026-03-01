# GrandPlan - Developer Documentation

## Architecture Overview

GrandPlan is a monorepo built with Turborepo, featuring a modular monolith backend and React frontend.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TanStack Start, TanStack Router, TanStack Query, TanStack Table, Zod, TailwindCSS, shadcn/ui |
| Backend | Express, Prisma, PostgreSQL, BullMQ, Better-Auth |
| Infrastructure | Docker, Railway |

### Project Structure

```
grandplan/
├── apps/
│   ├── server/          # Express API server (port 3001)
│   ├── web/            # React frontend (port 3000)
│   └── worker/         # BullMQ background workers
├── packages/           # Shared packages (DDD modules)
│   ├── ai/             # AI task decomposition
│   ├── audit/          # Audit logging
│   ├── auth/           # Better-Auth config
│   ├── config/         # TypeScript configs
│   ├── core/           # Logger, utilities
│   ├── db/             # Prisma schema
│   ├── env/            # Environment variables
│   ├── events/         # Event bus
│   ├── integrations/    # OAuth adapters (Slack, Teams, Linear)
│   ├── notifications/  # Email/push notifications
│   ├── payments/        # Stripe/Polar integration
│   ├── queue/          # BullMQ manager
│   ├── rbac/           # Role-based access control
│   ├── realtime/        # Socket.io + Yjs
│   └── tenant/         # Multi-tenant middleware
└── docs/               # This documentation
```

---

## Backend Module Structure

Each backend module follows DDD/SOLID principles:

```
modules/<name>/
├── api/
│   ├── controllers/    # Request handlers
│   ├── routes.ts      # Route definitions
│   ├── dto/            # Request/Response DTOs
│   └── validators/     # Zod schemas
├── application/
│   ├── services/      # Business logic
│   ├── handlers/      # Event handlers
│   └── dtos/
├── domain/
│   ├── entities/      # Domain entities
│   ├── value-objects/ # Value objects
│   └── events/        # Domain events
├── infrastructure/
│   ├── repositories/ # Data access
│   └── adapters/      # External integrations
└── index.ts           # Module exports
```

### API Routes Pattern

Routes are protected via RBAC middleware:

```typescript
router.post("/", requirePermission("resource:create"), handler);
```

---

## Frontend Feature Structure

```
features/<name>/
├── components/         # React components
├── hooks/            # TanStack Query hooks
├── types.ts          # TypeScript types
├── index.ts          # Public exports
└── views/            # View components (Kanban, List, Timeline)
```

### TanStack Query Patterns

```typescript
// Fetch
export function useTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.all(projectId),
    queryFn: () => api.get(`/api/projects/${projectId}/tasks`),
  });
}

// Mutation with optimistic updates
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/api/tasks", data),
    onMutate: async (newTask) => {
      await queryClient.cancelQueries(queryKeys.tasks.all());
      const previous = queryClient.getQueryData(queryKeys.tasks.all());
      queryClient.setQueryData(queryKeys.tasks.all(), (old) => [...old, newTask]);
      return { previous };
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(queryKeys.tasks.all(), context.previous);
    },
  });
}
```

---

## Running the Project

### Development

```bash
# Install dependencies
pnpm install

# Start all services (server + web + worker)
pnpm run dev

# Start individual services
pnpm run dev:server  # Backend only
pnpm run dev:web     # Frontend only
```

### Database

```bash
# Push schema to database
pnpm run db:push

# Open Prisma Studio
pnpm run db:studio
```

### Testing & Quality

```bash
# Run tests
pnpm run test

# Type check
pnpm run check-types

# Lint & format
pnpm run check

# Build
pnpm run build
```

---

## Key Features

### Task Management
- Hierarchical task decomposition (parent/child)
- Dependencies (blocking/blocked-by/related)
- Status workflow (draft → todo → in_progress → in_review → completed)
- Priority levels (urgent, high, medium, low)
- Assignees, due dates, time tracking

### Bulk Operations
```typescript
// Delete multiple tasks
DELETE /api/tasks/bulk
{ "taskIds": ["id1", "id2", ...] }

// Archive multiple tasks
POST /api/tasks/bulk-archive
{ "taskIds": ["id1", "id2", ...] }

// Update status for multiple tasks
POST /api/tasks/bulk-status
{ "taskIds": [...], "status": "in_progress" }
```

### Real-time Features
- Socket.io for live updates
- Yjs for collaborative editing
- Presence indicators

### Integrations
- OAuth flows for Slack, Teams, Linear
- Webhook handlers for external events

---

## Environment Variables

See `apps/server/.env.local` for required variables:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - BullMQ Redis
- `BETTER_AUTH_SECRET` - Auth encryption key
- ` polar_API_KEY` - Payment processing

---

## Testing

Tests use Vitest with mocking:

```typescript
import { describe, it, expect, vi } from "vitest";

describe("TaskService", () => {
  it("should create task", async () => {
    const service = new TaskService(mockRepo, mockEventBus);
    const task = await service.create({ title: "Test", projectId: "p1" });
    expect(task.title).toBe("Test");
  });
});
```

Run specific test files:
```bash
pnpm vitest run apps/server/src/modules/task/application/services/task.service.test.ts
```
