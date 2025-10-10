'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ✅ Firebase 불러오기
import { auth, db } from "../../../firebase"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [customDomain, setCustomDomain] = useState(""); // ✅ 직접 입력용
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | null>(null);
  const [bio, setBio] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isFormValid, setIsFormValid] = useState(false);

  const emailDomains = ["gmail.com", "naver.com", "daum.net", "직접 입력"];

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pw: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,15}$/.test(pw);

  // ✅ 전체 유효성 검사
  useEffect(() => {
    const domain = emailDomain === "직접 입력" ? customDomain : emailDomain;
    const fullEmail = `${emailId}@${domain}`;
    const valid =
      name.trim() &&
      validateEmail(fullEmail) &&
      validatePassword(password) &&
      password === confirmPassword &&
      bio.trim();
    setIsFormValid(Boolean(valid));
  }, [name, emailId, emailDomain, customDomain, password, confirmPassword, bio]);

  // ✅ 회원가입 처리
  const handleSubmit = async () => {
    const newErrors: { [key: string]: string } = {};
    const domain = emailDomain === "직접 입력" ? customDomain : emailDomain;
    const fullEmail = `${emailId}@${domain}`;

    if (!name.trim()) newErrors.name = "이름을 입력해주세요.";
    if (!emailId || !domain || !validateEmail(fullEmail)) {
      newErrors.email = "올바른 이메일을 입력해주세요.";
    }
    if (!validatePassword(password)) {
      newErrors.password = "비밀번호는 8~15자, 영문+숫자를 포함해야 합니다.";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }
    if (!bio.trim()) {
      newErrors.bio = "자기소개를 입력해주세요.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, fullEmail, password);
        const user = userCredential.user;

        // Firestore에 사용자 정보 저장
        await setDoc(doc(db, "users", user.uid), {
          name,
          email: fullEmail,
          gender,
          bio,
          profileImage: "",
          createdAt: new Date(),
        });

        alert("회원가입 성공!");
        router.push("/signin");
      } catch (error: any) {
        alert("회원가입 실패: " + error.message);
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", fontFamily: "sans-serif", padding: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>회원가입</h1>

      {/* 이름 */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="이름 입력"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            border: errors.name ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
        {errors.name && <p style={{ color: "red", fontSize: "12px" }}>{errors.name}</p>}
      </div>

      {/* 이메일 */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="이메일 아이디"
          value={emailId}
          onChange={(e) => setEmailId(e.target.value)}
          style={{
            flex: 1,
            border: errors.email ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
        <span>@</span>
        <select
          value={emailDomain}
          onChange={(e) => setEmailDomain(e.target.value)}
          style={{
            flex: 1,
            border: errors.email ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        >
          <option value="">도메인 선택</option>
          {emailDomains.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </select>
      </div>

      {/* 직접 입력 input (선택한 경우만 표시) */}
      {emailDomain === "직접 입력" && (
        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="도메인 직접 입력"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            style={{
              width: "100%",
              border: errors.email ? "2px solid red" : "1px solid #ccc",
              padding: "8px",
              borderRadius: "8px",
            }}
          />
        </div>
      )}
      {errors.email && <p style={{ color: "red", fontSize: "12px" }}>{errors.email}</p>}

      {/* 비밀번호 */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="password"
          placeholder="비밀번호 (8~15자 영문+숫자)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            border: errors.password ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
        {errors.password && <p style={{ color: "red", fontSize: "12px" }}>{errors.password}</p>}
      </div>

      {/* 비밀번호 확인 */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            width: "100%",
            border: errors.confirmPassword ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
        {errors.confirmPassword && <p style={{ color: "red", fontSize: "12px" }}>{errors.confirmPassword}</p>}
      </div>

      {/* 성별 */}
      <div style={{ marginBottom: "16px" }}>
        <select
          value={gender || ""}
          onChange={(e) => setGender(e.target.value as "남성" | "여성")}
          style={{
            width: "100%",
            border: "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        >
          <option value="">성별 선택</option>
          <option value="남성">남성</option>
          <option value="여성">여성</option>
        </select>
      </div>

      {/* 자기소개 */}
      <div style={{ marginBottom: "16px" }}>
        <textarea
          placeholder="자기소개를 입력하세요"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{
            width: "100%",
            height: "80px",
            border: errors.bio ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
        {errors.bio && <p style={{ color: "red", fontSize: "12px" }}>{errors.bio}</p>}
      </div>

      {/* 회원가입 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!isFormValid}
        style={{
          width: "100%",
          backgroundColor: isFormValid ? "#3b82f6" : "#d1d5db",
          color: "white",
          fontWeight: "600",
          padding: "12px",
          borderRadius: "9999px",
          border: "none",
          cursor: isFormValid ? "pointer" : "not-allowed",
        }}
      >
        회원가입
      </button>

      <p style={{ fontSize: "14px", textAlign: "center", marginTop: "12px" }}>
        이미 계정이 있나요?{" "}
        <span
          style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "bold" }}
          onClick={() => router.push("/signin")}
        >
          로그인
        </span>
      </p>
    </div>
  );
}
