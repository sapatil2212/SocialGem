"use client";

import { inWorkspace } from "@/lib/workspace-client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { FaBolt, FaClock, FaExclamationTriangle } from "react-icons/fa";
import { FiEdit2, FiExternalLink, FiTrash2, FiX } from "react-icons/fi";
import Overview from "@/components/dashboard/Overview";
import { askConfirm, showAlert } from "@/components/ui/confirm";
import ContentCalendar from "@/components/calendar/ContentCalendar";
import PostComposerModal from "@/components/composer/PostComposerModal";

export default function WorkspaceDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Composer Modal State
  const [composerOpen, setComposerOpen] = useState(false);
  const [openWithAi, setOpenWithAi] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  // Post Detail Modal State
  const [viewingPost, setViewingPost] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(inWorkspace("/posts"));
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real connected accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(inWorkspace("/accounts"));
      if (res.ok) {
        const data = await res.json();
        setConnectedAccounts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Error fetching accounts:", err);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPosts();
      fetchAccounts();
    }
  }, [status, fetchPosts, fetchAccounts]);

  // Old links that opened the composer here now go to the Create post page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") === "true") router.replace("/compose");
    else if (params.get("ai") === "true") router.replace("/compose?ai=1");
  }, [router]);

  // New posts are written on their own page; editing stays here, over the calendar.
  const handleDateClick = (date) => router.push(`/compose?date=${encodeURIComponent(new Date(date).toISOString())}`);

  const handlePostClick = (post) => {
    setViewingPost(post);
  };

  const handleNewPost = () => router.push("/compose");
  const handleWriteWithAi = () => router.push("/compose?ai=1");

  const handleEditPost = (post) => {
    setViewingPost(null);
    setEditingPost(post);
    setOpenWithAi(false);
    setComposerOpen(true);
  };

  const handleDeletePost = async (postId) => {
    const ok = await askConfirm({ title: "Delete this post?", body: "It will be removed from your calendar. This cannot be undone.", confirmLabel: "Delete post", tone: "danger" });
    if (!ok) return;

    try {
      setActionLoading(true);
      const res = await fetch(inWorkspace(`/posts/${postId}`), {
        method: "DELETE",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setViewingPost(null);
      } else {
        const data = await res.json().catch(() => ({}));
        await showAlert({ title: "The post was not deleted", body: data.error || "Please try again.", tone: "danger" });
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishNow = async (postId) => {
    try {
      setActionLoading(true);
      const res = await fetch(inWorkspace(`/posts/${postId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_now" })
      });
      if (res.ok) {
        const updated = await res.json();
        setViewingPost(updated);
        fetchPosts();
      } else {
        const data = await res.json();
        await showAlert({ title: "The post was not published", body: data.error || "Please try again.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      await showAlert({ title: "The post was not published", body: "We could not reach the server. Please try again.", tone: "danger" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedulePost = async (postId, newScheduledAt) => {
    const prevPosts = [...posts];
    const postToUpdate = posts.find((p) => p.id === postId);
    if (!postToUpdate) return;

    const newIsoDate = newScheduledAt instanceof Date ? newScheduledAt.toISOString() : newScheduledAt;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, scheduledAt: newIsoDate, status: "scheduled", error: null } : p
      )
    );

    try {
      const res = await fetch(inWorkspace(`/posts/${postId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newIsoDate })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server failed to reschedule post");
      }
    } catch (err) {
      console.error("Reschedule failed:", err);
      // Rollback
      setPosts(prevPosts);
      throw err;
    }
  };

  const handlePostSaved = (savedPost) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === savedPost.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = savedPost;
        return updated;
      }
      return [savedPost, ...prev];
    });
  };

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 p-4 sm:p-6">
      <Overview posts={posts} accounts={connectedAccounts} loading={loading} onNew={handleNewPost} onOpen={handlePostClick} />

      {/* Content Calendar Main Component */}
      <ContentCalendar
        posts={posts}
        connectedAccounts={connectedAccounts}
        onDateClick={handleDateClick}
        onPostClick={handlePostClick}
        onNewPostClick={handleNewPost}
        onWriteWithAi={handleWriteWithAi}
        onDuplicatePost={handleEditPost}
        onDeletePost={handleDeletePost}
        onPublishNow={handlePublishNow}
        onReschedulePost={handleReschedulePost}
      />

      {/* Post Details / Quick Actions Modal: wide and short, the text scrolls inside */}
      {viewingPost && (() => {
        const STATUS_LABEL = { draft: "Draft", scheduled: "Scheduled", processing: "Publishing", completed: "Published", failed: "Failed", needs_check: "Needs check", cancelled: "Cancelled" };
        const STATUS_TONE = {
          completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          failed: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          needs_check: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
          processing: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
        };
        const PLATFORM_TONE = {
          youtube: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          instagram: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30",
          tiktok: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          linkedin: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          threads: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
          pinterest: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
        };
        const isVideoUrl = /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(viewingPost.mediaUrl || "");
        // A post being sent, already sent or waiting for a check cannot be sent again from here.
        const canPublish = ["draft", "scheduled", "failed"].includes(viewingPost.status);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingPost(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Post details"
              className="w-full max-w-4xl max-h-[min(560px,85vh)] flex flex-col md:flex-row overflow-hidden bg-white dark:bg-[#15132b] border border-zinc-200 dark:border-[#2a2746] rounded-[14px] shadow-2xl text-slate-900 dark:text-white transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {viewingPost.mediaUrl && (
                <div className="md:w-[42%] shrink-0 h-48 md:h-auto bg-zinc-100 dark:bg-black flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#2a2746]">
                  {isVideoUrl ? (
                    <video src={viewingPost.mediaUrl} controls preload="metadata" className="max-h-full max-w-full" />
                  ) : (
                    <img src={viewingPost.mediaUrl} alt="Post picture" className="h-full w-full object-contain" />
                  )}
                </div>
              )}

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-200 dark:border-[#2a2746]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wider ${PLATFORM_TONE[viewingPost.platform] || "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"}`}>
                      {viewingPost.platform === "x_twitter" ? "X" : viewingPost.platform}
                    </span>
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded border ${STATUS_TONE[viewingPost.status] || "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"}`}>
                      {STATUS_LABEL[viewingPost.status] || viewingPost.status}
                    </span>
                    {viewingPost.accountName && <span className="hidden sm:inline text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-48">{viewingPost.accountName}</span>}
                  </div>
                  <button type="button" aria-label="Close" onClick={() => setViewingPost(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
                    <FiX className="text-base" />
                  </button>
                </div>

                {/* Body: scrolls when the caption is long */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {viewingPost.title && <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{viewingPost.title}</h3>}
                  <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {viewingPost.description || "No caption."}
                  </p>
                  {viewingPost.tags && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                      {viewingPost.tags.split(",").map(t => `#${t.trim().replace(/^#/, "")}`).join(" ")}
                    </p>
                  )}
                  {viewingPost.error && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                      <FaExclamationTriangle className="text-red-500 text-xs shrink-0 mt-0.5" />
                      <span className="leading-normal">{viewingPost.error}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-200 dark:border-[#2a2746] px-5 py-3 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <FaClock className="text-zinc-400 text-xs" />
                      {viewingPost.status === "completed" ? "Published" : "Scheduled for"}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200">
                      {viewingPost.scheduledAt ? new Date(viewingPost.scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Immediately"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleDeletePost(viewingPost.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FiTrash2 /> Delete
                    </button>
                    <div className="flex items-center gap-2">
                      {viewingPost.publishedUrl && (
                        <a
                          href={viewingPost.publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1.5"
                        >
                          <FiExternalLink /> View live
                        </a>
                      )}
                      {canPublish && (
                        <button
                          type="button"
                          onClick={() => handleEditPost(viewingPost)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-transparent transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <FiEdit2 /> Edit
                        </button>
                      )}
                      {canPublish && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handlePublishNow(viewingPost.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/25 active:scale-95 disabled:opacity-50"
                        >
                          <FaBolt className="text-[11px]" />
                          <span>{actionLoading ? "Publishing..." : viewingPost.status === "failed" ? "Try again now" : "Publish now"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Post Composer & Multi-Channel Modal */}
      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          setSelectedDate(null);
          setEditingPost(null);
          setOpenWithAi(false);
        }}
        initialDate={selectedDate}
        initialPost={editingPost}
        onPostSaved={handlePostSaved}
        initialOpenAiWriter={openWithAi}
      />
    </div>
  );
}
