"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Newspaper, FileText, Images, Users, Info, UploadCloud, AlertCircle } from "lucide-react";

export default function AyudaPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Centro de Ayuda</h1>
        <p className="text-muted-foreground text-lg">
          Guía rápida para la administración y gestión del panel de control de Coodmilla.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Dashboard</CardTitle>
            </div>
            <CardDescription>Resumen estadístico y métricas de visitas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              El dashboard principal muestra un resumen estadístico de las visitas a la página web, segmentado por <strong>total histórico</strong>, <strong>visitas del mes</strong> y <strong>visitas de la semana</strong>.
            </p>
            <p>
              Utilice esta pantalla para monitorear el tráfico y alcance general de la plataforma.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-emerald-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Newspaper className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle>Noticias</CardTitle>
            </div>
            <CardDescription>Gestión de las publicaciones y comunicados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              En esta sección puede crear nuevas noticias que aparecerán en el portal principal de la cooperativa.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li><strong>Imagen principal:</strong> Cargue una imagen representativa en formato JPG o PNG.</li>
              <li><strong>Título y contenido:</strong> Asegúrese de escribir títulos claros y revisar la ortografía del contenido.</li>
              <li>Las noticias se muestran ordenadas por fecha de creación automáticamente.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-amber-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>Documentos DIAN-ESAL</CardTitle>
            </div>
            <CardDescription>Manejo de documentos normativos en formato PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Sección diseñada exclusivamente para subir la documentación exigida por entes reguladores.
            </p>
            <div className="bg-amber-50 p-3 rounded-md border border-amber-100 text-amber-900 flex gap-2 items-start mt-2">
              <UploadCloud className="h-5 w-5 shrink-0 mt-0.5" />
              <p>
                <strong>Importante:</strong> Solo se admiten archivos en formato <strong>.PDF</strong>. Cada documento requiere un nombre descriptivo, y seleccionar a qué mes y año corresponde para su correcta organización.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-purple-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Images className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Carrusel de Imágenes</CardTitle>
            </div>
            <CardDescription>Administración de las imágenes deslizantes del inicio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Las imágenes del carrusel son lo primero que ven los usuarios al ingresar a la página de Coodmilla.
            </p>
            <p>
              <strong>Recomendación:</strong> Suba imágenes en orientación <em>horizontal (apaisadas)</em> y con buena resolución para evitar que se vean pixeladas o distorsionadas en pantallas grandes.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-rose-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Users className="h-6 w-6 text-rose-600" />
              </div>
              <CardTitle>Trabajadores y Códigos QR</CardTitle>
            </div>
            <CardDescription>Gestión del personal y tarjetas de presentación digitales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Permite administrar el directorio de trabajadores de la cooperativa. Al agregar un trabajador debe incluir:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1 mb-2">
              <li>Fotografía del trabajador.</li>
              <li>Nombres completos, cargo y perfil profesional.</li>
              <li>Teléfono de contacto y correo electrónico.</li>
            </ul>
            <div className="bg-rose-50 p-3 rounded-md border border-rose-100 text-rose-900 flex gap-2 items-start">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <p>
                <strong>Códigos QR:</strong> El sistema genera automáticamente un Código QR único por cada trabajador que, al ser escaneado, redirige a una tarjeta de presentación digital con la información de contacto.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-slate-500 bg-slate-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-lg">
                <AlertCircle className="h-6 w-6 text-slate-700" />
              </div>
              <CardTitle>Recomendaciones Generales</CardTitle>
            </div>
            <CardDescription>Buenas prácticas para la carga de contenido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li><strong>Optimizar imágenes:</strong> Antes de subir fotos muy pesadas, intente reducir su tamaño para que la página cargue más rápido.</li>
              <li><strong>Revisión antes de publicar:</strong> Verifique la ortografía y la veracidad de los datos antes de guardarlos, ya que estos serán públicos.</li>
              <li><strong>Conexión a internet:</strong> Asegúrese de tener una conexión estable al subir archivos grandes como PDFs de múltiples páginas.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
