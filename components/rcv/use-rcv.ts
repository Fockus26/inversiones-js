"use client";

import { onAuthStateChanged } from "firebase/auth";
import type { FirestoreError } from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import { MENSAJE_INESPERADO, mensajeDeError } from "@/lib/firebase/errores";
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
    const dejarAuth = onAuthStateChanged(firebaseAuth(), (usuario) => {
      parar();
      if (!usuario) {
        setEstado({ tipo: "sin-acceso" });
        return;
      }
      setEstado({ tipo: "cargando" });
      let planes: PlanRcvConId[] | null = null;
      let config: ConfigRcv | null | undefined;
      let fallo = false;
      const publicar = () => {
        if (!fallo && planes && config !== undefined)
          setEstado({ tipo: "listo", planes, config });
      };
      const alFallar = (error: FirestoreError) => {
        fallo = true;
        setEstado(
          error.code === "permission-denied"
            ? { tipo: "sin-acceso" }
            : {
                tipo: "error",
                mensaje: mensajeDeError(error) ?? MENSAJE_INESPERADO,
              },
        );
      };
      dejar = [
        escucharPlanesRcv((p) => {
          planes = p;
          publicar();
        }, alFallar),
        escucharConfigRcv((c) => {
          config = c;
          publicar();
        }, alFallar),
      ];
    });
    return () => {
      dejarAuth();
      parar();
    };
  }, []);

  return estado;
}
