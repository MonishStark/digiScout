/** @format */

import { useState } from "react";
import {
	SearchIcon,
	Globe,
	MapPin,
	Building,
	Activity,
	SlidersHorizontal,
	Star,
} from "lucide-react";
import { useMapsLibrary, useMap } from "@vis.gl/react-google-maps";

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Business } from "../types";
import { cn } from "../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface SidebarProps {
	businesses: Business[];
	setBusinesses: (b: Business[]) => void;
	selectedBusiness: Business | null;
	setSelectedBusiness: (b: Business | null) => void;
}

type ContactFilter = "all" | "email" | "phone_only";

const API_URL =
	((import.meta as any).env?.VITE_API_URL as string | undefined) ||
	"http://localhost:5001";

async function enrichBusinessContacts(businesses: Business[]) {
	const enrichedBusinesses = await Promise.all(
		businesses.map(async (business) => {
			if (!business.websiteUri) {
				return business;
			}

			try {
				const response = await fetch(`${API_URL}/api/enrich-business`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						websiteUri: business.websiteUri,
						businessName: business.name,
						category: business.category,
					}),
				});

				if (!response.ok) {
					return business;
				}

				const data = await response.json();
				return {
					...business,
					email: data.email,
					phoneNumber: business.phoneNumber || data.phones?.[0],
					imageSuggestions: data.imageSuggestions || [],
				};
			} catch {
				return business;
			}
		}),
	);

	return enrichedBusinesses;
}

async function qualifyLeads(
	businesses: Business[],
	city: string,
	category: string,
) {
	const response = await fetch(`${API_URL}/api/qualify-leads`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			businesses,
			city,
			category,
		}),
	});

	if (!response.ok) {
		throw new Error(`Lead qualification failed: ${response.statusText}`);
	}

	const data = await response.json();
	return (data.businesses || []) as Business[];
}

