CREATE TABLE "admins" (
	"user_id" text PRIMARY KEY NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes_celulares" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"nombre" text NOT NULL,
	"cedula" text DEFAULT '' NOT NULL,
	"telefono" text NOT NULL,
	"equipo" text NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"pagos" jsonb NOT NULL,
	"actualizado_en" timestamp with time zone,
	"actualizado_por" text,
	CONSTRAINT "clientes_celulares_valido" CHECK (char_length("clientes_celulares"."nombre") between 1 and 80
  and char_length("clientes_celulares"."cedula") <= 20
  and char_length("clientes_celulares"."telefono") between 1 and 30
  and char_length("clientes_celulares"."notas") <= 500 and char_length("clientes_celulares"."equipo") between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "clientes_rcv" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"nombre" text NOT NULL,
	"cedula" text DEFAULT '' NOT NULL,
	"telefono" text NOT NULL,
	"correo" text DEFAULT '' NOT NULL,
	"direccion" text DEFAULT '' NOT NULL,
	"vehiculo" text NOT NULL,
	"placa" text DEFAULT '' NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"emision" date,
	"vence" date,
	"recordatorio30" boolean DEFAULT false NOT NULL,
	"recordatorio3" boolean DEFAULT false NOT NULL,
	"pagos" jsonb,
	"actualizado_en" timestamp with time zone,
	"actualizado_por" text,
	CONSTRAINT "clientes_rcv_valido" CHECK (char_length("clientes_rcv"."nombre") between 1 and 80
  and char_length("clientes_rcv"."cedula") <= 20
  and char_length("clientes_rcv"."telefono") between 1 and 30
  and char_length("clientes_rcv"."notas") <= 500
        and char_length("clientes_rcv"."correo") <= 120
        and char_length("clientes_rcv"."direccion") <= 200
        and char_length("clientes_rcv"."vehiculo") between 1 and 120
        and char_length("clientes_rcv"."placa") <= 12
        and (("clientes_rcv"."emision" is null and "clientes_rcv"."vence" is null)
          or ("clientes_rcv"."emision" between '2000-01-01' and '2099-12-31'
            and "clientes_rcv"."vence" between '2000-01-01' and '2099-12-31')))
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actualizado_en" timestamp with time zone,
	"actualizado_por" text
);
--> statement-breakpoint
CREATE TABLE "marcas" (
	"nombre" text PRIMARY KEY NOT NULL,
	"actualizado_en" timestamp with time zone,
	"actualizado_por" text,
	CONSTRAINT "marcas_nombre_valido" CHECK (char_length("marcas"."nombre") between 1 and 30 and "marcas"."nombre" ~ '^[A-Z0-9ÁÉÍÓÚÜÑ][A-Z0-9ÁÉÍÓÚÜÑ &.+-]*$')
);
--> statement-breakpoint
CREATE TABLE "planes_rcv" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"clase" text NOT NULL,
	"descripcion" text NOT NULL,
	"precio_eur" double precision,
	"categorias" text[] NOT NULL,
	"financiamiento" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" double precision NOT NULL,
	"actualizado_en" timestamp with time zone,
	"actualizado_por" text,
	CONSTRAINT "planes_rcv_valido" CHECK (char_length("planes_rcv"."clase") between 1 and 40
        and char_length("planes_rcv"."descripcion") between 1 and 120
        and ("planes_rcv"."precio_eur" is null or "planes_rcv"."precio_eur" between 0 and 100000)
        and cardinality("planes_rcv"."categorias") between 1 and 3
        and "planes_rcv"."categorias" <@ array['publico','privado','extranjeras']::text[])
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"marca" text NOT NULL,
	"nombre" text NOT NULL,
	"variante" text DEFAULT '' NOT NULL,
	"inicial" double precision NOT NULL,
	"cuota" double precision NOT NULL,
	"numero_cuotas" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" double precision NOT NULL,
	"actualizado_en" timestamp with time zone,
	"actualizado_por" text,
	CONSTRAINT "productos_valido" CHECK (char_length("productos"."nombre") between 1 and 80
        and char_length("productos"."variante") <= 20
        and "productos"."inicial" between 0 and 100000
        and "productos"."cuota" between 0 and 100000
        and "productos"."numero_cuotas" between 1 and 48
        and "productos"."cantidad" between 0 and 100000)
);
--> statement-breakpoint
CREATE TABLE "solicitudes_celulares" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"nombre" text NOT NULL,
	"whatsapp" text NOT NULL,
	"equipo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitudes_citas" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"nombre" text NOT NULL,
	"whatsapp" text NOT NULL,
	"estado" text NOT NULL,
	"horario" text,
	"direccion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solicitudes_citas_estado" CHECK ("solicitudes_citas"."estado" in ('agendada','sin-horarios','error-agenda'))
);
--> statement-breakpoint
CREATE TABLE "solicitudes_rcv" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"nombre" text NOT NULL,
	"correo" text DEFAULT '' NOT NULL,
	"telefono" text NOT NULL,
	"whatsapp" text NOT NULL,
	"categoria" text NOT NULL,
	"plan_id" text NOT NULL,
	"clase" text DEFAULT '' NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"vehiculo" text,
	"precio_eur" double precision,
	"precio_usd" double precision,
	"precio_bs" double precision,
	"precio_cop" double precision,
	"financiamiento" boolean,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solicitudes_rcv_categoria" CHECK ("solicitudes_rcv"."categoria" in ('publico','privado','extranjeras'))
);
--> statement-breakpoint
CREATE TABLE "suscripciones_push" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_id" text NOT NULL,
	"dispositivo" text DEFAULT '' NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suscripciones_push_endpoint_unique" UNIQUE("endpoint"),
	CONSTRAINT "suscripciones_push_valida" CHECK (char_length("suscripciones_push"."endpoint") between 1 and 1000
        and "suscripciones_push"."endpoint" ~ '^https://.+'
        and char_length("suscripciones_push"."p256dh") between 1 and 200
        and char_length("suscripciones_push"."auth") between 1 and 100
        and char_length("suscripciones_push"."dispositivo") <= 120)
);
--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_marcas_nombre_fk" FOREIGN KEY ("marca") REFERENCES "public"."marcas"("nombre") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "clientes_rcv_vence_index" ON "clientes_rcv" USING btree ("vence");--> statement-breakpoint
CREATE INDEX "productos_marca_orden_index" ON "productos" USING btree ("marca","orden");--> statement-breakpoint
CREATE INDEX "solicitudes_celulares_creado_en_index" ON "solicitudes_celulares" USING btree ("creado_en");--> statement-breakpoint
CREATE INDEX "solicitudes_citas_creado_en_index" ON "solicitudes_citas" USING btree ("creado_en");--> statement-breakpoint
CREATE INDEX "solicitudes_rcv_creado_en_index" ON "solicitudes_rcv" USING btree ("creado_en");