import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

/** Metadata presented to search engines and social previews. */
export const metadata: Metadata = {
  title: "Bandcamp Purchases Exporter",
  description: "Export your Bandcamp collection to CSV/JSON",
};

/**
 * Root layout for the Next.js app. Applies global font, provider wrappers, and
 * language configuration shared across all routes.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
