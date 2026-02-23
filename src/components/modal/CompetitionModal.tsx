"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, MapPin, Calendar, ExternalLink } from "lucide-react";
import { useMapStore } from "@/store/useMapStore";
import { Badge } from "@/components/ui/Badge";
import { formatDateRange } from "@/lib/utils";

export function CompetitionModal() {
  const { selectedCompetition, setSelectedCompetition } = useMapStore();

  const isOpen = selectedCompetition !== null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && setSelectedCompetition(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          {selectedCompetition && (
            <>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge source={selectedCompetition.source} />
                </div>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-gray-800">
                    <X size={20} />
                    <span className="sr-only">Close</span>
                  </button>
                </Dialog.Close>
              </div>

              <Dialog.Title className="text-xl font-bold text-white mb-4 leading-tight">
                {selectedCompetition.name}
              </Dialog.Title>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="text-sm">
                    {formatDateRange(
                      selectedCompetition.startDate,
                      selectedCompetition.endDate
                    )}
                  </span>
                </div>

                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{selectedCompetition.location}</span>
                </div>
              </div>

              <a
                href={selectedCompetition.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                Register / View Details
              </a>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
