"use client";

import { onAuthStateChanged } from "firebase/auth";
import type { FirestoreError } from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  escucharConfigRcv,
  escucharPlanesRcv,
  escucharSolicitudesRcv,
} from "@/lib/rcv/repositorio";
import type {
  ConfigRcv,
  PlanRcvConId,
  SolicitudRcvConId,
} from "@/lib/rcv/tipos";

export type EstadoRcv =
  | { tipo: "cargando" }
  | { tipo: "sin-acceso" }
  | { tipo: "error"; mensaje: string }
  | {
      tipo: "listo";
      planes: PlanRcvConId[];
      config: ConfigRcv | null;
      solicitudes: SolicitudRcvConId[];
    };

/** Como `useCatalogo`: espera la sesión y escucha planes, configuración y solicitudes en vivo. */
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
      let solicitudes: SolicitudRcvConId[] | null = null;
      let fallo = false;
      const publicar = () => {
        if (!fallo && planes && config !== undefined && solicitudes)
          setEstado({ tipo: "listo", planes, config, solicitudes });
      };
      const alFallar = (error: FirestoreError) => {
        fallo = true;
        setEstado(
          error.code === "permission-denied"
            ? { tipo: "sin-acceso" }
            : { tipo: "error", mensaje: error.message },
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
        escucharSolicitudesRcv((s) => {
          solicitudes = s;
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
