"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/firebase"; 
import { signOut, onAuthStateChanged, User } from "firebase/auth";

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // 로그인 상태 추적
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // 로그인 안 된 상태라면 로그인 페이지로 이동
        router.replace("/sign/signin");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 로그아웃 기능
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 성공!");
      router.replace("/sign/signin"); // 뒤로가기 방지
    } catch (err) {
      console.error("로그아웃 실패:", err);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {/* 프로필 */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img
            src={user?.photoURL || "https://via.placeholder.com/100"}
            alt="프로필"
            style={{ borderRadius: "50%", marginBottom: "12px" }}
          />
          <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>
            {user?.displayName || "사용자"}
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            {user?.email || "이메일 정보 없음"}
          </p>
        </div>

        {/* 메뉴 리스트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button style={buttonStyle} onClick={() => router.push("/pages/profile")}>
            프로필 수정
          </button>
          <button style={buttonStyle} onClick={() => router.push("/pages/posts")}>
            내가 쓴 글
          </button>
          <button style={buttonStyle} onClick={() => router.push("/pages/settings")}>
            설정
          </button>
          <button
            style={{ ...buttonStyle, backgroundColor: "#f87171" }}
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

// 버튼 스타일 공통
const buttonStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#60a5fa",
  color: "white",
  fontWeight: 600,
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
};
