import { endSessions } from "@/server/google";
import { guard } from "@/server/guard";

export const DELETE = guard({ limit: { name: "me-sessions", max: 10, seconds: 3600 } }, ({ user }) => endSessions(user.id));
