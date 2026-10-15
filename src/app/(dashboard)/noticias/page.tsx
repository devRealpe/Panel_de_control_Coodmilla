"use client";

import { useEffect, useState } from "react";
import { Images, Newspaper, Plus, Search, Star, Video } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { noticiasApi, Noticia, resolveApiAssetUrl } from "@/lib/api";
import { normalizeVideoRef, videoThumbnailUrl } from "@/lib/media/video";

function formatDate(date?: string) {
  if (!date) return "Sin fecha";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Imagen para la tarjeta y número de imágenes/videos del contenido. */
function contentMedia(contenido?: string): { thumb: string | null; images: number; videos: number } {
  const result = { thumb: null as string | null, images: 0, videos: 0 };
  if (!contenido) return result;
  try {
    const parsed = JSON.parse(contenido) as { blocks?: Array<{ type?: string; data?: Record<string, unknown> }> };
    for (const block of parsed.blocks ?? []) {
      if (block.type === "image") {
        result.images += 1;
        const url = (block.data?.file as { url?: string } | undefined)?.url;
        if (!result.thumb && url) result.thumb = url;
      } else if (block.type === "video" || block.type === "embed") {
        result.videos += 1;
        const ref = block.type === "video" ? normalizeVideoRef(block.data) : null;
        if (!result.thumb && ref) result.thumb = videoThumbnailUrl(ref);
      }
    }
  } catch {
    // contenido heredado
  }
  return result;
}

function getExcerpt(contenido?: string) {
  if (!contenido) return "Sin resumen disponible.";

  try {
    const parsed = JSON.parse(contenido);
    const paragraph = parsed.blocks?.find((block: { type?: string; data?: { text?: string } }) =>
      block.type === "paragraph" && block.data?.text
    );
    const text = paragraph?.data?.text?.replace(/<[^>]+>/g, "").trim();
    return text || "Sin resumen disponible.";
  } catch {
    return "Sin resumen disponible.";
  }
}

export default function NoticiasPage() {
  const [data, setData] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"activos" | "inactivos">("activos");
  const [search, setSearch] = useState("");
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    noticiasApi
      .list()
      .then((all) => {
        if (mounted) setData(all);
      })
      .catch((err) => {
        if (mounted) setData([]);
        toast.error(err instanceof Error ? err.message : "No se pudieron cargar las noticias");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = data.filter((n) => {
    const matchTab = tab === "activos" ? n.activo !== false : n.activo === false;
    const term = search.toLowerCase();
    const matchSearch =
      search === "" ||
      [n.titulo, n.slug, n.fechaPublicacion, n.destacado ? "destacado" : ""].some((v) =>
        String(v || "").toLowerCase().includes(term)
      );
    return matchTab && matchSearch;
  }).sort((a, b) => {
    if ((a.destacado ?? false) !== (b.destacado ?? false)) {
      return a.destacado ? -1 : 1;
    }
    return new Date(b.fechaPublicacion || 0).getTime() - new Date(a.fechaPublicacion || 0).getTime();
  });

  const handleDelete = async (slug: string) => {
    try {
      await noticiasApi.delete(slug);
      setData((prev) => prev.filter((n) => n.slug !== slug));
      toast.success("Noticia eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? `Error al eliminar: ${err.message}` : "Error al eliminar la noticia");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-green/10 p-2.5">
            <Newspaper className="h-5 w-5 text-brand-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Noticias</h1>
            <p className="text-sm text-brand-text-muted">
              Administra las noticias del sitio web
            </p>
          </div>
        </div>

        <Link href="/noticias/nueva" className="w-full md:w-auto">
          <Button className="h-10 w-full bg-brand-green px-4 text-white hover:bg-brand-green/90 md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nueva noticia
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-fit gap-1 rounded-lg border border-brand-border bg-brand-cream p-1">
            <button
              onClick={() => setTab("activos")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "activos"
                  ? "bg-white text-brand-green shadow-sm"
                  : "text-brand-text-muted hover:text-brand-dark"
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setTab("inactivos")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "inactivos"
                  ? "bg-white text-brand-green shadow-sm"
                  : "text-brand-text-muted hover:text-brand-dark"
              }`}
            >
              Inactivos
            </button>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-brand-border bg-brand-cream/20 pl-9"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-lg border border-brand-border bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-brand-border bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-cream">
            <Newspaper className="h-6 w-6 text-brand-text-muted" />
          </div>
          <p className="font-semibold text-brand-dark">No hay noticias en esta categoría.</p>
          <p className="mt-1 text-sm text-brand-text-muted">
            Cambia el filtro o crea una nueva noticia.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const media = contentMedia(item.contenido);
            const thumb = item.imagenPortada ? resolveApiAssetUrl(item.imagenPortada) : media.thumb;
            return (
            <article
              key={item.id}
              className="flex min-h-[340px] flex-col overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-40 bg-brand-cream">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={item.titulo}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-brand-cream">
                    <Newspaper className="h-10 w-10 text-brand-text-muted/50" />
                  </div>
                )}
                <Badge
                  variant={item.activo ? "default" : "secondary"}
                  className={`absolute left-3 top-3 ${
                    item.activo
                      ? "bg-brand-green text-white"
                      : "bg-brand-dark/80 text-white"
                  }`}
                >
                  {item.activo ? "Activo" : "Inactivo"}
                </Badge>
                {item.destacado && (
                  <Badge className="absolute right-3 top-3 bg-brand-gold text-white">
                    <Star className="mr-1 h-3 w-3 fill-current" />
                    Destacado
                  </Badge>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                  {formatDate(item.fechaPublicacion)}
                </p>
                <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-brand-dark">
                  {item.titulo}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-text-muted">
                  {getExcerpt(item.contenido)}
                </p>
                {(media.images > 0 || media.videos > 0) && (
                  <p className="mt-auto flex gap-3 pt-3 text-xs text-brand-text-muted">
                    {media.images > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Images className="h-3.5 w-3.5" /> {media.images} {media.images === 1 ? "imagen" : "imágenes"}
                      </span>
                    )}
                    {media.videos > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" /> {media.videos} {media.videos === 1 ? "video" : "videos"}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-brand-border bg-brand-cream/25 px-4 py-3">
                <Link
                  href={`/noticias/${item.slug}`}
                  className="text-sm font-semibold text-brand-green hover:underline"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  className="text-sm font-semibold text-red-600 hover:underline"
                  onClick={() => setDeleteSlug(item.slug!)}
                >
                  Eliminar
                </button>
              </div>
            </article>
            );
          })}
        </div>
      )}

      <Dialog open={deleteSlug !== null} onOpenChange={(v) => !v && setDeleteSlug(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-text-muted">
            Esta acción no se puede deshacer y eliminará las imágenes y archivos asociados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSlug(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteSlug !== null) handleDelete(deleteSlug);
                setDeleteSlug(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
