import { GuardPanel } from "@/lib/auth/guard-panel";
import { SesionProvider } from "@/lib/auth/sesion";

// Todo lo que cuelga de (panel) exige sesión de admin (D011). El guard es de cliente: la
// seguridad la pone `comoAdmin` en cada server action (D003); el guard solo evita mostrar el panel.
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
