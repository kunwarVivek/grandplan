# GrandPlan API Reference

Complete API documentation for the GrandPlan project management and task orchestration platform.

## Table of Contents

- [Authentication](#authentication)
- [Authorization & Permissions](#authorization--permissions)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Health Check Endpoints](#health-check-endpoints)
- [Organizations](#organizations)
- [Workspaces](#workspaces)
- [Projects](#projects)
- [Tasks](#tasks)
- [Teams](#teams)
- [AI Operations](#ai-operations)
- [Billing](#billing)
- [Notifications](#notifications)
- [Integrations](#integrations)
- [Uploads](#uploads)
- [Platform Administration](#platform-administration)

## Authentication

All API endpoints (except health checks, webhooks, and public endpoints) require authentication using Bearer tokens obtained from the Better Auth authentication system.

### Request Headers

```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
X-Organization-Id: <current-organization-id>
X-Request-Id: <unique-request-id>
```

### Authentication Endpoints

Authentication is handled by Better Auth at `/api/auth/*`. Refer to Better Auth documentation for available authentication methods.

## Authorization & Permissions

GrandPlan uses Role-Based Access Control (RBAC). Each endpoint requires specific permissions based on the user's role within the organization.

### Permission Format

Permissions follow the format: `resource:action`

Examples:
- `organization:read` - View organization details
- `task:create` - Create tasks
- `organization:manage_members` - Manage organization members
- `platform:users:write` - Platform admin user management

### Common Permissions

| Resource | Permissions |
|----------|-------------|
| Organization | `organization:list`, `organization:read`, `organization:create`, `organization:update`, `organization:delete`, `organization:manage_members` |
| Workspace | `workspace:read`, `workspace:create`, `workspace:update`, `workspace:delete`, `workspace:manage_members` |
| Project | `project:read`, `project:create`, `project:update`, `project:delete` |
| Task | `task:read`, `task:create`, `task:update`, `task:delete`, `tasks:ai` |
| Team | `team:read`, `team:create`, `team:update`, `team:delete`, `team:manage_members` |
| Billing | `billing:read`, `billing:manage` |
| Notifications | `notifications:read`, `notifications:manage`, `notifications:preferences`, `notifications:push` |
| Integrations | `integrations:read`, `integrations:manage` |

## Rate Limiting

### Standard Rate Limits

- **Standard API endpoints**: Rate limited per IP address
- **AI endpoints**: Additional rate limiting (lower threshold)
- **Webhook endpoints**: Rate limited for security

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (authentication required) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (system not ready) |

---

## Health Check Endpoints

### GET /

Simple root endpoint to verify server is running.

**Authentication**: None required

**Response**: `200 OK`
```
OK
```

---

### GET /health

Basic health check with timestamp.

**Authentication**: None required

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2026-01-11T10:30:00Z"
}
```

---

### GET /ready

Readiness check verifying all dependencies (database, Redis) are available.

**Authentication**: None required

**Response**: `200 OK` (ready) or `503 Service Unavailable` (not ready)
```json
{
  "status": "ready",
  "timestamp": "2026-01-11T10:30:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 5
    },
    "redis": {
      "status": "ok",
      "latency": 2
    }
  }
}
```

---

## Organizations

Organizations are the top-level tenant entities in GrandPlan.

### GET /api/organizations

List all organizations accessible to the current user.

**Permission**: `organization:list`

**Query Parameters**:
- `limit` (optional): Maximum items to return (default: 20, max: 100)
- `offset` (optional): Number of items to skip (default: 0)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "description": "Our main organization",
    "logo": "https://example.com/logo.png",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  }
]
```

---

### POST /api/organizations

Create a new organization.

**Permission**: `organization:create`

**Request Body**:
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Our main organization",
  "logo": "https://example.com/logo.png"
}
```

**Validation**:
- `name`: Required, 1-100 characters
- `slug`: Optional (auto-generated from name), lowercase alphanumeric with hyphens, 1-50 characters
- `description`: Optional, max 500 characters
- `logo`: Optional, valid URL

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Our main organization",
  "logo": "https://example.com/logo.png",
  "createdAt": "2026-01-11T10:30:00Z",
  "updatedAt": "2026-01-11T10:30:00Z"
}
```

---

### GET /api/organizations/slug/:slug

Get an organization by its unique slug.

**Permission**: `organization:read`

**Path Parameters**:
- `slug`: Organization slug

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Our main organization",
  "logo": "https://example.com/logo.png",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-10T00:00:00Z"
}
```

---

### GET /api/organizations/:id

Get organization details by ID.

**Permission**: `organization:read`

**Path Parameters**:
- `id`: Organization ID

**Response**: `200 OK` (same as slug endpoint)

---

### PATCH /api/organizations/:id

Update organization details.

**Permission**: `organization:update`

**Path Parameters**:
- `id`: Organization ID

**Request Body** (all fields optional):
```json
{
  "name": "Acme Corporation",
  "description": "Updated description"
}
```

**Response**: `200 OK` (returns updated organization)

---

### PATCH /api/organizations/:id/branding

Update organization branding.

**Permission**: `organization:update`

**Path Parameters**:
- `id`: Organization ID

**Request Body**:
```json
{
  "logo": "https://example.com/new-logo.png",
  "primaryColor": "#FF5733",
  "accentColor": "#33FF57"
}
```

**Response**: `200 OK` (returns updated organization)

---

### DELETE /api/organizations/:id

Delete an organization.

**Permission**: `organization:delete`

**Path Parameters**:
- `id`: Organization ID

**Response**: `204 No Content`

---

### GET /api/organizations/:id/members

List all members of an organization.

**Permission**: `organization:read`

**Path Parameters**:
- `id`: Organization ID

**Response**: `200 OK`
```json
[
  {
    "userId": "uuid",
    "roleId": "admin",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg"
    },
    "joinedAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### POST /api/organizations/:id/members/invite

Invite a member to the organization.

**Permission**: `organization:manage_members`

**Path Parameters**:
- `id`: Organization ID

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "roleId": "member",
  "teamId": "optional-team-id"
}
```

**Validation**:
- `email`: Required, valid email, max 255 characters
- `roleId`: Required
- `teamId`: Optional

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "roleId": "member",
  "teamId": null,
  "status": "pending",
  "createdAt": "2026-01-11T10:30:00Z",
  "expiresAt": "2026-01-18T10:30:00Z"
}
```

---

### PATCH /api/organizations/:id/members/:userId

Update a member's role.

**Permission**: `organization:manage_members`

**Path Parameters**:
- `id`: Organization ID
- `userId`: User ID

**Request Body**:
```json
{
  "roleId": "admin"
}
```

**Response**: `200 OK` (returns updated member)

---

### DELETE /api/organizations/:id/members/:userId

Remove a member from the organization.

**Permission**: `organization:manage_members`

**Path Parameters**:
- `id`: Organization ID
- `userId`: User ID

**Response**: `204 No Content`

---

### GET /api/organizations/:id/invitations

List pending invitations for the organization.

**Permission**: `organization:read`

**Path Parameters**:
- `id`: Organization ID

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "email": "pending@example.com",
    "roleId": "member",
    "teamId": null,
    "status": "pending",
    "createdAt": "2026-01-10T00:00:00Z",
    "expiresAt": "2026-01-17T00:00:00Z"
  }
]
```

---

### DELETE /api/organizations/:id/invitations/:invitationId

Revoke a pending invitation.

**Permission**: `organization:manage_members`

**Path Parameters**:
- `id`: Organization ID
- `invitationId`: Invitation ID

**Response**: `204 No Content`

---

### POST /api/organizations/invitations/accept

Accept an organization invitation.

**Authentication**: Required (user must be logged in)

**Request Body**:
```json
{
  "token": "invitation-token"
}
```

**Response**: `200 OK` (returns organization details)

---

## Workspaces

Workspaces organize projects within an organization.

### GET /api/workspaces

List all workspaces in the current organization.

**Permission**: `workspace:read`

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Engineering",
    "description": "Engineering workspace",
    "organizationId": "uuid",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  }
]
```

---

### POST /api/workspaces

Create a new workspace.

**Permission**: `workspace:create`

**Request Body**:
```json
{
  "name": "Marketing",
  "description": "Marketing workspace"
}
```

**Validation**:
- `name`: Required, 1-100 characters
- `description`: Optional, max 500 characters

**Response**: `201 Created` (returns workspace details)

---

### GET /api/workspaces/:id

Get workspace details.

**Permission**: `workspace:read`

**Path Parameters**:
- `id`: Workspace ID

**Response**: `200 OK` (workspace details)

---

### PATCH /api/workspaces/:id

Update workspace.

**Permission**: `workspace:update`

**Path Parameters**:
- `id`: Workspace ID

**Request Body** (all optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response**: `200 OK` (updated workspace)

---

### DELETE /api/workspaces/:id

Delete workspace.

**Permission**: `workspace:delete`

**Path Parameters**:
- `id`: Workspace ID

**Response**: `204 No Content`

---

### GET /api/workspaces/:id/members

List workspace members.

**Permission**: `workspace:read`

**Path Parameters**:
- `id`: Workspace ID

**Response**: `200 OK` (array of members)

---

### POST /api/workspaces/:id/members

Add member to workspace.

**Permission**: `workspace:manage_members`

**Path Parameters**:
- `id`: Workspace ID

**Request Body**:
```json
{
  "userId": "uuid",
  "roleId": "member"
}
```

**Response**: `201 Created`

---

### PATCH /api/workspaces/:id/members/:userId

Update workspace member role.

**Permission**: `workspace:manage_members`

**Path Parameters**:
- `id`: Workspace ID
- `userId`: User ID

**Request Body**:
```json
{
  "roleId": "admin"
}
```

**Response**: `200 OK`

---

### DELETE /api/workspaces/:id/members/:userId

Remove member from workspace.

**Permission**: `workspace:manage_members`

**Path Parameters**:
- `id`: Workspace ID
- `userId`: User ID

**Response**: `204 No Content`

---

## Projects

Projects contain tasks and are organized within workspaces.

### GET /api/projects

List all projects in the current workspace/organization.

**Permission**: `project:read`

**Query Parameters**:
- `workspaceId` (optional): Filter by workspace

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Website Redesign",
    "description": "Redesign company website",
    "workspaceId": "uuid",
    "organizationId": "uuid",
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  }
]
```

---

### POST /api/projects

Create a new project.

**Permission**: `project:create`

**Request Body**:
```json
{
  "name": "Mobile App",
  "description": "Build mobile application",
  "workspaceId": "uuid",
  "status": "ACTIVE"
}
```

**Validation**:
- `name`: Required, 1-200 characters
- `description`: Optional, max 1000 characters
- `workspaceId`: Required
- `status`: Optional, enum: ACTIVE, ARCHIVED, COMPLETED

**Response**: `201 Created` (project details)

---

### GET /api/projects/:id

Get project details.

**Permission**: `project:read`

**Path Parameters**:
- `id`: Project ID

**Response**: `200 OK` (project details)

---

### GET /api/projects/:id/tasks

Get project with all its tasks.

**Permission**: `project:read`

**Path Parameters**:
- `id`: Project ID

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "Website Redesign",
  "description": "Redesign company website",
  "tasks": [
    {
      "id": "uuid",
      "title": "Design homepage",
      "status": "IN_PROGRESS"
    }
  ]
}
```

---

### PATCH /api/projects/:id

Update project.

**Permission**: `project:update`

**Path Parameters**:
- `id`: Project ID

**Request Body** (all optional):
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "COMPLETED"
}
```

**Response**: `200 OK` (updated project)

---

### DELETE /api/projects/:id

Delete project.

**Permission**: `project:delete`

**Path Parameters**:
- `id`: Project ID

**Response**: `204 No Content`

---

### POST /api/projects/:id/archive

Archive a project.

**Permission**: `project:update`

**Path Parameters**:
- `id`: Project ID

**Response**: `200 OK` (archived project)

---

### GET /api/projects/:id/stats

Get project statistics.

**Permission**: `project:read`

**Path Parameters**:
- `id`: Project ID

**Response**: `200 OK`
```json
{
  "totalTasks": 50,
  "completedTasks": 25,
  "inProgressTasks": 15,
  "blockedTasks": 2,
  "overdueTasks": 3,
  "completionPercentage": 50
}
```

---

### GET /api/projects/:id/document

Get YJS document for collaborative editing.

**Permission**: `project:read`

**Path Parameters**:
- `id`: Project ID

**Response**: `200 OK` (YJS document binary data)

---

### PUT /api/projects/:id/document

Save YJS document.

**Permission**: `project:update`

**Path Parameters**:
- `id`: Project ID

**Request Body**: YJS document binary data

**Response**: `200 OK`

---

## Tasks

Tasks are the core work items in GrandPlan, organized in a tree structure.

### GET /api/tasks

List tasks with optional filtering.

**Permission**: `task:read`

**Query Parameters**:
- `projectId` (optional): Filter by project
- `status` (optional): Filter by status
- `assigneeId` (optional): Filter by assignee
- `priority` (optional): Filter by priority
- `limit` (optional): Max items (default: 50)
- `offset` (optional): Skip items

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Implement user authentication",
    "description": "Add OAuth2 authentication",
    "projectId": "uuid",
    "parentId": null,
    "nodeType": "STORY",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "assigneeId": "uuid",
    "estimatedHours": 8,
    "dueDate": "2026-01-15T00:00:00Z",
    "position": 0,
    "createdAt": "2026-01-10T00:00:00Z",
    "updatedAt": "2026-01-11T00:00:00Z"
  }
]
```

---

### POST /api/tasks

Create a new task.

**Permission**: `task:create`

**Request Body**:
```json
{
  "title": "Fix login bug",
  "description": "Users can't log in with email",
  "projectId": "uuid",
  "parentId": "uuid",
  "nodeType": "BUG",
  "status": "PENDING",
  "priority": "CRITICAL",
  "assigneeId": "uuid",
  "estimatedHours": 4,
  "dueDate": "2026-01-12T00:00:00Z",
  "position": 0
}
```

**Validation**:
- `title`: Required, 1-500 characters
- `description`: Optional, max 10000 characters
- `projectId`: Required
- `parentId`: Optional (for subtasks)
- `nodeType`: Optional, enum: EPIC, STORY, TASK, SUBTASK, BUG, SPIKE
- `status`: Optional, enum: DRAFT, PENDING, IN_PROGRESS, BLOCKED, IN_REVIEW, COMPLETED, CANCELLED
- `priority`: Optional, enum: CRITICAL, HIGH, MEDIUM, LOW
- `assigneeId`: Optional
- `estimatedHours`: Optional, positive number
- `dueDate`: Optional, ISO 8601 date
- `position`: Optional, non-negative integer

**Response**: `201 Created` (task details)

---

### POST /api/tasks/bulk-status

Update status for multiple tasks.

**Permission**: `task:update`

**Request Body**:
```json
{
  "taskIds": ["uuid1", "uuid2", "uuid3"],
  "status": "COMPLETED"
}
```

**Response**: `200 OK`
```json
{
  "updated": 3,
  "tasks": [...]
}
```

---

### GET /api/tasks/:id

Get task details.

**Permission**: `task:read`

**Path Parameters**:
- `id`: Task ID

**Response**: `200 OK` (task details)

---

### PATCH /api/tasks/:id

Update task.

**Permission**: `task:update`

**Path Parameters**:
- `id`: Task ID

**Request Body** (all optional):
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "COMPLETED",
  "priority": "LOW",
  "assigneeId": "uuid",
  "estimatedHours": 6,
  "dueDate": "2026-01-20T00:00:00Z"
}
```

**Response**: `200 OK` (updated task)

---

### POST /api/tasks/:id/move

Move task in tree hierarchy or change position.

**Permission**: `task:update`

**Path Parameters**:
- `id`: Task ID

**Request Body**:
```json
{
  "parentId": "new-parent-id",
  "position": 2
}
```

**Response**: `200 OK` (moved task)

---

### DELETE /api/tasks/:id

Delete task (and all subtasks).

**Permission**: `task:delete`

**Path Parameters**:
- `id`: Task ID

**Response**: `204 No Content`

---

### GET /api/tasks/:id/children

Get immediate children of a task.

**Permission**: `task:read`

**Path Parameters**:
- `id`: Task ID

**Response**: `200 OK` (array of child tasks)

---

### GET /api/tasks/:id/descendants

Get all descendants of a task (entire subtree).

**Permission**: `task:read`

**Path Parameters**:
- `id`: Task ID

**Response**: `200 OK` (array of all descendant tasks)

---

### GET /api/tasks/:id/ancestors

Get all ancestors of a task (path to root).

**Permission**: `task:read`

**Path Parameters**:
- `id`: Task ID

**Response**: `200 OK` (array of ancestor tasks)

---

### GET /api/tasks/:id/dependencies

Get task dependencies.

**Permission**: `task:read`

**Path Parameters**:
- `id`: Task ID

**Response**: `200 OK`
```json
{
  "blocks": [
    {
      "id": "uuid",
      "title": "Task this blocks",
      "type": "BLOCKS"
    }
  ],
  "requiredBy": [
    {
      "id": "uuid",
      "title": "Task that requires this",
      "type": "REQUIRED_BY"
    }
  ],
  "relatedTo": [
    {
      "id": "uuid",
      "title": "Related task",
      "type": "RELATED_TO"
    }
  ]
}
```

---

### POST /api/tasks/:id/dependencies

Add a dependency.

**Permission**: `task:update`

**Path Parameters**:
- `id`: Task ID

**Request Body**:
```json
{
  "toTaskId": "uuid",
  "type": "BLOCKS"
}
```

**Validation**:
- `toTaskId`: Required
- `type`: Required, enum: BLOCKS, REQUIRED_BY, RELATED_TO

**Response**: `201 Created`

---

### DELETE /api/tasks/:id/dependencies/:toTaskId/:type

Remove a dependency.

**Permission**: `task:update`

**Path Parameters**:
- `id`: Task ID
- `toTaskId`: Target task ID
- `type`: Dependency type (BLOCKS, REQUIRED_BY, RELATED_TO)

**Response**: `204 No Content`

---

### GET /api/tasks/:id/history

Get task change history.

**Permission**: `task:read`

**Path Parameters**:
- `id`: Task ID

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "taskId": "uuid",
    "userId": "uuid",
    "action": "UPDATE",
    "changes": {
      "status": {
        "from": "IN_PROGRESS",
        "to": "COMPLETED"
      }
    },
    "timestamp": "2026-01-11T10:30:00Z"
  }
]
```

---

### GET /api/tasks/:id/comments

Get task comments.

**Permission**: `task:read`

**Path Parameters**:
- `id`: Task ID

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "taskId": "uuid",
    "userId": "uuid",
    "content": "This is a comment",
    "parentId": null,
    "createdAt": "2026-01-11T10:30:00Z",
    "updatedAt": "2026-01-11T10:30:00Z"
  }
]
```

---

### POST /api/tasks/:id/comments

Add a comment to a task.

**Permission**: `task:update`

**Path Parameters**:
- `id`: Task ID

**Request Body**:
```json
{
  "content": "This is my comment",
  "parentId": "optional-parent-comment-id"
}
```

**Validation**:
- `content`: Required, 1-10000 characters
- `parentId`: Optional (for threaded comments)

**Response**: `201 Created` (comment details)

---

### PATCH /api/tasks/:id/comments/:commentId

Update a comment.

**Permission**: `task:update`

**Path Parameters**:
- `id`: Task ID
- `commentId`: Comment ID

**Request Body**:
```json
{
  "content": "Updated comment text"
}
```

**Response**: `200 OK` (updated comment)

---

### DELETE /api/tasks/:id/comments/:commentId

Delete a comment.

**Permission**: `task:update`

**Path Parameters**:
- `id`: Task ID
- `commentId`: Comment ID

**Response**: `204 No Content`

---

## Teams

Teams group users within an organization.

### GET /api/teams

List all teams in the organization.

**Permission**: `team:read`

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Backend Team",
    "description": "Backend engineering team",
    "organizationId": "uuid",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-10T00:00:00Z"
  }
]
```

---

### GET /api/teams/my-teams

List teams the current user belongs to.

**Permission**: `team:read`

**Response**: `200 OK` (array of teams)

---

### POST /api/teams

Create a new team.

**Permission**: `team:create`

**Request Body**:
```json
{
  "name": "Frontend Team",
  "description": "Frontend engineering team"
}
```

**Response**: `201 Created` (team details)

---

### GET /api/teams/:id

Get team details.

**Permission**: `team:read`

**Path Parameters**:
- `id`: Team ID

**Response**: `200 OK` (team details)

---

### PATCH /api/teams/:id

Update team.

**Permission**: `team:update`

**Path Parameters**:
- `id`: Team ID

**Request Body** (all optional):
```json
{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

**Response**: `200 OK` (updated team)

---

### DELETE /api/teams/:id

Delete team.

**Permission**: `team:delete`

**Path Parameters**:
- `id`: Team ID

**Response**: `204 No Content`

---

### GET /api/teams/:id/members

List team members.

**Permission**: `team:read`

**Path Parameters**:
- `id`: Team ID

**Response**: `200 OK` (array of members)

---

### POST /api/teams/:id/members

Add member to team.

**Permission**: `team:manage_members`

**Path Parameters**:
- `id`: Team ID

**Request Body**:
```json
{
  "userId": "uuid",
  "roleId": "member"
}
```

**Response**: `201 Created`

---

### PATCH /api/teams/:id/members/:userId

Update team member role.

**Permission**: `team:manage_members`

**Path Parameters**:
- `id`: Team ID
- `userId`: User ID

**Request Body**:
```json
{
  "roleId": "lead"
}
```

**Response**: `200 OK`

---

### DELETE /api/teams/:id/members/:userId

Remove member from team.

**Permission**: `team:manage_members`

**Path Parameters**:
- `id`: Team ID
- `userId`: User ID

**Response**: `204 No Content`

---

## AI Operations

AI-powered task analysis and suggestions. All AI endpoints have additional rate limiting.

### POST /api/ai/decompose/:taskId

Decompose a task into subtasks using AI.

**Permission**: `tasks:ai`

**Path Parameters**:
- `taskId`: Task ID

**Response**: `202 Accepted`
```json
{
  "jobId": "uuid",
  "status": "queued",
  "taskId": "uuid"
}
```

---

### POST /api/ai/estimate/:taskId

Generate AI-powered time estimates for a task.

**Permission**: `tasks:ai`

**Path Parameters**:
- `taskId`: Task ID

**Response**: `202 Accepted`
```json
{
  "jobId": "uuid",
  "status": "queued",
  "taskId": "uuid"
}
```

---

### POST /api/ai/suggest/:taskId

Get AI suggestions for improving a task.

**Permission**: `tasks:ai`

**Path Parameters**:
- `taskId`: Task ID

**Response**: `202 Accepted`
```json
{
  "jobId": "uuid",
  "status": "queued",
  "taskId": "uuid"
}
```

---

### GET /api/ai/decisions/:taskId

Get AI decision history for a task.

**Permission**: `tasks:read`

**Path Parameters**:
- `taskId`: Task ID

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "taskId": "uuid",
    "type": "DECOMPOSE",
    "suggestion": "Break this epic into 5 stories",
    "status": "PENDING",
    "createdAt": "2026-01-11T10:30:00Z"
  }
]
```

---

### POST /api/ai/decisions/:decisionId/apply

Apply an AI decision.

**Permission**: `tasks:update`

**Path Parameters**:
- `decisionId`: Decision ID

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "APPLIED",
  "appliedAt": "2026-01-11T10:35:00Z"
}
```

---

### POST /api/ai/decisions/:decisionId/reject

Reject an AI decision.

**Permission**: `tasks:update`

**Path Parameters**:
- `decisionId`: Decision ID

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "REJECTED",
  "rejectedAt": "2026-01-11T10:35:00Z"
}
```

