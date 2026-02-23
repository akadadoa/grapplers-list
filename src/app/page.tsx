import { FilterPanel } from "@/components/sidebar/FilterPanel";
import { MapView } from "@/components/map/MapView";
import { CompetitionModal } from "@/components/modal/CompetitionModal";

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-950">
      <FilterPanel />
      <MapView />
      <CompetitionModal />
    </main>
  );
}
