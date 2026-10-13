"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ENTRADA } from "@/components/panel/animacion";
import { Cabecera, CabeceraEsqueleto } from "@/components/panel/cabecera";
import { Navegacion } from "@/components/panel/navegacion";
import { Skeleton } from "@/components/ui/skeleton";
import { useSesion } from "@/lib/auth/sesion";
import { AVISO_SIN_ACCESO, urlLoginConSiguiente } from "@/lib/auth/siguiente";

/**
 * Guard de cliente del panel (D011). Mientras no sabemos si es admin, esqueleto; si no hay
 * sesión, al login recordando la ruta; si no es admin, cierra su sesión y al login con aviso.
 */
export function GuardPanel({ children }: { children: React.ReactNode }) {
  const { estado, usuario, motivoSalida, salir } = useSesion();
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    if (estado === "sin-acceso") {
      void salir("sin-acceso");
    } else if (estado === "fuera") {
      if (motivoSalida === "salida") router.replace("/login");
      else if (motivoSalida === "sin-acceso")
        router.replace(`/login?aviso=${AVISO_SIN_ACCESO}`);
      else router.replace(urlLoginConSiguiente(ruta));
    }
  }, [estado, motivoSalida, salir, router, ruta]);

  if (estado !== "admin") return <PanelCargando />;

  return (
    <>
      <Cabecera correo={usuario?.email ?? ""} onSalir={() => salir()} />
      <main
        id="contenido"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6"
      >
        <Navegacion />
        {/* key: cada sección entra con su animación al cambiar de pestaña. */}
        <div key={ruta} className={ENTRADA}>
          {children}
        </div>
      </main>
    </>
  );
}

function PanelCargando() {
  return (
    <>
      <CabeceraEsqueleto />
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6"
        aria-busy="true"
      >
        <output className="sr-only">Cargando el panel…</output>
        <div className="flex flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </main>
    </>
  );
}
