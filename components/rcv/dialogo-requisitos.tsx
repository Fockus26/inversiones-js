"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { DIALOGO_CON_PIE_FIJO } from "@/components/catalogo/formato";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mensajeDeError } from "@/lib/firebase/errores";
import { guardarRequisitos } from "@/lib/rcv/repositorio";
import { validarRequisitos } from "@/lib/rcv/validacion";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  /** Los que usa hoy el chat. */
  requisitos: string[];
}

/**
 * Requisitos de la póliza, uno por línea. Son los mismos para todo vehículo (D034): el chat
 * los muestra al elegir vehículo y al pedir cotización de placas extranjeras.
 */
export function DialogoRequisitos(props: Props) {
  return (
    <Dialog open={props.abierto} onOpenChange={props.alCambiarAbierto}>
      <DialogContent showCloseButton={false} className={DIALOGO_CON_PIE_FIJO}>
        {props.abierto && <Formulario {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ requisitos, alCambiarAbierto }: Props) {
  const id = useId();
  const [texto, setTexto] = useState(() => requisitos.join("\n"));
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const resultado = validarRequisitos(texto);
  const error = intentado && !resultado.ok ? resultado.error : undefined;
  const lineas = resultado.ok ? resultado.valor.length : 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok) return;
    setGuardando(true);
    try {
      await guardarRequisitos(resultado.valor);
      toast.success("Guardaste los requisitos");
      alCambiarAbierto(false);
    } catch (err) {
      toast.error("No se pudieron guardar", {
        description: mensajeDeError(err),
      });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-4">
        <DialogHeader>
          <DialogTitle>Requisitos</DialogTitle>
          <DialogDescription>
            Uno por línea. Son los mismos para cualquier vehículo: el chat los
            muestra junto al precio, y también a quien pide cotización con
            placas extranjeras.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            Requisitos para todos los vehículos
          </label>
          <textarea
            id={id}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={7}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ""}`}
            className={cn(
              "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive md:text-sm dark:bg-input/30",
            )}
          />
          <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
            {lineas === 1 ? "1 requisito" : `${lineas} requisitos`}
          </p>
          {error && (
            <p id={`${id}-error`} className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
      <DialogFooter className="m-0 flex-row justify-end">
        <DialogClose
          render={<Button variant="outline" className={cn("h-11")} />}
        >
          Cancelar
        </DialogClose>
        <Button type="submit" className={cn("h-11")} disabled={guardando}>
          {guardando && (
            <LoaderCircleIcon
              className="motion-safe:animate-spin"
              aria-hidden="true"
            />
          )}
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
