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
      // Por fuente: si la primera carga falló y una consulta siguiente sale bien, la pantalla
      // se recupera sola (la PWA instalada no tiene botón de recargar).
      const fallos = new Set<string>();
      const publicar = () => {
        if (fallos.size === 0 && productos && marcas)
          setEstado({ tipo: "listo", productos, marcas });
      };
      const alFallar = (fuente: string) => (error: ErrorDatos) => {
        fallos.add(fuente);
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
          fallos.delete("productos");
          publicar();
        }, alFallar("productos")),
        escucharMarcas((m) => {
          marcas = m;
          fallos.delete("marcas");
          publicar();
        }, alFallar("marcas")),
      ];
    });
    return () => {
      dejarAuth();
      parar();
    };
  }, []);

  return estado;
}
