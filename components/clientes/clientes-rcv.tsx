"use client";

import {
  BellIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarXIcon,
  FileClockIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchXIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Aviso } from "@/components/catalogo/catalogo-productos";
import {
  DIALOGO_CON_PIE_FIJO,
  formatearMonto,
  haceCuanto,
} from "@/components/catalogo/formato";
import {
  ENTRADA,
  escalonado,
  TARJETA_VIVA,
} from "@/components/panel/animacion";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ResumenPagos, resumenPagos } from "@/lib/financiamiento/cuotas";
import {
  FECHA_MINIMA,
  fechaCorta,
  hoyCaracas,
} from "@/lib/financiamiento/fechas";
import {
  DIAS_AVISO_FINAL,
  DIAS_AVISO_MES,
  type EstadoPoliza,
  estadoPoliza,
  renovacion,
  venceDe,
} from "@/lib/financiamiento/poliza";
import {
  actualizarClienteRcv,
  crearClienteRcv,
  escucharClientesRcv,
} from "@/lib/financiamiento/repositorio";
import {
  type ClienteRcvConId,
  COLECCION_CLIENTES_RCV,
  NOMBRES_FRECUENCIA,
} from "@/lib/financiamiento/tipos";
import {
  type FormularioClienteRcv,
  formularioPagos,
  LIMITES_CLIENTE,
  validarClienteRcv,
} from "@/lib/financiamiento/validacion";
import { mensajeDeError } from "@/lib/firebase/errores";
import { cn } from "@/lib/utils";
import {
  AreaTexto,
  BADGE_LARGO,
  BadgePagos,
  Buscador,
  Campo,
  Contacto,
  coincide,
  DialogoBorrarCliente,
  Encabezado,
  EstadoCarga,
  Filtros,
  Indicadores,
  ProgresoPagos,
  useClientes,
} from "./comun";
import { CamposPagos, DialogoCuotas } from "./cuotas";

/**
 * /clientes/rcv (D032, D033): quién tiene póliza con la tienda, cuándo vence (el bot le avisa
 * un mes y 3 días antes) y, si la financió, cómo van sus cuotas.
 */
export function ClientesRcv() {
  const estado = useClientes(escucharClientesRcv);
  if (estado.tipo !== "listo") return <EstadoCarga estado={estado} />;
  return <Contenido clientes={estado.clientes} />;
}

type Filtro = "todos" | "por-vencer" | "vencida" | "sin-emitir" | "atrasado";

interface Fila {
  c: ClienteRcvConId;
  poliza: EstadoPoliza;
  pagos: ResumenPagos | null;
}

