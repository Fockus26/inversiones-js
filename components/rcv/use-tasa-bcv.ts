"use client";

import { useCallback, useEffect, useState } from "react";
import type { TasaBcv } from "@/lib/rcv/bcv";

export type EstadoTasaBcv =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "lista"; tasa: number; fecha: Date | null };

/** Tasa BCV del euro desde `/api/tasa-bcv` (D031), con `reintentar` si falló. */
export function useTasaBcv(): EstadoTasaBcv & { reintentar: () => void } {
  const [estado, setEstado] = useState<EstadoTasaBcv>({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    // `intento` solo sirve para volver a consultar.
    void intento;
    let vigente = true;
    setEstado({ tipo: "cargando" });
    fetch("/api/tasa-bcv")
      .then(async (res) => {
        const tasa = res.ok ? ((await res.json()) as Partial<TasaBcv>) : null;
        if (!vigente) return;
        if (!tasa || typeof tasa.tasa !== "number" || !(tasa.tasa > 0)) {
          setEstado({ tipo: "error" });
          return;
        }
        const fecha = tasa.fecha ? new Date(tasa.fecha) : null;
        setEstado({
          tipo: "lista",
          tasa: tasa.tasa,
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
