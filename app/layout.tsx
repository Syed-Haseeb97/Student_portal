import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IIIT Tiruchirappalli | Academic Attendance & Student Portal",
  description: "Official attendance ledger and student services portal for Indian Institute of Information Technology, Tiruchirappalli.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
