/**
 * Nombre que busca el `qa-local.ts` del kit. El seed real es `seed-emulador.ts`.
 * qa-local pasa el proyecto demo en GCLOUD_PROJECT, y el seed lo lee de
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID, que Bun carga de `.env.local` con el proyecto real.
 */
if (process.env.GCLOUD_PROJECT?.startsWith("demo-")) {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT;
}
await import("./seed-emulador");

export {};
