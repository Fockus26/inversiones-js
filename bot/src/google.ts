import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { ProductoDeLista } from "../../lib/catalogo/texto-lista";
import { COLECCION_PRODUCTOS } from "../../lib/catalogo/tipos";
import type { Fecha } from "../../lib/financiamiento/fechas";
import {
  type ClienteRcvConId,
  COLECCION_CLIENTES_RCV,
} from "../../lib/financiamiento/tipos";
import {
  COLECCION_CONFIGURACION,
  DOC_HORARIO,
  type HorarioAtencion,
  normalizarHorario,
} from "../../lib/horario/tipos";
import type { Intervalo } from "../../lib/horario/turnos";
import {
  COLECCION_SUSCRIPCIONES_PUSH,
  type SuscripcionPush,
} from "../../lib/notificaciones/tipos";
import { consultarEuroBcv } from "../../lib/rcv/bcv";
import { consultarEuroMercado, type TasasMercado } from "../../lib/rcv/mercado";
import {
  COLECCION_PLANES_RCV,
  COLECCION_SOLICITUDES_RCV,
  type ConfigRcv,
  DOC_CONFIG_RCV,
  fuenteBsDe,
  fuenteCopDe,
  fuenteUsdDe,
  type PlanRcvConId,
  requisitosEfectivos,
  type SolicitudRcv,
  tasasDe,
} from "../../lib/rcv/tipos";
import {
  COLECCION_SOLICITUDES_CELULARES,
  COLECCION_SOLICITUDES_CITAS,
  type SolicitudCelular,
  type SolicitudCita,
} from "../../lib/solicitudes/tipos";
import { config } from "./config";

/**
 * Acceso a Google con la misma cuenta de servicio (`chatbot-lectura`, D024):
 * - Firestore (rol Datastore User, D030): lee catálogo, horario y póliza RCV; escribe las
 *   solicitudes del chat (`solicitudesRcv`, `solicitudesCelulares`, `solicitudesCitas`), los avisos ya mandados en `clientesRcv` (D033) y borra suscripciones push
 *   vencidas (D035).
 * - Calendar (calendario compartido con la cuenta) para huecos, citas y recordatorios.
 */

interface ClaveServicio {
  client_email: string;
  private_key: string;
  project_id: string;
}

const clave = JSON.parse(
  readFileSync(config.credenciales, "utf8"),
) as ClaveServicio;

/** Proyecto de Firebase del panel; por defecto, el de la cuenta de servicio. */
export const proyectoFirestore = config.proyectoFirebase || clave.project_id;

const app = initializeApp({
  credential: cert({
    clientEmail: clave.client_email,
    privateKey: clave.private_key,
    projectId: clave.project_id,
  }),
  projectId: proyectoFirestore,
});
const db = getFirestore(app);

// ── Firestore con caché de 60 s (D024) ────────────────────────────────────

function cacheada<T>(leer: () => Promise<T>, ms = 60_000): () => Promise<T> {
  let cache: { cuando: number; valor: T } | null = null;
  return async () => {
    if (!cache || Date.now() - cache.cuando > ms) {
      cache = { cuando: Date.now(), valor: await leer() };
    }
    return cache.valor;
  };
}

export const leerCatalogo = cacheada(async (): Promise<ProductoDeLista[]> => {
  const snap = await db
    .collection(COLECCION_PRODUCTOS)
    .where("activo", "==", true)
    .get();
  return snap.docs.map((d) => d.data() as ProductoDeLista);
});

export const leerHorario = cacheada(async (): Promise<HorarioAtencion> => {
  const doc = await db
    .collection(COLECCION_CONFIGURACION)
    .doc(DOC_HORARIO)
    .get();
  return normalizarHorario(doc.exists ? doc.data() : null);
});

// ── Tasa BCV del euro (D031): 30 min de caché; si falla, la última buena y reintento en 5 min ──

let bcv: { tasa: number | null; cuando: number; ms: number } | null = null;

