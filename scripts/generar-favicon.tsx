/**
 * Genera `app/favicon.ico` (16, 32 y 48 px) con el mismo sello que `app/icon.tsx`.
 * El .ico no puede generarse al compilar con las convenciones de Next, así que queda en el repo:
 * si cambia el sello (`lib/marca/sello.tsx`), se vuelve a correr.
 *
 *   bun scripts/generar-favicon.tsx
 */
import { writeFileSync } from "node:fs";
import { imagenDelSello } from "@/lib/marca/sello";

const LADOS = [16, 32, 48];

const pngs = await Promise.all(
  LADOS.map(async (lado) =>
    Buffer.from(await (await imagenDelSello(lado, "pestana")).arrayBuffer()),
  ),
);

// ICO con PNG dentro: cabecera (6 bytes), una entrada de 16 bytes por tamaño y las imágenes.
const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(LADOS.length, 4);

let desplazamiento = 6 + 16 * LADOS.length;
const entradas = LADOS.map((lado, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(lado, 0);
  e.writeUInt8(lado, 1);
  e.writeUInt8(0, 2); // sin paleta
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); // planos
  e.writeUInt16LE(32, 6); // bits por píxel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(desplazamiento, 12);
  desplazamiento += pngs[i].length;
  return e;
});

writeFileSync(
  "app/favicon.ico",
  Buffer.concat([cabecera, ...entradas, ...pngs]),
);
console.log(`app/favicon.ico: ${LADOS.join(", ")} px`);
