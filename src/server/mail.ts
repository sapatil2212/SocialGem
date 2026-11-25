import nodemailer, { type Transporter } from "nodemailer";

const env = (name: string) => process.env[name]?.trim() || "";
export const mailReady = () => Boolean(env("EMAIL_HOST") && env("EMAIL_USERNAME") && env("EMAIL_PASSWORD"));

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

let transport: Transporter | undefined;

function mailer() {
  const port = Number(env("EMAIL_PORT") || 587);
  // 465 is encrypted from the start. Other ports must switch to TLS or nothing is sent.
  const local = env("EMAIL_HOST") === "127.0.0.1" && process.env.EMAIL_ALLOW_LOCAL_PLAIN === "test-only";
  transport ??= nodemailer.createTransport({
    host: env("EMAIL_HOST"),
    port,
    secure: port === 465,
    requireTLS: port !== 465 && !local,
    ignoreTLS: local,
    auth: local ? undefined : { user: env("EMAIL_USERNAME"), pass: env("EMAIL_PASSWORD") },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
  return transport;
}

// Plain by design: thin dividers, no shadows or gradients.
function layout(heading: string, body: string, code?: string) {
  return `<div style="max-width:520px;margin:0 auto;font:15px/1.6 Arial,sans-serif;color:#1b2240">
<p style="padding:16px 0;margin:0;border-bottom:1px solid #e8e3dd;color:#777">SocialGem</p>
<h1 style="font-size:20px;margin:28px 0 12px">${escape(heading)}</h1><p>${escape(body)}</p>
${code ? `<p style="margin:24px 0;padding:16px 0;border-top:1px solid #e8e3dd;border-bottom:1px solid #e8e3dd;font:bold 30px/1 'Courier New',monospace;letter-spacing:8px">${code}</p>` : ""}
<p style="color:#777;font-size:13px">${code ? "Never share this code. We will not ask for it by phone or message. " : ""}If you did not ask for this, you can ignore it.</p></div>`;
}

/**
 * Account mail always goes to one person. EMAIL_BCC is never applied here:
 * a copy of a code would let that mailbox take over the account.
 */
async function send(to: string, subject: string, text: string, html: string) {
  if (!mailReady()) throw new Error("MAIL_NOT_CONFIGURED");
  await mailer().sendMail({ from: env("EMAIL_FROM") || { name: "SocialGem", address: env("EMAIL_USERNAME") }, to, subject, text, html });
}

export function sendCode(to: string, purpose: "verify" | "reset", code: string) {
  const heading = purpose === "verify" ? "Your sign-up code" : "Your password reset code";
  const body = "Enter this code in SocialGem. It works for 10 minutes.";
  return send(to, `${heading}`, `${body}\n\n${code}\n\nNever share this code.`, layout(heading, body, code));
}

export function sendNotice(to: string, heading: string, body: string) {
  return send(to, heading, body, layout(heading, body));
}
