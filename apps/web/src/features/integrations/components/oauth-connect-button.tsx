import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useStartOAuth, useConnectIntegration } from "../hooks/use-integrations";
import { INTEGRATION_PROVIDER_CONFIG, type IntegrationProvider } from "../types";

type OAuthConnectButtonProps = {
	provider: IntegrationProvider;
	onSuccess?: (connectionId: string) => void;
	onError?: (error: Error) => void;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
};

export function OAuthConnectButton({
	provider,
	onSuccess,
	onError,
	variant = "default",
	size = "sm",
	className,
}: OAuthConnectButtonProps) {
	const [isConnecting, setIsConnecting] = useState(false);
	const startOAuth = useStartOAuth();
	const connectIntegration = useConnectIntegration();

	const providerConfig = INTEGRATION_PROVIDER_CONFIG[provider];

	// Handle OAuth callback from popup
	useEffect(() => {
		const handleMessage = async (event: MessageEvent) => {
			// Verify origin
			if (event.origin !== window.location.origin) return;

			const { type, provider: msgProvider, code, error } = event.data ?? {};

			if (type !== "oauth-callback" || msgProvider !== provider) return;

			if (error) {
				setIsConnecting(false);
				const err = new Error(error);
				onError?.(err);
				toast.error(`Failed to connect ${providerConfig.label}: ${error}`);
				return;
			}

			if (code) {
				try {
					const connection = await connectIntegration.mutateAsync({
						provider,
						code,
					});
					setIsConnecting(false);
					onSuccess?.(connection.id);
					toast.success(`${providerConfig.label} connected successfully`);
				} catch (err) {
					setIsConnecting(false);
					const error = err instanceof Error ? err : new Error("Connection failed");
					onError?.(error);
					toast.error(`Failed to connect ${providerConfig.label}`);
				}
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [provider, providerConfig.label, connectIntegration, onSuccess, onError]);

	const handleConnect = async () => {
		setIsConnecting(true);

		try {
			const { authUrl } = await startOAuth.mutateAsync({ provider });

			// Open OAuth popup
			const width = 600;
			const height = 700;
			const left = window.screenX + (window.outerWidth - width) / 2;
			const top = window.screenY + (window.outerHeight - height) / 2;

			const popup = window.open(
				authUrl,
				`oauth-${provider}`,
				`width=${width},height=${height},left=${left},top=${top},popup=yes`
			);

			if (!popup) {
				setIsConnecting(false);
				toast.error("Please allow popups to connect integrations");
				return;
			}

			// Poll to detect popup close
			const pollTimer = setInterval(() => {
				if (popup.closed) {
					clearInterval(pollTimer);
					// If still connecting when popup closes, user cancelled
					setIsConnecting(false);
				}
			}, 500);
		} catch (err) {
			setIsConnecting(false);
			const error = err instanceof Error ? err : new Error("Failed to start OAuth");
			onError?.(error);
			toast.error(`Failed to connect ${providerConfig.label}`);
		}
	};

	return (
		<Button
			variant={variant}
			size={size}
			onClick={handleConnect}
			disabled={isConnecting}
			className={className}
		>
			{isConnecting ? (
				<>
					<Loader2 className="size-4 animate-spin" data-icon="inline-start" />
					Connecting...
				</>
			) : (
				<>
					<ExternalLink className="size-4" data-icon="inline-start" />
					Connect
				</>
			)}
		</Button>
	);
}
