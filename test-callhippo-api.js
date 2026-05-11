/** @format */

(async () => {
	console.log("Testing CallHippo WhatsApp & SMS endpoints...\n");

	const apiKey = "69ff4b780825c535471bc712";
	const phoneNumber = "+919741551336";
	const message = "Test message from PoC";

	// Test WhatsApp
	console.log("--- Testing WhatsApp Endpoint ---");
	console.log("URL: https://api.callhippo.com/v1/whatsapp/send");
	console.log("Method: POST");
	console.log("Auth: Bearer " + apiKey);
	console.log("Payload:", { to: phoneNumber, message });

	try {
		const whatsappRes = await fetch(
			"https://api.callhippo.com/v1/whatsapp/send",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ to: phoneNumber, message }),
			},
		);

		const whatsappBody = await whatsappRes.text();
		console.log("Status:", whatsappRes.status);
		console.log("Response:", whatsappBody);
	} catch (err) {
		console.log("Error:", err.message);
	}

	console.log("\n--- Testing SMS Endpoint ---");
	console.log("URL: https://api.callhippo.com/v1/sms/send");
	console.log("Method: POST");
	console.log("Auth: Bearer " + apiKey);
	console.log("Payload:", { to: phoneNumber, message });

	try {
		const smsRes = await fetch("https://api.callhippo.com/v1/sms/send", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ to: phoneNumber, message }),
		});

		const smsBody = await smsRes.text();
		console.log("Status:", smsRes.status);
		console.log("Response:", smsBody);
	} catch (err) {
		console.log("Error:", err.message);
	}
})();
