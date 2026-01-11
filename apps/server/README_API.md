# GrandPlan API Documentation

Comprehensive API documentation for the GrandPlan project management and task orchestration platform.

## Documentation Overview

This directory contains complete API documentation for developers building integrations with GrandPlan.

### Available Documentation

1. **[API Quick Start Guide](./API_QUICK_START.md)** - Get started in minutes
   - Authentication guide
   - Common API operations
   - Code examples for popular use cases
   - Troubleshooting tips

2. **[Complete API Reference](./API_REFERENCE.md)** - Comprehensive endpoint documentation
   - All endpoints with detailed descriptions
   - Request/response schemas
   - Authentication and permissions
   - Error handling
   - Rate limiting

3. **[OpenAPI 3.1 Specification](./openapi.yaml)** - Machine-readable API spec
   - Import into Postman, Insomnia, or other API clients
   - Generate SDKs for multiple languages
   - Use for contract testing and validation

4. **[Interactive Swagger UI](http://localhost:3001/api/docs)** - Try the API in your browser
   - Live API testing
   - Request/response examples
   - Authentication testing
   - Available when server is running

## Getting Started

### 1. Start the Server

```bash
# From repository root
pnpm dev

# The API will be available at:
# http://localhost:3001
```

### 2. Access Interactive Documentation

Open your browser to [http://localhost:3001/api/docs](http://localhost:3001/api/docs) for the interactive Swagger UI.

### 3. Authenticate

GrandPlan uses Bearer token authentication. Get a token by signing in through the web interface or authentication endpoints.

```bash
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

### 4. Make Your First API Call

```bash
curl -X GET http://localhost:3001/api/organizations \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json"
```

## API Structure

### Base URL

```
http://localhost:3001  (development)
https://api.grandplan.com  (production)
```

### API Modules

The API is organized into the following modules:

- **Organizations** (`/api/organizations`) - Organization management and members
- **Workspaces** (`/api/workspaces`) - Workspace CRUD and organization
- **Projects** (`/api/projects`) - Project management and tasks
- **Tasks** (`/api/tasks`) - Task CRUD, dependencies, comments, history
- **Teams** (`/api/teams`) - Team management and members
- **AI** (`/api/ai`) - AI-powered task analysis and suggestions
- **Billing** (`/api/billing`) - Subscriptions, plans, usage tracking
- **Notifications** (`/api/notifications`) - Notification management
- **Integrations** (`/api/integrations`) - Third-party integrations
- **Uploads** (`/api/uploads`) - File uploads
- **Platform Admin** (`/api/platform`) - Platform administration

### Health Checks

- `GET /` - Simple health check
- `GET /health` - Health check with timestamp
- `GET /ready` - Readiness check (verifies dependencies)

## Authentication

All API endpoints (except health checks and webhooks) require authentication using Bearer tokens.

### Request Headers

```http
Authorization: Bearer <your-token>
Content-Type: application/json
X-Organization-Id: <current-organization-id>
X-Request-Id: <unique-request-id>
```

### Authentication Flow

1. Sign in via `/api/auth/*` endpoints (Better Auth)
2. Receive session token
3. Include token in `Authorization: Bearer <token>` header
4. Token is validated on each request

## Authorization & Permissions

GrandPlan uses Role-Based Access Control (RBAC). Each endpoint requires specific permissions.

### Permission Format

```
resource:action
```

### Common Permissions

- `organization:read` - View organizations
- `organization:create` - Create organizations
- `organization:manage_members` - Manage organization members
- `project:read` - View projects
- `task:create` - Create tasks
- `tasks:ai` - Use AI features
- `billing:manage` - Manage billing
- `platform:users:write` - Platform admin user management

See the [API Reference](./API_REFERENCE.md) for permissions required by each endpoint.

## Rate Limiting

### Standard Limits

- **Standard API endpoints**: Rate limited per IP address
- **AI endpoints**: Lower limits due to computational cost
- **Webhook endpoints**: Rate limited for security

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Error Handling

### Error Response Format

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

## Pagination

List endpoints support pagination:

```bash
GET /api/tasks?limit=20&offset=0
```

**Parameters**:
- `limit`: Maximum items to return (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

## Filtering

Many endpoints support filtering:

```bash
# Filter by status
GET /api/tasks?status=IN_PROGRESS

# Filter by assignee
GET /api/tasks?assigneeId=user-uuid

# Combine filters
GET /api/tasks?status=IN_PROGRESS&priority=HIGH
```

## WebSocket / Real-time

GrandPlan includes real-time features via Socket.io for live updates.

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-auth-token'
  }
});
```

### Events

```javascript
// Task updates
socket.on('task:updated', (data) => {
  console.log('Task updated:', data);
});

// Join organization room
socket.emit('join:organization', { organizationId: 'uuid' });
```

## Using the API

### Import into API Clients

#### Postman

1. Open Postman
2. Import → Upload Files
3. Select `openapi.yaml`
4. Create environment with `baseUrl` and `token` variables

#### Insomnia

1. Open Insomnia
2. Create → Import From → File
3. Select `openapi.yaml`
4. Configure base URL and authentication

### Generate SDKs

Use OpenAPI Generator to create SDKs:

```bash
# TypeScript/JavaScript
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./sdk/typescript

# Python
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./sdk/python

# Go
openapi-generator-cli generate \
  -i openapi.yaml \
  -g go \
  -o ./sdk/go
```

## Code Examples

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('http://localhost:3001/api/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Task',
    projectId: 'project-uuid',
    priority: 'HIGH'
  })
});

const task = await response.json();
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

data = {
    'title': 'New Task',
    'projectId': 'project-uuid',
    'priority': 'HIGH'
}

response = requests.post(
    'http://localhost:3001/api/tasks',
    headers=headers,
    json=data
)

task = response.json()
```

### cURL

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Task",
    "projectId": "project-uuid",
    "priority": "HIGH"
  }'
```

## Testing

### Unit Testing with OpenAPI Spec

Use the OpenAPI specification for contract testing:

```javascript
import { validateAgainstOpenAPI } from 'openapi-validator';

test('API response matches schema', async () => {
  const response = await api.get('/tasks/123');
  const errors = validateAgainstOpenAPI(response, 'openapi.yaml');
  expect(errors).toHaveLength(0);
});
```

### Integration Testing

```javascript
import { test, expect } from '@jest/globals';

test('Create and retrieve task', async () => {
  // Create task
  const createResponse = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Test Task',
      projectId: testProjectId
    })
  });

  expect(createResponse.status).toBe(201);
  const task = await createResponse.json();

  // Retrieve task
  const getResponse = await fetch(`/api/tasks/${task.id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  expect(getResponse.status).toBe(200);
  const retrievedTask = await getResponse.json();
  expect(retrievedTask.title).toBe('Test Task');
});
```

## Webhooks

GrandPlan supports webhooks for external integrations:

- `POST /api/webhooks/stripe` - Stripe payment webhooks
- `POST /api/webhooks/polar` - Polar payment webhooks

Webhooks use signature verification instead of Bearer tokens.

## API Versioning

Currently, GrandPlan API is version 1.0.0. Future versions will be documented here.

### Breaking Changes

Breaking changes will be communicated via:
1. Deprecation notices in API responses
2. Documentation updates
3. Migration guides

## Support & Resources

- **Swagger UI**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Quick Start**: [API_QUICK_START.md](./API_QUICK_START.md)
- **Complete Reference**: [API_REFERENCE.md](./API_REFERENCE.md)
- **OpenAPI Spec**: [openapi.yaml](./openapi.yaml)
- **Source Code**: `/apps/server/src`

## Contributing

When adding new API endpoints:

1. Update route files in `/apps/server/src/modules/*/api/routes.ts`
2. Add DTOs with Zod validation in `/apps/server/src/modules/*/api/dto/`
3. Update `openapi.yaml` with new endpoint definitions
4. Update `API_REFERENCE.md` with documentation
5. Add examples to `API_QUICK_START.md` if applicable
6. Test with Swagger UI

## License

See repository root for license information.

## Changelog

### Version 1.0.0 (2026-01-11)

- Initial API documentation release
- OpenAPI 3.1 specification
- Comprehensive API reference
- Interactive Swagger UI
- Quick start guide

---

**Ready to build?** Start with the [Quick Start Guide](./API_QUICK_START.md) or explore the [interactive docs](http://localhost:3001/api/docs)!
