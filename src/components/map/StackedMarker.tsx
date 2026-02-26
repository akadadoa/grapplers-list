"use client";

import { useState } from "react";
import { Marker, Popup } from "react-map-gl/mapbox";
import { Competition, CompetitionSource } from "@/types";
import { useMapStore } from "@/store/useMapStore";
import { format, parseISO } from "date-fns";

interface StackedMarkerProps {
  lat: number;
  lng: number;
  competitions: Competition[];
}

const SOURCE_COLORS: Record<CompetitionSource, string> = {
  ibjjf: "#3b82f6",
  jjwl:  "#f59e0b",
  agf:   "#22c55e",
  naga:  "#a855f7",
  adcc:  "#ef4444",
};

export function StackedMarker({ lat, lng, competitions }: StackedMarkerProps) {
  const [open, setOpen] = useState(false);
  const { setSelectedCompetition, selectedCompetition } = useMapStore();

  const isAnySelected = competitions.some((c) => c.id === selectedCompetition?.id);

  return (
    <>
      <Marker
        longitude={lng}
        latitude={lat}
        anchor="center"
        onClick={(e: { originalEvent: Event }) => {
          e.originalEvent.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <div
          className="cursor-pointer flex items-center justify-center rounded-full text-white font-bold transition-transform hover:scale-110"
          style={{
            width: 26,
            height: 26,
            fontSize: 11,
            backgroundColor: "#1e293b",
            border: isAnySelected ? "2px solid white" : "2px solid rgba(255,255,255,0.5)",
            boxShadow: isAnySelected
              ? "0 0 0 3px rgba(255,255,255,0.3)"
              : "0 2px 6px rgba(0,0,0,0.5)",
          }}
        >
          {competitions.length}
        </div>
      </Marker>

      {open && (
        <Popup
          longitude={lng}
          latitude={lat}
          anchor="bottom"
          offset={16}
          closeButton={false}
          onClose={() => setOpen(false)}
          className="z-50"
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl"
            style={{ minWidth: 220, maxWidth: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {competitions.length} events here
            </div>
            <ul>
              {competitions.map((c) => (
                <li key={c.id}>
                  <button
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-800 transition-colors flex items-start gap-2.5 border-b border-gray-800 last:border-0"
                    onClick={() => {
                      setSelectedCompetition(c);
                      setOpen(false);
                    }}
                  >
                    <span
                      className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SOURCE_COLORS[c.source] ?? "#6b7280" }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white leading-snug truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {format(parseISO(c.startDate), "MMM d, yyyy")}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Popup>
      )}
    </>
  );
}
