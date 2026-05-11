/** @format */

import {
	Business,
	CtaSection,
	FaqSection,
	FeatureSection,
	GallerySection,
	HeroSection,
	TestimonialSection,
	WebsiteArtifact,
	WebsiteSchema,
	WebsiteSection,
} from "../types";

const escapeHtml = (value: string) =>
	(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

const fallbackImageForCategory = (category: string) => {
	const normalized = (category || "").toLowerCase();
	if (normalized.includes("restaurant") || normalized.includes("cafe")) {
		return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80";
	}
	if (normalized.includes("gym") || normalized.includes("fitness")) {
		return "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=80";
	}
	if (normalized.includes("salon") || normalized.includes("spa")) {
		return "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=80";
	}
	return "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80";
};

const defaultTheme = (schema?: WebsiteSchema["theme"]) => ({
	name: schema?.name || "Noir Luxe",
	style: schema?.style || "premium glass editorial",
	radius: schema?.radius || "28px",
	layout: schema?.layout || "editorial",
	buttonStyle: schema?.buttonStyle || "pill",
	surfaceStyle: schema?.surfaceStyle || "glass",
	mediaShape: schema?.mediaShape || "rounded",
	density: schema?.density || "balanced",
	accentMode: schema?.accentMode || "neon",
	palette: {
		background: schema?.palette?.background || "#07070a",
		surface: schema?.palette?.surface || "#111114",
		primary: schema?.palette?.primary || "#7c3aed",
		accent: schema?.palette?.accent || "#10b981",
		text: schema?.palette?.text || "#f4f4f5",
		muted: schema?.palette?.muted || "#a1a1aa",
		outline: schema?.palette?.outline || "rgba(255,255,255,0.10)",
	},
	typography: {
		heading: schema?.typography?.heading || "Inter",
		body: schema?.typography?.body || "Inter",
	},
});

const getThemeClassName = (theme?: WebsiteSchema["theme"]) =>
	[
		`theme-${theme?.layout || "editorial"}`,
		`accent-${theme?.accentMode || "neon"}`,
		`surface-${theme?.surfaceStyle || "glass"}`,
		`density-${theme?.density || "balanced"}`,
		`buttons-${theme?.buttonStyle || "pill"}`,
	].join(" ");

type SiteVoice = {
	nav: Array<{ href: string; label: string }>;
	headerCta: string;
	servicesTitle: string;
	galleryTitle: string;
	testimonialsTitle: string;
	faqTitle: string;
	contactTitle: string;
	ctaTitle: string;
	introLine: string;
	aboutTitle: string;
	sectionNumberLabel: string;
};

function getSiteVoice(schema: WebsiteSchema): SiteVoice {
	const category = (schema.brand.category || "").toLowerCase();
	const businessName = schema.brand.businessName || "The Brand";

	if (
		category.includes("restaurant") ||
		category.includes("cafe") ||
		category.includes("bakery")
	) {
		return {
			nav: [
				{ href: "#services", label: "Menu" },
				{ href: "#gallery", label: "Atmosphere" },
				{ href: "#testimonials", label: "Reviews" },
				{ href: "#faq", label: "Info" },
				{ href: "#contact", label: "Visit" },
			],
			headerCta: "Reserve",
			servicesTitle: "Signature Dishes & Experiences",
			galleryTitle: "Dining Room & Detail",
			testimonialsTitle: "Guest Impressions",
			faqTitle: "Dining Questions",
			contactTitle: `Visit ${businessName}`,
			ctaTitle: "Reserve Your Table",
			introLine: `${businessName} pairs atmosphere, hospitality, and memorable food into one polished dining experience.`,
			aboutTitle: `The Story Behind ${businessName}`,
			sectionNumberLabel: "Course",
		};
	}

	if (
		category.includes("salon") ||
		category.includes("spa") ||
		category.includes("wellness")
	) {
		return {
			nav: [
				{ href: "#services", label: "Rituals" },
				{ href: "#gallery", label: "Spaces" },
				{ href: "#testimonials", label: "Results" },
				{ href: "#faq", label: "Care" },
				{ href: "#contact", label: "Book" },
			],
			headerCta: "Book Now",
			servicesTitle: "Signature Rituals",
			galleryTitle: "Studio Atmosphere",
			testimonialsTitle: "Client Notes",
			faqTitle: "Treatment Questions",
			contactTitle: `Book ${businessName}`,
			ctaTitle: "Schedule Your Appointment",
			introLine: `${businessName} creates a calm, elevated experience built around intention, detail, and confidence.`,
			aboutTitle: `About ${businessName}`,
			sectionNumberLabel: "Step",
		};
	}

	if (
		category.includes("gym") ||
		category.includes("fitness") ||
		category.includes("training")
	) {
		return {
			nav: [
				{ href: "#services", label: "Programs" },
				{ href: "#gallery", label: "Training" },
				{ href: "#testimonials", label: "Results" },
				{ href: "#faq", label: "Plan" },
				{ href: "#contact", label: "Join" },
			],
			headerCta: "Join Now",
			servicesTitle: "Training Programs",
			galleryTitle: "Progress & Environment",
			testimonialsTitle: "Member Wins",
			faqTitle: "Training Questions",
			contactTitle: `Start Training at ${businessName}`,
			ctaTitle: "Start Your Program",
			introLine: `${businessName} is built for momentum, accountability, and measurable change.`,
			aboutTitle: `About ${businessName}`,
			sectionNumberLabel: "Phase",
		};
	}

	if (
		category.includes("law") ||
		category.includes("finance") ||
		category.includes("consult") ||
		category.includes("agency")
	) {
		return {
			nav: [
				{ href: "#services", label: "Expertise" },
				{ href: "#gallery", label: "Casework" },
				{ href: "#testimonials", label: "Clients" },
				{ href: "#faq", label: "Questions" },
				{ href: "#contact", label: "Discuss" },
			],
			headerCta: "Discuss",
			servicesTitle: "Core Expertise",
			galleryTitle: "Selected Work",
			testimonialsTitle: "Client Feedback",
			faqTitle: "Common Questions",
			contactTitle: `Contact ${businessName}`,
			ctaTitle: "Request a Consultation",
			introLine: `${businessName} presents a measured, high-trust brand experience designed for serious decision makers.`,
			aboutTitle: `Our Approach`,
			sectionNumberLabel: "Tier",
		};
	}

	return {
		nav: [
			{ href: "#services", label: "Services" },
			{ href: "#gallery", label: "Gallery" },
			{ href: "#testimonials", label: "Reviews" },
			{ href: "#faq", label: "FAQ" },
			{ href: "#contact", label: "Contact" },
		],
		headerCta: "Start Project",
		servicesTitle: "Capabilities Built For Growth",
		galleryTitle: "Signature Spaces And Moments",
		testimonialsTitle: "Trusted By Real Customers",
		faqTitle: "Questions, Answered Clearly",
		contactTitle: `Let's Build Your Next Version`,
		ctaTitle: "Ready To Elevate Your Brand?",
		introLine: `${businessName} deserves a polished digital presence that feels current, deliberate, and credible.`,
		aboutTitle: `About ${businessName}`,
		sectionNumberLabel: "Part",
	};
}

function getSection<T extends WebsiteSection["type"]>(
	schema: WebsiteSchema,
	type: T,
) {
	return schema.sections.find((section) => section.type === type) as
		| Extract<WebsiteSection, { type: T }>
		| undefined;
}

function renderHeader(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);

	return `
<header class="site-header">
  <a class="brandmark" href="#top">
    <span class="brand-dot"></span>
    <span>${escapeHtml(schema.brand.businessName)}</span>
  </a>
  <nav class="top-nav">
    ${voice.nav.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}
  </nav>
  <a class="button button-secondary header-cta" href="#contact">${escapeHtml(voice.headerCta)}</a>
</header>`;
}

