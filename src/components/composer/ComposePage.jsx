"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PostComposerModal from "@/components/composer/PostComposerModal";

/** The composer as its own page. Saving or cancelling goes back to the calendar. */
export default function ComposePage({ withAi = false, date = null }) {
  const router = useRouter();
  const saved = useRef(0);
  return (
    <PostComposerModal
      // A fresh composer for each visit, including Write with AI from this page.
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
