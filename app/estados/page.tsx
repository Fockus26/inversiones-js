import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GaleriaEstados } from "./galeria";

export const metadata: Metadata = { title: "Estados" };

/**
 * Galería de pantallas de estado (HANDOFF §1) para revisarlas a mano o con design-qa:
 * `/estados?screen=error`, `error-sin-codigo` o `404`. Solo en desarrollo; en producción es 404.
 */
export default async function PaginaEstados({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen } = await searchParams;
  return <GaleriaEstados pantalla={screen ?? "error"} />;
}
