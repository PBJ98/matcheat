"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";

export default function MatchesPage() {
  type Post = {
    id: string;
    category: string;
    title: string;
    content: string;
    authorId: string;
    authorName?: string;
    restaurant?: string;
    maxParticipants?: number;
    location?: string;
    status?: "open" | "closed";
    participantsCount?: number;
    createdAt?: Date | null; // ✅ 표시용
  };

  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [location, setLocation] = useState("전체");
  const [showClosed, setShowClosed] = useState(false);

  // ✅ 정렬 옵션
  type SortBy = "latest" | "oldest" | "fill-desc" | "fill-asc";
  const [sortBy, setSortBy] = useState<SortBy>("latest");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    setCurrentUserId(auth.currentUser?.uid || null);
    const unsub = auth.onAuthStateChanged((u) => setCurrentUserId(u?.uid ?? null));
    return () => unsub();
  }, []);

  // 시간 포맷
  const timeAgo = (d?: Date | null) => {
    if (!d) return "";
    const diff = (Date.now() - d.getTime()) / 1000; // s
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
    // YYYY.MM.DD HH:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  // ✅ 실시간 구독 + 자동 마감 처리 (participantsCount 기준)
  useEffect(() => {
    const qy = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qy, async (snap) => {
      const list: Post[] = [];
      const updates: Promise<any>[] = [];

      snap.forEach((d) => {
        const data = d.data() as any;

        const curr: number =
          typeof data.participantsCount === "number" ? data.participantsCount : 0;
        const max: number | undefined =
          typeof data.maxParticipants === "number" ? data.maxParticipants : undefined;
        const status: "open" | "closed" = data.status ?? "open";
        const full = typeof max === "number" && max > 0 ? curr >= max : false;

        if (full && status !== "closed") {
          updates.push(
            updateDoc(doc(db, "posts", d.id), {
              status: "closed",
              closedAt: serverTimestamp(),
            }).catch(() => {})
          );
        }

        list.push({
          id: d.id,
          category: data.category ?? "기타",
          title: data.title ?? "(제목 없음)",
          content: data.content ?? "",
          authorId: data.authorId ?? "",
          authorName: data.authorName ?? "",
          restaurant: data.restaurant ?? "",
          maxParticipants: max,
          location: data.location ?? "",
          status,
          participantsCount: curr,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null, // ✅
        });
      });

      setPosts(list);
      if (updates.length) Promise.allSettled(updates);
    });

    return () => unsub();
  }, []);

  const categories = ["전체", "한식", "중식", "일식", "양식"];
  const SEOUL_DISTRICTS = [
    "전체",
    "강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구",
    "노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구",
    "성동구","성북구","송파구","양천구","영등포구","용산구","은평구",
    "종로구","중구","중랑구",
  ];

  // 삭제
  const handleDelete = async (postId: string) => {
    if (!currentUserId) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      alert("글이 삭제되었습니다.");
    } catch (e) {
      console.error("삭제 실패:", e);
      alert("삭제에 실패했습니다.");
    }
  };

  // 필터링
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (!showClosed && post.status === "closed") return false;
      const matchesCategory = category === "전체" ? true : post.category === category;
      const matchesLocation = location === "전체" ? true : post.location === location;
      const matchesSearch = search
        ? (post.title || "").includes(search) || (post.content || "").includes(search)
        : true;
      return matchesCategory && matchesLocation && matchesSearch;
    });
  }, [posts, showClosed, category, location, search]);

  // ✅ 정렬
  const sortedPosts = useMemo(() => {
    const arr = [...filteredPosts];
    arr.sort((a, b) => {
      const aCnt = typeof a.participantsCount === "number" ? a.participantsCount : 0;
      const bCnt = typeof b.participantsCount === "number" ? b.participantsCount : 0;
      const aMax = typeof a.maxParticipants === "number" ? a.maxParticipants : 0;
      const bMax = typeof b.maxParticipants === "number" ? b.maxParticipants : 0;

      if (sortBy === "latest") {
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      }
      if (sortBy === "oldest") {
        return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
      }
      if (sortBy === "fill-desc") {
        const aRate = aMax ? aCnt / aMax : 0;
        const bRate = bMax ? bCnt / bMax : 0;
        return bRate - aRate;
      }
      // "fill-asc"
      const aRate = aMax ? aCnt / aMax : 0;
      const bRate2 = bMax ? bCnt / bMax : 0;
      return aRate - bRate2;
    });
    return arr;
  }, [filteredPosts, sortBy]);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", paddingBottom: "90px" }}>
      {/* 헤더 + 정렬 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>모임 찾기</h1>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#444" }}>
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
          />
          마감 포함 보기
        </label>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#666" }}>정렬</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd" }}
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="fill-desc">채움률 높은순</option>
            <option value="fill-asc">채움률 낮은순</option>
          </select>
        </div>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="검색어 입력"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "0.5rem", width: "100%", marginBottom: "1rem", borderRadius: "5px", border: "1px solid #ccc" }}
      />

      {/* 카테고리 */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {["전체","한식","중식","일식","양식"].map((cat) => (
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

      {/* 장소 */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {[
          "전체","강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구",
          "노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구",
          "성동구","성북구","송파구","양천구","영등포구","용산구","은평구",
          "종로구","중구","중랑구",
        ].map((dist) => (
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

      {/* 글 등록 */}
      <button
        onClick={() => router.push("/pages/matches/uplist")}
        style={{ padding: "0.5rem 1.5rem", backgroundColor: "#003366", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginBottom: "1rem" }}
      >
        글 등록
      </button>

      {/* 리스트 */}
      <div>
        {sortedPosts.map((post) => {
          const curr = typeof post.participantsCount === "number" ? post.participantsCount : 0;
          const hasMax = typeof post.maxParticipants === "number" && post.maxParticipants > 0;
          const full = hasMax ? curr >= (post.maxParticipants as number) : false;
          const pct = hasMax ? Math.min(100, Math.round((curr / (post.maxParticipants as number)) * 100)) : 0;

          return (
            <div
              key={post.id}
              style={{
                padding: "1rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "1rem",
                position: "relative",
                cursor: "pointer",
                background: full ? "#fff7f7" : "white",
              }}
              onClick={() => router.push(`/pages/matches/${post.id}`)}
            >
              {/* 제목 + 배지 + 작성시각 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <strong style={{ fontSize: 16 }}>{post.title}</strong>
                {hasMax && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: full ? "#fee2e2" : "#e0f2fe",
                      color: full ? "#b91c1c" : "#075985",
                      border: `1px solid ${full ? "#fecaca" : "#bae6fd"}`,
                    }}
                  >
                    {full ? "마감" : "모집중"}
                  </span>
                )}
                <span title={post.createdAt?.toString()} style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
                  {timeAgo(post.createdAt)} {/* ✅ 작성 시각 표기 */}
                </span>
              </div>

              <p style={{ margin: "2px 0", color: "#333" }}>
                인원: {hasMax ? `${curr} / ${post.maxParticipants}` : "미정"}
              </p>
              <p style={{ margin: "2px 0", color: "#555" }}>장소: {post.location || "미정"}</p>

              {hasMax && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 8, width: "100%", background: "#f3f4f6", borderRadius: 999 }}>
                    <div
                      style={{
                        height: 8,
                        width: `${pct}%`,
                        background: full ? "#ef4444" : "#3b82f6",
                        borderRadius: 999,
                        transition: "width 200ms linear",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                    {pct}% 채움
                  </div>
                </div>
              )}

              {currentUserId && post.authorId === currentUserId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(post.id);
                  }}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "#ff4d4d",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.25rem 0.5rem",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

