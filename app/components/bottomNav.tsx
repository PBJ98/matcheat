"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaMapMarkedAlt, FaClipboardList, FaHome, FaComments, FaUser } from "react-icons/fa";
import { auth, db } from "@/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

type MenuItem = {
  name: string;
  path: string;
  icon: JSX.Element;
  badge?: number;
};

const COLOR_PRIMARY = "#ff7f50";       // 메인
const COLOR_PRIMARY_HOVER = "#ff9f1c"; // hover
const COLOR_TEXT = "#8E735B";          // 브라운 텍스트

export default function BottomNav() {
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  // 로그인 감시
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUserId(u?.uid ?? null));
    return () => unsub();
  }, []);

  // 채팅 미읽음 합계
  useEffect(() => {
    if (!currentUserId) { setUnreadTotal(0); return; }
    const qRooms = query(collection(db, "chatRooms"), where("participants", "array-contains", currentUserId));
    const unsub = onSnapshot(qRooms, (snap) => {
      let total = 0;
      snap.forEach((d) => {
        const data = d.data() as any;
        const v = Number(data?.unreadCount?.[currentUserId] ?? 0);
        total += Number.isFinite(v) && v > 0 ? v : 0;
      });
      setUnreadTotal(total);
    });
    return () => unsub();
  }, [currentUserId]);

  // 받은 요청 대기건
  useEffect(() => {
    if (!currentUserId) { setPendingCount(0); return; }
    const qReq = query(
      collection(db, "requests"),
      where("toUserId", "==", currentUserId),
      where("status", "==", "pending"),
    );
    const unsub = onSnapshot(qReq, (snap) => setPendingCount(snap.size));
    return () => unsub();
  }, [currentUserId]);

  const menus: MenuItem[] = [
    { name: "지도", path: "/pages/map", icon: <FaMapMarkedAlt /> },
    { name: "요청", path: "/pages/requests", icon: <FaClipboardList />, badge: pendingCount },
    { name: "홈", path: "/pages/matches", icon: <FaHome /> },
    { name: "채팅", path: "/pages/chatlist", icon: <FaComments />, badge: unreadTotal },
    { name: "마이", path: "/pages/mypage", icon: <FaUser /> },
  ];

  return (
    <nav
      aria-label="하단 내비게이션"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "max(12px, env(safe-area-inset-bottom))",
        zIndex: 100,
        height: 70,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: 8,
        borderRadius: 999,
        background: "rgba(255,255,255,0.7)",       // 글래스 느낌
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
        border: "1px solid rgba(234,223,218,0.9)",
      }}
    >
      {menus.map((m) => {
        const active = pathname?.startsWith(m.path) ?? false;
        const hovered = hoverKey === m.path;
        const bg = active
          ? (hovered ? COLOR_PRIMARY_HOVER : COLOR_PRIMARY)
          : (hovered ? "rgba(255,127,80,0.12)" : "transparent");
        const color = active ? "#fff" : COLOR_TEXT;

        return (
          <Link
            key={m.path}
            href={m.path}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => setHoverKey(m.path)}
            onMouseLeave={() => setHoverKey((prev) => (prev === m.path ? null : prev))}
            style={{
              flex: 1,
              height: 54,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              borderRadius: 999,
              fontWeight: 700,
              background: bg,
              color,
              transform: hovered ? "translateY(-1px)" : "translateY(0)",
              transition: "transform .15s ease, background .2s ease, color .2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22, lineHeight: 0 }}>{m.icon}</span>
              <span style={{ fontSize: 13 }}>{m.name}</span>
            </div>

            {(m.badge ?? 0) > 0 && (
              <span
                aria-label={`${m.name} 알림 ${m.badge}개`}
                style={{
                  position: "absolute",
                  top: -2,
                  right: 6,
                  minWidth: 20,
                  height: 20,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: active ? "#fff" : "#ff3b30",
                  color: active ? COLOR_PRIMARY : "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                {m.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
