/** @format */

import {
	Business,
	ProvisioningLogEntry,
	ProvisioningStepStatus,
	ProvisioningStatus,
	WebsiteSchema,
	WordPressProvisioningSite,
} from "../types";
import { buildWordPressProvisioningPlan } from "./wordpress";

export interface WordPressProvisionSiteRequest {
	projectId: string;
	business: Business;
	websiteSchema: WebsiteSchema;
	ownerEmail?: string;
	ownerUsername?: string;
}

export interface WordPressProvisionSiteResult {
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

export async function provisionWordPressSite(
	request: WordPressProvisionSiteRequest,
): Promise<WordPressProvisionSiteResult> {
	const plan = buildWordPressProvisioningPlan(
		request.websiteSchema,
		request.business,
		{
			ownerEmail: request.ownerEmail,
			ownerUsername: request.ownerUsername,
		},
	);

	const response = await fetch(`/api/wordpress/provision-site`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			projectId: request.projectId,
			business: request.business,
			websiteSchema: request.websiteSchema,
			provisioningPlan: plan,
		}),
	});

	const text = await response.text().catch(() => "");
	let parsed: WordPressProvisionSiteResult | null = null;
	try {
		parsed = JSON.parse(text) as WordPressProvisionSiteResult;
	} catch {
		parsed = null;
	}

	if (!response.ok) {
		throw new Error(
			parsed?.error ||
				parsed?.details ||
				`WordPress provisioning failed: ${response.status} ${response.statusText}`,
		);
	}

	if (!parsed) {
		throw new Error("WordPress provisioning returned invalid JSON.");
	}

	return parsed;
}

export async function deleteProvisionedWordPressSite(
	siteId: number | string,
): Promise<void> {
	const response = await fetch(`/api/wordpress/site/${siteId}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		throw new Error(
			payload.error || `Failed to delete provisioned site ${siteId}.`,
		);
	}
}
