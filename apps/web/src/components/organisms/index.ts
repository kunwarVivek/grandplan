/**
 * Organisms - Complex UI Sections
 *
 * Organisms are relatively complex UI components composed of groups of
 * molecules and/or atoms. They form distinct sections of an interface.
 *
 * Characteristics:
 * - Combine molecules and atoms into larger functional units
 * - May have significant internal state and logic
 * - Often tied to specific features or domains
 * - Self-contained with clear boundaries
 *
 * Examples: Header, Sidebar, DataTable, Dialog, Form, NavigationMenu
 */

// Modal/Dialog components
export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

// Menu components
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuPortal,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Selection components
export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Command/Search palette
export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";

// Data display
export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

// Navigation components
export { Sidebar, MobileSidebarTrigger } from "@/components/layout/sidebar";
export { SidebarItem, SidebarSection } from "@/components/layout/sidebar-item";
export { Breadcrumb } from "@/components/layout/breadcrumb";
export { PageHeader } from "@/components/layout/page-header";

// Feature organisms
export { CommandPalette } from "@/components/command-palette";
export { ThemeToggle } from "@/components/theme-toggle";
export { default as UserMenu } from "@/components/user-menu";
export { default as Header } from "@/components/header";
export { default as SignInForm } from "@/components/sign-in-form";
export { default as SignUpForm } from "@/components/sign-up-form";

// Type exports
export type { SidebarProps } from "@/components/layout/sidebar";
export type { SidebarItemProps, SidebarSectionProps } from "@/components/layout/sidebar-item";
export type { BreadcrumbItem, BreadcrumbProps } from "@/components/layout/breadcrumb";
export type { PageHeaderProps } from "@/components/layout/page-header";
