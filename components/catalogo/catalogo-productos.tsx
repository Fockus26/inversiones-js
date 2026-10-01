"use client";

import {
  CircleAlertIcon,
  EyeOffIcon,
  LockIcon,
  PackageXIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MARCAS, type Marca, type ProductoConId } from "@/lib/catalogo/tipos";
import { cn } from "@/lib/utils";
import { CantidadRapida } from "./cantidad-rapida";
import { DialogoBorrar, nombreCompleto } from "./dialogo-borrar";
import { DialogoProducto } from "./dialogo-producto";
import {
  FOCO,
  formatearCuota,
  formatearMonto,
  normalizarBusqueda,
} from "./formato";
import { useCatalogo } from "./use-catalogo";

/**
 * /productos: lista del catálogo agrupada por marca. Móvil: tarjetas; ≥ md: tabla.
 * La cantidad se edita en la misma fila; el resto, en el diálogo.
 */
export function CatalogoProductos() {
  const estado = useCatalogo();

  return (
    <div className="grid gap-6">
      {estado.tipo === "listo" ? (
        <Lista productos={estado.productos} />
      ) : (
        <>
          <Encabezado />
          {estado.tipo === "cargando" ? (
            <Cargando />
          ) : estado.tipo === "sin-sesion" ? (
            <Aviso
              icono={<LockIcon aria-hidden="true" />}
              titulo="Inicia sesión para ver el catálogo"
              texto="Esta página es solo para el equipo de Inversiones JS."
              accion={
                <Link
                  href="/login"
                  className={cn(buttonVariants(), "h-11 px-4", FOCO)}
                >
                  Iniciar sesión
                </Link>
              }
            />
          ) : estado.tipo === "sin-acceso" ? (
            <Aviso
              icono={<LockIcon aria-hidden="true" />}
              titulo="Tu sesión no tiene acceso"
              texto="Tu cuenta no está en la lista de administradores. Pídele acceso al dueño del panel o entra con otra cuenta."
              accion={
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 px-4",
                    FOCO,
                  )}
                >
                  Entrar con otra cuenta
                </Link>
              }
            />
          ) : (
            <Aviso
              icono={<CircleAlertIcon aria-hidden="true" />}
              titulo="No se pudo cargar el catálogo"
              texto={`Revisa tu conexión y recarga la página. Detalle: ${estado.mensaje}`}
            />
          )}
        </>
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
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Productos</h1>
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

function Aviso({
  icono,
  titulo,
  texto,
  accion,
}: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed p-8 text-center [&>svg]:size-8 [&>svg]:text-muted-foreground">
      {icono}
      <h2 className="text-lg font-medium">{titulo}</h2>
      <p className="max-w-prose text-sm text-muted-foreground">{texto}</p>
      {accion}
    </div>
  );
}

function Cargando() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <output className="sr-only">Cargando productos…</output>
      {["a", "b", "c", "d"].map((k) => (
        <Skeleton key={k} className="h-24 w-full md:h-12" />
      ))}
    </div>
  );
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function Lista({ productos }: { productos: ProductoConId[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [marca, setMarca] = useState<Marca | null>(null);
  const [editando, setEditando] = useState<ProductoConId | null>(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [borrando, setBorrando] = useState<ProductoConId | null>(null);

  const conteoPorMarca = useMemo(() => {
    const c = new Map<Marca, number>();
    for (const p of productos) c.set(p.marca, (c.get(p.marca) ?? 0) + 1);
    return c;
  }, [productos]);

  const filtrados = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    return productos.filter(
      (p) =>
        (!marca || p.marca === marca) &&
        (!q ||
          normalizarBusqueda(`${p.nombre} ${p.variante}`).includes(q) ||
          normalizarBusqueda(nombreCompleto(p)).includes(q)),
    );
  }, [productos, busqueda, marca]);

  const grupos = useMemo(
    () =>
      MARCAS.map((m) => ({
        marca: m,
        productos: filtrados.filter((p) => p.marca === m),
      })).filter((g) => g.productos.length > 0),
    [filtrados],
  );

  const agotados = productos.filter((p) => p.cantidad === 0).length;
  const ocultos = productos.filter((p) => !p.activo).length;
  const resumen = [
    plural(productos.length, "producto", "productos"),
    plural(agotados, "agotado", "agotados"),
    ocultos > 0 ? plural(ocultos, "oculto", "ocultos") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const ordenNuevo =
    productos.reduce((max, p) => Math.max(max, p.orden), -1) + 1;

  function abrirEditar(p: ProductoConId | null) {
    setEditando(p);
    setDialogoAbierto(true);
  }

  return (
    <>
      <Encabezado
        resumen={resumen}
        accion={
          <Button
            className={cn("h-11 px-4", FOCO)}
            onClick={() => abrirEditar(null)}
          >
            <PlusIcon aria-hidden="true" />
            Nuevo producto
          </Button>
        }
      />

      <search className="grid gap-3">
        <div className="relative">
          <label htmlFor="buscar-producto" className="sr-only">
            Buscar por nombre o variante
          </label>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="buscar-producto"
            type="search"
            placeholder="Buscar por nombre o variante"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={cn("h-11 pl-9", FOCO)}
            autoComplete="off"
          />
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: grupo de botones de filtro, no un formulario */}
        <div
          role="group"
          aria-label="Filtrar por marca"
          className="flex flex-wrap gap-2"
        >
          <Chip activo={marca === null} onClick={() => setMarca(null)}>
            Todas <Contador n={productos.length} />
          </Chip>
          {MARCAS.map((m) => (
            <Chip
              key={m}
              activo={marca === m}
              onClick={() => setMarca(marca === m ? null : m)}
            >
              {m} <Contador n={conteoPorMarca.get(m) ?? 0} />
            </Chip>
          ))}
        </div>
      </search>

      {productos.length === 0 ? (
        <Aviso
          icono={<PackageXIcon aria-hidden="true" />}
          titulo="Todavía no hay productos"
          texto="Crea el primero con «Nuevo producto». El chatbot responderá con lo que cargues aquí."
        />
      ) : grupos.length === 0 ? (
        <Aviso
          icono={<SearchXIcon aria-hidden="true" />}
          titulo="Sin resultados"
          texto={`Ningún producto${marca ? ` de ${marca}` : ""} coincide con «${busqueda.trim()}».`}
          accion={
            <Button
              variant="outline"
              className={cn("h-11 px-4", FOCO)}
              onClick={() => {
                setBusqueda("");
                setMarca(null);
              }}
            >
              Limpiar búsqueda
            </Button>
          }
        />
      ) : (
        grupos.map((g) => (
          <section
            key={g.marca}
            aria-labelledby={`marca-${g.marca}`}
            className="grid gap-3"
          >
            <h2
              id={`marca-${g.marca}`}
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <span
                className="h-5 w-1 rounded-full bg-primary"
                aria-hidden="true"
              />
              {g.marca}
              <span className="text-sm font-normal text-muted-foreground">
                ({g.productos.length})
              </span>
            </h2>
            <Tarjetas
              productos={g.productos}
              alEditar={abrirEditar}
              alBorrar={setBorrando}
            />
            <Tabla
              marca={g.marca}
              productos={g.productos}
              alEditar={abrirEditar}
              alBorrar={setBorrando}
            />
          </section>
        ))
      )}

      <DialogoProducto
        abierto={dialogoAbierto}
        alCambiarAbierto={setDialogoAbierto}
        producto={editando}
        marcaInicial={marca ?? undefined}
        ordenNuevo={ordenNuevo}
        alPedirBorrar={(p) => {
          setDialogoAbierto(false);
          setBorrando(p);
        }}
      />
      <DialogoBorrar producto={borrando} alCerrar={() => setBorrando(null)} />
    </>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:border-ring",
        activo
          ? "border-transparent bg-primary text-primary-foreground"
          : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Contador({ n }: { n: number }) {
  return <span className="tabular-nums opacity-80">({n})</span>;
}

function Estado({ p }: { p: ProductoConId }) {
  return (
    <div className="flex flex-wrap gap-1">
      {p.cantidad === 0 && (
        <Badge
          variant="destructive"
          // En oscuro, el fondo /20 de shadcn deja el texto en 4.37:1; con /10 pasa de 4.5:1.
          className="dark:bg-destructive/10"
        >
          <PackageXIcon aria-hidden="true" />
          Agotado
        </Badge>
      )}
      {!p.activo && (
        <Badge variant="outline">
          <EyeOffIcon aria-hidden="true" />
          Oculto
        </Badge>
      )}
      {p.cantidad > 0 && p.activo && (
        <span className="text-xs text-success">Disponible</span>
      )}
    </div>
  );
}

interface PropsFilas {
  productos: ProductoConId[];
  alEditar: (p: ProductoConId) => void;
  alBorrar: (p: ProductoConId) => void;
}

function Acciones({
  p,
  alEditar,
  alBorrar,
}: { p: ProductoConId } & Omit<PropsFilas, "productos">) {
  const nombre = nombreCompleto(p);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        className={cn("h-11 px-3", FOCO)}
        onClick={() => alEditar(p)}
        aria-label={`Editar ${nombre}`}
      >
        <PencilIcon aria-hidden="true" />
        <span aria-hidden="true">Editar</span>
      </Button>
      <Button
        variant="ghost"
        className={cn("size-11 text-destructive hover:text-destructive", FOCO)}
        onClick={() => alBorrar(p)}
        aria-label={`Borrar ${nombre}`}
      >
        <Trash2Icon aria-hidden="true" />
      </Button>
    </div>
  );
}

function Tarjetas({ productos, alEditar, alBorrar }: PropsFilas) {
  return (
    <ul className="grid gap-3 md:hidden">
      {productos.map((p) => (
        <li
          key={p.id}
          className={cn(
            "grid gap-3 rounded-xl border bg-card p-4 text-card-foreground",
            !p.activo && "border-dashed",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium break-words">
                {p.nombre}{" "}
                {p.variante && (
                  <span className="text-muted-foreground">{p.variante}</span>
                )}
              </h3>
              <p className="text-sm">
                Inicial <strong>{formatearMonto(p.inicial)}</strong> ·{" "}
                {formatearCuota(p.numeroCuotas, p.cuota)}
              </p>
            </div>
            <Estado p={p} />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CantidadRapida
              id={p.id}
              cantidad={p.cantidad}
              nombre={nombreCompleto(p)}
            />
            <Acciones p={p} alEditar={alEditar} alBorrar={alBorrar} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Tabla({
  marca,
  productos,
  alEditar,
  alBorrar,
}: PropsFilas & { marca: Marca }) {
  return (
    <div className="hidden rounded-xl border bg-card md:block">
      <Table>
        <caption className="sr-only">Productos {marca}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Inicial</TableHead>
            <TableHead>Cuota</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium whitespace-normal">
                {p.nombre}{" "}
                {p.variante && (
                  <span className="text-muted-foreground">{p.variante}</span>
                )}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatearMonto(p.inicial)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatearCuota(p.numeroCuotas, p.cuota)}
              </TableCell>
              <TableCell>
                <CantidadRapida
                  id={p.id}
                  cantidad={p.cantidad}
                  nombre={nombreCompleto(p)}
                />
              </TableCell>
              <TableCell>
                <Estado p={p} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Acciones p={p} alEditar={alEditar} alBorrar={alBorrar} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
