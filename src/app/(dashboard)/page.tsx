"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Images,
  Newspaper,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carrusel,
  Noticia,
  PDFDocumento,
  Trabajador,
  carruselApi,
  checkHealth,
  noticiasApi,
  pdfApi,
  trabajadoresApi,
} from "@/lib/api";

function formatDate(date?: string) {
  if (!date) return "Sin fecha";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Dashboard() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [documentos, setDocumentos] = useState<PDFDocumento[]>([]);
  const [carrusel, setCarrusel] = useState<Carrusel[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const backendOnline = await checkHealth();
      if (!mounted) return;
      setOnline(backendOnline);

      if (!backendOnline) {
        setNoticias([]);
        setDocumentos([]);
        setCarrusel([]);
        setTrabajadores([]);
        setLoading(false);
        return;
      }

      try {
        const [newsData, docsData, sliderData, trabajadoresData] = await Promise.all([
          noticiasApi.list(),
          pdfApi.list(),
          carruselApi.list(),
          trabajadoresApi.list(),
        ]);
        if (!mounted) return;
        setNoticias(newsData);
        setDocumentos(docsData);
        setCarrusel(sliderData);
        setTrabajadores(trabajadoresData);
      } catch {
        if (!mounted) return;
        setOnline(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const noticiasActivas = noticias.filter((n) => n.activo !== false).length;
    const destacadas = noticias.filter((n) => n.destacado).length;
    const documentosActivos = documentos.filter((d) => d.activo !== false).length;
    const carruselActivo = carrusel.filter((c) => c.activo !== false).length;
    const trabajadoresActivos = trabajadores.filter((t) => t.activo !== false).length;

    return [
      {
        title: "Noticias",
        value: noticias.length,
        detail: `${noticiasActivas} publicadas`,
        href: "/noticias",
        icon: Newspaper,
        color: "text-brand-green",
        bg: "bg-brand-green/10",
      },
      {
        title: "Destacadas",
        value: destacadas,
        detail: "prioridad editorial",
        href: "/noticias",
        icon: Star,
        color: "text-brand-gold",
        bg: "bg-brand-gold/10",
      },
      {
        title: "Documentos",
        value: documentos.length,
        detail: `${documentosActivos} activos`,
        href: "/documentos",
        icon: FileText,
        color: "text-brand-gold",
        bg: "bg-brand-gold/10",
      },
      {
        title: "Trabajadores",
        value: trabajadores.length,
        detail: `${trabajadoresActivos} activos`,
        href: "/trabajadores",
        icon: Users,
        color: "text-brand-green-light",
        bg: "bg-brand-green-light/10",
      },
      {
        title: "Carrusel",
        value: carrusel.length,
        detail: `${carruselActivo} visibles`,
        href: "/carrusel",
        icon: Images,
        color: "text-brand-green-light",
        bg: "bg-brand-green-light/10",
      },
    ];
  }, [noticias, documentos, carrusel, trabajadores]);

  const latestNews = useMemo(
    () =>
      [...noticias]
        .sort((a, b) => new Date(b.fechaPublicacion || 0).getTime() - new Date(a.fechaPublicacion || 0).getTime())
        .slice(0, 4),
    [noticias]
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Panel de Control</h1>
          <p className="mt-1 text-sm text-brand-text-muted">
            Vista general del contenido publicado en Coodmilla.
          </p>
        </div>
        <Badge
          variant="outline"
          className={`w-fit gap-2 px-3 py-1.5 ${
            online
              ? "border-brand-green/30 bg-brand-green/5 text-brand-green"
              : "border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {online ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {online === null ? "Verificando backend" : online ? "Backend conectado" : "Backend sin conexion"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link key={metric.title} href={metric.href}>
            <Card className="h-full border-brand-border transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <div className={`rounded-lg p-2.5 ${metric.bg}`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-brand-text-muted" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-sm font-medium text-brand-text-muted">
                  {metric.title}
                </CardTitle>
                <p className="mt-2 text-3xl font-bold text-brand-dark">
                  {loading ? "..." : metric.value}
                </p>
                <p className="mt-1 text-xs text-brand-text-muted">{metric.detail}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-brand-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-brand-border/70 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-brand-dark">Noticias recientes</h2>
              <p className="text-xs text-brand-text-muted">Ultimas publicaciones creadas o editadas.</p>
            </div>
            <Link href="/noticias/nueva">
              <Button size="sm" className="bg-brand-green text-white hover:bg-brand-green/90">
                <Plus className="mr-2 h-4 w-4" />
                Nueva
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-brand-border/70">
            {loading ? (
              <p className="px-5 py-8 text-sm text-brand-text-muted">Cargando contenido...</p>
            ) : latestNews.length === 0 ? (
              <p className="px-5 py-8 text-sm text-brand-text-muted">Todavia no hay noticias registradas.</p>
            ) : (
              latestNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/noticias/${item.slug}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-brand-cream/30"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-brand-dark">{item.titulo}</p>
                      {item.destacado && (
                        <Badge className="bg-brand-gold/15 text-brand-gold hover:bg-brand-gold/20">
                          <Star className="mr-1 h-3 w-3 fill-current" />
                          Destacada
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-brand-text-muted">
                      {formatDate(item.fechaPublicacion)} - {item.activo === false ? "Borrador" : "Publicada"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-text-muted" />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-brand-dark">Acciones rapidas</h2>
          <div className="mt-4 grid gap-2">
            <Link href="/noticias/nueva">
              <Button variant="outline" className="h-11 w-full justify-start border-brand-border">
                <Newspaper className="mr-2 h-4 w-4 text-brand-green" />
                Crear noticia
              </Button>
            </Link>
            <Link href="/documentos">
              <Button variant="outline" className="h-11 w-full justify-start border-brand-border">
                <FileText className="mr-2 h-4 w-4 text-brand-gold" />
                Subir PDF
              </Button>
            </Link>
            <Link href="/carrusel">
              <Button variant="outline" className="h-11 w-full justify-start border-brand-border">
                <Images className="mr-2 h-4 w-4 text-brand-green-light" />
                Editar carrusel
              </Button>
            </Link>
            <Link href="/trabajadores">
              <Button variant="outline" className="h-11 w-full justify-start border-brand-border">
                <Users className="mr-2 h-4 w-4 text-brand-green-light" />
                Gestionar trabajadores
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
