// lib/reviewRepo.ts
import {
  addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where,
} from "firebase/firestore";
import { db } from "../firebase";

export type ReviewDoc = {
  id?: string;
  placeId: string;
  author: string;
  text: string;
  rating?: number;
  createdAt?: any;
};

// 실시간 구독
export function listenReviews(placeId: string, cb: (rows: ReviewDoc[]) => void) {
  const q = query(
    collection(db, "reviews"),
    where("placeId", "==", placeId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ReviewDoc) }));
    cb(rows);
  });
}

// 추가
export async function addReviewDoc(input: Omit<ReviewDoc, "id" | "createdAt">) {
  await addDoc(collection(db, "reviews"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}
