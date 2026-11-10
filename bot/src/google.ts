import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Intervalo } from "../../lib/horario/turnos";
import { config } from "./config";

/**
 * Google Calendar con la cuenta de servicio `chatbot-lectura` (calendario compartido con ella):
 * huecos, citas y recordatorios. Los datos (catálogo, horario, póliza, solicitudes) ya no van a
 * Firestore: están en Postgres del VPS (`./db.ts`).
 */

interface ClaveServicio {
  client_email: string;
  private_key: string;
}

const clave = JSON.parse(
  readFileSync(config.credenciales, "utf8"),
) as ClaveServicio;

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
