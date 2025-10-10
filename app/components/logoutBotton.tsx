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
        backgroundColor: "#ff4d4d",
        color: "white",
        border: "none",
        borderRadius: "5px",
        padding: "0.25rem 0.5rem",
        cursor: "pointer",
        fontSize: "0.8rem",
      }}
    >
      로그아웃
    </button>
  );
}


