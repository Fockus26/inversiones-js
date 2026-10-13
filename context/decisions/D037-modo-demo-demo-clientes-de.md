# D037 · Financiamiento · Modo demo `?demo`: clientes de ejemplo en memoria, sin tocar Firestore · Implementado

**Título original:** Modo demo del panel con `?demo` (datos de ejemplo en memoria)

**Contexto:** el cliente quiere ver en producción cómo se ve la sección Clientes con casos
variados (al día, atrasados, pólizas por vencer…) sin cargar datos falsos en su base.

**Decisión:** abrir cualquier página del panel con `?demo` lo activa para esa pestaña
(`sessionStorage`; sobrevive al inicio de sesión). En modo demo, `lib/financiamiento/repositorio.ts`
desvía lecturas y escrituras de `clientesCelulares`/`clientesRcv` a un almacén en memoria
(`lib/financiamiento/demo.ts`) cargado con `datos-demo.ts`, los mismos casos del seed del
emulador. Se puede crear, editar, borrar y marcar cuotas; nada llega a Firestore y al recargar
vuelve al ejemplo. Una franja lo avisa y trae «Salir de la demo» (o `?demo=0`). Sigue exigiendo
sesión de admin; Celulares y Póliza RCV muestran los datos reales.

**Por qué:** cero riesgo de mezclar datos de prueba con los reales y no hace falta otro proyecto
de Firebase para enseñar la función.
