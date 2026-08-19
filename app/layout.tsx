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
  metadataBase: new URL("https://yanki.app"),
  title: {
    default: "Yankı — Gündemi birlikte duy",
    template: "%s · Yankı",
  },
  description: "Türkçe konuşmalar için yerel, bağlamı açık bir sosyal akış prototipi.",
  openGraph: {
    title: "Yankı — Gündemi birlikte duy",
    description: "Türkçe konuşmalar için yerel, bağlamı açık bir sosyal akış prototipi.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yankı — Gündemi birlikte duy",
    description: "Türkçe konuşmalar için yerel, bağlamı açık bir sosyal akış prototipi.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
