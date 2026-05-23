"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getSafeRedirectPath, useAuth } from "@/lib/auth-context";
import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) wasAuthenticated.current = true;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      // If user was authenticated and just became unauthenticated, this is a
      // logout — don't preserve the protected URL, just go to plain /login.
      if (wasAuthenticated.current) {
        router.push("/login");
        return;
      }
      const search = searchParams?.toString();
      const current = `${pathname}${search ? `?${search}` : ""}`;
      const safe = getSafeRedirectPath(current);
      if (safe) {
        try {
          sessionStorage.setItem("pawship-post-login-redirect", safe);
        } catch {}
        router.push(`/login?redirect=${encodeURIComponent(safe)}`);
      } else {
        router.push("/login");
      }
    } else if (user?.role !== "customer") {
      if (user?.role === "admin" || user?.role === "ops") {
        router.push("/admin/dashboard");
      } else {
        router.push("/groomer/dashboard");
      }
    }
  }, [mounted, isAuthenticated, user, router, pathname, searchParams]);

  if (!mounted || !isAuthenticated || user?.role !== "customer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
