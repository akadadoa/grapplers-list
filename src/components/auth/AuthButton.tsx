"use client";

import Image from "next/image";
import { signIn, signOut } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function AuthButton() {
  const { isLoading, isAuthenticated, userName, userImage } = useSubscription();

  if (isLoading) return null;

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        {userImage && (
          <Image
            src={userImage}
            alt={userName ?? "User avatar"}
            width={22}
            height={22}
            className="rounded-full ring-1 ring-gray-600"
          />
        )}
        <span className="text-xs text-gray-300 truncate max-w-[90px]">
          {userName?.split(" ")[0]}
        </span>
        <button
          onClick={() => signOut()}
          className="text-gray-500 hover:text-white transition-colors"
          title="Sign out"
        >
          <LogOut size={13} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
    >
      <LogIn size={13} />
      Sign in
    </button>
  );
}
