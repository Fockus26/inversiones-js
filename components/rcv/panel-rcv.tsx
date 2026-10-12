"use client";

import {
  BanknoteIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  EyeOffIcon,
  FileXIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Aviso } from "@/components/catalogo/catalogo-productos";
import { FOCO } from "@/components/catalogo/formato";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cotizar, numeroEs } from "@/lib/rcv/cotizacion";
import { actualizarPlanRcv, borrarPlanRcv } from "@/lib/rcv/repositorio";
import {
  CATEGORIAS_RCV,
  type ConfigRcv,
  NOMBRES_CATEGORIA,
  type PlanRcvConId,
  requisitosEfectivos,
  type SolicitudRcvConId,
  type TasasRcv,
  tasasDe,
} from "@/lib/rcv/tipos";
import { cn } from "@/lib/utils";
import { DialogoPlan } from "./dialogo-plan";
import { DialogoRequisitos } from "./dialogo-requisitos";
import { Solicitudes } from "./solicitudes";
import { Tasas } from "./tasas";
import { useRcv } from "./use-rcv";

/**
 * /rcv (D030): tasas del día, transportes de la póliza (crear, editar, ocultar, borrar),
 * requisitos por tipo de transporte y solicitudes que deja la gente en el chat.
 * Mismo patrón que /productos: tarjetas hasta lg, tabla desde lg.
 */
export function PanelRcv() {
  const estado = useRcv();
  if (estado.tipo === "listo") return <Contenido {...estado} />;
  return (
    <div className="grid gap-6">
      <Encabezado />
      {estado.tipo === "cargando" ? (
        <div className="grid gap-3" aria-busy="true">
          <output className="sr-only">Cargando la póliza RCV…</output>
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-24 w-full" />
          ))}
        </div>
      ) : estado.tipo === "sin-acceso" ? (
        <Aviso
          icono={<LockIcon aria-hidden="true" />}
          titulo="Tu sesión no tiene acceso"
          texto="Tu cuenta no está en la lista de administradores. Pídele acceso al dueño del panel."
        />
      ) : (
        <Aviso
          icono={<CircleAlertIcon aria-hidden="true" />}
          titulo="No se pudo cargar la póliza RCV"
          texto={`Revisa tu conexión y recarga la página. Detalle: ${estado.mensaje}`}
        />
      )}
    </div>
  );
}

function Encabezado({
  resumen,
  accion,
}: {
  resumen?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <h1 className="text-2xl font-semibold">Póliza RCV</h1>
        {resumen && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resumen}
          </p>
        )}
      </div>
      {accion}
    </div>
  );
}

