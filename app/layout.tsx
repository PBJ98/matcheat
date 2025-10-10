/*import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MatchEats",
  description: "소개팅 형식의 맛집 탐방(MVP)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  return (
    <html lang="ko">
      <body>
        {/* 로그인 되어있을 때만 헤더 표시 (여기 주석표시)}
        {session && (
          <header className="border-b px-4 py-3 flex gap-4">
            <Link href="/">홈</Link>
            <Link href="/onboarding">온보딩</Link>
            <Link href="/discover">추천</Link>
            <Link href="/matches">매칭</Link>
          </header>
        )}

        <main>{children}</main>
      </body>
    </html>
  );
}
*/

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
