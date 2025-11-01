"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import {
  signOut,
  onAuthStateChanged,
  User,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let unsubUserData: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        unsubUserData = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) setUserData(snapshot.data());
        });
      } else {
        router.replace("/sign/signin");
      }
    });
    return () => {
      unsubAuth();
      if (unsubUserData) unsubUserData();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 성공!");
      router.replace("/sign/signin");
    } catch (err) {
      console.error("로그아웃 실패:", err);
    }
  };

  /** ---------------- 탈퇴(계정 + 데이터) 로직 ---------------- */

  const deleteDocs = async (paths: { col: string; id: string }[]) => {
    await Promise.all(paths.map(({ col, id }) => deleteDoc(doc(db, col, id))));
  };

  const deletePostWithSubs = async (postId: string) => {
    const participantsCol = collection(db, "posts", postId, "participants");
    const participantsSnap = await getDocs(participantsCol);
    await Promise.all(participantsSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "posts", postId));
  };

  const chunk = <T,>(arr: T[], size = 10) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );

  const handleDeleteAccount = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.replace("/sign/signin");
      return;
    }
    if (deleting) return;

    const ok = confirm(
      "정말 탈퇴하시겠습니까?\n- 내 계정 및 프로필 문서 삭제\n- 내가 작성한 글 모두 삭제(참여자/요청 정리)\n- 내가 보낸 요청 모두 삭제\n※ 이 작업은 되돌릴 수 없습니다."
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const uid = user.uid;

      const myPostsQ = query(collection(db, "posts"), where("authorId", "==", uid));
      const myPostsSnap = await getDocs(myPostsQ);
      const myPostIds = myPostsSnap.docs.map((d) => d.id);

      const mySentReqQ = query(collection(db, "requests"), where("fromUserId", "==", uid));
      const mySentReqSnap = await getDocs(mySentReqQ);
      const mySentReqRefs = mySentReqSnap.docs.map((d) => ({ col: "requests", id: d.id }));
      await deleteDocs(mySentReqRefs);

      if (myPostIds.length > 0) {
        const chunks = chunk(myPostIds, 10);
        for (const ids of chunks) {
          const reqQ = query(collection(db, "requests"), where("postId", "in", ids));
          const reqSnap = await getDocs(reqQ);
          const reqRefs = reqSnap.docs.map((d) => ({ col: "requests", id: d.id }));
          await deleteDocs(reqRefs);
        }
      }

      for (const postId of myPostIds) {
        await deletePostWithSubs(postId);
      }

      await deleteDoc(doc(db, "users", uid));

      try {
        await deleteUser(user);
      } catch (err: any) {
        if (err?.code === "auth/requires-recent-login") {
          alert(
            "보안을 위해 최근 로그인 후에만 탈퇴가 가능합니다.\n다시 로그인한 뒤, 마이페이지에서 탈퇴를 재시도해주세요."
          );
        } else {
          throw err;
        }
      }

      alert("탈퇴가 완료되었습니다.");
      router.replace("/sign/signin");
    } catch (e) {
      console.error("탈퇴 처리 중 오류:", e);
      alert("탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  };

  const getGradientByGender = (gender?: string, color?: string) => {
    if (color) return `linear-gradient(135deg, ${color}, ${color}CC, ${color}99)`;
    if (gender === "남성") return "linear-gradient(135deg, #3b82f6, #60a5fa, #93c5fd)";
    if (gender === "여성") return "linear-gradient(135deg, #f472b6, #f9a8d4, #fce7f3)";
    return "linear-gradient(135deg, #60a5fa, #93c5fd, #dbeafe)";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f0f4ff, #e8ecf7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "white",
          borderRadius: "20px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
          padding: "40px 32px",
          transition: "transform 0.3s ease",
        }}
      >
        {/* 프로필 카드 */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: getGradientByGender(userData?.gender, userData?.profileColor),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: (userData?.name?.length ?? 0) > 3 ? "16px" : "22px",
              color: "white",
              fontWeight: "bold",
              margin: "0 auto 16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
              padding: "0 10px",
              textAlign: "center",
            }}
          >
            {userData?.name || "사용자"}
          </div>

          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}>
            {userData?.name || "사용자"}
          </h2>

          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "10px" }}>
            {user?.email || "이메일 정보 없음"}
          </p>

          {(userData?.district || userData?.mbti) && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "6px",
                marginBottom: "16px",
              }}
            >
              {userData?.district && (
                <span
                  style={{
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  📍 {userData.district}
                </span>
              )}
              {userData?.mbti && (
                <span
                  style={{
                    backgroundColor: "#fce7f3",
                    color: "#be185d",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  🧠 {userData.mbti}
                </span>
              )}
            </div>
          )}

          <div
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "12px",
              padding: "14px 16px",
              color: "#374151",
              lineHeight: "1.6",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.05)",
              fontSize: "14px",
              textAlign: "left",
              maxWidth: "380px",
              margin: "0 auto",
              border: "1px solid #e5e7eb",
            }}
          >
            💬 {userData?.bio || "아직 자기소개를 작성하지 않았어요 🙂"}
          </div>
        </div>

        {/* 버튼 섹션 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "20px",
          }}
        >
          <button style={buttonStyle} onClick={() => router.push("/pages/profile")}>
            ✏️ 프로필 수정
          </button>

          {/* ✅ 추가: 비밀번호 변경 버튼 */}
          <button style={buttonStyle} onClick={() => router.push("/pages/changepassword")}>
            🔒 비밀번호 변경
          </button>

          <button style={buttonStyle} onClick={() => router.push("/pages/posts")}>
            🗂 내가 쓴 글
          </button>

          <button style={{ ...buttonStyle, backgroundColor: "#f87171" }} onClick={handleLogout}>
            🚪 로그아웃
          </button>

          <button
            style={{
              ...buttonStyle,
              backgroundColor: deleting ? "#9ca3af" : "#ef4444",
              boxShadow: "0 4px 10px rgba(239,68,68,0.3)",
            }}
            disabled={deleting}
            onClick={handleDeleteAccount}
          >
            {deleting ? "탈퇴 진행 중..." : "🧹 탈퇴(계정 및 데이터 삭제)"}
          </button>
        </div>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#3b82f6",
  color: "white",
  fontWeight: 700,
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontSize: "15px",
  boxShadow: "0 4px 10px rgba(59,130,246,0.3)",
  transition: "background-color 0.2s, transform 0.2s",
};