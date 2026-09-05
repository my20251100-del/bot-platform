import type { Metadata } from "next";
import { Cairo, Share_Tech_Mono } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

const tech = Share_Tech_Mono({
  variable: "--font-tech",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatem X — أتمتة وحماية واتساب الذكية",
  description:
    "منصة Hatem X لأتمتة واتساب سحابياً. مضاد حذف الرسائل والوسائط، مضاد عرض مرة واحدة، ردود ذكية بالذكاء الاصطناعي، وتحكم بالخصوصية 24/7.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tech.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
