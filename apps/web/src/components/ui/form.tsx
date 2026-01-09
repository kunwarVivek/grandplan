"use client";

import type * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";

// biome-ignore lint/suspicious/noExplicitAny: TanStack Form FieldApi has 23+ type parameters
type AnyFieldApi = {
	state: {
		value: unknown;
		meta: {
			errors: Array<{ message?: string } | string | undefined>;
		};
	};
	name: string;
	handleBlur: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: Updater can be value or function
	handleChange: (updater: any) => void;
};

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * TanStack Form compatible wrapper components
 * Provides consistent styling and accessibility for form fields
 */

type FormItemContextValue = {
	id: string;
	hasError: boolean;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

function useFormItemContext() {
	const context = React.useContext(FormItemContext);
	if (!context) {
		throw new Error("Form components must be used within FormItem");
	}
	return context;
}

type FormItemProps = React.HTMLAttributes<HTMLDivElement> & {
	hasError?: boolean;
};

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
	({ className, hasError = false, ...props }, ref) => {
		const id = React.useId();

		return (
			<FormItemContext.Provider value={{ id, hasError }}>
				<div ref={ref} className={cn("space-y-2", className)} {...props} />
			</FormItemContext.Provider>
		);
	},
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
	React.ElementRef<typeof LabelPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
	const { id, hasError } = useFormItemContext();

	return (
		<Label
			ref={ref}
			className={cn(hasError && "text-destructive", className)}
			htmlFor={`${id}-form-item`}
			{...props}
		/>
	);
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
	const { id, hasError } = useFormItemContext();

	return (
		<Slot
			ref={ref}
			id={`${id}-form-item`}
			aria-describedby={`${id}-form-item-description ${id}-form-item-message`}
			aria-invalid={hasError}
			{...props}
		/>
	);
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
	const { id } = useFormItemContext();

	return (
		<p
			ref={ref}
			id={`${id}-form-item-description`}
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
});
FormDescription.displayName = "FormDescription";

type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement> & {
	errors?: Array<{ message?: string } | string | undefined>;
};

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
	({ className, children, errors, ...props }, ref) => {
		const { id } = useFormItemContext();

		// Get first error message
		const errorMessage = errors
			?.map((e) => (typeof e === "string" ? e : e?.message))
			.filter(Boolean)[0];

		const body = errorMessage ?? children;

		if (!body) {
			return null;
		}

		return (
			<p
				ref={ref}
				id={`${id}-form-item-message`}
				className={cn("font-medium text-destructive text-sm", className)}
				{...props}
			>
				{body}
			</p>
		);
	},
);
FormMessage.displayName = "FormMessage";

/**
 * Helper component for rendering a complete form field with TanStack Form
 * Combines FormItem, FormLabel, FormControl, and FormMessage
 */
type FormFieldWrapperProps = {
	field: AnyFieldApi;
	label?: string;
	description?: string;
	className?: string;
	children: React.ReactNode;
};

function FormFieldWrapper({
	field,
	label,
	description,
	className,
	children,
}: FormFieldWrapperProps) {
	const hasError = field.state.meta.errors.length > 0;

	return (
		<FormItem hasError={hasError} className={className}>
			{label && <FormLabel>{label}</FormLabel>}
			<FormControl>{children}</FormControl>
			{description && <FormDescription>{description}</FormDescription>}
			<FormMessage errors={field.state.meta.errors} />
		</FormItem>
	);
}

export {
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
	FormFieldWrapper,
	useFormItemContext,
};
