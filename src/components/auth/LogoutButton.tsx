"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/i18n/locale-context";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const { dictionary } = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`btn-ghost ${className}`}
    >
      {loading ? dictionary.auth.loggingOut : dictionary.auth.logout}
    </button>
  );
}
