"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../../../../firebase";

export default function PostDetailPage() {
  const { id } = useParams(); // 동적 라우트에서 postId 가져옴
  const router = useRouter();

  type Post = {
    id: string;
    title: string;
    content: string;
    restaurant: string;
    category: string;
    maxParticipants: number;
    location?: string;
    dateTime?: string;
    preferredGender?: string;
    preferredMbti?: string[];
    authorId: string;
    authorName?: string;
    createdAt?: any;
  };

  type User = {
    id: string;
    name: string;
    email: string;
    gender?: string;
    bio?: string;
    profileImage?: string;
  };

  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
  const fetchPost = async () => {
    if (!id) return;
    const docRef = doc(db, "posts", String(id));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<Post, "id">;
      setPost({ id: docSnap.id, ...data });

      // 🔹 작성자 정보는 존재할 때만 시도
      if (data.authorId) {
        try {
          const userRef = doc(db, "users", data.authorId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setAuthor({ ...(userSnap.data() as User), id: userSnap.id });
          } else {
            console.log("⚠️ 작성자 정보 없음:", data.authorId);
            setAuthor(null); // 작성자 없음 → null 처리
          }
        } catch (e) {
          console.error("⚠️ 작성자 정보 불러오기 실패:", e);
          setAuthor(null);
        }
      }
    } else {
      console.log("❌ 게시글 존재하지 않음:", id);
    }
  };
  fetchPost();
}, [id]);

  // 현재 로그인 사용자 정보도 표시
  /*useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // 글 불러오기
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      const docRef = doc(db, "posts", String(postId));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<Post, "id">;
        setPost({ id: docSnap.id, ...data });

        // 작성자 정보도 불러오기
        if (data.authorId) {
          const userRef = doc(db, "users", data.authorId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setAuthor({ ...(userSnap.data() as User), id: userSnap.id });
          }
        }
      }
    };
    fetchPost();
  }, [postId]);*/

  // 요청 보내기
  const handleRequest = async () => {
    if (!currentUserId || !post) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      await addDoc(collection(db, "requests"), {
        postId: post.id,
        fromUserId: currentUserId,
        toUserId: post.authorId,
        status: "pending",
        createdAt: Timestamp.now(),
      });
      alert("요청을 보냈습니다.");
      router.push("/pages/requests"); // 요청 페이지로 이동
    } catch (error) {
      console.error("요청 실패:", error);
      alert("요청에 실패했습니다.");
    }
  };

  if (!post) {
    return <div style={{ padding: "2rem" }}>글을 불러오는 중...</div>;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{post.title}</h1>
      <p><strong>음식점:</strong> {post.restaurant}</p>
      <p><strong>카테고리:</strong> {post.category}</p>
      <p><strong>장소:</strong> {post.location || "미정"}</p>
      <p><strong>날짜/시간:</strong> {post.dateTime || "미정"}</p>
      <p><strong>모집 인원:</strong> {post.maxParticipants}명</p>
      <p><strong>희망 성별:</strong> {post.preferredGender || "상관없음"}</p>
      <p><strong>희망 MBTI:</strong> {post.preferredMbti?.join(", ") || "상관없음"}</p>
      <p style={{ marginTop: "1rem" }}>{post.content}</p>

      <hr style={{ margin: "2rem 0" }} />

      {author && (
        <div style={{ marginBottom: "1rem" }}>
          <h2>작성자 정보</h2>
          <p><strong>이름:</strong> {author.name}</p>
          <p><strong>성별:</strong> {author.gender || "비공개"}</p>
          <p><strong>소개:</strong> {author.bio || "없음"}</p>
          {author.profileImage && (
            <img
              src={author.profileImage}
              alt="프로필"
              style={{ width: "100px", height: "100px", borderRadius: "50%" }}
            />
          )}
        </div>
      )}

      {currentUserId && currentUserId !== post.authorId && (
        <button
          onClick={handleRequest}
          style={{
            padding: "0.5rem 1.5rem",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          요청 보내기
        </button>
      )}
    </div>
  );
}
