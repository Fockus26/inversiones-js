import type { Metadata } from "next";
import { ClientesRcv } from "@/components/clientes/clientes-rcv";

export const metadata: Metadata = { title: "Clientes · Póliza RCV" };

export default function ClientesRcvPage() {
  return <ClientesRcv />;
}