---

### GET /api/ai/quality/:taskId

Assess task quality using AI.

**Permission**: `tasks:read`

**Path Parameters**:
- `taskId`: Task ID

**Response**: `200 OK`
```json
{
  "score": 85,
  "issues": [
    {
      "type": "missing_description",
      "severity": "medium",
      "message": "Task lacks detailed description"
    }
  ],
  "suggestions": [
    "Add acceptance criteria",
    "Include more technical details"
  ]
}
```

---

### GET /api/ai/jobs/:jobId

Get AI job status.

**Permission**: `tasks:read`

**Path Parameters**:
- `jobId`: Job ID

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "completed",
  "result": {
    "subtasks": [
      {
        "title": "Design API endpoints",
        "estimatedHours": 4
      }
    ]
  },
  "createdAt": "2026-01-11T10:30:00Z",
  "completedAt": "2026-01-11T10:32:00Z"
}
```

---

### GET /api/ai/stats

Get AI queue statistics (admin only).

**Permission**: `admin:read`

**Response**: `200 OK`
```json
{
  "queueLength": 5,
  "processing": 2,
  "completed": 150,
  "failed": 3
}
```

---

## Billing

Subscription and billing management.

### GET /api/billing/subscription

Get current organization's subscription.

**Permission**: `billing:read`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "planId": "uuid",
  "status": "active",
  "currentPeriodStart": "2026-01-01T00:00:00Z",
  "currentPeriodEnd": "2026-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

---

### GET /api/billing/plans

Get available billing plans (public endpoint).

**Authentication**: Optional

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Pro",
    "price": 29.99,
    "interval": "month",
    "features": {
      "maxProjects": 50,
      "maxUsers": 10,
      "aiCredits": 1000
    }
  }
]
```

