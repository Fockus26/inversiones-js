import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/servidor";

/**
 * Solo los endpoints que usa el panel (kit `vps-postgres.md`): `toNextJsHandler` expone todos
 * (change-password, list-sessions…). Lista blanca: uno que agregue una versión nueva de Better
 * Auth queda cerrado. Las llamadas `auth.api.*` desde el servidor no pasan por aquí.
 */
const PERMITIDOS = new Set([
  "/sign-in/email",
  "/sign-out",
  "/get-session",
  "/request-password-reset",
  "/reset-password",
]);

const h = toNextJsHandler(auth);

const solo =
  (fn: (r: Request) => Promise<Response>) =>
  (r: Request): Promise<Response> =>
    PERMITIDOS.has(new URL(r.url).pathname.replace(/^\/api\/auth/, ""))
      ? fn(r)
      : Promise.resolve(new Response(null, { status: 404 }));

export const GET = solo(h.GET);
export const POST = solo(h.POST);