export default function Sidebar({
	businesses,
	setBusinesses,
	selectedBusiness,
	setSelectedBusiness,
}: SidebarProps) {
	const [city, setCity] = useState("");
	const [category, setCategory] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [contactFilter, setContactFilter] =
		useState<ContactFilter>("all");

	const [activeTab, setActiveTab] = useState("search");

	const placesLib = useMapsLibrary("places");
	const geocodingLib = useMapsLibrary("geocoding");
	const map = useMap();
	const emailLeads = businesses.filter((business) => Boolean(business.email));
	const phoneOnlyLeads = businesses.filter(
		(business) => !business.email && Boolean(business.phoneNumber),
	);
	const filteredBusinesses = businesses.filter((business) => {
		if (contactFilter === "email") return Boolean(business.email);
		if (contactFilter === "phone_only") {
			return !business.email && Boolean(business.phoneNumber);
		}
		return true;
	});

	const handleSearch = async () => {
		if (!city || !category || !placesLib || !geocodingLib || !map) return;
		setIsLoading(true);
		setError(null);

		try {
			// First, get Coordinates for the City
			const geocoder = new geocodingLib.Geocoder();
			const geoResult = await geocoder.geocode({ address: city });
			if (!geoResult.results || geoResult.results.length === 0) {
				setIsLoading(false);
				return;
			}

			const location = geoResult.results[0].geometry.location;

			// Pan map to search area
			map.panTo(location);
			map.setZoom(12);

			// Search Nearby
			const request = {
				textQuery: `${category} in ${city}`,
				fields: [
					"id",
					"displayName",
					"location",
					"formattedAddress",
					"rating",
					"userRatingCount",
					"websiteURI",
					"nationalPhoneNumber",
					"photos",
					"businessStatus",
				],
				locationBias: location,
				maxResultCount: 20,
			};

			const { places } = await placesLib.Place.searchByText(request);

			if (!places) {
				setBusinesses([]);
				setActiveTab("results");
				return;
			}

			// Filter: ONLY include businesses that DO NOT have a website, or if we consider them outdated (for now we stick to no website for strict filtering, or just flag them)
			const parsedBusinesses: Business[] = places.map((p) => {
				return {
					id: p.id!,
					name: p.displayName || "Unknown Business",
					category: category,
					address: p.formattedAddress || "",
					rating: p.rating || 0,
					reviewCount: p.userRatingCount || 0,
					location: { lat: p.location!.lat(), lng: p.location!.lng() },
					websiteUri: p.websiteURI || undefined,
					phoneNumber: p.nationalPhoneNumber || undefined,
					photos: p.photos
						? p.photos.map((photo) => photo.getURI({ maxWidth: 400 }))
						: [],
					isOpen: p.businessStatus === "OPERATIONAL",
				};
			});

			const websiteMissingCandidates = parsedBusinesses.filter(
				(b) => !b.websiteUri,
			);
			const candidatesToQualify =
				websiteMissingCandidates.length > 0
					? websiteMissingCandidates
					: parsedBusinesses;
			const enrichedBusinesses =
				await enrichBusinessContacts(candidatesToQualify);
			const qualifiedBusinesses = await qualifyLeads(
				enrichedBusinesses,
				city,
				category,
			);

			setContactFilter("all");
			setBusinesses(qualifiedBusinesses);
			setActiveTab("results");
		} catch (err: any) {
			console.error(err);
			setError(err?.message || "An error occurred during search.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='w-80 h-full border-r border-white/10 bg-[#0a0a0a] flex flex-col z-20'>
			<div className='p-6 pb-4 flex items-center gap-2 border-b border-white/5'>
				<div className='w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white'>
					DS
				</div>
				<h1 className='text-lg font-semibold tracking-tight'>Digital Scout</h1>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className='flex-1 flex flex-col'>
				<div className='px-6 py-2 border-b border-white/5'>
					<TabsList className='grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-xl p-1'>
						<TabsTrigger
							value='search'
							className='rounded-lg text-xs font-medium uppercase tracking-wider text-white/50 data-[state=active]:bg-indigo-600 data-[state=active]:text-white'>
							Search
						</TabsTrigger>
						<TabsTrigger
							value='results'
							className='rounded-lg text-xs font-medium uppercase tracking-wider text-white/50 data-[state=active]:bg-indigo-600 data-[state=active]:text-white'>
							Results{" "}
							{businesses.length > 0 && (
								<Badge
									variant='secondary'
									className='ml-2 bg-white/10 text-white'>
									{businesses.length}
								</Badge>
							)}
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value='search' className='flex-1 p-6 space-y-6 mt-0'>
					<div className='space-y-4'>
						{error && (
							<div className='bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-medium'>
								{error}
							</div>
						)}
						<div className='space-y-1.5'>
							<label className='text-[10px] uppercase tracking-wider text-white/40 font-bold'>
								Location
							</label>
							<Input
								placeholder='e.g. Austin, TX'
								value={city}
								onChange={(e) => setCity(e.target.value)}
								className='w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder:text-white/30'
							/>
						</div>
						<div className='space-y-1.5'>
							<label className='text-[10px] uppercase tracking-wider text-white/40 font-bold'>
								Business Type
							</label>
							<Input
								placeholder='e.g. Restaurants, Gyms, Salons'
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className='w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder:text-white/30'
							/>
						</div>

						<div className='flex gap-2 pt-2'>
							<Button
								onClick={handleSearch}
								disabled={isLoading || !city || !category}
								className='flex-1 bg-indigo-600 hover:bg-indigo-500 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20 text-white border-0 h-9'>
								{isLoading ? (
									<span className='flex items-center gap-2'>
										<Activity className='w-4 h-4 animate-spin' />
										Scanning...
									</span>
								) : (
									<span className='flex items-center gap-2'>
										<SearchIcon className='w-4 h-4' />
										Scan Area
									</span>
								)}
							</Button>
						</div>
					</div>

					<div className='rounded-xl p-4 bg-white/[0.02] border border-white/5 relative overflow-hidden text-white/50'>
						<p className='text-[11px] leading-relaxed'>
							<strong>How it works:</strong> The Scout agent uses Google Search
							and Map Grounding to locate businesses in your target area
							completely lacking a web presence.
						</p>
					</div>
				</TabsContent>

				<TabsContent
					value='results'
					className='flex-1 mt-0 flex flex-col h-[calc(100vh-170px)]'>
					{businesses.length > 0 && (
						<div className='px-4 py-3 border-b border-white/5 space-y-2'>
							<p className='text-[10px] uppercase tracking-wider text-white/35 font-bold'>
								Contact Filter
							</p>
							<div className='flex flex-wrap gap-2'>
								<button
									onClick={() => setContactFilter("all")}
									className={cn(
										"px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors",
										contactFilter === "all"
											? "bg-indigo-600 border-indigo-500 text-white"
											: "bg-white/5 border-white/10 text-white/60 hover:text-white",
									)}>
									All ({businesses.length})
								</button>
								<button
									onClick={() => setContactFilter("email")}
									className={cn(
										"px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors",
										contactFilter === "email"
											? "bg-indigo-600 border-indigo-500 text-white"
											: "bg-white/5 border-white/10 text-white/60 hover:text-white",
									)}>
									Has Email ({emailLeads.length})
								</button>
								<button
									onClick={() => setContactFilter("phone_only")}
									className={cn(
										"px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors",
										contactFilter === "phone_only"
											? "bg-indigo-600 border-indigo-500 text-white"
											: "bg-white/5 border-white/10 text-white/60 hover:text-white",
									)}>
									Phone Only ({phoneOnlyLeads.length})
								</button>
							</div>
						</div>
					)}
					{businesses.length === 0 ? (
						<div className='flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40'>
							<Building className='w-12 h-12 mb-4 opacity-20' />
							<p className='text-sm'>No leads discovered yet.</p>
						</div>
					) : filteredBusinesses.length === 0 ? (
						<div className='flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40'>
							<Building className='w-12 h-12 mb-4 opacity-20' />
							<p className='text-sm'>No leads match the current filter.</p>
						</div>
					) : (
						<ScrollArea className='flex-1'>
							<div className='p-4 space-y-2'>
								{filteredBusinesses.map((business) => (
									<div
										key={business.id}
										className={cn(
											"sidebar-item p-3 rounded-lg border border-white/5 bg-white/[0.02] cursor-pointer transition-all",
											selectedBusiness?.id === business.id
												? "border-l-2 border-l-indigo-500 bg-white/5"
												: "opacity-70 hover:opacity-100",
										)}
										onClick={() => {
											setSelectedBusiness(business);
											if (map) {
												map.panTo(business.location);
												map.setZoom(16);
											}
										}}>
										<div className='flex justify-between items-start mb-1'>
											<h3 className='text-sm font-medium'>{business.name}</h3>
											<div className='flex gap-1'>
												<span className='px-1.5 py-0.5 rounded text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase font-bold'>
													No Website
												</span>
												{business.email ? (
													<span className='px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold'>
														Has Email
													</span>
												) : business.phoneNumber ? (
													<span className='px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase font-bold'>
														Phone Only
													</span>
												) : null}
											</div>
										</div>
										<div className='flex items-center gap-1 text-[11px] text-white/40'>
											<span>{business.rating || "New"} stars</span>
											<span>•</span>
											<span>{business.reviewCount || 0} reviews</span>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
