import type { Metadata } from "next";
import { Syne, JetBrains_Mono, Playfair_Display, DM_Mono } from "next/font/google";
import "./globals.css";
import { UpdateModal } from "../components/updater/UpdateModal";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cognode",
  description: "AI-powered knowledge graph and research synthesis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${dmMono.variable} antialiased font-sans`}
      >
        {children}
        <UpdateModal />
      </body>
    </html>
  );
}
