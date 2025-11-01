'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export default function FindPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<"email" | "security" | "success">("email");
  const [userDocData, setUserDocData] = useState<any>(null);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailNext = async () => {
    if (!validateEmail(email)) {
      setError("올바른 이메일을 입력해주세요.");
      return;
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setError("등록된 계정이 없습니다.");
    } else {
      const docData = querySnapshot.docs[0].data();
      docData.uid = querySnapshot.docs[0].id;
      setUserDocData(docData);
      setSecurityQuestion(docData.securityQuestion || "보안 질문이 없습니다.");
      setStep("security");
      setError("");
    }
  };

  const generateTempPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSecurityAnswer = async () => {
    if (!answerInput.trim()) {
      setAnswerError("답변을 입력해주세요.");
      return;
    }

    if (!userDocData) {
      setAnswerError("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    if (userDocData.securityAnswer?.trim().toLowerCase() !== answerInput.trim().toLowerCase()) {
      setAnswerError("보안 질문 답변이 일치하지 않습니다.");
      return;
    }

    try {
      const newTempPassword = generateTempPassword();

      // Next.js App Router용 API 호출
      const res = await fetch("/api/sendTempPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userDocData.uid, tempPassword: newTempPassword }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "임시 비밀번호 발급 실패");
      }

      setTempPassword(newTempPassword);
      setStep("success");
      setAnswerError("");
    } catch (err: any) {
      setAnswerError(err.message || "오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", textAlign: "center" }}>비밀번호 찾기</h1>

        {step === "email" && (
          <>
            <input
              type="email"
              placeholder="가입 시 등록한 이메일"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (!touched) setTouched(true); }}
              style={{ width: "100%", border: error ? "2px solid red" : "1px solid #bfdbfe", borderRadius: "8px", padding: "0 12px", marginBottom: "8px", fontSize: "14px", height: "44px", outline: "none" }}
            />
            {touched && error && <p style={{ color: "red", fontSize: "12px", marginBottom: "16px" }}>{error}</p>}
            <button onClick={handleEmailNext} style={{ width: "100%", backgroundColor: "#3b82f6", color: "white", fontWeight: "600", padding: "12px", borderRadius: "9999px", border: "none", cursor: "pointer" }}>다음</button>
          </>
        )}

        {step === "security" && (
          <>
            <p style={{ marginBottom: "12px" }}>{securityQuestion}</p>
            <input
              type="text"
              placeholder="답변 입력"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              style={{ width: "100%", border: answerError ? "2px solid red" : "1px solid #bfdbfe", borderRadius: "8px", padding: "0 12px", marginBottom: "8px", fontSize: "14px", height: "44px", outline: "none" }}
            />
            {answerError && <p style={{ color: "red", fontSize: "12px", marginBottom: "16px" }}>{answerError}</p>}
            <button onClick={handleSecurityAnswer} style={{ width: "100%", backgroundColor: "#3b82f6", color: "white", fontWeight: "600", padding: "12px", borderRadius: "9999px", border: "none", cursor: "pointer" }}>확인</button>
          </>
        )}

        {step === "success" && (
          <>
            <p style={{ marginBottom: "16px", textAlign: "center" }}>보안 질문이 확인되었습니다.</p>
            {tempPassword && (
              <div style={{ marginBottom: "16px", textAlign: "center" }}>
                <p style={{ fontWeight: 600, marginBottom: "8px" }}>임시 비밀번호</p>
                <p style={{ background: "#f3f4f6", padding: "12px", borderRadius: "8px" }}>{tempPassword}</p>
                <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>로그인 후 반드시 비밀번호를 변경해주세요. (MyPage에서 가능)</p>
              </div>
            )}
            <button onClick={() => router.push("/sign/signin")} style={{ width: "100%", backgroundColor: "#3b82f6", color: "white", fontWeight: "600", padding: "12px", borderRadius: "9999px", border: "none", cursor: "pointer" }}>로그인 페이지로 이동</button>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}>
          <p>이미 계정이 있나요? <span style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "600" }} onClick={() => router.push("/sign/signin")}>로그인</span></p>
        </div>
      </div>
    </div>
  );
}
