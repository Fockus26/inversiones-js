"use client";

import { onAuthStateChanged } from "firebase/auth";
import { SearchXIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BOTON_ESTADO_PRINCIPAL,
  BOTON_ESTADO_SECUNDARIO,
  PantallaEstado,
} from "@/components/estado/pantalla-estado";
import { firebaseAuth } from "@/lib/firebase/client";

const CAUSA =
  "Puede que el enlace esté mal escrito o que la página ya no exista.";

/**
 * 404 con la variante según haya sesión de Firebase Auth (HANDOFF §1). Mientras se comprueba
 * se muestra la de invitado ("Entrar" con sesión abierta lleva igual al panel). Solo mira si
 * hay usuario, no si es admin: aquí basta para elegir el botón.
 */
export function NoEncontrado() {
  const [conSesion, setConSesion] = useState(false);

  useEffect(
    () => onAuthStateChanged(firebaseAuth(), (u) => setConSesion(!!u)),
    [],
  );

  return (
    <PantallaEstado
      icono={SearchXIcon}
      etiqueta="Error 404"
      titulo="No encontramos esta página"
      linea={
        conSesion
          ? `${CAUSA} Tu catálogo no se ha tocado.`
          : `${CAUSA} Entra para ver y editar tu catálogo.`
      }
      acciones={
        conSesion ? (
          <Link href="/productos" className={BOTON_ESTADO_PRINCIPAL}>
            Ir al catálogo
          </Link>
        ) : (
          <>
            <Link href="/login" className={BOTON_ESTADO_PRINCIPAL}>
              Entrar
            </Link>
            <Link href="/" className={BOTON_ESTADO_SECUNDARIO}>
              Ir al inicio
            </Link>
          </>
        )
      }
    />
  );
}
