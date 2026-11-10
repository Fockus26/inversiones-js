import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import * as schema from "../db/schema";
import type { Db } from "../db/tipos";
import { correoRestablecer, enviarCorreo } from "../email/enviar";
import {
  PREFIJO_FIREBASE,
  parametrosDesdeEntorno,
  verificarHashFirebase,
} from "./hash-firebase";
import {
  liberarIntento,
  limpiarFallos,
  normalizarCorreo,
  reservarIntento,
} from "./intentos";
import { LARGO_CLAVE } from "./limites";

/**
 * Configuración de Better Auth (fábrica: el panel la usa con Postgres y los tests con PGlite).
 * Auth del panel en el servidor (migración al VPS; reemplaza Firebase Auth, D003/D010).
 * Solo admins: no hay registro público (`admin:crear` los da de alta, D022). El acceso al panel
 * lo decide la tabla `admins`, no el login: ver `lib/data/acceso.ts`.
 */

const urlBase =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

/**
 * Orígenes desde los que se acepta entrar, además de `baseURL`. En Vercel la misma app responde
 * en la URL del despliegue, en el alias de la rama y en el dominio de producción: sin esto,
 * entrar por un alias que no es `BETTER_AUTH_URL` da 403 (QA de la migración, hallazgo 8).
 */
export function origenesConfiables(entorno = process.env): string[] {
  return [
    entorno.VERCEL_URL,
    entorno.VERCEL_BRANCH_URL,
    entorno.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .filter((h): h is string => Boolean(h))
    .map((h) => `https://${h}`);
}

/** Ruta de la app donde se elige la contraseña nueva (recibe `?token=`). */
export const RUTA_RESTABLECER = "/restablecer";

export function crearAuth(db: Db, baseURL = urlBase) {
  return betterAuth({
    baseURL,
    trustedOrigins: origenesConfiables(),
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      revokeSessionsOnPasswordReset: true,
      minPasswordLength: LARGO_CLAVE.min,
      maxPasswordLength: LARGO_CLAVE.max,
      // Con la contraseña nueva, la cuenta deja de estar bloqueada (lo promete el aviso del 429).
      onPasswordReset: async ({ user }) => {
        await limpiarFallos(db, normalizarCorreo(user.email));
      },
      password: {
        hash: hashPassword,
        // Usuarios importados de Firebase conservan su contraseña (scrypt modificado de Firebase).
        verify: async ({ hash, password }) => {
          if (hash.startsWith(PREFIJO_FIREBASE)) {
            const p = parametrosDesdeEntorno();
            if (!p) {
              console.error("[auth] faltan las variables FIREBASE_HASH_*");
              return false;
            }
            return verificarHashFirebase(hash, password, p);
          }
          return verifyPassword({ hash, password });
        },
      },
      sendResetPassword: async ({ user, token }) => {
        const enlace = `${baseURL}${RUTA_RESTABLECER}?token=${encodeURIComponent(token)}`;
        const { asunto, html, texto } = correoRestablecer(user.email, enlace);
        // Sin await: un envío esperado delata por el tiempo de respuesta si la cuenta existe.
        // `after` evita que Vercel congele la función antes de terminar el envío.
        after(() =>
          enviarCorreo(user.email, asunto, html, texto).catch((e) =>
            console.error("[correo] no se pudo enviar:", (e as Error).message),
          ),
        );
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        // Amplio por IP; el tope real es por cuenta (hooks de abajo).
        "/sign-in/email": { window: 300, max: 200 },
        "/request-password-reset": { window: 3600, max: 20 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/reset-password") {
          // 8 espacios no son una contraseña.
          const nueva = ctx.body?.newPassword;
          if (
            typeof nueva === "string" &&
            nueva.trim().length < LARGO_CLAVE.min
          )
            throw new APIError("BAD_REQUEST", {
              code: "PASSWORD_TOO_SHORT",
              message: "Password too short",
            });
          return;
        }
        if (ctx.path !== "/sign-in/email") return;
        // Se reserva antes de comprobar la contraseña: atómico, así en paralelo no pasan más de 5.
        if (!(await reservarIntento(db, normalizarCorreo(ctx.body?.email)))) {
          throw new APIError("TOO_MANY_REQUESTS");
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const correo = normalizarCorreo(ctx.body?.email);
        const r = ctx.context.returned;
        // `isAPIError`, no `instanceof`: el 400 de validación es otra clase (better-call) y con
        // `instanceof` pasaba por acierto y borraba la cuenta de fallos.
        if (!isAPIError(r)) {
          // Solo un login de verdad limpia (trae la sesión); cualquier otra cosa no toca nada.
          if (r && typeof r === "object" && "token" in r)
            await limpiarFallos(db, correo);
        } else if (
          r.status !== "UNAUTHORIZED" &&
          r.status !== "TOO_MANY_REQUESTS"
        ) {
          // No llegó a comprobar la contraseña (origen, formato…): no cuenta como fallo.
          await liberarIntento(db, correo);
        }
      }),
    },
    plugins: [nextCookies()],
  });
}
