import { guard, HttpError } from "@/server/guard";

// Billing returns in M6 with a ledger and replay protection.
export const POST = guard({}, async () => {
  throw new HttpError(503, "BILLING_OFF", "Plans are not on sale yet.");
});
