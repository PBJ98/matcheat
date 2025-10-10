"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../../../../firebase";

export default function UplistPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [category, setCategory] = useState("한식");
  const [maxParticipants, setMaxParticipants] = useState<number>(1);

  //const categories = ["한식", "중식", "일식", "양식"];

  const [location, setLocation] = useState(""); 
  const [preferredGender, setPreferredGender] = useState("");
  const [preferredMbti, setPreferredMbti] = useState<string[]>([]);

  const categories = ["한식", "중식", "일식", "양식"];
  const SEOUL_DISTRICTS = [
    "강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구",
    "노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구",
    "성동구","성북구","송파구","양천구","영등포구","용산구","은평구",
    "종로구","중구","중랑구",
  ] as const;

  const MBTI_TYPES = [
    "INTJ","INTP","ENTJ","ENTP",
    "INFJ","INFP","ENFJ","ENFP",
    "ISTJ","ISFJ","ESTJ","ESFJ",
    "ISTP","ISFP","ESTP","ESFP",
  ];

  // 로그인 사용자 정보 가져오기
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUserId(user.uid);
      setCurrentUserName(user.displayName || "");
    }
    auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
        setCurrentUserName(user.displayName || "");
      } else {
        setCurrentUserId(null);
        setCurrentUserName("");
      }
    });
  }, []);

  const toggleMbti = (mbti: string) => {
    setPreferredMbti((prev) =>
      prev.includes(mbti) ? prev.filter((m) => m !== mbti) : [...prev, mbti]
    );
  };

  const handleSubmit = async () => {
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!title || !content || !restaurant) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    try {
      await addDoc(collection(db, "posts"), {
        authorId: currentUserId,
        authorName: currentUserName,
        title,
        content,
        restaurant,
        category,
        location,
        preferredGender,
        preferredMbti,
        maxParticipants,
        status: "open",
        createdAt: Timestamp.now(),
      });
      alert("글이 등록되었습니다.");
      router.push("/pages/matches"); // 등록 후 이동
    } catch (error) {
      console.error("글 등록 실패:", error);
      alert("글 등록에 실패했습니다.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>글 등록</h1>

      {/* 음식점 */}
      <input
        type="text"
        placeholder="음식점 이름"
        value={restaurant}
        onChange={(e) => setRestaurant(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
      />

      {/* 카테고리 */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "5px",
              border: category === cat ? "2px solid #003366" : "1px solid #ccc",
              backgroundColor: category === cat ? "#003366" : "white",
              color: category === cat ? "white" : "#003366",
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 글 제목 */}
      <input
        type="text"
        placeholder="글 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
      />

      {/* 글 내용 */}
      <textarea
        placeholder="글 내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem", minHeight: "100px" }}
      />

      {/* 모집 인원 */}
      <input
        type="number"
        placeholder="모집 인원"
        value={maxParticipants}
        onChange={(e) => setMaxParticipants(Number(e.target.value))}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
      />

      {/* 🔹 장소 선택 */}
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
      >
        <option value="">장소 선택 (서울 내 구)</option>
        {SEOUL_DISTRICTS.map((dist) => (
          <option key={dist} value={dist}>{dist}</option>
        ))}
      </select>

      {/* 🔹 희망 성별 */}
      <select
        value={preferredGender}
        onChange={(e) => setPreferredGender(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
      >
        <option value="">성별 무관</option>
        <option value="male">남성</option>
        <option value="female">여성</option>
      </select>

      {/* 🔹 희망 MBTI */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>희망 MBTI</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {MBTI_TYPES.map((mbti) => (
            <button
              key={mbti}
              type="button"
              onClick={() => toggleMbti(mbti)}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: "5px",
                border: preferredMbti.includes(mbti) ? "2px solid #003366" : "1px solid #ccc",
                backgroundColor: preferredMbti.includes(mbti) ? "#003366" : "white",
                color: preferredMbti.includes(mbti) ? "white" : "#003366",
                cursor: "pointer",
              }}
            >
              {mbti}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        style={{
          padding: "0.5rem 1.5rem",
          backgroundColor: "#003366",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        등록
      </button>
    </div>
  );
}
