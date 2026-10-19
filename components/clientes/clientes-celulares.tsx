"use client";

import {
  ListChecksIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
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
import {
  type EstadoPagos,
  type ResumenPagos,
  resumenPagos,
} from "@/lib/financiamiento/cuotas";
import { fechaCorta, hoyCaracas } from "@/lib/financiamiento/fechas";
import {
  actualizarClienteCelular,
  crearClienteCelular,
  escucharClientesCelulares,
} from "@/lib/financiamiento/repositorio";
import {
  type ClienteCelularConId,
  COLECCION_CLIENTES_CELULARES,
  NOMBRES_FRECUENCIA,
} from "@/lib/financiamiento/tipos";
import {
  type FormularioClienteCelular,
  formularioPagos,
  LIMITES_CLIENTE,
  validarClienteCelular,
} from "@/lib/financiamiento/validacion";
import { cn } from "@/lib/utils";
import {
  AreaTexto,
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

/** /clientes/celulares (D032): quién se llevó un equipo a crédito y cómo van sus cuotas. */
export function ClientesCelulares() {
  const estado = useClientes(escucharClientesCelulares);
  if (estado.tipo !== "listo") return <EstadoCarga estado={estado} />;
  return <Contenido clientes={estado.clientes} />;
}

type Filtro = "todos" | EstadoPagos;

function Contenido({ clientes }: { clientes: ClienteCelularConId[] }) {
  const hoy = hoyCaracas();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editando, setEditando] = useState<ClienteCelularConId | null>(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [cuotasDe, setCuotasDe] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<ClienteCelularConId | null>(null);

  const conResumen = useMemo(
    () => clientes.map((c) => ({ c, r: resumenPagos(c.pagos, hoy) })),
    [clientes, hoy],
  );
  const cuenta = (e: EstadoPagos) =>
    conResumen.filter(({ r }) => r.estado === e).length;
  const porCobrar = conResumen.reduce((t, { r }) => t + r.saldo, 0);
  const vencido = conResumen.reduce((t, { r }) => t + r.saldoVencido, 0);
  const visibles = conResumen.filter(
    ({ c, r }) =>
      (filtro === "todos" || r.estado === filtro) &&
      coincide(busqueda, c.nombre, c.cedula, c.telefono, c.equipo),
  );
  const conCuotas = clientes.find((c) => c.id === cuotasDe) ?? null;

  function abrir(c: ClienteCelularConId | null) {
    setEditando(c);
    setDialogoAbierto(true);
  }

  return (
    <div className="grid gap-6">
      <Encabezado
        resumen={`${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"} con celular a crédito`}
        accion={
          <Button className={cn("h-11 px-4")} onClick={() => abrir(null)}>
            <PlusIcon aria-hidden="true" />
            Nuevo cliente
          </Button>
        }
      />

      <Indicadores
        items={[
          { nombre: "Al día", valor: String(cuenta("al-dia")), tono: "ok" },
          {
            nombre: "Con cuotas atrasadas",
            valor: String(cuenta("atrasado")),
            tono: cuenta("atrasado") > 0 ? "alerta" : undefined,
          },
          {
            nombre: "Atrasado por cobrar",
            valor: formatearMonto(Math.round(vencido * 100) / 100),
            tono: vencido > 0 ? "alerta" : undefined,
          },
          {
            nombre: "Total por cobrar",
            valor: formatearMonto(Math.round(porCobrar * 100) / 100),
          },
        ]}
      />

      <search className="grid gap-3">
        <Buscador
          id="buscar-cliente-celular"
          etiqueta="Buscar por nombre, cédula, teléfono o equipo"
          valor={busqueda}
          alCambiar={setBusqueda}
        />
        <Filtros<Filtro>
          etiqueta="Filtrar por estado de pago"
          actual={filtro}
          alElegir={setFiltro}
          opciones={[
            { clave: "todos", nombre: "Todos", n: clientes.length },
            { clave: "atrasado", nombre: "Atrasados", n: cuenta("atrasado") },
            { clave: "al-dia", nombre: "Al día", n: cuenta("al-dia") },
            { clave: "pagado", nombre: "Pagados", n: cuenta("pagado") },
          ]}
        />
      </search>

      {clientes.length === 0 ? (
        <Aviso
          icono={<UsersIcon aria-hidden="true" />}
          titulo="Todavía no hay clientes"
          texto="Registra al primero con «Nuevo cliente»: sus datos, el equipo y el plan de cuotas."
        />
      ) : visibles.length === 0 ? (
        <Aviso
          icono={<SearchXIcon aria-hidden="true" />}
          titulo="Sin resultados"
          texto="Ningún cliente coincide con la búsqueda o el filtro."
          accion={
            <Button
              variant="outline"
              className={cn("h-11 px-4")}
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
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map(({ c, r }, i) => (
            <Tarjeta
              key={c.id}
              c={c}
              r={r}
              indice={i}
              alVerCuotas={() => setCuotasDe(c.id)}
              alEditar={() => abrir(c)}
              alBorrar={() => setBorrando(c)}
            />
          ))}
        </ul>
      )}

      <DialogoClienteCelular
        abierto={dialogoAbierto}
        alCambiarAbierto={setDialogoAbierto}
        cliente={editando}
      />
      <DialogoCuotas
        coleccion={COLECCION_CLIENTES_CELULARES}
        cliente={conCuotas}
        detalle={conCuotas?.equipo}
        alCerrar={() => setCuotasDe(null)}
      />
      <DialogoBorrarCliente
        coleccion={COLECCION_CLIENTES_CELULARES}
        cliente={borrando}
        alCerrar={() => setBorrando(null)}
      />
    </div>
  );
}

function Tarjeta({
  c,
  r,
  indice,
  alVerCuotas,
  alEditar,
  alBorrar,
}: {
  c: ClienteCelularConId;
  r: ResumenPagos;
  indice: number;
  alVerCuotas: () => void;
  alEditar: () => void;
  alBorrar: () => void;
}) {
  return (
    <li
      style={escalonado(indice)}
      className={cn(
        "grid content-start gap-3 rounded-xl border bg-card p-4 text-card-foreground",
        ENTRADA,
        TARJETA_VIVA,
        r.estado === "atrasado" && "border-destructive/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-medium break-words">{c.nombre}</h2>
          <p className="text-sm break-words text-muted-foreground">
            {c.equipo}
            {c.cedula && ` · ${c.cedula}`}
          </p>
        </div>
        <BadgePagos r={r} />
      </div>
      <Contacto telefono={c.telefono} />
      <ProgresoPagos r={r} />
      {c.notas && (
        <p className="text-xs break-words whitespace-pre-line text-muted-foreground">
          {c.notas}
        </p>
      )}
      <div className="flex items-center justify-end gap-1">
        <Button
          className={cn("h-11 px-3")}
          onClick={alVerCuotas}
          aria-label={`Cuotas de ${c.nombre}`}
        >
          <ListChecksIcon aria-hidden="true" />
          <span aria-hidden="true">Cuotas</span>
        </Button>
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

function aFormulario(
  c: ClienteCelularConId | null,
  hoy: string,
): FormularioClienteCelular {
  return {
    nombre: c?.nombre ?? "",
    cedula: c?.cedula ?? "",
    telefono: c?.telefono ?? "",
    equipo: c?.equipo ?? "",
    notas: c?.notas ?? "",
    ...formularioPagos(c?.pagos ?? null, hoy),
  };
}

type CampoForm = keyof FormularioClienteCelular;
const ORDEN: CampoForm[] = [
  "nombre",
  "cedula",
  "telefono",
  "equipo",
  "inicial",
  "cuota",
  "numeroCuotas",
  "primera",
  "notas",
];

function DialogoClienteCelular(props: {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  cliente: ClienteCelularConId | null;
}) {
  return (
    <Dialog open={props.abierto} onOpenChange={props.alCambiarAbierto}>
      <DialogContent showCloseButton={false} className={DIALOGO_CON_PIE_FIJO}>
        {props.abierto && <FormularioCelular {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioCelular({
  cliente,
  alCambiarAbierto,
}: {
  cliente: ClienteCelularConId | null;
  alCambiarAbierto: (abierto: boolean) => void;
}) {
  const prefijo = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(() => aFormulario(cliente, hoyCaracas()));
  const [tocados, setTocados] = useState<Set<CampoForm>>(new Set());
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const resultado = validarClienteCelular(form, cliente?.pagos ?? null);
  const errores = resultado.ok ? {} : resultado.errores;
  const error = (c: CampoForm) =>
    intentado || tocados.has(c) ? errores[c] : undefined;
  const tocar = (c: CampoForm) =>
    setTocados((t) => (t.has(c) ? t : new Set(t).add(c)));
  const cambiar = <C extends CampoForm>(c: C, v: FormularioClienteCelular[C]) =>
    setForm((f) => ({ ...f, [c]: v }));
  const id = (c: CampoForm) => `${prefijo}-${c}`;
  const texto = (c: "nombre" | "cedula" | "telefono" | "equipo") => ({
    id: id(c),
    name: c,
    value: form[c],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      cambiar(c, e.target.value),
    onBlur: () => tocar(c),
    error: error(c),
  });

  const plan = resultado.ok ? resultado.valor.pagos : null;
  const vista = plan
    ? `${plan.cuotas.length} ${plan.cuotas.length === 1 ? "cuota" : "cuotas"} ${NOMBRES_FRECUENCIA[plan.frecuencia].toLowerCase()}${plan.cuotas.length === 1 ? "" : "es"} de ${formatearMonto(plan.cuotas[0].monto)} · última el ${fechaCorta(plan.cuotas[plan.cuotas.length - 1].vence)} · total ${formatearMonto(Math.round((plan.inicial + plan.cuotas.reduce((t, c) => t + c.monto, 0)) * 100) / 100)}`
    : null;

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
      if (cliente) await actualizarClienteCelular(cliente.id, resultado.valor);
      else await crearClienteCelular(resultado.valor);
      toast.success(
        `${cliente ? "Guardaste a" : "Registraste a"} ${resultado.valor.nombre}`,
      );
      alCambiarAbierto(false);
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: err instanceof Error ? err.message : undefined,
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
            {cliente ? `Editar a ${cliente.nombre}` : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            {cliente?.actualizadoEn
              ? `Actualizado ${haceCuanto(cliente.actualizadoEn)}. `
              : ""}
            Datos de quien se llevó el equipo y su plan de cuotas.
          </DialogDescription>
        </DialogHeader>

        <Campo
          etiqueta="Nombre y apellido"
          maxLength={LIMITES_CLIENTE.nombreMax}
          placeholder="María Pérez"
          autoComplete="off"
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
            etiqueta="Teléfono"
            type="tel"
            inputMode="tel"
            maxLength={LIMITES_CLIENTE.telefonoMax}
            placeholder="0414-1234567"
            {...texto("telefono")}
          />
        </div>
        <Campo
          etiqueta="Equipo"
          maxLength={LIMITES_CLIENTE.equipoMax}
          placeholder="HONOR 600 Elite 8/256"
          {...texto("equipo")}
        />

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
          conPagos={cliente?.pagos.cuotas.some((c) => c.pagada) ?? false}
        />
        {vista && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {vista}
          </p>
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
