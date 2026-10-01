import type { Metadata } from "next";
import { CatalogoProductos } from "@/components/catalogo/catalogo-productos";

export const metadata: Metadata = { title: "Productos" };

export default function ProductosPage() {
  return <CatalogoProductos />;
}
