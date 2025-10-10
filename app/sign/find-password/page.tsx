'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FindPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false); // ✅ 입력 여부 추적

  // 이메일 검증 (정규식)
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (!touched) return; // 입력 전에는 검증하지 않음
    if (!validateEmail(email)) {
      setIsValid(false);
      setError("올바른 이메일을 입력해주세요.");
    } else {
      setIsValid(true);
      setError("");
    }
  }, [email, touched]);

  const handleFindPassword = () => {
    if (!isValid) return;
    alert(`비밀번호 재설정 링크가 ${email} 으로 발송되었습니다.`);
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
          비밀번호 찾기
        </h1>

        {/* 이메일 입력 */}
        <input
          type="email"
          placeholder="가입 시 등록한 이메일"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (!touched) setTouched(true); // ✅ 입력 시작 시 touched 활성화
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

        {/* 비밀번호 찾기 버튼 */}
        <button
          onClick={handleFindPassword}
          disabled={!isValid}
          style={{
            width: "100%",
            backgroundColor: isValid ? "#3b82f6" : "#d1d5db", // ✅ 유효성에 따라 색상 변경
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
          비밀번호 찾기
        </button>

        {/* 추가 기능: 돌아가기 버튼 */}
        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}>
          <p style={{ marginBottom: "8px" }}>
            아이디를 찾으시려면{" "}
            <span
              style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "600" }}
              onClick={() => router.push("/find-id")}
            >
              아이디 찾기
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

