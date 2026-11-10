import webpush from "web-push";
import type { AvisoPush } from "../../lib/notificaciones/tipos";
import { config } from "./config";
import { borrarSuscripcionPush, suscripcionesPush } from "./db";

/**
 * Avisos push al panel instalado (D035): cada teléfono que activó la campana guardó su
 * suscripción en la base (`suscripciones_push`). Las que el navegador dio de baja (404/410) se borran solas.
 * Nunca hace fallar a quien lo llama: un aviso perdido no debe tumbar una cita.
 */

const activo = Boolean(config.vapidPublica && config.vapidPrivada);

export async function notificarPanel(aviso: AvisoPush): Promise<void> {
  if (!activo) return;
  try {
    const suscripciones = await suscripcionesPush();
    await Promise.all(
      suscripciones.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(aviso),
            {
              TTL: 24 * 3600,
              urgency: "high",
              vapidDetails: {
                subject: config.vapidContacto,
                publicKey: config.vapidPublica,
                privateKey: config.vapidPrivada,
              },
            },
          );
        } catch (e) {
          const estado = (e as { statusCode?: number }).statusCode;
          if (estado === 404 || estado === 410) {
            console.log(
              `Suscripción push vencida (${s.dispositivo}): se borra`,
            );
            await borrarSuscripcionPush(s.id);
          } else {
            console.error(`Aviso push falló (${s.dispositivo})`, e);
          }
        }
      }),
    );
  } catch (e) {
    console.error("No se pudieron mandar los avisos push", e);
  }
}

export const avisosPushActivos = activo;
