/**
 * Atoms - Basic Building Blocks
 *
 * Atoms are the smallest, most fundamental UI components that cannot be
 * broken down further without losing their meaning. They include basic
 * HTML elements like buttons, inputs, labels, and icons.
 *
 * Characteristics:
 * - Single responsibility
 * - No dependencies on other components (except primitives/utils)
 * - Highly reusable across the application
 * - Stateless or with minimal internal state
 *
 * Examples: Button, Input, Label, Checkbox, Switch, Badge, Avatar, Icon
 */

// Core input elements
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Checkbox } from "@/components/ui/checkbox";
export { Switch } from "@/components/ui/switch";
export { Label } from "@/components/ui/label";

// Interactive elements
export { Button, buttonVariants } from "@/components/ui/button";

// Display elements
export { Badge, badgeVariants } from "@/components/ui/badge";
export {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from "@/components/ui/avatar";
export { Skeleton } from "@/components/ui/skeleton";
export {
	Progress,
	ProgressIndicator,
	ProgressLabel,
	ProgressTrack,
	ProgressValue,
} from "@/components/ui/progress";
export { Separator } from "@/components/ui/separator";

// Layout primitives
export { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Loader component
export { default as Loader } from "@/components/loader";
