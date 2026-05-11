/** @format */

import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import {
	deleteProvisionedWordPressMultisiteSite,
	provisionWordPressMultisiteSite,
	ProvisionWordPressSiteRequest,
} from "./src/lib/wordpress-provisioning";
import { WebsiteSchema } from "./src/types";
import {
	sendOutreachViaCallHippo,
	OutreachRequest,
	OutreachResponse,
} from "./src/lib/callhippo-service";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const GENAI_KEY = process.env.GEMINI_API_KEY || process.env.GENAI_API_KEY;
const genai = GENAI_KEY ? new GoogleGenAI({ apiKey: GENAI_KEY }) : null;
const NETLIFY_TOKEN =
	process.env.VITE_NETLIFY_TOKEN || process.env.NETLIFY_TOKEN;
const CALLHIPPO_API_KEY = process.env.CALLHIPPO_API_KEY;

interface DeployRequest {
	websiteContent: string;
	businessName: string;
}

interface EnrichBusinessRequest {
	websiteUri?: string;
	businessName: string;
	category?: string;
}

interface LeadCandidate {
	id: string;
	name: string;
	category?: string;
	address?: string;
	websiteUri?: string;
	email?: string;
	phoneNumber?: string;
	photos?: string[];
	imageSuggestions?: string[];
	location?: {
		lat: number;
		lng: number;
	};
}

interface QualifyLeadsRequest {
	businesses: LeadCandidate[];
	city?: string;
	category?: string;
}

interface LeadQualification {
	hasWebsite: boolean;
	websiteUri?: string;
	email?: string;
	phoneNumber?: string;
	confidence?: "high" | "medium" | "low";
	notes?: string;
}

function extractEmails(html: string): string[] {
	const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
	return Array.from(new Set(html.match(emailPattern) || [])).slice(0, 3);
}

function extractPhones(html: string): string[] {
	const phonePattern =
		/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;
	return Array.from(new Set(html.match(phonePattern) || [])).slice(0, 3);
}

function extractImages(html: string): string[] {
	const imagePattern =
		/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
	const matches: string[] = [];
	let match;
	while ((match = imagePattern.exec(html)) !== null) {
		matches.push(match[1]);
	}
	return Array.from(new Set(matches)).slice(0, 3);
}

function extractJsonObject(text: string): string | null {
	if (!text) return null;
	const trimmed = text.trim();

	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		return trimmed;
	}

	const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
	if (fencedMatch?.[1]) {
		const candidate = fencedMatch[1].trim();
		if (candidate.startsWith("{") && candidate.endsWith("}")) {
			return candidate;
		}
	}

	const firstBrace = trimmed.indexOf("{");
	const lastBrace = trimmed.lastIndexOf("}");
	if (firstBrace >= 0 && lastBrace > firstBrace) {
		return trimmed.slice(firstBrace, lastBrace + 1);
	}

	return null;
}

function parseLeadQualificationOutput(
	rawText: string,
): LeadQualification | null {
	const candidateJson = extractJsonObject(rawText);
	if (!candidateJson) return null;

	try {
		const parsed = JSON.parse(candidateJson) as Partial<LeadQualification>;
		if (!parsed || typeof parsed !== "object") {
			return null;
		}

		return {
			hasWebsite: Boolean(parsed.hasWebsite),
			websiteUri:
				typeof parsed.websiteUri === "string" ? parsed.websiteUri : undefined,
			email: typeof parsed.email === "string" ? parsed.email : undefined,
			phoneNumber:
				typeof parsed.phoneNumber === "string" ? parsed.phoneNumber : undefined,
			confidence:
				parsed.confidence === "high" ||
				parsed.confidence === "medium" ||
				parsed.confidence === "low"
					? parsed.confidence
					: undefined,
			notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
		};
	} catch {
		return null;
	}
}

async function runWithConcurrency<T, R>(
	items: T[],
	limit: number,
	task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let cursor = 0;

	const workers = Array.from(
		{ length: Math.min(limit, items.length) },
		async () => {
			while (true) {
				const index = cursor++;
				if (index >= items.length) {
					return;
				}
				results[index] = await task(items[index], index);
			}
		},
	);

	await Promise.all(workers);
	return results;
}

