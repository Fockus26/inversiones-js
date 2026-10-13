import type { Metadata } from "next";
import { ClientesCelulares } from "@/components/clientes/clientes-celulares";

export const metadata: Metadata = { title: "Clientes · Celulares" };

export default function ClientesCelularesPage() {
  return <ClientesCelulares />;
}
