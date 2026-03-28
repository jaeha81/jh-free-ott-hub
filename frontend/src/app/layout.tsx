import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "JH Free OTT Hub — 무료 합법 영화·애니 허브",
  description: "전 세계 무료·합법 영화와 애니메이션을 한곳에서 검색하고 시청하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#141414] text-white">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
      </body>
    </html>
  );
}
