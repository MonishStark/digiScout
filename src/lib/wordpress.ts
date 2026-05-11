/** @format */

import { Business, WebsiteSchema } from "../types";

export interface WordPressMediaAsset {
	sourceUrl: string;
	alt: string;
	preferredFilename: string;
}

export interface WordPressSitePageDraft {
	title: string;
	slug: string;
	content: string;
	isHomepage?: boolean;
}

export interface WordPressProvisioningPlan {
	siteTitle: string;
	siteSlug: string;
	ownerEmail: string;
	ownerUsername: string;
	ownerDisplayName: string;
	baseTheme: string;
	pages: WordPressSitePageDraft[];
	media: WordPressMediaAsset[];
	themeSettings: {
		palette: WebsiteSchema["theme"]["palette"];
		typography: WebsiteSchema["theme"]["typography"];
		radius: string;
		style: string;
		name: string;
	};
}

function escapeHtml(value: string) {
	return (value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function slugify(value: string) {
	return (value || "client-site")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function renderParagraph(text: string) {
	return `<!-- wp:paragraph -->\n<p>${escapeHtml(text)}</p>\n<!-- /wp:paragraph -->`;
}

function renderHeading(text: string, level = 2) {
	return `<!-- wp:heading {"level":${level}} -->\n<h${level}>${escapeHtml(text)}</h${level}>\n<!-- /wp:heading -->`;
}

function renderButton(label: string, href: string) {
	return `<!-- wp:buttons -->\n<div class="wp-block-buttons">\n  <!-- wp:button -->\n  <div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${escapeHtml(href)}">${escapeHtml(label)}</a></div>\n  <!-- /wp:button -->\n</div>\n<!-- /wp:buttons -->`;
}

function renderList(items: string[]) {
	if (!items.length) {
		return "";
	}
	return `<!-- wp:list -->\n<ul>\n${items.map((item) => `  <li>${escapeHtml(item)}</li>`).join("\n")}\n</ul>\n<!-- /wp:list -->`;
}

function renderNavBlocks(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);
	const links = [
		{ title: "Home", href: "/" },
		{ title: "About", href: "/about/" },
		{ title: voice.featuresTitle, href: "/services/" },
		{ title: voice.galleryTitle, href: "/gallery/" },
		{ title: voice.faqTitle, href: "/faq/" },
		{ title: voice.contactTitle, href: "/contact/" },
	];

	return `<!-- wp:navigation {"layout":{"type":"flex","justifyContent":"center"}} -->\n<nav class="wp-block-navigation">${links.map((link) => `<a class="wp-block-navigation-item__content" href="${link.href}">${escapeHtml(link.title)}</a>`).join("")}</nav>\n<!-- /wp:navigation -->`;
}

function renderMedia(imageUrl: string, alt: string) {
	return `<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" /></figure>\n<!-- /wp:image -->`;
}

function getSiteVoice(schema: WebsiteSchema) {
	const category = (schema.brand.category || "").toLowerCase();
	const businessName = schema.brand.businessName || "The Brand";

	if (
		category.includes("restaurant") ||
		category.includes("cafe") ||
		category.includes("bakery")
	) {
		return {
			featuresTitle: "Signature Dishes & Experiences",
			galleryTitle: "Dining Room & Detail",
			testimonialsTitle: "Guest Impressions",
			faqTitle: "Dining Questions",
			contactTitle: `Visit ${businessName}`,
			aboutTitle: `The Story Behind ${businessName}`,
			ctaButton: "Reserve Your Table",
		};
	}

	if (
		category.includes("salon") ||
		category.includes("spa") ||
		category.includes("wellness")
	) {
		return {
			featuresTitle: "Signature Rituals",
			galleryTitle: "Studio Atmosphere",
			testimonialsTitle: "Client Notes",
			faqTitle: "Treatment Questions",
			contactTitle: `Book ${businessName}`,
			aboutTitle: `About ${businessName}`,
			ctaButton: "Schedule Your Appointment",
		};
	}

	if (
		category.includes("gym") ||
		category.includes("fitness") ||
		category.includes("training")
	) {
		return {
			featuresTitle: "Training Programs",
			galleryTitle: "Progress & Environment",
			testimonialsTitle: "Member Wins",
			faqTitle: "Training Questions",
			contactTitle: `Start Training at ${businessName}`,
			aboutTitle: `About ${businessName}`,
			ctaButton: "Start Your Program",
		};
	}

	return {
		featuresTitle: "Capabilities Built For Growth",
		galleryTitle: "Selected Work",
		testimonialsTitle: "Trusted By Real Customers",
		faqTitle: "Questions, Answered Clearly",
		contactTitle: `Let's Build Your Next Version`,
		aboutTitle: `About ${businessName}`,
		ctaButton: "Book A Consultation",
	};
}

function getSection<T extends WebsiteSchema["sections"][number]["type"]>(
	schema: WebsiteSchema,
	type: T,
) {
	return schema.sections.find((section) => section.type === type) as
		| Extract<WebsiteSchema["sections"][number], { type: T }>
		| undefined;
}

function renderHeroSection(schema: WebsiteSchema) {
	const hero = getSection(schema, "hero");
	if (!hero) return "";

	const image = hero.media?.src || "";
	const subheadline =
		hero.subheadline &&
		!/premium|designed to convert|first impression|conversion-ready/i.test(
			hero.subheadline,
		)
			? hero.subheadline
			: `${schema.brand.businessName} deserves a more distinctive digital presence.`;
	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group">\n  ${renderHeading(hero.headline, 1)}\n  ${renderParagraph(subheadline)}\n  ${renderButton(hero.ctaPrimary.label, hero.ctaPrimary.href)}\n  ${image ? renderMedia(image, hero.media?.alt || schema.brand.businessName) : ""}\n</div>\n<!-- /wp:group -->`;
}

function renderFeaturesSection(schema: WebsiteSchema) {
	const features = getSection(schema, "features");
	if (!features || !features.items.length) return "";
	const voice = getSiteVoice(schema);

	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group">\n  ${renderHeading(voice.featuresTitle, 2)}\n  ${renderList(features.items.map((item) => `${item.title}: ${item.description}`))}\n</div>\n<!-- /wp:group -->`;
}

function renderGallerySection(schema: WebsiteSchema) {
	const gallery = getSection(schema, "gallery");
	if (!gallery || !gallery.items.length) return "";
	const voice = getSiteVoice(schema);

	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group">\n  ${renderHeading(voice.galleryTitle, 2)}\n  <!-- wp:gallery {"linkTo":"none"} -->\n<figure class="wp-block-gallery has-nested-images columns-3 is-cropped">\n${gallery.items
		.map(
			(item) =>
				`  <figure class="wp-block-image size-large"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" /></figure>`,
		)
		.join("\n")}\n</figure>\n<!-- /wp:gallery -->\n</div>\n<!-- /wp:group -->`;
}

function renderTestimonialsSection(schema: WebsiteSchema) {
	const testimonials = getSection(schema, "testimonials");
	if (!testimonials || !testimonials.items.length) return "";
	const voice = getSiteVoice(schema);

	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group">\n  ${renderHeading(voice.testimonialsTitle, 2)}\n  ${testimonials.items
		.map(
			(item) =>
				`<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>${escapeHtml(item.quote)}</p><cite>${escapeHtml(item.author)}${item.role ? `, ${escapeHtml(item.role)}` : ""}</cite></blockquote>\n<!-- /wp:quote -->`,
		)
		.join("\n")}\n</div>\n<!-- /wp:group -->`;
}

function renderFaqSection(schema: WebsiteSchema) {
	const faq = getSection(schema, "faq");
	if (!faq || !faq.items.length) return "";
	const voice = getSiteVoice(schema);

	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group">\n  ${renderHeading(voice.faqTitle, 2)}\n  ${faq.items
		.map(
			(item) =>
				`<!-- wp:details -->\n<details class="wp-block-details"><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>\n<!-- /wp:details -->`,
		)
		.join("\n")}\n</div>\n<!-- /wp:group -->`;
}

function renderContactSection(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);
	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group" id="contact">\n  ${renderHeading(voice.contactTitle, 2)}\n  ${renderParagraph(schema.brand.address || "")}\n  ${schema.brand.phone ? renderParagraph(`Phone: ${schema.brand.phone}`) : ""}\n  ${schema.brand.email ? renderParagraph(`Email: ${schema.brand.email}`) : ""}\n  ${schema.brand.email ? renderButton(voice.ctaButton, `mailto:${schema.brand.email}`) : ""}\n</div>\n<!-- /wp:group -->`;
}

