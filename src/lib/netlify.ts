/** @format */

export interface NetlifyDeployResult {
	deployedUrl: string;
	siteId: string;
	deployId: string;
}

export async function deploySiteToNetlify(
	websiteContent: string,
	businessName: string,
): Promise<NetlifyDeployResult> {
	try {
		console.log(`Calling backend API at: /api/deploy`);

		const response = await fetch(`/api/deploy`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				websiteContent,
				businessName,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("Backend deployment error:", errorData);
			throw new Error(
				errorData.error || `Deployment failed: ${response.statusText}`,
			);
		}

		const data = await response.json();
		console.log("Deployment successful:", data);

		if (!data.deployedUrl || !data.siteId) {
			throw new Error("No deployment URL returned from server");
		}

		return {
			deployedUrl: data.deployedUrl,
			siteId: data.siteId,
			deployId: data.deployId || "",
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to deploy";
		console.error("Deployment error:", message);
		throw new Error(message);
	}
}

export async function deleteDeployedSite(siteId: string): Promise<void> {
	const response = await fetch(`/api/sites/${siteId}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to delete deployment: ${response.statusText}`,
		);
	}
}
