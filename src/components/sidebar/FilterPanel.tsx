"use client";

import { useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import { Search, MapPin, RefreshCw, Calendar, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompetitionSource } from "@/types";
import * as Slider from "@radix-ui/react-slider";
import { format, addDays, differenceInDays, parseISO, startOfDay } from "date-fns";

const SOURCE_CONFIG: Array<{
  key: CompetitionSource;
  label: string;
  color: string;
  activeClass: string;
  inactiveClass: string;
}> = [
  {
    key: "ibjjf",
    label: "IBJJF",
    color: "#3b82f6",
    activeClass: "bg-blue-600 text-white border-blue-500",
    inactiveClass: "bg-gray-800 text-gray-400 border-gray-600 hover:border-blue-600/50",
  },
  {
    key: "jjwl",
    label: "JJWL",
    color: "#f59e0b",
    activeClass: "bg-amber-600 text-white border-amber-500",
    inactiveClass: "bg-gray-800 text-gray-400 border-gray-600 hover:border-amber-600/50",
  },
  {
    key: "agf",
    label: "AGF",
    color: "#22c55e",
    activeClass: "bg-green-600 text-white border-green-500",
    inactiveClass: "bg-gray-800 text-gray-400 border-gray-600 hover:border-green-600/50",
  },
  {
    key: "naga",
    label: "NAGA",
    color: "#a855f7",
    activeClass: "bg-purple-600 text-white border-purple-500",
    inactiveClass: "bg-gray-800 text-gray-400 border-gray-600 hover:border-purple-600/50",
  },
  {
    key: "adcc",
    label: "ADCC",
    color: "#ef4444",
    activeClass: "bg-red-600 text-white border-red-500",
    inactiveClass: "bg-gray-800 text-gray-400 border-gray-600 hover:border-red-600/50",
  },
];

// Slider spans from today to 18 months out
const SLIDER_ORIGIN = startOfDay(new Date());
const SLIDER_MAX_DAYS = 548; // ~18 months

function dayOffset(dateStr: string): number {
  try {
    const d = startOfDay(parseISO(dateStr));
    const diff = differenceInDays(d, SLIDER_ORIGIN);
    return Math.max(0, Math.min(SLIDER_MAX_DAYS, diff));
  } catch {
    return 0;
  }
}

function offsetToDateStr(offset: number): string {
  return format(addDays(SLIDER_ORIGIN, offset), "yyyy-MM-dd");
}

function formatSliderLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function FilterPanel() {
  const { filters, setFilters, isLoading, competitions } = useMapStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const fromOffset = dayOffset(filters.dateFrom);
  const toOffset = dayOffset(filters.dateTo);

  function handleSliderChange([from, to]: number[]) {
    setFilters({
      dateFrom: offsetToDateStr(from),
      dateTo: offsetToDateStr(to),
    });
  }

  return (
    <>
      {/* Mobile toggle button — visible only on small screens */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-20 bg-gray-900 border border-gray-700 text-white p-2.5 rounded-lg shadow-lg"
        aria-label="Open filters"
      >
        <SlidersHorizontal size={18} />
      </button>

      {/* Overlay backdrop on mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

    <aside className={cn(
      "bg-gray-900 border-r border-gray-700 flex flex-col z-30",
      // Desktop: always visible as a fixed-width sidebar
      "md:relative md:w-72 md:translate-x-0",
      // Mobile: full-height drawer sliding in from the left
      "fixed inset-y-0 left-0 w-72",
      mobileOpen ? "translate-x-0" : "-translate-x-full",
      "transition-transform duration-200 md:transition-none",
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Grapplers List</h1>
          <p className="text-xs text-gray-400 mt-0.5">BJJ Competition Map</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-gray-400 hover:text-white p-1"
          aria-label="Close filters"
        >
          <X size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-5 flex-1 overflow-y-auto">

        {/* Source toggles */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Sources
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {SOURCE_CONFIG.map((src) => (
              <button
                key={src.key}
                onClick={() =>
                  setFilters({
                    sources: { ...filters.sources, [src.key]: !filters.sources[src.key] },
                  })
                }
                className={cn(
                  "py-1.5 px-2 rounded-lg border text-xs font-medium transition-all",
                  filters.sources[src.key] ? src.activeClass : src.inactiveClass
                )}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range slider */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar size={12} />
            Date Range
          </label>

          {/* Selected range labels */}
          <div className="flex justify-between mb-3">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-0.5">From</div>
              <div className="text-xs font-medium text-white bg-gray-800 px-2 py-1 rounded-md border border-gray-700">
                {formatSliderLabel(filters.dateFrom)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-0.5">To</div>
              <div className="text-xs font-medium text-white bg-gray-800 px-2 py-1 rounded-md border border-gray-700">
                {formatSliderLabel(filters.dateTo)}
              </div>
            </div>
          </div>

          {/* Radix slider */}
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            min={0}
            max={SLIDER_MAX_DAYS}
            step={1}
            value={[fromOffset, toOffset]}
            onValueChange={handleSliderChange}
            minStepsBetweenThumbs={1}
          >
            <Slider.Track className="bg-gray-700 relative grow rounded-full h-1.5">
              <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
            </Slider.Track>

            {/* From thumb */}
            <Slider.Thumb
              className="block w-4 h-4 bg-white rounded-full shadow-md border-2 border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900 cursor-grab active:cursor-grabbing transition-colors"
              aria-label="From date"
            />
            {/* To thumb */}
            <Slider.Thumb
              className="block w-4 h-4 bg-white rounded-full shadow-md border-2 border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900 cursor-grab active:cursor-grabbing transition-colors"
              aria-label="To date"
            />
          </Slider.Root>

          {/* Axis labels */}
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-600">Today</span>
            <span className="text-xs text-gray-600">+18 mo</span>
          </div>
        </div>

        {/* Region search */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin size={12} />
            Region / Location
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="e.g. California, Brazil..."
              value={filters.region}
              onChange={(e) => setFilters({ region: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Footer stats + legend */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className={cn(isLoading && "animate-pulse text-blue-400")}>
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw size={10} className="animate-spin" />
                Loading...
              </span>
            ) : (
              `${competitions.length} competitions`
            )}
          </span>
          <span className="text-gray-600">
            {competitions.filter((c) => c.lat != null).length} on map
          </span>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {SOURCE_CONFIG.map((src) => (
            <div key={src.key} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: src.color }}
              />
              {src.label}
            </div>
          ))}
        </div>
      </div>
    </aside>
    </>
  );
}
