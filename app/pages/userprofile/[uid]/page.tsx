// app/userprofile/[uid]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

type UserData = {
  name: string;
  profileColor?: string;
  age?: number;
  mbti?: string;
  email?: string;
  bio?: string; // 자기소개 추가
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const uid = Array.isArray(params.uid) ? params.uid[0] : params.uid;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const fetchUser = async () => {
      try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          alert("존재하지 않는 사용자입니다.");
          router.back();
        }
      } catch (error) {
        console.error(error);
        alert("사용자 정보를 불러오는 중 오류가 발생했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [uid, router]);

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        불러오는 중...
      </div>
    );
  if (!userData) return null;

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "Pretendard, sans-serif",
      }}
    >
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "30px 20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          textAlign: "center",
        }}
      >
        {/* 프로필 이미지 */}
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            backgroundColor: userData.profileColor || "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "48px",
            fontWeight: "bold",
            margin: "0 auto 16px",
          }}
        >
          {userData.name.slice(0, 1)}
        </div>

        {/* 이름 */}
        <h2 style={{ margin: "0 0 8px", fontSize: "24px" }}>
          {userData.name}
        </h2>

        {/* 나이 / MBTI / 이메일 */}
        <div style={{ marginBottom: "12px", color: "#475569" }}>
          {userData.age && <p style={{ margin: "4px 0" }}>나이: {userData.age}</p>}
          {userData.mbti && <p style={{ margin: "4px 0" }}>MBTI: {userData.mbti}</p>}
          {userData.email && <p style={{ margin: "4px 0" }}>이메일: {userData.email}</p>}
        </div>

        {/* 자기소개 */}
        {userData.bio && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              backgroundColor: "#f1f5f9",
              borderRadius: "12px",
              color: "#334155",
              textAlign: "left",
            }}
          >
            <p style={{ margin: 0 }}>{userData.bio}</p>
          </div>
        )}

        {/* 채팅으로 돌아가기 버튼 */}
        <button
          onClick={() => router.back()}
          style={{
            marginTop: "20px",
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#3b82f6",
            color: "#fff",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => ((e.currentTarget.style.backgroundColor = "#2563eb"))}
          onMouseOut={(e) => ((e.currentTarget.style.backgroundColor = "#3b82f6"))}
        >
          채팅으로 돌아가기
        </button>
      </div>
    </div>
  );
}
