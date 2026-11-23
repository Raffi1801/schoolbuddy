"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("sb_current_user") ||
        localStorage.getItem("sb_auth_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.role === "admin") {
          router.replace("/admin");
          return;
        }
        if (user?.phone) {
          router.replace("/account");
          return;
        }
      }
    } catch {}

    router.replace("/Login");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm font-bold text-slate-400">
      Loading SchoolBuddy...
    </div>
  );
}