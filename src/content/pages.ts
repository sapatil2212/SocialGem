import { COMPANY } from "./company";

export type Doc = { title: string; intro: string; updated: string; sections: [string, string[]][] };

const UPDATED = "28 November 2026";
const BRAND = "SocialGem";
const WHO = `${BRAND} is a product of ${COMPANY.name}, ${COMPANY.address} ("${BRAND}", "we", "us" or "our")`;
const HOURS = "Monday to Saturday, 9:00 AM to 6:00 PM IST";
const CONTACT = [`Email: ${COMPANY.email}`, `Phone: ${COMPANY.phone}`, `Support hours: ${HOURS}`, `Address: ${COMPANY.name}, ${COMPANY.address}`];

export const PRIVACY: Doc = {
  title: "Privacy Policy",
  intro: `How ${BRAND} collects, uses, shares and protects personal data, including the social media accounts you connect. This policy is published under the Information Technology Act, 2000, the rules made under it, and the Digital Personal Data Protection Act, 2023.`,
  updated: UPDATED,
  sections: [
    ["Who we are", [`${WHO}. We decide how and why your account data is used, so we are the data fiduciary for it.`]],
    ["Information we collect", [
      "Account details: your name, email address, profile picture and an encrypted password, or the details your sign-in provider shares when you sign in with Google.",
      "Workspace details: business name, brand notes, team members you invite and their roles.",
      "Content: posts, captions, hashtags, images, videos, schedules and drafts you create or upload.",
      "Connected accounts: the name, profile identifier and connection status of each social media account or Page you connect. We do not receive or store your social media passwords.",
      "Billing details: plan, invoices, GST number if you give one, and payment status. Card, UPI and net banking details are entered with our payment gateway and never reach our servers.",
      "Technical data: IP address, browser and device type, log-in times and error logs needed to run and secure the service.",
    ]],
    ["How we use it", [
      "To create and run your account and workspaces.",
      "To connect your social media accounts and publish posts at the times you choose.",
      "To generate captions, hashtags and images when you ask our AI features to.",
      "To send service emails such as sign-in codes, publishing alerts, invoices and important changes.",
      "To prevent fraud, abuse and unauthorised access, and to fix problems.",
      "To meet legal, tax and accounting obligations.",
      "We do not sell your personal data, and we do not use your content to advertise to you.",
    ]],
    ["Your content and your customers", ["Posts, media and brand material in a workspace belong to the workspace owner. We process them only to provide the service. If your content includes other people's personal data, such as customer photos, you are responsible for having their consent to publish it."]],
    ["Service providers we use", [
      "MuAPI (muapi.ai) manages connections to Facebook, Instagram, YouTube and TikTok and delivers your posts to those platforms.",
      "Anthropic (Claude) processes the business details, prompts and images you give our AI features to write captions and suggestions.",
      "Google (Gemini) creates images from descriptions you approve.",
      "Our hosting provider runs the service and stores your uploaded media.",
      "Our payment gateway processes payments, and our email provider delivers service emails.",
      "Each provider receives only what it needs for its task and is bound by its own terms to protect it.",
    ]],
    ["Social platforms", ["When you publish, your content is sent to the platform you chose and is then governed by that platform's own terms and privacy policy. Our use of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements."]],
    ["Media links", ["Social platforms collect your media from a web address, so each uploaded file has a long, unguessable public link. Anyone who has that exact link can open the file. Do not upload anything you would not publish."]],
    ["Sharing and disclosure", ["We share personal data only with the service providers above, with the platforms you publish to, when required by law or a valid government request, or to protect the rights and safety of our users and the public. If our business is transferred, your data moves only under the same protections."]],
    ["How long we keep data", [
      "Account and workspace data: while your account is open.",
      "Uploaded media: until you delete it or close your account.",
      "Server logs: only as long as needed to run and secure the service.",
      "Invoices and payment records: as long as Indian tax and company law requires.",
      "After you close your account we delete or anonymise the rest within 30 days, except what the law requires us to keep.",
    ]],
    ["Security", ["We use HTTPS encryption in transit, hashed passwords, workspace-level access controls and rate limits. No system is perfectly secure, but we act promptly on any incident and will inform you and the authorities where the law requires."]],
    ["Where data is processed", ["Some of our service providers, including our AI providers, process data outside India. We transfer data abroad only as the Digital Personal Data Protection Act, 2023 allows."]],
    ["Children", [`${BRAND} is for people aged 18 and over. We do not knowingly collect data from children. If you believe a child has given us data, contact us and we will delete it.`]],
    ["Your rights", [
      "Access a summary of the personal data we hold about you.",
      "Correct or update inaccurate data.",
      "Delete your data or close your account (see the Data Deletion page).",
      "Withdraw consent, for example by disconnecting a social account. This does not affect anything done before you withdrew it.",
      "Nominate another person to exercise your rights if you die or become unable to.",
      "Raise a grievance with us, and then with the Data Protection Board of India if you are not satisfied.",
    ]],
    ["Grievance Officer", [`Write to the Grievance Officer at ${COMPANY.email} with the subject "Grievance". We acknowledge every grievance within 48 hours and resolve it within 15 days.`]],
    ["Changes to this policy", ["We will post any change on this page with a new date. For significant changes we will also email account owners before they take effect."]],
    ["Contact us", CONTACT],
  ],
};

