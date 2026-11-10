"use client";

import {
  CircleAlertIcon,
  InboxIcon,
  LockIcon,
  MessageCircleIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Aviso } from "@/components/catalogo/catalogo-productos";
import { haceCuanto } from "@/components/catalogo/formato";
import type { EstadoClientes } from "@/components/clientes/comun";
import {
  ENTRADA,
  escalonado,
  TARJETA_VIVA,
} from "@/components/panel/animacion";
import { Subnavegacion } from "@/components/panel/subnavegacion";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { mensajeDeError } from "@/lib/data/errores";
import {
  borrarSolicitud,
  type ColeccionSolicitudes,
} from "@/lib/solicitudes/repositorio";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas por /solicitudes/celulares, /rcv y /citas (D043): lo que deja la gente en
 * el chat de WhatsApp. Antes llegaba como mensaje a los asesores; ahora solo se ve aquí.
 */

const SUBSECCIONES = [
  { href: "/solicitudes/celulares", nombre: "Celulares" },
  { href: "/solicitudes/rcv", nombre: "Póliza RCV" },
  { href: "/solicitudes/citas", nombre: "Citas" },
] as const;

export function Encabezado({ resumen }: { resumen?: string }) {
  return (
    <div className="grid gap-4">
      <div className="grid min-w-0 gap-1">
        <h1 className="text-2xl font-semibold">Solicitudes del chat</h1>
        {resumen && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resumen}
          </p>
        )}
      </div>
      <Subnavegacion etiqueta="Tipo de solicitud" secciones={SUBSECCIONES} />
    </div>
  );
}

export function cuantas(n: number): string {
  return `${n} ${n === 1 ? "solicitud" : "solicitudes"}`;
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
          <output className="sr-only">Cargando las solicitudes…</output>
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
          titulo="No se pudieron cargar las solicitudes"
          texto={`Revisa tu conexión y recarga la página. Detalle: ${estado.mensaje}`}
        />
      )}
    </div>
  );
}

const fechaLarga = new Intl.DateTimeFormat("es-VE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Caracas",
});

/** El perfil de WhatsApp puede no tener nombre: entonces se muestra el número. */
export function nombreDe(s: { nombre: string; whatsapp: string }): string {
  return s.nombre.trim() || (s.whatsapp ? `+${s.whatsapp}` : "Sin nombre");
}

export interface SolicitudBase {
  id: string;
  nombre: string;
  whatsapp: string;
  creadoEn?: Date | null;
}

/**
 * Lista de tarjetas, más nuevas primero (como las deja el bot). Cada tarjeta trae nombre, hace
 * cuánto llegó y el botón de borrar; `contenido` pone el resto.
 */
export function ListaSolicitudes<T extends SolicitudBase>({
  coleccion,
  solicitudes,
  vacio,
  contenido,
}: {
  coleccion: ColeccionSolicitudes;
  solicitudes: T[];
  vacio: string;
  contenido: (s: T) => React.ReactNode;
}) {
  const [borrando, setBorrando] = useState<T | null>(null);
  if (solicitudes.length === 0) {
    return (
      <Aviso
        icono={<InboxIcon aria-hidden="true" />}
        titulo="Todavía no hay solicitudes"
        texto={vacio}
      />
    );
  }
  return (
    <>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {solicitudes.map((s, i) => (
          <li
            key={s.id}
            style={escalonado(i)}
            className={cn(
              "grid content-start gap-2 rounded-xl border bg-card p-4 text-sm text-card-foreground",
              ENTRADA,
              TARJETA_VIVA,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-medium wrap-anywhere">{nombreDe(s)}</h2>
                {s.creadoEn && (
                  <p className="text-xs text-muted-foreground">
                    <time
                      dateTime={s.creadoEn.toISOString()}
                      title={fechaLarga.format(s.creadoEn)}
                    >
                      {haceCuanto(s.creadoEn)}
                    </time>
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                className={cn(
                  "size-11 shrink-0 text-destructive hover:text-destructive",
                )}
                onClick={() => setBorrando(s)}
                aria-label={`Borrar la solicitud de ${nombreDe(s)}`}
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </div>
            {contenido(s)}
          </li>
        ))}
      </ul>
      <DialogoBorrar
        coleccion={coleccion}
        solicitud={borrando}
        alCerrar={() => setBorrando(null)}
      />
    </>
  );
}

function DialogoBorrar({
  coleccion,
  solicitud,
  alCerrar,
}: {
  coleccion: ColeccionSolicitudes;
  solicitud: SolicitudBase | null;
  alCerrar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  async function borrar() {
    if (!solicitud) return;
    setOcupado(true);
    try {
      await borrarSolicitud(coleccion, solicitud.id);
      toast.success(`Borraste la solicitud de ${nombreDe(solicitud)}`);
      alCerrar();
    } catch (e) {
      toast.error("No se pudo borrar", { description: mensajeDeError(e) });
    } finally {
      setOcupado(false);
    }
  }
  return (
    <AlertDialog
      open={solicitud !== null}
      onOpenChange={(abierto) => {
        if (!abierto) alCerrar();
      }}
    >
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Borrar la solicitud de {solicitud ? nombreDe(solicitud) : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se borra para siempre, con sus datos de contacto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={cn("h-11")} disabled={ocupado}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className={cn("h-11")}
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

/** Enlace de contacto de 44 px (correo, teléfono o WhatsApp). */
export function EnlaceContacto({
  href,
  icono,
  texto,
  etiqueta,
}: {
  href: string;
  icono: React.ReactNode;
  texto: string;
  etiqueta: string;
}) {
  const externo = href.startsWith("http");
  return (
    <li>
      <a
        href={href}
        target={externo ? "_blank" : undefined}
        rel={externo ? "noreferrer" : undefined}
        className={cn(
          "inline-flex min-h-11 max-w-full items-center gap-2 rounded-md text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring [&>svg]:size-4 [&>svg]:shrink-0",
        )}
      >
        {icono}
        <span className="sr-only">{etiqueta}: </span>
        <span className="truncate">{texto}</span>
        {externo && <span className="sr-only"> (se abre en otra pestaña)</span>}
      </a>
    </li>
  );
}

export function EnlaceWhatsapp({ whatsapp }: { whatsapp: string }) {
  if (!whatsapp) return null;
  return (
    <EnlaceContacto
      href={`https://wa.me/${whatsapp}`}
      icono={<MessageCircleIcon aria-hidden="true" />}
      texto={`+${whatsapp}`}
      etiqueta="WhatsApp"
    />
  );
}
