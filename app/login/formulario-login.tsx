"use client";

import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { codigoDeError, mensajeDeErrorAuth } from "@/lib/auth/errores";
import { useSesion } from "@/lib/auth/sesion";
import {
  AVISO_SESION_CERRADA,
  AVISO_SIN_ACCESO,
  rutaSiguienteSegura,
} from "@/lib/auth/siguiente";
import {
  entrar as entrarConCorreo,
  pedirRestablecer,
} from "@/lib/auth/usuario";
import { cn } from "@/lib/utils";

// El anillo de shadcn va al 50 %: el verde azulado así no llega a 3:1 sobre blanco.
const MENSAJE_SIN_ACCESO = "Esta cuenta no tiene acceso al panel.";
// Neutro a propósito: no confirma si el correo tiene cuenta (D012).
const MENSAJE_RESTABLECER =
  "Si ese correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.";

/**
 * Login del panel (D010–D012): correo + contraseña, sin registro. Si la sesión ya es de un
 * admin, vuelve a `?siguiente=` (solo rutas internas) o a /productos.
 */
export function FormularioLogin() {
  const { estado, salir } = useSesion();
  const router = useRouter();
  const parametros = useSearchParams();
  const siguiente = rutaSiguienteSegura(parametros.get("siguiente"));

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [restableciendo, setRestableciendo] = useState(false);
  const [error, setError] = useState<string | null>(
    parametros.get("aviso") === AVISO_SIN_ACCESO ? MENSAJE_SIN_ACCESO : null,
  );
  const [aviso, setAviso] = useState<string | null>(
    parametros.get("aviso") === AVISO_SESION_CERRADA
      ? "Tu sesión se cerró (quizá desde otra pestaña). Lo que no alcanzaste a guardar no se guardó: entra de nuevo y revísalo."
      : null,
  );
  // Bloqueo síncrono contra doble clic (el estado de React llega un render tarde).
  const ocupado = useRef(false);
  const id = useId();

  useEffect(() => {
    if (estado === "admin") {
      router.replace(siguiente);
    } else if (estado === "sin-acceso") {
      setError(MENSAJE_SIN_ACCESO);
      setAviso(null);
      void salir("sin-acceso")
        .catch(() => {})
        .finally(() => {
          ocupado.current = false;
          setEnviando(false);
        });
    }
  }, [estado, siguiente, router, salir]);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado.current) return;
    setAviso(null);
    if (!correo.trim() || !contrasena) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    ocupado.current = true;
    setEnviando(true);
    setError(null);
    try {
      await entrarConCorreo(correo.trim(), contrasena);
      // Sigue "enviando" hasta que la sesión compruebe si es admin (efecto de arriba).
    } catch (e) {
      setError(mensajeDeErrorAuth(e));
      ocupado.current = false;
      setEnviando(false);
    }
  }

  async function restablecer() {
    if (restableciendo) return;
    setAviso(null);
    if (!correo.trim()) {
      setError("Escribe tu correo arriba para enviarte el enlace.");
      return;
    }
    setRestableciendo(true);
    setError(null);
    try {
      await pedirRestablecer(correo.trim());
      setAviso(MENSAJE_RESTABLECER);
    } catch (e) {
      const codigo = codigoDeError(e);
      // "No existe" se responde igual que el éxito para no revelar cuentas.
      if (codigo === "auth/user-not-found") setAviso(MENSAJE_RESTABLECER);
      else if (codigo === "auth/invalid-email") setError(mensajeDeErrorAuth(e));
      else if (
        codigo === "auth/too-many-requests" ||
        codigo === "auth/network-request-failed"
      )
        setError(mensajeDeErrorAuth(e));
      else setError("No pudimos enviar el enlace. Inténtalo de nuevo.");
    } finally {
      setRestableciendo(false);
    }
  }

  const idError = `${id}-error`;

  // Mientras se comprueba la sesión guardada no se sabe si ya entró: mostrar el formulario
  // ahí lo hace parpadear antes de saltar al panel. Si ya es admin, solo se redirige.
  if (!enviando && (estado === "cargando" || estado === "admin"))
    return <ComprobandoSesion />;

  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">Inicia sesión</h1>
        </CardTitle>
        <CardDescription>
          Panel del catálogo. Solo para cuentas autorizadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={entrar}
          className="flex flex-col gap-4"
          aria-describedby={error ? idError : undefined}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-correo`}>Correo</Label>
            <Input
              id={`${id}-correo`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              enterKeyHint="next"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              aria-invalid={error ? true : undefined}
              className={cn("h-11")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-contrasena`}>Contraseña</Label>
            <div className="relative">
              <Input
                id={`${id}-contrasena`}
                name="password"
                type={verContrasena ? "text" : "password"}
                autoComplete="current-password"
                enterKeyHint="go"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                aria-invalid={error ? true : undefined}
                className={cn("h-11 pr-12")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("absolute top-0 right-0 size-11")}
                aria-pressed={verContrasena}
                aria-label="Mostrar contraseña"
                aria-controls={`${id}-contrasena`}
                onClick={() => setVerContrasena((v) => !v)}
              >
                {verContrasena ? (
                  <EyeOffIcon aria-hidden="true" className="size-5" />
                ) : (
                  <EyeIcon aria-hidden="true" className="size-5" />
                )}
              </Button>
            </div>
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
          {/* Región viva siempre montada: así el lector anuncia el aviso al aparecer. */}
          <output className="block rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground empty:hidden">
            {aviso}
          </output>

          <Button
            type="submit"
            className={cn("h-11 text-base")}
            disabled={enviando}
          >
            {enviando && (
              <Loader2Icon aria-hidden="true" className="size-5 animate-spin" />
            )}
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
          <button
            type="button"
            onClick={restablecer}
            disabled={restableciendo}
            className="mx-auto min-h-11 rounded-md px-2 text-sm text-accent-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60"
          >
            {restableciendo ? "Enviando enlace…" : "¿Olvidaste tu contraseña?"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

function ComprobandoSesion() {
  return (
    <div
      aria-busy="true"
      className="flex h-96 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
    >
      <Loader2Icon
        aria-hidden="true"
        className="size-6 text-accent-foreground motion-safe:animate-spin"
      />
      <output>Comprobando tu sesión…</output>
    </div>
  );
}

export function FormularioLoginEsqueleto() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
