import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { ProductoConId } from "../../lib/catalogo/tipos";

/**
 * Lectura del catálogo con el Admin SDK y caché de 60 s (D024, docs/chatbot.md).
 * Credenciales: GOOGLE_APPLICATION_CREDENTIALS = clave JSON de la cuenta de solo lectura.
 * Para el emulador: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 y FIREBASE_PROJECT_ID=demo-inversiones-js.
 */

const projectId = process.env.FIREBASE_PROJECT_ID;
initializeApp(projectId ? { projectId } : undefined);
const db = getFirestore();

const CACHE_MS = 60_000;
let cache: { cuando: number; productos: ProductoConId[] } | null = null;

async function leerCatalogo(): Promise<ProductoConId[]> {
  const snap = await db
    .collection("productos")
    .where("activo", "==", true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProductoConId);
}

/** Catálogo activo; si Firestore falla, devuelve la última copia o null si no hay ninguna. */
export async function catalogo(): Promise<ProductoConId[] | null> {
  if (cache && Date.now() - cache.cuando < CACHE_MS) return cache.productos;
  try {
    cache = { cuando: Date.now(), productos: await leerCatalogo() };
    return cache.productos;
  } catch (error) {
    console.error("[catalogo] no se pudo leer Firestore", error);
    return cache?.productos ?? null;
  }
}
