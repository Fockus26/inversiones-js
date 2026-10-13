# D020 · Chatbot · Texto de lista de precios en el formato del cliente · Implementado

**Título original:** Texto de la lista: mismo formato que el cliente manda por chat

`lib/catalogo/texto-lista.ts` (puro, sin Firebase) arma `Lista de precios actualizada (DD/MM)`,
una línea en blanco, y un bloque por marca (alfabético desde D025, en mayúsculas, marcas vacías se
omiten). Por producto dos líneas: `<nombre> <variante>` y `Inic 125$.   6 quincenas 63# D020 — Texto de la lista: mismo formato que el cliente manda por chat

`lib/catalogo/texto-lista.ts` (puro, sin Firebase) arma `Lista de precios actualizada (DD/MM)`,

(tres espacios, "quincenas" en minúscula). Una línea en blanco entre productos y dos entre
marcas, como en el texto original del cliente (29/09). Dentro de la marca, por `orden`. Montos
con hasta 2 decimales. Los nombres salen como están en Firestore (normalizados en el seed).
