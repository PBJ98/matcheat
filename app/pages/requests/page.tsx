"use client";
import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, getDocs, updateDoc, deleteDoc, doc,
  getDoc, addDoc, serverTimestamp, arrayUnion, runTransaction,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "../../../firebase";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

interface ChatRoom {
  id: string;
  title: string;
  participants: string[];
  lastMessage: string;
  lastUpdated?: any;
  unreadCount?: { [uid: string]: number };
}

type Request = {
  id: string;
  postId: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "rejected" | "matched";
  createdAt?: any;
};

type Post = {
  title: string;
  authorId: string;
};

type User = {
  name: string;
  district?: string;
  mbti?: string;
};

export default function RequestsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [receivedRequests, setReceivedRequests] = useState<Request[]>([]);
  const [sentRequests, setSentRequests] = useState<Request[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [postsMap, setPostsMap] = useState<Record<string, Post>>({});
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  // ===== 알림/전이 감지 보조 =====
  const initialReceivedLoaded = useRef(false);
  const initialSentLoaded = useRef(false);
  const mountedAtRef = useRef<number>(Date.now());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const prevReceivedIdsRef = useRef<Set<string>>(new Set());
  const prevStatusReceivedRef = useRef<Map<string, Request["status"]>>(new Map());
  const prevStatusSentRef = useRef<Map<string, Request["status"]>>(new Map());
  const seenMatchedRef = useRef<Set<string>>(new Set());

  const postsRef = useRef<Record<string, Post>>({});
  const usersRef = useRef<Record<string, User>>({});
  useEffect(() => { postsRef.current = postsMap; }, [postsMap]);
  useEffect(() => { usersRef.current = usersMap; }, [usersMap]);

  // 로그인 사용자
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  // 한글 깨짐 대비
  const safeDecode = (s: string) => {
    if (!s) return "제목 없음";
    try { return decodeURIComponent(escape(s)); } catch { return s; }
  };
  const safeTitle = (postId: string) => {
    const raw = postsMap[postId]?.title ?? (postsMap[postId] as any)?.titles ?? "";
    return raw ? safeDecode(raw) : "제목 없음";
  };

  // 🔧 수정: post/user 정보가 없으면 즉시 불러오는 함수
  const ensurePostsAndUsers = async (reqs: Request[]) => {
    let nextPosts = { ...postsRef.current };
    let nextUsers = { ...usersRef.current };

    const needPostIds = Array.from(new Set(reqs.map(r => r.postId).filter(pid => !nextPosts[pid])));
    const needUserIds = Array.from(new Set(reqs.flatMap(r => [r.fromUserId, r.toUserId]).filter(uid => !nextUsers[uid])));

    // 🔧 postsMap 채우기
    for (const postId of needPostIds) {
      const p = await getDoc(doc(db, "posts", postId));
      if (p.exists()) {
        const d = p.data() as any;
        nextPosts[postId] = {
          title: d.title ?? d.titles ?? d.name ?? "(제목 없음)",
          authorId: d.authorId ?? d.uid ?? "",
        };
      } else {
        nextPosts[postId] = { title: "(삭제된 게시글)", authorId: "" };
      }
    }
    if (needPostIds.length) setPostsMap(nextPosts);

    // 🔧 usersMap 채우기
    for (const uid of needUserIds) {
      const u = await getDoc(doc(db, "users", uid));
      if (u.exists()) nextUsers[uid] = u.data() as User;
    }
    if (needUserIds.length) setUsersMap(nextUsers);

    return { nextPosts, nextUsers };
  };

  // 🔧 수정: received + sent 요청 로딩 시 postsMap도 같이 로드
  useEffect(() => {
    if (!currentUserId) return;

    const loadRequests = async () => {
      const recvQ = query(collection(db, "requests"), where("toUserId", "==", currentUserId));
      const sentQ = query(collection(db, "requests"), where("fromUserId", "==", currentUserId));

      const [recvSnap, sentSnap] = await Promise.all([getDocs(recvQ), getDocs(sentQ)]);
      const recvList = recvSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Request, "id">) }));
      const sentList = sentSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Request, "id">) }));

      // 🔧 여기서 postsMap + usersMap 함께 채움
      await ensurePostsAndUsers([...recvList, ...sentList]);

      setReceivedRequests(recvList);
      setSentRequests(sentList);
    };

    loadRequests();
  }, [currentUserId]);

  // 실시간: 받은 요청
  useEffect(() => {
    if (!currentUserId) return;

    const qReceived = query(
      collection(db, "requests"),
      where("toUserId", "==", currentUserId)
    );

    const unSub = onSnapshot(qReceived, async (snap) => {
      const list: Request[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Request, "id">) }));
      const { nextPosts, nextUsers } = await ensurePostsAndUsers(list);
      const filtered = list.filter(r => !!nextPosts[r.postId]);
      setReceivedRequests(filtered);

      // 새 요청 감지
      const currIds = new Set(filtered.map(r => r.id));
      const prevIds = prevReceivedIdsRef.current;

      if (!initialReceivedLoaded.current) {
        initialReceivedLoaded.current = true;
        prevReceivedIdsRef.current = currIds;
      } else {
        const newlyAddedIds: string[] = [];
        currIds.forEach(id => { if (!prevIds.has(id)) newlyAddedIds.push(id); });
        prevReceivedIdsRef.current = currIds;

        newlyAddedIds.forEach((id) => {
          const req = filtered.find(r => r.id === id);
          if (!req || req.status !== "pending") return;
          if (seenIdsRef.current.has(id)) return;
          seenIdsRef.current.add(id);

          const ts = (req.createdAt && typeof (req.createdAt as any).toMillis === "function")
            ? (req.createdAt as any).toMillis()
            : 0;
          if (ts && ts < mountedAtRef.current) return;

          const senderName = nextUsers[req.fromUserId]?.name ?? "새 사용자";
          toast.success(`📩 ${senderName}님이 밥친구 요청을 보냈습니다!`, { duration: 3000 });
        });
      }

      // 상태 전이: matched
      filtered.forEach((req) => {
        const prev = prevStatusReceivedRef.current.get(req.id);
        if (prev !== req.status) {
          prevStatusReceivedRef.current.set(req.id, req.status);
          if (prev && prev !== "matched" && req.status === "matched") {
            if (!seenMatchedRef.current.has(req.id)) {
              seenMatchedRef.current.add(req.id);
              const otherName = nextUsers[req.fromUserId]?.name ?? "상대";
              toast(`✅ ${otherName}님과 매칭이 성사됐습니다.`, { icon: "🎉", duration: 3500 });
            }
          }
        }
      });
      if (!prevStatusReceivedRef.current.size) {
        filtered.forEach(r => prevStatusReceivedRef.current.set(r.id, r.status));
      }
    });

    return () => unSub();
  }, [currentUserId]);

  // 실시간: 보낸 요청 (상대 수락 알림)
  useEffect(() => {
    if (!currentUserId) return;

    const qSent = query(
      collection(db, "requests"),
      where("fromUserId", "==", currentUserId)
    );

    const unSub = onSnapshot(qSent, async (snap) => {
      const list: Request[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Request, "id">) }));
      const { nextUsers } = await ensurePostsAndUsers(list);
      setSentRequests(list);

      list.forEach((req) => {
        const prev = prevStatusSentRef.current.get(req.id);
        if (prev !== req.status) {
          prevStatusSentRef.current.set(req.id, req.status);
          if (prev && prev !== "matched" && req.status === "matched") {
            if (!seenMatchedRef.current.has(req.id)) {
              seenMatchedRef.current.add(req.id);
              const otherName = nextUsers[req.toUserId]?.name ?? "상대";
              toast.success(`🤝 ${otherName}님이 요청을 수락했어요! 채팅으로 이동해보세요.`, { duration: 3500 });
            }
          }
        }
      });
      if (!prevStatusSentRef.current.size) {
        list.forEach(r => prevStatusSentRef.current.set(r.id, r.status));
      }
    });

    return () => unSub();
  }, [currentUserId]);

  // 액션
  const handleReceivedAction = async (reqId: string, action: "rejected" | "matched") => {
    const req = receivedRequests.find(r => r.id === reqId);
    if (!req) return;

    if (action === "rejected") {
      await updateDoc(doc(db, "requests", reqId), { status: "rejected" });
      toast(`요청을 거절했습니다.`, { icon: "🚫" });
      return;
    }

    try {
      await runTransaction(db, async (tx) => {
        const postRef = doc(db, "posts", req.postId);
        const snap = await tx.get(postRef);
        if (!snap.exists()) throw new Error("글이 존재하지 않습니다.");

        const post: any = snap.data();
        const max = Number(post.maxParticipants ?? 0);
        const cur = Number(post.participantsCount ?? 0);
        const status = (post.status ?? "open") as "open" | "closed";

        if (status === "closed") throw new Error("이미 모집이 마감되었습니다.");
        if (max > 0 && cur >= max) throw new Error("정원이 가득 찼습니다.");

        const participantRef = doc(db, "posts", req.postId, "participants", req.fromUserId);
        const mine = await tx.get(participantRef);

        let next = cur;
        if (!mine.exists()) {
          tx.set(participantRef, { uid: req.fromUserId, joinedAt: serverTimestamp() });
          next = cur + 1;
        }

        const upd: any = { participantsCount: next };
        if (max > 0 && next >= max) upd.status = "closed";
        tx.update(postRef, upd);
      });

      await updateDoc(doc(db, "requests", reqId), { status: "matched" });
      toast.success("참가 처리되었습니다!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "참가 처리 중 오류가 발생했습니다.");
    }
  };

  const handleCancelRequest = async (reqId: string) => {
    if (confirm("요청을 취소하시겠습니까?")) {
      await deleteDoc(doc(db, "requests", reqId));
      toast("요청을 취소했습니다.", { icon: "↩️" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f0ad4e";
      case "rejected": return "#d9534f";
      case "matched": return "#059669";
      default: return "#64748b";
    }
  };

  const handleStartChat = async (req: Request) => {
    if (!currentUserId) return;
    try {
      const roomTitle = postsMap[req.postId]?.title || "제목 없음";
      const q = query(collection(db, "chatRooms"), where("title", "==", roomTitle));
      const snapshot = await getDocs(q);

      let chatRoomId: string | null = null;
      snapshot.forEach(d => { chatRoomId = d.id; });

      if (chatRoomId) {
        const roomRef = doc(db, "chatRooms", chatRoomId);
        await updateDoc(roomRef, { participants: arrayUnion(req.fromUserId, req.toUserId) });
        router.push(`/pages/chat/${chatRoomId}`);
        return;
      }

      const newRoom = {
        title: roomTitle,
        participants: [req.fromUserId, req.toUserId],
        lastMessage: "",
        lastUpdated: serverTimestamp(),
        unreadCount: { [req.fromUserId]: 0, [req.toUserId]: 0 },
      };
      const docRef = await addDoc(collection(db, "chatRooms"), newRoom);
      router.push(`/pages/chat/${docRef.id}`);
    } catch (error) {
      console.error("❌ 채팅방 생성/참여 오류:", error);
      toast.error("채팅방 이동 중 오류가 발생했습니다.");
    }
  };

  const ReceivedList = () => (
    <div className="grid">
      {receivedRequests.length ? receivedRequests.map((req) => {
        const sender = usersMap[req.fromUserId];
        return (
          <article key={req.id} className="card" role="group" aria-label="받은 요청 카드">
            <header className="card__header">
              <div className="title-line">
                <span className="eyebrow">글 제목</span>
                <h3 className="title" title={safeTitle(req.postId)}>
                  {postsMap[req.postId]?.title ? safeTitle(req.postId) : "제목 불러오는 중..."}
                </h3>
              </div>
              <span className={`chip ${req.status === "pending" ? "chip--pending" : req.status === "matched" ? "chip--matched" : "chip--rejected"}`}>
                {req.status === "pending" ? "대기중" : req.status === "matched" ? "매칭완료" : "거절됨"}
              </span>
            </header>

            <div className="card__body">
              <dl className="meta">
                <div><dt>보낸 사람</dt><dd>{sender?.name || req.fromUserId}</dd></div>
                <div><dt>위치</dt><dd>{sender?.district || "비공개"}</dd></div>
                <div><dt>MBTI</dt><dd>{sender?.mbti || "비공개"}</dd></div>
              </dl>

              <div className="actions">
                {req.status === "pending" ? (
                  <>
                    <button className="btn btn--primary" onClick={() => handleReceivedAction(req.id, "matched")}>수락</button>
                    <button className="btn btn--danger" onClick={() => handleReceivedAction(req.id, "rejected")}>거절</button>
                  </>
                ) : req.status === "matched" ? (
                  <div className="matchedRow">
                    <span className="chip chip--matched chip--bold">매치 완료</span>
                    <button className="btn btn--chat" onClick={() => handleStartChat(req)}>채팅으로 이동</button>
                  </div>
                ) : (
                  <span className="chip chip--rejected chip--bold">거절됨</span>
                )}
              </div>
            </div>
          </article>
        );
      }) : (
        <div className="empty">
          <p>받은 요청이 없습니다.</p>
        </div>
      )}
    </div>
  );

  const SentList = () => (
    <div className="grid">
      {sentRequests.length ? sentRequests.map((req) => (
        <article key={req.id} className="card" role="group" aria-label="보낸 요청 카드">
          <header className="card__header">
            <div className="title-line">
              <span className="eyebrow">글 제목</span>
              <h3 className="title" title={safeTitle(req.postId)}>{safeTitle(req.postId)}</h3>
            </div>
            <span className={`chip ${req.status === "pending" ? "chip--pending" : req.status === "matched" ? "chip--matched" : "chip--rejected"}`}>
              {req.status === "pending" ? "대기중" : req.status === "matched" ? "매칭완료" : "거절됨"}
            </span>
          </header>

          <div className="card__body">
            <p className="statusLine">
              상태:
              <strong style={{ color: getStatusColor(req.status), marginLeft: 6 }}>
                {req.status === "pending" ? "대기중" : req.status === "matched" ? "매칭완료" : "거절됨"}
              </strong>
            </p>

            <div className="actions">
              {req.status === "pending" && (
                <button className="btn btn--neutral" onClick={() => handleCancelRequest(req.id)}>요청 취소</button>
              )}
              {req.status === "matched" && (
                <div className="matchedRow">
                  <span className="chip chip--matched chip--bold">매치 완료</span>
                  <button className="btn btn--chat" onClick={() => handleStartChat(req)}>채팅으로 이동</button>
                </div>
              )}
            </div>
          </div>
        </article>
      )) : (
        <div className="empty">
          <p>보낸 요청이 없습니다.</p>
        </div>
      )}
    </div>
  );

  return (
    <main className="rq-page">
      <Toaster position="bottom-center" />

      {/* 상단 고정 헤더 + 세그먼트 */}
      <div className="topbar" role="tablist" aria-label="요청 목록 전환">
        <h1 className="topbar__title">밥친구 요청함</h1>
        <div className="seg">
          <button
            role="tab"
            aria-selected={activeTab === "received"}
            className={`seg__item ${activeTab === "received" ? "is-active" : ""}`}
            onClick={() => setActiveTab("received")}
          >
            받은 요청
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "sent"}
            className={`seg__item ${activeTab === "sent" ? "is-active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            보낸 요청
          </button>
          <span className="seg__glider" data-pos={activeTab} />
        </div>
      </div>

      {/* 콘텐츠 */}
      <section className="content" aria-live="polite">
        {activeTab === "received" ? <ReceivedList /> : <SentList />}
      </section>
          {/* ⬇️ 이전: <style jsx>{` ... `}</style>  를 전부 교체 */}
      <style jsx global>{`
        :root{
          --bg:#f6f9ff; --card:#fff; --ink:#0b1220; --muted:#5b6b8b;
          --blue-25:#f3f7ff; --blue-50:#e8f0ff; --blue-100:#dbeafe; --blue-200:#c3dafe;
          --blue-300:#93c5fd; --blue-400:#60a5fa; --blue-500:#3b82f6; --blue-600:#2563eb;
          --blue-700:#1d4ed8; --blue-800:#1e40af;
          --ring:0 0 0 3px rgba(59,130,246,.25);
          --shadow-sm:0 4px 12px rgba(30,64,175,.08);
          --shadow:0 10px 24px rgba(30,64,175,.12);
          --shadow-lg:0 14px 32px rgba(29,78,216,.16);
          --radius:18px;
        }

        /* 모든 규칙을 rq-page 스코프로 묶어서 전역화 + 우선순위 상승 */
        .rq-page{
          min-height:100vh;
          background:linear-gradient(180deg,var(--blue-25),var(--bg));
          color:var(--ink);
        }

        .rq-page .topbar{
          position:sticky; top:0; z-index:10;
          backdrop-filter:saturate(120%) blur(6px);
          background:rgba(246,249,255,.8);
          border-bottom:1px solid var(--blue-100);
          padding:14px 16px 12px;
        }
        .rq-page .topbar__title{
          margin:0 0 10px; font-size:1.15rem; font-weight:800; letter-spacing:.2px;
          color:var(--blue-800);
        }

        .rq-page .seg{
          position:relative; display:grid; grid-template-columns:1fr 1fr;
          background:#fff; border:2px solid var(--blue-200);
          border-radius:999px; box-shadow:var(--shadow-sm); overflow:hidden;
        }
        .rq-page .seg__item{
          position:relative; z-index:1; appearance:none; background:transparent; border:0;
          padding:10px 0; font-weight:700; color:var(--muted); cursor:pointer;
        }
        .rq-page .seg__item.is-active{ color:#000; } /* 활성 탭 검정 */
        .rq-page .seg__item:focus-visible{ outline:none; box-shadow:var(--ring); border-radius:999px; }
        .rq-page .seg__glider{
          position:absolute; inset:3px; width:calc(50% - 6px);
          border-radius:999px; background:linear-gradient(135deg,var(--blue-100),var(--blue-300));
          box-shadow:0 6px 18px rgba(59,130,246,.28);
          transform:translateX(0);
          transition:transform .25s cubic-bezier(.2,.8,.2,1);
        }
        .rq-page .seg__glider[data-pos="sent"]{ transform:translateX(100%); }

        .rq-page .content{ padding:16px; max-width:1100px; margin:0 auto; }

        .rq-page .grid{ display:grid; grid-template-columns:1fr; gap:14px; }
        @media (min-width:640px){ .rq-page .grid{ grid-template-columns:1fr 1fr; gap:16px; } }
        @media (min-width:1024px){ .rq-page .grid{ grid-template-columns:1fr 1fr 1fr; gap:18px; } }

        /* ★ 카드 시각 강조: 테두리/섀도우 확실히 */
        .rq-page .card{
          background:var(--card);
          border:2px solid var(--blue-300) !important; /* 우선순위 확보 */
          border-radius:var(--radius);
          box-shadow:var(--shadow) !important;
          overflow:clip;
          transition:transform .15s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .rq-page .card:hover{
          transform:translateY(-2px);
          box-shadow:var(--shadow-lg) !important;
          border-color:var(--blue-500) !important;
        }

        .rq-page .card__header{
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          padding:14px 16px;
          background:linear-gradient(180deg,var(--blue-50),#fff);
          border-bottom:2px solid var(--blue-200);
        }
        .rq-page .title-line{ display:grid; gap:6px; min-width:0; }
        .rq-page .eyebrow{ font-size:.78rem; font-weight:700; color:var(--blue-600); letter-spacing:.15px; }
        .rq-page .title{ margin:0; font-size:1rem; font-weight:800; color:#0b1220; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        .rq-page .card__body{ padding:14px 16px; display:grid; gap:12px; }
        .rq-page .meta{ display:grid; gap:8px; grid-template-columns:1fr 1fr 1fr; }
        .rq-page .meta dt{ font-size:.8rem; color:var(--muted); }
        .rq-page .meta dd{ margin:2px 0 0; font-weight:700; color:#0b1220; }

        .rq-page .actions{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .rq-page .matchedRow{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

        .rq-page .chip{
          display:inline-block; padding:6px 10px; border-radius:999px;
          font-size:.82rem; font-weight:700; border:2px solid transparent;
          box-shadow:0 4px 12px rgba(2,6,23,.04);
        }
        .rq-page .chip--pending{ background:#fff3cd; color:#000; border-color:#ffe08a; }
        .rq-page .chip--rejected{ background:#fee2e2; color:#000; border-color:#fecaca; }
        .rq-page .chip--matched{ background:#d1fae5; color:#000; border-color:#059669; }
        .rq-page .chip--bold{ letter-spacing:.2px; }

        .rq-page .btn{
          appearance:none; border:0; border-radius:12px; padding:10px 14px;
          font-weight:800; letter-spacing:.2px;
          box-shadow:0 6px 16px rgba(2,6,23,.06);
          transition:transform .1s ease, filter .15s ease, box-shadow .15s ease;
        }
        .rq-page .btn:focus-visible{ outline:none; box-shadow:var(--ring); }
        .rq-page .btn:active{ transform:translateY(1px); }
        .rq-page .btn--primary{ background:linear-gradient(135deg,var(--blue-500),var(--blue-600)); color:#fff; }
        .rq-page .btn--danger{ background:linear-gradient(135deg,#f87171,#ef4444); color:#fff; }
        .rq-page .btn--neutral{ background:#e5e7eb; color:#0b1220; }

        /* 요구사항: 채팅/매칭완료 텍스트는 검정 */
        .rq-page .btn--chat{
         background: linear-gradient(135deg, #c7e8ff, #bde3ff);
          border: 2px solid #bde3ff;
          color: #000;
          box-shadow: 0 10px 24px rgba(189,227,255,.35);
        }
      `}</style>

      
    </main>
  );
}

/**
 * ✅ 요청 생성 코드(다른 파일) 예시:
 * await addDoc(collection(db, "requests"), {
 *   postId,
 *   fromUserId,
 *   toUserId,
 *   status: "pending",
 *   createdAt: serverTimestamp(),
 * });
*/
