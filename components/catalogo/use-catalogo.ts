"use client";

import { useEffect, useState } from "react";
import { escucharUsuario } from "@/lib/auth/usuario";
import { escucharMarcas, escucharProductos } from "@/lib/catalogo/repositorio";
import type { Marca, ProductoConId } from "@/lib/catalogo/tipos";
import {
  type ErrorDatos,
  MENSAJE_INESPERADO,
  mensajeDeError,
} from "@/lib/data/errores";

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
    const dejarAuth = escucharUsuario((usuario) => {
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
      const alFallar = (error: ErrorDatos) => {
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