async function qualifyLeadCandidate(
	business: LeadCandidate,
	city?: string,
): Promise<LeadQualification> {
	if (business.websiteUri) {
		return {
			hasWebsite: true,
			websiteUri: business.websiteUri,
			email: business.email,
			phoneNumber: business.phoneNumber,
			confidence: "high",
			notes: "Google Places returned an official website URL.",
		};
	}

	if (!genai) {
		return {
			hasWebsite: false,
			email: business.email,
			phoneNumber: business.phoneNumber,
			confidence: "low",
			notes: "Gemini API key is not configured.",
		};
	}

	const prompt = `You are qualifying a local business lead using live grounded data.

Business:
- Name: ${business.name}
- Category: ${business.category || "Unknown"}
- Address: ${business.address || "Unknown"}
- City/Area: ${city || "Unknown"}
- Existing website from app: ${business.websiteUri || "None found"}
- Existing phone from app: ${business.phoneNumber || "Unknown"}

Task:
1. Determine whether this business appears to have an official website right now.
2. Find the best public contact email for the business, if one exists.
3. Find the best public phone number for the business, if one exists.

Rules:
- Use grounded live sources only.
- If an official business website exists, set hasWebsite to true.
- Only return an email if it is a business contact email that is publicly available.
- Do not guess.
- Prefer high confidence only; otherwise leave fields blank.

Return only valid JSON in this exact shape:
{
  "hasWebsite": true,
  "websiteUri": "https://example.com",
  "email": "info@example.com",
  "phoneNumber": "(555) 555-5555",
  "confidence": "high",
  "notes": "short explanation"
}`;

	const configsToTry = [
		{
			tools: [{ googleMaps: {} }, { googleSearch: {} }],
			toolConfig: business.location
				? {
						retrievalConfig: {
							latLng: {
								latitude: business.location.lat,
								longitude: business.location.lng,
							},
						},
					}
				: undefined,
		},
		{
			tools: [{ googleSearch: {} }],
			toolConfig: undefined,
		},
	] as const;

	let lastError: unknown = null;

	for (const configVariant of configsToTry) {
		try {
			const response = await genai.models.generateContent({
				model: "gemini-2.5-pro",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
					temperature: 0.1,
					tools: configVariant.tools as any,
					toolConfig: configVariant.toolConfig as any,
				},
			});

			const parsed = parseLeadQualificationOutput((response.text || "").trim());
			if (parsed) {
				return parsed;
			}
		} catch (error) {
			lastError = error;
		}
	}

	return {
		hasWebsite: false,
		email: business.email,
		phoneNumber: business.phoneNumber,
		confidence: "low",
		notes:
			lastError instanceof Error
				? lastError.message
				: "Lead qualification failed.",
	};
}

function parseWebsiteSchemaOutput(
	rawText: string,
	business: any,
): WebsiteSchema | null {
	const candidateJson = extractJsonObject(rawText);
	if (!candidateJson) return null;

	try {
		const parsed = JSON.parse(candidateJson) as Partial<WebsiteSchema>;
		if (!parsed || typeof parsed !== "object") {
			return null;
		}

		const root =
			typeof (parsed as any).schema === "object" && (parsed as any).schema
				? ((parsed as any).schema as Partial<WebsiteSchema>)
				: parsed;
		const nestedSections =
			(Array.isArray((root as any).sections) && (root as any).sections) ||
			(Array.isArray((parsed as any)?.website?.sections) &&
				(parsed as any).website.sections) ||
			(Array.isArray((parsed as any)?.site?.sections) &&
				(parsed as any).site.sections) ||
			null;

		const fallback = createFallbackWebsiteSchema(business);
		const merged: WebsiteSchema = {
			meta: {
				...fallback.meta,
				...(root.meta || {}),
			},
			theme: {
				...fallback.theme,
				...(root.theme || {}),
				palette: {
					...fallback.theme.palette,
					...((root.theme as any)?.palette || {}),
				},
				typography: {
					...fallback.theme.typography,
					...((root.theme as any)?.typography || {}),
				},
			},
			brand: {
				...fallback.brand,
				...(root.brand || {}),
			},
			seo: {
				...fallback.seo,
				...(root.seo || {}),
				keywords:
					Array.isArray(root.seo?.keywords) && root.seo?.keywords.length > 0
						? root.seo.keywords
						: fallback.seo.keywords,
			},
			sections:
				nestedSections && nestedSections.length > 0
					? nestedSections
					: fallback.sections,
		};

		merged.theme = sanitizeThemeEnums(merged.theme);

		return merged;
	} catch {
		return null;
	}
}

