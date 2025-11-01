'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<"남성" | "여성" | null>(null);
  const [bio, setBio] = useState("");

  // ✅ 추가: 사는 구, MBTI
  const [district, setDistrict] = useState("");
  const [mbti, setMbti] = useState("");

  // ✅ 추가: 보안 질문
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isFormValid, setIsFormValid] = useState(false);

  const emailDomains = ["gmail.com", "naver.com", "daum.net", "직접 입력"];
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

  const securityQuestions = [
    "좋아하는 색깔은?",
    "가장 기억에 남는 장소는?",
    "가장 친한 친구의 이름은?"
  ];

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pw: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,15}$/.test(pw);

  // ✅ 유효성 검사
  useEffect(() => {
    const domain = emailDomain === "직접 입력" ? customDomain : emailDomain;
    const fullEmail = `${emailId}@${domain}`;
    const valid =
      name.trim() &&
      validateEmail(fullEmail) &&
      validatePassword(password) &&
      password === confirmPassword &&
      bio.trim() &&
      district.trim() &&
      mbti.trim() &&
      securityQuestion.trim() &&
      securityAnswer.trim();
    setIsFormValid(Boolean(valid));
  }, [name, emailId, emailDomain, customDomain, password, confirmPassword, bio, district, mbti, securityQuestion, securityAnswer]);

  // ✅ 회원가입 처리
  const handleSubmit = async () => {
    const newErrors: { [key: string]: string } = {};
    const domain = emailDomain === "직접 입력" ? customDomain : emailDomain;
    const fullEmail = `${emailId}@${domain}`;

    if (!name.trim()) newErrors.name = "이름을 입력해주세요.";
    if (!emailId || !domain || !validateEmail(fullEmail)) newErrors.email = "올바른 이메일을 입력해주세요.";
    if (!validatePassword(password)) newErrors.password = "비밀번호는 8~15자, 영문+숫자를 포함해야 합니다.";
    if (password !== confirmPassword) newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    if (!bio.trim()) newErrors.bio = "자기소개를 입력해주세요.";
    if (!district) newErrors.district = "사는 구를 선택해주세요.";
    if (!mbti) newErrors.mbti = "MBTI를 선택해주세요.";
    if (!securityQuestion) newErrors.securityQuestion = "보안 질문을 선택해주세요.";
    if (!securityAnswer.trim()) newErrors.securityAnswer = "보안 질문 답변을 입력해주세요.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, fullEmail, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          name,
          email: fullEmail,
          gender,
          bio,
          district,
          mbti,
          profileImage: "",
          securityQuestion,
          securityAnswer,
          createdAt: new Date(),
        });

        alert("회원가입 성공!");
        router.push("/sign/signin");
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
            <option key={domain} value={domain}>{domain}</option>
          ))}
        </select>
      </div>

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

      {/* 사는 구 선택 */}
      <div style={{ marginBottom: "16px" }}>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          style={{
            width: "100%",
            border: errors.district ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        >
          <option value="">사는 구 선택</option>
          {seoulDistricts.map((gu) => (
            <option key={gu} value={gu}>{gu}</option>
          ))}
        </select>
        {errors.district && <p style={{ color: "red", fontSize: "12px" }}>{errors.district}</p>}
      </div>

      {/* MBTI 선택 */}
      <div style={{ marginBottom: "16px" }}>
        <select
          value={mbti}
          onChange={(e) => setMbti(e.target.value)}
          style={{
            width: "100%",
            border: errors.mbti ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        >
          <option value="">MBTI 선택</option>
          {mbtiList.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {errors.mbti && <p style={{ color: "red", fontSize: "12px" }}>{errors.mbti}</p>}
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

      {/* ✅ 보안 질문 */}
      <div style={{ marginBottom: "16px" }}>
        <select
          value={securityQuestion}
          onChange={(e) => setSecurityQuestion(e.target.value)}
          style={{
            width: "100%",
            border: errors.securityQuestion ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        >
          <option value="">보안 질문 선택</option>
          {securityQuestions.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        {errors.securityQuestion && <p style={{ color: "red", fontSize: "12px" }}>{errors.securityQuestion}</p>}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="보안 질문 답변 입력"
          value={securityAnswer}
          onChange={(e) => setSecurityAnswer(e.target.value)}
          style={{
            width: "100%",
            border: errors.securityAnswer ? "2px solid red" : "1px solid #ccc",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
        {errors.securityAnswer && <p style={{ color: "red", fontSize: "12px" }}>{errors.securityAnswer}</p>}
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
          onClick={() => router.push("/sign/signin")}
        >
          로그인
        </span>
      </p>
    </div>
  );
}
