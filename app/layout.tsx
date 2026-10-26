import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIITT Portal",
  description: "A focused student portal for IIIT Tiruchirappalli.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
