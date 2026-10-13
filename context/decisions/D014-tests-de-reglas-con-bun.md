# D014 · Auth · Tests de reglas con bun y proyecto `demo-reglas-w1` · Implementado

**Título original:** Tests de reglas con `bun test` y proyecto propio `demo-reglas-w1`

`tests/rules/reglas.test.ts` usa `@firebase/rules-unit-testing` contra el emulador que ya corre
en :8080, con `projectId` propio para no pisar las reglas ni los datos de `demo-inversiones-js`.
Corre bien bajo `bun test` (no hizo falta node). `clearFirestore()` solo limpia ese proyecto.
