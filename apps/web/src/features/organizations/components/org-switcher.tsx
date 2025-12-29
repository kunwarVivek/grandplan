import { Building2, Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "../hooks/use-organizations";
import type { Organization } from "../types";

type OrgSwitcherProps = {
	currentOrgId?: string;
	onOrgChange?: (org: Organization) => void;
	onCreateOrg?: () => void;
	onOrgSettings?: (org: Organization) => void;
};

export function OrgSwitcher({
	currentOrgId,
	onOrgChange,
	onCreateOrg,
	onOrgSettings,
}: OrgSwitcherProps) {
	const [open, setOpen] = useState(false);
	const { data, isLoading } = useOrganizations();

	const organizations = data?.organizations ?? [];
	const currentOrg = organizations.find((org) => org.id === currentOrgId);

	if (isLoading) {
		return (
			<div className="flex items-center gap-2">
				<Skeleton className="size-8" />
				<Skeleton className="h-4 w-24" />
			</div>
		);
	}

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						className="w-full justify-between gap-2 px-2"
					/>
				}
			>
				<div className="flex items-center gap-2">
					{currentOrg?.logo ? (
						<Avatar className="size-6">
							<img src={currentOrg.logo} alt={currentOrg.name} />
						</Avatar>
					) : (
						<div className="flex size-6 items-center justify-center bg-muted">
							<Building2 className="size-3.5" />
						</div>
					)}
					<span className="truncate font-medium text-sm">
						{currentOrg?.name ?? "Select organization"}
					</span>
				</div>
				<ChevronsUpDown className="size-4 shrink-0 opacity-50" />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuLabel>Organizations</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{organizations.map((org) => (
					<DropdownMenuItem
						key={org.id}
						onSelect={() => {
							onOrgChange?.(org);
							setOpen(false);
						}}
					>
						<div className="flex items-center gap-2">
							{org.logo ? (
								<Avatar className="size-5">
									<img src={org.logo} alt={org.name} />
								</Avatar>
							) : (
								<div className="flex size-5 items-center justify-center bg-muted">
									<Building2 className="size-3" />
								</div>
							)}
							<span className="truncate">{org.name}</span>
						</div>
						{org.id === currentOrgId && <Check className="ml-auto size-4" />}
					</DropdownMenuItem>
				))}

				{organizations.length === 0 && (
					<div className="px-2 py-4 text-center text-muted-foreground text-xs">
						No organizations found
					</div>
				)}

				<DropdownMenuSeparator />

				{currentOrg && onOrgSettings && (
					<DropdownMenuItem
						onSelect={() => {
							onOrgSettings(currentOrg);
							setOpen(false);
						}}
					>
						<Settings className="size-4" />
						Organization settings
					</DropdownMenuItem>
				)}

				{onCreateOrg && (
					<DropdownMenuItem
						onSelect={() => {
							onCreateOrg();
							setOpen(false);
						}}
					>
						<Plus className="size-4" />
						Create organization
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
