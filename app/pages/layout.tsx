import { ReactNode } from "react";
import BottomNav from "../components/bottomNav";
import LogoutButton from "../components/logoutBotton"; // 경로 확인

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div style={{ paddingBottom: "100px", backgroundColor: "#f0f8ff", minHeight: "100vh" }}>
      
      {/* 상단 헤더 */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "80px",
          background: "linear-gradient(90deg, #4da6ff, #80c1ff)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          borderBottomLeftRadius: "20px",
          borderBottomRightRadius: "20px",
          textAlign: "center",
          color: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 1000,
          padding: "0.5rem 0",
        }}
      >
        <div style={{ position: "relative" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0 }}>🍚 밥친구</h1>
          <p style={{ fontSize: "0.8rem", marginTop: "2px", fontWeight: "500" }}>
            오늘 같이 밥 먹을 친구를 찾아보세요!
          </p>
          <LogoutButton /> {/* 상단 오른쪽 로그아웃 버튼 */}
        </div>
      </header>

      {/* 페이지 내용 */}
      <main style={{ marginTop: "80px" }}>{children}</main>

      {/* 하단 메뉴바 */}
      <BottomNav />
    </div>
  );
}
