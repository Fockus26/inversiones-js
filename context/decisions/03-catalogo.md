# D015 — Cantidad: guardado automático con espera de 800 ms, al salir del campo o con Enter

La cantidad es lo que más cambia y se edita desde el teléfono: stepper −/+ e input en la misma
fila, sin botón "Guardar". Se guarda 800 ms después del último toque, al salir del campo o con
Enter; el estado se ve con texto + ícono ("Sin guardar…", "Guardando…", "Guardado", "No se
guardó"). Si Firestore rechaza, vuelve al valor anterior y avisa con un toast.
Alternativa descartada: botón "Guardar" por fila (un toque más por cambio, fácil de olvidar).

# D016 — Lista: tarjetas en móvil, tabla desde `md`

Mobile-first: tarjetas apiladas por debajo de 768 px; tabla (Producto, Inicial, Cuota,
Cantidad, Estado, acciones) desde `md`. Se renderizan las dos y se oculta una con CSS (sin
`matchMedia`, sin parpadeo ni desajuste de hidratación); la oculta queda fuera del árbol
accesible. Alternativa: solo tarjetas en todos los tamaños (desperdicia el ancho en escritorio).

# D017 — Orden en cliente y `orden` de los productos nuevos

`escucharProductos` escucha la colección entera y ordena en cliente por marca (alfabético,
D025) y luego `orden`: dos `orderBy` pedirían un índice compuesto en producción. Un producto
creado desde el panel recibe `orden = máximo actual + 1` (queda al final de su marca). Con
decenas de productos el costo es despreciable.

# D018 — Montos: coma o punto al escribir, coma al mostrar

Entrada: "125", "125,50", "125.5", "125$" o "$125"; hasta 2 decimales; sin separador de miles
("1.250,00" se rechaza en vez de adivinar). Se muestran como el cliente: `125$`, y con decimales
solo si los hay, con coma: `125,50$`. Límites idénticos a `firestore.rules` (montos 0–100000,
cuotas enteras 1–48, cantidad entera 0–100000, nombre 1–80, variante ≤ 20; "N/N" solo sugerido).

# D019 — Foco a opacidad completa en la pantalla del catálogo (arreglo local)

El `ring-ring/50` de shadcn deja el foco por debajo de 3:1. En `components/catalogo/**` cada
control lleva `FOCO` (`focus-visible:ring-ring`, también con `aria-invalid`), medido ≥ 5.2:1 en
claro y ≥ 6:1 en oscuro. El badge "Agotado" y los botones de borrar usan `dark:bg-destructive/10`
(con /20 el texto medía 4.37:1). Se retira cuando el arreglo global llegue a `components/ui/`.
