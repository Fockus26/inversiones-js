import type { Metadata } from "next";
import { NoEncontrado } from "@/components/estado/no-encontrado";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function PaginaNoEncontrada() {
  return <NoEncontrado />;
}
