"use client";

import { onAuthStateChanged } from "firebase/auth";
import type { FirestoreError } from "firebase/firestore";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  LockIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Aviso } from "@/components/catalogo/catalogo-productos";
import { FOCO, formatearMonto } from "@/components/catalogo/formato";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResumenPagos } from "@/lib/financiamiento/cuotas";
import { fechaCorta } from "@/lib/financiamiento/fechas";
import { whatsappDe } from "@/lib/financiamiento/poliza";
import { borrarCliente } from "@/lib/financiamiento/repositorio";
import type {
  COLECCION_CLIENTES_CELULARES,
  COLECCION_CLIENTES_RCV,
} from "@/lib/financiamiento/tipos";
import { firebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

/** Piezas compartidas por /clientes/celulares y /clientes/rcv (D032). */

export type Coleccion =
  | typeof COLECCION_CLIENTES_CELULARES
  | typeof COLECCION_CLIENTES_RCV;

export type EstadoClientes<T> =
  | { tipo: "cargando" }
  | { tipo: "sin-acceso" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; clientes: T[] };

/** Como `useRcv`: espera la sesión y escucha la colección en vivo. */
export function useClientes<T>(
  escuchar: (
    alCambiar: (c: T[]) => void,
    alFallar: (e: FirestoreError) => void,
  ) => () => void,
): EstadoClientes<T> {
  const [estado, setEstado] = useState<EstadoClientes<T>>({
    tipo: "cargando",
  });
  useEffect(() => {
    let dejar: (() => void) | null = null;
    const dejarAuth = onAuthStateChanged(firebaseAuth(), (usuario) => {
      dejar?.();
      dejar = null;
      if (!usuario) {
        setEstado({ tipo: "sin-acceso" });
        return;
      }
      setEstado({ tipo: "cargando" });
      dejar = escuchar(
        (clientes) => setEstado({ tipo: "listo", clientes }),
        (error) =>
          setEstado(
            error.code === "permission-denied"
              ? { tipo: "sin-acceso" }
              : { tipo: "error", mensaje: error.message },
          ),
      );
    });
    return () => {
      dejarAuth();
      dejar?.();
    };
  }, [escuchar]);
  return estado;
}

export function Encabezado({
  resumen,
  accion,
}: {
  resumen?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-semibold">
            Clientes con financiamiento
          </h1>
          {resumen && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {resumen}
            </p>
          )}
        </div>
        {accion}
      </div>
      <Subnavegacion />
    </div>
  );
}

const SUBSECCIONES = [
  { href: "/clientes/celulares", nombre: "Celulares" },
  { href: "/clientes/rcv", nombre: "Póliza RCV" },
] as const;