function renderHero(section: HeroSection, schema: WebsiteSchema) {
	const image =
		section.media?.src || fallbackImageForCategory(schema.brand.category);
	const voice = getSiteVoice(schema);
	const stats = [
		schema.brand.category,
		schema.theme.name,
		schema.theme.style,
	].filter(Boolean);
	const heroCopy =
		section.subheadline &&
		!/premium|designed to convert|first impression|conversion-ready/i.test(
			section.subheadline,
		)
			? section.subheadline
			: voice.introLine;

	if (section.variant === "immersive") {
		return `
<section class="site-section hero hero-immersive" id="top">
  <div class="hero-media immersive-media">
    <img src="${escapeHtml(image)}" alt="${escapeHtml(section.media?.alt || schema.brand.businessName)}" />
    <div class="hero-overlay"></div>
  </div>
  <div class="hero-copy hero-copy-overlay">
    <div class="eyebrow">${escapeHtml(schema.brand.category)}</div>
    <h1>${escapeHtml(section.headline)}</h1>
    <p>${escapeHtml(heroCopy)}</p>
    <div class="cta-row">
      <a class="button button-primary" href="${escapeHtml(section.ctaPrimary.href)}">${escapeHtml(section.ctaPrimary.label)}</a>
      ${section.ctaSecondary ? `<a class="button button-secondary" href="${escapeHtml(section.ctaSecondary.href)}">${escapeHtml(section.ctaSecondary.label)}</a>` : ""}
    </div>
  </div>
</section>`;
	}

	return `
<section class="site-section hero hero-${section.variant}" id="top">
  <div class="hero-copy">
    <div class="eyebrow">${escapeHtml(schema.brand.category)}</div>
    <h1>${escapeHtml(section.headline)}</h1>
    <p>${escapeHtml(section.subheadline)}</p>
    ${section.badges?.length ? `<div class="pill-row">${section.badges.map((badge) => `<span class="pill">${escapeHtml(badge)}</span>`).join("")}</div>` : ""}
    <div class="cta-row">
      <a class="button button-primary" href="${escapeHtml(section.ctaPrimary.href)}">${escapeHtml(section.ctaPrimary.label)}</a>
      ${section.ctaSecondary ? `<a class="button button-secondary" href="${escapeHtml(section.ctaSecondary.href)}">${escapeHtml(section.ctaSecondary.label)}</a>` : ""}
    </div>
    <div class="hero-stats">
      ${stats.map((stat) => `<span>${escapeHtml(stat)}</span>`).join("")}
    </div>
  </div>
  <div class="hero-media">
    <img src="${escapeHtml(image)}" alt="${escapeHtml(section.media?.alt || schema.brand.businessName)}" />
  </div>
</section>`;
}

