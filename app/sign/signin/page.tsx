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
  const [isLoading, setIsLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 200);
  }, []);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    setIsFormValid(validateEmail(email) && password.length >= 8);
  }, [email, password]);

  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string; general?: string } = {};

    if (!validateEmail(email)) newErrors.email = "올바른 이메일을 입력해주세요.";
    if (password.length < 8) newErrors.password = "비밀번호는 8자리 이상이어야 합니다.";
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("로그인 성공!");
        router.push("/pages/matches");
      } catch (err: any) {
        let message = "로그인에 실패했습니다.";
        if (err.code === "auth/user-not-found") message = "가입되지 않은 이메일입니다.";
        else if (err.code === "auth/wrong-password") message = "비밀번호가 잘못되었습니다.";
        else if (err.code === "auth/invalid-email") message = "잘못된 이메일 형식입니다.";
        setErrors({ general: message });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        backgroundImage: "url('https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=720&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Noto Sans KR', sans-serif",
        padding: "20px",
      }}
    >
      {/* 블러 + 그라데이션 오버레이 */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backdropFilter: "blur(4px)",
          background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2))",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      ></div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "360px",
          textAlign: "center",
          transform: animate ? "translateY(0)" : "translateY(40px)",
          opacity: animate ? 1 : 0,
          transition: "all 0.8s ease-out",
        }}
      >
        {/* 타이틀 */}
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: "900",
            color: "#fff",
            textShadow: "0 0 15px rgba(0,0,0,0.7)",
            marginBottom: "1rem",
          }}
        >
          밥친구
        </h1>
        <p
          style={{
            color: "#fff",
            textShadow: "0 0 10px rgba(0,0,0,0.6)",
            fontSize: "1rem",
            marginBottom: "30px",
          }}
        >
          이메일과 비밀번호로 로그인해주세요 🍚
        </p>

        {/* 이메일 입력 */}
        <input
          type="email"
          placeholder="이메일주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "50px",
            border: errors.email ? "2px solid red" : "1px solid #fff",
            marginBottom: "10px",
            fontSize: "14px",
            outline: "none",
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
            padding: "12px",
            borderRadius: "50px",
            border: errors.password ? "2px solid red" : "1px solid #fff",
            marginBottom: "10px",
            fontSize: "14px",
            outline: "none",
          }}
        />
        {errors.password && <p style={{ color: "red", fontSize: "12px", marginBottom: "8px" }}>{errors.password}</p>}

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          disabled={!isFormValid || isLoading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "50px",
            border: "none",
            fontWeight: "700",
            fontSize: "16px",
            color: "#fff",
            backgroundColor: isFormValid ? "#ff7f50" : "rgba(255,127,80,0.5)",
            cursor: isFormValid ? "pointer" : "not-allowed",
            marginBottom: "16px",
            boxShadow: isFormValid ? "0 4px 15px rgba(255,127,80,0.6)" : "none",
            transition: "all 0.25s",
          }}
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>

        {errors.general && <p style={{ color: "red", fontSize: "12px", marginBottom: "16px" }}>{errors.general}</p>}

        {/* 아이디/비밀번호 찾기 */}
        <div style={{ fontSize: "12px", color: "#fff", marginBottom: "24px" }}>
          <span style={{ cursor: "pointer", marginRight: "8px", textDecoration: "underline" }} onClick={() => router.push("/find-id")}>
            아이디 찾기
          </span>
          |
          <span style={{ cursor: "pointer", marginLeft: "8px", textDecoration: "underline" }} onClick={() => router.push("/find-password")}>
            비밀번호 찾기
          </span>
        </div>

        {/* 회원가입 */}
        <button
          onClick={() => router.push("/sign/signup")}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "50px",
            border: "none",
            fontWeight: "700",
            fontSize: "16px",
            color: "#fff",
            backgroundColor: "#ff9f1c",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(255,159,28,0.6)",
            transition: "all 0.25s",
          }}
        >
          회원가입
        </button>
      </div>
    </div>
  );
}