export const TERMS: Doc = {
  title: "Terms & Conditions",
  intro: `These terms are a binding agreement between you and ${COMPANY.name} for your use of ${BRAND}. By creating an account or using the service you accept them. If you do not agree, do not use ${BRAND}.`,
  updated: UPDATED,
  sections: [
    ["About SocialGem", [`${WHO}. ${BRAND} is an online tool for planning, creating, scheduling and publishing social media content.`]],
    ["Eligibility", ["You must be at least 18 years old and able to enter a binding contract. If you use SocialGem for a business, you confirm you are authorised to accept these terms for it."]],
    ["Your account", ["Give accurate details and keep them up to date.", "Keep your password and sign-in codes private. You are responsible for everything done through your account.", "Tell us straight away if you suspect unauthorised use.", "Workspace owners decide who joins their workspace and what role each person has."]],
    ["Connected social accounts", ["You may connect only accounts and Pages you own or are authorised to manage. You authorise us and our service providers to publish to them on your instructions. You can disconnect an account at any time."]],
    ["Plans and free trial", ["SocialGem offers a free trial and paid plans. Each plan has limits, such as the number of channels, posts or AI credits, shown on the Pricing page.", "We may change or end the free trial at any time."]],
    ["Payments", ["Paid plans are billed in advance for the period you choose, through our payment gateway. Prices and any applicable taxes, such as GST, are shown before you pay.", "If a payment fails, we may pause paid features until it is settled."]],
    ["Renewal and cancellation", ["Plans renew automatically at the end of each period unless you cancel. You can cancel from your account or by contacting support at any time before the renewal date. Your plan stays active until the end of the period you paid for. Refunds are covered by the Refund Policy."]],
    ["Your content", ["You keep full ownership of your content. You give us a limited licence to store, process, format and publish it only to provide the service.", "You confirm you have all rights needed to publish your content, including images, music and the likeness of any person shown."]],
    ["AI features", ["AI suggestions can be inaccurate, incomplete or similar to other content. Review everything before you publish. You are responsible for what you publish, whether you or the AI wrote it."]],
    ["Acceptable use", [
      "Do not publish unlawful, defamatory, obscene, hateful or misleading content, or content that infringes anyone's rights.",
      "Do not send spam or break the rules of any social platform.",
      "Do not try to access other workspaces, test our security without permission, or overload, copy or reverse-engineer the service.",
      "Do not resell the service without our written permission.",
    ]],
    ["Social platforms and third parties", ["Publishing depends on Facebook, Instagram, YouTube, TikTok and other services we do not control. They may reject, delay or remove posts, limit accounts, or change their rules. We are not responsible for their actions, but a post that fails is not counted against your plan."]],
    ["Availability", ["We aim to keep SocialGem available at all times, but we do not guarantee uninterrupted service. We may pause it for maintenance, updates or events beyond our control, and we will try to give notice of planned work."]],
    ["Intellectual property", ["The SocialGem software, name, logo and design belong to us. These terms do not give you any rights to them beyond using the service."]],
    ["Limitation of liability", ["To the maximum extent the law allows, we are not liable for indirect or consequential losses, such as lost profits, revenue, data or business opportunities.", "Our total liability for any claim is limited to the amount you paid us in the 3 months before the claim arose.", "Nothing in these terms limits liability that cannot be limited under Indian law."]],
    ["Indemnity", ["You agree to compensate us for claims, losses and costs caused by your content, your breach of these terms or your violation of any law or third-party right."]],
    ["Suspension and termination", ["You may close your account at any time.", "We may suspend or close an account that breaches these terms, harms others, involves fraud or is not paid. Where possible we will warn you first and let you export your content."]],
    ["Force majeure", ["We are not responsible for delays or failures caused by events beyond our reasonable control, such as natural disasters, government action, internet or power failures, cyber attacks or platform outages."]],
    ["Changes to these terms", ["We may update these terms. We will post changes here with a new date and email account owners about significant changes. Continuing to use SocialGem after a change takes effect means you accept it."]],
    ["Governing law and disputes", ["These terms are governed by the laws of India. Please contact us first so we can try to resolve any dispute. If it is not resolved within 30 days, the courts in Pune, Maharashtra have exclusive jurisdiction."]],
    ["Entire agreement", ["These terms, with the Privacy Policy, Refund Policy and other policies linked here, are the whole agreement between you and us about SocialGem."]],
    ["Contact us", CONTACT],
  ],
};