async function tasaBcv(): Promise<number | null> {
  if (bcv && Date.now() - bcv.cuando < bcv.ms) return bcv.tasa;
  try {
    const { tasa } = await consultarEuroBcv();
    bcv = { tasa, cuando: Date.now(), ms: 30 * 60_000 };
  } catch (e) {
    console.error("No se pudo consultar la tasa BCV; queda la anterior", e);
    bcv = { tasa: bcv?.tasa ?? null, cuando: Date.now(), ms: 5 * 60_000 };
  }
  return bcv.tasa;
}

// ── Tasa de mercado del euro en $ y COP (D036): mismo esquema que la del BCV ──

let mercado: { tasas: TasasMercado | null; cuando: number; ms: number } | null =
  null;

async function tasaMercado(): Promise<TasasMercado | null> {
  if (mercado && Date.now() - mercado.cuando < mercado.ms) return mercado.tasas;
  try {
    mercado = {
      tasas: await consultarEuroMercado(),
      cuando: Date.now(),
      ms: 30 * 60_000,
    };
  } catch (e) {
    console.error(
      "No se pudo consultar la tasa de mercado; queda la anterior",
      e,
    );
    mercado = {
      tasas: mercado?.tasas ?? null,
      cuando: Date.now(),
      ms: 5 * 60_000,
    };
  }
  return mercado.tasas;
}

/** Transportes activos, tasas y requisitos (con los de arranque si faltan). */
export const leerRcv = cacheada(async () => {
  const [planes, config] = await Promise.all([
    db.collection(COLECCION_PLANES_RCV).where("activo", "==", true).get(),
    db.collection(COLECCION_CONFIGURACION).doc(DOC_CONFIG_RCV).get(),
  ]);
  const c = config.exists ? (config.data() as ConfigRcv) : null;
  // Sin la consultada, `tasasDe` usa la última que guardó el panel.
  const usaMercado =
    fuenteUsdDe(c) === "mercado" || fuenteCopDe(c) === "mercado";
  const [bs, m] = await Promise.all([
    fuenteBsDe(c) === "bcv" ? tasaBcv() : null,
    usaMercado ? tasaMercado() : null,
  ]);
  return {
    planes: planes.docs.map((d) => ({ ...d.data(), id: d.id }) as PlanRcvConId),
    tasas: tasasDe(c, { bs, usd: m?.usd, cop: m?.cop }),
    requisitos: requisitosEfectivos(c),
  };
});

export async function guardarSolicitudRcv(s: SolicitudRcv): Promise<void> {
  await db
    .collection(COLECCION_SOLICITUDES_RCV)
    .add({ ...s, creadoEn: FieldValue.serverTimestamp() });
}

export async function guardarSolicitudCelular(
  s: SolicitudCelular,
): Promise<void> {
  await db
    .collection(COLECCION_SOLICITUDES_CELULARES)
    .add({ ...s, creadoEn: FieldValue.serverTimestamp() });
}

export async function guardarSolicitudCita(s: SolicitudCita): Promise<void> {
  await db
    .collection(COLECCION_SOLICITUDES_CITAS)
    .add({ ...s, creadoEn: FieldValue.serverTimestamp() });
}

// ── Vencimiento de pólizas (D033) ─────────────────────────────────────────

/** Clientes con póliza que vence entre `desde` y `hasta` (incluidas). Índice automático. */
export async function clientesRcvPorVencer(
  desde: Fecha,
  hasta: Fecha,
): Promise<ClienteRcvConId[]> {
  const snap = await db
    .collection(COLECCION_CLIENTES_RCV)
    .where("vence", ">=", desde)
    .where("vence", "<=", hasta)
    .get();
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as ClienteRcvConId);
}

/**
 * Marca el aviso como enviado, solo si el vencimiento sigue siendo el mismo (si el dueño renovó
 * mientras tanto, no se toca). Devuelve false si no se marcó.
 */
export async function marcarAvisoRcv(
  id: string,
  vence: Fecha,
  campo: "recordatorio30" | "recordatorio3",
): Promise<boolean> {
  const ref = db.collection(COLECCION_CLIENTES_RCV).doc(id);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const datos = doc.data();
    if (!datos || datos.vence !== vence || datos[campo] === true) return false;
    // El aviso final implica que el del mes ya no hace falta.
    tx.update(
      ref,
      campo === "recordatorio3"
        ? { recordatorio3: true, recordatorio30: true }
        : { recordatorio30: true },
    );
    return true;
  });
}

