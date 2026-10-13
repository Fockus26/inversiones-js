"use client";

import { useCallback, useEffect, useState } from "react";
import type { TasasMercado } from "@/lib/rcv/mercado";

export type EstadoTasaMercado =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "lista"; usd: number; cop: number; fecha: Date | null };

/** Tasa de mercado del euro ($ y COP) desde `/api/tasa-mercado` (D036), con `reintentar`. */
export function useTasaMercado(): EstadoTasaMercado & {
  reintentar: () => void;
} {
  const [estado, setEstado] = useState<EstadoTasaMercado>({
    tipo: "cargando",
  });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    // `intento` solo sirve para volver a consultar.
    void intento;
    let vigente = true;
    setEstado({ tipo: "cargando" });
    fetch("/api/tasa-mercado")
      .then(async (res) => {
        const t = res.ok ? ((await res.json()) as Partial<TasasMercado>) : null;
        if (!vigente) return;
        if (
          !t ||
          typeof t.usd !== "number" ||
          !(t.usd > 0) ||
          typeof t.cop !== "number" ||
          !(t.cop > 0)
        ) {
          setEstado({ tipo: "error" });
          return;
        }
        const fecha = t.fecha ? new Date(t.fecha) : null;
        setEstado({
          tipo: "lista",
          usd: t.usd,
          cop: t.cop,
          fecha: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
        });
      })
      .catch(() => {
        if (vigente) setEstado({ tipo: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, reintentar };
}
