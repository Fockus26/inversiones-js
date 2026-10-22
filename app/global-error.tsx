"use client";

import { useEffect } from "react";
import { ErrorServidor } from "@/components/estado/error-servidor";
import "./globals.css";

/**
 * Fallo en el propio layout raíz: reemplaza el documento entero, así que trae sus estilos y
 * sigue el tema del sistema (no hay next-themes aquí). Fuente del sistema: Geist vive en el layout.
 * "Reintentar" recarga entera, como en `app/error.tsx`.
 */
export default function ErrorGlobal({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Los tokens oscuros cuelgan de `.dark`: se pone según el sistema.
  useEffect(() => {
    const oscuro = window.matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () =>
      document.documentElement.classList.toggle("dark", oscuro.matches);
    aplicar();
    oscuro.addEventListener("change", aplicar);
    return () => oscuro.removeEventListener("change", aplicar);
  }, []);

  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-[system-ui,sans-serif]">
        <title>Error · Inversiones JS</title>
        <ErrorServidor
          codigo={error.digest}
          onReintentar={() => window.location.reload()}
        />
      </body>
    </html>
  );
}