function renderCtaSection(schema: WebsiteSchema) {
	const cta = getSection(schema, "cta");
	if (!cta) return "";
	return `<!-- wp:group {"layout":{"type":"constrained"}} -->\n<div class="wp-block-group">\n  ${renderHeading(cta.title, 2)}\n  ${renderParagraph(cta.body)}\n  ${renderButton(cta.buttonLabel, cta.buttonHref)}\n</div>\n<!-- /wp:group -->`;
}

function buildHomePageBlocks(schema: WebsiteSchema) {
	return [
		renderNavBlocks(schema),
		renderHeroSection(schema),
		renderFeaturesSection(schema),
		renderGallerySection(schema),
		renderTestimonialsSection(schema),
		renderCtaSection(schema),
	]
		.filter(Boolean)
		.join("\n\n");
}

function buildAboutPageBlocks(schema: WebsiteSchema) {
	const hero = getSection(schema, "hero");
	const voice = getSiteVoice(schema);
	const intro =
		hero?.subheadline ||
		schema.seo.description ||
		`${schema.brand.businessName} is a modern ${schema.brand.category} brand.`;
	const highlights = [
		`Category: ${schema.brand.category}`,
		`Style Direction: ${schema.theme.name}`,
		`Experience Focus: ${schema.theme.style}`,
	];

	return [
		renderNavBlocks(schema),
		renderHeading(voice.aboutTitle, 1),
		renderParagraph(intro),
		renderList(highlights),
		renderTestimonialsSection(schema),
	]
		.filter(Boolean)
		.join("\n\n");
}

