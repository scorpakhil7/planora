"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, clearToken } from "@/lib/auth";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  // Re-check auth status whenever the route changes
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, [pathname]);

  function handleLogout() {
    clearToken();
    setAuthed(false);
    router.push("/login");
  }

  return (
    <nav className="flex items-center gap-1">
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        Dashboard
      </Link>

      {authed ? (
        <>
          <Link
            href="/trips"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Trips
          </Link>
          <Link
            href="/pnr"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            PNR Status
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign Up
          </Link>
        </>
      )}
    </nav>
  );
}
