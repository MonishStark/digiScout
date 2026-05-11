/** @format */

import React from "react";
import { CalendarDays, Globe, Mail, Trash2, BadgeCheck } from "lucide-react";
import { WebsiteProject } from "../types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { deleteDeployedSite } from "../lib/netlify";
import { deleteProvisionedWordPressSite } from "../lib/wordpress-client";

interface OutreachViewProps {
	projects: WebsiteProject[];
	setProjects: React.Dispatch<React.SetStateAction<WebsiteProject[]>>;
}

export default function OutreachView({
	projects,
	setProjects,
}: OutreachViewProps) {
	const reachedOutLeads = projects.filter(
		(project) => project.emailSent || project.outreachStatus === "Sent",
	);

	const handleDeleteLead = async (projectId: string) => {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;

		const confirmDelete = window.confirm(
			`Delete ${project.businessName}? This will also remove the deployed website and permanently delete the lead.`,
		);
		if (!confirmDelete) return;

		try {
			if (project.siteId) {
				await deleteDeployedSite(project.siteId);
			}

			if (project.wordpressSiteId) {
				await deleteProvisionedWordPressSite(project.wordpressSiteId);
			}

			setProjects((prev) => prev.filter((item) => item.id !== projectId));
		} catch (error) {
			console.error("Failed to delete lead:", error);
			alert(
				error instanceof Error
					? error.message
					: "Failed to delete the lead and deployment.",
			);
		}
	};

	if (reachedOutLeads.length === 0) {
		return (
			<div className='p-8 h-full flex items-center justify-center text-center'>
				<div className='max-w-md'>
					<Mail className='w-14 h-14 text-white/20 mx-auto mb-4' />
					<h2 className='text-2xl font-bold text-white mb-2'>
						No Outreach Yet
					</h2>
					<p className='text-sm text-white/50'>
						Send a simulated outreach email from the Deployments tab and the
						lead will appear here with its deployment status.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className='p-8 h-full overflow-y-auto w-full max-w-7xl mx-auto space-y-6 pb-32'>
			<div className='flex items-center justify-between mb-8'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight text-white mb-2'>
						Outreach Leads
					</h2>
					<p className='text-sm text-white/50'>
						Leads you reached out to, with deployment status and deletion
						control.
					</p>
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
				{reachedOutLeads.map((project) => (
					<div
						key={project.id}
						className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl glass flex flex-col p-5 space-y-4'>
						<div className='flex items-start justify-between gap-3'>
							<div>
								<h3 className='font-bold text-lg text-white truncate'>
									{project.businessName}
								</h3>
								<p className='text-xs text-white/40 truncate'>
									{project.businessAddress}
								</p>
							</div>
							<Badge className='bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold text-[10px]'>
								<BadgeCheck className='w-3 h-3 mr-1' /> Outreach Sent
							</Badge>
						</div>

						<div className='space-y-2 text-sm'>
							<div className='flex items-center justify-between gap-3'>
								<span className='text-white/50'>Deployment</span>
								<Badge className='bg-white/10 text-white/80 border border-white/15'>
									{project.isDeployed ? "Live" : "Draft"}
								</Badge>
							</div>
							{project.deployedUrl && (
								<div className='rounded-lg bg-black/30 border border-white/5 px-3 py-2 text-xs truncate text-indigo-300'>
									<a
										href={project.deployedUrl}
										target='_blank'
										rel='noreferrer'
										className='hover:underline'>
										{project.deployedUrl}
									</a>
								</div>
							)}
							<div className='flex items-center justify-between gap-3'>
								<span className='text-white/50'>Email status</span>
								<span className='text-white/80'>Sent</span>
							</div>
							{project.outreachSentAt && (
								<div className='flex items-center gap-2 text-xs text-white/40'>
									<CalendarDays className='w-3.5 h-3.5' />
									{new Date(project.outreachSentAt).toLocaleString()}
								</div>
							)}
						</div>

						<div className='mt-auto pt-2'>
							<Button
								onClick={() => handleDeleteLead(project.id)}
								className='w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border-0 text-xs py-1.5 h-9'>
								<Trash2 className='w-3.5 h-3.5 mr-1.5' /> Delete Lead
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
