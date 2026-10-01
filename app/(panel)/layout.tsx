import { GuardPanel } from "@/lib/auth/guard-panel";
import { SesionProvider } from "@/lib/auth/sesion";

// Todo lo que cuelga de (panel) exige sesión de admin (D011). El guard es de cliente: la
// seguridad la ponen las reglas de Firestore (D003), no hay middleware ni cookies (D004).
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SesionProvider>
      <GuardPanel>{children}</GuardPanel>
    </SesionProvider>
  );
}
