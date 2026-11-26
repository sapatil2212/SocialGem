"use client";

import { inWorkspace } from "@/lib/workspace-client";
import { CONNECT_MESSAGES, openConnect } from "@/lib/connect-client";
import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { 
  FaYoutube, 
  FaInstagram, 
  FaFacebook,
  FaLinkedin, 
  FaPinterest, 
  FaChevronDown, 
  FaChevronUp,
  FaCheck,
  FaMagic,
  FaPlus
} from "react-icons/fa";
import { FaXTwitter, FaThreads } from "react-icons/fa6";
import { SiTiktok } from "react-icons/si";
import { 
  FiX, 
  FiCalendar, 
  FiClock, 
  FiUploadCloud, 
  FiTrash2, 
  FiSend, 
  FiLink,
  FiCheckCircle,
  FiInfo,
  FiPlus,
  FiExternalLink,
  FiRefreshCw,
  FiTag
} from "react-icons/fi";
import LiveDevicePreview from "./LiveDevicePreview";
import AiPostWriter from "./AiPostWriter";
import CustomSelect from "@/components/ui/CustomSelect";

const TAG_COLOR_PALETTE = [
  "#6d28d9", // Studio Purple
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#8b5cf6", // Violet
];

const PLATFORMS = [
  { key: "youtube", name: "YouTube", Icon: FaYoutube, color: "text-red-500", activeStyle: "bg-red-500/15 border-red-500/60 text-white shadow-sm shadow-red-500/20", limit: 5000 },
  { key: "tiktok", name: "TikTok", Icon: SiTiktok, color: "text-cyan-400", activeStyle: "bg-cyan-500/15 border-cyan-400/60 text-white shadow-sm shadow-cyan-500/20", limit: 2200 },
  { key: "instagram", name: "Instagram", Icon: FaInstagram, color: "text-pink-500", activeStyle: "bg-pink-500/15 border-pink-500/60 text-white shadow-sm shadow-pink-500/20", limit: 2200 },
  { key: "x_twitter", name: "X (Twitter)", Icon: FaXTwitter, color: "text-sky-400", activeStyle: "bg-sky-500/15 border-sky-400/60 text-white shadow-sm shadow-sky-500/20", limit: 280 },
  { key: "facebook", name: "Facebook", Icon: FaFacebook, color: "text-blue-600", activeStyle: "bg-blue-600/15 border-blue-600/60 text-white shadow-sm shadow-blue-600/20", limit: 63206 },
  { key: "linkedin", name: "LinkedIn", Icon: FaLinkedin, color: "text-blue-500", activeStyle: "bg-blue-500/15 border-blue-500/60 text-white shadow-sm shadow-blue-500/20", limit: 3000 },
  { key: "threads", name: "Threads", Icon: FaThreads, color: "text-purple-400", activeStyle: "bg-purple-500/15 border-purple-400/60 text-white shadow-sm shadow-purple-500/20", limit: 500 },
  { key: "pinterest", name: "Pinterest", Icon: FaPinterest, color: "text-rose-500", activeStyle: "bg-rose-500/15 border-rose-500/60 text-white shadow-sm shadow-rose-500/20", limit: 500 },
];

const getPlatformKey = (acc) => {
  if (!acc) return "";
  const pName = (acc.platform_name || "").toLowerCase();
  if (pName === "x" || pName === "twitter") return "x_twitter";
  if (pName === "youtube") return "youtube";
  if (pName === "tiktok") return "tiktok";
  if (pName === "instagram") return "instagram";
  if (pName === "facebook") return "facebook";
  if (pName === "linkedin") return "linkedin";
  if (pName === "threads") return "threads";
  if (pName === "pinterest") return "pinterest";
  if (acc.platform === 1) return "youtube";
  if (acc.platform === 2) return "tiktok";
  if (acc.platform === 3) return "instagram";
  if (acc.platform === 4) return "x_twitter";
  if (acc.platform === 5) return "facebook";
  if (acc.platform === 6) return "linkedin";
  if (acc.platform === 7) return "threads";
  if (acc.platform === 8) return "pinterest";
  return pName;
};

const YOUTUBE_CATEGORIES = [
  { label: "People & Blogs", value: "22" },
  { label: "Film & Animation", value: "1" },
  { label: "Autos & Vehicles", value: "2" },
  { label: "Music", value: "10" },
  { label: "Gaming", value: "20" },
  { label: "Comedy", value: "23" },
  { label: "Entertainment", value: "24" },
  { label: "Education", value: "27" },
  { label: "Science & Technology", value: "28" },
];

const YOUTUBE_PRIVACY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private", label: "Private" },
];

const INSTAGRAM_PLACEMENT_OPTIONS = [
  { value: "reels", label: "Reels" },
  { value: "feed", label: "Feed Post" },
];

const FACEBOOK_PLACEMENT_OPTIONS = [
  { value: "timeline", label: "Timeline Post" },
  { value: "reels", label: "Facebook Reels" },
];

const X_REPLY_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "following", label: "Accounts you follow" },
  { value: "mentionedUsers", label: "Only accounts you mention" },
];

const POPULAR_HASHTAGS = ["#trending", "#ai", "#tech", "#innovation", "#growth", "#viral", "#creators"];

// Shared look for the composer, built on the SocialGem theme so light and dark both work.
const field = "w-full rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-ink/70 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelText = "mb-1.5 block text-xs font-medium text-muted-ink";
const tab = "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm transition-colors cursor-pointer";
const tabOn = "bg-card font-medium text-foreground shadow-sm";
const tabOff = "text-muted-ink hover:text-foreground";
const chip = "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors cursor-pointer";
const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-hairline bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-brand/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