function Subnavegacion() {
  const ruta = usePathname();
  return (
    <nav aria-label="Tipo de financiamiento">
      <ul className="flex gap-6 border-b">
        {SUBSECCIONES.map(({ href, nombre }) => {
          const actual = ruta === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center border-b-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring rounded-t-md",
                  actual
                    ? "border-success text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  FOCO,
                )}
              >
                {nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Esqueleto, sin acceso o error mientras la lista no está lista. */
export function EstadoCarga({
  estado,
}: {
  estado: Exclude<EstadoClientes<unknown>, { tipo: "listo" }>;
}) {
  return (
    <div className="grid gap-6">
      <Encabezado />
      {estado.tipo === "cargando" ? (
        <div className="grid gap-3" aria-busy="true">
          <output className="sr-only">Cargando los clientes…</output>
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-32 w-full" />
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
          titulo="No se pudieron cargar los clientes"
          texto={`Revisa tu conexión y recarga la página. Detalle: ${estado.mensaje}`}
        />
      )}
    </div>
  );
}

/** Cifras de arriba: un número grande y su nombre. `tono` resalta lo que pide atención. */
export function Indicadores({
  items,
}: {
  items: { nombre: string; valor: string; tono?: "alerta" | "ok" }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((i) => (
        <div
          key={i.nombre}
          className="grid gap-0.5 rounded-xl border bg-card p-3 text-card-foreground"
        >
          <dt className="text-xs text-muted-foreground">{i.nombre}</dt>
          <dd
            className={cn(
              "text-xl font-semibold tabular-nums",
              i.tono === "alerta" && "text-destructive",
              i.tono === "ok" && "text-success",
            )}
          >
            {i.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Buscador({
  id,
  valor,
  alCambiar,
  etiqueta,
}: {
  id: string;
  valor: string;
  alCambiar: (v: string) => void;
  etiqueta: string;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        placeholder={etiqueta}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className={cn("h-11 pl-9", FOCO)}
        autoComplete="off"
      />
    </div>
  );
}

/** Fila de chips de filtro; en móvil, una sola fila con scroll horizontal. */
export function Filtros<K extends string>({
  etiqueta,
  opciones,
  actual,
  alElegir,
}: {
  etiqueta: string;
  opciones: { clave: K; nombre: string; n: number }[];
  actual: K;
  alElegir: (k: K) => void;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de botones de filtro, no un formulario
    <div
      role="group"
      aria-label={etiqueta}
      className="-mx-4 flex scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      {opciones.map((o) => (
        <button
          key={o.clave}
          type="button"
          aria-pressed={actual === o.clave}
          onClick={() => alElegir(o.clave)}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 whitespace-nowrap text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:border-ring",
            actual === o.clave
              ? "border-transparent bg-primary text-primary-foreground"
              : "bg-card hover:bg-muted",
          )}
        >
          {o.nombre} <span className="tabular-nums opacity-80">({o.n})</span>
        </button>
      ))}
    </div>
  );
}

/** Estado de las cuotas con ícono y texto (nunca solo color). */
export function BadgePagos({ r }: { r: ResumenPagos }) {
  if (r.estado === "pagado")
    return (
      <Badge variant="outline" className="border-success text-success">
        <CircleCheckIcon aria-hidden="true" />
        Pagado
      </Badge>
    );
  if (r.estado === "atrasado")
    return (
      <Badge variant="destructive">
        <TriangleAlertIcon aria-hidden="true" />
        {r.vencidas === 1
          ? "1 cuota atrasada"
          : `${r.vencidas} cuotas atrasadas`}
      </Badge>
    );
  return (
    <Badge variant="outline">
      <ClockIcon aria-hidden="true" />
      Al día
    </Badge>
  );
}

/** Barra de cuotas pagadas, con el texto que la explica. */
export function ProgresoPagos({ r }: { r: ResumenPagos }) {
  const porcentaje =
    r.total === 0 ? 0 : Math.round((r.pagadas / r.total) * 100);
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span>
          <strong className="tabular-nums">
            {r.pagadas} de {r.total}
          </strong>{" "}
          cuotas pagadas
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          Debe {formatearMonto(r.saldo)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Cuotas pagadas"
        aria-valuemin={0}
        aria-valuemax={r.total}
        aria-valuenow={r.pagadas}
        aria-valuetext={`${r.pagadas} de ${r.total} cuotas pagadas`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
            r.estado === "atrasado" ? "bg-destructive" : "bg-success",
          )}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      {r.proxima && (
        <p
          className={cn(
            "text-xs",
            r.estado === "atrasado"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {r.estado === "atrasado" ? "Atrasada desde" : "Próxima cuota:"}{" "}
          <span className="tabular-nums">
            {r.estado === "atrasado"
              ? `el ${fechaCorta(r.proxima.vence)} · ${formatearMonto(r.saldoVencido)} vencido`
              : `${formatearMonto(r.proxima.monto)} el ${fechaCorta(r.proxima.vence)}`}
          </span>
        </p>
      )}
    </div>
  );
}

/** Teléfono y WhatsApp como enlaces de 44 px. */
export function Contacto({ telefono }: { telefono: string }) {
  const wa = whatsappDe(telefono);
  const clase = cn(
    "inline-flex min-h-11 items-center rounded-md text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring",
    FOCO,
  );
  return (
    <p className="flex flex-wrap items-center gap-x-3 text-sm">
      <a href={`tel:${wa ? `+${wa}` : telefono}`} className={clase}>
        <span className="sr-only">Llamar al </span>
        {telefono}
      </a>
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noreferrer"
          className={clase}
        >
          WhatsApp<span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      )}
    </p>
  );
}

export function DialogoBorrarCliente({
  coleccion,
  cliente,
  alCerrar,
}: {
  coleccion: Coleccion;
  cliente: { id: string; nombre: string } | null;
  alCerrar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  async function borrar() {
    if (!cliente) return;
    setOcupado(true);
    try {
      await borrarCliente(coleccion, cliente.id);
      toast.success(`Borraste a ${cliente.nombre}`);
      alCerrar();
    } catch (e) {
      toast.error("No se pudo borrar", {
        description: e instanceof Error ? e.message : undefined,
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
          <AlertDialogTitle>¿Borrar a {cliente?.nombre}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borran para siempre sus datos y el registro de sus cuotas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={cn("h-11", FOCO)} disabled={ocupado}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className={cn("h-11 dark:bg-destructive/10", FOCO)}
            disabled={ocupado}
            onClick={borrar}
          >
            Borrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Campo de texto con etiqueta, ayuda y error, como en los otros formularios del panel. */
export function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  className,
  ...input
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
} & React.ComponentProps<"input">) {
  const describe = [error && `${id}-error`, ayuda && `${id}-ayuda`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe || undefined}
        className={cn("h-11", FOCO)}
        autoComplete="off"
        {...input}
      />
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AreaTexto({
  id,
  etiqueta,
  error,
  ...area
}: {
  id: string;
  etiqueta: string;
  error?: string;
} & React.ComponentProps<"textarea">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive md:text-sm dark:bg-input/30",
          FOCO,
        )}
        {...area}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Coincide con nombre, cédula, teléfono u otros textos, sin importar acentos. */
export function coincide(busqueda: string, ...textos: string[]): boolean {
  const n = (t: string) =>
    t
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const q = n(busqueda.trim());
  if (!q) return true;
  const digitos = q.replace(/\D/g, "");
  return textos.some(
    (t) =>
      n(t).includes(q) ||
      (digitos.length >= 3 && t.replace(/\D/g, "").includes(digitos)),
  );
}
