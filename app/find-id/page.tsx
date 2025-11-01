"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebase"; // Firestore 연결
import { collection, query, where, getDocs } from "firebase/firestore";

export default function FindIdPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false); // 조회 중 표시

  useEffect(() => {
    if (!touched) return;
    if (!name.trim()) {
      setIsValid(false);
      setError("이름을 입력해주세요.");
    } else {
      setIsValid(true);
      setError("");
    }
  }, [name, touched]);

  const handleFindId = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const usersRef = collection(db, "users"); // users 컬렉션
      const q = query(usersRef, where("name", "==", name.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("해당 이름으로 가입된 계정이 없습니다.");
      } else {
        // 여러 명이 같은 이름일 경우 첫 번째 문서 이메일 가져오기
        const userData = querySnapshot.docs[0].data();
        alert(`가입된 아이디는 ${userData.email} 입니다.`);
      }
    } catch (err) {
      console.error(err);
      setError("아이디를 찾는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#bfdbfe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", textAlign: "center" }}>
          아이디 찾기
        </h1>

        <input
          type="text"
          placeholder="가입 시 등록한 이름"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setTouched(true);
          }}
          style={{
            width: "100%",
            border: error ? "2px solid red" : "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "0 12px",
            marginBottom: "8px",
            fontSize: "14px",
            height: "44px",
            lineHeight: "44px",
            outline: "none",
          }}
        />
        {touched && error && (
          <p style={{ color: "red", fontSize: "12px", marginBottom: "16px" }}>{error}</p>
        )}

        <button
          onClick={handleFindId}
          disabled={!isValid || loading}
          style={{
            width: "100%",
            backgroundColor: isValid ? "#3b82f6" : "#d1d5db",
            color: "white",
            fontWeight: "600",
            padding: "12px",
            borderRadius: "9999px",
            border: "none",
            cursor: isValid ? "pointer" : "not-allowed",
            marginBottom: "16px",
            transition: "background-color 0.2s",
          }}
        >
          {loading ? "조회중..." : "아이디 찾기"}
        </button>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}>
          <p style={{ marginBottom: "8px" }}>
            비밀번호를 찾으시려면{" "}
            <span
              style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "600" }}
              onClick={() => router.push("/find-password")}
            >
              비밀번호 찾기
            </span>
          </p>
          <p>
            이미 계정이 있나요?{" "}
            <span
              style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "600" }}
              onClick={() => router.push("/sign/signin")}
            >
              로그인
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}