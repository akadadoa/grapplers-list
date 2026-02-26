"use client";

import { Marker } from "react-map-gl/mapbox";
import { Competition, CompetitionSource } from "@/types";
import { useMapStore } from "@/store/useMapStore";

interface CompetitionMarkerProps {
  competition: Competition;
}

const SOURCE_COLORS: Record<CompetitionSource, string> = {
  ibjjf: "#3b82f6", // blue-500
  jjwl:  "#f59e0b", // amber-500
  agf:   "#22c55e", // green-500
  naga:  "#a855f7", // purple-500
  adcc:  "#ef4444", // red-500
};

export function CompetitionMarker({ competition }: CompetitionMarkerProps) {
  const setSelectedCompetition = useMapStore((s) => s.setSelectedCompetition);
  const selectedCompetition = useMapStore((s) => s.selectedCompetition);

  if (competition.lat == null || competition.lng == null) return null;

  const isSelected = selectedCompetition?.id === competition.id;
  const color = SOURCE_COLORS[competition.source] ?? "#6b7280";

  return (
    <Marker
      longitude={competition.lng}
      latitude={competition.lat}
      anchor="center"
      onClick={(e: { originalEvent: Event }) => {
        e.originalEvent.stopPropagation();
        setSelectedCompetition(competition);
      }}
    >
      <div
        className="cursor-pointer transition-transform hover:scale-125"
        title={competition.name}
        style={{ transform: isSelected ? "scale(1.4)" : undefined }}
      >
        <div
          style={{
            width: isSelected ? 18 : 14,
            height: isSelected ? 18 : 14,
            borderRadius: "50%",
            backgroundColor: color,
            border: isSelected ? "2.5px solid white" : "2px solid white",
            boxShadow: isSelected
              ? `0 0 0 3px ${color}90, 0 2px 6px rgba(0,0,0,0.5)`
              : "0 2px 5px rgba(0,0,0,0.45)",
            transition: "all 0.15s ease",
          }}
        />
      </div>
    </Marker>
  );
}
