import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "競艇分析アシスタント",
  description: "本命モード・穴狙いモードで競艇のレース分析を行うアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
