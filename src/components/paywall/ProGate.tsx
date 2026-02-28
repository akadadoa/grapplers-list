"use client";

import { Lock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface ProGateProps {
  children: React.ReactNode;
  onUpgrade: () => void;
}

export function ProGate({ children, onUpgrade }: ProGateProps) {
  const { hasPaid, isLoading } = useSubscription();

  // While loading, render children normally to avoid layout shift
  if (isLoading || hasPaid) return <>{children}</>;

  return (
    <div className="relative rounded-lg overflow-hidden">
      {/* Blurred/dimmed content */}
      <div className="pointer-events-none select-none opacity-40">
        {children}
      </div>

      {/* Lock overlay */}
      <button
        onClick={onUpgrade}
        className="absolute inset-0 flex items-center justify-center cursor-pointer group"
        aria-label="Upgrade to Pro to unlock this filter"
      >
        <span className="flex items-center gap-1.5 bg-gray-800 group-hover:bg-gray-700 border border-gray-600 group-hover:border-gray-500 text-gray-300 group-hover:text-white text-xs font-medium px-3 py-1.5 rounded-full transition-all shadow-lg">
          <Lock size={11} />
          Pro feature
        </span>
      </button>
    </div>
  );
}
