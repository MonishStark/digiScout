/** @format */

(async () => {
	try {
		const payload = {
			websiteSchema: {
				meta: {
					siteId: "test",
					businessId: "b",
					slug: "test",
					version: 1,
					target: "static",
				},
				theme: { name: "Noir Luxe" },
				brand: { businessName: "Test" },
				seo: { title: "Test Page", description: "desc", keywords: [] },
				sections: [],
			},
		};
		const r = await fetch("http://localhost:5001/api/wordpress/sync", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		const text = await r.text();
		console.log("STATUS", r.status);
		console.log(text);
	} catch (e) {
		console.error("ERR", e);
	}
})();
