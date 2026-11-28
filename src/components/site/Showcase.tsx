import Link from "next/link";
import { ChevronRight, CircleCheck, Clock3, FileText, CalendarDays, Send, TriangleAlert, Sparkles, Hash, ImageIcon } from "lucide-react";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import { SiTiktok } from "react-icons/si";

/* Illustrated feature rows under the hero: a drawing on one side, the pitch on the other. */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function Plane() {
  return (
    <svg aria-hidden viewBox="0 0 240 150" className="sg-show-plane">
      <path d="M8 18 62 34 22 46Z" fill="#fff" stroke="#1d2433" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M22 46 30 64 38 41" fill="none" stroke="#1d2433" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M62 34 38 41" stroke="#1d2433" strokeWidth="2.2" />
      <path d="M44 58c26 30 96 34 96-6 0-26-36-24-34 2 4 40 70 72 130 76" fill="none" stroke="#e5484d" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function DatePad() {
  return (
    <svg aria-hidden viewBox="0 0 120 120" className="sg-show-pad">
      <path d="M20 104 96 104 108 44 32 44Z" fill="#fff" stroke="#1d2433" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M26 98 100 98 112 38" fill="none" stroke="#1d2433" strokeWidth="2" />
      <path d="M36 44c-6-20-2-34 6-36h62c-8 4-12 18-4 36" fill="#fff" stroke="#1d2433" strokeWidth="2.4" strokeLinejoin="round" />
      <text x="48" y="88" fontSize="34" fontStyle="italic" fontWeight="700" fill="#e5484d" transform="skewX(-12)">28</text>
    </svg>
  );
}

function CalendarArt() {
  const states = [
    [Send, "Published"],
    [Clock3, "Scheduled"],
    [TriangleAlert, "Needs attention"],
    [FileText, "Drafts"],
    [CalendarDays, "Calendar"],
  ] as const;
  // [day index, row, tone]
  const chips = [[0, 1, "fb"], [3, 0, "ig"], [4, 1, "yt"], [2, 2, "fb"], [0, 2, "ig"]] as const;
  return (
    <div className="sg-show-art">
      <Plane />
      <div className="sg-show-cal">
        <div className="sg-show-cal-top">
          <span className="sg-show-arrows"><ChevronRight className="rotate-180" /><ChevronRight /></span>
          <strong>March</strong>
          <span className="sg-show-tabs"><b>Week</b><span>Month</span></span>
        </div>
        <div className="sg-show-days">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="sg-show-grid">
          {Array.from({ length: 15 }, (_, i) => {
            const day = i % 5, row = Math.floor(i / 5);
            const chip = chips.find(([d, r]) => d === day && r === row);
            return (
              <div key={i} className={day === 3 && row === 0 ? "is-today" : undefined}>
                <em>{row * 7 + day + 3}</em>
                {chip && <i className={`sg-chip-${chip[2]}`}>{row === 0 ? "18:30" : ""}</i>}
              </div>
            );
          })}
        </div>
      </div>
      <ul className="sg-show-menu">
        {states.map(([Icon, label]) => (
          <li key={label} className={label === "Calendar" ? "is-on" : undefined}><Icon aria-hidden />{label}</li>
        ))}
      </ul>
      <DatePad />
    </div>
  );
}

function CreateArt() {
  return (
    <div className="sg-show-art">
      <div className="sg-show-chat">
        <p className="is-me">Diwali offer for our bakery, 20% off sweets boxes</p>
        <div className="sg-show-reply">
          <span className="sg-show-bot"><Sparkles aria-hidden /></span>
          <div>
            <div className="sg-show-photo"><ImageIcon aria-hidden /><span>Festive sweets box, warm light</span></div>
            <p>Light up your celebrations ✨ 20% off every sweets box until Sunday. Pre-order today and pick up fresh.</p>
            <div className="sg-show-tags">{["#Diwali", "#PuneBakery", "#FestiveTreats"].map((t) => <span key={t}><Hash aria-hidden />{t.slice(1)}</span>)}</div>
          </div>
        </div>
        <div className="sg-show-approve"><CircleCheck aria-hidden />Approve and schedule</div>
      </div>
    </div>
  );
}

function ChannelsArt() {
  const rows = [
    [FaFacebook, "#1877f2", "Asha's Bakery", "Facebook Page", "Active"],
    [FaInstagram, "#e4127b", "@ashasbakery", "Instagram", "Active"],
    [FaYoutube, "#ff0000", "Asha's Kitchen", "YouTube", "Active"],
    [SiTiktok, "#000000", "@ashabakes", "TikTok", "Off"],
  ] as const;
  return (
    <div className="sg-show-art">
      <ul className="sg-show-channels">
        {rows.map(([Icon, colour, name, kind, state]) => (
          <li key={name}>
            <span className="sg-show-logo" style={{ backgroundColor: colour }}><Icon aria-hidden /></span>
            <span><strong>{name}</strong><small>{kind}</small></span>
            <em className={state === "Active" ? "is-on" : undefined}>{state}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ROWS = [
  {
    id: "calendar",
    tag: "Calendar",
    title: "See your whole month before it happens",
    text: "Every post, on every channel, laid out by day. Spot the gaps, drag posts to a better time and keep a steady rhythm your audience can count on.",
    link: ["/signup", "Plan your first week"],
    Art: CalendarArt,
  },
  {
    id: "create",
    tag: "Create with AI",
    title: "From a one-line idea to a post that's ready",
    text: "Describe the post the way you'd tell a friend. SocialGem drafts the picture, the caption and the hashtags for each channel. You check it, tweak it and approve.",
    link: ["/signup", "Start creating free"],
    Art: CreateArt,
  },
  {
    id: "channels",
    tag: "Channels",
    title: "Every account in one calm place",
    text: "Connect your Facebook Pages, Instagram, YouTube and TikTok once. Switch a channel off for a while without losing anything, and turn it back on when you're ready.",
    link: ["#platforms", "See what each platform accepts"],
    Art: ChannelsArt,
  },
] as const;

export default function Showcase() {
  return (
    <section className="sg-section sg-wrap sg-show-list">
      {ROWS.map(({ id, tag, title, text, link, Art }, i) => (
        <article key={tag} id={id} className={`sg-show reveal${i % 2 ? " is-flipped" : ""}`}>
          <Art />
          <div className="sg-show-copy">
            <p className="sg-show-tag">{tag}</p>
            <h2>{title}</h2>
            <p className="sg-show-text">{text}</p>
            <Link href={link[0]} className="sg-show-link">{link[1]} <span><ChevronRight aria-hidden /></span></Link>
          </div>
        </article>
      ))}
    </section>
  );
}