// ── Suscripciones push del panel (D035) ───────────────────────────────────

export async function suscripcionesPush(): Promise<
  (SuscripcionPush & { id: string })[]
> {
  const snap = await db.collection(COLECCION_SUSCRIPCIONES_PUSH).get();
  return snap.docs.map((d) => ({ ...(d.data() as SuscripcionPush), id: d.id }));
}

export async function borrarSuscripcionPush(id: string): Promise<void> {
  await db.collection(COLECCION_SUSCRIPCIONES_PUSH).doc(id).delete();
}

// ── Token OAuth de la cuenta de servicio (JWT firmado a mano, sin dependencias) ──

let token: { valor: string; vence: number } | null = null;

async function tokenCalendar(): Promise<string> {
  if (token && Date.now() < token.vence) return token.valor;
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: clave.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600,
  })}`;
  const firma = createSign("RSA-SHA256")
    .update(cuerpo)
    .sign(clave.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cuerpo}.${firma}`,
    }),
  });
  if (!res.ok)
    throw new Error(`Token Google ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  token = {
    valor: json.access_token,
    vence: Date.now() + (json.expires_in - 120) * 1000,
  };
  return token.valor;
}

const API = "https://www.googleapis.com/calendar/v3";

async function calendar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await tokenCalendar()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Calendar ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

const cal = () => encodeURIComponent(config.calendarId);

/** Tramos ocupados del calendario entre `desde` y `hasta`. */
export async function ocupados(desde: Date, hasta: Date): Promise<Intervalo[]> {
  const r = await calendar<{
    calendars: Record<
      string,
      { busy?: { start: string; end: string }[]; errors?: unknown[] }
    >;
  }>("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: desde.toISOString(),
      timeMax: hasta.toISOString(),
      timeZone: "America/Caracas",
      items: [{ id: config.calendarId }],
    }),
  });
  const c = r.calendars[config.calendarId];
  if (!c || c.errors?.length) {
    throw new Error(
      `Calendar sin acceso a ${config.calendarId}: ${JSON.stringify(c?.errors)}. ¿Está compartido con ${clave.client_email}?`,
    );
  }
  return (c.busy ?? []).map((b) => ({
    inicio: new Date(b.start),
    fin: new Date(b.end),
  }));
}

export interface EventoCita {
  id: string;
  summary?: string;
  start: { dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}

export async function borrarEvento(id: string): Promise<void> {
  const res = await fetch(
    `${API}/calendars/${cal()}/events/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await tokenCalendar()}` },
    },
  );
  if (!res.ok && res.status !== 410) {
    throw new Error(`Calendar ${res.status}: ${await res.text()}`);
  }
}

export async function crearEvento(evento: {
  inicio: string;
  fin: string;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  privado: Record<string, string>;
}): Promise<{ id: string; enlace: string | null }> {
  const creado = await calendar<{ id: string; htmlLink?: string }>(
    `/calendars/${cal()}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: evento.titulo,
        description: evento.descripcion,
        location: evento.ubicacion,
        start: { dateTime: evento.inicio, timeZone: "America/Caracas" },
        end: { dateTime: evento.fin, timeZone: "America/Caracas" },
        extendedProperties: { private: evento.privado },
      }),
    },
  );
  return { id: creado.id, enlace: creado.htmlLink ?? null };
}

/** Citas creadas por Gaby que empiezan entre `desde` y `hasta`. */
export async function citasEntre(
  desde: Date,
  hasta: Date,
): Promise<EventoCita[]> {
  const q = new URLSearchParams({
    timeMin: desde.toISOString(),
    timeMax: hasta.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    privateExtendedProperty: "origen=gaby",
    maxResults: "250",
  });
  const r = await calendar<{ items?: EventoCita[] }>(
    `/calendars/${cal()}/events?${q}`,
  );
  return r.items ?? [];
}

export async function marcarEvento(
  id: string,
  privado: Record<string, string>,
): Promise<void> {
  await calendar(`/calendars/${cal()}/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ extendedProperties: { private: privado } }),
  });
}

export const correoCuentaServicio = clave.client_email;
