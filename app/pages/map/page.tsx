"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

type PlaceItem = {
  id: string;
  place_name: string;
  road_address_name?: string;
  address_name?: string;
  phone?: string;
  place_url?: string;
  x: string;
  y: string;
  category_name?: string;
};

type RecruitPost = {
  id: string;
  title?: string;
  restaurant?: string;
  authorId?: string;
  authorName?: string;
  lat?: number;
  lng?: number;
  place?: { lat?: number; lng?: number };
};

type Category = "all" | "korean" | "chinese" | "western" | "japanese" | "cafe";

function getPosition(opts: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

export default function MapPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const recruitMarkersRef = useRef<any[]>([]);
  const infoRef = useRef<any | null>(null);
  const myMarkerRef = useRef<any | null>(null);
  const myCircleRef = useRef<any | null>(null);

  const [q, setQ] = useState("");
  const [radius, setRadius] = useState(2000);
  const [activeCat, setActiveCat] = useState<Category>("all");
  const [results, setResults] = useState<PlaceItem[]>([]);
  const [recruitVisible, setRecruitVisible] = useState(false);

  const KAKAO_APPKEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!KAKAO_APPKEY) console.error("KAKAO JS KEY 누락");

  const loadRecruitPosts = async () => {
    try {
      const kakao = (window as any).kakao;
      const snapshot = await getDocs(collection(db, "posts"));
      const posts: RecruitPost[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<RecruitPost, "id">),
      }));

      recruitMarkersRef.current.forEach((m) => m.setMap(null));
      recruitMarkersRef.current = [];

      for (const post of posts) {
        const lat = post.lat ?? post.place?.lat;
        const lng = post.lng ?? post.place?.lng;
        if (!lat || !lng) continue;

        if (!post.authorName && post.authorId) {
          try {
            const userRef = doc(db, "users", post.authorId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data() as { name?: string };
              post.authorName = userData.name || "익명";
            }
          } catch (err) {
            console.warn("작성자 불러오기 실패:", err);
          }
        }

        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
          map: mapRef.current,
          title: post.title,
          image: new kakao.maps.MarkerImage(
            "https://cdn-icons-png.flaticon.com/512/3177/3177361.png",
            new kakao.maps.Size(30, 30)
          ),
        });
        recruitMarkersRef.current.push(marker);

        const infoHtml = `
          <div style="padding:10px;min-width:260px;max-width:300px;box-sizing:border-box;">
            <strong style="display:block;margin-bottom:4px;">${post.title || "제목 없음"}</strong>
            🍽 ${post.restaurant || "미정"}<br/>
            👤 ${post.authorName || "작성자 미상"}<br/>
            <button id="post-${post.id}"
              style="margin-top:8px;padding:6px 10px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;white-space:nowrap;">
              모집글 보러가기
            </button>
          </div>
        `;
        const infoWindow = new kakao.maps.InfoWindow({
          content: infoHtml,
          zIndex: 5,
          removable: false,
          disableAutoPan: false,
          pixelOffset: new kakao.maps.Point(0, -20),
        });

        kakao.maps.event.addListener(marker, "click", () => {
          if (infoRef.current && infoRef.current.marker === marker) {
            infoRef.current.close();
            infoRef.current = null;
            return;
          }

          if (infoRef.current) infoRef.current.close();

          infoWindow.open(mapRef.current, marker);
          infoRef.current = infoWindow;
          infoRef.current.marker = marker;

          setTimeout(() => {
            const btn = document.getElementById(`post-${post.id}`);
            if (btn) btn.onclick = () => router.push(`/pages/matches/${post.id}`);
          }, 100);
        });
      }
    } catch (err) {
      console.error("❌ Firestore 로드 실패:", err);
    }
  };

  const toggleRecruitPosts = async () => {
    if (recruitVisible) {
      recruitMarkersRef.current.forEach((m) => m.setMap(null));
      recruitMarkersRef.current = [];
      setRecruitVisible(false);
    } else {
      await loadRecruitPosts();
      setRecruitVisible(true);
    }
  };

  const init = () => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps || !containerRef.current) return;

    const map = new kakao.maps.Map(containerRef.current, {
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 5,
    });
    mapRef.current = map;
    setTimeout(() => mapRef.current?.relayout(), 0);
  };

  useEffect(() => {
    const w = window as any;
    if (w.kakao?.maps && w.kakao.maps.services) {
      w.kakao.maps.load(init);
      return;
    }

    const src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APPKEY}&autoload=false&libraries=services`;
    if (!document.querySelector(`script[src*="dapi.kakao.com"]`)) {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => (window as any).kakao.maps.load(init);
      document.head.appendChild(s);
    }
  }, [KAKAO_APPKEY]);

  // 🔹 수정: center 매개변수 추가
  const runSearch = ({
    keyword,
    categoryCode,
    center,
  }: {
    keyword?: string;
    categoryCode?: string;
    center?: any;
  }) => {
    if (!mapRef.current) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) {
      setTimeout(() => runSearch({ keyword, categoryCode, center }), 500);
      return;
    }

    const ps = new kakao.maps.services.Places();
    const opts: any = {
      location: center || (myMarkerRef.current ? myMarkerRef.current.getPosition() : mapRef.current.getCenter()),
      radius,
    };

    const showPlaces = (data: any[]) => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      const positions: any[] = [];

      data.forEach((place) => {
        const pos = new kakao.maps.LatLng(Number(place.y), Number(place.x));
        const marker = new kakao.maps.Marker({ position: pos, map: mapRef.current });
        markersRef.current.push(marker);
        positions.push(pos);

        const addr = place.road_address_name || place.address_name || "";
        const infoHtml = `
          <div style="padding:10px;min-width:260px;max-width:300px;box-sizing:border-box;">
            <strong style="display:block;margin-bottom:4px;">${place.place_name}</strong>
            <span style="color:#555;display:block;word-break:keep-all;">${addr}</span><br/>
            <button id="write-${place.id}"
              style="margin-top:8px;padding:6px 10px;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;white-space:nowrap;">
              🍴 이 장소로 모집글 작성
            </button>
          </div>
        `;
        const info = new kakao.maps.InfoWindow({
          content: infoHtml,
          zIndex: 5,
          removable: false,
          disableAutoPan: false,
          pixelOffset: new kakao.maps.Point(0, -20),
        });

        kakao.maps.event.addListener(marker, "click", () => {
          if (infoRef.current && infoRef.current.marker === marker) {
            infoRef.current.close();
            infoRef.current = null;
            return;
          }

          if (infoRef.current) infoRef.current.close();
          info.open(mapRef.current, marker);
          infoRef.current = info;
          infoRef.current.marker = marker;

          setTimeout(() => {
            const btn = document.getElementById(`write-${place.id}`);
            if (btn) {
              btn.onclick = () => {
                const url = `/pages/matches/uplist?source=map&placeId=${encodeURIComponent(
                  place.id
                )}&placeName=${encodeURIComponent(place.place_name)}&lat=${encodeURIComponent(
                  place.y
                )}&lng=${encodeURIComponent(place.x)}&category=${encodeURIComponent(activeCat)}`;
                router.push(url);
              };
            }
          }, 100);
        });
      });

      if (positions.length) {
        const bounds = new kakao.maps.LatLngBounds();
        positions.forEach((p) => bounds.extend(p));
        mapRef.current.setBounds(bounds);
      }

      setResults(data as PlaceItem[]);
    };

    const cb = (data: any[], status: string) => {
      if (status === kakao.maps.services.Status.OK) {
        showPlaces(data);
      } else {
        console.warn("검색 실패 또는 결과 없음");
      }
    };

    if (categoryCode) ps.categorySearch(categoryCode, cb, opts);
    else ps.keywordSearch(keyword || "맛집", cb, opts);
  };

  const handleCategory = (cat: Category) => {
    setActiveCat(cat);
    if (cat === "cafe") return runSearch({ categoryCode: "CE7" });
    if (cat === "korean") return runSearch({ keyword: "한식" });
    if (cat === "chinese") return runSearch({ keyword: "중식" });
    if (cat === "western") return runSearch({ keyword: "양식" });
    if (cat === "japanese") return runSearch({ keyword: "일식" });
    return runSearch({ keyword: q || "맛집" });
  };

  const searchMyLocation = async () => {
    try {
      const pos = await getPosition({ enableHighAccuracy: true });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const kakao = (window as any).kakao;

      if (myMarkerRef.current) myMarkerRef.current.setMap(null);
      if (myCircleRef.current) myCircleRef.current.setMap(null);

      const marker = new kakao.maps.Marker({
        map: mapRef.current,
        position: new kakao.maps.LatLng(lat, lng),
        title: "내 위치",
      });
      myMarkerRef.current = marker;

      const circle = new kakao.maps.Circle({
        map: mapRef.current,
        center: marker.getPosition(),
        radius,
        strokeWeight: 2,
        strokeColor: "#FF7F50",
        strokeOpacity: 0.5,
        strokeStyle: "dashed",
        fillColor: "#FF7F50",
        fillOpacity: 0.1,
      });
      myCircleRef.current = circle;

      mapRef.current.setCenter(marker.getPosition());
      runSearch({ keyword: q || "맛집", center: marker.getPosition() });
    } catch (err) {
      console.error("내 위치 검색 실패:", err);
      alert("내 위치를 가져올 수 없습니다.");
    }
  };

  const goRecruitFromSelected = (p?: PlaceItem) => {
    const target = p ?? results[0];
    if (!target) return;
    const url = `/pages/matches/uplist?source=map&placeId=${encodeURIComponent(
      target.id
    )}&placeName=${encodeURIComponent(target.place_name)}&lat=${encodeURIComponent(
      target.y
    )}&lng=${encodeURIComponent(target.x)}&category=${encodeURIComponent(activeCat)}`;
    router.push(url);
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">카카오 지도</h1>

      {/* 🔎 검색바 */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCategory("all")}
          placeholder="검색어 (예: 파스타, 카페, 삼겹살)"
          className="px-4 py-2.5 border rounded-lg w-64 text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button
          onClick={() => handleCategory("all")}
          className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50"
        >
          🔎 검색
        </button>

        {/* 내 위치 기준 검색 버튼 */}
        <button
          onClick={searchMyLocation}
          className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50"
        >
          📍 내 위치 기준 검색
        </button>

        <button
          onClick={toggleRecruitPosts}
          className={`px-4 py-2.5 border rounded-lg text-sm transition-colors ${
            recruitVisible
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-blue-600 hover:bg-blue-100"
          }`}
        >
          📢 모집글 {recruitVisible ? "끄기" : "보기"}
        </button>
      </div>

      {/* 🍱 카테고리 버튼 바 */}
      <div className="flex flex-wrap gap-2 mt-2">
        {[{ key: "all", label: "전체" },
          { key: "korean", label: "한식" },
          { key: "chinese", label: "중식" },
          { key: "western", label: "양식" },
          { key: "japanese", label: "일식" },
          { key: "cafe", label: "카페" }].map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategory(cat.key as Category)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              activeCat === cat.key ? "bg-rose-500 text-white" : "hover:bg-gray-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 🗺 지도 */}
      <div ref={containerRef} style={{ height: 600 }} className="w-full rounded-xl border" />

      {/* 📋 검색 결과 목록 */}
      <div className="max-h-[400px] overflow-auto mt-4 border p-3 rounded-lg bg-white shadow-sm">
        <div className="text-sm font-semibold mb-3 text-gray-700">
          🔍 검색 결과 ({results.length}건)
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
        ) : (
          results.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center p-3 mb-3 border border-gray-200 rounded-xl hover:shadow-md hover:bg-gray-50 transition-all"
            >
              <div className="flex flex-col w-[80%] pr-4">
                <div className="flex items-center gap-1 text-[15px] font-semibold text-gray-800">
                  <span>🍽</span>
                  <span className="truncate">{p.place_name}</span>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1 leading-snug">
                  <span>📍</span>
                  <span className="truncate">
                    {p.road_address_name || p.address_name || "주소 정보 없음"}
                  </span>
                </div>
              </div>

              <button
                className="ml-auto px-4 py-2 bg-rose-500 text-white text-xs rounded-lg hover:bg-rose-600 transition-all shadow-sm whitespace-nowrap"
                onClick={() => goRecruitFromSelected(p)}
              >
                🍴 모집하기
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
