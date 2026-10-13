# D018 · Catálogo · Montos: coma o punto al escribir, `125,50$` al mostrar · Implementado

**Título original:** Montos: coma o punto al escribir, coma al mostrar

Entrada: "125", "125,50", "125.5", "125$" o "$125"; hasta 2 decimales; sin separador de miles
("1.250,00" se rechaza en vez de adivinar). Se muestran como el cliente: `125$`, y con decimales
solo si los hay, con coma: `125,50$`. Límites idénticos a `firestore.rules` (montos 0–100000,
cuotas enteras 1–48, cantidad entera 0–100000, nombre 1–80, variante ≤ 20; "N/N" solo sugerido).
