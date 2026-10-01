"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { COLECCION_ADMINS } from "@/lib/catalogo/tipos";
import { firebaseAuth, firestore } from "@/lib/firebase/client";

/**
 * Sesión del panel (D010). Escucha Firebase Auth y, si hay usuario, comprueba que exista
 * `admins/{uid}` (las reglas solo le dejan leer el suyo). Es comodidad de UI: la barrera real
 * son las reglas de Firestore (D003). Se monta en `app/(panel)/layout.tsx` y en `/login`.
 */

export type EstadoSesion = "cargando" | "fuera" | "sin-acceso" | "admin";

/**
 * Por qué se está `fuera`: "salida" = cerró sesión a propósito; "sin-acceso" = lo sacamos
 * porque no es admin (o no pudimos comprobarlo); null = nunca entró o caducó la sesión.
 */
export type MotivoSalida = "salida" | "sin-acceso" | null;

export interface Sesion {
  estado: EstadoSesion;
  usuario: User | null;
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

  useEffect(() => {
    // Cada cambio de usuario invalida la comprobación anterior (evita carreras si se sale
    // mientras getDoc sigue en vuelo).
    let turno = 0;
    const cancelar = onAuthStateChanged(firebaseAuth(), async (usuario) => {
      const miTurno = ++turno;
      if (!usuario) {
        setInterno({
          estado: "fuera",
          usuario: null,
          motivoSalida: motivoPendiente.current,
        });
        motivoPendiente.current = null;
        return;
      }
      setInterno({ estado: "cargando", usuario, motivoSalida: null });
      let esAdmin = false;
      try {
        const ficha = await getDoc(
          doc(firestore(), COLECCION_ADMINS, usuario.uid),
        );
        esAdmin = ficha.exists();
      } catch (error) {
        // Sin poder comprobarlo, lo conservador es no dejar pasar (D010). Se registra el
        // motivo porque, si no, se confunde con "no es admin".
        console.error(
          `[sesion] No se pudo comprobar admins/${usuario.uid}:`,
          error,
        );
        esAdmin = false;
      }
      if (miTurno !== turno) return;
      setInterno({
        estado: esAdmin ? "admin" : "sin-acceso",
        usuario,
        motivoSalida: null,
      });
    });
    return () => {
      turno++;
      cancelar();
    };
  }, []);

  const salir = useCallback<Sesion["salir"]>(async (motivo = "salida") => {
    motivoPendiente.current = motivo;
    await signOut(firebaseAuth());
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
