"use client";

import { ErrorServidor } from "@/components/estado/error-servidor";
import { NoEncontrado } from "@/components/estado/no-encontrado";

const CODIGO_DE_EJEMPLO = "3141592653";

export function GaleriaEstados({ pantalla }: { pantalla: string }) {
  if (pantalla === "404") return <NoEncontrado />;
  return (
    <ErrorServidor
      codigo={pantalla === "error-sin-codigo" ? undefined : CODIGO_DE_EJEMPLO}
      onReintentar={() => window.location.reload()}
    />
  );
}
