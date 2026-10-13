# D023 · Chatbot · Seed de producción que no pisa ediciones · Implementado

`bun run seed:produccion --prod` crea solo los productos del catálogo inicial que no existen
(por id estable); `--forzar` los reescribe enteros. `--emulador --proyecto=demo-x` permite
ensayarlo sin tocar los datos de desarrollo. Mismas salvaguardas que D022.