function Contenido({ clientes }: { clientes: ClienteRcvConId[] }) {
  const hoy = hoyCaracas();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editando, setEditando] = useState<ClienteRcvConId | null>(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [cuotasDe, setCuotasDe] = useState<string | null>(null);
  const [renovando, setRenovando] = useState<ClienteRcvConId | null>(null);
  const [borrando, setBorrando] = useState<ClienteRcvConId | null>(null);

  const filas: Fila[] = useMemo(
    () =>
      clientes
        .map((c) => ({
          c,
          poliza: estadoPoliza(c, hoy),
          pagos: c.pagos ? resumenPagos(c.pagos, hoy) : null,
        }))
        // Lo que pide atención primero: vencidas, por vencer (más cerca primero), resto.
        .sort((a, b) => peso(a.poliza) - peso(b.poliza)),
    [clientes, hoy],
  );
  const cumple = (f: Fila, k: Filtro) =>
    k === "todos" ||
    (k === "atrasado" ? f.pagos?.estado === "atrasado" : f.poliza.tipo === k);
  const cuenta = (k: Filtro) => filas.filter((f) => cumple(f, k)).length;
  const visibles = filas.filter(
    (f) =>
      cumple(f, filtro) &&
      coincide(
        busqueda,
        f.c.nombre,
        f.c.cedula,
        f.c.telefono,
        f.c.placa,
        f.c.vehiculo,
      ),
  );
  const vigentes = filas.filter(
    (f) => f.poliza.tipo === "vigente" || f.poliza.tipo === "por-vencer",
  ).length;
  const conCuotas = clientes.find((c) => c.id === cuotasDe) ?? null;
  // El diálogo trabaja con la versión en vivo: si otra pestaña (o el bot) cambia cuotas o
  // avisos mientras está abierto, guardar no los pisa con la foto de cuando se abrió.
  const editandoVivo = editando
    ? (clientes.find((c) => c.id === editando.id) ?? editando)
    : null;

  function abrir(c: ClienteRcvConId | null) {
    setEditando(c);
    setDialogoAbierto(true);
  }

  return (
    <div className="grid gap-6">
      <Encabezado
        resumen={`${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"} con póliza RCV`}
        accion={
          <Button
            className={cn("h-auto min-h-11 px-4 py-2 whitespace-normal")}
            onClick={() => abrir(null)}
          >
            <PlusIcon aria-hidden="true" />
            Nuevo cliente
          </Button>
        }
      />

      <Indicadores
        items={[
          { nombre: "Pólizas vigentes", valor: String(vigentes), tono: "ok" },
          {
            nombre: `Vencen en ${DIAS_AVISO_MES} días`,
            valor: String(cuenta("por-vencer")),
          },
          {
            nombre: "Vencidas",
            valor: String(cuenta("vencida")),
            tono: cuenta("vencida") > 0 ? "alerta" : undefined,
          },
          {
            nombre: "Con cuotas atrasadas",
            valor: String(cuenta("atrasado")),
            tono: cuenta("atrasado") > 0 ? "alerta" : undefined,
          },
        ]}
      />

      <p className="flex items-start gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
        <BellIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          La póliza dura un año desde la emisión. Gaby le escribe al cliente por
          WhatsApp cuando falta un mes y, si no la renovó, otra vez cuando
          faltan {DIAS_AVISO_FINAL} días.
        </span>
      </p>

      <search className="grid gap-3">
        {/* Anuncia cuántos quedan al filtrar: "Sin resultados" se pinta fuera de una región viva. */}
        <p className="sr-only" aria-live="polite">
          {busqueda.trim() || filtro !== "todos"
            ? `${visibles.length} de ${clientes.length} clientes coinciden`
            : ""}
        </p>
        <Buscador
          id="buscar-cliente-rcv"
          etiqueta="Buscar por nombre, cédula, teléfono o placa"
          valor={busqueda}
          alCambiar={setBusqueda}
        />
        <Filtros<Filtro>
          etiqueta="Filtrar por estado de la póliza"
          actual={filtro}
          alElegir={setFiltro}
          opciones={[
            { clave: "todos", nombre: "Todos", n: clientes.length },
            {
              clave: "por-vencer",
              nombre: "Por vencer",
              n: cuenta("por-vencer"),
            },
            { clave: "vencida", nombre: "Vencidas", n: cuenta("vencida") },
            {
              clave: "sin-emitir",
              nombre: "Sin emitir",
              n: cuenta("sin-emitir"),
            },
            {
              clave: "atrasado",
              nombre: "Cuotas atrasadas",
              n: cuenta("atrasado"),
            },
          ]}
        />
      </search>

      {clientes.length === 0 ? (
        <Aviso
          icono={<UsersIcon aria-hidden="true" />}
          titulo="Todavía no hay clientes de póliza"
          texto="Regístralos con «Nuevo cliente» o desde una solicitud del chat en Solicitudes."
        />
      ) : visibles.length === 0 ? (
        <Aviso
          icono={<SearchXIcon aria-hidden="true" />}
          titulo="Sin resultados"
          texto="Ningún cliente coincide con la búsqueda o el filtro."
          accion={
            <Button
              variant="outline"
              className={cn("h-auto min-h-11 px-4 py-2 whitespace-normal")}
              onClick={() => {
                setBusqueda("");
                setFiltro("todos");
              }}
            >
              Ver todos
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map((f, i) => (
            <Tarjeta
              key={f.c.id}
              fila={f}
              indice={i}
              alVerCuotas={() => setCuotasDe(f.c.id)}
              alRenovar={() => setRenovando(f.c)}
              alEditar={() => abrir(f.c)}
              alBorrar={() => setBorrando(f.c)}
            />
          ))}
        </ul>
      )}

      <DialogoClienteRcv
        abierto={dialogoAbierto}
        alCambiarAbierto={setDialogoAbierto}
        cliente={editandoVivo}
      />
      <DialogoCuotas
        coleccion={COLECCION_CLIENTES_RCV}
        cliente={
          conCuotas?.pagos
            ? {
                id: conCuotas.id,
                nombre: conCuotas.nombre,
                pagos: conCuotas.pagos,
              }
            : null
        }
        detalle={conCuotas?.vehiculo}
        alCerrar={() => setCuotasDe(null)}
      />
      <DialogoRenovar cliente={renovando} alCerrar={() => setRenovando(null)} />
      <DialogoBorrarCliente
        coleccion={COLECCION_CLIENTES_RCV}
        cliente={borrando}
        alCerrar={() => setBorrando(null)}
      />
    </div>
  );
}

