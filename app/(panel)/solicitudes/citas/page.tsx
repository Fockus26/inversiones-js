import type { Metadata } from "next";
import { SolicitudesCitas } from "@/components/solicitudes/solicitudes-citas";

export const metadata: Metadata = { title: "Solicitudes · Citas" };

export default function SolicitudesCitasPage() {
  return <SolicitudesCitas />;
}
