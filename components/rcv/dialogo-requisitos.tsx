"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { DIALOGO_CON_PIE_FIJO, FOCO } from "@/components/catalogo/formato";
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
import { guardarRequisitos } from "@/lib/rcv/repositorio";
import {
  CATEGORIAS_RCV,
  type CategoriaRcv,
  NOMBRES_CATEGORIA,
  type RequisitosRcv,
} from "@/lib/rcv/tipos";
import { validarRequisitos } from "@/lib/rcv/validacion";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  /** Los que usa hoy el chat. */
  requisitos: RequisitosRcv;
}

/** Requisitos por tipo de transporte: uno por línea. El chat los muestra al elegir vehículo. */
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
  const prefijo = useId();
  const [textos, setTextos] = useState<Record<CategoriaRcv, string>>(() => ({
    publico: requisitos.publico.join("\n"),
    privado: requisitos.privado.join("\n"),
    extranjeras: requisitos.extranjeras.join("\n"),
  }));
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const resultado = validarRequisitos(textos);
  const errores = intentado && !resultado.ok ? resultado.errores : {};

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
        description: err instanceof Error ? err.message : undefined,
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
            Uno por línea. El chat los muestra junto al precio cuando el cliente
            elige su vehículo.
          </DialogDescription>
        </DialogHeader>
        {CATEGORIAS_RCV.map((c) => {
          const id = `${prefijo}-${c}`;
          const error = errores[c];
          return (
            <div key={c} className="grid gap-1.5">
              <label htmlFor={id} className="text-sm font-medium">
                {NOMBRES_CATEGORIA[c]}
              </label>
              <textarea
                id={id}
                value={textos[c]}
                onChange={(e) =>
                  setTextos((t) => ({ ...t, [c]: e.target.value }))
                }
                rows={4}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className={cn(
                  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive md:text-sm dark:bg-input/30",
                  FOCO,
                )}
              />
              {error && (
                <p id={`${id}-error`} className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <DialogFooter className="m-0 flex-row justify-end">
        <DialogClose
          render={<Button variant="outline" className={cn("h-11", FOCO)} />}
        >
          Cancelar
        </DialogClose>
        <Button type="submit" className={cn("h-11", FOCO)} disabled={guardando}>
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