---

### POST /api/billing/checkout

Create checkout session for subscription.

**Permission**: `billing:manage`

**Request Body**:
```json
{
  "planId": "uuid",
  "successUrl": "https://app.grandplan.com/billing/success",
  "cancelUrl": "https://app.grandplan.com/billing/cancel"
}
```

**Response**: `200 OK`
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

---

### POST /api/billing/portal

Create customer portal session.

**Permission**: `billing:manage`

**Response**: `200 OK`
```json
{
  "portalUrl": "https://billing.stripe.com/..."
}
```

---

### POST /api/billing/cancel

Cancel subscription at period end.

**Permission**: `billing:manage`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "cancelAtPeriodEnd": true,
  "currentPeriodEnd": "2026-02-01T00:00:00Z"
}
```

---

### POST /api/billing/reactivate

Reactivate a cancelled subscription.

**Permission**: `billing:manage`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "cancelAtPeriodEnd": false,
  "status": "active"
}
```

---

### GET /api/billing/invoices

Get billing invoices.

**Permission**: `billing:read`

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "amount": 29.99,
    "currency": "usd",
    "status": "paid",
    "invoiceUrl": "https://...",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### GET /api/billing/usage

Get current usage statistics.

**Permission**: `billing:read`

**Response**: `200 OK`
```json
{
  "projects": 25,
  "users": 8,
  "aiCreditsUsed": 450,
  "storageUsed": 1024
}
```

