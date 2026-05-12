/** @format */

export interface Business {
	id: string;
	name: string;
	category: string;
	address: string;
	rating?: number;
	reviewCount?: number;
	location: google.maps.LatLngLiteral;
	websiteUri?: string;
	email?: string;
	phoneNumber?: string;
	photos?: string[];
	imageSuggestions?: string[];
	isOpen?: boolean;
}

export type WebsiteSectionType =
	| "hero"
	| "features"
	| "gallery"
	| "testimonials"
	| "contact"
	| "cta"
	| "faq";

export interface WebsiteTheme {
	name: string;
	style: string;
	radius: string;
	layout?:
		| "editorial"
		| "immersive"
		| "minimal"
		| "gallery-forward"
		| "split-screen";
	buttonStyle?: "pill" | "sharp" | "ghost";
	surfaceStyle?: "glass" | "solid" | "outline";
	mediaShape?: "rounded" | "arched" | "portrait" | "square";
	density?: "airy" | "balanced" | "compact";
	accentMode?: "neon" | "earthy" | "luxury" | "fresh";
	palette: {
		background: string;
		surface: string;
		primary: string;
		accent: string;
		text: string;
		muted: string;
		outline: string;
	};
	typography: {
		heading: string;
		body: string;
	};
}

export interface WebsiteBrand {
	businessName: string;
	category: string;
	address: string;
	phone?: string;
	email?: string;
	websiteUri?: string;
}

export interface WebsiteSEO {
	title: string;
	description: string;
	keywords: string[];
}

export interface HeroSection {
	id: string;
	type: "hero";
	variant: "split" | "centered" | "editorial" | "immersive";
	headline: string;
	subheadline: string;
	ctaPrimary: {
		label: string;
		href: string;
	};
	ctaSecondary?: {
		label: string;
		href: string;
	};
	badges?: string[];
	media?: {
		type: "image" | "video";
		src: string;
		alt: string;
	};
}

export interface FeatureSection {
	id: string;
	type: "features";
	layout: "cards" | "list";
	items: Array<{
		title: string;
		description: string;
		icon?: string;
	}>;
}

export interface GallerySection {
	id: string;
	type: "gallery";
	items: Array<{
		src: string;
		alt: string;
	}>;
}

export interface TestimonialSection {
	id: string;
	type: "testimonials";
	items: Array<{
		quote: string;
		author: string;
		role?: string;
	}>;
}

export interface ContactSection {
	id: string;
	type: "contact";
	showMap?: boolean;
	showHours?: boolean;
	showEmail?: boolean;
	showPhone?: boolean;
	hours?: string[];
}

export interface CtaSection {
	id: string;
	type: "cta";
	title: string;
	body: string;
	buttonLabel: string;
	buttonHref: string;
}

export interface FaqSection {
	id: string;
	type: "faq";
	items: Array<{
		question: string;
		answer: string;
	}>;
}

export type WebsiteSection =
	| HeroSection
	| FeatureSection
	| GallerySection
	| TestimonialSection
	| ContactSection
	| CtaSection
	| FaqSection;

export interface WebsiteSchema {
	meta: {
		siteId: string;
		businessId: string;
		slug: string;
		version: number;
		target: "static" | "wordpress";
	};
	theme: WebsiteTheme;
	brand: WebsiteBrand;
	seo: WebsiteSEO;
	sections: WebsiteSection[];
}

export interface WebsiteArtifact {
	schema: WebsiteSchema;
	html: string;
	css: string;
	js: string;
}

export interface Deployment {
	businessId: string;
	url: string;
	timestamp: string;
	websiteContent: {
		html: string;
		css: string;
		js: string;
	};
}

export type ProvisioningStatus =
	| "not_started"
	| "provisioning"
	| "ready"
	| "failed"
	| "dry-run";

export type ProvisioningStepStatus =
	| "pending"
	| "in_progress"
	| "completed"
	| "failed"
	| "dry-run";

export interface ProvisioningLogEntry {
	timestamp: string;
	step:
		| "subsite_creation"
		| "admin_creation"
		| "theme_activation"
		| "media_import"
		| "page_creation"
		| "homepage_assignment"
		| "credentials_setup";
	level: "info" | "error";
	message: string;
}

export interface WordPressProvisioningSite {
	siteId: number | string;
	siteSlug: string;
	siteUrl: string;
	adminUrl: string;
	ownerUsername: string;
	ownerEmail: string;
	passwordSetupUrl?: string;
}

export interface WordPressProvisioningState {
	wordpressSiteType?: "multisite";
	provisioningStatus?: ProvisioningStatus;
	wordpressSite?: WordPressProvisioningSite;
	wordpressSiteId?: number | string;
	wordpressSiteSlug?: string;
	wordpressSiteUrl?: string;
	wordpressAdminUrl?: string;
	wordpressOwnerUsername?: string;
	wordpressOwnerEmail?: string;
	wordpressPasswordSetupUrl?: string;
	subsiteCreationStatus?: ProvisioningStepStatus;
	adminCreationStatus?: ProvisioningStepStatus;
	themeInstallStatus?: ProvisioningStepStatus;
	mediaImportStatus?: ProvisioningStepStatus;
	contentImportStatus?: ProvisioningStepStatus;
	homepageSetupStatus?: ProvisioningStepStatus;
	credentialsStatus?: ProvisioningStepStatus;
	lastProvisionedAt?: string;
	provisioningLogs?: ProvisioningLogEntry[];
	provisioningError?: string;
}

export interface WebsiteProject extends WordPressProvisioningState {
	id: string;
	generatedAt?: string;
	businessId: string;
	businessName: string;
	businessCategory?: string;
	businessAddress: string;
	rating?: number;
	reviewCount?: number;
	email?: string;
	phoneNumber?: string;
	websiteContent: string;
	websiteSchema?: WebsiteSchema;
	wordpressBlocks?: string;
	isDeployed: boolean;
	isDeploying?: boolean;
	deploymentError?: string;
	deployedUrl?: string;
	siteId?: string;
	deployId?: string;
	outreachStatus?: OutreachStatus;
	outreachSentAt?: string;
	emailSent?: boolean;
}

export type OutreachStatus = "Pending" | "Sent" | "Replied";
