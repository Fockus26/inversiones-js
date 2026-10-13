"use client";

import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import { COLECCION_SUSCRIPCIONES_PUSH } from "./tipos";

/**
 * Avisos push en este teléfono o computadora (D035): registra `public/sw.js`, pide permiso,
 * se suscribe con la clave VAPID pública y guarda la suscripción en Firestore para que el bot
 * la use. En iPhone solo funciona con el panel instalado en la pantalla de inicio (iOS 16.4+).
 */

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type EstadoPush =
  | "no-soportado"
  | "ios-sin-instalar"
  | "sin-clave"
  | "bloqueado"
  | "inactivo"
  | "activo";

function esIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function instalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function registrarServiceWorker(): Promise<ServiceWorkerRegistration> | null {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export async function estadoPush(): Promise<EstadoPush> {
  const soporta =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  if (!soporta)
    return esIos() && !instalada() ? "ios-sin-instalar" : "no-soportado";
  if (!CLAVE_PUBLICA) return "sin-clave";
  if (Notification.permission === "denied") return "bloqueado";
  const registro = await navigator.serviceWorker.getRegistration("/");
  const sub = await registro?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "activo" : "inactivo";
}

function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

async function idDe(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(endpoint),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function dispositivo(): string {
  const ua = navigator.userAgent;
  const sistema = /android/i.test(ua)
    ? "Android"
    : esIos()
      ? "iPhone/iPad"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os/i.test(ua)
          ? "Mac"
          : "Otro";
  const navegador = /edg\//i.test(ua)
    ? "Edge"
    : /firefox/i.test(ua)
      ? "Firefox"
      : /chrome|crios/i.test(ua)
        ? "Chrome"
        : /safari/i.test(ua)
          ? "Safari"
          : "Navegador";
  return `${navegador} en ${sistema}`;
}

/** Pide permiso y guarda la suscripción. Devuelve el estado final. */
export async function activarPush(): Promise<EstadoPush> {
  const uid = firebaseAuth().currentUser?.uid;
  if (!uid)
    throw new Error("Sin sesión: inicia sesión para activar los avisos.");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted")
    return permiso === "denied" ? "bloqueado" : "inactivo";
  await registrarServiceWorker();
  const registro = await navigator.serviceWorker.ready;
  const sub =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(CLAVE_PUBLICA),
    }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error("El navegador no devolvió una suscripción completa.");
  await setDoc(
    doc(firestore(), COLECCION_SUSCRIPCIONES_PUSH, await idDe(json.endpoint)),
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      uid,
      dispositivo: dispositivo(),
      creadaEn: serverTimestamp(),
    },
  );
  return "activo";
}

export async function desactivarPush(): Promise<void> {
  const registro = await navigator.serviceWorker.getRegistration("/");
  const sub = await registro?.pushManager.getSubscription();
  if (!sub) return;
  await deleteDoc(
    doc(firestore(), COLECCION_SUSCRIPCIONES_PUSH, await idDe(sub.endpoint)),
  ).catch((e) => console.error("[push] No se pudo borrar la suscripción:", e));
  await sub.unsubscribe();
}
