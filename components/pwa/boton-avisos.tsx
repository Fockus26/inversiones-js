"use client";

import {
  BellIcon,
  BellOffIcon,
  BellRingIcon,
  DownloadIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/mensaje-error";
import {
  activarPush,
  desactivarPush,
  type EstadoPush,
  estadoPush,
  instalada,
} from "@/lib/notificaciones/push";
import { cn } from "@/lib/utils";

const TEXTOS: Record<EstadoPush, string> = {
  activo: "Avisos de citas activados en este dispositivo",
  inactivo: "Activar avisos de citas nuevas",
  bloqueado: "Avisos bloqueados en este navegador",
  "ios-sin-instalar": "Para recibir avisos, instala el panel",
  "no-soportado": "Este navegador no recibe avisos",
  "sin-clave": "Avisos sin configurar",
};

/**
 * Campana de la cabecera (D035): activa o desactiva los avisos push de citas nuevas en este
 * teléfono. Si el navegador no puede, explica por qué en vez de esconderse.
 */
export function BotonAvisos({ className }: { className?: string }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const refrescar = useCallback(() => {
    estadoPush()
      .then(setEstado)
      .catch(() => setEstado("no-soportado"));
  }, []);
  useEffect(refrescar, [refrescar]);

  async function alternar() {
    if (!estado || ocupado) return;
    if (estado === "bloqueado") {
      toast.info("Los avisos están bloqueados", {
        description:
          "Ábrelos en los ajustes del sitio del navegador (candado junto a la dirección) y permite las notificaciones.",
      });
      return;
    }
    if (estado === "ios-sin-instalar") {
      toast.info("Instala el panel en tu iPhone", {
        description:
          "En Safari toca Compartir › «Agregar a inicio», abre el panel desde ese ícono y vuelve a tocar la campana.",
      });
      return;
    }
    if (estado === "no-soportado" || estado === "sin-clave") {
      toast.info(TEXTOS[estado], {
        description:
          estado === "sin-clave"
            ? "Falta la clave pública de avisos (NEXT_PUBLIC_VAPID_PUBLIC_KEY)."
            : "Prueba con Chrome en Android o con el panel instalado en iPhone.",
      });
      return;
    }
    setOcupado(true);
    try {
      if (estado === "activo") {
        await desactivarPush();
        setEstado("inactivo");
        toast.success("Desactivaste los avisos en este dispositivo");
      } else {
        const nuevo = await activarPush();
        setEstado(nuevo);
        if (nuevo === "activo")
          toast.success("Avisos activados", {
            description:
              "Te llegará una notificación cada vez que Gaby agende una cita.",
          });
      }
    } catch (e) {
      toast.error("No se pudieron cambiar los avisos", {
        description: mensajeDeError(e),
      });
      refrescar();
    } finally {
      setOcupado(false);
    }
  }

  const Icono = ocupado
    ? LoaderCircleIcon
    : estado === "activo"
      ? BellRingIcon
      : estado === "inactivo" || estado === null
        ? BellIcon
        : BellOffIcon;

  return (
    <Button
      variant="ghost"
      className={cn("size-11", className)}
      onClick={alternar}
      disabled={estado === null}
      aria-pressed={estado === "activo"}
      aria-label={estado ? TEXTOS[estado] : "Avisos de citas"}
      title={estado ? TEXTOS[estado] : undefined}
    >
      <Icono
        aria-hidden="true"
        className={cn("size-5", ocupado && "motion-safe:animate-spin")}
      />
    </Button>
  );
}

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** «Instalar app» cuando el navegador lo ofrece (Chrome, Edge); oculto si ya está instalada. */
export function BotonInstalar({ className }: { className?: string }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    if (instalada()) return;
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const instalado = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalado);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalado);
    };
  }, []);

  if (!evento) return null;
  return (
    <Button
      variant="ghost"
      className={cn("h-11 px-3", className)}
      onClick={async () => {
        await evento.prompt();
        const { outcome } = await evento.userChoice;
        if (outcome === "accepted") setEvento(null);
      }}
    >
      <DownloadIcon aria-hidden="true" className="size-5" />
      <span className="max-[480px]:sr-only">Instalar</span>
    </Button>
  );
}
