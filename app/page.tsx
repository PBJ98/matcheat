"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "linear-gradient(135deg, #003366, #0066cc)",
      color: "white",
      textAlign: "center",
      padding: "0 20px",
      fontFamily: "'Arial', sans-serif"
    }}>
      {/* 제목 */}
      <h1 style={{
        fontSize: "4rem",
        marginBottom: "1rem",
        fontWeight: "800",
        textShadow: "2px 2px 6px rgba(0,0,0,0.5)"
      }}>밥친구</h1>

      {/* 설명 */}
      <p style={{
        fontSize: "1.3rem",
        marginBottom: "2.5rem",
        maxWidth: "500px",
        textShadow: "1px 1px 3px rgba(0,0,0,0.4)"
      }}>
        이제 혼밥은 그만! 밥친구와 함께 맛있는 식사를 즐기고, 새로운 친구도 만나보세요!
      </p>

      {/* 버튼 그룹 */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* 로그인 버튼 */}
        <button
          onClick={() => router.push("/sign/signin")}                                    //로그인버튼 연결페이지 주소/sign/signin
          onMouseEnter={() => setHovered("login")}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: "0.9rem 2.5rem",
            fontSize: "1rem",
            backgroundColor: hovered === "login" ? "#e6e6e6" : "white",
            color: "#003366",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            transition: "all 0.2s"
          }}
        >
          로그인
        </button>

        {/* 회원가입 버튼 */}
        <button
          onClick={() => router.push("/onboarding")}
          onMouseEnter={() => setHovered("signup")}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: "0.9rem 2.5rem",
            fontSize: "1rem",
            backgroundColor: hovered === "signup" ? "white" : "transparent",
            color: hovered === "signup" ? "#003366" : "white",
            border: "2px solid white",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: hovered === "signup" ? "0 4px 6px rgba(0,0,0,0.3)" : "none",
            transition: "all 0.2s"
          }}
        >
          회원가입
        </button>
      </div>

      {/* 하단 아이콘 (선택) */}
      <div style={{ marginTop: "3rem", opacity: 0.5, fontSize: "2rem" }}>
        🍽️🥢🍜
      </div>
    </div>
  );
}
