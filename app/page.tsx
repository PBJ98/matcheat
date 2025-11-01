"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 200); // 등장 애니메이션
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        backgroundImage:
          "url('https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=720&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "'Noto Sans KR', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "80px", // 모바일 하단 여백
      }}
    >
      {/* 블러 + 그라데이션 오버레이 */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backdropFilter: "blur(3px)",
          background: "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.1))",
          top: 0,
          left: 0,
          pointerEvents: "none", // ✅ 클릭 방해 제거
        }}
      ></div>

      {/* 타이틀 & 설명 */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          width: "100%",
          textAlign: "center",
          color: "white",
          padding: "0 20px",
          transform: animate ? "translateY(0)" : "translateY(40px)",
          opacity: animate ? 1 : 0,
          transition: "all 0.8s ease-out",
        }}
      >
        <h1
          style={{
            fontSize: "3.8rem",
            fontWeight: "900",
            textShadow: "0 0 15px rgba(0,0,0,0.6)",
            marginBottom: "1rem",
          }}
        >
          밥친구
        </h1>
        <p
          style={{
            fontSize: "1.3rem",
            lineHeight: "1.6",
            textShadow: "0 0 10px rgba(0,0,0,0.5)",
          }}
        >
          혼밥은 이제 그만! 🍚<br />
          오늘, 밥친구와 함께 맛있는 식사를 즐겨보세요
        </p>
      </div>

      {/* 버튼 그룹 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "80%",
          zIndex: 1, // 오버레이보다 위로
        }}
      >
        <button
          onClick={() => router.push("/sign/signin")}
          onMouseEnter={() => setHovered("login")}
          onMouseLeave={() => setHovered(null)}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.2rem",
            fontWeight: "700",
            color: "#fff",
            backgroundColor: hovered === "login" ? "#ff9f1c" : "#ff7f50",
            border: "none",
            borderRadius: "50px",
            boxShadow:
              hovered === "login"
                ? "0 6px 15px rgba(255,159,28,0.5)"
                : "0 4px 10px rgba(255,127,80,0.4)",
            cursor: "pointer",
            transition: "all 0.25s",
          }}
        >
          로그인
        </button>
        <button
          onClick={() => router.push("/sign/signup")}
          onMouseEnter={() => setHovered("signup")}
          onMouseLeave={() => setHovered(null)}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.2rem",
            fontWeight: "700",
            color: hovered === "signup" ? "#fff" : "#ff7f50",
            backgroundColor:
              hovered === "signup" ? "#ff9f1c" : "rgba(255,255,255,0.2)",
            border: "2px solid #ff7f50",
            borderRadius: "50px",
            boxShadow:
              hovered === "signup"
                ? "0 6px 15px rgba(255,159,28,0.5)"
                : "0 4px 10px rgba(255,127,80,0.4)",
            cursor: "pointer",
            transition: "all 0.25s",
          }}
        >
          회원가입
        </button>
      </div>

      {/* 하단 장식 */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          textAlign: "center",
          fontSize: "2rem",
          opacity: 0.8,
          color: "white",
        }}
      >
        🍚🥢🍲
      </div>
    </div>
  );
}