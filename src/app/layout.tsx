import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import ToasterClient from "@/components/ui/toaster";
import { UserProvider } from "@/contexts/UserContext";
import DebugPanel from "@/components/ui/debug_component";
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Book keeping app",
  description: "Book keeping app to manage scheduled transactions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jost.variable}>
      <body className="antialiased font-sans">
        <UserProvider>
          {children}
          <DebugPanel />
          <ToasterClient />
        </UserProvider>
      </body>
    </html>
  );
}
