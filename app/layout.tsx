import type { Metadata } from "next";
import { Rokkitt, Rubik, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/custom/layout/app-nav";

// RTNY Font Configuration
const rokkitt = Rokkitt({
  variable: "--font-rokkitt",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RTNY - ROCticketNy Event Ticketing",
  description: "Your premier destination for event tickets in Rochester, NY",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rokkitt.variable} ${rubik.variable} ${robotoSlab.variable} antialiased bg-[#121113] text-[#F9FDFF]`}
      >
        <AppNav />
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
