// app/chat/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  doc, getDocs, getDoc, updateDoc, increment, runTransaction, deleteDoc,
  arrayRemove, deleteField, arrayUnion,
} from "firebase/firestore";

// 🔧 경로 별칭(@)을 쓰는 구조라면 이렇게, 아니면 상대경로로 바꿔줘: ../../../../firebase
import { db, auth } from "@/firebase";

import { onAuthStateChanged } from "firebase/auth";
import LocationShareMap from "../../../components/LocationShareMap";

// ===================== 타입 =====================
type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  readBy?: string[];
};

type Meeting = { lat: number; lng: number; name?: string };

// ===================== 페이지 컴포넌트 =====================
export default function ChatRoom() {
  const params = useParams() as { id: string | string[] };
  const router = useRouter();
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [usersMap, setUsersMap] = useState<Record<string, { name: string; profileColor: string }>>({});
  const [roomTitle, setRoomTitle] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [readLineIndex, setReadLineIndex] = useState<number | null>(null);

  // 🔧 위치공유용 상태 추가
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [currentUser, setCurrentUser] = useState<{ uid: string; displayName?: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const enterTimeRef = useRef<number>(Date.now()); // 입장 시간 기록

  // ===================== 공통: 사용자 로드 =====================
  useEffect(() => {
    const fetchUsers = async () => {
      const usersCol = collection(db, "users");
      const usersSnapshot = await getDocs(usersCol);
      const map: Record<string, { name: string; profileColor: string }> = {};
      usersSnapshot.docs.forEach((u) => {
        const data = u.data() as any;
        map[u.id] = {
          name: data?.name ?? "알 수 없음",
          profileColor: data?.profileColor ?? "#64748b",
        };
      });
      setUsersMap(map);
    };
    fetchUsers();
  }, []);

  // ===================== 채팅방 메타/가드 =====================
  useEffect(() => {
    const fetchRoomTitle = async () => {
      if (!chatId) return;
      const roomDocRef = doc(db, "chatRooms", chatId);
      const roomSnap = await getDoc(roomDocRef);
      if (roomSnap.exists()) {
        const data = roomSnap.data() as any;
        setRoomTitle(data.title || "채팅방");
        const ps = data.participants || [];
        setParticipants(ps);

        const uid = auth.currentUser?.uid;
        if (uid && !ps.includes(uid)) {
          alert("이 채팅방의 참가자가 아닙니다.");
          router.replace("/pages/chatlist");
        }
      } else {
        alert("존재하지 않는 채팅방입니다.");
        router.replace("/pages/chatlist");
      }
    };
    fetchRoomTitle();
  }, [chatId, router]);

  // ===================== 메시지 실시간 구독 =====================
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "chatRooms", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((doc) => {
        const data = doc.data() as ChatMessage;
        return { id: doc.id, ...data };
      });
      setMessages(msgs);

      // 입장 시 1회 읽음 경계선 계산 + 스크롤
      if (readLineIndex === null && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const firstUnreadIndex = msgs.findIndex((m) => {
          const t = m.timestamp?.toDate ? m.timestamp.toDate().getTime() : 0;
          return t < enterTimeRef.current && !(m.readBy || []).includes(uid);
        });
        setReadLineIndex(firstUnreadIndex === -1 ? null : firstUnreadIndex);

        setTimeout(() => {
          const scroller = scrollRef.current;
          if (!scroller) return;

          if (firstUnreadIndex !== -1) {
            const el = scroller.querySelectorAll(".chat-msg")[firstUnreadIndex] as HTMLElement | undefined;
            if (el) scroller.scrollTop = el.offsetTop - scroller.clientHeight / 3;
          } else {
            scroller.scrollTop = scroller.scrollHeight;
          }
        }, 50);
      }
    });
    return () => unsubscribe();
  }, [chatId, readLineIndex]);

  // ===================== 메시지 보내기 =====================
  const sendMessage = async () => {
    const user = auth.currentUser;
    if (!input.trim() || !user || !chatId) return;

    if (!participants.includes(user.uid)) {
      alert("채팅방 참가자가 아니라서 메시지를 보낼 수 없습니다.");
      return;
    }

    const messagesRef = collection(db, "chatRooms", chatId, "messages");
    const roomRef = doc(db, "chatRooms", chatId);

    await addDoc(messagesRef, {
      senderId: user.uid,
      text: input,
      timestamp: serverTimestamp(),
      readBy: [user.uid],
    });

    const unreadUpdates: Record<string, any> = {};
    participants.forEach((uid) => {
      if (uid !== user.uid) unreadUpdates[`unreadCount.${uid}`] = increment(1);
    });

    await updateDoc(roomRef, {
      lastMessage: input,
      lastSenderId: user.uid,
      lastUpdated: serverTimestamp(),
      ...unreadUpdates,
    });

    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 10);
  };

  // ===================== 읽음 처리 =====================
  const markMessagesAsRead = async () => {
    const user = auth.currentUser;
    if (!user || !chatId) return;

    const roomRef = doc(db, "chatRooms", chatId);
    await updateDoc(roomRef, { [`unreadCount.${user.uid}`]: 0 });

    const messagesRef = collection(db, "chatRooms", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
    const snapshot = await getDocs(q);
    await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const m = docSnap.data() as ChatMessage;
        if (!(m.readBy || []).includes(user.uid)) {
          await updateDoc(doc(db, "chatRooms", chatId, "messages", docSnap.id), {
            readBy: arrayUnion(user.uid),
          });
        }
      })
    );
  };

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setReadLineIndex(null);
        markMessagesAsRead();
      }
    };
    scroller.addEventListener("scroll", handleScroll);
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, [chatId]);

  useEffect(() => {
    if (chatId && auth.currentUser) markMessagesAsRead();
  }, [chatId]);

  // ===================== 위치공유: 현재 유저/약속 장소 로드 =====================
  useEffect(() => {
    // 로그인 사용자
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUser({ uid: u.uid, displayName: u.displayName ?? u.email ?? "유저" });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!chatId) return;
    (async () => {
      // 우선 rooms/{id}.meeting에서 가져오고, 없으면 chatRooms의 메타에서 대체하거나 하드코드
      const snap = await getDoc(doc(db, "rooms", chatId));
      const data = snap.data() as any;
      if (data?.meeting?.lat && data?.meeting?.lng) {
        setMeeting({
          lat: data.meeting.lat,
          lng: data.meeting.lng,
          name: data.meeting.name ?? "약속 장소",
        });
      } else {
        // 필요 시 chatRooms에서도 시도해보고, 그래도 없으면 임시값
        setMeeting({ lat: 37.5665, lng: 126.9780, name: "을지로" });
      }
    })();
  }, [chatId]);

  // ===================== 나만 나가기 =====================
  const leaveOnlyMe = async () => {
    const user = auth.currentUser;
    if (!user || !chatId) return;
    const roomRef = doc(db, "chatRooms", chatId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const before: string[] = data.participants || [];
      if (!before.includes(user.uid)) return;
      tx.update(roomRef, {
        participants: arrayRemove(user.uid),
        [`unreadCount.${user.uid}`]: deleteField(),
      });
    });

    const refreshed = await getDoc(roomRef);
    if (refreshed.exists()) {
      const data = refreshed.data() as any;
      const nowParticipants: string[] = data.participants || [];
      if (nowParticipants.length === 0) {
        const msgsCol = collection(db, "chatRooms", chatId, "messages");
        const msgsSnap = await getDocs(msgsCol);
        await Promise.all(msgsSnap.docs.map((d) => deleteDoc(d.ref)));
        await deleteDoc(roomRef);
      }
    }

    router.replace("/pages/chatlist");
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "";
    const date = ts.toDate();
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const me = auth.currentUser?.uid;

  return (
    <div className="chatWrap">
      {/* 헤더 */}
      <header className="header">
        <button className="iconBtn" onClick={() => router.back()} aria-label="뒤로가기">←</button>
        <div className="headMid">
          <div className="roomTitle" title={roomTitle}>{roomTitle}</div>
          <div className="roomMeta" title={participants.map((u) => usersMap[u]?.name || u).join(", ")}>
            {participants.map((u) => usersMap[u]?.name || u).join(", ")}
          </div>
        </div>
        <button className="leaveBtn" onClick={leaveOnlyMe}>나가기</button>
      </header>

      {/* 메시지 리스트 */}
      <div className="list" ref={scrollRef}>
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === me;
          const sender = usersMap[msg.senderId] || { name: "?", profileColor: "#94a3b8" };
          const showReadLine = idx === readLineIndex;
          const unreadCount = participants.filter((uid) => !(msg.readBy || []).includes(uid)).length;

          return (
            <div key={msg.id} className="row">
              {showReadLine && <div className="unreadSep">―― 아직 읽지 않은 메시지 ――</div>}

              <div className={`msg ${isMine ? "mine" : "other"} chat-msg`}>
                {!isMine && (
                  <div
                    className="avatar"
                    style={{ background: sender.profileColor, cursor: "pointer" }}
                    title={sender.name}
                    onClick={() => router.push(`/pages/userprofile/${msg.senderId}`)}
                  >
                    {sender.name.slice(0, 1)}
                  </div>
                )}

                <div className="bubbleWrap">
                  {!isMine && (
                    <div
                      className="senderName"
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/pages/userprofile/${msg.senderId}`)}
                    >
                      {sender.name}
                    </div>
                  )}
                  <div className={`bubble ${isMine ? "bubbleMine" : "bubbleOther"}`}>{msg.text}</div>

                  <div className={`meta ${isMine ? "metaMine" : "metaOther"}`}>
                    <span className="metaUnread">{unreadCount > 0 ? unreadCount : ""}</span>
                    <span className="metaTime">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요"
          className="input"
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
        />
        <button className="sendBtn" onClick={sendMessage}>보내기</button>
      </div>

      {/* 🔥 위치공유 섹션: 채팅 아래에 붙임 (원하면 상단/사이드로 이동 가능) */}
      <div className="p-4">
        <h2 className="text-lg font-semibold">약속 장소까지 위치 공유</h2>
        {currentUser && meeting ? (
          <LocationShareMap roomId={chatId!} currentUser={currentUser} meeting={meeting} />
        ) : (
          <div className="text-sm text-gray-500">위치 공유 로딩중…</div>
        )}
      </div>

      {/* 스타일 (기존 그대로) */}
      <style jsx>{`
        :global(html, body) { background: #f6f8fb; height: 100%; }
        .chatWrap { height: 100svh; max-width: 720px; margin: 0 auto;
          display: grid; grid-template-rows: auto 1fr auto auto; background: #fff;
          border: 1px solid #e6ebf2; border-radius: 16px; overflow: hidden;
          box-shadow: 0 10px 24px rgba(18, 31, 62, 0.06); }
        .header { position: sticky; top: 0; z-index: 5; display: grid;
          grid-template-columns: auto 1fr auto; align-items: center; gap: 8px;
          padding: 10px 12px; background: linear-gradient(180deg,#ffffff,#fbfdff);
          border-bottom: 1px solid #eef2f7; }
        .iconBtn { border: 1px solid #e2e8f0; background:#f8fafc; color:#0f172a;
          border-radius:10px; height:36px; width:36px; cursor:pointer; font-weight:800; }
        .headMid { min-width: 0; }
        .roomTitle { font-weight: 800; font-size: 16px; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .roomMeta { font-size:12px; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .leaveBtn { border:1px solid #e0e7ff; background:#eef2ff; color:#4f46e5; font-weight:800; border-radius:10px; padding:8px 10px; cursor:pointer; }
        .leaveBtn:hover { background:#e0e7ff; }

        .list { overflow-y:auto; padding:14px 12px;
          background: radial-gradient(200px 20px at 50% -10px, rgba(79,70,229,.06), transparent 60%) no-repeat,#f7f9fc; }
        .row + .row { margin-top: 8px; }
        .unreadSep { text-align:center; font-size:12px; color:#4f46e5; margin:8px 0 10px; }

        .msg { display:grid; grid-template-columns:auto 1fr; align-items:end; gap:8px; max-width:92%; }
        .msg.mine { margin-left:auto; grid-template-columns:1fr; justify-items:end; }
        .avatar { width:30px; height:30px; border-radius:50%; color:#fff; display:flex; align-items:center;
          justify-content:center; font-weight:900; font-size:14px; box-shadow:0 2px 6px rgba(0,0,0,.15); }
        .bubbleWrap { display:grid; gap:4px; min-width:0; }
        .senderName { font-size:11px; color:#64748b; padding:0 6px; }
        .bubble { display:inline-block; padding:10px 14px; border-radius:16px; max-width:min(560px,78vw);
          word-break:break-word; line-height:1.35; box-shadow:0 2px 10px rgba(18,31,62,.08); }
        .bubbleOther { background:#e5e7eb; color:#0f172a; border-top-left-radius:6px; }
        .bubbleMine { background: linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border-top-right-radius:6px; }
        .meta { display:inline-flex; gap:6px; align-items:center; font-size:11px; color:#64748b; padding:0 6px; }
        .metaMine { justify-content:flex-end; } .metaOther { justify-content:flex-start; }
        .metaUnread { color:#ef4444; min-width:10px; text-align:right; font-weight:800; }
        .metaTime { color:#64748b; }

        .composer { position:sticky; bottom:0; padding:8px; background:linear-gradient(180deg,#fbfdff,#ffffff);
          border-top:1px solid #eef2f7; display:grid; grid-template-columns:1fr auto; gap:8px;
          padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
        .input { width:100%; height:42px; border-radius:12px; border:1px solid #e2e8f0; padding:0 12px; outline:none; background:#ffffff; }
        .input:focus { border-color:#7aa2ff; box-shadow:0 0 0 4px rgba(122,162,255,.15); }
        .sendBtn { border:none; height:42px; min-width:86px; padding:0 14px; border-radius:12px;
          background:#4f46e5; color:#fff; font-weight:800; cursor:pointer; box-shadow:0 6px 16px rgba(79,70,229,.35); }
        .sendBtn:active { transform: translateY(1px); }
      `}</style>
    </div>
  );
}
