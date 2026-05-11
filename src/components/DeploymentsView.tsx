/** @format */

import React, { useState } from "react";
import { WebsiteProject } from "../types";
import {
	Globe,
	Mail,
	CheckCircle2,
	Activity,
	Eye,
	Trash2,
	MapPin,
	Star,
	BriefcaseBusiness,
	Phone,
	ShieldCheck,
	Clock3,
	Database,
	KeyRound,
	ExternalLink,
	Send,
	X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { deploySiteToNetlify, deleteDeployedSite } from "../lib/netlify";
import { deleteProvisionedWordPressSite } from "../lib/wordpress-client";

interface DeploymentsViewProps {
	projects: WebsiteProject[];
	setProjects: React.Dispatch<React.SetStateAction<WebsiteProject[]>>;
}

export default function DeploymentsView({
	projects,
	setProjects,
}: DeploymentsViewProps) {
	const [deployingId, setDeployingId] = useState<string | null>(null);
	const [sendingId, setSendingId] = useState<string | null>(null);
	const [outreachModalOpen, setOutreachModalOpen] = useState(false);
	const [outreachProjectId, setOutreachProjectId] = useState<string | null>(
		null,
	);
	const [outreachMessage, setOutreachMessage] = useState(
		"Hi! We've created a premium website for your business. Check it out and let us know what you think.",
	);
	const [outreachChannel, setOutreachChannel] = useState<"whatsapp" | "sms">(
		"whatsapp",
	);

	const clearDeploymentState = (projectId: string) => {
		setProjects((prev) =>
			prev.map((project) =>
				project.id === projectId
					? {
							...project,
							isDeployed: false,
							isDeploying: false,
							deployedUrl: undefined,
							siteId: undefined,
							deployId: undefined,
							deploymentError: undefined,
						}
					: project,
			),
		);
	};

	const handleDeploy = async (projectId: string) => {
		const project = projects.find((item) => item.id === projectId);
		if (!project || project.isDeploying) return;

		setDeployingId(projectId);
		setProjects((prev) =>
			prev.map((item) =>
				item.id === projectId
					? { ...item, isDeploying: true, deploymentError: undefined }
					: item,
			),
		);

		try {
			const deployedResult = await deploySiteToNetlify(
				project.websiteContent,
				project.businessName,
			);

			setProjects((prev) =>
				prev.map((item) =>
					item.id === projectId
						? {
								...item,
								isDeployed: true,
								deployedUrl: deployedResult.deployedUrl,
								siteId: deployedResult.siteId,
								deployId: deployedResult.deployId,
								isDeploying: false,
								deploymentError: undefined,
							}
						: item,
				),
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown deployment error";
			setProjects((prev) =>
				prev.map((item) =>
					item.id === projectId
						? { ...item, isDeploying: false, deploymentError: errorMessage }
						: item,
				),
			);
		} finally {
			setDeployingId(null);
		}
	};

	const stopDeployment = async (projectId: string) => {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return false;

		setDeployingId(projectId);

		try {
			if (project.siteId) {
				await deleteDeployedSite(project.siteId);
			}

			if (project.wordpressSiteId) {
				await deleteProvisionedWordPressSite(project.wordpressSiteId);
			}

			clearDeploymentState(projectId);
			return true;
		} catch (error) {
			console.error("Failed to stop deployment:", error);
			alert(
				error instanceof Error ? error.message : "Failed to stop deployment.",
			);
			return false;
		} finally {
			setDeployingId(null);
		}
	};

	const handleSendOutreach = (projectId: string) => {
		setOutreachProjectId(projectId);
		setOutreachModalOpen(true);
	};

	const sendOutreachMessage = async () => {
		const project = projects.find((item) => item.id === outreachProjectId);
		if (!project || !project.phoneNumber) return;

		setSendingId(outreachProjectId);
		const API_URL =
			((import.meta as any).env?.VITE_API_URL as string | undefined) ||
			"http://localhost:5001";

		try {
			const response = await fetch(`${API_URL}/api/outreach/send`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					businessName: project.businessName,
					phoneNumber: project.phoneNumber,
					message: outreachMessage,
					preferredChannel: outreachChannel,
				}),
			});

			const data = (await response.json()) as any;

			if (response.ok && data.success) {
				console.log(
					`[Outreach] Message sent via ${data.channel} to ${project.phoneNumber}`,
				);
				setProjects((prev) =>
					prev.map((item) =>
						item.id === outreachProjectId
							? {
									...item,
									emailSent: true,
									outreachStatus: `Sent via ${data.channel}`,
									outreachSentAt: new Date().toISOString(),
								}
							: item,
					),
				);
				setOutreachModalOpen(false);
				setOutreachMessage(
					"Hi! We've created a premium website for your business. Check it out and let us know what you think.",
				);
				setOutreachChannel("whatsapp");
				alert(`✓ Message sent via ${data.channel} to ${project.phoneNumber}`);
			} else {
				const errorMsg = data.error || "Failed to send message";
				console.error("[Outreach] Error:", errorMsg);
				alert(`✗ Error: ${errorMsg}`);
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : "Network error";
			console.error("[Outreach] Exception:", error);
			alert(`✗ Error: ${errorMsg}`);
		} finally {
			setSendingId(null);
		}
	};

	const handlePreview = (projectId: string) => {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;

		const win = window.open();
		if (!win) return;
		win.document.write(project.websiteContent);
		win.document.close();
	};

	const getGeneratedDate = (projectId: string) => {
		const [, timestamp] = projectId.split("-");
		if (!timestamp) return "Recently";
		const date = new Date(parseInt(timestamp));
		return `Generated on ${date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		})}`;
	};

	const handleDeleteLead = async (projectId: string) => {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;

		const confirmed = window.confirm(
			`Delete lead for ${project.businessName}? This cannot be undone.`,
		);
		if (!confirmed) return;

		try {
			const stopped = await stopDeployment(projectId);
			if (!stopped && (project.isDeployed || project.siteId)) {
				return;
			}

			setProjects((prev) => prev.filter((item) => item.id !== projectId));
		} catch (error) {
			console.error("Failed to delete lead:", error);
			alert(error instanceof Error ? error.message : "Failed to delete lead.");
		}
	};

	const displayProjects = [...projects].sort((left, right) => {
		const leftTime = Number(left.id.split("-")[1] || 0);
		const rightTime = Number(right.id.split("-")[1] || 0);
		return rightTime - leftTime;
	});

	const totalLeads = projects.length;
	const liveWebsites = projects.filter((project) => project.isDeployed).length;
	const cmsReadyWebsites = projects.filter(
		(project) => project.provisioningStatus === "ready",
	).length;
	const emailsSent = projects.filter((project) => project.emailSent).length;

	const getLeadStatusLabel = (project: WebsiteProject) => {
		if (project.emailSent) return "EMAIL SENT";
		if (project.isDeployed) return "WEBSITE LIVE";
		return "DRAFT";
	};

	const getLeadStatusTone = (project: WebsiteProject) => {
		if (project.emailSent) return "bg-amber-500/90 text-white";
		if (project.isDeployed) return "bg-violet-600/95 text-white";
		return "bg-slate-600/90 text-white/90";
	};

	const getProvisioningLabel = (project: WebsiteProject) => {
		switch (project.provisioningStatus) {
			case "ready":
				return "CMS Ready";
			case "provisioning":
				return "Provisioning";
			case "dry-run":
				return "Dry-Run";
			case "failed":
				return "Provisioning Failed";
			default:
				return "Not Started";
		}
	};

	const getProvisioningTone = (project: WebsiteProject) => {
		switch (project.provisioningStatus) {
			case "ready":
				return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
			case "provisioning":
				return "border-amber-400/20 bg-amber-500/10 text-amber-200";
			case "dry-run":
				return "border-slate-400/20 bg-slate-500/10 text-slate-200";
			case "failed":
				return "border-rose-400/20 bg-rose-500/10 text-rose-100";
			default:
				return "border-white/10 bg-white/5 text-white/70";
		}
	};

	const getCategoryLabel = (project: WebsiteProject) =>
		project.businessCategory || "General";

	const getRatingLabel = (project: WebsiteProject) => {
		if (typeof project.rating === "number") {
			return `${project.rating.toFixed(1)} Rating`;
		}

		return "N/A Rating";
	};

	if (projects.length === 0) {
		return (
			<div className='flex h-full flex-col items-center justify-center p-8 text-center text-white/40'>
				<Globe className='mb-4 h-16 w-16 opacity-20' />
				<h2 className='mb-2 text-xl font-medium text-white/70'>No Leads Yet</h2>
				<p className='max-w-md text-sm'>
					Generate a website prototype from the Discover tab to see it here.
				</p>
			</div>
		);
	}

	return (
		<div className='h-full min-h-0 w-full overflow-y-auto px-6 pb-32 lg:px-8'>
			<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6'>
				<div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
					<div className='space-y-2'>
						<p className='text-xs font-semibold uppercase tracking-[0.24em] text-violet-300/80'>
							Lead Management
						</p>
						<h2 className='text-3xl font-semibold tracking-tight text-white sm:text-4xl'>
							Leads List
						</h2>
						<p className='max-w-2xl text-sm text-white/55 sm:text-base'>
							Track generated previews, WordPress Multisite provisioning, and
							optional Netlify deployments in one place.
						</p>
					</div>
					<div className='flex items-center gap-3 self-start rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/55 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl'>
						<Clock3 className='h-4 w-4 text-violet-300' />
						Updated live from your latest generated leads
					</div>
				</div>

				<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
					{[
						{
							label: "Total Leads",
							value: totalLeads,
							icon: Globe,
							tone: "from-violet-500/20 via-white/5 to-transparent",
						},
						{
							label: "CMS Ready",
							value: cmsReadyWebsites,
							icon: Database,
							tone: "from-cyan-500/20 via-white/5 to-transparent",
						},
						{
							label: "Live Websites",
							value: liveWebsites,
							icon: CheckCircle2,
							tone: "from-emerald-500/20 via-white/5 to-transparent",
						},
						{
							label: "Emails Sent",
							value: emailsSent,
							icon: Mail,
							tone: "from-amber-500/20 via-white/5 to-transparent",
						},
					].map(({ label, value, icon: Icon, tone }) => (
						<div
							key={label}
							className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br ${tone} p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5 hover:border-violet-400/25`}>
							<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]' />
							<div className='relative flex items-start justify-between gap-4'>
								<div>
									<p className='text-sm text-white/50'>{label}</p>
									<p className='mt-2 text-3xl font-semibold tracking-tight text-white'>
										{value}
									</p>
								</div>
								<div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-violet-200'>
									<Icon className='h-5 w-5' />
								</div>
							</div>
						</div>
					))}
				</div>

				<div className='space-y-4'>
					{displayProjects.map((project) => {
						const isLive = project.isDeployed;
						const isSent = Boolean(project.emailSent);
						const statusLabel = getLeadStatusLabel(project);
						const isActionLoading = deployingId === project.id;

						return (
							<article
								key={project.id}
								className='group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.055] hover:shadow-[0_30px_100px_rgba(0,0,0,0.42)] sm:p-5 lg:p-6'>
								<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.08),transparent_25%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
								<div className='relative flex flex-col gap-5 xl:flex-row xl:items-stretch xl:gap-6'>
									<div className='relative h-[200px] w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#080815] shadow-[0_20px_50px_rgba(0,0,0,0.34)] sm:h-[220px] xl:h-auto xl:w-[320px] xl:flex-shrink-0'>
										<iframe
											srcDoc={project.websiteContent}
											title={`${project.businessName} preview`}
											sandbox='allow-scripts'
											className='h-full w-full border-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]'
										/>
										<div className='absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent' />
										<div className='absolute left-4 top-4 flex items-center gap-2'>
											<Badge className='rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/75 backdrop-blur-xl'>
												{getProvisioningLabel(project)}
											</Badge>
											<Badge
												className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${getLeadStatusTone(project)}`}>
												{statusLabel}
											</Badge>
										</div>
										{project.isDeploying && (
											<div className='absolute inset-0 flex items-center justify-center bg-[#070712]/55 backdrop-blur-[2px]'>
												<div className='flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.25)]'>
													<Activity className='h-4 w-4 animate-spin' />
													Deploying to Netlify
												</div>
											</div>
										)}
									</div>

									<div className='flex min-w-0 flex-1 flex-col gap-5'>
										<div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
											<div className='min-w-0 space-y-3'>
												<div className='flex flex-wrap items-center gap-2'>
													<Badge className='rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-violet-200'>
														{getCategoryLabel(project)}
													</Badge>
													<Badge className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/60'>
														{getRatingLabel(project)}
													</Badge>
													<Badge
														className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${getProvisioningTone(project)}`}>
														{getProvisioningLabel(project)}
													</Badge>
													{project.isDeployed && (
														<Badge className='rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200'>
															Live on Netlify
														</Badge>
													)}
												</div>
												<div className='space-y-1'>
													<h3 className='truncate text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]'>
														{project.businessName}
													</h3>
													<p className='flex flex-wrap items-center gap-2 text-sm text-white/50'>
														<span className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5'>
															<MapPin className='h-3.5 w-3.5 text-violet-300' />
															{project.businessAddress}
														</span>
														<span className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5'>
															<ShieldCheck className='h-3.5 w-3.5 text-emerald-300' />
															{getGeneratedDate(project.id)}
														</span>
													</p>
													{project.wordpressSiteUrl && (
														<a
															href={project.wordpressSiteUrl}
															target='_blank'
															rel='noreferrer'
															className='inline-flex max-w-full items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20'>
															<Database className='h-3.5 w-3.5 flex-shrink-0' />
															<span className='truncate'>
																{project.wordpressSiteUrl}
															</span>
														</a>
													)}
													{project.wordpressAdminUrl && (
														<a
															href={project.wordpressAdminUrl}
															target='_blank'
															rel='noreferrer'
															className='inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.07]'>
															<KeyRound className='h-3.5 w-3.5 flex-shrink-0' />
															<span className='truncate'>WP Admin</span>
															<ExternalLink className='h-3 w-3 flex-shrink-0' />
														</a>
													)}
													{project.deployedUrl && (
														<a
															href={project.deployedUrl}
															target='_blank'
															rel='noreferrer'
															className='inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20'>
															<Globe className='h-3.5 w-3.5 flex-shrink-0' />
															<span className='truncate'>
																{project.deployedUrl}
															</span>
														</a>
													)}
												</div>
											</div>

											<div className='flex flex-col gap-3 xl:items-end'>
												<div className='flex flex-wrap items-center gap-2 xl:justify-end'>
													{isSent && (
														<Badge className='rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-100'>
															Outreach sent
														</Badge>
													)}
												</div>
												<div className='flex flex-wrap items-center gap-2 xl:justify-end'>
													<Button
														onClick={() => handlePreview(project.id)}
														variant='outline'
														className='h-10 rounded-2xl border-white/10 bg-white/[0.03] px-4 text-white hover:bg-white/8'>
														<Eye className='mr-2 h-4 w-4' />
														Preview
													</Button>
													<Button
														onClick={() =>
															isLive
																? stopDeployment(project.id)
																: handleDeploy(project.id)
														}
														disabled={project.isDeploying || isActionLoading}
														className={`h-10 rounded-2xl px-4 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
															isLive
																? "border border-rose-400/20 bg-rose-500/10 hover:bg-rose-500/20"
																: "bg-violet-500 shadow-[0_18px_40px_rgba(139,92,246,0.22)] hover:bg-violet-400"
														}`}>
														{isActionLoading ? (
															<Activity className='mr-2 h-4 w-4 animate-spin' />
														) : isLive ? (
															<ShieldCheck className='mr-2 h-4 w-4' />
														) : (
															<Globe className='mr-2 h-4 w-4' />
														)}
														{isActionLoading
															? isLive
																? "Stopping..."
																: "Deploying..."
															: isLive
																? "Stop Deployment"
																: "Deploy"}
													</Button>
													<Button
														onClick={() => handleSendOutreach(project.id)}
														disabled={
															!project.isDeployed || sendingId === project.id
														}
														className='h-10 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60'>
														{sendingId === project.id ? (
															<Activity className='mr-2 h-4 w-4 animate-spin' />
														) : (
															<Mail className='mr-2 h-4 w-4' />
														)}
														Send Outreach
													</Button>
													<Button
														onClick={() => handleDeleteLead(project.id)}
														variant='outline'
														className='h-10 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20'>
														<Trash2 className='mr-2 h-4 w-4' />
														Delete Lead
													</Button>
												</div>
											</div>
										</div>

										{project.deploymentError && (
											<div className='rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'>
												{project.deploymentError}
											</div>
										)}

										{project.provisioningError && (
											<div className='rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'>
												WordPress provisioning issue:
												<span className='mt-1 block text-xs text-rose-200/75'>
													{project.provisioningError}
												</span>
											</div>
										)}

										<div className='relative flex items-center justify-between gap-3 border-t border-white/10 pt-4'>
											<div className='flex flex-wrap items-center gap-3 text-xs text-white/45'>
												<span className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5'>
													<BriefcaseBusiness className='h-3.5 w-3.5 text-violet-300' />
													{project.businessCategory || "General"}
												</span>
												<span className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5'>
													<Phone className='h-3.5 w-3.5 text-cyan-300' />
													{project.phoneNumber || "No phone listed"}
												</span>
												<span className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5'>
													<Mail className='h-3.5 w-3.5 text-amber-300' />
													{project.email || "No email listed"}
												</span>
												{project.wordpressOwnerUsername && (
													<span className='inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-cyan-100'>
														<KeyRound className='h-3.5 w-3.5 text-cyan-300' />
														{project.wordpressOwnerUsername}
													</span>
												)}
											</div>
											<div className='text-xs text-white/35'>
												{project.provisioningStatus === "ready"
													? "Dedicated WordPress CMS ready"
													: project.provisioningStatus === "provisioning"
														? "Provisioning WordPress site"
														: isLive
															? "Deployment is live"
															: project.isDeploying
																? "Deploying now"
																: "Ready to deploy"}
											</div>
										</div>
									</div>
								</div>
							</article>
						);
					})}
				</div>
			</div>

			{/* Outreach Modal */}
			{outreachModalOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
					<div className='w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl'>
						<div className='flex items-center justify-between mb-4'>
							<h2 className='text-xl font-semibold text-white'>
								Send Outreach
							</h2>
							<button
								onClick={() => setOutreachModalOpen(false)}
								className='text-white/50 hover:text-white transition-colors'>
								<X className='h-5 w-5' />
							</button>
						</div>

						<div className='space-y-4'>
							{/* Business Info */}
							<div className='rounded-lg border border-white/10 bg-white/5 p-3'>
								<p className='text-sm text-white/60'>To:</p>
								<p className='text-white font-medium'>
									{projects.find((p) => p.id === outreachProjectId)
										?.businessName || "Unknown"}
								</p>
								<p className='text-sm text-white/60'>
									{projects.find((p) => p.id === outreachProjectId)
										?.phoneNumber || "No phone"}
								</p>
							</div>

							{/* Channel Selection */}
							<div>
								<label className='block text-sm font-medium text-white mb-2'>
									Channel
								</label>
								<div className='flex gap-2'>
									<button
										onClick={() => setOutreachChannel("whatsapp")}
										className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
											outreachChannel === "whatsapp"
												? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
												: "border-white/10 bg-white/5 text-white hover:bg-white/10"
										}`}>
										WhatsApp
									</button>
									<button
										onClick={() => setOutreachChannel("sms")}
										className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
											outreachChannel === "sms"
												? "border-blue-400 bg-blue-500/10 text-blue-100"
												: "border-white/10 bg-white/5 text-white hover:bg-white/10"
										}`}>
										SMS
									</button>
								</div>
							</div>

							{/* Message Input */}
							<div>
								<label className='block text-sm font-medium text-white mb-2'>
									Message
								</label>
								<textarea
									value={outreachMessage}
									onChange={(e) => setOutreachMessage(e.currentTarget.value)}
									className='w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500'
									rows={4}
									placeholder='Enter your outreach message...'
								/>
								<p className='text-xs text-white/40 mt-1'>
									{outreachMessage.length}/160 characters
								</p>
							</div>

							{/* Actions */}
							<div className='flex gap-2 pt-2'>
								<Button
									onClick={() => setOutreachModalOpen(false)}
									variant='outline'
									className='flex-1 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10'>
									Cancel
								</Button>
								<Button
									onClick={sendOutreachMessage}
									disabled={sendingId !== null || !outreachMessage.trim()}
									className='flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed'>
									{sendingId ? (
										<>
											<Activity className='mr-2 h-4 w-4 animate-spin' />
											Sending...
										</>
									) : (
										<>
											<Send className='mr-2 h-4 w-4' />
											Send {outreachChannel === "whatsapp" ? "WhatsApp" : "SMS"}
										</>
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
