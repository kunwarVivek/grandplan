# Atomic Design Component Structure

This codebase follows the [Atomic Design](https://atomicdesign.bradfrost.com/) methodology for organizing UI components. Components are structured into four hierarchical levels, from the simplest building blocks to complete page layouts.

## Overview

```
src/components/
  atoms/           # Basic building blocks
  molecules/       # Simple combinations of atoms
  organisms/       # Complex UI sections
  templates/       # Page layouts
  ui/              # Raw UI primitives (backward compatibility)
  layout/          # Layout-specific components (backward compatibility)
```

## Hierarchy Levels

### 1. Atoms (`@/components/atoms`)

Atoms are the smallest, most fundamental UI building blocks that cannot be broken down further without losing their meaning.

**Characteristics:**
- Single responsibility
- No dependencies on other components (except primitives/utils)
- Highly reusable across the application
- Stateless or with minimal internal state

**Available Components:**

| Category | Components |
|----------|------------|
| Input Elements | `Input`, `Textarea`, `Checkbox`, `Switch`, `Label` |
| Interactive | `Button`, `buttonVariants` |
| Display | `Badge`, `badgeVariants`, `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`, `Skeleton` |
| Progress | `Progress`, `ProgressTrack`, `ProgressIndicator`, `ProgressLabel`, `ProgressValue` |
| Layout | `Separator`, `ScrollArea`, `ScrollBar` |
| Feedback | `Loader` |

**Example Usage:**
```typescript
import { Button, Input, Badge, Avatar } from "@/components/atoms";

function UserCard() {
  return (
    <div>
      <Avatar>
        <AvatarImage src="/avatar.jpg" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Badge variant="secondary">Active</Badge>
      <Input placeholder="Enter name..." />
      <Button>Save</Button>
    </div>
  );
}
```

---

### 2. Molecules (`@/components/molecules`)

Molecules are relatively simple groups of UI elements functioning together as a unit. They combine atoms to form more complex, reusable components.

**Characteristics:**
- Combine 2+ atoms into a functional unit
- Have a single, clear purpose
- May have internal state for simple interactions
- Reusable across different contexts

**Available Components:**

| Category | Components |
|----------|------------|
| Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| Form | `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `FormFieldWrapper`, `useFormItemContext` |
| Input Groups | `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupInput`, `InputGroupText`, `InputGroupTextarea` |
| Feedback | `Alert`, `AlertTitle`, `AlertDescription`, `AlertAction`, `Toaster` |
| Overlays | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`, `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription` |
| Navigation | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants` |

**Example Usage:**
```typescript
import { Card, CardHeader, CardTitle, CardContent, FormItem, FormLabel, Tooltip, TooltipTrigger, TooltipContent } from "@/components/molecules";
import { Button, Input } from "@/components/atoms";

function ProfileCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <FormItem>
          <FormLabel>Display Name</FormLabel>
          <Input />
        </FormItem>
        <Tooltip>
          <TooltipTrigger>
            <Button>Save</Button>
          </TooltipTrigger>
          <TooltipContent>Save your changes</TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
```

---

### 3. Organisms (`@/components/organisms`)

Organisms are relatively complex UI components composed of groups of molecules and/or atoms. They form distinct sections of an interface.

**Characteristics:**
- Combine molecules and atoms into larger functional units
- May have significant internal state and logic
- Often tied to specific features or domains
- Self-contained with clear boundaries

**Available Components:**

| Category | Components |
|----------|------------|
| Dialog | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogOverlay`, `DialogPortal` |
| Alert Dialog | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogMedia`, `AlertDialogOverlay`, `AlertDialogPortal` |
| Sheet | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose` |
| Dropdown | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuRadioGroup` |
| Context Menu | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuRadioGroup` |
| Select | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` |
| Command | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator` |
| Table | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` |
| Navigation | `Sidebar`, `MobileSidebarTrigger`, `SidebarItem`, `SidebarSection`, `Breadcrumb`, `PageHeader` |
| Features | `CommandPalette`, `ThemeToggle`, `UserMenu`, `Header`, `SignInForm`, `SignUpForm` |

**Example Usage:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/organisms";
import { Button } from "@/components/atoms";

function TaskActions() {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button>Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

### 4. Templates (`@/components/templates`)

Templates are page-level objects that place components into a layout and articulate the design's underlying content structure.

**Characteristics:**
- Define the overall page structure and layout
- Compose organisms, molecules, and atoms into complete pages
- Handle page-level concerns (navigation, routing context, etc.)
- Focus on layout structure rather than content

**Available Components:**

| Category | Components |
|----------|------------|
| Layouts | `AppLayout`, `ContentContainer` |

**Example Usage:**
```typescript
import { AppLayout, ContentContainer } from "@/components/templates";
import { PageHeader, Breadcrumb } from "@/components/organisms";

function DashboardPage() {
  return (
    <AppLayout
      headerLeft={<Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />}
    >
      <ContentContainer maxWidth="xl" padding="md">
        {/* Page content */}
      </ContentContainer>
    </AppLayout>
  );
}
```

---

## Import Patterns

### Preferred: Import by Atomic Level

```typescript
import { Button, Input, Badge } from "@/components/atoms";
import { Card, CardHeader, Tooltip } from "@/components/molecules";
import { Dialog, DialogContent, Sidebar } from "@/components/organisms";
import { AppLayout } from "@/components/templates";
```

### Legacy: Direct UI Imports (Backward Compatible)

The legacy import pattern is still supported for backward compatibility:

```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
```

**Note:** New code should prefer atomic imports. Legacy imports will be gradually migrated.

---

## Feature Components

Feature-specific components live in their respective feature directories and are considered domain-specific organisms:

```
src/features/
  tasks/components/      # Task-related components
  projects/components/   # Project-related components
  billing/components/    # Billing-related components
  organizations/components/
  workspaces/components/
  teams/components/
  admin/components/
  ai/components/
  notifications/components/
  integrations/components/
  realtime/components/
  whitelabel/components/
```

Feature components should import from the atomic design layers:

```typescript
// In src/features/tasks/components/task-card.tsx
import { Badge, Avatar } from "@/components/atoms";
import { Card, CardHeader, CardContent } from "@/components/molecules";
import { DropdownMenu, DropdownMenuContent } from "@/components/organisms";
```

---

## Best Practices

1. **Start Simple**: When creating new components, start at the lowest possible level
2. **Composition Over Inheritance**: Build complex components by composing simpler ones
3. **Single Responsibility**: Each component should do one thing well
4. **Consistent Naming**: Use clear, descriptive names that indicate the component's purpose
5. **Document Props**: Use TypeScript interfaces and JSDoc comments for prop documentation
6. **Test at Each Level**: Unit test atoms, integration test molecules/organisms

---

## Migration Guide

When migrating existing imports to the atomic pattern:

1. Identify which atomic level the component belongs to
2. Update the import path to use the atomic index
3. Test that the component renders correctly
4. Update any type imports if needed

**Before:**
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
```

**After:**
```typescript
import { Button } from "@/components/atoms";
import { Card, CardHeader } from "@/components/molecules";
```
