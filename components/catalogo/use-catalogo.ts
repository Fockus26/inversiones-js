"use client";

import { onAuthStateChanged } from "firebase/auth";
import type { FirestoreError } from "firebase/firestore";
import { useEffect, useState } from "react";
import { escucharMarcas, escucharProductos } from "@/lib/catalogo/repositorio";
import type { Marca, ProductoConId } from "@/lib/catalogo/tipos";
import { firebaseAuth } from "@/lib/firebase/client";

export type EstadoCatalogo =
  | { tipo: "cargando" }
  | { tipo: "sin-sesion" }
  | { tipo: "sin-acceso" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; productos: ProductoConId[]; marcas: Marca[] };

/**
 * Espera a que Auth resuelva la sesión y entonces escucha `productos` y `marcas` en vivo
 * (queda "listo" cuando llegaron las dos). No depende del
 * guard del layout: si no hay sesión o no es admin, lo dice en vez de quedarse cargando.
 */
export function useCatalogo(): EstadoCatalogo {
  const [estado, setEstado] = useState<EstadoCatalogo>({ tipo: "cargando" });

  useEffect(() => {
    let dejarDeEscuchar: (() => void)[] = [];
    const parar = () => {
      for (const f of dejarDeEscuchar) f();
      dejarDeEscuchar = [];
    };
    const dejarAuth = onAuthStateChanged(firebaseAuth(), (usuario) => {
      parar();
      if (!usuario) {
        setEstado({ tipo: "sin-sesion" });
        return;
      }
      setEstado({ tipo: "cargando" });
      let productos: ProductoConId[] | null = null;
      let marcas: Marca[] | null = null;
      let fallo = false;
      const publicar = () => {
        if (!fallo && productos && marcas)
          setEstado({ tipo: "listo", productos, marcas });
      };
      const alFallar = (error: FirestoreError) => {
        fallo = true;
        setEstado(
          error.code === "permission-denied"
            ? { tipo: "sin-acceso" }
            : { tipo: "error", mensaje: error.message },
        );
      };
      dejarDeEscuchar = [
        escucharProductos((p) => {
          productos = p;
          publicar();
        }, alFallar),
        escucharMarcas((m) => {
          marcas = m;
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
