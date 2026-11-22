import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { RegistroServiceWorker } from "@/components/pwa/registro-sw";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Base de las URLs absolutas (Open Graph). En Vercel, la URL de producción; fuera de Vercel,
// la de producción fija para que la imagen de la OG no apunte a localhost.
const urlDelSitio = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://inversiones-js.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(urlDelSitio),
  title: { default: "Panel · Inversiones JS", template: "%s · Inversiones JS" },
  description: "Panel administrativo del catálogo de Inversiones JS.",
  applicationName: "Inversiones JS",
  // Al compartir un enlace del panel (WhatsApp): quien lo abre sin sesión cae en el login, pero
  // la vista previa sale con nombre, descripción e imagen (`opengraph-image.tsx`). Las páginas
  // solo cambian `title`, así que este objeto se hereda entero y no pierde la imagen.
  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "Inversiones JS",
    title: "Inversiones JS · Panel",
    description: "Panel administrativo del catálogo de Inversiones JS.",
  },
  twitter: { card: "summary_large_image" },
  // Instalada en iPhone: sin barra del navegador y con la barra de estado en tinta.
  appleWebApp: {
    capable: true,
    title: "Inversiones JS",
    statusBarStyle: "black",
  },
};

// Con el teclado del teléfono abierto, Chrome en Android achica también el viewport de layout:
// los diálogos (max-h en dvh) se encogen y su pie con «Guardar» no queda tapado. Sin
// maximumScale ni userScalable: el zoom con dos dedos sigue disponible.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  // Barra del sistema del color de la cabecera (D035).
  themeColor: "#1c1f26",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <RegistroServiceWorker />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
