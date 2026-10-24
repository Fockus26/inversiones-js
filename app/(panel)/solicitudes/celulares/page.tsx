import type { Metadata } from "next";
import { SolicitudesCelulares } from "@/components/solicitudes/solicitudes-celulares";

export const metadata: Metadata = { title: "Solicitudes · Celulares" };

export default function SolicitudesCelularesPage() {
  return <SolicitudesCelulares />;
}
