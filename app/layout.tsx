import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nsosyal.com"),
  title: {
    default: "NSosyal - Sosyal Ağ Platformu",
    template: "%s · NSosyal",
  },
  description: "NSosyal - Sosyal Ağ Platformu",
  openGraph: {
    title: "NSosyal - Sosyal Ağ Platformu",
    description: "NSosyal - Sosyal Ağ Platformu",
  },
  twitter: {
    card: "summary",
    title: "NSosyal - Sosyal Ağ Platformu",
    description: "NSosyal - Sosyal Ağ Platformu",
  },
  icons: {
    icon: "/brand/nsosyal-favicon.svg",
    shortcut: "/brand/nsosyal-favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1B1E26",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
