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
  title: "بوت برو — أتمتة واتساب مبسّطة",
  description:
    "انشر بوت واتساب خاص بك عبر كود الاقتران أو QR. مضاد حذف، مضاد عرض مرة واحدة، تحكم بالخصوصية، أدوات وسائط، وتفاعل تلقائي — بدون برمجة.",
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
