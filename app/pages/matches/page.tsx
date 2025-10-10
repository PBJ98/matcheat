"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../../../firebase"; // 경로 확인

export default function MatchesPage() {
  type Post = {
    id: string;
    category: string;
    title: string;
    content: string;
    authorId: string;    // ← 여기 추가
    authorName?: string; // 선택: 글 작성자 이름
    restaurant?: string; // 선택: 음식점 이름
    maxParticipants?: number; // ✅ 추가 (희망 인원)
    location?: string;        // ✅ 추가 (서울 구)
  };

  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [location, setLocation] = useState("전체"); // ✅ 추가: 장소 필터
  //const currentUserId = auth.currentUser?.uid;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 로그인한 사용자 UID 가져오기
  useEffect(() => {
    setCurrentUserId(auth.currentUser?.uid || null);

    // auth 상태 변화 감지
    auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : null);
    });
  }, []);

  // 삭제 함수
  const handleDelete = async (postId: string) => {
    if (!currentUserId) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      alert("글이 삭제되었습니다.");
      fetchPosts(); // 삭제 후 다시 불러오기// 필요하면 posts 다시 불러오기
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };
  const categories = ["전체", "한식", "중식", "일식", "양식"];
  const SEOUL_DISTRICTS = [
    "전체",
    "강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구",
    "노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구",
    "성동구","성북구","송파구","양천구","영등포구","용산구","은평구",
    "종로구","중구","중랑구",
  ];

  // Firestore에서 게시글 불러오기
  const fetchPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    const postsArray = querySnapshot.docs.map((doc) => {
       const data = doc.data() as Omit<Post, "id">; // id 제외 Post 타입
       return { id: doc.id, ...data };
    });
    setPosts(postsArray);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 삭제 기능
  /*const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "posts", id));
    fetchPosts(); // 삭제 후 갱신
  };*/

  // 검색 + 카테고리 필터
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = category === "전체" ? true : post.category === category;
    const matchesLocation = location === "전체" ? true : post.location === location;
    const matchesSearch = search
      ? post.title.includes(search) || post.content.includes(search)
      : true;
    return matchesCategory && matchesLocation && matchesSearch;
  });

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", paddingBottom: "90px" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>모임 찾기</h1>

      {/* 검색 */}
      <input
        type="text"
        placeholder="검색어 입력"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "0.5rem", width: "100%", marginBottom: "1rem", borderRadius: "5px", border: "1px solid #ccc" }}
      />

      {/* 카테고리 선택 */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "5px",
              border: category === cat ? "2px solid #003366" : "1px solid #ccc",
              backgroundColor: category === cat ? "#003366" : "white",
              color: category === cat ? "white" : "#003366",
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 장소 선택 필터 */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {SEOUL_DISTRICTS.map((dist) => (
          <button
            key={dist}
            onClick={() => setLocation(dist)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "5px",
              border: location === dist ? "2px solid #006633" : "1px solid #ccc",
              backgroundColor: location === dist ? "#006633" : "white",
              color: location === dist ? "white" : "#006633",
              cursor: "pointer",
            }}
          >
            {dist}
          </button>
        ))}
      </div>

      {/* 글 등록 버튼 */}
      <button
        onClick={() => router.push("/pages/matches/uplist")}
        style={{ padding: "0.5rem 1.5rem", backgroundColor: "#003366", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginBottom: "1rem" }}
      >
        글 등록
      </button>

      {/* 글 리스트 */}
      <div>
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "5px", marginBottom: "1rem", position: "relative", cursor: "pointer" }}
            onClick={() => router.push(`/pages/matches/${post.id}`)} // ✅ 상세 페이지 이동
          >
            <strong>{post.title}</strong>
            <p>인원: {post.maxParticipants || "미정"}</p>
            <p>장소: {post.location || "미정"}</p>

            {currentUserId && post.authorId === currentUserId && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // ✅ 상세 페이지로 안 넘어가게 막음
                  handleDelete(post.id);
                }}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: "#ff4d4d",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  padding: "0.25rem 0.5rem",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
