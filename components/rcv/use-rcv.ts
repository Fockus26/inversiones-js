"use client";

import { useEffect, useState } from "react";
import { escucharUsuario } from "@/lib/auth/usuario";
import { type ErrorDatos, textoErrorCarga } from "@/lib/data/errores";
import { escucharConfigRcv, escucharPlanesRcv } from "@/lib/rcv/repositorio";
import type { ConfigRcv, PlanRcvConId } from "@/lib/rcv/tipos";

export type EstadoRcv =
  | { tipo: "cargando" }
  | { tipo: "sin-acceso" }
  | { tipo: "error"; mensaje: string }
  | {
      tipo: "listo";
      planes: PlanRcvConId[];
      config: ConfigRcv | null;
    };

/** Como `useCatalogo`: espera la sesión y escucha planes y configuración en vivo. */
export function useRcv(): EstadoRcv {
  const [estado, setEstado] = useState<EstadoRcv>({ tipo: "cargando" });

  useEffect(() => {
    let dejar: (() => void)[] = [];
    const parar = () => {
      for (const f of dejar) f();
      dejar = [];
    };
    const dejarAuth = escucharUsuario((usuario) => {
      parar();
      if (!usuario) {
        setEstado({ tipo: "sin-acceso" });
        return;
      }
      setEstado({ tipo: "cargando" });
      let planes: PlanRcvConId[] | null = null;
      let config: ConfigRcv | null | undefined;
      // Por fuente: si la primera carga falló y una consulta siguiente sale bien, la pantalla
      // se recupera sola (la PWA instalada no tiene botón de recargar).
      const fallos = new Set<string>();
      const publicar = () => {
        if (fallos.size === 0 && planes && config !== undefined)
          setEstado({ tipo: "listo", planes, config });
      };
      const alFallar = (fuente: string) => (error: ErrorDatos) => {
        fallos.add(fuente);
        setEstado(
          error.code === "permission-denied"
            ? { tipo: "sin-acceso" }
            : {
                tipo: "error",
                mensaje: textoErrorCarga(error),
              },
        );
      };
      dejar = [
        escucharPlanesRcv((p) => {
          planes = p;
          fallos.delete("planes");
          publicar();
        }, alFallar("planes")),
        escucharConfigRcv((c) => {
          config = c;
          fallos.delete("config");
          publicar();
        }, alFallar("config")),
      ];
    });
    return () => {
      dejarAuth();
      parar();
    };
  }, []);

  return estado;
}
