import type { Metadata } from "next";
import { SolicitudesRcv } from "@/components/solicitudes/solicitudes-rcv";

export const metadata: Metadata = { title: "Solicitudes · Póliza RCV" };

export default function SolicitudesRcvPage() {
  return <SolicitudesRcv />;
}
