"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false }); // 세션 종료
    router.push("/"); // 로그아웃 후 루트 화면 이동
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        backgroundColor: "#ff7f50", // 🍊 메인 코랄
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.4rem 0.8rem",
        cursor: "pointer",
        fontSize: "0.9rem",
        fontWeight: 700,
        boxShadow: "0 4px 10px rgba(255,127,80,0.4)",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#ff9f1c"; // hover 색상
        e.currentTarget.style.boxShadow = "0 6px 15px rgba(255,159,28,0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#ff7f50";
        e.currentTarget.style.boxShadow = "0 4px 10px rgba(255,127,80,0.4)";
      }}
    >
      로그아웃
    </button>
  );
}
