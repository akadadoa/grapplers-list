"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, X } from "lucide-react";
import { useSession } from "next-auth/react";

export function PaymentBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
  const [banner, setBanner] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setBanner("success");
      // Force session refresh so hasPaid is updated immediately
      update();
      // Clean the URL
      router.replace("/");
    } else if (payment === "cancelled") {
      setBanner("cancelled");
      router.replace("/");
    }
  }, [searchParams, router, update]);

  if (!banner) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${
        banner === "success"
          ? "bg-green-900/80 text-green-200 border-b border-green-700"
          : "bg-gray-800/80 text-gray-300 border-b border-gray-700"
      }`}
    >
      {banner === "success" ? (
        <>
          <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
          Payment successful — all filters are now unlocked. Welcome to Pro!
        </>
      ) : (
        <>
          <XCircle size={16} className="text-gray-400 flex-shrink-0" />
          Payment cancelled. You can upgrade anytime from the filters panel.
        </>
      )}
      <button
        onClick={() => setBanner(null)}
        className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
