import type { Metadata } from "next";
import { EB_Garamond, DM_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ['300', '400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Cognode — Built for connected thought",
  description: "Visually structure ideas, connect concepts, and execute workflows locally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ebGaramond.variable} ${dmMono.variable}`}>
      <body className="antialiased min-h-screen selection:bg-amber/20 selection:text-ink">
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
