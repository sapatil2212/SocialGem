import { COMPANY } from "./company";

export type Doc = { title: string; intro: string; sections: [string, string[]][] };

// Drafts for legal review. Anything the owner must supply is in [square brackets].
export const PRIVACY: Doc = {
  title: "Privacy policy",
  intro: "How SocialGem uses information about you and the accounts you connect.",
  sections: [
    ["Who we are", [`SocialGem is a product of ${COMPANY.name}, ${COMPANY.address}. Write to ${COMPANY.email} about privacy.`]],
    ["What we collect", ["Your name, email and profile picture from sign-in.", "Workspaces, posts, media and schedules you create.", "The name and identifiers of social accounts you connect.", "Billing records when you buy a plan. Card and UPI details go to the payment provider, not to us.", "Basic logs needed to run and secure the service."]],
    ["Who processes it for us", ["MuAPI (muapi.ai) connects your social accounts and publishes your posts. It holds the social account connections on our behalf. MuAPI may use a further provider for some platforms; we will name it here once confirmed.", "Cloudflare stores media you upload.", "Our payment provider takes payments, and our email provider sends service messages.", "The platforms you publish to receive the posts you send them."]],
    ["Media is public", ["Platforms fetch your media from a web address, so uploaded files can be opened by anyone who has the exact address. Do not upload anything confidential."]],
    ["How long we keep it", ["Account data stays while your account is open. Media is removed [30 days] after publishing. Invoices are kept for as long as tax law requires."]],
    ["Your choices", ["You can disconnect an account, export your posts, correct your details or ask us to delete your data. See the data deletion page."]],
  ],
};

export const TERMS: Doc = {
  title: "Terms & Conditions",
  intro: `The agreement between you and ${COMPANY.name} when you use SocialGem.`,
  sections: [
    ["The service", ["SocialGem helps you prepare, schedule and publish social posts. It is in development, and features may change."]],
    ["Your content", ["You keep ownership of your content. You confirm you have the right to publish it, and that it follows the law and each platform's rules."]],
    ["Other platforms", ["Publishing depends on services we do not control. A platform may reject, delay or remove a post, or change what it allows."]],
    ["Plans and payment", ["Plans are billed per period with limits on channels and posts. A post that fails is not counted. See the Refund Policy for refunds."]],
    ["Fair use", ["No spam, harassment, unlawful content, or attempts to break or overload the service."]],
    ["Liability and law", ["[Liability limit and governing law to be set by counsel.]"]],
  ],
};

export const DELETION: Doc = {
  title: "Delete your data",
  intro: "How to remove a connected account or everything we hold about you.",
  sections: [
    ["Remove one social account", ["Open Channels, choose the account and select Disconnect. You can also remove access in the settings of the platform itself."]],
    ["Delete your SocialGem account", [`Email ${COMPANY.email} from the address you sign in with, with the subject "Delete my data". We will confirm it is you, then delete your workspaces, posts, media and connections.`]],
    ["What we must keep", ["Invoices and payment records required by tax law. These are not used for anything else."]],
    ["Timing", ["We aim to finish within [30 days] and will email you when it is done. Posts already published stay on the platforms until you delete them there."]],
  ],
};

export const REFUND: Doc = {
  title: "Refund Policy",
  intro: "How cancellations and refunds will work for paid SocialGem plans.",
  sections: [
    ["Current status", ["Paid plans are not on sale yet, so no payment is being taken. These terms will apply once plans launch."]],
    ["Free trial", ["The trial is free and does not need a refund. You can stop using it at any time."]],
    ["Cancelling a plan", ["You will be able to cancel before the next billing date. Your plan stays active until the end of the period you paid for."]],
    ["When we refund", ["Duplicate or incorrect charges are refunded in full.", "Other requests: [refund window and conditions to be confirmed]."]],
    ["How to ask", [`Email ${COMPANY.email} with your account email and payment reference. Approved refunds go back to the original payment method within [number] working days.`]],
  ],
};

export const SHIPPING: Doc = {
  title: "Shipping & Delivery",
  intro: "SocialGem is an online service. Nothing is shipped to you.",
  sections: [
    ["No physical delivery", ["We do not sell or ship physical goods, so there are no shipping charges, couriers or delivery addresses."]],
    ["How you get access", ["Your workspace opens in your browser after you confirm your email and log in."]],
    ["Paid plans", ["When plans launch, access will be added to your account after payment is confirmed."]],
    ["Access problems", [`If you cannot open your account, write to ${COMPANY.email} or call ${COMPANY.phone}.`]],
  ],
};

export const COOKIES: Doc = {
  title: "Cookie Policy",
  intro: "The small amount of information SocialGem stores in your browser, and why.",
  sections: [
    ["Needed to sign in", ["Session and security cookies keep you signed in and protect forms. The service cannot work without them."]],
    ["Your preferences", ["A cookie remembers your last workspace. Your browser also stores your light or dark theme and sidebar choice."]],
    ["Temporary sign-in details", ["After sign-up or a password reset, your email is kept in that browser tab so the log in form can fill it in."]],
    ["Advertising and tracking", ["SocialGem does not set advertising or analytics cookies."]],
    ["Your control", ["You can delete cookies in your browser settings. You will be signed out, and your preferences will reset."]],
  ],
};

export const HELP = [
  ["Which Facebook accounts work?", "Pages only. Facebook does not let scheduling tools post to personal profiles or Groups."],
  ["Which Instagram accounts work?", "Business or Creator accounts. Posts need a photo or a video; text alone is not possible."],
  ["Can I post several photos at once?", "Not yet. Each post takes one photo or one video."],
  ["Why is X marked as testing?", "We have not yet confirmed a reliable way for each customer to connect their own X account."],
  ["What does Needs check mean?", "We sent the post but lost contact before hearing back. Trying again could post it twice, so it is checked first."],
  ["Does a failed post use up my plan?", "No. Only a confirmed published post is counted."],
  ["What happens to a late post?", "After a long outage we hold back posts that are hours late and tell you, instead of posting old news."],
  ["Which time zone is used?", "Each workspace has its own. New workspaces start on India time."],
];
