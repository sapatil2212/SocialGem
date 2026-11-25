import nodemailer from "nodemailer";

export const mailReady = () => Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Plain by design: thin dividers, square button, no shadows or gradients.
function layout(heading: string, body: string, action: string, url: string) {
  return `<div style="max-width:520px;margin:0 auto;font:15px/1.6 Arial,sans-serif;color:#1b2240">
<p style="padding:16px 0;margin:0;border-bottom:1px solid #e8e3dd;color:#777">SocialGem</p>
<h1 style="font-size:20px;margin:28px 0 12px">${escape(heading)}</h1><p>${escape(body)}</p>
<p style="margin:26px 0"><a href="${escape(url)}" style="background:#ff6b00;color:#1b2240;padding:11px 20px;text-decoration:none;font-weight:bold">${escape(action)}</a></p>
<p style="padding:16px 0;margin:28px 0 0;border-top:1px solid #e8e3dd;color:#777;font-size:13px">If you did not ask for this, you can ignore it.</p></div>`;
}

export async function sendLink(to: string, subject: string, body: string, action: string, url: string) {
  if (!mailReady()) {
    // Local development only: there is no mail server, so show the link in the terminal.
    if (process.env.NODE_ENV === "development") console.info(`[mail] ${subject}: ${url}`);
    return false;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: process.env.EMAIL_FROM, to, subject, text: `${body}\n\n${url}`, html: layout(subject, body, action, url) });
  return true;
}
