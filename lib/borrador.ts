import { ErrorDatos } from "@/lib/data/errores";

/**
 * Borradores de los diálogos de edición (QA de versión 2026-11-22): si la sesión vence o se
 * revoca con un diálogo abierto, al pulsar Guardar la pantalla pasa a "Tu sesión terminó" y
 * el diálogo se desmonta. Antes de que eso pase se guarda lo escrito en `sessionStorage` (solo
 * esta pestaña, se borra al cerrarla) y, tras volver a entrar, el mismo diálogo lo ofrece.
 *
 * Solo datos del formulario: nunca contraseñas ni nada de auth. `sessionStorage` puede fallar
 * (modo privado, cuota llena, bloqueado), así que todo va en try/catch y sin él no pasa nada.
 */

const PREFIJO = "ijs:borrador:";
/** Un borrador más viejo que esto ya no se ofrece. */
export const VIGENCIA_MS = 12 * 60 * 60 * 1000;

export type TipoBorrador =
  | "producto"
  | "cliente-celular"
  | "cliente-rcv"
  | "plan-rcv";

/** Clave del borrador de un registro, o del alta ("nuevo") si aún no existe. */
export function claveBorrador(tipo: TipoBorrador, id: string | null): string {
  return `${PREFIJO}${tipo}:${id ?? "nuevo"}`;
}

export interface Borrador<T> {
  valor: T;
  guardadoEn: number;
}

type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem"> & {
  readonly length: number;
  key(i: number): string | null;
};

function almacenDeSesion(): Almacen | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** La escritura falló porque la sesión terminó: es el único caso en que se guarda borrador. */
export function esSesionTerminada(error: unknown): boolean {
  return error instanceof ErrorDatos && error.code === "unauthenticated";
}

export function guardarBorrador<T>(
  clave: string,
  valor: T,
  almacen: Almacen | null = almacenDeSesion(),
  ahora = Date.now(),
): boolean {
  if (!almacen) return false;
  try {
    const b: Borrador<T> = { valor, guardadoEn: ahora };
    almacen.setItem(clave, JSON.stringify(b));
    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve el borrador si existe, no venció y tiene la misma forma que `molde` (el formulario
 * con el que abre el diálogo): uno de otra versión del panel o manipulado se descarta.
 */
export function leerBorrador<T>(
  clave: string,
  molde: T,
  almacen: Almacen | null = almacenDeSesion(),
  ahora = Date.now(),
): Borrador<T> | null {
  if (!almacen) return null;
  try {
    const crudo = almacen.getItem(clave);
    if (crudo === null) return null;
    const b = JSON.parse(crudo) as Partial<Borrador<unknown>> | null;
    if (
      !b ||
      typeof b.guardadoEn !== "number" ||
      ahora - b.guardadoEn > VIGENCIA_MS ||
      b.guardadoEn > ahora + 60_000 ||
      !mismaForma(molde, b.valor)
    ) {
      almacen.removeItem(clave);
      return null;
    }
    return { valor: b.valor as T, guardadoEn: b.guardadoEn };
  } catch {
    return null;
  }
}

export function borrarBorrador(
  clave: string,
  almacen: Almacen | null = almacenDeSesion(),
): void {
  try {
    almacen?.removeItem(clave);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/** Al cerrar sesión a propósito (o si entra alguien sin acceso) no se deja nada a la vista. */
export function borrarTodosLosBorradores(
  almacen: Almacen | null = almacenDeSesion(),
): void {
  if (!almacen) return;
  try {
    const claves: string[] = [];
    for (let i = 0; i < almacen.length; i++) {
      const k = almacen.key(i);
      if (k?.startsWith(PREFIJO)) claves.push(k);
    }
    for (const k of claves) almacen.removeItem(k);
  } catch {
    // Igual que arriba.
  }
}

/**
 * Misma forma que el molde: mismas claves y mismo tipo en cada una. Las listas solo se exigen
 * como listas de valores del mismo tipo que los del molde (o de texto si el molde va vacío).
 */
export function mismaForma(molde: unknown, valor: unknown): boolean {
  if (Array.isArray(molde)) {
    if (!Array.isArray(valor)) return false;
    const tipo = molde.length > 0 ? typeof molde[0] : "string";
    return valor.every((v) => typeof v === tipo);
  }
  if (molde !== null && typeof molde === "object") {
    if (valor === null || typeof valor !== "object" || Array.isArray(valor))
      return false;
    const a = Object.keys(molde);
    const b = Object.keys(valor);
    return (
      a.length === b.length &&
      a.every(
        (k) =>
          Object.hasOwn(valor, k) &&
          mismaForma(
            (molde as Record<string, unknown>)[k],
            (valor as Record<string, unknown>)[k],
          ),
      )
    );
  }
  return typeof molde === typeof valor && (molde === null) === (valor === null);
}
