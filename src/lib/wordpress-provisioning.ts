/** @format */

import {
	Business,
	ProvisioningLogEntry,
	ProvisioningStepStatus,
	ProvisioningStatus,
	WebsiteSchema,
	WordPressProvisioningSite,
} from "../types";
import { WordPressProvisioningPlan } from "./wordpress";

export interface ProvisionWordPressSiteRequest {
	projectId: string;
	business: Business;
	websiteSchema: WebsiteSchema;
	provisioningPlan: WordPressProvisioningPlan;
}

export interface ProvisionWordPressSiteResponse {
	success: boolean;
	dryRun: boolean;
	message?: string;
	site?: WordPressProvisioningSite;
	provisioningStatus: ProvisioningStatus;
	subsiteCreationStatus: ProvisioningStepStatus;
	adminCreationStatus: ProvisioningStepStatus;
	themeInstallStatus: ProvisioningStepStatus;
	mediaImportStatus: ProvisioningStepStatus;
	contentImportStatus: ProvisioningStepStatus;
	homepageSetupStatus: ProvisioningStepStatus;
	credentialsStatus: ProvisioningStepStatus;
	logs: ProvisioningLogEntry[];
	error?: string;
	details?: string;
}

function logEntry(
	step: ProvisioningLogEntry["step"],
	level: ProvisioningLogEntry["level"],
	message: string,
): ProvisioningLogEntry {
	return {
		timestamp: new Date().toISOString(),
		step,
		level,
		message,
	};
}

function buildDryRunResponse(
	request: ProvisionWordPressSiteRequest,
	message: string,
): ProvisionWordPressSiteResponse {
	const siteSlug = request.provisioningPlan.siteSlug;
	const fallbackBase = process.env.WORDPRESS_MULTISITE_BASE_URL || "http://multisite.local";
	const siteUrl = `${fallbackBase.replace(/\/$/, "")}/${siteSlug}/`;
	return {
		success: true,
		dryRun: true,
		message,
		site: {
			siteId: siteSlug,
			siteSlug,
			siteUrl,
			adminUrl: `${siteUrl.replace(/\/$/, "")}/wp-admin/`,
			ownerUsername: request.provisioningPlan.ownerUsername,
			ownerEmail: request.provisioningPlan.ownerEmail,
		},
		provisioningStatus: "dry-run",
		subsiteCreationStatus: "dry-run",
		adminCreationStatus: "dry-run",
		themeInstallStatus: "dry-run",
		mediaImportStatus: "dry-run",
		contentImportStatus: "dry-run",
		homepageSetupStatus: "dry-run",
		credentialsStatus: "dry-run",
		logs: [
			logEntry("subsite_creation", "info", message),
			logEntry(
				"page_creation",
				"info",
				`Prepared ${request.provisioningPlan.pages.length} WordPress page payloads for ${siteSlug}.`,
			),
		],
	};
}

function getMultisiteConfig() {
	return {
		baseUrl:
			process.env.WORDPRESS_MULTISITE_BASE_URL ||
			process.env.WP_MULTISITE_BASE_URL ||
			"",
		username:
			process.env.WORDPRESS_MULTISITE_NETWORK_USERNAME ||
			process.env.WP_MULTISITE_NETWORK_USERNAME ||
			"",
		applicationPassword:
			process.env.WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD ||
			process.env.WP_MULTISITE_NETWORK_APP_PASSWORD ||
			"",
	};
}

export async function provisionWordPressMultisiteSite(
	request: ProvisionWordPressSiteRequest,
): Promise<ProvisionWordPressSiteResponse> {
	const config = getMultisiteConfig();
	if (!config.baseUrl || !config.username || !config.applicationPassword) {
		return buildDryRunResponse(
			request,
			"WordPress Multisite network credentials are not configured. Returning a provisioning dry-run.",
		);
	}

	const endpoint = `${config.baseUrl.replace(/\/$/, "")}/wp-json/digital-scout/v1/provision-site`;
	const authToken = Buffer.from(
		`${config.username}:${config.applicationPassword}`,
	).toString("base64");

	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Basic ${authToken}`,
		},
		body: JSON.stringify({
			projectId: request.projectId,
			business: request.business,
			websiteSchema: request.websiteSchema,
			provisioningPlan: request.provisioningPlan,
		}),
	});

	const text = await response.text().catch(() => "");
	let parsed: ProvisionWordPressSiteResponse | null = null;
	try {
		parsed = JSON.parse(text) as ProvisionWordPressSiteResponse;
	} catch {
		parsed = null;
	}

	if (!response.ok) {
		throw new Error(
			parsed?.error ||
				parsed?.details ||
				`WordPress Multisite provisioning failed: ${response.status} ${response.statusText}`,
		);
	}

	if (!parsed) {
		throw new Error("WordPress Multisite provisioning returned invalid JSON.");
	}

	return parsed;
}

export async function deleteProvisionedWordPressMultisiteSite(
	siteId: number | string,
): Promise<{ success: boolean; siteId: number | string }> {
	const config = getMultisiteConfig();
	if (!config.baseUrl || !config.username || !config.applicationPassword) {
		return { success: true, siteId };
	}

	const endpoint = `${config.baseUrl.replace(/\/$/, "")}/wp-json/digital-scout/v1/site/${siteId}`;
	const authToken = Buffer.from(
		`${config.username}:${config.applicationPassword}`,
	).toString("base64");

	const response = await fetch(endpoint, {
		method: "DELETE",
		headers: {
			Authorization: `Basic ${authToken}`,
		},
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(
			`Failed to delete WordPress Multisite site ${siteId}: ${response.status} ${response.statusText} ${text}`,
		);
	}

	return { success: true, siteId };
}
