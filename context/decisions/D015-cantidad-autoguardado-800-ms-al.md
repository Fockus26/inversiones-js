# D015 · Catálogo · Cantidad: autoguardado (800 ms / al salir / Enter) · Implementado

**Título original:** Cantidad: guardado automático con espera de 800 ms, al salir del campo o con Enter

La cantidad es lo que más cambia y se edita desde el teléfono: stepper −/+ e input en la misma
fila, sin botón "Guardar". Se guarda 800 ms después del último toque, al salir del campo o con
Enter; el estado se ve con texto + ícono ("Sin guardar…", "Guardando…", "Guardado", "No se
guardó"). Si Firestore rechaza, vuelve al valor anterior y avisa con un toast.
Alternativa descartada: botón "Guardar" por fila (un toque más por cambio, fácil de olvidar).
