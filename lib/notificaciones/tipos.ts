/**
 * Notificaciones push del panel instalado como app (D035). El panel guarda aquí la suscripción
 * Web Push de cada teléfono; el bot las lee para avisar cuando agenda una cita y borra las que
 * el navegador dio de baja. Sin Firebase: lo importan el panel y `bot/`.
 */

export const COLECCION_SUSCRIPCIONES_PUSH = "suscripcionesPush";

/** `suscripcionesPush/{id}`: id = SHA-256 del endpoint (re-suscribirse no duplica). */
export interface SuscripcionPush {
  endpoint: string;
  /** Claves de cifrado de la suscripción (base64url). */
  p256dh: string;
  auth: string;
  /** Admin que activó los avisos en ese teléfono. */
  uid: string;
  /** Descripción corta del navegador, para reconocerla. */
  dispositivo: string;
}

/** Lo que manda el bot y muestra el service worker (`public/sw.js`). */
export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva el toque: el evento en Google Calendar o una ruta del panel. */
  url: string;
  /** Avisos con la misma etiqueta se reemplazan en vez de apilarse. */
  etiqueta?: string;
}
