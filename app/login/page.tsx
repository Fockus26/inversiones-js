import type { Metadata } from "next";
import { Suspense } from "react";
import { SesionProvider } from "@/lib/auth/sesion";
import { FormularioLogin, FormularioLoginEsqueleto } from "./formulario-login";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    // Teléfono: arriba, para que «Entrar» quede por encima del teclado; desde sm, centrado.
    <main className="flex flex-1 items-start justify-center bg-background px-4 py-8 sm:items-center sm:py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <span className="flex items-center gap-2 rounded-xl bg-sidebar px-4 py-2.5 text-lg font-semibold tracking-tight text-sidebar-foreground">
            <span
              aria-hidden="true"
              className="h-6 w-1.5 rounded-full bg-sidebar-primary"
            />
            <span>
              Inversiones{" "}
              <span className="rounded-md bg-sidebar-primary px-1.5 py-0.5 text-sidebar-primary-foreground">
                JS
              </span>
            </span>
          </span>
        </div>
        {/* useSearchParams (siguiente/aviso) necesita Suspense para el prerender. */}
        <SesionProvider>
          <Suspense fallback={<FormularioLoginEsqueleto />}>
            <FormularioLogin />
          </Suspense>
        </SesionProvider>
      </div>
    </main>
  );
}
