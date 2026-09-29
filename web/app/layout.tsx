import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeToaster } from "@/components/ui/theme-toaster";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Relay",
  description: "Focused project collaboration for small teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("relay-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch{}`,
          }}
        />
      </head>
      <body className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
        <ThemeToaster />
      </body>
    </html>
  );
}
