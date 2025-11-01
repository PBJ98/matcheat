
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MatchEats",
  description: "소개팅 형식의 맛집 탐방(MVP)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* 루트 레이아웃: 글로벌 구조만 유지, 불필요한 헤더 제거 */}
        <main>{children}</main>
      </body>
    </html>
  );
}
