"use client";

import { useEffect, useCallback, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { CompetitionMarker } from "./CompetitionMarker";
import { StackedMarker } from "./StackedMarker";
import { useMapStore } from "@/store/useMapStore";
import { Competition } from "@/types";

export function MapView() {
  const { competitions, filters, setCompetitions, setIsLoading, setSelectedCompetition } =
    useMapStore();
  const [viewState, setViewState] = useState({
    longitude: -30,
    latitude: 25,
    zoom: 2,
  });

  const fetchCompetitions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.region) params.set("region", filters.region);

      const activeSources = Object.entries(filters.sources)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (activeSources.length > 0) {
        params.set("sources", activeSources.join(","));
      }

      if (filters.gi) params.set("gi", "1");
      if (filters.nogi) params.set("nogi", "1");
      if (filters.adult) params.set("adult", "1");
      if (filters.kids) params.set("kids", "1");

      const res = await fetch(`/api/competitions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch competitions");
      const data: Competition[] = await res.json();
      setCompetitions(data);
    } catch (err) {
      console.error("Failed to fetch competitions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, setCompetitions, setIsLoading]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">Mapbox token not configured</p>
          <p className="text-sm">
            Set <code className="bg-gray-800 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code className="bg-gray-800 px-1 rounded">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <Map
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={token}
        style={{ width: "100%", height: "100%" }}
        onClick={() => setSelectedCompetition(null)}
      >
        <NavigationControl position="bottom-right" />
        {Object.entries(
          competitions
            .filter((c) => c.lat != null && c.lng != null)
            .reduce<Record<string, Competition[]>>((groups, c) => {
              const key = `${c.lat},${c.lng}`;
              (groups[key] ??= []).push(c);
              return groups;
            }, {})
        ).map(([key, group]) =>
          group.length === 1 ? (
            <CompetitionMarker key={key} competition={group[0]} />
          ) : (
            <StackedMarker
              key={key}
              lat={group[0].lat!}
              lng={group[0].lng!}
              competitions={group}
            />
          )
        )}
      </Map>

      {/* Competition count badge */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full border border-gray-700">
        {competitions.filter((c) => c.lat != null).length} on map /{" "}
        {competitions.length} total
      </div>
    </div>
  );
}
