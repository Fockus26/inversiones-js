"use client";

import { CalendarClockIcon, MapPinIcon } from "lucide-react";
import { BADGE_LARGO, useClientes } from "@/components/clientes/comun";
import { Badge } from "@/components/ui/badge";
import { escucharSolicitudesCitas } from "@/lib/solicitudes/repositorio";
import {
  COLECCION_SOLICITUDES_CITAS,
  NOMBRES_ESTADO_CITA,
} from "@/lib/solicitudes/tipos";
import { cn } from "@/lib/utils";
import {
  cuantas,
  Encabezado,
  EnlaceWhatsapp,
  EstadoCarga,
  ListaSolicitudes,
} from "./comun";

/**
 * /solicitudes/citas (D043): citas de agencia de loterías. Las agendadas ya están en Google
 * Calendar; las demás hay que cuadrarlas escribiéndole al cliente.
 */
export function SolicitudesCitas() {
  const estado = useClientes(escucharSolicitudesCitas);
  if (estado.tipo !== "listo") return <EstadoCarga estado={estado} />;
  const solicitudes = estado.clientes;
  const porCuadrar = solicitudes.filter((s) => s.estado !== "agendada").length;
  return (
    <div className="grid gap-6">
      <Encabezado
        resumen={[
          cuantas(solicitudes.length),
          porCuadrar > 0 ? `${porCuadrar} por cuadrar a mano` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <ListaSolicitudes
        coleccion={COLECCION_SOLICITUDES_CITAS}
        solicitudes={solicitudes}
        vacio="Cuando alguien pida una cita de agencia de loterías en el chat, aquí verás el horario y la dirección que dejó."
        contenido={(s) => (
          <>
            <div className="flex flex-wrap gap-1">
              {s.estado === "agendada" ? (
                <Badge
                  variant="outline"
                  className={cn(BADGE_LARGO, "border-success text-success")}
                >
                  Agendada en el calendario
                </Badge>
              ) : (
                <Badge variant="destructive" className={BADGE_LARGO}>
                  Por cuadrar: {NOMBRES_ESTADO_CITA[s.estado].toLowerCase()}
                </Badge>
              )}
            </div>
            {s.horario && (
              <p className="flex items-center gap-2">
                <CalendarClockIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span>
                  <span className="sr-only">Horario: </span>
                  <strong>{s.horario}</strong>
                </span>
              </p>
            )}
            {s.direccion && (
              <p className="flex items-start gap-2">
                <MapPinIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="wrap-anywhere">
                  <span className="sr-only">Dirección y contacto: </span>
                  {s.direccion}
                </span>
              </p>
            )}
            <ul className="grid gap-0.5">
              <EnlaceWhatsapp whatsapp={s.whatsapp} />
            </ul>
          </>
        )}
      />
    </div>
  );
}
