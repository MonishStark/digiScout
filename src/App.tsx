/**
 * @format
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
	APIProvider,
	Map,
	AdvancedMarker,
	Pin,
	useMap,
	useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
	SearchIcon,
	MapPin,
	Globe,
	Star,
	Users,
	Briefcase,
	Mail,
} from "lucide-react";

import { Business, WebsiteProject } from "./types";
import Sidebar from "./components/Sidebar";
import MapArea from "./components/MapArea";
import DeploymentsView from "./components/DeploymentsView";

const API_KEY =
	process.env.GOOGLE_MAPS_PLATFORM_KEY ||
	(import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
	(globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
	"";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

export default function App() {
	const [businesses, setBusinesses] = useState<Business[]>([]);
	const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
		null,
	);

	const [projects, setProjects] = useState<WebsiteProject[]>([]);
	const [activePage, setActivePage] = useState<"discover" | "leads">(
		"discover",
	);

	if (!hasValidKey) {
		return (
			<div className='flex items-center justify-center h-screen font-sans bg-[#050505] text-white'>
				<div className='text-center max-w-lg p-8 border border-white/10 rounded-2xl glass shadow-2xl'>
					<h2 className='text-2xl font-bold mb-4 font-sans tracking-tight'>
						API Key Required
					</h2>
					<p className='mb-4 text-white/50'>
						Digital Scout requires a Google Maps Platform API key.
					</p>
					<ul className='text-left leading-relaxed space-y-2 mb-6'>
						<li>
							<span className='font-semibold text-indigo-400'>Step 1:</span>{" "}
							<a
								className='underline hover:text-white transition-colors'
								href='https://console.cloud.google.com/google/maps-apis/start'
								target='_blank'
								rel='noopener'>
								Get an API Key
							</a>
						</li>
						<li>
							<span className='font-semibold text-indigo-400'>Step 2:</span>{" "}
							Open <strong>Settings</strong> (⚙️ gear icon,{" "}
							<strong>top-right corner</strong>)
						</li>
						<li>
							<span className='font-semibold text-indigo-400'>Step 3:</span>{" "}
							Select <strong>Secrets</strong>
						</li>
						<li>
							<span className='font-semibold text-indigo-400'>Step 4:</span>{" "}
							Type{" "}
							<code className='bg-white/10 px-1 py-0.5 rounded'>
								GOOGLE_MAPS_PLATFORM_KEY
							</code>
							, paste your key, and press Enter
						</li>
					</ul>
				</div>
			</div>
		);
	}

	return (
		<APIProvider apiKey={API_KEY} version='weekly'>
			<div className='flex h-screen w-full bg-[#050505] text-white overflow-hidden relative'>
				{/* Decorative background gradients */}
				<div className='absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none' />
				<div className='absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none' />

				<Sidebar
					businesses={businesses}
					setBusinesses={setBusinesses}
					selectedBusiness={selectedBusiness}
					setSelectedBusiness={setSelectedBusiness}
				/>
				<div className='flex-1 relative flex min-h-0 flex-col map-bg border-t border-white/5 md:border-t-0'>
					<nav className='h-16 px-8 flex items-center justify-between border-b border-white/5 bg-[#050505]/50 backdrop-blur-xl z-20 absolute top-0 w-full'>
						<div className='flex gap-6 h-full items-center'>
							<button
								onClick={() => setActivePage("discover")}
								className={`text-sm font-medium h-full flex items-center pt-[2px] transition-all ${activePage === "discover" ? "text-white border-b-2 border-indigo-500" : "text-white/40 hover:text-white/60"}`}>
								Discover
							</button>
							<button
								onClick={() => setActivePage("leads")}
								className={`text-sm font-medium h-full flex items-center pt-[2px] transition-all ${activePage === "leads" ? "text-white border-b-2 border-indigo-500" : "text-white/40 hover:text-white/60"}`}>
								Leads{" "}
								{projects.length > 0 && (
									<span className='ml-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full'>
										{projects.length}
									</span>
								)}
							</button>
						</div>
						<div className='flex items-center gap-4'>
							<div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10'>
								<div className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse'></div>
								<span className='text-xs text-white/70'>
									Gemini 3.1 Pro Active
								</span>
							</div>
							<div className='w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center'>
								<span className='text-[10px] font-bold'>DS</span>
							</div>
						</div>
					</nav>

					<div className='flex-1 relative min-h-0 pt-16'>
						{activePage === "discover" ? (
							<MapArea
								businesses={businesses}
								selectedBusiness={selectedBusiness}
								setSelectedBusiness={setSelectedBusiness}
								setProjects={setProjects}
								setActivePage={setActivePage}
								projects={projects}
							/>
						) : (
							<DeploymentsView projects={projects} setProjects={setProjects} />
						)}
					</div>
				</div>
			</div>
		</APIProvider>
	);
}
