/**
 * Templates - Page Layouts
 *
 * Templates are page-level objects that place components into a layout
 * and articulate the design's underlying content structure.
 *
 * Characteristics:
 * - Define the overall page structure and layout
 * - Compose organisms, molecules, and atoms into complete pages
 * - Handle page-level concerns (navigation, routing context, etc.)
 * - Focus on layout structure rather than content
 *
 * Examples: AppLayout, AuthLayout, DashboardLayout, SettingsLayout
 */

// Main application layout
export { AppLayout, ContentContainer } from "@/components/layout/app-layout";

// Type exports
export type { AppLayoutProps, ContentContainerProps } from "@/components/layout/app-layout";
