"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { escucharProductos } from "@/lib/catalogo/repositorio";
import type { ProductoConId } from "@/lib/catalogo/tipos";
import { firebaseAuth } from "@/lib/firebase/client";

export type EstadoCatalogo =
  | { tipo: "cargando" }
  | { tipo: "sin-sesion" }
  | { tipo: "sin-acceso" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; productos: ProductoConId[] };

/**
 * Espera a que Auth resuelva la sesión y entonces escucha `productos` en vivo. No depende del
 * guard del layout: si no hay sesión o no es admin, lo dice en vez de quedarse cargando.
 */
export function useCatalogo(): EstadoCatalogo {
  const [estado, setEstado] = useState<EstadoCatalogo>({ tipo: "cargando" });

  useEffect(() => {
    let dejarDeEscuchar: (() => void) | undefined;
    const dejarAuth = onAuthStateChanged(firebaseAuth(), (usuario) => {
      dejarDeEscuchar?.();
      dejarDeEscuchar = undefined;
      if (!usuario) {
        setEstado({ tipo: "sin-sesion" });
        return;
      }
      setEstado({ tipo: "cargando" });
      dejarDeEscuchar = escucharProductos(
        (productos) => setEstado({ tipo: "listo", productos }),
        (error) =>
          setEstado(
            error.code === "permission-denied"
              ? { tipo: "sin-acceso" }
              : { tipo: "error", mensaje: error.message },
          ),
      );
    });
    return () => {
      dejarAuth();
      dejarDeEscuchar?.();
    };
  }, []);

  return estado;
}
