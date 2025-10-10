'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // ✅ 로딩 상태

  // 이메일 정규식
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    const valid = validateEmail(email) && password.length >= 8;
    setIsFormValid(valid);
  }, [email, password]);

  // ✅ Firebase 로그인
  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string; general?: string } = {};

    if (!validateEmail(email)) {
      newErrors.email = "올바른 이메일을 입력해주세요.";
    }
    if (password.length < 8) {
      newErrors.password = "비밀번호는 8자리 이상이어야 합니다.";
    }
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true); // 🔹 로딩 시작
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("로그인 성공:", userCredential.user);

        // ✅ 성공 메시지 추가
        alert("로그인 성공!");

        // ✅ 로그인 성공 후 afterlogin 페이지로 이동
        router.push("/pages/matches");
      } catch (err: any) {
        console.error("로그인 실패:", err);

        // 🔹 Firebase 에러 코드 한글화
        let message = "로그인에 실패했습니다.";
        if (err.code === "auth/user-not-found") message = "가입되지 않은 이메일입니다.";
        else if (err.code === "auth/wrong-password") message = "비밀번호가 잘못되었습니다.";
        else if (err.code === "auth/invalid-email") message = "잘못된 이메일 형식입니다.";

        setErrors({ general: message });
      } finally {
        setIsLoading(false); // 🔹 로딩 종료
      }
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
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          로그인 <span style={{ color: "#6b7280", fontSize: "18px" }}>Login</span>
        </h1>

        {/* 이메일 입력 */}
        <input
          type="email"
          placeholder="이메일주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            border: errors.email ? "2px solid red" : "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "0 12px",
            marginBottom: "8px",
            fontSize: "14px",
            height: "44px",
            lineHeight: "44px",
          }}
        />
        {errors.email && <p style={{ color: "red", fontSize: "12px", marginBottom: "8px" }}>{errors.email}</p>}

        {/* 비밀번호 입력 */}
        <input
          type="password"
          placeholder="비밀번호 8자리 이상"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            border: errors.password ? "2px solid red" : "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "0 12px",
            marginBottom: "8px",
            fontSize: "14px",
            height: "44px",
            lineHeight: "44px",
          }}
        />
        {errors.password && <p style={{ color: "red", fontSize: "12px", marginBottom: "8px" }}>{errors.password}</p>}

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          disabled={!isFormValid || isLoading}
          style={{
            width: "100%",
            backgroundColor: isFormValid ? "#60a5fa" : "#d1d5db",
            color: "white",
            fontWeight: "600",
            padding: "12px",
            borderRadius: "9999px",
            border: "none",
            cursor: isFormValid ? "pointer" : "not-allowed",
            marginBottom: "16px",
          }}
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>

        {/* Firebase 오류 표시 */}
        {errors.general && (
          <p style={{ color: "red", fontSize: "12px", marginBottom: "16px", textAlign: "center" }}>
            {errors.general}
          </p>
        )}

        {/* 아이디/비밀번호 찾기 */}
        <div style={{ textAlign: "center", fontSize: "14px", color: "#4b5563", marginBottom: "24px" }}>
          <span style={{ cursor: "pointer", marginRight: "8px" }} onClick={() => router.push("/find-id")}>
            아이디 찾기
          </span>
          |
          <span style={{ cursor: "pointer", marginLeft: "8px" }} onClick={() => router.push("/find-password")}>
            비밀번호 찾기
          </span>
        </div>

        {/* 회원가입 이동 */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>아직 계정이 없으신가요?</p>
          <button
            style={{
              width: "100%",
              backgroundColor: "#60a5fa",
              color: "white",
              fontWeight: "600",
              padding: "12px",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => router.push("/sign/signup")}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
