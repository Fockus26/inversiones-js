"use client";

import { useEffect } from "react";
import { ErrorServidor } from "@/components/estado/error-servidor";

/** Error de cualquier ruta bajo el layout raíz (HANDOFF §1). El código es `error.digest`. */
export default function ErrorRuta({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <title>Error · Inversiones JS</title>
      <ErrorServidor codigo={error.digest} onReintentar={retry} />
    </>
  );
}
