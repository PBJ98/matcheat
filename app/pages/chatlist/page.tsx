"use client";

import { useState, useEffect, useMemo } from "react";
import { db, auth } from "../../../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayRemove,     // ✅ 추가: 참가자 배열에서 내 uid 제거
  deleteField,     // ✅ 추가: unreadCount 내 키 삭제
} from "firebase/firestore";
import Link from "next/link";

interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage: string;
  lastUpdated?: any; // Timestamp | number | undefined
  title?: string;
  unreadCount?: Record<string, number>;
}

export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [hideOld, setHideOld] = useState<boolean>(true);
  const [hideDays, setHideDays] = useState<number>(30);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [leavingRoomId, setLeavingRoomId] = useState<string | null>(null); // ✅ 추가
  const [qtext, setQtext] = useState<string>("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setCurrentUserId(user.uid);
    });
    return () => unsub();
  }, []);

  const toMs = (v: any) =>
    v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0;

  // 상대시간 표시
  const timeAgo = (ms: number) => {
    if (!ms) return "";
    const diff = Date.now() - ms;
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}초 전`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}일 전`;
    const w = Math.floor(d / 7);
    if (w < 5) return `${w}주 전`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}개월 전`;
    const y = Math.floor(d / 365);
    return `${y}년 전`;
  };

  // 실시간 구독
  useEffect(() => {
    if (!currentUserId) return;

    const qRooms = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", currentUserId)
    );

    const unsubscribe = onSnapshot(
      qRooms,
      async (snapshot) => {
        const chatData: ChatRoom[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            participants: data.participants || [],
            lastMessage: data.lastMessage || "",
            lastUpdated: data.lastUpdated ?? 0,
            title: data.title || "",
            unreadCount: data.unreadCount || {},
          };
        });

        chatData.sort((a, b) => toMs(b.lastUpdated) - toMs(a.lastUpdated));

        const allUids = Array.from(new Set(chatData.flatMap((r) => r.participants)));
        const map: Record<string, string> = { ...usersMap };

        await Promise.all(
          allUids.map(async (uid) => {
            if (!map[uid]) {
              const userDoc = await getDoc(doc(db, "users", uid));
              map[uid] = userDoc.exists()
                ? (userDoc.data() as any)?.name ?? "알 수 없음"
                : "알 수 없음";
            }
          })
        );

        setUsersMap(map);
        setRooms(chatData);
      },
      (error) => {
        console.error("❌ 채팅방 구독 오류:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  // 클릭 시 안읽음 0
  const handleChatClick = async (roomId: string) => {
    if (!currentUserId) return;
    const chatRef = doc(db, "chatRooms", roomId);
    await updateDoc(chatRef, {
      [`unreadCount.${currentUserId}`]: 0,
    });
  };

  // ✅ 나만 나가기(내 리스트에서만 사라짐) + 참가자 0명이면 방/메시지 정리
  const handleLeaveRoom = async (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 채팅방을 나가시겠습니까?")) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setLeavingRoomId(roomId);
      const roomRef = doc(db, "chatRooms", roomId);

      // 내 unreadCount 제거 + participants에서 내 uid 제거
      await updateDoc(roomRef, {
        [`unreadCount.${uid}`]: deleteField(),
        participants: arrayRemove(uid),
      });

      // 참가자 확인 후 0명이면 방 청소
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        const nowParticipants: string[] = data.participants || [];
        if (nowParticipants.length === 0) {
          const msgsCol = collection(db, "chatRooms", roomId, "messages");
          const msgsSnap = await getDocs(msgsCol);
          await Promise.all(msgsSnap.docs.map((d) => deleteDoc(d.ref)));
          await deleteDoc(roomRef);
        }
      }
    } catch (err) {
      console.error("나가기 실패:", err);
      alert("나가기 중 오류가 발생했습니다.");
    } finally {
      setLeavingRoomId(null);
    }
  };

  // 삭제(메시지 포함) — 참가자 1명일 때만 노출
  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 채팅방을 삭제할까요? (모든 메시지도 삭제됩니다)")) return;
    try {
      setDeletingRoomId(roomId);
      const msgsCol = collection(db, "chatRooms", roomId, "messages");
      const msgsSnap = await getDocs(msgsCol);
      await Promise.all(msgsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "chatRooms", roomId));
    } catch (err) {
      console.error("채팅방 삭제 실패:", err);
      alert("채팅방 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingRoomId(null);
    }
  };

  // 필터링(오래된 채팅 숨김 + 검색)
  const thresholdMs = hideDays * 24 * 60 * 60 * 1000;
  const filtered = useMemo(() => {
    const now = Date.now();
    return rooms.filter((r) => {
      if (hideOld) {
        const updated = toMs(r.lastUpdated);
        if (!updated || now - updated > thresholdMs) return false;
      }
      if (!qtext.trim()) return true;
      const others = r.participants
        .filter((uid) => uid !== currentUserId)
        .map((uid) => usersMap[uid] || uid)
        .join(", ");
      const hay = `${r.title ?? ""} ${others} ${r.lastMessage ?? ""}`.toLowerCase();
      return hay.includes(qtext.toLowerCase());
    });
  }, [rooms, hideOld, hideDays, qtext, currentUserId, usersMap]);

  // 아바타(이니셜)
  const getInitials = (name: string) => {
    const clean = (name || "").trim();
    if (!clean) return "👤";
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return clean.slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="wrap">
      {/* 상단 헤더/툴바 */}
      <header className="toolbar">
        <h1 className="title">내 채팅</h1>

        <div className="controls">
          <div className="searchBox">
            <input
              value={qtext}
              onChange={(e) => setQtext(e.target.value)}
              placeholder="채팅방, 참가자, 메시지 검색"
              className="searchInput"
            />
            {qtext && (
              <button className="clearBtn" onClick={() => setQtext("")} aria-label="검색 지우기">
                ✕
              </button>
            )}
          </div>

          <div className="hideGroup">
            <label className="hideToggle">
              <input
                type="checkbox"
                checked={hideOld}
                onChange={(e) => setHideOld(e.target.checked)}
              />
              <span>오래된 채팅 숨김</span>
            </label>
            <input
              type="number"
              min={1}
              value={hideDays}
              onChange={(e) => setHideDays(Math.max(1, Number(e.target.value || 1)))}
              className="daysInput"
              title="숨김 기준 일수"
            />
            <span className="daysLabel">일</span>
          </div>
        </div>
      </header>

      {/* 리스트 */}
      {filtered.length === 0 ? (
        <div className="empty">
          {hideOld ? "조건에 해당하는 채팅방이 없습니다." : "참여 중인 채팅방이 없습니다."}
        </div>
      ) : (
        <ul className="grid">
          {filtered.map((room) => {
            const unread = room.unreadCount?.[currentUserId ?? ""] || 0;
            const otherNames = room.participants
              .filter((uid) => uid !== currentUserId)
              .map((uid) => usersMap[uid] || uid)
              .join(", ");
            const lastTs = toMs(room.lastUpdated);
            const multi = room.participants.length > 1; // ✅ 2명 이상이면 단톡/1:1, 혼자면 true 아님

            return (
              <li key={room.id} className="card" onClick={() => handleChatClick(room.id)}>
                <Link href={`/pages/chat/${room.id}`} className="cardLink">
                  <div className="left">
                    <div className={`avatar ${unread > 0 ? "avatarUnread" : ""}`}>
                      {getInitials(otherNames || room.title || "채팅")}
                    </div>
                  </div>

                  <div className="mid">
                    <div className="row1">
                      <div className="roomTitle">{room.title || "제목 없음"}</div>
                      <div className="time">{lastTs ? timeAgo(lastTs) : ""}</div>
                    </div>
                    <div className="row2">
                      <div className="participants">{otherNames || "알 수 없음"}</div>
                    </div>
                    <div className="row3">
                      <div className="lastMsg">{room.lastMessage || "새 채팅"}</div>
                    </div>
                  </div>

                  <div className="right">
                    {unread > 0 && <div className="badge">{unread}</div>}

                    {/* ✅ 참가자 2명 이상: '나가기' 버튼 / 참가자 1명: '삭제' 버튼 */}
                    {multi ? (
                      <button
                        className="leaveBtn"
                        onClick={(e) => handleLeaveRoom(e, room.id)}
                        disabled={leavingRoomId === room.id}
                        title="나만 채팅방 나가기"
                      >
                        {leavingRoomId === room.id ? "나가는 중…" : "나가기"}
                      </button>
                    ) : (
                      <button
                        className="delBtn"
                        onClick={(e) => handleDeleteRoom(e, room.id)}
                        disabled={deletingRoomId === room.id}
                        title="채팅방 삭제"
                      >
                        {deletingRoomId === room.id ? "삭제중…" : "삭제"}
                      </button>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        :global(html, body) { background: #f6f8fb; }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 16px; }

        .toolbar {
          position: sticky; top: 0; z-index: 10;
          background: linear-gradient(180deg, #ffffff, #fbfdff);
          border: 1px solid #e6ebf2; border-radius: 16px;
          padding: 14px 16px; box-shadow: 0 6px 20px rgba(27, 51, 89, 0.06);
          display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px;
        }
        .title { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
        .controls { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .searchBox { position: relative; }
        .searchInput {
          width: 100%; height: 42px; border-radius: 10px;
          border: 1px solid #d9e1ee; padding: 0 40px 0 12px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; background: #ffffff;
        }
        .searchInput:focus { border-color: #7aa2ff; box-shadow: 0 0 0 4px rgba(122, 162, 255, 0.15); }
        .clearBtn {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: #eef2ff; color: #4f46e5; border: none;
          height: 28px; min-width: 28px; border-radius: 14px; cursor: pointer; font-weight: 700;
        }
        .hideGroup { display: inline-flex; align-items: center; gap: 8px; }
        .hideToggle { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #334155; }
        .daysInput {
          width: 70px; height: 36px; border-radius: 8px; border: 1px solid #d9e1ee;
          outline: none; padding: 0 10px; background: #fff;
        }
        .daysLabel { font-size: 14px; color: #475569; }

        @media (min-width: 720px) {
          .toolbar { grid-template-columns: auto 1fr; align-items: center; }
          .controls { grid-template-columns: 1fr auto; align-items: center; }
        }

        .empty {
          text-align: center; color: #64748b; background: #fff;
          border: 1px solid #e6ebf2; border-radius: 16px; padding: 40px 12px;
        }

        .grid {
          display: grid; grid-template-columns: 1fr; gap: 12px;
          padding: 0; margin: 0; list-style: none;
        }
        @media (min-width: 720px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 1040px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

        .card {
          border: 1px solid #e6ebf2; border-radius: 18px; background: #ffffff;
          box-shadow: 0 10px 22px rgba(18, 31, 62, 0.06);
          transition: transform 0.06s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .card:active { transform: translateY(1px); }
        .card:hover { border-color: #d4dcf0; box-shadow: 0 12px 26px rgba(18, 31, 62, 0.09); }

        .cardLink {
          display: grid; grid-template-columns: auto 1fr auto;
          gap: 12px; padding: 14px; text-decoration: none; color: inherit;
        }

        .left { display: flex; align-items: center; }
        .avatar {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
          color: #1e293b; font-weight: 800; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        .avatarUnread { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }

        .mid { min-width: 0; display: grid; gap: 4px; }
        .row1 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
        .roomTitle {
          font-weight: 800; font-size: 15px; color: #0f172a;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .time { font-size: 12px; color: #64748b; white-space: nowrap; }
        .row2 .participants {
          font-size: 13px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .row3 .lastMsg {
          font-size: 13px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .right { display: grid; align-content: center; gap: 8px; }
        .badge {
          background-color: #ef4444; color: white; border-radius: 9999px;
          min-width: 26px; height: 22px; padding: 0 8px; display: flex; justify-content: center; align-items: center;
          font-size: 12px; font-weight: 800; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3); justify-self: end;
        }
        .delBtn, .leaveBtn {
          border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; font-weight: 700;
          cursor: pointer; transition: background 0.15s, transform 0.06s, box-shadow 0.2s;
        }
        .delBtn {
          background: #f1f5f9; color: #0f172a;
        }
        .delBtn:hover { background: #e2e8f0; }
        .leaveBtn {
          background: #eef2ff; color: #4f46e5; border-color: #e0e7ff;
        }
        .leaveBtn:hover { background: #e0e7ff; }
        .delBtn:active, .leaveBtn:active { transform: translateY(1px); }
        .delBtn:disabled, .leaveBtn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
