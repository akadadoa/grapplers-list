import { Suspense } from "react";
import { FilterPanel } from "@/components/sidebar/FilterPanel";
import { MapView } from "@/components/map/MapView";
import { CompetitionModal } from "@/components/modal/CompetitionModal";
import { PaymentBanner } from "@/components/paywall/PaymentBanner";

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-950">
      <FilterPanel />
      <div className="flex-1 relative flex flex-col">
        <Suspense>
          <PaymentBanner />
        </Suspense>
        <MapView />
      </div>
      <CompetitionModal />
    </main>
  );
}
