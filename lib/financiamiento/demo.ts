"use client";

import { clientesCelularesDePrueba, clientesRcvDePrueba } from "./datos-demo";
import { hoyCaracas } from "./fechas";
import {
  type CamposClienteCelular,
  type CamposClienteRcv,
  type ClienteCelularConId,
  type ClienteRcvConId,
  COLECCION_CLIENTES_CELULARES,
  type COLECCION_CLIENTES_RCV,
  type Cuota,
} from "./tipos";

/**
 * Modo demo (D037): abrir cualquier página del panel con `?demo` muestra en /clientes los
 * clientes de ejemplo (`datos-demo.ts`) en vez de los reales. Todo vive en memoria de esta
 * pestaña: se puede crear, editar y marcar cuotas para ver cómo se comporta, pero nada llega a
 * Firestore y al recargar vuelve al estado de ejemplo. `?demo=0` (o «Salir de la demo») lo apaga.
 */

const CLAVE = "inversiones-js:demo";

/** Lee `?demo` / `?demo=0` de la URL (y lo recuerda en la pestaña) o lo recordado. */
export function modoDemo(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("demo");
  try {
    if (param !== null) {
      const activo = param !== "0" && param !== "false";
      if (activo) sessionStorage.setItem(CLAVE, "1");
      else sessionStorage.removeItem(CLAVE);
      return activo;
    }
    return sessionStorage.getItem(CLAVE) === "1";
  } catch {
    // Sin sessionStorage (modo privado estricto): vale solo el parámetro de esta URL.
    return param !== null && param !== "0" && param !== "false";
  }
}

export function salirDeDemo(): void {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {}
  window.location.assign(window.location.pathname);
}

type Coleccion =
  | typeof COLECCION_CLIENTES_CELULARES
  | typeof COLECCION_CLIENTES_RCV;

type Cliente = ClienteCelularConId | ClienteRcvConId;

const listas = new Map<Coleccion, Cliente[]>();
const oyentes = new Map<Coleccion, Set<(c: Cliente[]) => void>>();

function lista(coleccion: Coleccion): Cliente[] {
  let l = listas.get(coleccion);
  if (!l) {
    const hoy = hoyCaracas();
    const ahora = new Date();
    const datos: Cliente[] =
      coleccion === COLECCION_CLIENTES_CELULARES
        ? clientesCelularesDePrueba(hoy)
        : clientesRcvDePrueba(hoy);
    l = datos.map((c) => ({ ...c, actualizadoEn: ahora }));
    listas.set(coleccion, l);
  }
  return l;
}

function publicar(coleccion: Coleccion, nueva: Cliente[]): void {
  const ordenada = [...nueva].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
  listas.set(coleccion, ordenada);
  for (const f of oyentes.get(coleccion) ?? []) f(ordenada);
}

/** Como `onSnapshot`: avisa ya con la lista actual y luego con cada cambio. */
export function escucharDemo<T>(
  coleccion: Coleccion,
  alCambiar: (c: T[]) => void,
): () => void {
  const f = alCambiar as (c: Cliente[]) => void;
  const set = oyentes.get(coleccion) ?? new Set();
  set.add(f);
  oyentes.set(coleccion, set);
  queueMicrotask(() => f(lista(coleccion)));
  return () => set.delete(f);
}

// Pequeña espera para que se vea el «Guardando…» como con la base real.
const pausa = () => new Promise((r) => setTimeout(r, 250));

export async function crearDemo(
  coleccion: Coleccion,
  campos: CamposClienteCelular | CamposClienteRcv,
): Promise<void> {
  await pausa();
  const id = `demo-${Date.now().toString(36)}`;
  publicar(coleccion, [
    ...lista(coleccion),
    { ...campos, id, actualizadoEn: new Date() } as Cliente,
  ]);
}

export async function actualizarDemo(
  coleccion: Coleccion,
  id: string,
  cambios: Partial<CamposClienteCelular | CamposClienteRcv>,
): Promise<void> {
  await pausa();
  publicar(
    coleccion,
    lista(coleccion).map((c) =>
      c.id === id
        ? ({ ...c, ...cambios, actualizadoEn: new Date() } as Cliente)
        : c,
    ),
  );
}

export async function borrarDemo(
  coleccion: Coleccion,
  id: string,
): Promise<void> {
  await pausa();
  publicar(
    coleccion,
    lista(coleccion).filter((c) => c.id !== id),
  );
}

export async function guardarCuotasDemo(
  coleccion: Coleccion,
  id: string,
  cuotas: Cuota[],
): Promise<void> {
  publicar(
    coleccion,
    lista(coleccion).map((c) =>
      c.id === id && c.pagos
        ? ({ ...c, pagos: { ...c.pagos, cuotas } } as Cliente)
        : c,
    ),
  );
}
