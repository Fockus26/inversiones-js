"use client";

import { LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DIALOGO_CON_PIE_FIJO,
  haceCuanto,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsearEntero } from "@/lib/catalogo/validacion";
import { cotizar, textoPrecio } from "@/lib/rcv/cotizacion";
import { actualizarPlanRcv, crearPlanRcv } from "@/lib/rcv/repositorio";
import {
  CATEGORIAS_PLAN,
  type CategoriaRcv,
  NOMBRES_CATEGORIA,
  type PlanRcvConId,
  type TasasRcv,
} from "@/lib/rcv/tipos";
import {
  type CampoPlanRcv,
  type FormularioPlanRcv,
  LIMITES_RCV,
  validarPlanRcv,
} from "@/lib/rcv/validacion";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  /** null = "Nuevo transporte". */
  plan: PlanRcvConId | null;
  /** Posición para uno nuevo (último + 1). */
  ordenNuevo: number;
  tasas: TasasRcv | null;
  alPedirBorrar: (plan: PlanRcvConId) => void;
}

/** Mismo diálogo para crear y editar; se monta de cero en cada apertura. */
export function DialogoPlan(props: Props) {
  return (
    <Dialog open={props.abierto} onOpenChange={props.alCambiarAbierto}>
      <DialogContent showCloseButton={false} className={DIALOGO_CON_PIE_FIJO}>
        {props.abierto && <Formulario {...props} />}
      </DialogContent>
    </Dialog>
  );
}

type Campo = CampoPlanRcv | "orden";

function aFormulario(p: PlanRcvConId | null): FormularioPlanRcv {
  if (!p)
    return {
      clase: "",
      descripcion: "",
      precioEur: "",
      categorias: [],
      financiamiento: false,
      activo: true,
    };
  return {
    clase: p.clase,
    descripcion: p.descripcion,
    precioEur:
      p.precioEur === null
        ? ""
        : Number.isInteger(p.precioEur)
          ? String(p.precioEur)
          : p.precioEur.toFixed(2).replace(".", ","),
    categorias: [...p.categorias],
    financiamiento: p.financiamiento,
    activo: p.activo,
  };
}

const ORDEN_CAMPOS: Campo[] = [
  "clase",
  "descripcion",
  "precioEur",
  "categorias",
  "orden",
];

