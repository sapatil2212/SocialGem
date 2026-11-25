import { guardWorkspace } from "@/server/guard";
import { platformStates } from "@/server/muapi";

export const GET = guardWorkspace({}, async () => platformStates());
