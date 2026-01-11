/**
 * Molecules - Simple Combinations of Atoms
 *
 * Molecules are relatively simple groups of UI elements functioning together
 * as a unit. They combine atoms to form more complex, reusable components.
 *
 * Characteristics:
 * - Combine 2+ atoms into a functional unit
 * - Have a single, clear purpose
 * - May have internal state for simple interactions
 * - Reusable across different contexts
 *
 * Examples: FormField, Card, InputGroup, Tooltip, Popover, Alert, Tabs
 */

// Card components
export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

// Form molecules
export {
	FormControl,
	FormDescription,
	FormFieldWrapper,
	FormItem,
	FormLabel,
	FormMessage,
	useFormItemContext,
} from "@/components/ui/form";

// Input combinations
export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "@/components/ui/input-group";

// Feedback components
export {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/ui/alert";

// Overlay triggers
export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
export {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";

// Tab navigation
export {
	Tabs,
	TabsContent,
	TabsList,
	tabsListVariants,
	TabsTrigger,
} from "@/components/ui/tabs";

// Toast notifications
export { Toaster } from "@/components/ui/sonner";
