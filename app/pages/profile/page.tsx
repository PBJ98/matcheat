"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ProfilePage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | "">("");
  const [profileColor, setProfileColor] = useState("#60a5fa");

  // ✅ 추가: 사는 구 & MBTI
  const [district, setDistrict] = useState("");
  const [mbti, setMbti] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const seoulDistricts = [
    "강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구",
    "노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구",
    "성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"
  ];

  const mbtiList = [
    "ISTJ","ISFJ","INFJ","INTJ",
    "ISTP","ISFP","INFP","INTP",
    "ESTP","ESFP","ENFP","ENTP",
    "ESTJ","ESFJ","ENFJ","ENTJ"
  ];

  // ✅ 로그인된 유저 확인 + 기존 데이터 불러오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert("로그인이 필요합니다.");
        router.push("/sign/signin");
        return;
      }

      setUid(user.uid);
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setName(data.name || "");
        setBio(data.bio || "");
        setGender(data.gender || "");
        setProfileColor(data.profileColor || "#60a5fa");
        setDistrict(data.district || "");
        setMbti(data.mbti || "");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // ✅ 저장하기
  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        name,
        bio,
        gender,
        profileColor,
        district, // ✅ 추가 저장
        mbti, // ✅ 추가 저장
        updatedAt: new Date(),
      });

      alert("프로필이 성공적으로 수정되었습니다!");
      router.push("/pages/mypage");
    } catch (error) {
      console.error("프로필 수정 실패:", error);
      alert("프로필 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>로딩 중...</div>;
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "480px",
        margin: "0 auto",
        backgroundColor: "#fff",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        marginTop: "2rem",
      }}
    >
      <h1
        style={{
          fontSize: "1.6rem",
          fontWeight: "bold",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        프로필 수정
      </h1>

      {/* 이름 */}
      <input
        type="text"
        placeholder="이름 입력"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />

      {/* 자기소개 */}
      <textarea
        placeholder="자기소개 입력"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        style={{ ...inputStyle, height: "100px" }}
      />

      {/* 성별 */}
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value as "남성" | "여성")}
        style={inputStyle}
      >
        <option value="">성별 선택</option>
        <option value="남성">남성</option>
        <option value="여성">여성</option>
      </select>

      {/* ✅ 사는 구 선택 */}
      <select
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
        style={inputStyle}
      >
        <option value="">사는 구 선택</option>
        {seoulDistricts.map((gu) => (
          <option key={gu} value={gu}>{gu}</option>
        ))}
      </select>

      {/* ✅ MBTI 선택 */}
      <select
        value={mbti}
        onChange={(e) => setMbti(e.target.value)}
        style={inputStyle}
      >
        <option value="">MBTI 선택</option>
        {mbtiList.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      {/* 🎨 색상 선택 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
          프로필 색상 선택 🎨
        </label>
        <input
          type="color"
          value={profileColor}
          onChange={(e) => setProfileColor(e.target.value)}
          style={{ width: "100%", height: "40px", border: "none", cursor: "pointer" }}
        />
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          backgroundColor: saving ? "#9ca3af" : "#3b82f6",
          color: "white",
          padding: "0.7rem",
          borderRadius: "8px",
          border: "none",
          width: "100%",
          fontWeight: "bold",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginBottom: "1rem",
  padding: "0.6rem",
  borderRadius: "8px",
  border: "1px solid #ccc",
};
