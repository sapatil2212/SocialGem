"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import CreateFlow from "@/components/composer/CreateFlow";
import PostComposerModal from "@/components/composer/PostComposerModal";

/** Create post: the guided, AI-assisted flow, with the full editor one click away. */
export default function ComposePage({ withAi = false, date = null }) {
  const router = useRouter();
  const [classic, setClassic] = useState(false);
  const saved = useRef(0);

  if (!classic) return <CreateFlow key={date ?? "new"} date={date} onDone={() => router.push("/app")} onClassic={() => setClassic(true)} />;
  return (
    <PostComposerModal
      key={`${withAi}-${date}`}
      variant="page"
      isOpen
      initialOpenAiWriter={withAi}
      initialDate={date}
      onPostSaved={() => {
        saved.current += 1;
      }}
      onClose={() => {
        const n = saved.current;
        if (n) toast.success(n > 1 ? `${n} posts saved` : "Post saved");
        router.push("/app");
      }}
    />
  );
}
