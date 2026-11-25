type Reply =
  | { ok: true; result: string; pending?: string }
  | { ok: false; code: string; message: string; fields: Record<string, string> };

export async function postAccount(action: string, body: unknown): Promise<Reply> {
  try {
    const response = await fetch(`/api/account/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (response.ok) return { ok: true, result: data.result, pending: data.pending };
    return { ok: false, code: data.error?.code ?? "", message: data.error?.message ?? "Something went wrong.", fields: data.error?.fields ?? {} };
  } catch {
    return { ok: false, code: "OFFLINE", message: "We could not reach the server. Please try again.", fields: {} };
  }
}