---

### GET /api/billing/usage/:metric

Get usage for specific metric.

**Permission**: `billing:read`

**Path Parameters**:
- `metric`: Metric name (e.g., projects, users, aiCredits)

**Response**: `200 OK`
```json
{
  "metric": "projects",
  "current": 25,
  "limit": 50,
  "percentageUsed": 50
}
```

---

### GET /api/billing/limits

Check current plan limits.

**Permission**: `billing:read`

**Response**: `200 OK`
```json
{
  "maxProjects": 50,
  "maxUsers": 10,
  "maxAiCredits": 1000,
  "maxStorage": 10737418240
}
```

---

### GET /api/billing/features/:feature

Check if feature is available.

**Permission**: `billing:read`

**Path Parameters**:
- `feature`: Feature name

**Response**: `200 OK`
```json
{
  "feature": "advanced_analytics",
  "available": true
}
```

---

## Notifications

Notification management and push subscriptions.

### GET /api/notifications

List notifications for the current user.

**Permission**: `notifications:read`

**Query Parameters**:
- `unread` (optional): Filter by unread status (true/false)
- `type` (optional): Filter by notification type
- `limit` (optional): Max items
- `offset` (optional): Skip items

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "type": "TASK_ASSIGNED",
    "title": "New task assigned",
    "message": "You were assigned to 'Fix login bug'",
    "data": {
      "taskId": "uuid"
    },
    "read": false,
    "createdAt": "2026-01-11T10:30:00Z"
  }
]
```

---

### GET /api/notifications/unread-count

Get count of unread notifications.

**Permission**: `notifications:read`

**Response**: `200 OK`
```json
{
  "count": 5
}
```

---

### GET /api/notifications/summary

Get notification summary.

**Permission**: `notifications:read`

**Response**: `200 OK`
```json
{
  "total": 50,
  "unread": 5,
  "byType": {
    "TASK_ASSIGNED": 15,
    "MENTION": 10,
    "COMMENT": 25
  }
}
```

---

### GET /api/notifications/:id

Get notification details.

**Permission**: `notifications:read`

**Path Parameters**:
- `id`: Notification ID

**Response**: `200 OK` (notification details)

---

### PATCH /api/notifications/:id/read

Mark notification as read.

**Permission**: `notifications:manage`

**Path Parameters**:
- `id`: Notification ID

**Response**: `200 OK` (updated notification)

---

### POST /api/notifications/read-multiple

Mark multiple notifications as read.

**Permission**: `notifications:manage`

**Request Body**:
```json
{
  "notificationIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**: `200 OK`
```json
{
  "updated": 3
}
```

---

### POST /api/notifications/read-all

Mark all notifications as read.

**Permission**: `notifications:manage`

**Response**: `200 OK`
```json
{
  "updated": 15
}
```

---

### POST /api/notifications/:id/archive

Archive a notification.

**Permission**: `notifications:manage`

**Path Parameters**:
- `id`: Notification ID

**Response**: `200 OK`

---

### DELETE /api/notifications/:id

Delete a notification.

**Permission**: `notifications:manage`

**Path Parameters**:
- `id`: Notification ID

**Response**: `204 No Content`

---

### GET /api/notifications/preferences

Get notification preferences.

**Permission**: `notifications:preferences`

**Response**: `200 OK`
```json
{
  "email": {
    "TASK_ASSIGNED": true,
    "MENTION": true,
    "COMMENT": false
  },
  "push": {
    "TASK_ASSIGNED": true,
    "MENTION": true,
    "COMMENT": true
  }
}
```

---

### PATCH /api/notifications/preferences

Update notification preferences.

**Permission**: `notifications:preferences`

**Request Body**:
```json
{
  "email": {
    "TASK_ASSIGNED": false
  },
  "push": {
    "COMMENT": false
  }
}
```

**Response**: `200 OK` (updated preferences)

---

### POST /api/notifications/push/subscribe

Register push notification subscription.

**Permission**: `notifications:push`

**Request Body**:
```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response**: `201 Created`

---

### POST /api/notifications/push/unsubscribe

Unregister push subscription.

**Permission**: `notifications:push`

**Request Body**:
```json
{
  "endpoint": "https://..."
}
```

**Response**: `200 OK`

---

### GET /api/notifications/push/subscriptions

Get active push subscriptions.

**Permission**: `notifications:push`

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "endpoint": "https://...",
    "createdAt": "2026-01-10T00:00:00Z"
  }
]
```

---

## Integrations

Third-party integrations and OAuth flows.

### GET /api/integrations

List available integrations (public).

**Authentication**: Optional

**Response**: `200 OK`
```json
[
  {
    "provider": "github",
    "name": "GitHub",
    "description": "Sync issues and PRs",
    "capabilities": ["import", "sync", "webhooks"]
  },
  {
    "provider": "slack",
    "name": "Slack",
    "description": "Notifications and commands",
    "capabilities": ["notifications", "commands"]
  }
]
```

---

### GET /api/integrations/connections

List user's connected integrations.

**Permission**: `integrations:read`

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "provider": "github",
    "userId": "uuid",
    "organizationId": "uuid",
    "status": "active",
    "lastSync": "2026-01-11T10:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### POST /api/integrations/:provider/oauth/start

Initiate OAuth flow for integration.

**Permission**: `integrations:manage`

**Path Parameters**:
- `provider`: Integration provider (github, slack, etc.)

**Request Body**:
```json
{
  "redirectUrl": "https://app.grandplan.com/integrations/callback"
}
```

**Response**: `200 OK`
```json
{
  "authUrl": "https://github.com/login/oauth/authorize?...",
  "state": "random-state-token"
}
```

---

### GET /api/integrations/:provider/oauth/callback

OAuth callback handler (called by OAuth provider).

**Path Parameters**:
- `provider`: Integration provider

**Query Parameters**:
- `code`: OAuth authorization code
- `state`: State token for CSRF protection

**Response**: `302 Redirect` to frontend with connection details

---

### DELETE /api/integrations/connections/:id

Disconnect an integration.

**Permission**: `integrations:manage`

**Path Parameters**:
- `id`: Connection ID

**Response**: `204 No Content`

---

### POST /api/integrations/connections/:id/sync

Trigger manual sync for integration.

**Permission**: `integrations:manage`

**Path Parameters**:
- `id`: Connection ID

**Response**: `202 Accepted`
```json
{
  "syncId": "uuid",
  "status": "queued"
}
```

---

### GET /api/integrations/connections/:id/status

Get integration connection status.

**Permission**: `integrations:read`

**Path Parameters**:
- `id`: Connection ID

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "active",
  "lastSync": "2026-01-11T10:00:00Z",
  "lastError": null,
  "syncInProgress": false
}
```

---

## Uploads

File upload endpoints for avatars, logos, and favicons.

### POST /api/uploads

Upload a file.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file`: File to upload (max 5MB)
- `type`: File type (avatar, logo, or favicon)

