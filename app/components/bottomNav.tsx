/*"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const menus = [
    { name: "지도", path: "/map" },
    { name: "요청란", path: "/requests" },
    { name: "홈", path: "/matches" },
    { name: "채팅", path: "/chat" },
    { name: "마이페이지", path: "/mypage" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60px",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "#003366", // 진한 파랑
        color: "white",
        boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
      }}
    >
      {menus.map((menu) => (
        <Link
          key={menu.path}
          href={menu.path}
          style={{
            flex: 1,
            textAlign: "center",
            color: pathname === menu.path ? "#FFD700" : "white", // 현재 선택 메뉴 강조
            textDecoration: "none",
            fontWeight: pathname === menu.path ? "bold" : "normal",
          }}
        >
          {menu.name}
        </Link>
      ))}
    </nav>
  );
}
*/

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaMapMarkedAlt, FaClipboardList, FaHome, FaComments, FaUser } from "react-icons/fa";

export default function BottomNav() {
  const pathname = usePathname();

  const menus = [
    { name: "지도", path: "/pages/map", icon: <FaMapMarkedAlt /> },
    { name: "요청란", path: "/pages/requests", icon: <FaClipboardList /> },
    { name: "홈", path: "/pages/matches", icon: <FaHome /> },
    { name: "채팅", path: "/pages/chat", icon: <FaComments /> },
    { name: "마이페이지", path: "/pages/mypage", icon: <FaUser /> },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 10, // 화면 끝에서 살짝 띄우기
        left: 10,
        right: 10,
        height: "70px",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        padding: "0 10px",
        zIndex: 100,
      }}
    >
      {menus.map((menu) => {
        const isActive = pathname === menu.path;
        return (
          <Link
            key={menu.path}
            href={menu.path}
            style={{
              flex: 1,
              textAlign: "center",
              color: isActive ? "#4da6ff" : "#888888",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: isActive ? "bold" : "500",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "2px" }}>
              {menu.icon}
            </div>
            <span style={{ fontSize: "0.85rem" }}>{menu.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