function renderFeatures(section: FeatureSection) {
	const voice = getSiteVoice({
		brand: { businessName: "", category: "restaurant", address: "" },
		theme: {} as WebsiteSchema["theme"],
		seo: { title: "", description: "", keywords: [] },
		sections: [],
	} as WebsiteSchema);
	return `
<section class="site-section features" id="services">
  <div class="section-heading">
    <div class="eyebrow">Services</div>
    <h2>${escapeHtml(voice.servicesTitle)}</h2>
  </div>
  <div class="feature-grid feature-grid-${section.layout}">
    ${(section.items || [])
			.map(
				(item, index) => `
    <article class="feature-card">
      <span class="feature-index">${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </article>`,
			)
			.join("")}
  </div>
</section>`;
}

function renderGallery(section: GallerySection) {
	const voice = getSiteVoice({
		brand: { businessName: "", category: "restaurant", address: "" },
		theme: {} as WebsiteSchema["theme"],
		seo: { title: "", description: "", keywords: [] },
		sections: [],
	} as WebsiteSchema);
	return `
<section class="site-section gallery" id="gallery">
  <div class="section-heading">
    <div class="eyebrow">Gallery</div>
    <h2>${escapeHtml(voice.galleryTitle)}</h2>
  </div>
  <div class="gallery-grid">
    ${(section.items || [])
			.map(
				(item, index) => `
    <figure class="gallery-item gallery-item-${(index % 4) + 1}">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" />
    </figure>`,
			)
			.join("")}
  </div>
</section>`;
}

function renderTestimonials(section: TestimonialSection) {
	const voice = getSiteVoice({
		brand: { businessName: "", category: "restaurant", address: "" },
		theme: {} as WebsiteSchema["theme"],
		seo: { title: "", description: "", keywords: [] },
		sections: [],
	} as WebsiteSchema);
	return `
<section class="site-section testimonials" id="testimonials">
  <div class="section-heading">
    <div class="eyebrow">Testimonials</div>
    <h2>${escapeHtml(voice.testimonialsTitle)}</h2>
  </div>
  <div class="testimonial-grid">
    ${(section.items || [])
			.map(
				(item) => `
    <blockquote class="testimonial-card">
      <p>"${escapeHtml(item.quote)}"</p>
      <footer>
        <strong>${escapeHtml(item.author)}</strong>
        ${item.role ? `<span>${escapeHtml(item.role)}</span>` : ""}
      </footer>
    </blockquote>`,
			)
			.join("")}
  </div>
</section>`;
}

function renderCta(section: CtaSection) {
	const voice = getSiteVoice({
		brand: { businessName: "", category: "restaurant", address: "" },
		theme: {} as WebsiteSchema["theme"],
		seo: { title: "", description: "", keywords: [] },
		sections: [],
	} as WebsiteSchema);
	return `
<section class="site-section final-cta">
  <div class="final-cta-card">
    <h2>${escapeHtml(section.title || voice.ctaTitle)}</h2>
    <p>${escapeHtml(section.body)}</p>
    <a class="button button-primary" href="${escapeHtml(section.buttonHref)}">${escapeHtml(section.buttonLabel)}</a>
  </div>
</section>`;
}

function renderFaq(section: FaqSection) {
	const voice = getSiteVoice({
		brand: { businessName: "", category: "restaurant", address: "" },
		theme: {} as WebsiteSchema["theme"],
		seo: { title: "", description: "", keywords: [] },
		sections: [],
	} as WebsiteSchema);
	return `
<section class="site-section faq" id="faq">
  <div class="section-heading">
    <div class="eyebrow">FAQ</div>
    <h2>${escapeHtml(voice.faqTitle)}</h2>
  </div>
  <div class="faq-list">
    ${(section.items || [])
			.map(
				(item) => `
    <details class="faq-item">
      <summary>${escapeHtml(item.question)}</summary>
      <p>${escapeHtml(item.answer)}</p>
    </details>`,
			)
			.join("")}
  </div>
</section>`;
}

function renderContact(schema: WebsiteSchema) {
	const voice = getSiteVoice(schema);
	const emailLabel = schema.brand.category.toLowerCase().includes("restaurant")
		? "Reserve A Table"
		: schema.brand.category.toLowerCase().includes("gym")
			? "Book A Tour"
			: schema.brand.category.toLowerCase().includes("salon") ||
				  schema.brand.category.toLowerCase().includes("spa")
				? "Book An Appointment"
				: "Book A Consultation";
	return `
<section class="site-section contact" id="contact">
  <div class="section-heading">
    <div class="eyebrow">Contact</div>
    <h2>${escapeHtml(voice.contactTitle)}</h2>
  </div>
  <div class="contact-grid">
    <article class="contact-card">
      <h3>${escapeHtml(schema.brand.businessName)}</h3>
      <p>${escapeHtml(schema.brand.address || "")}</p>
      ${schema.brand.phone ? `<p><strong>Phone:</strong> ${escapeHtml(schema.brand.phone)}</p>` : ""}
      ${schema.brand.email ? `<p><strong>Email:</strong> ${escapeHtml(schema.brand.email)}</p>` : ""}
      ${schema.brand.email ? `<a class="button button-primary" href="mailto:${escapeHtml(schema.brand.email)}">${escapeHtml(emailLabel)}</a>` : ""}
    </article>
    <article class="contact-card map-card">
      <div class="map-placeholder">${escapeHtml(schema.brand.address || "")}</div>
    </article>
  </div>
</section>`;
}

function renderSection(section: WebsiteSection, schema: WebsiteSchema) {
	switch (section.type) {
		case "hero":
			return renderHero(section, schema);
		case "features":
			return renderFeatures(section);
		case "gallery":
			return renderGallery(section);
		case "testimonials":
			return renderTestimonials(section);
		case "contact":
			return renderContact(schema);
		case "cta":
			return renderCta(section);
		case "faq":
			return renderFaq(section);
		default:
			return "";
	}
}

function renderPageBody(schema: WebsiteSchema) {
	const hero = getSection(schema, "hero");
	const features = getSection(schema, "features");
	const gallery = getSection(schema, "gallery");
	const testimonials = getSection(schema, "testimonials");
	const cta = getSection(schema, "cta");
	const faq = getSection(schema, "faq");

	const orderedSections = [
		hero,
		features,
		gallery,
		testimonials,
		cta,
		faq,
		{ type: "contact" } as WebsiteSection,
	].filter(Boolean) as WebsiteSection[];

	return orderedSections
		.map((section) => renderSection(section, schema))
		.filter(Boolean)
		.join("\n");
}

const buildCss = (schema: WebsiteSchema) => {
	const theme = defaultTheme(schema.theme);
	const voice = getSiteVoice(schema);
	const shellWidth =
		theme.density === "compact"
			? "1320px"
			: theme.density === "airy"
				? "1180px"
				: "1240px";
	const bodyGrid =
		theme.accentMode === "earthy"
			? "radial-gradient(circle at 20% 15%, rgba(245,158,11,.22), transparent 32%), radial-gradient(circle at 90% 75%, rgba(217,119,6,.14), transparent 28%)"
			: theme.accentMode === "luxury"
				? "radial-gradient(circle at 16% 14%, rgba(196,133,250,.22), transparent 30%), radial-gradient(circle at 86% 72%, rgba(255,120,188,.12), transparent 30%)"
				: theme.accentMode === "fresh"
					? "radial-gradient(circle at 18% 12%, rgba(37,99,235,.18), transparent 32%), radial-gradient(circle at 88% 70%, rgba(15,118,110,.14), transparent 28%)"
					: "radial-gradient(circle at 18% 12%, rgba(124,58,237,.18), transparent 32%), radial-gradient(circle at 88% 70%, rgba(16,185,129,.14), transparent 28%)";
	const cardFill =
		theme.surfaceStyle === "solid"
			? "var(--surface)"
			: theme.surfaceStyle === "outline"
				? "transparent"
				: "color-mix(in srgb, var(--surface) 70%, transparent)";

	return `
:root {
  --bg: ${theme.palette.background};
  --surface: ${theme.palette.surface};
  --primary: ${theme.palette.primary};
  --accent: ${theme.palette.accent};
  --text: ${theme.palette.text};
  --muted: ${theme.palette.muted};
  --outline: ${theme.palette.outline};
  --radius: ${theme.radius};
  --heading-font: ${theme.typography.heading}, ui-serif, Georgia, serif;
  --body-font: ${theme.typography.body}, Inter, ui-sans-serif, system-ui;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--body-font);
  color: var(--text);
  background: ${bodyGrid}, var(--bg);
  line-height: 1.6;
  min-height: 100vh;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(to right, color-mix(in srgb, var(--outline) 20%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--outline) 20%, transparent) 1px, transparent 1px);
  background-size: 52px 52px;
  opacity: .08;
}
a { color: inherit; text-decoration: none; }
img { display: block; width: 100%; max-width: 100%; }
.site-shell {
  width: min(${shellWidth}, calc(100% - 40px));
  margin: 0 auto;
  padding: 24px 0 96px;
  position: relative;
  z-index: 1;
}
.site-header {
  position: sticky;
  top: 14px;
  z-index: 40;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 14px 18px;
  border-radius: 18px;
  border: 1px solid var(--outline);
  background: color-mix(in srgb, var(--surface) 76%, transparent);
  backdrop-filter: blur(14px);
}
.brandmark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  letter-spacing: .01em;
}
.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 22%, transparent);
}
.top-nav {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
}
.top-nav a {
  color: var(--muted);
  font-size: .92rem;
  transition: color .2s ease;
}
.top-nav a:hover { color: var(--text); }
.site-section { margin-top: 72px; }
.section-heading h2 { max-width: 14ch; }
.eyebrow {
  text-transform: uppercase;
  letter-spacing: .26em;
  font-weight: 700;
  font-size: .72rem;
  color: color-mix(in srgb, var(--accent) 78%, var(--text));
  margin-bottom: 10px;
}
.section-heading h2,
.hero h1,
.final-cta-card h2 {
  font-family: var(--heading-font);
  letter-spacing: -.03em;
  line-height: .96;
  margin: 0;
}
.hero {
  display: grid;
  gap: 34px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
}
.hero h1 { font-size: clamp(3rem, 8vw, 6rem); margin-bottom: 18px; }
.hero p { font-size: clamp(1.05rem, 2vw, 1.45rem); color: var(--muted); max-width: 58ch; margin: 0; }
.hero-copy { position: relative; z-index: 2; }
.hero-stats {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.hero-stats span {
  font-size: .76rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  border: 1px solid var(--outline);
  border-radius: 999px;
  padding: 6px 11px;
  color: var(--muted);
}
.hero-media {
  overflow: hidden;
  border-radius: calc(var(--radius) + 4px);
  border: 1px solid var(--outline);
  box-shadow: 0 28px 80px rgba(0, 0, 0, .28);
}
.hero-media img { object-fit: cover; aspect-ratio: 16 / 11; }
.hero-immersive {
  position: relative;
  min-height: 74vh;
  border-radius: calc(var(--radius) + 8px);
  overflow: hidden;
}
.immersive-media {
  position: absolute;
  inset: 0;
  border: none;
  box-shadow: none;
}
.immersive-media img { height: 100%; object-fit: cover; }
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, rgba(0,0,0,.74) 12%, rgba(0,0,0,.25) 68%, rgba(0,0,0,.55) 100%);
}
.hero-copy-overlay {
  position: relative;
  align-self: end;
  padding: clamp(24px, 4vw, 42px);
  z-index: 3;
}
.pill-row, .cta-row, .feature-grid, .testimonial-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.pill {
  border: 1px solid var(--outline);
  border-radius: 999px;
  padding: 9px 14px;
  font-size: .92rem;
  color: var(--muted);
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border-radius: ${theme.buttonStyle === "sharp" ? "14px" : theme.buttonStyle === "ghost" ? "18px" : "999px"};
  border: 1px solid var(--outline);
  padding: 0 18px;
  font-weight: 600;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
}
.button:hover { transform: translateY(-2px); }
.button-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 68%, var(--accent) 32%));
  box-shadow: 0 18px 35px color-mix(in srgb, var(--primary) 38%, transparent);
}
.button-secondary {
  background: color-mix(in srgb, var(--surface) 68%, transparent);
  color: var(--text);
}
.section-heading { margin-bottom: 20px; }
.section-heading h2 { font-size: clamp(1.9rem, 3.8vw, 3rem); }
.feature-grid-cards {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
}
.feature-grid-list {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 14px;
}
.feature-card {
  grid-column: span 6;
  background: ${cardFill};
  border: 1px solid var(--outline);
  border-radius: var(--radius);
  padding: 22px;
  position: relative;
  backdrop-filter: ${theme.surfaceStyle === "glass" ? "blur(16px)" : "none"};
}
.feature-grid-list .feature-card { grid-column: span 1; }
.feature-index {
  display: inline-flex;
  font-size: .76rem;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
}
.feature-card h3 { margin: 0 0 10px; font-size: 1.45rem; font-family: var(--heading-font); }
.feature-card p { margin: 0; color: var(--muted); font-size: 1.01rem; }
.feature-card:nth-child(2n) { transform: translateY(16px); }
.feature-card:nth-child(3n) { margin-top: 10px; }
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
}
.gallery-item {
  overflow: hidden;
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid var(--outline);
  min-height: 240px;
}
.gallery-item img { height: 100%; object-fit: cover; transition: transform .8s ease; }
.gallery-item:hover img { transform: scale(1.06); }
.gallery-item-1 { grid-column: span 7; min-height: 360px; }
.gallery-item-2 { grid-column: span 5; min-height: 360px; }
.gallery-item-3 { grid-column: span 5; min-height: 240px; }
.gallery-item-4 { grid-column: span 7; min-height: 240px; }
.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
}
.testimonial-card {
  grid-column: span 4;
  background: ${cardFill};
  border: 1px solid var(--outline);
  border-radius: var(--radius);
  padding: 20px;
}
.testimonial-card:nth-child(2n) { transform: translateY(12px); }
.testimonial-card p { margin: 0 0 14px; color: var(--text); font-size: 1.02rem; }
.testimonial-card footer { display: grid; gap: 3px; color: var(--muted); }
.final-cta-card {
  border: 1px solid var(--outline);
  border-radius: calc(var(--radius) + 8px);
  padding: clamp(28px, 4vw, 54px);
  background: linear-gradient(145deg, color-mix(in srgb, var(--surface) 74%, transparent), color-mix(in srgb, var(--primary) 12%, transparent));
  text-align: center;
}
.final-cta-card p { color: var(--muted); font-size: 1.06rem; max-width: 64ch; margin: 14px auto 20px; }
.faq-list { display: grid; gap: 10px; }
.faq-item {
  border: 1px solid var(--outline);
  border-radius: calc(var(--radius) - 4px);
  padding: 14px 16px;
  background: ${cardFill};
}
.faq-item summary { cursor: pointer; font-weight: 700; font-size: 1.04rem; }
.faq-item p { color: var(--muted); }
.contact-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
}
.contact-card {
  grid-column: span 6;
  border: 1px solid var(--outline);
  border-radius: var(--radius);
  padding: 24px;
  background: ${cardFill};
}
.contact-card h3 { margin: 0 0 10px; font-size: 1.8rem; font-family: var(--heading-font); }
.contact-card p { margin: 0 0 8px; color: var(--muted); }
.map-card {
  display: grid;
  place-items: center;
}

@media (min-width: 1100px) {
  .hero-copy { padding-right: 24px; }
  .section-heading h2 { font-size: clamp(2.1rem, 4vw, 3.35rem); }
}
.map-placeholder {
  width: 100%;
  min-height: 220px;
  border-radius: calc(var(--radius) - 6px);
  border: 1px dashed color-mix(in srgb, var(--outline) 72%, transparent);
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 600;
  text-align: center;
  padding: 16px;
}
[data-reveal] {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity .7s ease, transform .7s ease;
}
[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}
@media (max-width: 1100px) {
  .site-header { grid-template-columns: 1fr; text-align: center; }
  .top-nav { justify-content: center; }
  .hero { grid-template-columns: 1fr; }
  .feature-card { grid-column: span 12; }
  .gallery-item-1, .gallery-item-2, .gallery-item-3, .gallery-item-4 { grid-column: span 12; min-height: 260px; }
  .testimonial-card { grid-column: span 6; }
  .contact-card { grid-column: span 12; }
}
@media (max-width: 720px) {
  .site-shell { width: min(100%, calc(100% - 20px)); }
  .hero h1 { font-size: clamp(2.3rem, 12vw, 3.6rem); }
  .testimonial-card { grid-column: span 12; }
  .top-nav { gap: 10px; }
  .header-cta { display: none; }
}
`;
};

const buildJs = () => `
(() => {
  const reveals = document.querySelectorAll('.site-section, .feature-card, .testimonial-card, .gallery-item, .faq-item, .contact-card');
  reveals.forEach((el) => el.setAttribute('data-reveal', ''));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach((element) => observer.observe(element));

  const parallaxTarget = document.querySelector('.hero-media img');
  if (parallaxTarget) {
    window.addEventListener('mousemove', (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 1.6;
      const y = (event.clientY / window.innerHeight - 0.5) * 1.6;
      parallaxTarget.style.transform = 'scale(1.03) translate(' + x.toFixed(2) + '%, ' + y.toFixed(2) + '%)';
    });
  }
})();
`;

export function renderWebsiteArtifact(artifact: WebsiteArtifact): string {
	const normalizedSchema: WebsiteSchema = {
		...artifact.schema,
		theme: {
			...defaultTheme(),
			...artifact.schema.theme,
		},
		brand: {
			businessName: artifact.schema.brand?.businessName || "",
			category: artifact.schema.brand?.category || "",
			address: artifact.schema.brand?.address || "",
			phone: artifact.schema.brand?.phone || "",
			email: artifact.schema.brand?.email || "",
			websiteUri: artifact.schema.brand?.websiteUri || "",
		},
		seo: {
			title:
				artifact.schema.seo?.title ||
				artifact.schema.brand?.businessName ||
				"Website Preview",
			description: artifact.schema.seo?.description || "",
			keywords: artifact.schema.seo?.keywords || [],
		},
		sections: artifact.schema.sections || [],
	};

	const htmlBody = renderPageBody(normalizedSchema);

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(normalizedSchema.seo.description)}" />
  <title>${escapeHtml(normalizedSchema.seo.title)}</title>
  <style>${artifact.css || buildCss(normalizedSchema)}</style>
</head>
<body class="${getThemeClassName(normalizedSchema.theme)}">
  <main class="site-shell">
    ${renderHeader(normalizedSchema)}
    ${htmlBody}
  </main>
  <script>${artifact.js || buildJs()}</script>
</body>
</html>`;
}

export function createDefaultWebsiteArtifact(
	business: Business,
	schema: WebsiteSchema,
	content: { html: string; css: string; js: string },
): WebsiteArtifact {
	return {
		schema,
		html: content.html,
		css: content.css,
		js: content.js,
	};
}