function peso(p: EstadoPoliza): number {
  if (p.tipo === "vencida") return -100_000 + p.dias;
  if (p.tipo === "por-vencer") return -1_000 + p.dias;
  if (p.tipo === "sin-emitir") return 0;
  return p.dias;
}

function BadgePoliza({ p, vence }: { p: EstadoPoliza; vence: string | null }) {
  if (p.tipo === "sin-emitir")
    return (
      <Badge variant="outline" className={BADGE_LARGO}>
        <FileClockIcon aria-hidden="true" />
        Sin emitir
      </Badge>
    );
  if (p.tipo === "vencida")
    return (
      <Badge variant="destructive" className={BADGE_LARGO}>
        <CalendarXIcon aria-hidden="true" />
        Vencida hace {p.dias} {p.dias === 1 ? "día" : "días"}
      </Badge>
    );
  if (p.tipo === "por-vencer")
    return (
      <Badge className={BADGE_LARGO}>
        <CalendarClockIcon aria-hidden="true" />
        {p.dias === 0
          ? "Vence hoy"
          : `Vence en ${p.dias} ${p.dias === 1 ? "día" : "días"}`}
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className={cn(BADGE_LARGO, "border-success text-success")}
    >
      <CalendarCheckIcon aria-hidden="true" />
      Vigente hasta {vence ? fechaCorta(vence) : "—"}
    </Badge>
  );
}