function buildServicesPageBlocks(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);
	return [
		renderNavBlocks(schema),
		renderHeading(voice.featuresTitle, 1),
		renderFeaturesSection(schema),
		renderCtaSection(schema),
	]
		.filter(Boolean)
		.join("\n\n");
}

function buildGalleryPageBlocks(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);
	return [
		renderNavBlocks(schema),
		renderHeading(voice.galleryTitle, 1),
		renderGallerySection(schema),
	]
		.filter(Boolean)
		.join("\n\n");
}

function buildFaqPageBlocks(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);
	return [
		renderNavBlocks(schema),
		renderHeading(voice.faqTitle, 1),
		renderFaqSection(schema),
	]
		.filter(Boolean)
		.join("\n\n");
}

function buildContactPageBlocks(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);
	return [
		renderNavBlocks(schema),
		renderHeading(voice.contactTitle, 1),
		renderContactSection(schema),
	]
		.filter(Boolean)
		.join("\n\n");
}

export function schemaToGutenbergBlocks(schema: WebsiteSchema) {
	if (!schema) {
		return "";
	}

	return buildHomePageBlocks(schema);
}

export function collectWordPressMediaAssets(
	schema: WebsiteSchema,
): WordPressMediaAsset[] {
	const assets: WordPressMediaAsset[] = [];

	for (const section of schema.sections) {
		if (section.type === "hero" && section.media?.src) {
			assets.push({
				sourceUrl: section.media.src,
				alt: section.media.alt || schema.brand.businessName,
				preferredFilename: `${schema.meta.slug}-hero`,
			});
		}

		if (section.type === "gallery") {
			for (const [index, item] of (section.items || []).entries()) {
				assets.push({
					sourceUrl: item.src,
					alt: item.alt || `${schema.brand.businessName} gallery ${index + 1}`,
					preferredFilename: `${schema.meta.slug}-gallery-${index + 1}`,
				});
			}
		}
	}

	const unique = new Map<string, WordPressMediaAsset>();
	for (const asset of assets) {
		if (asset.sourceUrl) {
			unique.set(asset.sourceUrl, asset);
		}
	}

	return Array.from(unique.values());
}

export function buildWordPressSitePages(
	schema: WebsiteSchema,
): WordPressSitePageDraft[] {
	const pages: WordPressSitePageDraft[] = [
		{
			title: schema.brand.businessName || "Home",
			slug: "home",
			content: buildHomePageBlocks(schema),
			isHomepage: true,
		},
		{
			title: "About",
			slug: "about",
			content: buildAboutPageBlocks(schema),
		},
		{
			title: "Services",
			slug: "services",
			content: buildServicesPageBlocks(schema),
		},
		{
			title: "Gallery",
			slug: "gallery",
			content: buildGalleryPageBlocks(schema),
		},
		{
			title: "FAQ",
			slug: "faq",
			content: buildFaqPageBlocks(schema),
		},
		{
			title: "Contact",
			slug: "contact",
			content: buildContactPageBlocks(schema),
		},
	];

	return pages;
}

export function buildWordPressProvisioningPlan(
	schema: WebsiteSchema,
	business: Business,
	options?: {
		ownerEmail?: string;
		ownerUsername?: string;
		baseTheme?: string;
	},
): WordPressProvisioningPlan {
	const siteSlug = slugify(schema.meta?.slug || business.name || "client-site");
	const emailSlug = slugify(
		business.name || schema.brand.businessName || "client",
	);
	const ownerEmail =
		options?.ownerEmail || business.email || `${emailSlug}@example-client.test`;
	const ownerUsername =
		options?.ownerUsername || slugify(`${emailSlug}-${schema.meta.businessId}`);

	return {
		siteTitle:
			schema.brand.businessName ||
			business.name ||
			schema.seo.title ||
			"Client Site",
		siteSlug,
		ownerEmail,
		ownerUsername,
		ownerDisplayName:
			schema.brand.businessName || business.name || ownerUsername,
		baseTheme: options?.baseTheme || "digital-scout-base-theme",
		pages: buildWordPressSitePages(schema),
		media: collectWordPressMediaAssets(schema),
		themeSettings: {
			palette: schema.theme.palette,
			typography: schema.theme.typography,
			radius: schema.theme.radius,
			style: schema.theme.style,
			name: schema.theme.name,
		},
	};
}
