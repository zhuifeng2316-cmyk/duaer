import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getSiteUrl } from "@/lib/site";
import { SiteNav } from "./site-nav";
import "./globals.css";

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Duaer · 人不出镜的 AI 口播",
  description: "专门做口播。人不用出镜。照片克隆画面，声音克隆口播，文案、分镜、配乐都来自 AI。",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={body.variable}>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
