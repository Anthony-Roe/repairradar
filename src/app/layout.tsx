import { ThemeProvider } from "@/components/ThemeWrapper";
import "./globals.css";
import { Toaster } from "sonner";
import Footer from "@/components/Footer";

export const metadata = {
  title: "RepairRadar",
  description: "A multi-tenant CMMS platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <head/>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main>{children}</main>
          <Toaster/>
          <Footer/>
        </ThemeProvider>
      </body>
    </html>
    </>
  );
}
