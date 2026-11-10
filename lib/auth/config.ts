import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
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
  cuentaBloqueada,
  limpiarFallos,
  normalizarCorreo,
  registrarFallo,
} from "./intentos";

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

/** Ruta de la app donde se elige la contraseña nueva (recibe `?token=`). */
export const RUTA_RESTABLECER = "/restablecer";

export function crearAuth(db: Db, baseURL = urlBase) {
  return betterAuth({
    baseURL,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      revokeSessionsOnPasswordReset: true,
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
        if (ctx.path !== "/sign-in/email") return;
        if (await cuentaBloqueada(db, normalizarCorreo(ctx.body?.email))) {
          throw new APIError("TOO_MANY_REQUESTS");
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const correo = normalizarCorreo(ctx.body?.email);
        if (ctx.context.returned instanceof APIError) {
          // El 429 del propio bloqueo no suma.
          if (ctx.context.returned.status !== "TOO_MANY_REQUESTS") {
            await registrarFallo(db, correo);
          }
        } else {
          await limpiarFallos(db, correo);
        }
      }),
    },
    plugins: [nextCookies()],
  });
}
