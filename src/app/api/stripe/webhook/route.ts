// Off until M6. The old handler granted credits again whenever an event was replayed.
export function POST() {
  return Response.json({ error: "Billing is not switched on.", code: "BILLING_OFF" }, { status: 503 });
}
