"use client";
import { useState } from "react";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const handleSave = () => {
    alert(`프로필 저장됨!\n이름: ${name}\n소개: ${bio}`);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>프로필 수정</h1>

      <input
        type="text"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: "block", marginBottom: "1rem", padding: "0.5rem", width: "100%" }}
      />

      <textarea
        placeholder="자기소개"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        style={{ display: "block", marginBottom: "1rem", padding: "0.5rem", width: "100%", height: "100px" }}
      />

      <button
        onClick={handleSave}
        style={{ backgroundColor: "#003366", color: "white", padding: "0.5rem 1rem", borderRadius: "5px", border: "none" }}
      >
        저장
      </button>
    </div>
  );
}
