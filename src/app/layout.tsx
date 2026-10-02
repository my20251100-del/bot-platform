import type { Metadata, Viewport } from "next";
import { Cairo, Outfit, Share_Tech_Mono } from "next/font/google";
import Providers from "@/components/providers";
import PwaInstaller from "@/components/pwa-installer";
import { getServerLocale } from "@/lib/server-locale";
import { dirFor } from "@/lib/i18n";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const tech = Share_Tech_Mono({
  variable: "--font-tech",
  weight: "400",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#06080d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Hatem X — أتمتة وحماية واتساب الذكية",
  description:
    "منصة Hatem X لأتمتة واتساب سحابياً. مضاد حذف الرسائل والوسائط، مضاد عرض مرة واحدة، ردود ذكية بالذكاء الاصطناعي، وتحكم بالخصوصية 24/7.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hatem X",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${cairo.variable} ${outfit.variable} ${tech.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers initialLocale={locale}>{children}</Providers>
        <PwaInstaller />
      </body>
    </html>
  );
}

