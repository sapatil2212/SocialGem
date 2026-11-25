type Reply = { ok: true; result: string } | { ok: false; message: string; fields: Record<string, string> };

export async function postAccount(action: string, body: unknown): Promise<Reply> {
  try {
    const response = await fetch(`/api/account/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (response.ok) return { ok: true, result: data.result };
    return { ok: false, message: data.error?.message ?? "Something went wrong.", fields: data.error?.fields ?? {} };
  } catch {
    return { ok: false, message: "We could not reach the server. Please try again.", fields: {} };
  }
}
