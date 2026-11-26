// All reusable public-site copy lives here so it can be translated later.
export const PLATFORMS = {
  facebook: { name: "Facebook", limit: 63206 },
  instagram: { name: "Instagram", limit: 2200 },
  x: { name: "X", limit: 280 },
};

export const BUSINESSES = [
  {
    key: "clinic",
    label: "Clinic",
    account: "Aarogya Dental",
    caption: "Free dental check-ups for children this Saturday, 10 am to 1 pm. Walk in, or call us to save your slot.",
  },
  {
    key: "cafe",
    label: "Café",
    account: "Filter & Co.",
    caption: "Monsoon menu is here: ginger chai, masala toast and a window seat. Open till 10 tonight.",
  },
  {
    key: "tailor",
    label: "Boutique",
    account: "Meher Boutique",
    caption: "Wedding season orders are open. Bring your fabric by the 12th and we will have it ready by the 25th.",
  },
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];


export const CAPABILITIES = [
  { platform: "Facebook Pages", stage: "Launch", text: true, photo: true, video: true, limit: 63206 },
  { platform: "Instagram", stage: "Launch", text: false, photo: true, video: true, limit: 2200 },
  { platform: "X", stage: "Testing", text: true, photo: true, video: true, limit: 280 },
  { platform: "LinkedIn", stage: "Later", text: true, photo: true, video: true, limit: 3000 },
  { platform: "Threads", stage: "Later", text: true, photo: true, video: true, limit: 500 },
  { platform: "YouTube", stage: "Launch", text: false, photo: false, video: true, limit: 5000 },
  { platform: "TikTok", stage: "Launch", text: false, photo: false, video: true, limit: 150 },
  { platform: "Pinterest", stage: "Later", text: false, photo: true, video: true, limit: 500 },
];

export const FAQ = [
  ["Can it post to my personal Facebook profile or a Group?", "No. Facebook only allows tools to post to Pages, so this applies to every scheduler."],
  ["Which kind of Instagram account do I need?", "A Business or Creator account. You can switch inside the Instagram app."],
  ["Can I post Instagram carousels?", "Not yet. One photo to the feed, or one video as a Reel. You will see this before you schedule, not after."],
  ["Is X available?", "Not yet. X, LinkedIn, Threads and Pinterest come once each customer can connect their own account safely."],
  ["What will it cost?", "Plans will be monthly, with a set number of channels and posts. Prices come at launch, after a 14-day free trial."],
];
