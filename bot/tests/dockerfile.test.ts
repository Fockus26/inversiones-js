import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * La imagen solo lleva las carpetas de lib/ que copia el Dockerfile. Si bot/src importa
 * otra, el contenedor se cae al arrancar ("Cannot find module") y queda reiniciándose.
 */
describe("Dockerfile", () => {
  test("copia cada carpeta de lib/ que importa el bot", () => {
    const src = join(import.meta.dir, "..", "src");
    const usadas = new Set<string>();
    for (const archivo of readdirSync(src)) {
      const codigo = readFileSync(join(src, archivo), "utf8");
      for (const m of codigo.matchAll(/["']\.\.\/\.\.\/lib\/([^/"']+)/g)) {
        usadas.add(m[1]);
      }
    }
    const dockerfile = readFileSync(
      join(import.meta.dir, "..", "Dockerfile"),
      "utf8",
    );
    const faltan = [...usadas].filter(
      (d) => !dockerfile.includes(`COPY lib/${d} ./lib/${d}`),
    );
    expect(faltan).toEqual([]);
  });
});