export const DELETION: Doc = {
  title: "Data Deletion",
  intro: "How to disconnect a social account or delete everything SocialGem holds about you.",
  updated: UPDATED,
  sections: [
    ["Disconnect a social account", ["In SocialGem, open Channels and select Disconnect on the account, or Disconnect Facebook to switch off every Page at once. Nothing is published to it after that.", "You can also remove SocialGem's access from the platform itself: in Facebook go to Settings & privacy, Settings, Business integrations; in Google go to your Google Account, Security, Third-party connections."]],
    ["Delete a post or media file", ["Delete it from the Calendar or Media library. Posts already published stay on the platform until you delete them there."]],
    ["Delete your whole account", [`Email ${COMPANY.email} from the address you sign in with, using the subject "Delete my data".`, "We confirm the request is yours, then delete your account, workspaces you own, posts, media, brand details and connected account records."]],
    ["Timing", ["We complete deletion within 30 days and email you when it is done."]],
    ["What we must keep", ["Invoices and payment records are kept for as long as Indian tax and company law requires, and used for nothing else."]],
    ["Facebook data deletion requests", ["If you remove SocialGem from your Facebook settings and ask for your data to be deleted, we delete the Facebook data we hold for you within 30 days. To check on a request, email us with your Facebook Page name."]],
    ["Contact us", CONTACT],
  ],
};

export const REFUND: Doc = {
  title: "Refund & Cancellation Policy",
  intro: "How cancellations and refunds work for SocialGem plans.",
  updated: UPDATED,
  sections: [
    ["Digital service", ["SocialGem is an online software service. Access starts as soon as your plan is active, so this policy explains the limited cases in which payments are refunded."]],
    ["Free trial", ["Try SocialGem free before you pay. The trial needs no card, so there is nothing to refund."]],
    ["Cancelling a plan", ["Cancel any time from your account or by contacting support. Cancelling stops the next renewal. Your plan stays active until the end of the period you have paid for, and you are not charged again."]],
    ["When we give a refund", [
      "You were charged twice for the same plan.",
      "You were charged but your plan was not activated because of a fault on our side.",
      "You were charged the wrong amount because of our error.",
      "You were charged for a renewal after cancelling before the renewal date.",
    ]],
    ["When we do not give a refund", [
      "Change of mind after a period has started, or not using the service.",
      "A period that has already ended.",
      "Forgetting to cancel before the renewal date.",
      "Posts rejected or removed by a social platform under its own rules. Failed posts are not counted against your plan.",
      "Accounts suspended for breaking our Terms & Conditions.",
    ]],
    ["How to ask for a refund", [`Email ${COMPANY.email} within 7 days of the charge with your registered email, transaction ID, payment date and the reason. We may ask for more information to verify it.`]],
    ["Processing time", ["We reply within 3 working days. Approved refunds are initiated within 7 working days to the original payment method. Your bank or card issuer may take a further 5 to 10 working days to show the credit."]],
    ["Failed or pending payments", ["If money left your account but the payment did not complete, it is usually returned automatically by the payment gateway or your bank within 5 to 7 working days. Contact us with the transaction ID if it is not."]],
    ["Changes to this policy", ["Changes are posted here with a new date and apply to payments made after that date."]],
    ["Contact us", CONTACT],
  ],
};

export const SHIPPING: Doc = {
  title: "Shipping & Delivery Policy",
  intro: "SocialGem is delivered online. Nothing physical is shipped.",
  updated: UPDATED,
  sections: [
    ["Nature of delivery", ["SocialGem is software you use in your web browser. We do not sell or ship physical goods, so there are no shipping charges, couriers or delivery addresses."]],
    ["Free trial", ["Your workspace is ready as soon as you sign up and confirm your email."]],
    ["Paid plans", ["Your plan is activated within a few minutes of a successful payment, and always within 24 hours. A confirmation and invoice are sent to your registered email."]],
    ["Delivery locations", ["SocialGem can be used anywhere with an internet connection."]],
    ["If access is delayed", [`If your plan is not active within 24 hours of payment, or you cannot open your account, contact us with your registered email and transaction ID. We will resolve it within 1 working day, or refund you under the Refund & Cancellation Policy.`]],
    ["Your part", ["Give a correct email address, check your spam folder for confirmation emails, and use an up-to-date browser."]],
    ["Contact us", CONTACT],
  ],
};

export const COOKIES: Doc = {
  title: "Cookie Policy",
  intro: "The small amount of information SocialGem stores in your browser, and why.",
  updated: UPDATED,
  sections: [
    ["What cookies are", ["Cookies are small text files a website stores in your browser. Similar tools, such as local storage, work the same way. This policy covers both."]],
    ["Essential cookies", ["Session cookies keep you signed in, and security cookies protect forms against misuse. SocialGem cannot work without them, so they cannot be switched off."]],
    ["Preference storage", ["We remember your last workspace, your light or dark theme and whether the sidebar is open, so the app opens the way you left it.", "After you sign up or reset your password, your email is kept in that browser tab so the sign-in form can fill it in."]],
    ["What we do not use", ["SocialGem does not use advertising, tracking or analytics cookies, and we do not let third parties place cookies through our site."]],
    ["Third-party pages", ["When you connect a social account or make a payment you visit that provider's own pages, which use their own cookies under their own policies."]],
    ["Managing cookies", ["You can view and delete cookies in your browser settings (Chrome, Safari, Firefox, Edge and others). If you block essential cookies you will not be able to sign in, and deleting them signs you out and resets your preferences."]],
    ["Changes to this policy", ["We will post any change here with a new date."]],
    ["Contact us", CONTACT],
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
