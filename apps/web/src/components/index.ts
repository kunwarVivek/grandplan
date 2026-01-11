/**
 * Components Index - Atomic Design System
 *
 * This codebase follows the Atomic Design methodology for organizing UI components.
 * Components are structured into four hierarchical levels:
 *
 * ## Atomic Design Hierarchy
 *
 * ### 1. Atoms (`@/components/atoms`)
 * The smallest, most fundamental UI building blocks that cannot be broken down
 * further without losing their meaning.
 *
 * - **Input Elements**: Input, Textarea, Checkbox, Switch, Label
 * - **Interactive**: Button
 * - **Display**: Badge, Avatar, Skeleton, Progress, Separator
 * - **Layout**: ScrollArea
 * - **Feedback**: Loader
 *
 * ### 2. Molecules (`@/components/molecules`)
 * Simple combinations of atoms that function together as a unit.
 *
 * - **Containers**: Card, Alert
 * - **Form Elements**: FormItem, FormLabel, FormControl, FormMessage, InputGroup
 * - **Overlays**: Tooltip, Popover
 * - **Navigation**: Tabs
 * - **Notifications**: Toaster
 *
 * ### 3. Organisms (`@/components/organisms`)
 * Complex UI components composed of molecules and atoms, forming
 * distinct sections of an interface.
 *
 * - **Modals**: Dialog, AlertDialog, Sheet
 * - **Menus**: DropdownMenu, ContextMenu, Select
 * - **Command**: Command, CommandPalette
 * - **Data Display**: Table
 * - **Navigation**: Sidebar, Breadcrumb, PageHeader
 * - **Features**: UserMenu, ThemeToggle, Header, SignInForm, SignUpForm
 *
 * ### 4. Templates (`@/components/templates`)
 * Page-level layouts that place components into a structure.
 *
 * - **Layouts**: AppLayout, ContentContainer
 *
 * ## Import Patterns
 *
 * Preferred import by atomic level:
 * ```typescript
 * import { Button, Input, Badge } from "@/components/atoms";
 * import { Card, FormItem, Tooltip } from "@/components/molecules";
 * import { Dialog, Sidebar, CommandPalette } from "@/components/organisms";
 * import { AppLayout } from "@/components/templates";
 * ```
 *
 * Legacy imports from `@/components/ui/*` are still supported for backward
 * compatibility but should be migrated to atomic imports over time.
 *
 * ## Feature Components
 *
 * Feature-specific components live in their respective feature directories:
 * - `@/features/tasks/components/*`
 * - `@/features/projects/components/*`
 * - `@/features/billing/components/*`
 * - etc.
 *
 * These are considered domain-specific organisms and should import from
 * the atomic design layers above.
 */

// Re-export all atomic levels
export * from "./atoms";
export * from "./molecules";
export * from "./organisms";
export * from "./templates";

// Legacy layout exports (for backward compatibility)
export * from "./layout";
