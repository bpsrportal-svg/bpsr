import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BPSRPortal",
  description: "Discordと連携したゲームコミュニティ募集ポータル"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}