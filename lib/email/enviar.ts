import nodemailer, { type Transporter } from "nodemailer";
import { PLANTILLA_RESTABLECER } from "./plantilla-restablecer";

/**
 * Único punto que habla con el SMTP (D040: Brevo). En QA, `SMTP_HOST=localhost` y
 * `SMTP_PORT=1025` con Mailpit. Sin `SMTP_HOST` no envía: lo deja en el log (dev sin correo).
 */
let transporte: Transporter | null = null;

function smtp(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  transporte ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporte;
}

const escapar = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );

/** Rellena la plantilla del correo de restablecer contraseña. */
export function correoRestablecer(correo: string, enlace: string) {
  const html = PLANTILLA_RESTABLECER.replaceAll("%APP_NAME%", "Inversiones JS")
    .replaceAll("%EMAIL%", escapar(correo))
    .replaceAll("%LINK%", escapar(enlace));
  const texto = [
    "Restablece tu contraseña del panel de Inversiones JS.",
    "",
    `Abre este enlace para elegir una nueva (vence en 1 hora y funciona una sola vez): ${enlace}`,
    "",
    "Si no pediste este cambio, ignora este correo: tu contraseña seguirá igual.",
  ].join("\n");
  return { asunto: "Restablece tu contraseña · Inversiones JS", html, texto };
}

export async function enviarCorreo(
  para: string,
  asunto: string,
  html: string,
  texto: string,
): Promise<void> {
  const t = smtp();
  if (!t) {
    console.warn(`[correo] sin SMTP_HOST: no se envió "${asunto}"`);
    return;
  }
  await t.sendMail({
    from: { name: "Inversiones JS", address: process.env.EMAIL_FROM ?? "" },
    to: para,
    subject: asunto,
    html,
    text: texto,
  });
}
