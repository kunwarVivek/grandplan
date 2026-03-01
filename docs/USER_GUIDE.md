# GrandPlan - User Guide

## What is GrandPlan?

GrandPlan is an AI-native enterprise task management platform that helps teams break down complex projects into manageable tasks, track progress in real-time, and integrate with your existing tools.

---

## Getting Started

### Quick Start

1. **Sign Up** - Create your organization at `http://localhost:3001`
2. **Create a Workspace** - Organize by department or project category
3. **Add Team Members** - Invite colleagues to your workspace
4. **Create Projects** - Start with a project for each initiative

---

## Core Concepts

### Workspace
The top-level container for your team. Contains multiple projects and team members.

### Project
A collection of related tasks. Projects live inside workspaces.

### Task
The fundamental unit of work. Tasks can be:
- **Parent tasks** - High-level goals that decompose into subtasks
- **Subtasks** - Child tasks that roll up to parent tasks

### Dependencies
Link tasks to show blocking relationships:
- **Blocks** - This task must complete before others can start
- **Blocked by** - This task cannot start until dependencies complete
- **Related** - Contextual connection between tasks

---

## Task Lifecycle

```
DRAFT → TODO → IN_PROGRESS → IN_REVIEW → COMPLETED
                              ↓
                           BLOCKED
                              ↓
                           CANCELLED
```

| Status | Description |
|--------|-------------|
| Draft | Newly created, not yet planned |
| Todo | Ready to work on |
| In Progress | Actively being worked on |
| In Review | Awaiting approval |
| Completed | Done |
| Blocked | Waiting on dependencies |
| Cancelled | Archived/abandoned |

---

## Features

### Task Views

- **Kanban Board** - Drag-and-drop status changes
- **List View** - Table view with sorting/filtering
- **Timeline** - Gantt chart visualization
- **Tree View** - Hierarchical decomposition

### Bulk Operations

Select multiple tasks to:
- **Delete** - Remove tasks permanently
- **Archive** - Cancel/archive tasks
- **Change Status** - Update status for all selected

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Task | `N` |
| Search | `/` |
| Filter | `F` |
| Save | `Ctrl+S` |

---

## Integrations

### Slack
Connect your Slack workspace to receive task notifications in channels.

### Microsoft Teams
Team notifications via Teams webhooks.

### Linear
Two-way sync with Linear projects.

---

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| Owner | Full access, billing, delete org |
| Admin | Manage members, projects, settings |
| Member | Create/edit tasks, comment |
| Viewer | Read-only access |

---

## Support

For issues or questions:
- Check the API docs at `/api/docs`
- Review server logs for errors
- Contact your organization admin
