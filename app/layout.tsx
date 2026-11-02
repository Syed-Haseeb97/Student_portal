import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { GlobalSoundListener } from "@/components/theme/GlobalSoundListener";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIIT Tiruchirappalli | Academic Attendance & Student Portal",
  description: "Official attendance ledger and student services portal for Indian Institute of Information Technology, Tiruchirappalli.",
  icons: {
    icon: [
      { url: "/images/iiitt-logo.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/images/iiitt-logo.png",
    apple: "/images/iiitt-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/iiitt-logo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/images/iiitt-logo.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('student-portal-theme') || localStorage.getItem('iiitt-theme');
                  if (t === 'dark') {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark', 'theme-dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('theme-dark', 'dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <GlobalSoundListener />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