function Section({ step, title, hint, action, children }) {
  return (
    <section className="rounded-xl border border-hairline bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span aria-hidden className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-tint-strong text-[11px] font-semibold text-brand-ink">{step}</span>
          <div className="min-w-0">
            <h3 className="!text-sm !leading-5 !tracking-normal font-semibold">{title}</h3>
            {hint && <p className="text-xs text-muted-ink">{hint}</p>}
          </div>
        </div>
        {action || null}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, hint, checked, onChange, className = "" }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 ${className}`}>
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted-ink">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-5 w-9 shrink-0 rounded-full bg-hairline transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

const noSubscribe = () => () => {};

const localDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function PostComposerModal({
  isOpen,
  onClose,
  initialDate = null,
  initialPost = null,
  initialOpenAiWriter = false,
  onPostSaved,
  // "page" draws it in the main area, for the Create post page, instead of over the screen.
  variant = "modal",
}) {
  const asPage = variant === "page";
  const [dragging, setDragging] = useState(false);
  // When the composer opened; enough to warn about a time that has already passed.
  const [openedAt] = useState(() => Date.now());
  // The browser's time zone; empty on the server so the first render matches.
  const timeZone = useSyncExternalStore(noSubscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["youtube"]);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState("youtube");
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [platformAccountMap, setPlatformAccountMap] = useState({});
  const [accountName, setAccountName] = useState("Creator Studio");
  const [accountId, setAccountId] = useState("");
  // One key per open composer, so a double click makes one post.
  const requestKey = useRef("");
  useEffect(() => {
    if (isOpen) requestKey.current = crypto.randomUUID();
  }, [isOpen]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [tagColor, setTagColor] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [isCreatingCustomTag, setIsCreatingCustomTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6d28d9");
  const [mediaUrl, setMediaUrl] = useState("");
  const [privacy, setPrivacy] = useState("public");

  // Phase 2.2: Platform-Specific Caption & Media Overrides
  const [platformOverrides, setPlatformOverrides] = useState({});
  const [activeComposerTab, setActiveComposerTab] = useState("all");

  const hasPlatformOverride = (platKey) => {
    const ov = platformOverrides[platKey];
    if (!ov) return false;
    return (
      (ov.title !== undefined && ov.title !== null && ov.title.trim() !== "") ||
      (ov.description !== undefined && ov.description !== null && ov.description.trim() !== "") ||
      (ov.tags !== undefined && ov.tags !== null && ov.tags.trim() !== "") ||
      (ov.mediaUrl !== undefined && ov.mediaUrl !== null && ov.mediaUrl.trim() !== "")
    );
  };

  const getEffectiveContent = (platKey) => {
    const ov = platformOverrides[platKey] || {};
    return {
      title: ov.title !== undefined && ov.title !== null && ov.title.trim() !== "" ? ov.title : title,
      description: ov.description !== undefined && ov.description !== null && ov.description.trim() !== "" ? ov.description : description,
      tags: ov.tags !== undefined && ov.tags !== null && ov.tags.trim() !== "" ? ov.tags : tags,
      mediaUrl: ov.mediaUrl !== undefined && ov.mediaUrl !== null && ov.mediaUrl.trim() !== "" ? ov.mediaUrl : mediaUrl,
    };
  };

  // Fetch available tags
  useEffect(() => {
    fetch(inWorkspace("/tags"))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAvailableTags(data);
      })
      .catch(() => {});
  }, []);

  const handleCreateTag = async () => {
    const cleanName = newTagName.trim().replace(/^#+/, "");
    if (!cleanName) return;
    try {
      const res = await fetch(inWorkspace("/tags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, color: newTagColor }),
      });
      if (res.ok) {
        const created = await res.json();
        setAvailableTags((prev) => {
          const exists = prev.find((t) => t.name.toLowerCase() === created.name.toLowerCase());
          if (exists) return prev.map((t) => (t.id === exists.id ? created : t));
          return [...prev, created];
        });
        setCustomTag(created.name);
        setTagColor(created.color);
        setNewTagName("");
        setIsCreatingCustomTag(false);
      }
    } catch (e) {
      console.error("Failed to create tag:", e);
    }
  };

  const handleDeleteTag = async (e, tagId) => {
    e.stopPropagation();
    try {
      await fetch(inWorkspace(`/tags/${tagId}`), { method: "DELETE" });
      setAvailableTags((prev) => prev.filter((t) => t.id !== tagId));
      const deleted = availableTags.find((t) => t.id === tagId);
      if (deleted && customTag === deleted.name) {
        setCustomTag("");
        setTagColor("");
      }
    } catch (_) {}
  };

  // Add Channel Modal states
  const [addChannelModalOpen, setAddChannelModalOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [accountNameInput, setAccountNameInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const togglePlatform = (key) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least 1 selected
        const updated = prev.filter((k) => k !== key);
        if (activePreviewPlatform === key) {
          setActivePreviewPlatform(updated[0]);
        }
        if (activeComposerTab === key) {
          setActiveComposerTab("all");
        }
        return updated;
      } else {
        setActivePreviewPlatform(key);
        return [...prev, key];
      }
    });
  };

  const selectAllPlatforms = () => {
    const connectedKeys = Array.from(new Set(connectedAccounts.map(getPlatformKey))).filter((k) =>
      PLATFORMS.some((p) => p.key === k)
    );
    if (connectedKeys.length > 0) {
      setSelectedPlatforms(connectedKeys);
    } else {
      setSelectedPlatforms(PLATFORMS.map((p) => p.key));
    }
  };

  const selectSinglePlatform = (key) => {
    setSelectedPlatforms([key]);
    setActivePreviewPlatform(key);
  };

  // YouTube options
  const [categoryId, setCategoryId] = useState("22");
  const [madeForKids, setMadeForKids] = useState(false);

  // TikTok options
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);

  // Instagram / Facebook / Threads options
  const [placement, setPlacement] = useState("reels");
  const [shareToFeed, setShareToFeed] = useState(true);

  // Pinterest options
  const [destinationLink, setDestinationLink] = useState("");
  const [boardId, setBoardId] = useState("");

  // X (Twitter) options
  const [replySettings, setReplySettings] = useState("everyone");

  // Scheduling
  const [isScheduled, setIsScheduled] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("12:00");

  // UI state
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [aiWriterOpen, setAiWriterOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialOpenAiWriter) {
      setAiWriterOpen(true);
    }
  }, [initialOpenAiWriter, isOpen]);

  useEffect(() => {
    if (initialPost) {
      const initPlat = initialPost.platform || "youtube";
      setSelectedPlatforms([initPlat]);
      setActivePreviewPlatform(initPlat);
      setTitle(initialPost.title || "");
      setDescription(initialPost.description || "");
      setTags(initialPost.tags || "");
      setCustomTag(initialPost.customTag || "");
      setTagColor(initialPost.tagColor || "");
      setMediaUrl(initialPost.mediaUrl || "");
      setPrivacy(initialPost.privacy || "public");
      setAccountName(initialPost.accountName || "Creator Studio");
      if (initialPost.scheduledAt) {
        const d = new Date(initialPost.scheduledAt);
        setScheduledDate(localDay(d));
        setScheduledTime(d.toTimeString().slice(0, 5));
        setIsScheduled(true);
      }
    } else if (initialDate) {
      setCustomTag("");
      setTagColor("");
      const d = new Date(initialDate);
      setScheduledDate(localDay(d));
      setScheduledTime("14:00");
      setIsScheduled(true);
    } else {
      setCustomTag("");
      setTagColor("");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(localDay(tomorrow));
      setScheduledTime("12:00");
      setIsScheduled(true);
    }
  }, [initialDate, initialPost, isOpen]);

  // Fetch user's real connected accounts from backend
  const fetchAccounts = () => {
    fetch(inWorkspace("/accounts"))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setConnectedAccounts(data);
          const accMap = {};
          data.forEach((acc) => {
            const key = getPlatformKey(acc);
            if (!accMap[key]) {
              accMap[key] = acc.id;
            }
          });
          setPlatformAccountMap((prev) => ({ ...accMap, ...prev }));

          // Automatically select connected channels if current selection is invalid or new post
          if (!initialPost) {
            const connectedKeys = Array.from(new Set(data.map(getPlatformKey))).filter((k) =>
              PLATFORMS.some((p) => p.key === k)
            );
            if (connectedKeys.length > 0) {
              setSelectedPlatforms((prev) => {
                const valid = prev.filter((k) => connectedKeys.includes(k));
                return valid.length > 0 ? valid : [connectedKeys[0]];
              });
              setActivePreviewPlatform((prev) => (connectedKeys.includes(prev) ? prev : connectedKeys[0]));
            }
          }
        }
      })
      .catch((err) => console.error("Failed to fetch accounts in composer:", err));
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen, initialPost]);

  // Synchronize accountId and accountName for the currently active preview platform
  useEffect(() => {
    const platAccounts = connectedAccounts.filter((a) => {
      const normKey = getPlatformKey(a);
      return normKey === activePreviewPlatform || a.platform === activePreviewPlatform;
    });

    if (platAccounts.length > 0) {
      const selectedId = platformAccountMap[activePreviewPlatform] || platAccounts[0].id;
      const matched = platAccounts.find((a) => a.id === selectedId) || platAccounts[0];
      setAccountId(String(matched.id));
      setAccountName(matched.account_name);
    } else {
      setAccountId("");
      setAccountName("Creator Studio");
    }
  }, [activePreviewPlatform, connectedAccounts, platformAccountMap]);

  // Connected vs Unconnected platforms
  const connectedPlatformKeys = new Set(connectedAccounts.map(getPlatformKey));
  const connectedPlatforms = PLATFORMS.filter((p) => connectedPlatformKeys.has(p.key));
  const unconnectedPlatforms = PLATFORMS.filter((p) => !connectedPlatformKeys.has(p.key));

  const handleInitiateConnect = (plat) => {
    setConnectingPlatform(plat);
    setAccountNameInput("");
    setConnectError("");
  };

  const handleConfirmConnect = async () => {
    if (!connectingPlatform) return;
    setIsConnecting(true);
    setConnectError("");

    try {
      const result = await openConnect(connectingPlatform.key);
      if (result === "connected") {
        setConnectingPlatform(null);
        fetchAccounts();
      } else {
        setConnectError(CONNECT_MESSAGES[result] || CONNECT_MESSAGES.failed);
      }
    } catch (err) {
      setConnectError(err.message || "Failed to connect to platform.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApplyAiContent = ({ title: newTitle, description: newDescription, tags: newTags }) => {
    if (activeComposerTab === "all") {
      if (newTitle) setTitle(newTitle);
      if (newDescription) setDescription(newDescription);
      if (newTags) setTags(newTags);
    } else {
      setPlatformOverrides((prev) => ({
        ...prev,
        [activeComposerTab]: {
          ...prev[activeComposerTab],
          ...(newTitle ? { title: newTitle } : {}),
          ...(newDescription ? { description: newDescription } : {}),
          ...(newTags ? { tags: newTags } : {}),
        },
      }));
    }
    setAiWriterOpen(false);
  };

  if (!isOpen) return null;

  const currentPlatformInfo = PLATFORMS.find((p) => p.key === activePreviewPlatform) || PLATFORMS[0];
  const currentActivePlatformInfo =
    PLATFORMS.find((p) => p.key === (activeComposerTab === "all" ? activePreviewPlatform : activeComposerTab)) || PLATFORMS[0];

  const currentTabTitle = activeComposerTab === "all"
    ? title
    : (platformOverrides[activeComposerTab]?.title !== undefined
        ? platformOverrides[activeComposerTab].title
        : title);

  const currentTabDescription = activeComposerTab === "all"
    ? description
    : (platformOverrides[activeComposerTab]?.description !== undefined
        ? platformOverrides[activeComposerTab].description
        : description);

  const currentTabMediaUrl = activeComposerTab === "all"
    ? mediaUrl
    : (platformOverrides[activeComposerTab]?.mediaUrl !== undefined
        ? platformOverrides[activeComposerTab].mediaUrl
        : mediaUrl);

  const isCurrentTabOverridden = activeComposerTab !== "all" && hasPlatformOverride(activeComposerTab);
  const currentTabHasMediaOverride = activeComposerTab !== "all" && !!platformOverrides[activeComposerTab]?.mediaUrl;

  const currentTabCharLimit = activeComposerTab === "all"
    ? Math.min(...selectedPlatforms.map((pk) => PLATFORMS.find((p) => p.key === pk)?.limit || 5000))
    : (PLATFORMS.find((p) => p.key === activeComposerTab)?.limit || 5000);

  const currentChars = (currentTabDescription || "").length;

  const limitingPlatform = activeComposerTab === "all"
    ? PLATFORMS.find((p) => selectedPlatforms.includes(p.key) && p.limit === currentTabCharLimit)
    : PLATFORMS.find((p) => p.key === activeComposerTab);

  const handleTitleChange = (val) => {
    if (activeComposerTab === "all") {
      setTitle(val);
    } else {
      setPlatformOverrides((prev) => ({
        ...prev,
        [activeComposerTab]: {
          ...prev[activeComposerTab],
          title: val,
        },
      }));
    }
  };

  const handleDescriptionChange = (val) => {
    if (activeComposerTab === "all") {
      setDescription(val);
    } else {
      setPlatformOverrides((prev) => ({
        ...prev,
        [activeComposerTab]: {
          ...prev[activeComposerTab],
          description: val,
        },
      }));
    }
  };

  const handleMediaUrlChange = (val) => {
    if (activeComposerTab === "all") {
      setMediaUrl(val);
    } else {
      setPlatformOverrides((prev) => ({
        ...prev,
        [activeComposerTab]: {
          ...prev[activeComposerTab],
          mediaUrl: val,
        },
      }));
    }
  };

  const resetCurrentTabOverride = () => {
    if (activeComposerTab === "all") return;
    setPlatformOverrides((prev) => {
      const copy = { ...prev };
      delete copy[activeComposerTab];
      return copy;
    });
  };

  const resetCurrentTabMediaOverride = () => {
    if (activeComposerTab === "all") return;
    setPlatformOverrides((prev) => {
      if (!prev[activeComposerTab]) return prev;
      const copy = { ...prev };
      const current = { ...copy[activeComposerTab] };
      delete current.mediaUrl;
      copy[activeComposerTab] = current;
      return copy;
    });
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(inWorkspace("/upload"), {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "The upload failed.");
      const finalUrl = data.url;

      if (activeComposerTab === "all") {
        setMediaUrl(finalUrl);
      } else {
        setPlatformOverrides((prev) => ({
          ...prev,
          [activeComposerTab]: {
            ...prev[activeComposerTab],
            mediaUrl: finalUrl,
          },
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || "The upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addHashtag = (tag) => {
    if (activeComposerTab === "all") {
      if (!description.includes(tag)) {
        setDescription((prev) => (prev ? `${prev} ${tag}` : tag));
      }
    } else {
      const currentDesc = platformOverrides[activeComposerTab]?.description !== undefined
        ? platformOverrides[activeComposerTab].description
        : description;
      if (!currentDesc.includes(tag)) {
        setPlatformOverrides((prev) => ({
          ...prev,
          [activeComposerTab]: {
            ...prev[activeComposerTab],
            description: currentDesc ? `${currentDesc} ${tag}` : tag,
          },
        }));
      }
    }
  };

  const handleSubmit = async (statusOverride = null, forceImmediate = false) => {
    setSubmitting(true);
    setErrorMsg("");

    try {
      let combinedScheduledAt = null;
      const mode = statusOverride === "draft" ? "draft" : forceImmediate || !isScheduled ? "now" : "schedule";
      if (mode !== "now" && scheduledDate && scheduledTime) {
        combinedScheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      }

      const payload = {
        mode,
        requestKey: requestKey.current,
        platforms: selectedPlatforms,
        platformAccountMap,
        platformOverrides,
        title,
        description,
        tags,
        customTag: customTag || null,
        tagColor: tagColor || null,
        mediaUrl,
        privacy,
        scheduledAt: combinedScheduledAt,
        disableComment,
        disableDuet,
        disableStitch,
        categoryId,
        madeForKids,
      };

      const url = inWorkspace(initialPost?.id ? `/posts/${initialPost.id}` : "/posts");
      const method = initialPost?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to schedule post.");
      }

      const savedPost = await res.json();
      if (onPostSaved) (savedPost.posts || [savedPost]).forEach((post) => onPostSaved(post));
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const zone = timeZone;
  const when = scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}:00`) : null;
  const whenText = when && !Number.isNaN(when.getTime())
    ? when.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const inPast = isScheduled && when && when.getTime() < openedAt;
  const channelCount = selectedPlatforms.length;
  const channelWord = `${channelCount} ${channelCount === 1 ? "channel" : "channels"}`;
  const overLimit = currentChars > currentTabCharLimit;
  const mediaIsVideo = /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(currentTabMediaUrl || "");
  const dropFile = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files?.length) handleMediaUpload({ target: { files: e.dataTransfer.files, value: "" } });
  };

  return (
    <div className={asPage ? "p-3 sm:p-5" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#080718]/55 backdrop-blur-sm overflow-hidden"}>
      <div
        role={asPage ? undefined : "dialog"}
        aria-modal={asPage ? undefined : true}
        aria-labelledby="composer-title"
        className={`brand-themed relative w-full overflow-hidden flex flex-col rounded-2xl border border-hairline bg-card text-foreground ${
          asPage ? "shadow-sm lg:h-[calc(100dvh-62px-2.5rem)]" : "max-w-6xl shadow-2xl max-h-[90vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-hairline">
          <div className="min-w-0">
            <h2 id="composer-title" className="!text-base !leading-tight !tracking-tight font-semibold">
              {initialPost ? "Edit post" : "New post"}
            </h2>
            <p className="text-xs text-muted-ink truncate">Write once, adjust for each channel and see it before it goes out.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAiWriterOpen(!aiWriterOpen)}
              aria-pressed={aiWriterOpen}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors cursor-pointer ${
                aiWriterOpen ? "bg-brand text-white hover:bg-brand-hover" : "border border-brand/30 bg-tint text-brand-ink hover:border-brand"
              }`}
            >
              <FaMagic aria-hidden className="text-xs" />
              <span>Write with AI</span>
            </button>
            {!asPage && (
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-muted-ink hover:bg-tint hover:text-foreground cursor-pointer">
                <FiX />
              </button>
            )}
          </div>
        </div>

        {/* Body: form and preview */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <div className={`lg:col-span-7 overflow-y-auto overflow-x-hidden bg-background/60 ${asPage ? "lg:min-h-0" : "max-h-[calc(90vh-130px)]"}`}>
            <div className="mx-auto max-w-3xl p-4 sm:p-5 space-y-4">
              {aiWriterOpen && (
                <AiPostWriter platform={activePreviewPlatform} onApply={handleApplyAiContent} onClose={() => setAiWriterOpen(false)} />
              )}

              {/* Channels */}
              <Section
                step={1}
                title="Channels"
                hint={connectedPlatforms.length ? `${channelWord} selected` : "Connect an account to post"}
                action={connectedPlatforms.length > 1 && (
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <button type="button" onClick={selectAllPlatforms} className="text-brand-ink hover:underline cursor-pointer">Select all</button>
                    <button type="button" onClick={() => selectSinglePlatform(activePreviewPlatform)} className="text-muted-ink hover:text-foreground cursor-pointer">Only this one</button>
                  </div>
                )}
              >
                {connectedPlatforms.length === 0 ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-hairline p-4 text-center sm:text-left">
                    <div>
                      <p className="text-sm font-medium">No channels connected yet</p>
                      <p className="text-xs text-muted-ink">Connect a social account to schedule and publish.</p>
                    </div>
                    <button type="button" onClick={() => setAddChannelModalOpen(true)} className={primaryButton}>
                      <FiPlus aria-hidden /> Connect a channel
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-2">
                    {connectedPlatforms.map((plat) => {
                      const Icon = plat.Icon;
                      const isSelected = selectedPlatforms.includes(plat.key);
                      const account = connectedAccounts.find((a) => getPlatformKey(a) === plat.key);
                      return (
                        <button
                          key={plat.key}
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          onClick={() => togglePlatform(plat.key)}
                          className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left transition-colors cursor-pointer ${
                            isSelected ? "border-brand bg-tint ring-1 ring-brand/30" : "border-hairline bg-card hover:border-brand/40"
                          }`}
                        >
                          <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-background border border-hairline">
                            <Icon aria-hidden className={`text-base ${plat.color}`} />
                            <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{plat.name}</span>
                            <span className="block truncate text-xs text-muted-ink">{account?.account_name || "Connected"}</span>
                          </span>
                          <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-md border text-[10px] ${isSelected ? "border-brand bg-brand text-white" : "border-hairline"}`}>
                            {isSelected && <FaCheck />}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setAddChannelModalOpen(true)}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-dashed border-hairline text-sm font-medium text-muted-ink hover:border-brand/50 hover:text-brand-ink cursor-pointer"
                    >
                      <FiPlus aria-hidden /> Add channel
                    </button>
                  </div>
                )}

                {(() => {
                  const activePlatAccounts = connectedAccounts.filter((a) => getPlatformKey(a) === activePreviewPlatform || a.platform === activePreviewPlatform);
                  if (!connectedPlatforms.length) return null;
                  return (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background border border-hairline px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-ink">
                        Posting to {currentPlatformInfo.name} as
                        {activePlatAccounts.length > 0 ? (
                          <b className="truncate font-medium text-foreground">{accountName}</b>
                        ) : (
                          <span className="font-medium text-warning">no connected account</span>
                        )}
                      </span>
                      {activePlatAccounts.length > 1 && (
                        <div className="w-48 shrink-0">
                          <CustomSelect
                            value={accountId}
                            onChange={(val) => {
                              const sel = activePlatAccounts.find((a) => String(a.id) === String(val));
                              if (sel) {
                                setAccountId(String(sel.id));
                                setAccountName(sel.account_name);
                                setPlatformAccountMap((prev) => ({ ...prev, [activePreviewPlatform]: sel.id }));
                              }
                            }}
                            options={activePlatAccounts.map((a) => ({ value: String(a.id), label: a.account_name }))}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Section>

              {/* Content */}
              <Section
                step={2}
                title="Content"
                hint={activeComposerTab === "all" ? "Shared by every selected channel" : isCurrentTabOverridden ? `Custom version for ${currentActivePlatformInfo.name}` : `Same as all channels. Type to customise for ${currentActivePlatformInfo.name}`}
                action={activeComposerTab !== "all" && isCurrentTabOverridden && (
                  <button type="button" onClick={resetCurrentTabOverride} className="inline-flex items-center gap-1 text-xs font-medium text-muted-ink hover:text-destructive cursor-pointer">
                    <FiRefreshCw aria-hidden /> Use shared version
                  </button>
                )}
              >
                {selectedPlatforms.length > 1 && (
                  <div role="tablist" aria-label="Edit content for" className="mb-3 flex gap-1 overflow-x-auto rounded-lg bg-background border border-hairline p-1">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeComposerTab === "all"}
                      onClick={() => setActiveComposerTab("all")}
                      className={`${tab} ${activeComposerTab === "all" ? tabOn : tabOff}`}
                    >
                      All channels
                    </button>
                    {selectedPlatforms.map((platKey) => {
                      const plat = PLATFORMS.find((p) => p.key === platKey);
                      if (!plat) return null;
                      const Icon = plat.Icon;
                      const on = activeComposerTab === platKey;
                      return (
                        <button
                          key={platKey}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => {
                            setActiveComposerTab(platKey);
                            setActivePreviewPlatform(platKey);
                          }}
                          className={`${tab} ${on ? tabOn : tabOff}`}
                        >
                          <Icon aria-hidden className={`text-xs ${plat.color}`} />
                          {plat.name}
                          {hasPlatformOverride(platKey) && <span className="size-1.5 rounded-full bg-amber-500" title="Customised" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <label className="block">
                  <span className={labelText}>Title</span>
                  <input
                    type="text"
                    value={currentTabTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="A clear, specific headline"
                    className={field}
                  />
                </label>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="composer-caption" className={labelText}>Caption</label>
                    {!aiWriterOpen && (
                      <button type="button" onClick={() => setAiWriterOpen(true)} className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-ink hover:underline cursor-pointer">
                        <FaMagic aria-hidden className="text-[10px]" /> Write with AI
                      </button>
                    )}
                  </div>
                  <div className={`rounded-lg border bg-background transition focus-within:ring-2 ${overLimit ? "border-destructive focus-within:ring-destructive/20" : "border-hairline focus-within:border-brand focus-within:ring-brand/15"}`}>
                    <textarea
                      id="composer-caption"
                      value={currentTabDescription}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      rows={6}
                      placeholder={activeComposerTab !== "all" ? `Caption for ${currentActivePlatformInfo.name}` : "What do you want to say? Add a hook, the details and a call to action."}
                      className="block w-full resize-y bg-transparent px-3 pt-2.5 pb-1 text-sm leading-relaxed outline-none placeholder:text-muted-ink/70"
                    />
                    <div className="flex items-center justify-between gap-2 border-t border-hairline px-3 py-1.5">
                      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                        {POPULAR_HASHTAGS.map((tag) => (
                          <button key={tag} type="button" onClick={() => addHashtag(tag)} className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-muted-ink hover:bg-tint hover:text-brand-ink cursor-pointer">
                            {tag}
                          </button>
                        ))}
                      </div>
                      <span className={`shrink-0 text-xs tabular-nums ${overLimit ? "font-semibold text-destructive" : "text-muted-ink"}`} title={limitingPlatform ? `${limitingPlatform.name} limit` : undefined}>
                        {currentChars.toLocaleString()} / {currentTabCharLimit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {overLimit && limitingPlatform && <p className="mt-1 text-xs text-destructive">Too long for {limitingPlatform.name}. Shorten it, or write a shorter version for that channel.</p>}
                </div>
              </Section>

              {/* Media */}
              <Section
                step={3}
                title="Media"
                hint="Images up to 10 MB, videos up to 50 MB"
                action={activeComposerTab !== "all" && (currentTabHasMediaOverride ? (
                  <button type="button" onClick={resetCurrentTabMediaOverride} className="text-xs font-medium text-muted-ink hover:text-destructive cursor-pointer">Use shared media</button>
                ) : (
                  <span className="text-xs text-muted-ink">Shared with all channels</span>
                ))}
              >
                {currentTabMediaUrl ? (
                  <div className="group relative overflow-hidden rounded-xl border border-hairline bg-black">
                    {mediaIsVideo ? (
                      <video src={currentTabMediaUrl} controls preload="metadata" className="max-h-72 w-full object-contain" />
                    ) : (
                      <img src={currentTabMediaUrl} alt="Attached media" className="max-h-72 w-full object-contain" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleMediaUrlChange("")}
                      className="absolute top-2 right-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-black/70 px-2.5 text-xs font-medium text-white backdrop-blur hover:bg-[#c4262e] cursor-pointer"
                    >
                      <FiTrash2 aria-hidden /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={dropFile}
                      disabled={uploading}
                      className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors cursor-pointer disabled:cursor-wait ${
                        dragging ? "border-brand bg-tint" : "border-hairline hover:border-brand/50 hover:bg-tint/50"
                      }`}
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-tint text-brand-ink">
                        {uploading ? <span className="size-4 rounded-full border-2 border-brand border-t-transparent animate-spin motion-reduce:animate-none" /> : <FiUploadCloud aria-hidden className="text-lg" />}
                      </span>
                      <span className="text-sm font-medium">{uploading ? "Uploading…" : <>Drop a file here or <span className="text-brand-ink">browse</span></>}</span>
                      <span className="text-xs text-muted-ink">JPG, PNG, WebP, GIF, MP4, MOV or WebM</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" onChange={handleMediaUpload} className="hidden" />
                    <div className="relative">
                      <FiLink aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
                      <input
                        type="url"
                        aria-label="Media link"
                        value={currentTabMediaUrl}
                        onChange={(e) => handleMediaUrlChange(e.target.value)}
                        placeholder="Or paste a public link (https://…)"
                        className={`${field} pl-9`}
                      />
                    </div>
                  </div>
                )}
              </Section>

              {/* Schedule */}
              <Section step={4} title="When to publish" hint={isScheduled ? (zone ? `Times are in ${zone}` : "Times are in your local time") : "Goes out as soon as you confirm"}>
                <div role="radiogroup" aria-label="When to publish" className="grid grid-cols-2 gap-1 rounded-lg bg-background border border-hairline p-1">
                  {[{ on: true, label: "Schedule", Icon: FiCalendar }, { on: false, label: "Post now", Icon: FiSend }].map(({ on, label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={isScheduled === on}
                      onClick={() => setIsScheduled(on)}
                      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md text-sm transition-colors cursor-pointer ${isScheduled === on ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-ink hover:text-foreground"}`}
                    >
                      <Icon aria-hidden /> {label}
                    </button>
                  ))}
                </div>
                {isScheduled && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelText}>Date</span>
                      <input type="date" value={scheduledDate} min={localDay(new Date())} onChange={(e) => setScheduledDate(e.target.value)} className={field} />
                    </label>
                    <label className="block">
                      <span className={labelText}>Time</span>
                      <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={field} />
                    </label>
                    {inPast && <p className="sm:col-span-2 text-xs text-warning">That time has already passed. Choose a later time, or post now.</p>}
                  </div>
                )}
              </Section>

              {/* Extras */}
              <details className="group rounded-xl border border-hairline bg-card" open={advancedOpen} onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 sm:px-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>
                    More options
                    <span className="ml-2 font-normal text-muted-ink">Label and {currentPlatformInfo.name} settings</span>
                  </span>
                  <FaChevronDown aria-hidden className="text-xs text-muted-ink transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-5 border-t border-hairline px-4 sm:px-5 py-4">
                  {/* Label */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium"><FiTag aria-hidden className="text-brand-ink" /> Calendar label</span>
                      {customTag && (
                        <button type="button" onClick={() => { setCustomTag(""); setTagColor(""); }} className="text-xs text-muted-ink hover:text-destructive cursor-pointer">Clear</button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setCustomTag(""); setTagColor(""); }}
                        className={`${chip} ${!customTag ? "border-brand bg-brand text-white" : "border-hairline hover:border-brand/40"}`}
                      >
                        None
                      </button>
                      {availableTags.map((t) => {
                        const isSelected = customTag?.toLowerCase() === t.name.toLowerCase();
                        return (
                          <span key={t.id || t.name} className={`${chip} group/tag ${isSelected ? "text-white" : "border-hairline hover:border-brand/40"}`} style={isSelected ? { backgroundColor: t.color, borderColor: t.color } : undefined}>
                            <button type="button" onClick={() => { setCustomTag(t.name); setTagColor(t.color); }} className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: isSelected ? "#fff" : t.color }} />
                              {t.name}
                            </button>
                            {t.userId && (
                              <button type="button" onClick={(e) => handleDeleteTag(e, t.id)} aria-label={`Delete label ${t.name}`} className="opacity-60 hover:opacity-100 cursor-pointer">
                                <FiX aria-hidden className="text-[11px]" />
                              </button>
                            )}
                          </span>
                        );
                      })}
                      {!isCreatingCustomTag && (
                        <button type="button" onClick={() => setIsCreatingCustomTag(true)} className={`${chip} border-dashed border-brand/40 text-brand-ink hover:bg-tint`}>
                          <FiPlus aria-hidden /> New label
                        </button>
                      )}
                    </div>
                    {isCreatingCustomTag && (
                      <div className="mt-3 rounded-lg border border-hairline bg-background p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="Label name, for example Launch"
                            aria-label="Label name"
                            className={`${field} flex-1`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateTag();
                              }
                            }}
                          />
                          <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} aria-label="Label colour" className="size-9 shrink-0 cursor-pointer rounded-lg border border-hairline bg-transparent" />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {TAG_COLOR_PALETTE.map((c) => (
                              <button key={c} type="button" onClick={() => setNewTagColor(c)} aria-label={`Colour ${c}`} className={`size-5 rounded-full cursor-pointer ${newTagColor === c ? "ring-2 ring-offset-2 ring-offset-background ring-brand" : ""}`} style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setIsCreatingCustomTag(false)} className={secondaryButton}>Cancel</button>
                            <button type="button" onClick={handleCreateTag} disabled={!newTagName.trim()} className={primaryButton}>Save label</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Platform settings */}
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-sm font-medium">Channel settings</span>
                      {selectedPlatforms.length > 1 && selectedPlatforms.map((pKey) => {
                        const plat = PLATFORMS.find((p) => p.key === pKey);
                        const Icon = plat?.Icon;
                        const on = activePreviewPlatform === pKey;
                        return (
                          <button key={pKey} type="button" onClick={() => setActivePreviewPlatform(pKey)} aria-pressed={on} className={`${chip} ${on ? "border-brand bg-tint text-brand-ink font-medium" : "border-hairline hover:border-brand/40"}`}>
                            {Icon && <Icon aria-hidden className={plat.color} />} {plat?.name}
                          </button>
                        );
                      })}
                    </div>

                    {activePreviewPlatform === "youtube" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className={labelText}>Category</span>
                          <CustomSelect value={categoryId} onChange={(val) => setCategoryId(val)} options={YOUTUBE_CATEGORIES} size="sm" />
                        </div>
                        <div>
                          <span className={labelText}>Visibility</span>
                          <CustomSelect value={privacy} onChange={(val) => setPrivacy(val)} options={YOUTUBE_PRIVACY_OPTIONS} size="sm" />
                        </div>
                        <Toggle className="sm:col-span-2 !px-0" label="Made for kids" hint="Required by YouTube for children's content" checked={madeForKids} onChange={setMadeForKids} />
                      </div>
                    )}
                    {activePreviewPlatform === "tiktok" && (
                      <div className="divide-y divide-hairline rounded-lg border border-hairline">
                        <Toggle label="Turn off comments" checked={disableComment} onChange={setDisableComment} />
                        <Toggle label="Turn off duets" checked={disableDuet} onChange={setDisableDuet} />
                        <Toggle label="Turn off stitches" checked={disableStitch} onChange={setDisableStitch} />
                      </div>
                    )}
                    {activePreviewPlatform === "instagram" && (
                      <div className="space-y-3">
                        <div>
                          <span className={labelText}>Placement</span>
                          <CustomSelect value={placement} onChange={(val) => setPlacement(val)} options={INSTAGRAM_PLACEMENT_OPTIONS} size="sm" />
                        </div>
                        <Toggle className="!px-0" label="Also share reels to the main feed" checked={shareToFeed} onChange={setShareToFeed} />
                      </div>
                    )}
                    {activePreviewPlatform === "facebook" && (
                      <div>
                        <span className={labelText}>Placement</span>
                        <CustomSelect value={placement} onChange={(val) => setPlacement(val)} options={FACEBOOK_PLACEMENT_OPTIONS} size="sm" />
                      </div>
                    )}
                    {activePreviewPlatform === "x_twitter" && (
                      <div>
                        <span className={labelText}>Who can reply</span>
                        <CustomSelect value={replySettings} onChange={(val) => setReplySettings(val)} options={X_REPLY_OPTIONS} size="sm" />
                      </div>
                    )}
                    {activePreviewPlatform === "pinterest" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className={labelText}>Destination link</span>
                          <input type="url" value={destinationLink} onChange={(e) => setDestinationLink(e.target.value)} placeholder="https://yourwebsite.com/page" className={field} />
                        </label>
                        <label className="block">
                          <span className={labelText}>Board (optional)</span>
                          <input type="text" value={boardId} onChange={(e) => setBoardId(e.target.value)} placeholder="Default board" className={field} />
                        </label>
                      </div>
                    )}
                    {(activePreviewPlatform === "linkedin" || activePreviewPlatform === "threads") && (
                      <p className="text-xs text-muted-ink">{currentPlatformInfo.name} has no extra settings.</p>
                    )}
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Preview */}
          <aside aria-label="Preview" className={`lg:col-span-5 border-t lg:border-t-0 lg:border-l border-hairline bg-background overflow-y-auto overflow-x-hidden ${asPage ? "lg:min-h-0" : "max-h-[calc(90vh-130px)]"}`}>
            <div className="p-4 sm:p-5">
              <LiveDevicePreview
                platform={activePreviewPlatform}
                selectedPlatforms={selectedPlatforms}
                onSelectPlatform={(plat) => {
                  setActivePreviewPlatform(plat);
                  if (activeComposerTab !== "all") setActiveComposerTab(plat);
                }}
                title={getEffectiveContent(activePreviewPlatform).title}
                description={getEffectiveContent(activePreviewPlatform).description}
                tags={getEffectiveContent(activePreviewPlatform).tags}
                customTag={customTag}
                tagColor={tagColor}
                mediaUrl={getEffectiveContent(activePreviewPlatform).mediaUrl}
                accountName={accountName}
                overriddenPlatforms={Object.keys(platformOverrides).filter(hasPlatformOverride)}
              />
            </div>
          </aside>
        </div>

        {/* Footer */}
        <div className="border-t border-hairline bg-card px-4 sm:px-5 py-3">
          {errorMsg && (
            <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <FiInfo aria-hidden className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="text-sm font-medium text-muted-ink hover:text-foreground cursor-pointer">Cancel</button>
              <span className="hidden text-xs text-muted-ink sm:inline">
                {connectedPlatforms.length === 0 ? "Connect a channel to post" : channelCount === 0 ? "Choose at least one channel" : isScheduled ? (whenText ? `${channelWord} · ${whenText}` : `${channelWord} · choose a time`) : `${channelWord} · right away`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button type="button" disabled={submitting} onClick={() => handleSubmit("draft")} className={secondaryButton}>
                Save draft
              </button>
              <button type="button" disabled={submitting || channelCount === 0 || connectedPlatforms.length === 0 || overLimit} onClick={() => handleSubmit()} className={primaryButton}>
                {submitting ? (
                  <span aria-hidden className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin motion-reduce:animate-none" />
                ) : isScheduled ? (
                  <FiCalendar aria-hidden />
                ) : (
                  <FiSend aria-hidden />
                )}
                <span>{submitting ? (isScheduled ? "Scheduling…" : "Publishing…") : isScheduled ? "Schedule post" : "Publish now"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Channel Modal (Reference App UX & Styling) */}
      {addChannelModalOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setAddChannelModalOpen(false);
            setConnectingPlatform(null);
            setConnectError("");
          }}
        >
          <div 
            className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <span>ADD SOCIAL CHANNEL</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    OAuth 2.0
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Connect and authorize platforms to schedule and publish posts
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddChannelModalOpen(false);
                  setConnectingPlatform(null);
                  setConnectError("");
                }}
                className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <FiX className="text-sm" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {connectError && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <FiInfo className="text-sm shrink-0" />
                  <span>{connectError}</span>
                </div>
              )}

              {connectingPlatform ? (
                /* Connecting Platform Dialog */
                <div className="p-4 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shadow-inner">
                      {(() => {
                        const Icon = connectingPlatform.Icon;
                        return <Icon className={`text-xl ${connectingPlatform.color}`} />;
                      })()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Connect {connectingPlatform.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        You will be redirected to authorize access.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                      Account Label / Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={accountNameInput}
                      onChange={(e) => setAccountNameInput(e.target.value)}
                      placeholder={`e.g. My ${connectingPlatform.name} Account`}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Helps identify this account in your workspace dashboard.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setConnectingPlatform(null)}
                      disabled={isConnecting}
                      className="px-3.5 py-1.5 rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmConnect}
                      disabled={isConnecting}
                      className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Authorize & Connect</span>
                          <FiExternalLink className="text-xs" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Unconnected Platforms Grid */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Available Channels to Connect
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {unconnectedPlatforms.length} available
                      </span>
                    </div>

                    {unconnectedPlatforms.length === 0 ? (
                      <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 text-center text-xs text-zinc-400">
                        All supported channels are currently connected!
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {unconnectedPlatforms.map((plat) => {
                          const Icon = plat.Icon;
                          return (
                            <div
                              key={plat.key}
                              onClick={() => handleInitiateConnect(plat)}
                              className="p-3.5 rounded-lg border border-zinc-800/90 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2.5 group shadow-sm"
                            >
                              <div className="w-11 h-11 rounded-full bg-zinc-800/80 group-hover:bg-zinc-800 flex items-center justify-center transition-colors">
                                <Icon className={`text-xl ${plat.color} group-hover:scale-110 transition-transform`} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-200 group-hover:text-white">
                                  {plat.name}
                                </div>
                                <span className="text-[11px] text-blue-400 group-hover:text-blue-300 font-medium inline-flex items-center gap-0.5 mt-0.5">
                                  + Connect
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Already Connected Platforms */}
                  {connectedPlatforms.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-zinc-800/80">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Already Connected Channels
                      </span>
                      <div className="space-y-2">
                        {connectedAccounts.map((acc) => {
                          const platKey = getPlatformKey(acc);
                          const platInfo = PLATFORMS.find((p) => p.key === platKey) || { name: acc.platform_name || platKey, Icon: FaCheck, color: "text-zinc-400" };
                          const Icon = platInfo.Icon;

                          return (
                            <div
                              key={acc.id}
                              className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                  <Icon className={`text-xs ${platInfo.color}`} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-zinc-200 block truncate">
                                    {acc.account_name || `${platInfo.name} Account`}
                                  </span>
                                  <span className="text-[11px] text-zinc-500 block">
                                    {platInfo.name}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Connected
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleInitiateConnect(platInfo)}
                                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                                >
                                  + Add another
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
              <span>Need to manage existing accounts?</span>
              <a
                href="/integrations"
                className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
              >
                <span>Open Integrations Manager</span>
                <FiExternalLink className="text-[11px]" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
