import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "생각 노트 | 나의 말로 남기는 배움",
  description: "오늘의 배움을 자기 말로 쓰고 선생님의 피드백으로 생각을 키워요.",
  other: {
    "codex-preview": "development",
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
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
