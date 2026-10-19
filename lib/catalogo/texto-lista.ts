import { compararMarcas, type Producto } from "./tipos";

/**
 * Texto de la "Lista de precios actualizada" en el mismo formato que el cliente manda por chat
 * (D020). Puro, sin Firebase: el chatbot lo usa con los documentos que lee de `productos`
 * (ver docs/chatbot.md), y los tests lo comparan con la lista del 29/09.
 *
 *   Lista de precios actualizada (29/09)
 *
 *   HONOR
 *   600 Elite 8/256
 *   Inic 125$.   6 quincenas 63$
 *
 *   Magic 8 Lite 8/256
 *   Inic 130$.   6 quincenas 65$
 *   ...
 *
 *
 *   INFINIX
 *   ...
 *
 * Una línea en blanco tras el título y entre productos; dos entre marcas.
 */

/** Lo mínimo que hace falta de cada producto (sirve un doc de Firestore tal cual). */
export type ProductoDeLista = Pick<
  Producto,
  | "marca"
  | "nombre"
  | "variante"
  | "inicial"
  | "cuota"
  | "numeroCuotas"
  | "cantidad"
  | "activo"
  | "orden"
>;

export interface OpcionesTextoLista {
  /**
   * Qué hacer con los productos con `cantidad == 0` (D021):
   * `"ocultar"` (por defecto, D041) los quita; `"marcar"` los deja con el sufijo ` (agotado)`.
   */
  agotados?: "ocultar" | "marcar";
  /**
   * Zona horaria para el DD/MM del título. Por defecto `America/Caracas` (D021): el servidor
   * del chatbot suele correr en UTC y de noche pondría la fecha de mañana.
   */
  zonaHoraria?: string;
}

export const SUFIJO_AGOTADO = " (agotado)";

/** `125` → `125$`, `12.5` → `12.5$` (máximo dos decimales, como escribe el cliente). */
export function formatearMonto(monto: number): string {
  return `${Math.round(monto * 100) / 100}$`;
}

/** DD/MM de `fecha` en la zona horaria dada. */
export function formatearFechaCorta(
  fecha: Date,
  zonaHoraria = "America/Caracas",
): string {
  // Rellenamos a mano: algunos runtimes ignoran "2-digit" en el mes con locale "es".
  const partes = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: zonaHoraria,
  }).formatToParts(fecha);
  const dia = (partes.find((p) => p.type === "day")?.value ?? "").padStart(
    2,
    "0",
  );
  const mes = (partes.find((p) => p.type === "month")?.value ?? "").padStart(
    2,
    "0",
  );
  return `${dia}/${mes}`;
}

/** Las dos líneas de un producto: `<nombre> <variante>` y la de precios. */
export function lineasDeProducto(
  p: ProductoDeLista,
  opciones: Pick<OpcionesTextoLista, "agotados"> = {},
): [string, string] {
  const agotado =
    p.cantidad <= 0 && (opciones.agotados ?? "ocultar") === "marcar";
  const titulo = [p.nombre.trim(), p.variante.trim()].filter(Boolean).join(" ");
  const quincenas = p.numeroCuotas === 1 ? "quincena" : "quincenas";
  return [
    `${titulo}${agotado ? SUFIJO_AGOTADO : ""}`,
    `Inic ${formatearMonto(p.inicial)}.   ${p.numeroCuotas} ${quincenas} ${formatearMonto(p.cuota)}`,
  ];
}

/**
 * Lista completa: título, y un bloque por marca (en orden alfabético, `compararMarcas`; marcas
 * sin productos se omiten) con sus productos ordenados por `orden`. Omite siempre `activo == false` y, salvo `agotados: "marcar"`, los de `cantidad == 0`.
 * Separadores como en la lista del cliente: una línea en blanco entre productos, dos entre marcas.
 */
export function textoListaDePrecios(
  productos: readonly ProductoDeLista[],
  fecha: Date,
  opciones: OpcionesTextoLista = {},
): string {
  const agotados = opciones.agotados ?? "ocultar";
  const visibles = productos.filter(
    (p) => p.activo && (agotados === "marcar" || p.cantidad > 0),
  );

  const bloques: string[] = [];
  const marcas = [...new Set(visibles.map((p) => p.marca))].sort(
    compararMarcas,
  );
  for (const marca of marcas) {
    const deLaMarca = visibles
      .filter((p) => p.marca === marca)
      .sort((a, b) => a.orden - b.orden);
    if (deLaMarca.length === 0) continue;
    const productosDeLaMarca = deLaMarca
      .map((p) => lineasDeProducto(p, { agotados }).join("\n"))
      .join("\n\n");
    bloques.push(`${marca.toUpperCase()}\n${productosDeLaMarca}`);
  }

  const titulo = `Lista de precios actualizada (${formatearFechaCorta(fecha, opciones.zonaHoraria)})`;
  return bloques.length === 0
    ? titulo
    : `${titulo}\n\n${bloques.join("\n\n\n")}`;
}
