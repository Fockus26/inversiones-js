import type { ProductoDeLista } from "../../lib/catalogo/texto-lista";

/** Minúsculas, sin acentos, partido en palabras (se conserva la "/" de "8/256"). */
export function palabras(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9/]+/)
    .filter(Boolean);
}

/**
 * Productos cuyo nombre completo aparece en la consulta; gana el de más palabras, para que
 * "note 15" no traiga también el "Redmi 15" (docs/chatbot.md). La marca es opcional en la
 * consulta. Si la consulta trae una variante que existe ("8/256"), filtra por ella.
 */
export function buscar<T extends ProductoDeLista>(
  productos: readonly T[],
  consulta: string,
): T[] {
  const q = new Set(palabras(consulta));
  const conPuntaje = productos.map((p) => {
    const nombre = palabras(p.nombre);
    const conMarca = palabras(p.marca).every((w) => q.has(w)) ? 1 : 0;
    const puntaje =
      nombre.length > 0 && nombre.every((w) => q.has(w))
        ? nombre.length + conMarca
        : 0;
    return { p, puntaje };
  });
  const max = Math.max(0, ...conPuntaje.map((c) => c.puntaje));
  if (max === 0) return [];
  const mejores = conPuntaje.filter((c) => c.puntaje === max).map((c) => c.p);
  const conVariante = mejores.filter((p) =>
    palabras(p.variante).every((w) => q.has(w)),
  );
  return conVariante.length > 0 && conVariante.length < mejores.length
    ? conVariante
    : mejores;
}
