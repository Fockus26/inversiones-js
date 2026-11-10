"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  escucharAcceso,
  salir as salirDeSesion,
  type Usuario,
} from "./usuario";

/**
 * Sesión del panel (D010) sobre Better Auth (`./usuario.ts`): sesión + fila en `admins`. Si le
 * quitan el acceso con el panel abierto, pasa a "sin-acceso" en el siguiente refresco (≤ 1 min).
 * Es comodidad de UI: la barrera real es `comoAdmin` en cada server action (D003). Se monta en
 * `app/(panel)/layout.tsx` y en `/login`.
 */

export type EstadoSesion = "cargando" | "fuera" | "sin-acceso" | "admin";

/**
 * Por qué se está `fuera`: "salida" = cerró sesión a propósito; "sin-acceso" = lo sacamos
 * porque no es admin (o no pudimos comprobarlo); null = nunca entró o caducó la sesión.
 */
export type MotivoSalida = "salida" | "sin-acceso" | null;

export interface Sesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  motivoSalida: MotivoSalida;
  salir: (motivo?: Exclude<MotivoSalida, null>) => Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

type Interno = Pick<Sesion, "estado" | "usuario" | "motivoSalida">;

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [interno, setInterno] = useState<Interno>({
    estado: "cargando",
    usuario: null,
    motivoSalida: null,
  });
  const motivoPendiente = useRef<MotivoSalida>(null);

  useEffect(
    () =>
      escucharAcceso(({ usuario, esAdmin, sinServidor }) => {
        if (!usuario) {
          setInterno({
            estado: "fuera",
            usuario: null,
            motivoSalida: motivoPendiente.current,
          });
          motivoPendiente.current = null;
          return;
        }
        // Sin poder comprobarlo, lo conservador es no dejar pasar (D010).
        if (sinServidor && !esAdmin)
          console.error(
            "[sesion] No se pudo comprobar el acceso de",
            usuario.uid,
          );
        setInterno({
          estado: esAdmin ? "admin" : "sin-acceso",
          usuario,
          motivoSalida: null,
        });
      }),
    [],
  );

  const salir = useCallback<Sesion["salir"]>(async (motivo = "salida") => {
    motivoPendiente.current = motivo;
    await salirDeSesion();
  }, []);

  const valor = useMemo<Sesion>(
    () => ({ ...interno, salir }),
    [interno, salir],
  );

  return (
    <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
  );
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) {
    throw new Error("useSesion() necesita un <SesionProvider> por encima.");
  }
  return sesion;
}