**Response**: `201 Created`
```json
{
  "url": "https://cdn.grandplan.com/uploads/...",
  "filename": "avatar.jpg",
  "size": 102400,
  "mimeType": "image/jpeg"
}
```

**Validation**:
- Max file size: 5MB
- Allowed types:
  - `avatar`: JPEG, PNG, WebP (max 2MB, 512x512px)
  - `logo`: JPEG, PNG, WebP, SVG (max 5MB)
  - `favicon`: ICO, PNG (max 1MB, 32x32px or 16x16px)

---

## Platform Administration

Platform admin endpoints for super administrators. All endpoints require platform admin authentication.

### GET /api/platform/admin/check

Check if current user is a platform admin (public for frontend routing).

**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "isPlatformAdmin": true,
  "role": "SUPER_ADMIN"
}
```

---

### User Management

#### GET /api/platform/users

List all users (platform admin).

**Permission**: `platform:users:read`

**Query Parameters**:
- `search` (optional): Search by name or email
- `status` (optional): Filter by status (active, banned)
- `limit`, `offset`: Pagination

**Response**: `200 OK` (array of users)

---

#### GET /api/platform/users/:id

Get user details.

**Permission**: `platform:users:read`

**Path Parameters**:
- `id`: User ID

**Response**: `200 OK` (user details)

---

#### PATCH /api/platform/users/:id

Update user.

**Permission**: `platform:users:write`

**Path Parameters**:
- `id`: User ID

**Request Body**:
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

**Response**: `200 OK` (updated user)

---

#### POST /api/platform/users/:id/ban

Ban a user.

**Permission**: `platform:users:write`

**Path Parameters**:
- `id`: User ID

**Request Body**:
```json
{
  "reason": "Terms of service violation"
}
```

**Response**: `200 OK`

---

#### POST /api/platform/users/:id/unban

Unban a user.

**Permission**: `platform:users:write`

**Path Parameters**:
- `id`: User ID

**Response**: `200 OK`

---

#### DELETE /api/platform/users/:id

Delete a user (GDPR compliance).

**Permission**: `platform:users:delete`

**Path Parameters**:
- `id`: User ID

**Response**: `204 No Content`

---

#### POST /api/platform/users/:id/impersonate

Impersonate a user for support purposes.

**Permission**: `platform:users:impersonate`

**Path Parameters**:
- `id`: User ID

**Response**: `200 OK`
```json
{
  "impersonationToken": "...",
  "expiresAt": "2026-01-11T11:30:00Z"
}
```

---

#### GET /api/platform/users/:id/activity

Get user activity log.

**Permission**: `platform:users:read`

**Path Parameters**:
- `id`: User ID

**Response**: `200 OK` (array of activity events)

---

### Organization Management

#### GET /api/platform/organizations

List all organizations.

**Permission**: `platform:organizations:read`

**Response**: `200 OK` (array of organizations)

---

#### GET /api/platform/organizations/:id

Get organization details.

**Permission**: `platform:organizations:read`

**Path Parameters**:
- `id`: Organization ID

**Response**: `200 OK` (organization details)

---

#### PATCH /api/platform/organizations/:id

Update organization (admin override).

**Permission**: `platform:organizations:write`

**Path Parameters**:
- `id`: Organization ID

**Response**: `200 OK` (updated organization)

---

#### POST /api/platform/organizations/:id/suspend

Suspend an organization.

**Permission**: `platform:organizations:write`

**Path Parameters**:
- `id`: Organization ID

**Request Body**:
```json
{
  "reason": "Non-payment"
}
```

**Response**: `200 OK`

---

#### POST /api/platform/organizations/:id/unsuspend

Unsuspend an organization.

**Permission**: `platform:organizations:write`

**Path Parameters**:
- `id`: Organization ID

**Response**: `200 OK`

---

#### DELETE /api/platform/organizations/:id

Delete an organization.

**Permission**: `platform:organizations:delete`

**Path Parameters**:
- `id`: Organization ID

**Response**: `204 No Content`

---

#### POST /api/platform/organizations/:id/transfer-ownership

Transfer organization ownership.

**Permission**: `platform:organizations:write`

**Path Parameters**:
- `id`: Organization ID

**Request Body**:
```json
{
  "newOwnerId": "uuid"
}
```

**Response**: `200 OK`

---

#### GET /api/platform/organizations/:id/audit-log

Get organization audit log.

**Permission**: `platform:organizations:read`

**Path Parameters**:
- `id`: Organization ID

**Response**: `200 OK` (array of audit events)

---

#### POST /api/platform/organizations/:id/adjust-subscription

Manually adjust organization subscription.

**Permission**: `platform:organizations:write`

**Path Parameters**:
- `id`: Organization ID

**Request Body**:
```json
{
  "planId": "uuid",
  "reason": "Special pricing agreement"
}
```

**Response**: `200 OK`

---

### Analytics

#### GET /api/platform/analytics/overview

Get platform overview analytics.

**Permission**: `platform:analytics:read`

**Response**: `200 OK`
```json
{
  "totalUsers": 5000,
  "totalOrganizations": 500,
  "activeSubscriptions": 450,
  "monthlyRevenue": 15000
}
```

---

#### GET /api/platform/analytics/revenue

Get revenue analytics.

**Permission**: `platform:analytics:read`

**Query Parameters**:
- `startDate`, `endDate`: Date range

**Response**: `200 OK` (revenue data)

---

#### GET /api/platform/analytics/usage

Get platform usage analytics.

**Permission**: `platform:analytics:read`

**Response**: `200 OK` (usage statistics)

---

#### GET /api/platform/analytics/growth

Get growth metrics.

**Permission**: `platform:analytics:read`

**Response**: `200 OK` (growth data)

---

#### GET /api/platform/analytics/export

Export analytics data.

**Permission**: `platform:analytics:export`

**Query Parameters**:
- `format`: Export format (csv, json)
- `startDate`, `endDate`: Date range

**Response**: `200 OK` (file download)

---

### System Configuration

#### GET /api/platform/system/config

Get system configuration.

**Permission**: `platform:system:read`

**Response**: `200 OK` (system config)

---

#### PATCH /api/platform/system/config

Update system configuration.

**Permission**: `platform:system:write`

**Request Body**: Configuration updates

**Response**: `200 OK` (updated config)

---

#### POST /api/platform/system/maintenance

Toggle maintenance mode.

**Permission**: Super admin only

**Request Body**:
```json
{
  "enabled": true,
  "message": "Scheduled maintenance"
}
```

**Response**: `200 OK`

---

### Feature Flags

#### GET /api/platform/system/feature-flags

List all feature flags.

**Permission**: `platform:feature-flags:read`

**Response**: `200 OK` (array of feature flags)

---

#### GET /api/platform/system/feature-flags/:key

Get feature flag details.

**Permission**: `platform:feature-flags:read`

**Path Parameters**:
- `key`: Feature flag key

**Response**: `200 OK` (feature flag details)

---

#### POST /api/platform/system/feature-flags

Create feature flag.

**Permission**: `platform:feature-flags:write`

**Request Body**:
```json
{
  "key": "advanced_analytics",
  "enabled": false,
  "description": "Enable advanced analytics features"
}
```

**Response**: `201 Created`

---

#### PATCH /api/platform/system/feature-flags/:key

Update feature flag.

**Permission**: `platform:feature-flags:write`

**Path Parameters**:
- `key`: Feature flag key

**Request Body**:
```json
{
  "enabled": true
}
```

**Response**: `200 OK`

---

#### DELETE /api/platform/system/feature-flags/:key

Delete feature flag.

**Permission**: `platform:feature-flags:write`

**Path Parameters**:
- `key`: Feature flag key

**Response**: `204 No Content`

---

### Announcements

#### GET /api/platform/announcements

List announcements.

**Permission**: `platform:announcements:read`

**Response**: `200 OK` (array of announcements)

---

#### GET /api/platform/announcements/:id

Get announcement details.

**Permission**: `platform:announcements:read`

**Path Parameters**:
- `id`: Announcement ID

**Response**: `200 OK` (announcement details)

---

#### POST /api/platform/announcements

Create announcement.

**Permission**: `platform:announcements:write`

**Request Body**:
```json
{
  "title": "New Feature Release",
  "message": "We've released advanced analytics!",
  "type": "INFO",
  "targetAudience": "ALL"
}
```

**Response**: `201 Created`

---

#### PATCH /api/platform/announcements/:id

Update announcement.

**Permission**: `platform:announcements:write`

**Path Parameters**:
- `id`: Announcement ID

**Response**: `200 OK`

---

#### DELETE /api/platform/announcements/:id

Delete announcement.

**Permission**: `platform:announcements:write`

**Path Parameters**:
- `id`: Announcement ID

**Response**: `204 No Content`

---

### Plan Management

#### GET /api/platform/plans

List all billing plans (admin view).

**Permission**: `platform:plans:read`

**Response**: `200 OK` (array of plans)

---

#### GET /api/platform/plans/:id

Get plan details.

**Permission**: `platform:plans:read`

**Path Parameters**:
- `id`: Plan ID

**Response**: `200 OK` (plan details)

---

#### POST /api/platform/plans

Create billing plan.

**Permission**: `platform:plans:write`

**Request Body**:
```json
{
  "name": "Enterprise",
  "price": 99.99,
  "interval": "month",
  "features": {
    "maxProjects": 500,
    "maxUsers": 100,
    "aiCredits": 10000
  }
}
```

**Response**: `201 Created`

---

#### PATCH /api/platform/plans/:id

Update plan.

**Permission**: `platform:plans:write`

**Path Parameters**:
- `id`: Plan ID

**Response**: `200 OK`

---

#### DELETE /api/platform/plans/:id

Delete plan.

**Permission**: `platform:plans:delete`

**Path Parameters**:
- `id`: Plan ID

**Response**: `204 No Content`

---

## Webhooks

Webhook endpoints for external services (Stripe, Polar). These endpoints do not require Bearer authentication but verify webhook signatures.

### POST /api/webhooks/stripe

Stripe webhook handler.

**Authentication**: Stripe signature verification

**Content-Type**: `application/json`

**Headers**:
- `stripe-signature`: Webhook signature

**Response**: `200 OK`

---

### POST /api/webhooks/polar

Polar webhook handler.

**Authentication**: Polar signature verification

**Content-Type**: `application/json`

**Response**: `200 OK`

---

## Testing Endpoints

For development and testing purposes.

### Example cURL Commands

**List organizations**:
```bash
curl -X GET http://localhost:3001/api/organizations \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json"
```

**Create task**:
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X",
    "projectId": "project-uuid",
    "priority": "HIGH"
  }'
```

**Upload file**:
```bash
curl -X POST http://localhost:3001/api/uploads \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@avatar.jpg" \
  -F "type=avatar"
```

---

## Additional Resources

- **OpenAPI Specification**: See `openapi.yaml` for complete OpenAPI 3.1 specification
- **Interactive Swagger UI**: Available at `/api/docs` (when configured)
- **Postman Collection**: Generate from OpenAPI spec
- **Authentication Documentation**: See Better Auth documentation

---

## Changelog

### Version 1.0.0 (2026-01-11)
- Initial API documentation release
- All core endpoints documented
- OpenAPI 3.1 specification created
