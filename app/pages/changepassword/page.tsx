"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { Lock, ArrowLeft } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = auth.currentUser;
    if (!user || !user.email) {
      toast.error("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);
      toast.success("비밀번호가 성공적으로 변경되었습니다!");
      setTimeout(() => router.push("/"), 1500);
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/wrong-password") {
        toast.error("현재 비밀번호가 올바르지 않습니다.");
      } else {
        toast.error("비밀번호 변경 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Toaster position="top-center" />
      <div className="card">
        <div className="header">
          <div className="icon">
            <Lock className="lock-icon" />
          </div>
          <h2>비밀번호 변경</h2>
          <p>보안을 위해 비밀번호를 주기적으로 변경하세요.</p>
        </div>

        <form onSubmit={handlePasswordChange} className="form">
          <div className="form-group">
            <label>현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="현재 비밀번호를 입력하세요"
            />
          </div>
          <div className="form-group">
            <label>새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="새 비밀번호를 입력하세요"
            />
          </div>
          <div className="form-group">
            <label>새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="다시 한 번 입력하세요"
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "변경 중..." : "비밀번호 변경하기"}
          </button>
        </form>

        <button onClick={() => router.push("/mypage")} className="back-btn">
          <ArrowLeft className="arrow-icon" /> 돌아가기
        </button>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(to bottom right, #e0f2ff, #bae6fd);
          padding: 2rem;
        }

        .card {
          background: #ffffff;
          border-radius: 2rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          padding: 3rem 2.5rem;
          max-width: 400px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .icon {
          background: linear-gradient(135deg, #60a5fa, #38bdf8);
          padding: 1.5rem;
          border-radius: 50%;
          box-shadow: inset 0 4px 6px rgba(0, 0, 0, 0.08);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .lock-icon {
          width: 2rem;
          height: 2rem;
          color: #1d4ed8;
        }

        h2 {
          font-size: 2rem;
          font-weight: 800;
          color: #1e40af;
        }

        p {
          font-size: 0.9rem;
          color: #374151;
          max-width: 280px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        label {
          font-size: 0.9rem;
          color: #1e3a8a;
        }

        input {
          padding: 1rem 1.25rem;
          border-radius: 1.5rem;
          border: 1px solid #93c5fd;
          outline: none;
          font-size: 1rem;
          transition: all 0.2s;
        }

        input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .submit-btn {
          margin-top: 1rem;
          padding: 1rem 0;
          background: linear-gradient(90deg, #3b82f6, #0ea5e9);
          color: #ffffff;
          font-weight: 600;
          font-size: 1.1rem;
          border-radius: 1.5rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }

        .submit-btn:hover {
          background: linear-gradient(90deg, #2563eb, #0284c7);
        }

        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .back-btn {
          margin-top: 2rem;
          padding: 0.8rem 0;
          background: #e0f2ff;
          color: #1e40af;
          font-size: 0.9rem;
          border-radius: 1.5rem;
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #bae6fd;
        }

        .arrow-icon {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  );
}