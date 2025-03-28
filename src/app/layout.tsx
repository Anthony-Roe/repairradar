import ThemeWrapper from "@/components/ThemeWrapper";
import "./globals.css";

export const metadata = {
  title: "RepairRadar",
  description: "A multi-tenant CMMS platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body>
        <ThemeWrapper>
          <main>{children}</main>
        </ThemeWrapper>
      </body>
    </html>
  );
}