function Tarjeta({
  fila: { c, poliza, pagos },
  indice,
  alVerCuotas,
  alRenovar,
  alEditar,
  alBorrar,
}: {
  fila: Fila;
  indice: number;
  alVerCuotas: () => void;
  alRenovar: () => void;
  alEditar: () => void;
  alBorrar: () => void;
}) {
  const avisos = [
    c.recordatorio30 && "aviso de un mes",
    c.recordatorio3 && `aviso de ${DIAS_AVISO_FINAL} días`,
  ].filter(Boolean);
  const puedeRenovar =
    poliza.tipo === "por-vencer" || poliza.tipo === "vencida";
  return (
    <li
      style={escalonado(indice)}
      className={cn(
        "grid min-w-0 grid-cols-1 content-start gap-3 rounded-xl border bg-card p-4 text-card-foreground",
        ENTRADA,
        TARJETA_VIVA,
        (poliza.tipo === "vencida" || pagos?.estado === "atrasado") &&
          "border-destructive/50",
        poliza.tipo === "sin-emitir" && "border-dashed",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-medium wrap-anywhere">{c.nombre}</h2>
          <p className="text-sm wrap-anywhere text-muted-foreground">
            {c.vehiculo}
            {c.placa && ` · Placa ${c.placa}`}
            {c.cedula && ` · ${c.cedula}`}
          </p>
        </div>
        <BadgePoliza p={poliza} vence={c.vence} />
      </div>
      <Contacto telefono={c.telefono} />
      {c.emision && c.vence && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Emitida el {fechaCorta(c.emision)} · vence el {fechaCorta(c.vence)}
          {avisos.length > 0 && ` · Gaby ya envió el ${avisos.join(" y el ")}`}
        </p>
      )}
      {pagos ? (
        <div className="grid gap-2 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">Financiada</span>
            <BadgePagos r={pagos} />
          </div>
          <ProgresoPagos r={pagos} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Pagada de contado.</p>
      )}
      {c.notas && (
        <p className="text-xs wrap-anywhere whitespace-pre-line text-muted-foreground">
          {c.notas}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-1">
        {poliza.tipo === "sin-emitir" && (
          <Button
            className={cn("h-11 px-3")}
            onClick={alEditar}
            aria-label={`Confirmar póliza de ${c.nombre}`}
          >
            <CalendarCheckIcon aria-hidden="true" />
            <span aria-hidden="true">Confirmar póliza</span>
          </Button>
        )}
        {puedeRenovar && (
          <Button
            className={cn("h-11 px-3")}
            onClick={alRenovar}
            aria-label={`Renovar póliza de ${c.nombre}`}
          >
            <RefreshCwIcon aria-hidden="true" />
            <span aria-hidden="true">Renovar</span>
          </Button>
        )}
        {pagos && (
          <Button
            variant={
              puedeRenovar || poliza.tipo === "sin-emitir"
                ? "outline"
                : "default"
            }
            className={cn("h-11 px-3")}
            onClick={alVerCuotas}
            aria-label={`Cuotas de ${c.nombre}`}
          >
            <ListChecksIcon aria-hidden="true" />
            <span aria-hidden="true">Cuotas</span>
          </Button>
        )}
        <Button
          variant="outline"
          className={cn("h-11 px-3")}
          onClick={alEditar}
          aria-label={`Editar a ${c.nombre}`}
        >
          <PencilIcon aria-hidden="true" />
          <span aria-hidden="true">Editar</span>
        </Button>
        <Button
          variant="ghost"
          className={cn("size-11 text-destructive hover:text-destructive")}
          onClick={alBorrar}
          aria-label={`Borrar a ${c.nombre}`}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function DialogoRenovar({
  cliente,
  alCerrar,
}: {
  cliente: ClienteRcvConId | null;
  alCerrar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const hoy = hoyCaracas();
  const nueva = cliente ? renovacion(cliente, hoy) : null;

  async function renovar() {
    if (!cliente || !nueva) return;
    setOcupado(true);
    try {
      await actualizarClienteRcv(cliente.id, nueva);
      toast.success(`Renovaste la póliza de ${cliente.nombre}`, {
        description: `Vence el ${fechaCorta(nueva.vence ?? "")}.`,
      });
      alCerrar();
    } catch (e) {
      toast.error("No se pudo renovar", {
        description: mensajeDeError(e),
      });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <AlertDialog
      open={cliente !== null}
      onOpenChange={(abierto) => {
        if (!abierto) alCerrar();
      }}
    >
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Renovar la póliza de {cliente?.nombre}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nueva?.emision && nueva.vence
              ? `La nueva póliza va del ${fechaCorta(nueva.emision)} al ${fechaCorta(nueva.vence)}. Gaby le avisará de nuevo un mes y ${DIAS_AVISO_FINAL} días antes de ese vencimiento.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={cn("h-11")} disabled={ocupado}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn("h-11")}
            disabled={ocupado}
            onClick={renovar}
          >
            Renovar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function aFormulario(
  c: ClienteRcvConId | null,
  inicial: Partial<FormularioClienteRcv> | undefined,
  hoy: string,
): FormularioClienteRcv {
  return {
    nombre: c?.nombre ?? "",
    cedula: c?.cedula ?? "",
    telefono: c?.telefono ?? "",
    correo: c?.correo ?? "",
    direccion: c?.direccion ?? "",
    vehiculo: c?.vehiculo ?? "",
    placa: c?.placa ?? "",
    notas: c?.notas ?? "",
    emision: c?.emision ?? "",
    financiado: c ? c.pagos !== null : false,
    ...formularioPagos(c?.pagos ?? null, hoy),
    ...inicial,
  };
}

type CampoForm = keyof FormularioClienteRcv;
const ORDEN: CampoForm[] = [
  "nombre",
  "cedula",
  "telefono",
  "correo",
  "direccion",
  "vehiculo",
  "placa",
  "emision",
  "inicial",
  "cuota",
  "numeroCuotas",
  "primera",
  "notas",
];

/** Crear o editar un cliente de póliza. `inicial` rellena el formulario (desde una solicitud). */
export function DialogoClienteRcv(props: {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  cliente: ClienteRcvConId | null;
  inicial?: Partial<FormularioClienteRcv>;
}) {
  return (
    <Dialog open={props.abierto} onOpenChange={props.alCambiarAbierto}>
      <DialogContent showCloseButton={false} className={DIALOGO_CON_PIE_FIJO}>
        {props.abierto && <FormularioRcv {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioRcv({
  cliente,
  inicial,
  alCambiarAbierto,
}: {
  cliente: ClienteRcvConId | null;
  inicial?: Partial<FormularioClienteRcv>;
  alCambiarAbierto: (abierto: boolean) => void;
}) {
  const prefijo = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const hoy = hoyCaracas();
  const [form, setForm] = useState(() => aFormulario(cliente, inicial, hoy));
  const [tocados, setTocados] = useState<Set<CampoForm>>(new Set());
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const resultado = validarClienteRcv(form, cliente);
  const errores = resultado.ok ? {} : resultado.errores;
  const error = (c: CampoForm) =>
    intentado || tocados.has(c) ? errores[c] : undefined;
  const tocar = (c: CampoForm) =>
    setTocados((t) => (t.has(c) ? t : new Set(t).add(c)));
  const cambiar = <C extends CampoForm>(c: C, v: FormularioClienteRcv[C]) =>
    setForm((f) => ({ ...f, [c]: v }));
  const id = (c: CampoForm) => `${prefijo}-${c}`;
  const texto = (
    c:
      | "nombre"
      | "cedula"
      | "telefono"
      | "correo"
      | "direccion"
      | "vehiculo"
      | "placa"
      | "emision",
  ) => ({
    id: id(c),
    name: c,
    value: form[c],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      cambiar(c, e.target.value),
    onBlur: () => tocar(c),
    error: error(c),
  });

  const plan = resultado.ok ? resultado.valor.pagos : null;
  const vistaPlan = plan
    ? `${plan.cuotas.length} ${plan.cuotas.length === 1 ? "cuota" : "cuotas"} ${NOMBRES_FRECUENCIA[plan.frecuencia].toLowerCase()}${plan.cuotas.length === 1 ? "" : "es"} de ${formatearMonto(plan.cuotas[0].monto)} · última el ${fechaCorta(plan.cuotas[plan.cuotas.length - 1].vence)}`
    : null;
  const vence = form.emision && !errores.emision ? venceDe(form.emision) : null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok) {
      const primero = ORDEN.find((c) => errores[c]);
      if (primero)
        formRef.current
          ?.querySelector<HTMLElement>(`#${CSS.escape(id(primero))}`)
          ?.focus();
      return;
    }
    setGuardando(true);
    try {
      if (cliente) await actualizarClienteRcv(cliente.id, resultado.valor);
      else await crearClienteRcv(resultado.valor);
      toast.success(
        `${cliente ? "Guardaste a" : "Registraste a"} ${resultado.valor.nombre}`,
      );
      alCambiarAbierto(false);
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: mensajeDeError(err),
      });
      setGuardando(false);
    }
  }

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
            {cliente ? `Editar a ${cliente.nombre}` : "Nuevo cliente de póliza"}
          </DialogTitle>
          <DialogDescription>
            {cliente?.actualizadoEn
              ? `Actualizado ${haceCuanto(cliente.actualizadoEn)}. `
              : ""}
            Al poner la fecha de emisión, la póliza queda confirmada y Gaby le
            avisará antes de que venza.
          </DialogDescription>
        </DialogHeader>

        <Campo
          etiqueta="Nombre y apellido"
          maxLength={LIMITES_CLIENTE.nombreMax}
          placeholder="José Rodríguez"
          {...texto("nombre")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            etiqueta="Cédula"
            maxLength={LIMITES_CLIENTE.cedulaMax}
            placeholder="V-12345678"
            {...texto("cedula")}
          />
          <Campo
            etiqueta="Teléfono (WhatsApp)"
            type="tel"
            inputMode="tel"
            maxLength={LIMITES_CLIENTE.telefonoMax}
            placeholder="0414-1234567"
            {...texto("telefono")}
          />
        </div>
        <Campo
          etiqueta="Correo (opcional)"
          type="email"
          inputMode="email"
          maxLength={LIMITES_CLIENTE.correoMax}
          placeholder="nombre@correo.com"
          {...texto("correo")}
        />
        <Campo
          etiqueta="Dirección (opcional)"
          maxLength={LIMITES_CLIENTE.direccionMax}
          {...texto("direccion")}
        />
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <Campo
            etiqueta="Vehículo o plan"
            maxLength={LIMITES_CLIENTE.vehiculoMax}
            placeholder="TAXI — PLAN BÁSICO"
            {...texto("vehiculo")}
          />
          <Campo
            etiqueta="Placa"
            maxLength={LIMITES_CLIENTE.placaMax}
            placeholder="AB123CD"
            {...texto("placa")}
          />
        </div>
        <Campo
          etiqueta="Fecha de emisión de la póliza"
          type="date"
          min={FECHA_MINIMA}
          max={hoy}
          ayuda={
            vence
              ? `Vence el ${fechaCorta(vence)}.`
              : "Déjala vacía si la póliza todavía no se emitió."
          }
          {...texto("emision")}
        />

        <div className="flex items-start gap-3 rounded-lg border px-3 py-1">
          <input
            id={id("financiado")}
            type="checkbox"
            checked={form.financiado}
            onChange={(e) => cambiar("financiado", e.target.checked)}
            aria-describedby={`${id("financiado")}-ayuda`}
            className="mt-3 size-5 accent-[var(--brand-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <div className="grid flex-1">
            <label
              htmlFor={id("financiado")}
              className="flex min-h-11 cursor-pointer items-center text-sm font-medium"
            >
              La paga en cuotas
            </label>
            <p
              id={`${id("financiado")}-ayuda`}
              className="pb-2 text-xs text-muted-foreground"
            >
              Márcalo si la póliza se financió: podrás anotar cada cuota pagada.
            </p>
          </div>
        </div>
        {form.financiado && (
          <>
            <CamposPagos
              prefijo={prefijo}
              valores={form}
              alCambiar={(cambios) => setForm((f) => ({ ...f, ...cambios }))}
              alSalir={tocar}
              errores={{
                inicial: error("inicial"),
                cuota: error("cuota"),
                numeroCuotas: error("numeroCuotas"),
                primera: error("primera"),
                frecuencia: error("frecuencia"),
              }}
              conPagos={cliente?.pagos?.cuotas.some((c) => c.pagada) ?? false}
            />
            {vistaPlan && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {vistaPlan}
              </p>
            )}
          </>
        )}

        <AreaTexto
          id={id("notas")}
          etiqueta="Notas (opcional)"
          maxLength={LIMITES_CLIENTE.notasMax}
          value={form.notas}
          onChange={(e) => cambiar("notas", e.target.value)}
          onBlur={() => tocar("notas")}
          error={error("notas")}
        />
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
          {guardando ? "Guardando…" : cliente ? "Guardar" : "Registrar cliente"}
        </Button>
      </DialogFooter>
    </form>
  );
}
