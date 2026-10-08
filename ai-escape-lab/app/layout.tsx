import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 연구소 탈출 작전",
  description: "여섯 팀이 함께 고장 난 AI 연구소를 고치는 탐험",
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
