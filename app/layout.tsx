import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIIT Tiruchirappalli | Academic Attendance & Student Portal",
  description: "Official attendance ledger and student services portal for Indian Institute of Information Technology, Tiruchirappalli.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
