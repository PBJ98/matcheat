'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FindIdPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false); // ✅ 사용자가 입력 시도 여부

  // 이름 입력 검증
  useEffect(() => {
    if (!touched) return; // 입력 전에는 검증하지 않음
    if (!name.trim()) {
      setIsValid(false);
      setError("이름을 입력해주세요.");
    } else {
      setIsValid(true);
      setError("");
    }
  }, [name, touched]);

  const handleFindId = () => {
    if (!isValid) return;
    alert(`가입된 아이디는 example@email.com 입니다.`);
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
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          아이디 찾기
        </h1>

        {/* 이름 입력 */}
        <input
          type="text"
          placeholder="가입 시 등록한 이름"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setTouched(true); // ✅ 처음 입력 시 touched 활성화
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
          <p style={{ color: "red", fontSize: "12px", marginBottom: "16px" }}>
            {error}
          </p>
        )}

        {/* 아이디 찾기 버튼 */}
        <button
          onClick={handleFindId}
          disabled={!isValid}
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
          아이디 찾기
        </button>

        {/* 돌아가기 버튼들 */}
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
              onClick={() => router.push("/signin")}
            >
              로그인
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
