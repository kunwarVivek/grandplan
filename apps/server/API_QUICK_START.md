# GrandPlan API Quick Start Guide

Get started with the GrandPlan API in minutes.

## Documentation Resources

1. **Interactive Swagger UI**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
   - Try API endpoints directly from your browser
   - See request/response examples
   - Test authentication

2. **Comprehensive API Reference**: `API_REFERENCE.md`
   - Complete endpoint documentation
   - Request/response examples
   - Error handling guides

3. **OpenAPI Specification**: `openapi.yaml`
   - Import into Postman, Insomnia, or other API clients
   - Generate SDKs for multiple languages
   - Use for contract testing

## Quick Authentication

### 1. Get an Authentication Token

GrandPlan uses Better Auth for authentication. First, authenticate via the web interface or authentication endpoints:

```bash
# Example: Sign in with email/password
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

The response will include a session token that you'll use for subsequent requests.

### 2. Use the Token in API Requests

Include the token in the `Authorization` header:

```bash
Authorization: Bearer <your-token>
```

## Common API Operations

### List Organizations

```bash
curl -X GET http://localhost:3001/api/organizations \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json"
```

### Create a Project

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My New Project",
    "description": "Project description",
    "workspaceId": "workspace-uuid"
  }'
```

### Create a Task

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X",
    "description": "Detailed description",
    "projectId": "project-uuid",
    "priority": "HIGH",
    "status": "PENDING"
  }'
```

### Update Task Status

```bash
curl -X PATCH http://localhost:3001/api/tasks/<task-id> \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

### Get AI Suggestions

```bash
curl -X POST http://localhost:3001/api/ai/suggest/<task-id> \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json"
```

### Upload a File

```bash
curl -X POST http://localhost:3001/api/uploads \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@avatar.jpg" \
  -F "type=avatar"
```

## API Response Format

### Success Response

```json
{
  "id": "uuid",
  "name": "Resource Name",
  "createdAt": "2026-01-11T10:30:00Z",
  "updatedAt": "2026-01-11T10:30:00Z"
}
```

### Error Response

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "name",
    "error": "Name is required"
  }
}
```

## Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 204 | No Content | Delete operation successful |
| 400 | Bad Request | Check request body and parameters |
| 401 | Unauthorized | Provide valid authentication token |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Verify resource ID exists |
| 429 | Too Many Requests | Wait before retrying (rate limit) |
| 500 | Internal Server Error | Contact support |

## Pagination

List endpoints support pagination:

```bash
curl -X GET "http://localhost:3001/api/tasks?limit=20&offset=0" \
  -H "Authorization: Bearer <your-token>"
```

**Parameters**:
- `limit`: Max items to return (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

## Filtering

Many endpoints support filtering:

```bash
# Filter tasks by status
curl -X GET "http://localhost:3001/api/tasks?status=IN_PROGRESS" \
  -H "Authorization: Bearer <your-token>"

# Filter tasks by assignee
curl -X GET "http://localhost:3001/api/tasks?assigneeId=user-uuid" \
  -H "Authorization: Bearer <your-token>"

# Combine filters
curl -X GET "http://localhost:3001/api/tasks?status=IN_PROGRESS&priority=HIGH" \
  -H "Authorization: Bearer <your-token>"
```

## Rate Limiting

### Standard Endpoints
- Most API endpoints: Standard rate limit per IP
- Check `X-RateLimit-*` headers in responses

### AI Endpoints
- Lower rate limits due to computational cost
- Use `/api/ai/jobs/:jobId` to check job status
- Jobs are queued and processed asynchronously

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## WebSocket / Real-time

GrandPlan includes real-time features via Socket.io:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-auth-token'
  }
});

// Subscribe to task updates
socket.on('task:updated', (data) => {
  console.log('Task updated:', data);
});

// Subscribe to organization events
socket.emit('join:organization', { organizationId: 'uuid' });
```

## Permissions

GrandPlan uses RBAC (Role-Based Access Control). Each endpoint requires specific permissions:

