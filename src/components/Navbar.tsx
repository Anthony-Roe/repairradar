// File: E:\Dev\websites\repairradar\src\components\Navbar.tsx
"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Navbar({ tenant, activeModules = [] }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const currentModule = pathname.split("/")[3]; // e.g., "inventory" from "/dashboard/plygem/inventory"

  if (status === "loading") return null;

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold">
            RepairRadar
          </Link>
          {tenant && <span className="text-lg">| {tenant}</span>}
        </div>
        <div className="flex flex-wrap items-center space-x-4">
          {tenant && activeModules.length > 0 && (
            <>
              {activeModules.map((module) => (
                <Button
                  key={module.name}
                  variant={currentModule === module.name ? "default" : "ghost"}
                  onClick={() => router.push(`/dashboard/${tenant}/${module.name}`)}
                >
                  {module.name.charAt(0).toUpperCase() + module.name.slice(1).replace("-", " ")}
                </Button>
              ))}
            </>
          )}
          {session ? (
            <>
              {session.user.role === "SUPER_ADMIN" && (
                <Button variant="ghost" onClick={() => router.push("/admin")}>
                  Admin
                </Button>
              )}
              <Button variant="ghost" onClick={() => signOut()}>Sign Out</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => router.push("/auth/signin")}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}