/** @format */

/**
 * CallHippo Integration Service
 * Minimal PoC for sending outreach via WhatsApp with SMS fallback
 */

export interface OutreachRequest {
	businessName: string;
	phoneNumber: string;
	message: string;
	preferredChannel: "whatsapp" | "sms";
}

export interface OutreachResponse {
	success: boolean;
	channel: "whatsapp" | "sms";
	messageId?: string;
	status?: string;
	error?: string;
}

/**
 * CallHippo outreach service (backend handler)
 * This runs on the Express server
 */
export async function sendOutreachViaCallHippo(
	request: OutreachRequest,
	apiKey: string,
): Promise<OutreachResponse> {
	const { businessName, phoneNumber, message, preferredChannel } = request;

	// Test mock override: when CALLHIPPO_TEST_MOCK=true in .env, short-circuit
	// and treat all sends as successful to the configured test target.
	const TEST_MOCK = process.env.CALLHIPPO_TEST_MOCK === "true";
	const TEST_TARGET = process.env.CALLHIPPO_TEST_TARGET;
	const FORCE_SUCCESS = process.env.CALLHIPPO_FORCE_SUCCESS === "true";
	if (TEST_MOCK) {
		const target = TEST_TARGET || phoneNumber;
		console.log(
			`[CallHippo][MOCK] Pretending to send ${preferredChannel} to ${target} for ${businessName}`,
		);
		return {
			success: true,
			channel: preferredChannel,
			messageId: `mock-${Date.now()}`,
			status: "mocked",
		};
	}

	console.log(
		`[CallHippo] Outreach request for ${businessName} (${phoneNumber}) via ${preferredChannel}`,
	);

	// Try WhatsApp first if preferred
	if (preferredChannel === "whatsapp") {
		try {
			const result = await sendWhatsAppMessage(phoneNumber, message, apiKey);
			if (result.success) {
				console.log(`[CallHippo] WhatsApp sent successfully to ${phoneNumber}`);
				return result;
			}
		} catch (whatsappError) {
			console.warn(
				`[CallHippo] WhatsApp failed for ${phoneNumber}, falling back to SMS:`,
				whatsappError instanceof Error ? whatsappError.message : whatsappError,
			);
		}
	}

	// Fallback to SMS
	try {
		const result = await sendSmsMessage(phoneNumber, message, apiKey);
		if (result.success) {
			console.log(`[CallHippo] SMS sent successfully to ${phoneNumber}`);
			return result;
		}
		if (FORCE_SUCCESS) {
			console.warn(
				`[CallHippo][FORCE_SUCCESS] Returning demo success for ${phoneNumber}`,
			);
			return {
				success: true,
				channel: preferredChannel,
				messageId: `forced-${Date.now()}`,
				status: "forced-success",
			};
		}
		return result;
	} catch (smsError) {
		const errorMsg =
			smsError instanceof Error ? smsError.message : String(smsError);
		console.error(`[CallHippo] SMS also failed for ${phoneNumber}:`, errorMsg);
		if (FORCE_SUCCESS) {
			console.warn(
				`[CallHippo][FORCE_SUCCESS] API failed, returning demo success for ${phoneNumber}`,
			);
			return {
				success: true,
				channel: preferredChannel,
				messageId: `forced-${Date.now()}`,
				status: "forced-success",
			};
		}
		return {
			success: false,
			channel: "sms",
			error: `SMS delivery failed: ${errorMsg}`,
		};
	}
}

/**
 * Send WhatsApp message via CallHippo API
 */
async function sendWhatsAppMessage(
	phoneNumber: string,
	message: string,
	apiKey: string,
): Promise<OutreachResponse> {
	const formattedPhone = formatPhoneNumber(phoneNumber);

	// CallHippo WhatsApp endpoint
	const url = "https://api.callhippo.com/v1/whatsapp/send";

	const payload = {
		to: formattedPhone,
		message: message,
	};

	console.log(`[CallHippo] Attempting WhatsApp to ${formattedPhone}`);

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.warn(
				`[CallHippo] WhatsApp API returned ${response.status}:`,
				errorText,
			);

			// If WhatsApp is not available (4xx), return failed but allow SMS fallback
			if (response.status >= 400 && response.status < 500) {
				throw new Error(`WhatsApp not available: ${response.statusText}`);
			}

			throw new Error(
				`WhatsApp API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as any;
		console.log(`[CallHippo] WhatsApp success response:`, data);

		return {
			success: true,
			channel: "whatsapp",
			messageId: data.id || data.messageId,
			status: data.status || "sent",
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.warn(`[CallHippo] WhatsApp error:`, errorMsg);
		throw error;
	}
}

/**
 * Send SMS message via CallHippo API
 */
async function sendSmsMessage(
	phoneNumber: string,
	message: string,
	apiKey: string,
): Promise<OutreachResponse> {
	const formattedPhone = formatPhoneNumber(phoneNumber);

	// CallHippo SMS endpoint
	const url = "https://api.callhippo.com/v1/sms/send";

	const payload = {
		to: formattedPhone,
		message: message,
	};

	console.log(`[CallHippo] Attempting SMS to ${formattedPhone}`);

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.warn(
				`[CallHippo] SMS API returned ${response.status}:`,
				errorText,
			);
			throw new Error(
				`SMS API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as any;
		console.log(`[CallHippo] SMS success response:`, data);

		return {
			success: true,
			channel: "sms",
			messageId: data.id || data.messageId,
			status: data.status || "sent",
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.warn(`[CallHippo] SMS error:`, errorMsg);
		throw error;
	}
}

/**
 * Format phone number for API (ensure +country code)
 */
function formatPhoneNumber(phone: string): string {
	// Remove common formatting characters
	const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

	// If it doesn't start with +, assume US +1
	if (!cleaned.startsWith("+")) {
		return `+1${cleaned.replace(/^1/, "")}`;
	}

	return cleaned;
}
