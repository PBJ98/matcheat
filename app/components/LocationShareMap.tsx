// components/LocationShareMap.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/firebase';
import { collection, doc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';
import { loadKakao } from '@/lib/kakao';
import { haversineMeters } from '@/utils/geo';

type Meeting = { lat: number; lng: number; name?: string };
type Member = {
  uid: string;
  displayName?: string;
  isSharing?: boolean;
  lat?: number;
  lng?: number;
  updatedAt?: number;
};

type Props = {
  roomId: string;
  currentUser: { uid: string; displayName?: string };
  meeting: Meeting;
};

export default function LocationShareMap({ roomId, currentUser, meeting }: Props) {
  // ▶️ 접힘/펼침 상태: 기본은 접힘(버튼만 보임)
  const [opened, setOpened] = useState(false);

  const mapWrapRef = useRef<HTMLDivElement | null>(null); // 전체 래퍼(접기/펼치기용)
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [kakao, setKakao] = useState<any>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const markersRef = useRef<any[]>([]);
  const meetingMarkerRef = useRef<any | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null); // Firestore 구독 해제

  // ▷ 열린 경우에만 Kakao SDK 로딩
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    (async () => {
      const w = await loadKakao();
      if (!cancelled) setKakao((w as any).kakao);
    })();
    return () => {
      cancelled = true;
    };
  }, [opened]);

  // ▷ 열린 경우에만 지도/구독 활성화
  useEffect(() => {
    if (!opened || !kakao || !mapRef.current) return;

    // 지도 생성
    const center = new kakao.maps.LatLng(meeting.lat, meeting.lng);
    const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });

    // 약속 장소 마커
    if (meetingMarkerRef.current) meetingMarkerRef.current.setMap(null);
    meetingMarkerRef.current = new kakao.maps.Marker({ position: center, clickable: true });
    meetingMarkerRef.current.setMap(map);
    const iw = new kakao.maps.InfoWindow({
      content: `<div style="padding:6px 10px;">${meeting.name ?? '약속 장소'}</div>`,
    });
    iw.open(map, meetingMarkerRef.current);

    // 멤버 실시간 구독
    unsubRef.current = onSnapshot(collection(db, 'rooms', roomId, 'members'), (snap) => {
      const list: Member[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...(d.data() as any) }));
      setMembers(list);

      // 기존 마커 정리
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // 참여자 마커
      list.forEach((m) => {
        if (!m.isSharing || typeof m.lat !== 'number' || typeof m.lng !== 'number') return;
        const pos = new kakao.maps.LatLng(m.lat, m.lng);
        const marker = new kakao.maps.Marker({ position: pos });
        marker.setMap(map);
        markersRef.current.push(marker);

        const dist = Math.round(haversineMeters({ lat: m.lat, lng: m.lng }, meeting));
        const label = new kakao.maps.InfoWindow({
          content: `<div style="padding:4px 8px;">${m.displayName ?? m.uid} · ${dist}m</div>`,
        });
        label.open(map, marker);
      });
    });

    // 정리
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      meetingMarkerRef.current?.setMap(null);
    };
  }, [opened, kakao, roomId, meeting.lat, meeting.lng, meeting.name]);

  // ▶ 위치공유 on/off
  async function toggleShare() {
    const next = !isSharing;
    setIsSharing(next);

    const memberRef = doc(db, 'rooms', roomId, 'members', currentUser.uid);

    if (next) {
      if (navigator.geolocation) {
        // 즉시 1회
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          await setDoc(
            memberRef,
            { displayName: currentUser.displayName, isSharing: true, lat, lng, updatedAt: Date.now() },
            { merge: true }
          );
        });
        // 지속
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            await setDoc(
              memberRef,
              { displayName: currentUser.displayName, isSharing: true, lat, lng, updatedAt: Date.now() },
              { merge: true }
            );
          },
          console.error,
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      }
    } else {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      await setDoc(memberRef, { isSharing: false, updatedAt: Date.now() }, { merge: true });
    }
  }

  // ▶ 접힘/언마운트 시 정리
  useEffect(() => {
    if (!opened) {
      // 패널을 닫을 때 지도/구독/마커/워치 해제
      unsubRef.current?.();
      unsubRef.current = null;
      markersRef.current.forEach((m) => m.setMap?.(null));
      markersRef.current = [];
      meetingMarkerRef.current?.setMap?.(null);
    }
  }, [opened]);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const me = useMemo(() => members.find((m) => m.uid === currentUser.uid), [members, currentUser.uid]);

  return (
    <div className="w-full space-y-3">
      {/* 1) 트리거 버튼만 기본 노출 */}
      {!opened ? (
        <button
          onClick={() => setOpened(true)}
          className="px-3 py-2 rounded-xl bg-indigo-600 text-white"
        >
          실시간 위치 공유 열기
        </button>
      ) : (
        <>
          {/* 2) 패널 헤더(닫기/공유 토글) */}
          <div className="flex items-center gap-2">
            <button onClick={() => setOpened(false)} className="px-3 py-2 rounded-xl bg-gray-200">
              접기
            </button>
            <button onClick={toggleShare} className="px-3 py-2 rounded-xl bg-blue-600 text-white">
              {isSharing ? '공유 중지' : '내 위치 공유 시작'}
            </button>
            {me?.isSharing && (
              <span className="text-sm text-gray-600">
                공유 중 · {me?.lat?.toFixed(5)}, {me?.lng?.toFixed(5)}
              </span>
            )}
          </div>

          {/* 3) 지도 영역 (열렸을 때만 렌더) */}
          <div
            ref={mapRef}
            style={{ width: '100%', height: 360, borderRadius: 16, overflow: 'hidden' }}
          />
        </>
      )}
    </div>
  );
}
