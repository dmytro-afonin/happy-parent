import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, Lora } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import { cn } from "@/lib/utils";

const loraHeading = Lora({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-heading",
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Happy Parent",
  description: "A public map of family places in Warsaw.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", display.variable, "font-sans", sourceSans3.variable, loraHeading.variable)}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-sans)] antialiased">
        <AppProviders>
          <SiteHeader />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
