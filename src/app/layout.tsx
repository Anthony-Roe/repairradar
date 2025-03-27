import { getServerSession } from "next-auth/next";
import SessionWrapper from "@/components/SessionWrapper";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ThemeWrapper from "@/components/ThemeWrapper"; // Import from sonner
import "./globals.css";

export const metadata = {
  title: "RepairRadar",
  description: "A multi-tenant CMMS platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  console.log("[RootLayout] Session:", session);
  return (
    <html lang="en">
      <body>
          <SessionWrapper session={session}>
            <ThemeWrapper>
              <main>{children}</main>
            </ThemeWrapper>
          </SessionWrapper>
      </body>
    </html>
  );
}
