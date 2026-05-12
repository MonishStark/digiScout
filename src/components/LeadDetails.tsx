/** @format */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Phone,
	Star,
	MapPin,
	Wand2,
	Rocket,
	Mail,
	CheckCircle2,
	ChevronRight,
} from "lucide-react";
import { Business, WebsiteProject } from "../types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { generateWebsite } from "../lib/gemini";
import { renderWebsiteArtifact } from "../lib/website-renderer";
import { schemaToGutenbergBlocks } from "../lib/wordpress";
import { provisionWordPressSite } from "../lib/wordpress-client";

interface LeadDetailsProps {
	business: Business;
	projects?: WebsiteProject[];
	setProjects?: React.Dispatch<React.SetStateAction<WebsiteProject[]>>;
	setActivePage?: (page: "discover" | "leads") => void;
}

export default function LeadDetails({
	business,
	projects = [],
	setProjects,
	setActivePage,
}: LeadDetailsProps) {
	const [isGenerating, setIsGenerating] = useState(false);

	const existingProject = projects.find((p) => p.businessId === business.id);

	const getImageSources = () => {
		const imageSources = [
			...(business.photos || []),
			...(business.imageSuggestions || []),
		];

		const category = business.category.toLowerCase();
		const fallbackMap: Record<string, string[]> = {
			restaurant: [
				"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
				"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
			],
			bar: [
				"https://images.unsplash.com/photo-1541544181074-e33f5e69f2c9?auto=format&fit=crop&w=1200&q=80",
			],
			gym: [
				"https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
			],
			salon: [
				"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
			],
			cafe: [
				"https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80",
			],
			spa: [
				"https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
			],
		};

		Object.entries(fallbackMap).forEach(([key, values]) => {
			if (category.includes(key)) {
				imageSources.push(...values);
			}
		});

		return Array.from(new Set(imageSources)).slice(0, 4);
	};

	const handleGenerate = async () => {
		setIsGenerating(true);
		try {
			console.log("[Generate] Starting website generation for:", business.name);
			const schema = await generateWebsite(business);
			console.log("[Generate] Schema generated:", schema.meta?.siteId);
			const combinedCode = renderWebsiteArtifact({
				schema,
				html: "",
				css: "",
				js: "",
			});
			const wordpressBlocks = schemaToGutenbergBlocks(schema);

			if (setProjects) {
				const newId = business.id + "-" + Date.now();
				const generatedAt = new Date().toISOString();
				setProjects((prev) => {
					const filtered = prev.filter((p) => p.businessId !== business.id);
					return [
						...filtered,
						{
							id: newId,
							generatedAt,
							businessId: business.id,
							businessName: business.name,
							businessCategory: business.category,
							businessAddress: business.address,
							rating: business.rating,
							reviewCount: business.reviewCount,
							email: business.email,
							phoneNumber: business.phoneNumber,
							websiteContent: combinedCode,
							websiteSchema: schema,
							wordpressBlocks,
							isDeployed: false,
							isDeploying: false,
							wordpressSiteType: "multisite",
							provisioningStatus: "provisioning",
							subsiteCreationStatus: "pending",
							adminCreationStatus: "pending",
							themeInstallStatus: "pending",
							mediaImportStatus: "pending",
							contentImportStatus: "pending",
							homepageSetupStatus: "pending",
							credentialsStatus: "pending",
							outreachStatus: "Pending",
						},
					];
				});

				try {
					console.log(
						"[WordPress Provision] Starting subsite provisioning for:",
						business.name,
					);
					setProjects((prev) =>
						prev.map((p) =>
							p.id === newId
								? {
										...p,
										provisioningStatus: "provisioning",
										subsiteCreationStatus: "in_progress",
									}
								: p,
						),
					);

					const provisionResult = await provisionWordPressSite({
						projectId: newId,
						business,
						websiteSchema: schema,
					});

					setProjects((prev) =>
						prev.map((p) =>
							p.id === newId
								? {
										...p,
										wordpressSiteType: "multisite",
										provisioningStatus: provisionResult.provisioningStatus,
										wordpressSite: provisionResult.site,
										wordpressSiteId: provisionResult.site?.siteId,
										wordpressSiteSlug: provisionResult.site?.siteSlug,
										wordpressSiteUrl: provisionResult.site?.siteUrl,
										wordpressAdminUrl: provisionResult.site?.adminUrl,
										wordpressOwnerUsername: provisionResult.site?.ownerUsername,
										wordpressOwnerEmail: provisionResult.site?.ownerEmail,
										wordpressPasswordSetupUrl:
											provisionResult.site?.passwordSetupUrl,
										subsiteCreationStatus:
											provisionResult.subsiteCreationStatus,
										adminCreationStatus: provisionResult.adminCreationStatus,
										themeInstallStatus: provisionResult.themeInstallStatus,
										mediaImportStatus: provisionResult.mediaImportStatus,
										contentImportStatus: provisionResult.contentImportStatus,
										homepageSetupStatus: provisionResult.homepageSetupStatus,
										credentialsStatus: provisionResult.credentialsStatus,
										provisioningLogs: provisionResult.logs,
										provisioningError:
											provisionResult.error ||
											(provisionResult.dryRun
												? provisionResult.message
												: undefined),
										lastProvisionedAt: new Date().toISOString(),
									}
								: p,
						),
					);
				} catch (provisionErr) {
					console.error("[WordPress Provision] Error:", provisionErr);
					setProjects((prev) =>
						prev.map((p) =>
							p.id === newId
								? {
										...p,
										provisioningStatus: "failed",
										subsiteCreationStatus: "failed",
										adminCreationStatus: "failed",
										themeInstallStatus: "failed",
										mediaImportStatus: "failed",
										contentImportStatus: "failed",
										homepageSetupStatus: "failed",
										credentialsStatus: "failed",
										provisioningError: String(provisionErr),
										provisioningLogs: [
											{
												timestamp: new Date().toISOString(),
												step: "subsite_creation",
												level: "error",
												message: String(provisionErr),
											},
										],
									}
								: p,
						),
					);
				}
			}
		} catch (error) {
			console.error(error);
			alert("Failed to generate website. Check console.");
		} finally {
			setIsGenerating(false);
		}
	};

	const imageSources = getImageSources();

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.95, y: 20 }}
				transition={{ type: "spring", stiffness: 300, damping: 25 }}
				className='absolute top-20 right-10 w-[450px] max-h-[calc(100vh-100px)] flex flex-col glass rounded-2xl shadow-2xl overflow-hidden z-50 accent-glow text-white'>
				<div className='p-6 border-b border-white/5 relative'>
					<div className='absolute top-0 right-0 p-4 opacity-10 pointer-events-none'>
						<Rocket className='w-24 h-24' />
					</div>
					<div className='flex items-start justify-between relative z-10'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight mb-1'>
								{business.name}
							</h2>
							<div className='flex items-center text-sm text-white/50 gap-3'>
								<span className='flex items-center'>
									<MapPin className='w-3.5 h-3.5 mr-1' /> {business.address}
								</span>
							</div>
						</div>
					</div>

					<div className='flex items-center gap-4 mt-4 relative z-10 flex-wrap'>
						<div className='flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5'>
							<Star className='w-3.5 h-3.5 text-yellow-400 fill-yellow-400' />
							<span className='text-sm font-bold text-yellow-400'>
								{business.rating || "N/A"}
							</span>
							<span className='text-[10px] text-white/40'>
								({business.reviewCount || 0} reviews)
							</span>
						</div>
						{business.phoneNumber && (
							<div className='flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5'>
								<Phone className='w-3.5 h-3.5 text-white/50' />
								<span className='text-sm text-white/80'>
									{business.phoneNumber}
								</span>
							</div>
						)}
						{business.email && (
							<div className='flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5'>
								<Mail className='w-3.5 h-3.5 text-white/50' />
								<span className='text-sm text-white/80 truncate max-w-[180px]'>
									{business.email}
								</span>
							</div>
						)}
						<Badge
							variant='outline'
							className='ml-auto bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase font-bold text-[10px]'>
							No Website
						</Badge>
					</div>
				</div>

				<div className='p-6 space-y-6 overflow-y-auto'>
					{imageSources.length > 0 && (
						<div className='grid grid-cols-2 gap-3'>
							{imageSources.slice(0, 4).map((image, index) => (
								<div
									key={`${image}-${index}`}
									className='rounded-xl overflow-hidden border border-white/10 bg-white/5 h-28'>
									<img
										src={image}
										alt={`${business.name} visual ${index + 1}`}
										className='w-full h-full object-cover'
									/>
								</div>
							))}
						</div>
					)}

					{!existingProject ? (
						<div className='bg-white/5 border border-white/5 rounded-xl p-6 text-center'>
							<div className='w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto mb-4'>
								<Wand2 className='w-8 h-8 text-indigo-400' />
							</div>
							<h3 className='text-lg font-bold mb-2'>
								Automated Pitch Generation
							</h3>
							<p className='text-xs text-white/50 mb-6 max-w-sm mx-auto'>
								Use Gemini 3.1 Pro to create a premium website schema, preview
								it instantly, and provision a dedicated WordPress Multisite CMS
								for {business.name}.
							</p>
							<Button
								onClick={handleGenerate}
								disabled={isGenerating}
								className='w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 text-white border-0 h-12'>
								{isGenerating ? (
									<span className='flex items-center gap-2'>
										<Wand2 className='w-5 h-5 animate-spin' /> Generating &
										Provisioning...
									</span>
								) : (
									<span className='flex items-center gap-2'>
										<Wand2 className='w-5 h-5' /> Generate & Provision Website
									</span>
								)}
							</Button>
						</div>
					) : (
						<div className='bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center'>
							<div className='w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4'>
								<CheckCircle2 className='w-8 h-8 text-emerald-400' />
							</div>
							<h3 className='text-lg font-bold mb-2 text-emerald-400'>
								Website Generated!
							</h3>
							<p className='text-xs text-white/50 mb-6 max-w-sm mx-auto'>
								The website for {business.name} is in the leads dashboard with
								its WordPress Multisite provisioning status, site URL, and admin
								access details.
							</p>
							<Button
								onClick={() => setActivePage?.("leads")}
								className='w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold text-sm transition-all text-white border border-white/10 h-12'>
								Go to Leads <ChevronRight className='w-4 h-4 ml-1' />
							</Button>
						</div>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