function Contenido({
  planes,
  config,
  solicitudes,
}: {
  planes: PlanRcvConId[];
  config: ConfigRcv | null;
  solicitudes: SolicitudRcvConId[];
}) {
  const [editando, setEditando] = useState<PlanRcvConId | null>(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [requisitosAbierto, setRequisitosAbierto] = useState(false);
  const [borrando, setBorrando] = useState<PlanRcvConId | null>(null);

  const tasas = tasasDe(config);
  const provisionales = !CATEGORIAS_RCV.every(
    (c) => (config?.requisitos?.[c]?.length ?? 0) > 0,
  );
  const ordenNuevo = planes.reduce((max, p) => Math.max(max, p.orden), 0) + 1;
  const ocultos = planes.filter((p) => !p.activo).length;
  const resumen = [
    `${planes.length} ${planes.length === 1 ? "transporte" : "transportes"}`,
    ocultos > 0 ? `${ocultos} ${ocultos === 1 ? "oculto" : "ocultos"}` : null,
    `${solicitudes.length} ${solicitudes.length === 1 ? "solicitud" : "solicitudes"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  function abrirEditar(p: PlanRcvConId | null) {
    setEditando(p);
    setDialogoAbierto(true);
  }

  return (
    <div className="grid gap-6">
      <Encabezado
        resumen={resumen}
        accion={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              variant="outline"
              className={cn("h-11 px-4", FOCO)}
              onClick={() => setRequisitosAbierto(true)}
            >
              <ClipboardListIcon aria-hidden="true" />
              Requisitos
            </Button>
            <Button
              className={cn("h-11 px-4", FOCO)}
              onClick={() => abrirEditar(null)}
            >
              <PlusIcon aria-hidden="true" />
              Nuevo transporte
            </Button>
          </div>
        }
      />

      {provisionales && (
        <p className="flex items-start gap-2 rounded-xl border border-dashed p-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
          <CircleAlertIcon aria-hidden="true" />
          <span>
            Los requisitos que muestra el chat son provisionales. Cámbialos en{" "}
            <strong>Requisitos</strong> por los reales.
          </span>
        </p>
      )}

      <Tasas
        key={`${tasas?.usd}-${tasas?.bs}`}
        tasas={tasas}
        actualizadoEn={config?.actualizadoEn}
      />

      <section aria-labelledby="titulo-transportes" className="grid gap-3">
        <h2
          id="titulo-transportes"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <span
            className="h-5 w-1 rounded-full bg-primary"
            aria-hidden="true"
          />
          Transportes
        </h2>
        {planes.length === 0 ? (
          <Aviso
            icono={<FileXIcon aria-hidden="true" />}
            titulo="Todavía no hay transportes"
            texto="Crea el primero con «Nuevo transporte». El chat ofrecerá lo que cargues aquí."
          />
        ) : (
          <>
            <Tarjetas
              planes={planes}
              tasas={tasas}
              alEditar={abrirEditar}
              alBorrar={setBorrando}
            />
            <Tabla
              planes={planes}
              tasas={tasas}
              alEditar={abrirEditar}
              alBorrar={setBorrando}
            />
          </>
        )}
      </section>

      <Solicitudes solicitudes={solicitudes} />

      <DialogoPlan
        abierto={dialogoAbierto}
        alCambiarAbierto={setDialogoAbierto}
        plan={editando}
        ordenNuevo={ordenNuevo}
        tasas={tasas}
        alPedirBorrar={(p) => {
          setDialogoAbierto(false);
          setBorrando(p);
        }}
      />
      <DialogoRequisitos
        abierto={requisitosAbierto}
        alCambiarAbierto={setRequisitosAbierto}
        requisitos={requisitosEfectivos(config)}
        provisionales={provisionales}
      />
      <DialogoBorrarPlan plan={borrando} alCerrar={() => setBorrando(null)} />
    </div>
  );
}

interface PropsFilas {
  planes: PlanRcvConId[];
  tasas: TasasRcv | null;
  alEditar: (p: PlanRcvConId) => void;
  alBorrar: (p: PlanRcvConId) => void;
}

function Etiquetas({ p, className }: { p: PlanRcvConId; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {p.categorias.map((c) => (
        <Badge key={c} variant="outline">
          {NOMBRES_CATEGORIA[c]}
        </Badge>
      ))}
      {p.financiamiento && (
        <Badge>
          <BanknoteIcon aria-hidden="true" />
          Financiamiento
        </Badge>
      )}
      {!p.activo && (
        <Badge variant="outline">
          <EyeOffIcon aria-hidden="true" />
          Oculto
        </Badge>
      )}
    </div>
  );
}

function Acciones({
  p,
  alEditar,
  alBorrar,
}: { p: PlanRcvConId } & Pick<PropsFilas, "alEditar" | "alBorrar">) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        className={cn("h-11 px-3", FOCO)}
        onClick={() => alEditar(p)}
        aria-label={`Editar ${p.clase}: ${p.descripcion}`}
      >
        <PencilIcon aria-hidden="true" />
        <span aria-hidden="true">Editar</span>
      </Button>
      <Button
        variant="ghost"
        className={cn("size-11 text-destructive hover:text-destructive", FOCO)}
        onClick={() => alBorrar(p)}
        aria-label={`Borrar ${p.clase}: ${p.descripcion}`}
      >
        <Trash2Icon aria-hidden="true" />
      </Button>
    </div>
  );
}

/** "15,00 €", "16,79$", "Bs. 14.686,18" o "—"/"Cotización". */
function montos(p: PlanRcvConId, tasas: TasasRcv | null) {
  const c = cotizar(p.precioEur, tasas);
  if (!c) return { eur: "Cotización", usd: "—", bs: "—" };
  return {
    eur: `${numeroEs(c.eur)} €`,
    usd: c.usd === null ? "—" : `${numeroEs(c.usd)}$`,
    bs: c.bs === null ? "—" : `Bs. ${numeroEs(c.bs)}`,
  };
}

function Tarjetas({ planes, tasas, alEditar, alBorrar }: PropsFilas) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
      {planes.map((p) => {
        const m = montos(p, tasas);
        return (
          <li
            key={p.id}
            className={cn(
              "grid content-start gap-3 rounded-xl border bg-card p-4 text-card-foreground",
              !p.activo && "border-dashed",
            )}
          >
            <div className="min-w-0">
              <h3 className="font-medium break-words">
                <span className="text-muted-foreground tabular-nums">
                  {p.orden}.
                </span>{" "}
                {p.clase}
              </h3>
              <p className="text-sm break-words text-muted-foreground">
                {p.descripcion}
              </p>
            </div>
            <p className="text-sm tabular-nums">
              <strong>{m.eur}</strong>
              {m.usd !== "—" && ` · ${m.usd}`}
              {m.bs !== "—" && ` · ${m.bs}`}
            </p>
            <Etiquetas p={p} />
            <div className="flex justify-end">
              <Acciones p={p} alEditar={alEditar} alBorrar={alBorrar} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Tabla({ planes, tasas, alEditar, alBorrar }: PropsFilas) {
  return (
    <div className="hidden rounded-xl border bg-card lg:block">
      <Table className="table-fixed">
        <caption className="sr-only">Transportes de la póliza RCV</caption>
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-36" />
          <col className="w-52" />
          <col className="w-36" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">N.º</TableHead>
            <TableHead>Transporte</TableHead>
            <TableHead className="text-right">Euros</TableHead>
            <TableHead className="text-right">Dólares</TableHead>
            <TableHead className="text-right">Bolívares</TableHead>
            <TableHead>Aparece en</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planes.map((p) => {
            const m = montos(p, tasas);
            return (
              <TableRow key={p.id}>
                <TableCell className="text-center tabular-nums">
                  {p.orden}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="font-medium">{p.clase}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.descripcion}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.eur}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.usd}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.bs}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <Etiquetas p={p} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Acciones p={p} alEditar={alEditar} alBorrar={alBorrar} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Confirmación de borrado con la alternativa de ocultar, como en /productos. */
function DialogoBorrarPlan({
  plan,
  alCerrar,
}: {
  plan: PlanRcvConId | null;
  alCerrar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);

  async function ejecutar(accion: "borrar" | "ocultar") {
    if (!plan) return;
    setOcupado(true);
    try {
      if (accion === "borrar") {
        await borrarPlanRcv(plan.id);
        toast.success(`Borraste ${plan.clase}`);
      } else {
        await actualizarPlanRcv(plan.id, { activo: false });
        toast.success(`Ocultaste ${plan.clase}`, {
          description: "El chat ya no lo ofrece. Puedes reactivarlo al editar.",
        });
      }
      alCerrar();
    } catch (e) {
      toast.error(
        accion === "borrar" ? "No se pudo borrar" : "No se pudo ocultar",
        {
          description: e instanceof Error ? e.message : undefined,
        },
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <AlertDialog
      open={plan !== null}
      onOpenChange={(abierto) => {
        if (!abierto) alCerrar();
      }}
    >
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar {plan?.clase}?</AlertDialogTitle>
          <AlertDialogDescription>
            «{plan?.descripcion}» se borra para siempre y el chat deja de
            ofrecerlo.
            {plan?.activo
              ? " Si solo quieres que no aparezca por un tiempo, mejor ocúltalo."
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel className={cn("h-11", FOCO)} disabled={ocupado}>
            Cancelar
          </AlertDialogCancel>
          {plan?.activo && (
            <Button
              variant="outline"
              className={cn("h-11", FOCO)}
              disabled={ocupado}
              onClick={() => ejecutar("ocultar")}
            >
              Ocultar
            </Button>
          )}
          <AlertDialogAction
            variant="destructive"
            className={cn("h-11 dark:bg-destructive/10", FOCO)}
            disabled={ocupado}
            onClick={() => ejecutar("borrar")}
          >
            Borrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
