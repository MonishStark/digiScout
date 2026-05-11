/** @format */

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, ".", "");
	return {
		plugins: [react(), tailwindcss()],
		define: {
			"process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
			"process.env.GOOGLE_MAPS_PLATFORM_KEY": JSON.stringify(
				env.GOOGLE_MAPS_PLATFORM_KEY || "",
			),
		},
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "."),
				"node-fetch": "cross-fetch",
			},
		},
		server: {
			// HMR is disabled in AI Studio via DISABLE_HMR env var.
			// Do not modifyâfile watching is disabled to prevent flickering during agent edits.
			hmr: process.env.DISABLE_HMR !== "true",
		},
		env: {
			VITE_API_URL: env.VITE_API_URL || "http://localhost:3001",
		},
	};
});
