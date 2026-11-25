export type Search = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  AccessDenied: "That sign-in was not allowed. Try another account.",
  GoogleEmail: "Google could not confirm that email address. Try another account.",
  OAuthAccountNotLinked: "That Google account, or that email, is already connected another way.",
  LinkFirst: "That email already has an account. Log in with your password, then connect Google in Account settings.",
  LinkFromAccount: "Connect Google from Account settings.",
  AlreadyLinked: "A Google account is already connected. Disconnect it first.",
  SessionEnded: "Your last session has ended. Please try Google again.",
  Disabled: "This account is disabled. Contact support.",
  OAuthSignin: "We could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in was cancelled or did not finish. Please try again.",
  Callback: "Google sign-in was cancelled or did not finish. Please try again.",
  Configuration: "Sign-in is not set up correctly on this server.",
};

// The sample values from .env.example do not count.
export const googleReady = () => /\.apps\.googleusercontent\.com$/.test(process.env.GOOGLE_CLIENT_ID?.trim() ?? "") && Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

export function authError(code: unknown) {
  if (typeof code !== "string" || !code) return "";
  return ERRORS[code] ?? "We could not sign you in. Please try again.";
}
