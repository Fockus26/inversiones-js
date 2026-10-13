# D016 · Catálogo · Lista: tarjetas en móvil, tabla desde `md` · Implementado

Mobile-first: tarjetas apiladas por debajo de 768 px; tabla (Producto, Inicial, Cuota,
Cantidad, Estado, acciones) desde `md`. Se renderizan las dos y se oculta una con CSS (sin
`matchMedia`, sin parpadeo ni desajuste de hidratación); la oculta queda fuera del árbol
accesible. Alternativa: solo tarjetas en todos los tamaños (desperdicia el ancho en escritorio).