function hashSeed(input: string): number {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 31 + input.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

function pickBySeed<T>(items: T[], seed: number): T {
	if (!items.length) {
		throw new Error("pickBySeed requires at least one item");
	}
	return items[seed % items.length];
}

function buildUniqueHeroSubheadline(
	businessName: string,
	categoryLabel: string,
	seed: number,
) {
	const openings = [
		"delivers a sharper digital first impression for",
		"frames a premium online experience for",
		"positions your brand as the standout choice in",
		"brings editorial-grade storytelling to",
		"pairs visual depth with clear intent for",
		"transforms discovery clicks into confident enquiries for",
		"sets a modern, conversion-ready standard for",
	];
	const closings = [
		"with bold hierarchy and clear booking paths",
		"through polished visuals and concise trust signals",
		"by balancing atmosphere, proof, and action",
		"with mobile-first pacing and high-intent CTAs",
		"using distinctive sections that avoid template sameness",
		"with premium composition and service-first messaging",
		"through a brand voice tailored to local demand",
	];

	const opening = pickBySeed(openings, seed + 5);
	const closing = pickBySeed(closings, seed + 17);
	return `${businessName} ${opening} ${categoryLabel} ${closing}.`;
}

function ensureNonTemplateCopy(
	schema: WebsiteSchema,
	business: any,
): WebsiteSchema {
	const seed = hashSeed(
		`${business.id || business.name || "lead"}-${business.category || "category"}`,
	);
	const categoryLabel =
		business.category || schema.brand.category || "local business";
	const businessName =
		business.name || schema.brand.businessName || "This business";
	const genericPattern =
		/^a\s+premium\s+.+website\s+designed\s+to\s+convert\s+visitors\s+into\s+customers\.?$/i;

	const nextSections = (schema.sections || []).map((section) => {
		if (section.type !== "hero") return section;
		const current = (section.subheadline || "").trim();
		if (!current || genericPattern.test(current)) {
			return {
				...section,
				subheadline: buildUniqueHeroSubheadline(
					businessName,
					categoryLabel,
					seed,
				),
			};
		}
		return section;
	});

	return {
		...schema,
		sections: nextSections,
	};
}

function sanitizeThemeEnums(
	theme: WebsiteSchema["theme"],
): WebsiteSchema["theme"] {
	const sanitize = <T extends string>(
		value: unknown,
		allowed: readonly T[],
		fallback: T,
	): T => {
		return typeof value === "string" &&
			(allowed as readonly string[]).includes(value)
			? (value as T)
			: fallback;
	};

	return {
		...theme,
		layout: sanitize(
			theme.layout,
			[
				"editorial",
				"immersive",
				"minimal",
				"gallery-forward",
				"split-screen",
			] as const,
			"editorial",
		),
		buttonStyle: sanitize(
			theme.buttonStyle,
			["pill", "sharp", "ghost"] as const,
			"pill",
		),
		surfaceStyle: sanitize(
			theme.surfaceStyle,
			["glass", "solid", "outline"] as const,
			"glass",
		),
		mediaShape: sanitize(
			theme.mediaShape,
			["rounded", "arched", "portrait", "square"] as const,
			"rounded",
		),
		density: sanitize(
			theme.density,
			["airy", "balanced", "compact"] as const,
			"balanced",
		),
		accentMode: sanitize(
			theme.accentMode,
			["neon", "earthy", "luxury", "fresh"] as const,
			"neon",
		),
	};
}

function pickDesignProfile(category: string) {
	const normalized = (category || "").toLowerCase();

	if (
		normalized.includes("restaurant") ||
		normalized.includes("cafe") ||
		normalized.includes("bakery")
	) {
		return {
			name: "Warm Editorial",
			style: "editorial hospitality",
			layout: "editorial" as const,
			buttonStyle: "pill" as const,
			surfaceStyle: "glass" as const,
			mediaShape: "arched" as const,
			density: "airy" as const,
			accentMode: "earthy" as const,
			palette: {
				background: "#120f0b",
				surface: "rgba(32, 24, 18, 0.82)",
				primary: "#d97706",
				accent: "#f59e0b",
				text: "#fff8ee",
				muted: "#d6c6b8",
				outline: "rgba(255, 237, 213, 0.14)",
			},
			typography: { heading: "Fraunces", body: "Inter" },
		};
	}

	if (
		normalized.includes("salon") ||
		normalized.includes("spa") ||
		normalized.includes("wellness")
	) {
		return {
			name: "Soft Luxe",
			style: "luxury wellness",
			layout: "split-screen" as const,
			buttonStyle: "pill" as const,
			surfaceStyle: "glass" as const,
			mediaShape: "portrait" as const,
			density: "balanced" as const,
			accentMode: "luxury" as const,
			palette: {
				background: "#0b0a10",
				surface: "rgba(22, 18, 32, 0.86)",
				primary: "#c084fc",
				accent: "#f5d0fe",
				text: "#f8f5ff",
				muted: "#cabcd6",
				outline: "rgba(233, 213, 255, 0.14)",
			},
			typography: { heading: "Cormorant Garamond", body: "Inter" },
		};
	}

	if (
		normalized.includes("gym") ||
		normalized.includes("fitness") ||
		normalized.includes("training")
	) {
		return {
			name: "Electric Performance",
			style: "high-energy conversion",
			layout: "immersive" as const,
			buttonStyle: "sharp" as const,
			surfaceStyle: "solid" as const,
			mediaShape: "square" as const,
			density: "compact" as const,
			accentMode: "neon" as const,
			palette: {
				background: "#07090f",
				surface: "#0f172a",
				primary: "#22c55e",
				accent: "#38bdf8",
				text: "#f8fafc",
				muted: "#94a3b8",
				outline: "rgba(148, 163, 184, 0.18)",
			},
			typography: { heading: "Space Grotesk", body: "Inter" },
		};
	}

	if (
		normalized.includes("law") ||
		normalized.includes("finance") ||
		normalized.includes("consult") ||
		normalized.includes("agency")
	) {
		return {
			name: "Modern Authority",
			style: "editorial professional",
			layout: "minimal" as const,
			buttonStyle: "sharp" as const,
			surfaceStyle: "outline" as const,
			mediaShape: "rounded" as const,
			density: "balanced" as const,
			accentMode: "fresh" as const,
			palette: {
				background: "#f7f7f5",
				surface: "#ffffff",
				primary: "#0f766e",
				accent: "#2563eb",
				text: "#111827",
				muted: "#6b7280",
				outline: "rgba(17, 24, 39, 0.10)",
			},
			typography: { heading: "IBM Plex Sans", body: "Inter" },
		};
	}

	return {
		name: "Noir Luxe",
		style: "premium glass editorial",
		layout: "editorial" as const,
		buttonStyle: "pill" as const,
		surfaceStyle: "glass" as const,
		mediaShape: "rounded" as const,
		density: "balanced" as const,
		accentMode: "neon" as const,
		palette: {
			background: "#07070a",
			surface: "#111114",
			primary: "#7c3aed",
			accent: "#10b981",
			text: "#f4f4f5",
			muted: "#a1a1aa",
			outline: "rgba(255,255,255,0.10)",
		},
		typography: { heading: "Inter", body: "Inter" },
	};
}

function createFallbackWebsiteSchema(business: any): WebsiteSchema {
	const siteName = business.name || "Demo Business";
	const categoryLabel = business.category || "local business";
	const copySeed = hashSeed(`${business.id || siteName}-${categoryLabel}`);
	const design = pickDesignProfile(business.category || "");
	const layoutVariant = pickBySeed(
		[
			"editorial",
			"split-screen",
			"gallery-forward",
			"minimal",
			"immersive",
		] as const,
		copySeed + 7,
	);
	const buttonVariant = pickBySeed(
		["pill", "sharp", "ghost"] as const,
		copySeed + 13,
	);
	const mediaVariant = pickBySeed(
		["arched", "rounded", "portrait"] as const,
		copySeed + 19,
	);
	const densityVariant = pickBySeed(
		["airy", "balanced", "compact"] as const,
		copySeed + 23,
	);
	const accentVariant = pickBySeed(
		["earthy", "luxury", "fresh", "neon"] as const,
		copySeed + 31,
	);
	const heroVariant =
		layoutVariant === "minimal"
			? "centered"
			: layoutVariant === "immersive"
				? "immersive"
				: layoutVariant === "split-screen"
					? "split"
					: "split";
	const featureLayout = layoutVariant === "minimal" ? "list" : "cards";
	const heroImage =
		business.photos?.[0] ||
		"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80";
	const heroSubheadline = buildUniqueHeroSubheadline(
		siteName,
		categoryLabel,
		copySeed,
	);
	const featureDescriptions = [
		"A polished homepage narrative with strong hierarchy, rich visuals, and focused calls to action.",
		"Editorial section pacing that highlights proof, services, and trust signals without feeling generic.",
		"A contemporary layout that balances visual depth with fast comprehension and conversion intent.",
	];
	return ensureNonTemplateCopy(
		{
			meta: {
				siteId: `fallback-${business.id || "business"}-${Date.now()}`,
				businessId: business.id || "business",
				slug: siteName
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, ""),
				version: 1,
				target: "static",
			},
			theme: {
				name: design.name,
				style: design.style,
				radius:
					design.surfaceStyle === "solid"
						? "20px"
						: layoutVariant === "minimal"
							? "16px"
							: "28px",
				layout: layoutVariant,
				buttonStyle: buttonVariant,
				surfaceStyle: design.surfaceStyle,
				mediaShape: mediaVariant,
				density: densityVariant,
				accentMode: accentVariant,
				palette: design.palette,
				typography: design.typography,
			},
			brand: {
				businessName: siteName,
				category: business.category || "Local Business",
				address: business.address || "",
				phone: business.phoneNumber || "",
				email: business.email || "",
				websiteUri: business.websiteUri || "",
			},
			seo: {
				title: `${siteName} | Preview`,
				description: `Preview website for ${siteName}`,
				keywords: [business.category || "local", "preview"],
			},
			sections: [
				{
					id: "hero-1",
					type: "hero",
					variant: heroVariant,
					headline: siteName,
					subheadline: heroSubheadline,
					ctaPrimary: { label: "Book Now", href: "#contact" },
					badges: [design.name, "New Prototype"],
					media: {
						type: "image",
						src: heroImage,
						alt: siteName,
					},
				},
				{
					id: "features-1",
					type: "features",
					layout: featureLayout,
					items: [
						{
							title:
								layoutVariant === "minimal"
									? "Focused Messaging"
									: "Premium Positioning",
							description: pickBySeed(featureDescriptions, copySeed + 1),
						},
						{
							title:
								design.accentMode === "neon"
									? "High-Contrast CTA"
									: "Clear Service Story",
							description: pickBySeed(featureDescriptions, copySeed + 2),
						},
					],
				},
				{
					id: "gallery-1",
					type: "gallery",
					items: [
						{
							src:
								business.photos?.[1] ||
								business.photos?.[0] ||
								"https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80",
							alt: `${siteName} visual`,
						},
					],
				},
				{
					id: "testimonials-1",
					type: "testimonials",
					items: [
						{
							quote: `${siteName} gave us a polished first impression online and a clear booking flow that actually converts.`,
							author: "Jordan M.",
							role: "Local Customer",
						},
						{
							quote:
								"The new experience feels premium, modern, and far more aligned with what our brand promises in person.",
							author: "Avery K.",
							role: "Returning Client",
						},
					],
				},
				{
					id: "faq-1",
					type: "faq",
					items: [
						{
							question: `How quickly can we get started with ${siteName}?`,
							answer:
								"Most clients can launch core pages quickly, then iterate with new content and campaigns over time.",
						},
						{
							question:
								"Can we update content later without rebuilding everything?",
							answer:
								"Yes, the structure is designed for ongoing edits so the site can evolve with your business.",
						},
					],
				},
				{
					id: "cta-1",
					type: "cta",
					title: `Ready to elevate ${siteName}?`,
					body: "Book a strategy conversation and we will map a high-conversion website plan tailored to your audience.",
					buttonLabel: "Book Strategy Call",
					buttonHref: "#contact",
				},
				{ id: "contact-1", type: "contact", showEmail: true, showPhone: true },
			],
		},
		business,
	);
}

