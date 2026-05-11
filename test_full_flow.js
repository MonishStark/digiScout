/** @format */

(async () => {
	try {
		const business = {
			name: "Debug Bistro",
			category: "restaurant",
			address: "123 Main St",
			phoneNumber: "(555) 555-5555",
			email: "info@debug.com",
		};
		console.log("POST /api/generate");
		let r = await fetch("http://localhost:5001/api/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(business),
		});
		const schema = await r.json();
		console.log("Got schema meta:", schema.meta);

		console.log("POST /api/wordpress/sync");
		r = await fetch("http://localhost:5001/api/wordpress/sync", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ websiteSchema: schema }),
		});
		const text = await r.text();
		console.log("Sync status", r.status);
		console.log(text.slice(0, 4000));
	} catch (e) {
		console.error(e);
	}
})();
