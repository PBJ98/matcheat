// src/lib/kakao.ts
export async function loadKakao(): Promise<typeof window & { kakao: any }> {
  if (typeof window === "undefined") {
    throw new Error("Kakao SDK must run in browser");
  }

  // 이미 로드된 경우 재사용
  if ((window as any).kakao?.maps) {
    return window as any;
  }

  // SDK 스크립트 로드
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-kakao]") as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Kakao SDK load error")));
    } else {
      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services`;
      script.async = true;
      script.defer = true;
      script.setAttribute("data-kakao", "1");
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => reject(new Error("Kakao SDK load error")));
      document.head.appendChild(script);
    }
  });

  await new Promise<void>((resolve) => {
    (window as any).kakao.maps.load(() => resolve());
  });

  return window as any;
}
