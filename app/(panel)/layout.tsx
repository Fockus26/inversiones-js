// Placeholder de la ola 0. W1 (feat/auth-login) lo reemplaza por el guard de sesión + admin
// y la cabecera con "Cerrar sesión". W2 no toca este archivo.
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      {children}
    </main>
  );
}
