"use client";

import { useEffect } from "react";
import { registrarServiceWorker } from "@/lib/notificaciones/push";

/** Registra `public/sw.js` al cargar cualquier página: hace la app instalable y recibe avisos. */
export function RegistroServiceWorker() {
  useEffect(() => {
    registrarServiceWorker()?.catch((e) =>
      console.warn("[pwa] No se pudo registrar el service worker:", e),
    );
  }, []);
  return null;
}