### Common Permission Patterns

| Resource | Read | Create | Update | Delete | Special |
|----------|------|--------|--------|--------|---------|
| Organization | `organization:read` | `organization:create` | `organization:update` | `organization:delete` | `organization:manage_members` |
| Project | `project:read` | `project:create` | `project:update` | `project:delete` | - |
| Task | `task:read` | `task:create` | `task:update` | `task:delete` | `tasks:ai` |
| Team | `team:read` | `team:create` | `team:update` | `team:delete` | `team:manage_members` |

Check API Reference for specific permissions required by each endpoint.

## Environment Variables

For local development, ensure these environment variables are set:

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000

# Authentication
# (See Better Auth docs for auth-specific variables)
```

## Testing with Postman

1. Import `openapi.yaml` into Postman
2. Create environment with variables:
   - `baseUrl`: `http://localhost:3001`
   - `token`: `<your-auth-token>`
3. Use `{{baseUrl}}` and `{{token}}` in requests

## Testing with Insomnia

1. Import `openapi.yaml` into Insomnia
2. Set base URL to `http://localhost:3001`
3. Configure Bearer token authentication

## SDK Generation

Generate SDKs from the OpenAPI specification:

### TypeScript/JavaScript
```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated/sdk
```

### Python
```bash
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./generated/python-sdk
```

### Go
```bash
openapi-generator-cli generate \
  -i openapi.yaml \
  -g go \
  -o ./generated/go-sdk
```

## Common Workflows

### Complete Task Workflow

1. Create project
2. Create tasks in project
3. Add task dependencies
4. Assign tasks to users
5. Add comments to tasks
6. Update task status
7. Track task history

```bash
# 1. Create project
PROJECT_ID=$(curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Project","workspaceId":"'$WORKSPACE_ID'"}' \
  | jq -r '.id')

# 2. Create task
TASK_ID=$(curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Task","projectId":"'$PROJECT_ID'"}' \
  | jq -r '.id')

# 3. Update task status
curl -X PATCH http://localhost:3001/api/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# 4. Add comment
curl -X POST http://localhost:3001/api/tasks/$TASK_ID/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Working on this now"}'
```

### AI-Assisted Task Breakdown

1. Create an epic task
2. Request AI decomposition
3. Check job status
4. Review AI suggestions
5. Apply or reject suggestions

```bash
# 1. Create epic
EPIC_ID=$(curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Build User Dashboard","projectId":"'$PROJECT_ID'","nodeType":"EPIC"}' \
  | jq -r '.id')

# 2. Request AI decomposition
JOB_ID=$(curl -X POST http://localhost:3001/api/ai/decompose/$EPIC_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.jobId')

# 3. Check job status
curl -X GET http://localhost:3001/api/ai/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"

# 4. Get AI decisions
curl -X GET http://localhost:3001/api/ai/decisions/$EPIC_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### 401 Unauthorized
- Verify token is valid and not expired
- Check Authorization header format: `Bearer <token>`
- Re-authenticate if session expired

### 403 Forbidden
- Verify user has required permissions
- Check organization context is correct
- Contact admin to adjust permissions

### 404 Not Found
- Verify resource ID is correct
- Check if resource was deleted
- Ensure you have access to the organization/workspace

### 429 Too Many Requests
- Wait before retrying (check `X-RateLimit-Reset` header)
- Implement exponential backoff
- Consider upgrading plan for higher limits

### 500 Internal Server Error
- Check server logs
- Verify all dependencies (database, Redis) are running
- Contact support if error persists

## Support & Resources

- **Swagger UI**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **API Reference**: See `API_REFERENCE.md`
- **OpenAPI Spec**: See `openapi.yaml`
- **Server Source**: `/apps/server/src`

## Next Steps

1. Explore the interactive Swagger UI at `/api/docs`
2. Read the complete API Reference in `API_REFERENCE.md`
3. Import `openapi.yaml` into your favorite API client
4. Start building your integration!
