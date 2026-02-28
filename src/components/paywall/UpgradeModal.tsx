"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Zap, CheckCircle, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  "Filter by date range",
  "Filter by Gi / No-Gi",
  "Filter by Adult / Kids",
  "Filter by region / location",
  "Filter by source (IBJJF, JJWL, AGF...)",
];

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { isAuthenticated } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    if (!isAuthenticated) {
      signIn("google");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong");
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-400/10 p-1.5 rounded-lg">
                <Zap size={16} className="text-yellow-400" />
              </div>
              <Dialog.Title className="font-bold text-white text-base">
                Grapplers List Pro
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
                <X size={16} />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-gray-400 mb-5">
            Find the exact competitions you&apos;re looking for. One-time payment, lifetime access.
          </Dialog.Description>

          {/* Feature list */}
          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 mb-3 text-center">{error}</p>
          )}

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Redirecting to checkout...
              </>
            ) : isAuthenticated ? (
              "Unlock Pro — $9.99"
            ) : (
              "Sign in to unlock Pro"
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-gray-500 text-center mt-2">
              You&apos;ll be asked to sign in with Google first
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