app.post("/api/generate", async (req: Request, res: Response) => {
	try {
		const business = req.body;
		if (!business || !business.name) {
			return res.status(400).json({ error: "Missing business payload" });
		}

		if (!genai) {
			return res.json(createFallbackWebsiteSchema(business));
		}

		const buildImageBlock = (b: any) => {
			const sources = [...(b.photos || []), ...(b.imageSuggestions || [])];
			return sources.length
				? sources.map((u: string, i: number) => `${i + 1}. ${u}`).join("\n")
				: "No direct image URLs provided.";
		};

		const creativeSeed = `${business.id || "lead"}-${Date.now()}`;

		const prompt = `You are an elite website strategist and senior designer. Produce a structured website schema for a premium local business website that can be rendered both as a static preview and provisioned into a dedicated WordPress Multisite subsite.

Your goal is to make each result visually distinct. Do not reuse one default aesthetic. Choose a specific art direction, spacing strategy, surface treatment, and content rhythm that best fits the business.

Choose exactly one design direction and reflect it in the theme fields:
1. editorial luxury: immersive hero, refined typography, glass or soft outline surfaces, elegant spacing
2. modern authority: minimal, structured, high-trust, clean surfaces, restrained accent color
3. bold performance: energetic, high-contrast, sharp buttons, compact spacing, confident hero
4. soft hospitality: warm, airy, rounded media, inviting copy, earthy accents
5. gallery-forward: image-led, generous visuals, asymmetrical pacing, portfolio feel

Set these theme fields when possible: layout, buttonStyle, surfaceStyle, mediaShape, density, accentMode, typography, palette, radius, name, style.
Use the business category and reference images to vary the result. The hero, feature, gallery, and contact sections should not feel templated across businesses.

Content structure requirements:
- Produce at least 6 sections and include: hero, features, gallery, testimonials, faq, contact.
- Prefer including an additional conversion CTA section near the end.
- Use 4-8 feature items with specific service wording (not placeholder copy).
- Use 3-6 testimonials with realistic sounding names/roles.
- Use 4-8 FAQ items that reflect likely customer questions for this business type.
- Gallery items must include descriptive alt text tied to the business.

Voice and realism requirements:
- Keep tone modern, premium, and human.
- Avoid buzzword spam and avoid generic startup phrases.
- Mention business/category context in meaningful ways (cuisine style, training focus, legal specialty, etc.).
- No repeated sentence structures across sections.

Copywriting requirements:
- Do not use generic filler text or repeated wording.
- Do not use this sentence or close variants: "A premium [category] website designed to convert visitors into customers."
- Write business-specific headlines and subheadlines with concrete tone and positioning.
- Ensure feature titles and descriptions are distinct from common template phrases.
- Make the content for this request unique using this creative seed: ${creativeSeed}

Business Name: ${business.name}
Category: ${business.category || "N/A"}
Address: ${business.address || "N/A"}
Phone: ${business.phoneNumber || "N/A"}
Email: ${business.email || "N/A"}
Website: ${business.websiteUri || "N/A"}

Reference Images:
${buildImageBlock(business)}

Return only valid JSON that conforms to the WebsiteSchema used by the app. Do not add markdown or commentary.`;

		const modelsToTry = [
			{ name: "gemini-3.1-pro-preview", timeoutMs: 65000 },
			{ name: "gemini-2.5-flash", timeoutMs: 35000 },
		] as const;

		let rawText = "";
		let lastError: unknown = null;

		for (const model of modelsToTry) {
			try {
				const response = (await Promise.race([
					genai.models.generateContent({
						model: model.name,
						contents: prompt,
						config: {
							responseMimeType: "application/json",
							temperature: 1.15,
							topP: 0.95,
						},
					}),
					new Promise((_, reject) =>
						setTimeout(
							() =>
								reject(
									new Error(
										`${model.name} request timed out after ${model.timeoutMs}ms`,
									),
								),
							model.timeoutMs,
						),
					),
				])) as { text?: string };

				rawText = (response.text || "").trim();
				if (rawText) {
					break;
				}

				lastError = new Error(`${model.name} returned empty text`);
				console.warn(
					`[Generate] ${model.name} returned empty text, trying next model.`,
				);
			} catch (error) {
				lastError = error;
				console.warn(
					`[Generate] ${model.name} failed, trying next model:`,
					error,
				);
			}
		}

		if (!rawText) {
			throw lastError || new Error("All Gemini model attempts failed");
		}

		const parsedSchema = parseWebsiteSchemaOutput(rawText, business);
		if (!parsedSchema) {
			console.warn(
				"[Generate] Gemini output could not be parsed as WebsiteSchema, using fallback schema.",
			);
			return res.json(createFallbackWebsiteSchema(business));
		}

		return res.json(ensureNonTemplateCopy(parsedSchema, business));
	} catch (err) {
		console.warn("/api/generate falling back to local schema:", err);
		return res.json(createFallbackWebsiteSchema(req.body));
	}
});