function Formulario({
  plan,
  ordenNuevo,
  tasas,
  alCambiarAbierto,
  alPedirBorrar,
}: Props) {
  const prefijo = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(() => aFormulario(plan));
  const [orden, setOrden] = useState(String(plan?.orden ?? ordenNuevo));
  const [tocados, setTocados] = useState<Set<Campo>>(new Set());
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const resultado = validarPlanRcv(form);
  const ordenValor = parsearEntero(orden);
  const errores: Partial<Record<Campo, string>> = {
    ...(resultado.ok ? {} : resultado.errores),
    ...(ordenValor === null || ordenValor < 1
      ? { orden: "Usa un número entero desde 1." }
      : {}),
  };
  const errorVisible = (c: Campo) =>
    intentado || tocados.has(c) ? errores[c] : undefined;
  const idDe = (c: Campo) => `${prefijo}-${c}`;
  const tocar = (c: Campo) => () =>
    setTocados((t) => (t.has(c) ? t : new Set(t).add(c)));

  const precioVista =
    resultado.ok && resultado.valor.precioEur !== null
      ? textoPrecio(cotizar(resultado.valor.precioEur, tasas))
      : null;
  const esPublico = form.categorias.includes("publico");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok || ordenValor === null || ordenValor < 1) {
      const primero = ORDEN_CAMPOS.find((c) => errores[c]);
      if (primero)
        formRef.current
          ?.querySelector<HTMLElement>(`#${CSS.escape(idDe(primero))}`)
          ?.focus();
      return;
    }
    setGuardando(true);
    try {
      if (plan)
        await actualizarPlanRcv(plan.id, {
          ...resultado.valor,
          orden: ordenValor,
        });
      else await crearPlanRcv(resultado.valor, ordenValor);
      toast.success(
        `${plan ? "Guardaste" : "Creaste"} ${resultado.valor.clase}`,
      );
      alCambiarAbierto(false);
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: err instanceof Error ? err.message : undefined,
      });
      setGuardando(false);
    }
  }

  const campo = (
    c: "clase" | "descripcion" | "precioEur",
    etiqueta: string,
    extra: React.ComponentProps<"input">,
    ayuda?: string,
  ) => {
    const error = errorVisible(c);
    const describe = [error && `${idDe(c)}-error`, ayuda && `${idDe(c)}-ayuda`]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={idDe(c)}>{etiqueta}</Label>
        <Input
          id={idDe(c)}
          name={c}
          value={form[c]}
          onChange={(e) => setForm((f) => ({ ...f, [c]: e.target.value }))}
          onBlur={tocar(c)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe || undefined}
          className={cn("h-11")}
          autoComplete="off"
          {...extra}
        />
        {ayuda && (
          <p id={`${idDe(c)}-ayuda`} className="text-xs text-muted-foreground">
            {ayuda}
          </p>
        )}
        {error && (
          <p id={`${idDe(c)}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  function alternarCategoria(c: CategoriaRcv, marcado: boolean) {
    setForm((f) => ({
      ...f,
      categorias: marcado
        ? [...f.categorias, c]
        : f.categorias.filter((x) => x !== c),
    }));
    tocar("categorias")();
  }

  const errorCategorias = errorVisible("categorias");
  const errorOrden = errorVisible("orden");

  return (
    <form
      ref={formRef}
      onSubmit={enviar}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-4">
        <DialogHeader>
          <DialogTitle>
            {plan ? `Editar ${plan.clase}` : "Nuevo transporte"}
          </DialogTitle>
          <DialogDescription>
            {plan?.actualizadoEn
              ? `Actualizado ${haceCuanto(plan.actualizadoEn)}. `
              : ""}
            El precio se fija en euros; dólares, bolívares y pesos salen de las
            tasas del día.
          </DialogDescription>
        </DialogHeader>

        {campo("clase", "Clase de vehículo", {
          maxLength: LIMITES_RCV.claseMax,
          placeholder: "MOTO",
        })}
        {campo("descripcion", "Descripción del plan", {
          maxLength: LIMITES_RCV.descripcionMax,
          placeholder: "MOTOCICLETAS",
        })}
        {campo(
          "precioEur",
          "Precio (€)",
          { inputMode: "decimal", placeholder: "15" },
          precioVista
            ? `Hoy: ${precioVista}`
            : "Déjalo vacío si no tiene precio fijo: el chat dirá «Solicitar cotización».",
        )}

        <fieldset
          className="grid gap-1.5"
          aria-describedby={
            errorCategorias ? `${idDe("categorias")}-error` : undefined
          }
        >
          <legend className="mb-1.5 text-sm font-medium">
            ¿En qué opciones del chat aparece?
          </legend>
          {CATEGORIAS_PLAN.map((c, i) => (
            <label
              key={c}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm"
            >
              <input
                id={i === 0 ? idDe("categorias") : undefined}
                type="checkbox"
                checked={form.categorias.includes(c)}
                onChange={(e) => alternarCategoria(c, e.target.checked)}
                aria-invalid={errorCategorias ? true : undefined}
                className="size-5 accent-[var(--brand-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              {NOMBRES_CATEGORIA[c]}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            Placas extranjeras no lleva transportes: el chat pide el vehículo y
            se cotiza aparte.
          </p>
          {errorCategorias && (
            <p
              id={`${idDe("categorias")}-error`}
              className="text-xs text-destructive"
            >
              {errorCategorias}
            </p>
          )}
        </fieldset>

        <Casilla
          id={`${prefijo}-financiamiento`}
          etiqueta="Ofrece financiamiento"
          ayuda={
            esPublico
              ? "En transporte público, el chat pregunta si lo quiere antes de pedir los datos."
              : "Solo aplica al transporte público: marca esa opción para usarlo."
          }
          marcado={form.financiamiento && esPublico}
          deshabilitado={!esPublico}
          alCambiar={(v) => setForm((f) => ({ ...f, financiamiento: v }))}
        />

        <div className="grid gap-1.5">
          <Label htmlFor={idDe("orden")}>Posición en la lista</Label>
          <Input
            id={idDe("orden")}
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            onBlur={tocar("orden")}
            inputMode="numeric"
            aria-invalid={errorOrden ? true : undefined}
            aria-describedby={errorOrden ? `${idDe("orden")}-error` : undefined}
            className={cn("h-11 w-28")}
            autoComplete="off"
          />
          {errorOrden && (
            <p
              id={`${idDe("orden")}-error`}
              className="text-xs text-destructive"
            >
              {errorOrden}
            </p>
          )}
        </div>

        <Casilla
          id={`${prefijo}-activo`}
          etiqueta="Activo"
          ayuda="Si lo desmarcas, el chat deja de ofrecerlo, pero no se borra."
          marcado={form.activo}
          alCambiar={(v) => setForm((f) => ({ ...f, activo: v }))}
        />
      </div>

      <DialogFooter className="m-0 flex-row items-center justify-between sm:justify-between">
        {plan ? (
          <Button
            type="button"
            variant="destructive"
            className={cn("h-11 max-sm:w-11 max-sm:px-0")}
            onClick={() => alPedirBorrar(plan)}
            aria-label={`Borrar ${plan.clase}`}
          >
            <Trash2Icon aria-hidden="true" />
            <span aria-hidden="true" className="max-sm:sr-only">
              Borrar
            </span>
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
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
            {guardando ? "Guardando…" : plan ? "Guardar" : "Crear transporte"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function Casilla({
  id,
  etiqueta,
  ayuda,
  marcado,
  deshabilitado,
  alCambiar,
}: {
  id: string;
  etiqueta: string;
  ayuda: string;
  marcado: boolean;
  deshabilitado?: boolean;
  alCambiar: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border px-3 py-1">
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        disabled={deshabilitado}
        onChange={(e) => alCambiar(e.target.checked)}
        aria-describedby={`${id}-ayuda`}
        className="mt-3 size-5 accent-[var(--brand-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      />
      <div className="grid flex-1">
        <label
          htmlFor={id}
          className={cn(
            "flex min-h-11 cursor-pointer items-center text-sm font-medium",
            deshabilitado && "cursor-not-allowed opacity-70",
          )}
        >
          {etiqueta}
        </label>
        <p id={`${id}-ayuda`} className="pb-2 text-xs text-muted-foreground">
          {ayuda}
        </p>
      </div>
    </div>
  );
}
