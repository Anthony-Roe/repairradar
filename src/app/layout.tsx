import { ThemeProvider } from "@/components/ThemeWrapper";
import "./globals.css";
import { Toaster } from "sonner";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";
import SessionWrapper from "@/components/SessionWrapper";
import { Session } from "next-auth";

export const metadata = {
  title: "RepairRadar",
  description: "A multi-tenant CMMS platform",
};

export default async function RootLayout({ children, session, modal }: { children: React.ReactNode, modal?: React.ReactNode, session: Session }) {
  return (
    <>
    <html>
      <head/>
      <body>
          <ThemeProvider
          >
            <SessionWrapper session={session}>
              <main>
                {children}
                {modal}
              </main>
            </SessionWrapper>
          </ThemeProvider>
      </body>
    </html>
    </>
  );
}
