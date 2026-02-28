"use client";

import { useSession } from "next-auth/react";

export interface SubscriptionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPaid: boolean;
  userName: string | null;
  userImage: string | null;
}

export function useSubscription(): SubscriptionState {
  const { data: session, status } = useSession();

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    hasPaid: session?.user?.hasPaid ?? false,
    userName: session?.user?.name ?? null,
    userImage: session?.user?.image ?? null,
  };
}
