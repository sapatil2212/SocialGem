export type Search = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  AccessDenied: "Google could not confirm that email address. Try another account.",
  OAuthAccountNotLinked: "That email already signs in another way. Use the method you used first.",
  Configuration: "Sign-in is not set up correctly on this server.",
};

export const googleReady = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function authError(code: unknown) {
  if (typeof code !== "string" || !code) return "";
  return ERRORS[code] ?? "We could not sign you in. Please try again.";
}
