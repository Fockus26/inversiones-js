# D019 · Catálogo · Foco a opacidad completa en el catálogo (local) · Implementado

**Título original:** Foco a opacidad completa en la pantalla del catálogo (arreglo local)

El `ring-ring/50` de shadcn deja el foco por debajo de 3:1. En `components/catalogo/**` cada
control lleva `FOCO` (`focus-visible:ring-ring`, también con `aria-invalid`), medido ≥ 5.2:1 en
claro y ≥ 6:1 en oscuro. El badge "Agotado" y los botones de borrar usan `dark:bg-destructive/10`
(con /20 el texto medía 4.37:1). Se retira cuando el arreglo global llegue a `components/ui/`.