app.post(
	"/api/deploy",
	async (req: Request<{}, {}, DeployRequest>, res: Response) => {
		try {
			if (!NETLIFY_TOKEN) {
				return res
					.status(500)
					.json({ error: "Netlify token not configured on server" });
			}

			const { websiteContent, businessName } = req.body;
			if (!websiteContent || !businessName) {
				return res
					.status(400)
					.json({ error: "Missing websiteContent or businessName" });
			}

			const siteName = `${
				businessName
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "") || "digital-scout"
			}-${Date.now()}`;

			const siteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${NETLIFY_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: siteName }),
			});

			if (!siteResponse.ok) {
				const errorDetails = await siteResponse.text();
				return res.status(siteResponse.status).json({
					error: `Netlify site creation failed: ${siteResponse.statusText}`,
					details: errorDetails,
				});
			}

			const siteData = (await siteResponse.json()) as any;
			const siteId = siteData.id;
			const deployedUrl =
				siteData.ssl_url || siteData.url || siteData.deploy_url;

			const sha1 = crypto
				.createHash("sha1")
				.update(websiteContent)
				.digest("hex");

			const deployResponse = await fetch(
				`https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${NETLIFY_TOKEN}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						files: {
							"/index.html": sha1,
						},
					}),
				},
			);

			if (!deployResponse.ok) {
				const errorDetails = await deployResponse.text();
				return res.status(deployResponse.status).json({
					error: `Netlify deploy creation failed: ${deployResponse.statusText}`,
					details: errorDetails,
				});
			}

			const deployData = (await deployResponse.json()) as any;
			const deployId = deployData.id;

			const uploadResponse = await fetch(
				`https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`,
				{
					method: "PUT",
					headers: {
						Authorization: `Bearer ${NETLIFY_TOKEN}`,
						"Content-Type": "application/octet-stream",
					},
					body: websiteContent,
				},
			);

			if (!uploadResponse.ok) {
				const errorDetails = await uploadResponse.text();
				return res.status(uploadResponse.status).json({
					error: `Netlify file upload failed: ${uploadResponse.statusText}`,
					details: errorDetails,
				});
			}

			return res.json({
				success: true,
				deployedUrl,
				siteId,
				deployId,
				deployedAt: new Date().toISOString(),
			});
		} catch (error) {
			return res.status(500).json({
				error: error instanceof Error ? error.message : "Deployment failed",
			});
		}
	},
);

app.post(
	"/api/enrich-business",
	async (req: Request<{}, {}, EnrichBusinessRequest>, res: Response) => {
		try {
			const { websiteUri, businessName, category } = req.body;
			if (!businessName) {
				return res.status(400).json({ error: "Missing businessName" });
			}

			if (!websiteUri) {
				return res.json({
					email: undefined,
					phones: [],
					imageSuggestions: [],
				});
			}

			const response = await fetch(websiteUri, {
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; DigitalScout/1.0)",
				},
			});

			if (!response.ok) {
				return res.json({
					email: undefined,
					phones: [],
					imageSuggestions: [],
				});
			}

			const html = await response.text();
			return res.json({
				email: extractEmails(html)[0],
				phones: extractPhones(html),
				imageSuggestions: extractImages(html),
				businessName,
				category,
			});
		} catch (error) {
			console.error("Enrich business error:", error);
			return res.json({
				email: undefined,
				phones: [],
				imageSuggestions: [],
			});
		}
	},
);

app.post(
	"/api/qualify-leads",
	async (req: Request<{}, {}, QualifyLeadsRequest>, res: Response) => {
		try {
			const { businesses, city } = req.body;
			if (!Array.isArray(businesses)) {
				return res.status(400).json({ error: "Missing businesses array" });
			}

			const candidates = businesses.filter(
				(business) => business && typeof business.name === "string",
			);

			const qualifications = await runWithConcurrency(
				candidates,
				3,
				async (business) => {
					const qualification = await qualifyLeadCandidate(business, city);
					return { business, qualification };
				},
			);

			const qualifiedBusinesses = qualifications
				.filter(
					({ qualification }) =>
						!qualification.hasWebsite &&
						Boolean(qualification.email || qualification.phoneNumber),
				)
				.map(({ business, qualification }) => ({
					...business,
					websiteUri: qualification.websiteUri,
					email: qualification.email || business.email,
					phoneNumber: qualification.phoneNumber || business.phoneNumber,
				}));

			return res.json({
				businesses: qualifiedBusinesses,
				totalCandidates: candidates.length,
				totalQualified: qualifiedBusinesses.length,
			});
		} catch (error) {
			return res.status(500).json({
				error:
					error instanceof Error ? error.message : "Lead qualification failed",
			});
		}
	},
);

app.post(
	"/api/wordpress/provision-site",
	async (
		req: Request<{}, {}, ProvisionWordPressSiteRequest>,
		res: Response,
	) => {
		try {
			const { projectId, business, websiteSchema, provisioningPlan } = req.body;
			if (!projectId || !business || !websiteSchema || !provisioningPlan) {
				return res.status(400).json({
					error:
						"Missing projectId, business, websiteSchema, or provisioningPlan.",
				});
			}

			const result = await provisionWordPressMultisiteSite(req.body);
			return res.json(result);
		} catch (error) {
			return res.status(500).json({
				success: false,
				dryRun: false,
				provisioningStatus: "failed",
				subsiteCreationStatus: "failed",
				adminCreationStatus: "failed",
				themeInstallStatus: "failed",
				mediaImportStatus: "failed",
				contentImportStatus: "failed",
				homepageSetupStatus: "failed",
				credentialsStatus: "failed",
				logs: [],
				error:
					error instanceof Error
						? error.message
						: "WordPress provisioning failed",
			});
		}
	},
);

app.get("/api/wordpress/site-status/:siteId", async (req, res) => {
	const { siteId } = req.params;
	return res.json({
		success: true,
		siteId,
		message:
			"Site status polling is not yet persisted in the app server. Use the provisioning response as the source of truth for this MVP.",
	});
});

app.delete("/api/wordpress/site/:siteId", async (req, res) => {
	try {
		const { siteId } = req.params;
		if (!siteId) {
			return res.status(400).json({ error: "Missing siteId" });
		}

		const result = await deleteProvisionedWordPressMultisiteSite(siteId);
		return res.json(result);
	} catch (error) {
		return res.status(500).json({
			error:
				error instanceof Error
					? error.message
					: "Failed to delete WordPress site",
		});
	}
});

app.post(
	"/api/outreach/send",
	async (req: Request<{}, {}, OutreachRequest>, res: Response) => {
		try {
			const { businessName, phoneNumber, message, preferredChannel } = req.body;

			// Validate inputs
			if (!businessName || !phoneNumber || !message) {
				return res.status(400).json({
					error: "Missing required fields: businessName, phoneNumber, message",
				});
			}

			// Check if CallHippo API key is configured
			if (!CALLHIPPO_API_KEY) {
				console.error("[CallHippo] API key is not configured");
				return res.status(500).json({
					error:
						"CallHippo API key is not configured on the server. Please check .env.local.",
				});
			}

			// Send outreach via CallHippo
			const result: OutreachResponse = await sendOutreachViaCallHippo(
				{
					businessName,
					phoneNumber,
					message,
					preferredChannel: preferredChannel || "whatsapp",
				},
				CALLHIPPO_API_KEY,
			);

			if (result.success) {
				console.log(
					`[Outreach] Successfully sent via ${result.channel} to ${phoneNumber}`,
				);
				return res.json({
					success: true,
					channel: result.channel,
					messageId: result.messageId,
					status: result.status,
				});
			} else {
				console.warn(
					`[Outreach] Failed to send to ${phoneNumber}: ${result.error}`,
				);
				return res.status(500).json({
					success: false,
					error: result.error || "Failed to send outreach message",
				});
			}
		} catch (error) {
			console.error("[Outreach] Unexpected error:", error);
			return res.status(500).json({
				error:
					error instanceof Error ? error.message : "Outreach sending failed",
			});
		}
	},
);

app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

app.delete("/api/sites/:siteId", async (req: Request, res: Response) => {
	try {
		if (!NETLIFY_TOKEN) {
			return res
				.status(500)
				.json({ error: "Netlify token not configured on server" });
		}

		const { siteId } = req.params;
		if (!siteId) {
			return res.status(400).json({ error: "Missing siteId" });
		}

		const response = await fetch(
			`https://api.netlify.com/api/v1/sites/${siteId}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${NETLIFY_TOKEN}`,
				},
			},
		);

		if (!response.ok) {
			const errorDetails = await response.text();
			return res.status(response.status).json({
				error: `Failed to delete Netlify site: ${response.statusText}`,
				details: errorDetails,
			});
		}

		return res.json({ success: true, siteId });
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Delete failed",
		});
	}
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
