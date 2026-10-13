"use client";

import { CircleCheckIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DIALOGO_CON_PIE_FIJO,
  FOCO,
  formatearMonto,
} from "@/components/catalogo/formato";
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
import { marcarCuota, resumenPagos } from "@/lib/financiamiento/cuotas";
import { diasEntre, fechaCorta, hoyCaracas } from "@/lib/financiamiento/fechas";
import { guardarCuotas } from "@/lib/financiamiento/repositorio";
import {
  FRECUENCIAS,
  NOMBRES_FRECUENCIA,
  type PlanPagos,
} from "@/lib/financiamiento/tipos";
import type {
  CampoPagos,
  FormularioPagos,
} from "@/lib/financiamiento/validacion";
import { cn } from "@/lib/utils";
import { BadgePagos, Campo, type Coleccion } from "./comun";

interface ClienteConPagos {
  id: string;
  nombre: string;
  pagos: PlanPagos;
}

/**
 * Cuotas de un cliente: cada una se marca o desmarca como pagada y se guarda al instante.
 * `cliente` viene de la lista en vivo, así el diálogo refleja lo que hay en Firestore.
 */
export function DialogoCuotas({
  coleccion,
  cliente,
  detalle,
  alCerrar,
}: {
  coleccion: Coleccion;
  cliente: ClienteConPagos | null;
  /** Equipo o vehículo, debajo del nombre. */
  detalle?: string;
  alCerrar: () => void;
}) {
  return (
    <Dialog
      open={cliente !== null}
      onOpenChange={(abierto) => {
        if (!abierto) alCerrar();
      }}
    >
      <DialogContent showCloseButton={false} className={DIALOGO_CON_PIE_FIJO}>
        {cliente && (
          <ListaCuotas
            coleccion={coleccion}
            cliente={cliente}
            detalle={detalle}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListaCuotas({
  coleccion,
  cliente,
  detalle,
}: {
  coleccion: Coleccion;
  cliente: ClienteConPagos;
  detalle?: string;
}) {
  const [guardando, setGuardando] = useState<number | null>(null);
  const hoy = hoyCaracas();
  const r = resumenPagos(cliente.pagos, hoy);

  async function alternar(numero: number, pagada: boolean) {
    setGuardando(numero);
    try {
      await guardarCuotas(
        coleccion,
        cliente.id,
        marcarCuota(cliente.pagos.cuotas, numero, pagada, hoy),
      );
    } catch (e) {
      toast.error("No se pudo guardar la cuota", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-4">
        <DialogHeader>
          <DialogTitle>Cuotas de {cliente.nombre}</DialogTitle>
          <DialogDescription>
            {detalle ? `${detalle}. ` : ""}
            {NOMBRES_FRECUENCIA[cliente.pagos.frecuencia]}
            {cliente.pagos.inicial > 0
              ? ` · inicial ${formatearMonto(cliente.pagos.inicial)}`
              : ""}
            . Marca cada cuota cuando la pague: se guarda al instante.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <BadgePagos r={r} />
          <span className="tabular-nums text-muted-foreground">
            Cobrado {formatearMonto(r.cobrado)} · Debe {formatearMonto(r.saldo)}
          </span>
        </div>

        <ul className="grid gap-2" aria-label="Cuotas">
          {cliente.pagos.cuotas.map((c) => {
            const vencida = !c.pagada && c.vence < hoy;
            const dias = diasEntre(hoy, c.vence);
            const id = `cuota-${cliente.id}-${c.numero}`;
            return (
              <li
                key={c.numero}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-1",
                  c.pagada && "bg-muted/50",
                  vencida && "border-destructive/60",
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={c.pagada}
                  disabled={guardando !== null}
                  onChange={(e) => alternar(c.numero, e.target.checked)}
                  aria-describedby={`${id}-estado`}
                  className="size-5 shrink-0 accent-[var(--brand-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <label
                  htmlFor={id}
                  className="flex min-h-11 flex-1 cursor-pointer flex-wrap items-center justify-between gap-x-3 py-1 text-sm"
                >
                  <span>
                    <span className="font-medium">Cuota {c.numero}</span>{" "}
                    <span className="tabular-nums">
                      · {formatearMonto(c.monto)}
                    </span>
                  </span>
                  <span
                    id={`${id}-estado`}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs tabular-nums",
                      c.pagada
                        ? "text-success"
                        : vencida
                          ? "text-destructive"
                          : "text-muted-foreground",
                    )}
                  >
                    {guardando === c.numero ? (
                      <LoaderCircleIcon
                        aria-hidden="true"
                        className="size-3.5 motion-safe:animate-spin"
                      />
                    ) : c.pagada ? (
                      <CircleCheckIcon
                        aria-hidden="true"
                        className="size-3.5"
                      />
                    ) : null}
                    {c.pagada
                      ? `Pagada${c.pagadaEl ? ` el ${fechaCorta(c.pagadaEl)}` : ""}`
                      : vencida
                        ? `Vencida el ${fechaCorta(c.vence)} (hace ${-dias} ${-dias === 1 ? "día" : "días"})`
                        : dias === 0
                          ? "Vence hoy"
                          : `Vence el ${fechaCorta(c.vence)}`}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <DialogFooter className="m-0 flex-row justify-end">
        <DialogClose
          render={<Button variant="outline" className={cn("h-11", FOCO)} />}
        >
          Listo
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

/** Inicial, cuota, número de cuotas, frecuencia y fecha de la primera. */
export function CamposPagos({
  prefijo,
  valores,
  alCambiar,
  alSalir,
  errores,
  conPagos,
}: {
  prefijo: string;
  valores: FormularioPagos;
  alCambiar: (cambios: Partial<FormularioPagos>) => void;
  alSalir: (campo: CampoPagos) => void;
  errores: Partial<Record<CampoPagos, string>>;
  /** Ya hay cuotas pagadas: avisar que se conservan al cambiar el plan. */
  conPagos: boolean;
}) {
  const id = (c: CampoPagos) => `${prefijo}-${c}`;
  const texto = (c: Exclude<CampoPagos, "frecuencia">) => ({
    id: id(c),
    name: c,
    value: valores[c],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      alCambiar({ [c]: e.target.value }),
    onBlur: () => alSalir(c),
    error: errores[c],
  });
  return (
    <fieldset className="grid gap-4 rounded-xl border p-3">
      <legend className="px-1 text-sm font-medium">Plan de pagos</legend>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Inicial ($)"
          inputMode="decimal"
          placeholder="0"
          {...texto("inicial")}
        />
        <Campo
          etiqueta="Cada cuota ($)"
          inputMode="decimal"
          placeholder="25"
          {...texto("cuota")}
        />
        <Campo
          etiqueta="Número de cuotas"
          inputMode="numeric"
          placeholder="6"
          {...texto("numeroCuotas")}
        />
        <Campo etiqueta="Primera cuota" type="date" {...texto("primera")} />
      </div>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">
          ¿Cada cuánto paga?
        </legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted p-1">
          {FRECUENCIAS.map((f) => (
            <label
              key={f}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring",
                valores.frecuencia === f
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name={`${prefijo}-frecuencia`}
                value={f}
                checked={valores.frecuencia === f}
                onChange={() => alCambiar({ frecuencia: f })}
                className="sr-only"
              />
              {NOMBRES_FRECUENCIA[f]}
            </label>
          ))}
        </div>
      </fieldset>
      {conPagos && (
        <p className="text-xs text-muted-foreground">
          Si cambias el plan, las cuotas se recalculan y las que ya están
          pagadas se conservan.
        </p>
      )}
    </fieldset>
  );
}
