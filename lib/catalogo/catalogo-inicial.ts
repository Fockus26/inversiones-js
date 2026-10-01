import type { Producto } from "./tipos";

/**
 * Lista de precios del 29/09/2026 tal como la entregó el cliente. Fuente del seed (scripts/seed.ts).
 * `cantidad` no venía en la lista: arranca en 0 y el cliente la llena desde el panel (acción manual).
 *
 * Valores a confirmar con el cliente (se copiaron literal, ver CONTENT_CHECKLIST):
 *  - TECNO Spark GO 3 4/64: cuota 24$, igual que la 4/128 aunque la inicial es menor (¿21$?).
 *  - SAMSUNG A57 12/512: cuota 100$ con inicial 255$ (el resto ronda inicial ÷ 2).
 */
type Semilla = Pick<
  Producto,
  "marca" | "nombre" | "variante" | "inicial" | "cuota"
>;

const LISTA: Semilla[] = [
  {
    marca: "HONOR",
    nombre: "600 Elite",
    variante: "8/256",
    inicial: 125,
    cuota: 63,
  },
  {
    marca: "HONOR",
    nombre: "Magic 8 Lite",
    variante: "8/256",
    inicial: 130,
    cuota: 65,
  },
  {
    marca: "HONOR",
    nombre: "Play 10",
    variante: "3/64",
    inicial: 33,
    cuota: 16,
  },
  { marca: "HONOR", nombre: "T10", variante: "4/128", inicial: 42, cuota: 20 },
  { marca: "HONOR", nombre: "X5D", variante: "4/256", inicial: 60, cuota: 30 },
  { marca: "HONOR", nombre: "X6E", variante: "4/256", inicial: 73, cuota: 36 },
  { marca: "HONOR", nombre: "X7D", variante: "8/256", inicial: 92, cuota: 46 },

  {
    marca: "INFINIX",
    nombre: "Smart 20",
    variante: "4/128",
    inicial: 52,
    cuota: 26,
  },
  {
    marca: "INFINIX",
    nombre: "Smart 20",
    variante: "4/64",
    inicial: 47,
    cuota: 24,
  },

  { marca: "REDMI", nombre: "15", variante: "6/128", inicial: 62, cuota: 31 },
  { marca: "REDMI", nombre: "15", variante: "8/256", inicial: 72, cuota: 36 },
  {
    marca: "REDMI",
    nombre: "A7 Pro",
    variante: "4/64",
    inicial: 39,
    cuota: 20,
  },
  {
    marca: "REDMI",
    nombre: "Note 15",
    variante: "8/256",
    inicial: 80,
    cuota: 40,
  },
  {
    marca: "REDMI",
    nombre: "Note 17",
    variante: "6/256",
    inicial: 82,
    cuota: 41,
  },

  { marca: "SAMSUNG", nombre: "A06", variante: "4/64", inicial: 40, cuota: 20 },
  { marca: "SAMSUNG", nombre: "A07", variante: "4/64", inicial: 42, cuota: 21 },
  {
    marca: "SAMSUNG",
    nombre: "A07",
    variante: "4/128",
    inicial: 44,
    cuota: 22,
  },
  {
    marca: "SAMSUNG",
    nombre: "A16",
    variante: "4/128",
    inicial: 53,
    cuota: 27,
  },
  {
    marca: "SAMSUNG",
    nombre: "A17",
    variante: "4/128",
    inicial: 52,
    cuota: 26,
  },
  {
    marca: "SAMSUNG",
    nombre: "A57",
    variante: "12/512",
    inicial: 255,
    cuota: 100,
  },

  {
    marca: "TECNO",
    nombre: "Camon 50 Ultra 5G",
    variante: "8/256",
    inicial: 136,
    cuota: 68,
  },
  {
    marca: "TECNO",
    nombre: "Spark GO 3",
    variante: "4/128",
    inicial: 48,
    cuota: 24,
  },
  {
    marca: "TECNO",
    nombre: "Spark GO 3",
    variante: "4/64",
    inicial: 42,
    cuota: 24,
  },
];

/** Id estable por producto: permite re-correr el seed sin duplicar (upsert). */
export function idDeSemilla(
  s: Pick<Producto, "marca" | "nombre" | "variante">,
): string {
  return `${s.marca}-${s.nombre}-${s.variante}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const CATALOGO_INICIAL: Array<Producto & { id: string }> = LISTA.map(
  (s, i) => ({
    ...s,
    id: idDeSemilla(s),
    numeroCuotas: 6,
    cantidad: 0,
    activo: true,
    orden: i,
  }),
);
