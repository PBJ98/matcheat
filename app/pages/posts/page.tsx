"use client";
import { useEffect, useState, useRef } from "react";
import { db, auth } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Post = {
  id: string;
  restaurant?: string;
  category?: string;
  title?: string;
  content?: string;
  location?: string;
  maxParticipants?: number;
  preferredGender?: string;
  preferredMbti?: string[];
  createdAt?: any;
  authorId?: string;
  lat?: number;
  lng?: number;
  meetAt?: any; // ✅ 모임 일시
  chatLink?: string; // ✅ 오픈채팅 링크
};

const CATEGORIES = ["한식", "중식", "일식", "양식"];
const LOCATIONS = [
  "강남구", "강동구", "강북구", "강서구",
  "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구",
  "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구",
  "용산구", "은평구", "종로구", "중구", "중랑구",
];
const GENDERS = ["성별 무관", "남성", "여성"];
const MBTIS = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

const PRIMARY = "#ff7f50"; // 🍑 메인 포인트 컬러

export default function PostsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editData, setEditData] = useState<Partial<Post>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!uid) return;
      try {
        const q = query(
          collection(db, "posts"),
          where("authorId", "==", uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        setPosts(fetched);
      } catch (err) {
        console.error("게시글 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyPosts();
  }, [uid]);

  const handleDelete = async (postId: string) => {
    if (!confirm("정말 이 글을 삭제할까요?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      alert("삭제 완료!");
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  const startEditing = (post: Post) => {
    setEditingPost(post);
    setEditData(post);
  };
  const cancelEditing = () => {
    setEditingPost(null);
    setEditData({});
  };
  const handleUpdate = async () => {
    if (!editingPost) return;
    try {
      await updateDoc(doc(db, "posts", editingPost.id), editData);
      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...editData } : p))
      );
      alert("수정 완료!");
      cancelEditing();
    } catch (err) {
      console.error("수정 실패:", err);
    }
  };
  const handleChange = (key: keyof Post, value: any) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  if (loading)
    return <div style={{ padding: "2rem", textAlign: "center" }}>불러오는 중...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        내가 쓴 글 ✍️
      </h1>

      <div
        style={{
          backgroundColor: "#fff3e8",
          border: `1px solid ${PRIMARY}33`,
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "16px",
          color: "#6b4f3a",
        }}
      >
        📊 총 작성 글 수: <strong>{posts.length}</strong> 개
      </div>

      {posts.length === 0 ? (
        <p style={{ color: "#8b7b72" }}>작성한 글이 없습니다.</p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            editingPost={editingPost}
            editData={editData}
            onChange={handleChange}
            onUpdate={handleUpdate}
            onEdit={startEditing}
            onCancel={cancelEditing}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}

// ✅ 개별 카드
function PostCard({
  post,
  editingPost,
  editData,
  onChange,
  onUpdate,
  onEdit,
  onCancel,
  onDelete,
}: any) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || editingPost?.id !== post.id) return;
    const w = window as any;
    const loadMap = () => {
      const kakao = w.kakao;
      const center = new kakao.maps.LatLng(
        editData.lat || post.lat || 37.5665,
        editData.lng || post.lng || 126.978
      );
      const map = new kakao.maps.Map(mapRef.current, { center, level: 4 });
      markerRef.current = new kakao.maps.Marker({ position: center, map });
      kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        markerRef.current.setPosition(latlng);
        onChange("lat", latlng.getLat());
        onChange("lng", latlng.getLng());
      });
      setTimeout(() => {
        kakao.maps.event.trigger(map, "resize");
        map.setCenter(center);
      }, 300);
    };
    if (w.kakao && w.kakao.maps) setTimeout(() => w.kakao.maps.load(loadMap), 200);
    else {
      const s = document.createElement("script");
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`;
      s.async = true;
      s.onload = () => setTimeout(() => w.kakao.maps.load(loadMap), 200);
      document.head.appendChild(s);
    }
  }, [editingPost, post.id, editData.lat, editData.lng, onChange, post.lat, post.lng]);

  return (
    <div
      style={{
        border: `1px solid ${PRIMARY}33`,
        padding: "1rem",
        borderRadius: "12px",
        background: "white",
        marginBottom: "1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {editingPost?.id === post.id ? (
        <>
          <input
            value={editData.restaurant ?? ""}
            placeholder="음식점 이름"
            onChange={(e) => onChange("restaurant", e.target.value)}
            style={inputStyle}
          />

          <div style={{ marginBottom: "10px" }}>
            {CATEGORIES.map((cat) => {
              const active = editData.category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onChange("category", cat)}
                  style={{
                    ...chipStyle,
                    backgroundColor: active ? PRIMARY : "white",
                    color: active ? "white" : PRIMARY,
                    borderColor: PRIMARY,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <input
            value={editData.title ?? ""}
            placeholder="글 제목"
            onChange={(e) => onChange("title", e.target.value)}
            style={inputStyle}
          />
          <textarea
            value={editData.content ?? ""}
            placeholder="글 내용"
            onChange={(e) => onChange("content", e.target.value)}
            style={{ ...inputStyle, height: "80px" }}
          />
          <input
            type="number"
            value={editData.maxParticipants ?? ""}
            placeholder="모집 인원"
            onChange={(e) => onChange("maxParticipants", Number(e.target.value))}
            style={inputStyle}
          />
          <select
            value={editData.location ?? ""}
            onChange={(e) => onChange("location", e.target.value)}
            style={inputStyle}
          >
            <option value="">장소 선택 (서울 내 구)</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {/* ✅ 새 항목 1: 모임 일시 */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input
              type="date"
              value={
                editData.meetAt
                  ? new Date(editData.meetAt.seconds * 1000)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const date = e.target.value;
                const old = editData.meetAt
                  ? new Date(editData.meetAt.seconds * 1000)
                  : new Date();
                const [h, m] = [
                  old.getHours().toString().padStart(2, "0"),
                  old.getMinutes().toString().padStart(2, "0"),
                ];
                const newDate = new Date(`${date}T${h}:${m}`);
                onChange("meetAt", { seconds: Math.floor(newDate.getTime() / 1000) });
              }}
              style={inputStyle}
            />
            <input
              type="time"
              value={
                editData.meetAt
                  ? new Date(editData.meetAt.seconds * 1000)
                      .toTimeString()
                      .slice(0, 5)
                  : "19:00"
              }
              onChange={(e) => {
                const time = e.target.value;
                const base = editData.meetAt
                  ? new Date(editData.meetAt.seconds * 1000)
                  : new Date();
                const [h, m] = time.split(":").map(Number);
                base.setHours(h, m, 0, 0);
                onChange("meetAt", { seconds: Math.floor(base.getTime() / 1000) });
              }}
              style={inputStyle}
            />
          </div>

          {/* ✅ 새 항목 2: 오픈채팅 링크 */}
          <input
            type="url"
            placeholder="오픈채팅 링크 (선택)"
            value={editData.chatLink ?? ""}
            onChange={(e) => onChange("chatLink", e.target.value)}
            style={inputStyle}
          />

          <div
            ref={mapRef}
            style={{
              width: "100%",
              height: "220px",
              borderRadius: "8px",
              border: `1px solid ${PRIMARY}33`,
              marginBottom: "10px",
            }}
          />

          <select
            value={editData.preferredGender ?? ""}
            onChange={(e) => onChange("preferredGender", e.target.value)}
            style={inputStyle}
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <div style={{ marginBottom: "10px" }}>
            {MBTIS.map((m) => {
              const active = editData.preferredMbti?.includes(m);
              return (
                <button
                  key={m}
                 onClick={() => {
                        const updatedMbti = active
                      ? (editData.preferredMbti ?? []).filter((x: string) => x !== m)
                      : [...(editData.preferredMbti ?? []), m];
                    onChange("preferredMbti", updatedMbti);
                  }}

                  style={{
                    ...chipStyle,
                    backgroundColor: active ? PRIMARY : "white",
                    color: active ? "white" : PRIMARY,
                    borderColor: PRIMARY,
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={saveBtn} onClick={onUpdate}>
              저장
            </button>
            <button style={cancelBtn} onClick={onCancel}>
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 style={{ fontWeight: "bold" }}>{post.title}</h2>
          <p>{post.content}</p>
          <p>🍽️ 음식점: {post.restaurant}</p>
          <p>📂 카테고리: {post.category}</p>
          <p>📍 위치: {post.location || "주소 미등록"}</p>
          <p>👥 모집 인원: {post.maxParticipants}</p>
          <p>🚻 성별: {post.preferredGender}</p>
          <p>🧠 희망 MBTI: {post.preferredMbti?.join(", ")}</p>
          {/* ✅ 보기 모드용 새 항목 */}
          {post.meetAt && (
            <p>🕓 모임 일시: {new Date(post.meetAt.seconds * 1000).toLocaleString()}</p>
          )}
          {post.chatLink && (
            <p>
              💬 오픈채팅:{" "}
              <a href={post.chatLink} target="_blank" style={{ color: PRIMARY }}>
                링크 열기
              </a>
            </p>
          )}
          <p style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
            작성일:{" "}
            {post.createdAt &&
              new Date(post.createdAt.seconds * 1000).toLocaleString()}
          </p>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={editBtn} onClick={() => onEdit(post)}>
              수정
            </button>
            <button style={deleteBtn} onClick={() => onDelete(post.id)}>
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginBottom: "8px",
  padding: "8px",
  border: `1px solid ${PRIMARY}33`,
  borderRadius: "6px",
};

const chipStyle: React.CSSProperties = {
  border: `1px solid ${PRIMARY}`,
  borderRadius: "999px",
  padding: "6px 10px",
  marginRight: "6px",
  cursor: "pointer",
  background: "white",
  color: PRIMARY,
  transition: "all 0.2s",
};

const editBtn: React.CSSProperties = {
  flex: 1,
  backgroundColor: PRIMARY, // 수정도 코랄
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "8px 12px",
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  flex: 1,
  backgroundColor: "#f87171", // 삭제는 레드 유지
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "8px 12px",
  cursor: "pointer",
};

const saveBtn: React.CSSProperties = {
  flex: 1,
  backgroundColor: PRIMARY,
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "8px 12px",
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  flex: 1,
  backgroundColor: "#9ca3af",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "8px 12px",
  cursor: "pointer",
};
