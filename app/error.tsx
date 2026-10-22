"use client";

import { useEffect } from "react";
import { ErrorServidor } from "@/components/estado/error-servidor";

/**
 * Error de cualquier ruta bajo el layout raíz (HANDOFF §1). El código es `error.digest`.
 * "Reintentar" recarga la página: los datos del panel vienen de escuchas de Firestore en el
 * cliente y `retry()` solo vuelve a pintar el segmento con el mismo estado (seguía en error).
 */
export default function ErrorRuta({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <title>Error · Inversiones JS</title>
      <ErrorServidor
        codigo={error.digest}
        onReintentar={() => window.location.reload()}
      />
    </>
  );
}
