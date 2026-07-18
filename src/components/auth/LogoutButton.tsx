"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const router = useRouter();
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
      {loading ? "登出中…" : "登出"}
    </button>
  );
}
