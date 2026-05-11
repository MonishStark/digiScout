/** @format */

import React from "react";
import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Business, WebsiteProject } from "../types";
import LeadDetails from "./LeadDetails";

interface MapAreaProps {
	businesses: Business[];
	selectedBusiness: Business | null;
	setSelectedBusiness: (b: Business | null) => void;
	projects?: WebsiteProject[];
	setProjects?: React.Dispatch<React.SetStateAction<WebsiteProject[]>>;
	setActivePage?: (page: "discover" | "leads") => void;
}

export default function MapArea({
	businesses,
	selectedBusiness,
	setSelectedBusiness,
	projects,
	setProjects,
	setActivePage,
}: MapAreaProps) {
	return (
		<div className='w-full h-full relative'>
			<Map
				defaultCenter={{ lat: 39.8283, lng: -98.5795 }} // Center of US
				defaultZoom={4}
				mapId='DEMO_MAP_ID'
				internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
				style={{ width: "100%", height: "100%" }}
				disableDefaultUI={true}
				gestureHandling='greedy'
				colorScheme={"DARK"}>
				{businesses.map((business) => (
					<AdvancedMarker
						key={business.id}
						position={business.location}
						onClick={() => setSelectedBusiness(business)}
						zIndex={selectedBusiness?.id === business.id ? 100 : 1}>
						<Pin
							background={
								selectedBusiness?.id === business.id ? "#4f46e5" : "#ffffff"
							}
							borderColor={
								selectedBusiness?.id === business.id ? "#ffffff" : "#4f46e5"
							}
							glyphColor={
								selectedBusiness?.id === business.id ? "#ffffff" : "#4f46e5"
							}
							scale={selectedBusiness?.id === business.id ? 1.2 : 1}
						/>
					</AdvancedMarker>
				))}
			</Map>

			{/* Floating Panel for Business Details */}
			{selectedBusiness && (
				<LeadDetails
					business={selectedBusiness}
					projects={projects}
					setProjects={setProjects}
					setActivePage={setActivePage}
				/>
			)}
		</div>
	);
}
