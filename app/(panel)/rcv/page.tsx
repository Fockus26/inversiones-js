import type { Metadata } from "next";
import { PanelRcv } from "@/components/rcv/panel-rcv";

export const metadata: Metadata = { title: "Póliza RCV" };

export default function RcvPage() {
  return <PanelRcv />;
}
