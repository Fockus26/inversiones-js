import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioLoginEsqueleto } from "../login/formulario-login";
import { FormularioRestablecer } from "./formulario-restablecer";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

/** Destino del enlace del correo de restablecer (`?token=`, vence en 1 hora). */
export default function RestablecerPage() {
  return (
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
        {/* useSearchParams (token) necesita Suspense para el prerender. */}
        <Suspense fallback={<FormularioLoginEsqueleto />}>
          <FormularioRestablecer />
        </Suspense>
      </div>
    </main>
  );
}
