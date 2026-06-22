import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MetricMind AI — Analytics Dashboard That Explains Itself",
  description: "MetricMind AI is a modern analytics platform that cleans raw CSV uploads, generates interactive charts, and produces plain-English business explanations.",
  keywords: ["analytics", "data insights", "CSV analysis", "artificial intelligence", "interactive charts"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#060a13] text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
