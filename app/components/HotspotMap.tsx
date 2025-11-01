// components/HotspotsMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
// ⬇️ alias가 안 먹으면 '../../../firebase' 같은 상대경로로 바꿔줘
import { db } from '@/firebase';
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { loadKakao } from '@/lib/kakao';

type Props = {
  days?: number;  // 최근 N일 (기본 30)
  topN?: number;  // 상위 지역 수 (기본 8)
};

type HotItem = {
  key: string;
  count: number;
  lat?: number;
  lng?: number;
};

export default function HotspotsMap({ days = 30, topN = 8 }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [kakao, setKakao] = useState<any>(null);
  const [hots, setHots] = useState<HotItem[]>([]);
  const circlesRef = useRef<any[]>([]);
  const infosRef = useRef<any[]>([]);

  // ---- 스키마 차이를 흡수하는 매핑 헬퍼 ----
  const toRegion = (p: any) =>
    (p.region ?? p.gu ?? p.dong ?? p.area ?? '기타').toString().trim() || '기타';

  const toLat = (p: any) =>
    p.lat ?? p.latitude ?? p.location?.lat ?? p.coords?.lat ?? null;

  const toLng = (p: any) =>
    p.lng ?? p.longitude ?? p.location?.lng ?? p.coords?.lng ?? null;

  const toDate = (p: any) => {
    if (p?.createdAt?.toDate) return p.createdAt.toDate(); // Firestore Timestamp
    if (typeof p?.createdAt === 'number') return new Date(p.createdAt);
    if (typeof p?.createdAt === 'string') return new Date(p.createdAt);
    return null; // 없으면 필터에서 유연 처리
  };

  // 데이터 로드 (Kakao SDK + Firestore)
  useEffect(() => {
    (async () => {
      // 1) Kakao SDK
      const w = await loadKakao();
      setKakao((w as any).kakao);

      // 2) Firestore: 최근 N일
      const since = new Date();
      since.setDate(since.getDate() - days);

      // 우선 createdAt이 Timestamp인 경우의 정석 쿼리
      let rows: any[] = [];
      try {
        const q1 = query(
          collection(db, 'posts'),
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q1);
        rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        // createdAt 타입이 제각각이면 where가 실패할 수 있음 → 전체 읽고 JS에서 필터
        const snap = await getDocs(collection(db, 'posts'));
        rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      // 날짜 필터(문자열/숫자도 허용, createdAt 없으면 일단 포함해 원 보이게)
      const filtered = rows.filter((p) => {
        const dt = toDate(p);
        return !dt || dt >= since;
      });

      // 3) 지역별 집계 + 좌표 평균(centroid)
      const acc = new Map<
        string,
        { count: number; sumLat: number; sumLng: number; n: number }
      >();

      for (const p of filtered) {
        const key = toRegion(p);
        const lat = toLat(p);
        const lng = toLng(p);

        const g = acc.get(key) ?? { count: 0, sumLat: 0, sumLng: 0, n: 0 };
        g.count += 1;
        if (typeof lat === 'number' && typeof lng === 'number') {
          g.sumLat += lat;
          g.sumLng += lng;
          g.n += 1;
        }
        acc.set(key, g);
      }

      const top: HotItem[] = Array.from(acc.entries())
        .map(([key, g]) => ({
          key,
          count: g.count,
          lat: g.n ? g.sumLat / g.n : undefined,
          lng: g.n ? g.sumLng / g.n : undefined,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);

      setHots(top);
    })().catch(console.error);
  }, [days, topN]);

  // 지도 그리기
  useEffect(() => {
    if (!kakao || !mapRef.current) return;

    // 기존 오버레이 정리
    circlesRef.current.forEach((c) => c.setMap(null));
    infosRef.current.forEach((i) => i.close && i.close());
    circlesRef.current = [];
    infosRef.current = [];

    const center = new kakao.maps.LatLng(37.5665, 126.9780);
    const map = new kakao.maps.Map(mapRef.current, { center, level: 8 });

    hots.forEach((h, idx) => {
      if (typeof h.lat !== 'number' || typeof h.lng !== 'number') return; // 좌표 없으면 스킵

      const pos = new kakao.maps.LatLng(h.lat, h.lng);
      const circle = new kakao.maps.Circle({
        center: pos,
        radius: 300 + Math.min(1200, h.count * 40), // 글 수에 비례
        strokeWeight: 3,
        strokeOpacity: 0.8,
        fillOpacity: 0.2,
        zIndex: 2,
      });
      circle.setMap(map);
      circlesRef.current.push(circle);

      const iw = new kakao.maps.InfoWindow({
        position: pos,
        content: `<div style="padding:6px 10px;border-radius:8px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.15);">
          ${idx + 1}. ${h.key} · ${h.count}건
        </div>`,
      });
      iw.open(map, undefined);
      infosRef.current.push(iw);
    });

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      infosRef.current.forEach((i) => i.close && i.close());
      circlesRef.current = [];
      infosRef.current = [];
    };
  }, [kakao, hots]);

  return (
    <div className="w-full space-y-3">
      <div className="text-sm text-gray-600">
        최근 {days}일 기준 · 상위 {hots.length}개 지역
      </div>
      <div
        ref={mapRef}
        style={{ width: '100%', height: 360, borderRadius: 16, overflow: 'hidden' }}
      />
      <ul className="text-sm grid grid-cols-2 gap-2">
        {hots.map((h, i) => (
          <li key={h.key} className="p-2 rounded-lg bg-gray-50 flex items-center justify-between">
            <span>{i + 1}. {h.key}</span>
            <strong>{h.count}건</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
