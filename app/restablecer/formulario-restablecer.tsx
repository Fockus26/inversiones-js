"use client";

import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { restablecer } from "@/lib/auth/usuario";
import { cn } from "@/lib/utils";

const MINIMO = 8;
const CLASE_ENLACE =
  "mx-auto flex min-h-11 items-center rounded-md px-2 text-sm text-accent-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring";

/** Elegir la contraseña nueva con el token del correo (Better Auth; antes, la página de Firebase). */
export function FormularioRestablecer() {
  const token = useSearchParams().get("token") ?? "";
  const id = useId();
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(
    token
      ? null
      : "Este enlace no es válido. Pide uno nuevo desde el inicio de sesión.",
  );
  const [listo, setListo] = useState(false);
  const ocupado = useRef(false);
  const tituloListo = useRef<HTMLHeadingElement>(null);
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;

  // El formulario desaparece al guardar: el foco pasa al título del aviso (si no, queda en <body>).
  useEffect(() => {
    if (listo) tituloListo.current?.focus();
  }, [listo]);

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado.current || !token) return;
    if (nueva.length < MINIMO) {
      setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`);
      return;
    }
    if (nueva !== repetir) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    ocupado.current = true;
    setEnviando(true);
    setError(null);
    const r = await restablecer(token, nueva);
    ocupado.current = false;
    setEnviando(false);
    if (r === "ok") setListo(true);
    else if (r === "token-invalido")
      setError(
        "El enlace venció o ya se usó. Pide uno nuevo desde el inicio de sesión.",
      );
    else setError("No hay conexión. Revisa tu internet e inténtalo de nuevo.");
  }

  if (listo)
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1
              ref={tituloListo}
              tabIndex={-1}
              className="text-xl font-semibold outline-none"
            >
              Contraseña cambiada
            </h1>
          </CardTitle>
          <CardDescription>
            <output>Ya puedes entrar al panel con tu contraseña nueva.</output>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <Link href="/login" className={CLASE_ENLACE}>
            Ir a iniciar sesión
          </Link>
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">Elige una contraseña nueva</h1>
        </CardTitle>
        <CardDescription id={idAyuda}>
          Al menos {MINIMO} caracteres. Al guardarla se cierran las sesiones
          abiertas en otros equipos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={guardar}
          className="flex flex-col gap-4"
          aria-describedby={error ? idError : undefined}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-nueva`}>Contraseña nueva</Label>
            <div className="relative">
              <Input
                id={`${id}-nueva`}
                name="new-password"
                type={ver ? "text" : "password"}
                autoComplete="new-password"
                enterKeyHint="next"
                required
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={idAyuda}
                className={cn("h-11 pr-12")}
                disabled={!token}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("absolute top-0 right-0 size-11")}
                aria-pressed={ver}
                aria-label="Mostrar contraseñas"
                aria-controls={`${id}-nueva ${id}-repetir`}
                onClick={() => setVer((v) => !v)}
                disabled={!token}
              >
                {ver ? (
                  <EyeOffIcon aria-hidden="true" className="size-5" />
                ) : (
                  <EyeIcon aria-hidden="true" className="size-5" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-repetir`}>Repite la contraseña</Label>
            <Input
              id={`${id}-repetir`}
              name="confirm-password"
              type={ver ? "text" : "password"}
              autoComplete="new-password"
              enterKeyHint="go"
              required
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              aria-invalid={error ? true : undefined}
              className={cn("h-11")}
              disabled={!token}
            />
          </div>

          {error && (
            <p
              id={idError}
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className={cn("h-11 text-base")}
            disabled={enviando || !token}
          >
            {enviando && (
              <Loader2Icon aria-hidden="true" className="size-5 animate-spin" />
            )}
            {enviando ? "Guardando…" : "Guardar contraseña"}
          </Button>
          <Link href="/login" className={CLASE_ENLACE}>
            Volver a iniciar sesión
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
