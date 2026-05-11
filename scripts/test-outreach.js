/** @format */

(async () => {
	try {
		const res = await fetch("http://localhost:5001/api/outreach/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				businessName: "Test Runner",
				phoneNumber: "+919741551336",
				message: "Test message from automated PoC runner",
				preferredChannel: "whatsapp",
			}),
		});

		const text = await res.text();
		console.log("Status:", res.status);
		console.log("Body:", text);
	} catch (err) {
		console.error("Request error:", err);
	}
})();
