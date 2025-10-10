"use client";
import { useState } from "react";

type Post = {
  id: number;
  title: string;
  content: string;
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([
    { id: 1, title: "첫 번째 글", content: "안녕하세요 👋" },
    { id: 2, title: "두 번째 글", content: "밥친구 테스트 게시글입니다." },
  ]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>내가 쓴 글</h1>

      {posts.map((post) => (
        <div key={post.id} style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h2 style={{ margin: "0 0 0.5rem" }}>{post.title}</h2>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  );
}
