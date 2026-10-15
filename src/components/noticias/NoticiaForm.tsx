"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Eye, Lock, Pencil, Save, Star } from "lucide-react";
import { toast } from "sonner";
import type { OutputData } from "@editorjs/editorjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageDropField } from "@/components/media/ImageDropField";
import type { EditorHandle } from "@/components/EditorWrapper";
import { noticiasApi, resolveApiAssetUrl, uploadFile, type Noticia } from "@/lib/api";
import { slugify } from "@/lib/mappers";
import { fileToDataUrl, inlineBlobUrls, openPreview, SITE_URL } from "@/lib/preview";

const EditorWrapper = dynamic(() => import("@/components/EditorWrapper"), {
  ssr: false,
  loading: () => <div className="min-h-[420px] animate-pulse rounded-lg bg-brand-cream/40" />,
});

/** ISO → valor para <input type="datetime-local"> en hora local. */
function toLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Normalización suave mientras se escribe (permite el guion final); la definitiva se aplica al guardar. */
function slugDraft(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-");
}

type Block = { type: string; data: Record<string, unknown> & { file?: { url?: string; tempId?: string } } };

interface NoticiaFormProps {
  /** Noticia existente; si falta, el formulario crea una nueva. */
  noticia?: Noticia;
}

export function NoticiaForm({ noticia }: NoticiaFormProps) {
  const isEdit = Boolean(noticia);
  const router = useRouter();
  const editorRef = useRef<EditorHandle>(null);

  const [titulo, setTitulo] = useState(noticia?.titulo ?? "");
  const [slug, setSlug] = useState(noticia?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [slugUnlocked, setSlugUnlocked] = useState(!isEdit);
  const [fecha, setFecha] = useState(toLocalInput(noticia?.fechaPublicacion));
  const [activo, setActivo] = useState(noticia?.activo ?? true);
  const [destacado, setDestacado] = useState(noticia?.destacado ?? false);
  const [portadaUrl, setPortadaUrl] = useState<string | null>(noticia?.imagenPortada ?? null);
  const [portadaFile, setPortadaFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [initialContent] = useState<OutputData | undefined>(() => {
    if (!noticia?.contenido) return undefined;
    try {
      const parsed = JSON.parse(noticia.contenido) as OutputData;
      return Array.isArray(parsed.blocks) ? parsed : undefined;
    } catch {
      return undefined;
    }
  });
  const legacyContent = Boolean(noticia?.contenido && !initialContent);

  const markDirty = () => setDirty(true);

  // Contenido heredado (HTML) que el editor no puede abrir: se conserva intacto
  // mientras el editor siga vacío, para no perderlo al guardar otros campos.
  const legacyKept = (content: { blocks: Block[] }) => legacyContent && content.blocks.length === 0;
  const serialize = (content: { blocks: Block[]; time: number; version: string }) =>
    legacyKept(content) ? noticia!.contenido : JSON.stringify(content);

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty || saving) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  const handleTitulo = (value: string) => {
    setTitulo(value);
    if (!slugTouched) setSlug(value.trim() ? slugify(value) : "");
    markDirty();
  };

  /** Lee el editor y valida bloques que no se pueden guardar. */
  const readContent = async (): Promise<{ blocks: Block[]; time: number; version: string } | null> => {
    const output = await editorRef.current?.getData();
    const blocks = (output?.blocks ?? []) as Block[];
    const invalid = blocks.find((b) => b.type === "video" && b.data?.invalid);
    if (invalid) {
      toast.error("Hay un video con un enlace no compatible. Corrígelo o elimina ese bloque.");
      return null;
    }
    return { blocks, time: output?.time ?? Date.now(), version: output?.version ?? "2.31.6" };
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const content = await readContent();
      if (!content) return;
      const win = openPreview({
        titulo: titulo.trim(),
        contenido: legacyKept(content) ? noticia!.contenido : await inlineBlobUrls(JSON.stringify(content)),
        imagenPortada: portadaFile ? await fileToDataUrl(portadaFile) : portadaUrl,
        fechaPublicacion: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
        destacado,
      });
      if (!win) toast.error("El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar la vista previa");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!fecha || Number.isNaN(new Date(fecha).getTime())) {
      toast.error("Indica una fecha de publicación válida");
      return;
    }

    setSaving(true);
    try {
      const content = await readContent();
      if (!content) return;

      // Sube las imágenes nuevas del contenido (solo las que siguen en el documento).
      const pendingFiles = editorRef.current?.getPendingFiles() ?? new Map<string, File>();
      for (const block of content.blocks) {
        const tempId = block.type === "image" ? block.data.file?.tempId : undefined;
        if (!tempId) continue;
        const file = pendingFiles.get(tempId);
        if (file) {
          block.data.file = { url: await uploadFile(file, "imagenes-noticias") };
          pendingFiles.delete(tempId);
        }
      }

      let portada = portadaUrl;
      if (portadaFile) portada = await uploadFile(portadaFile, "imagenes-noticias");

      const payload = {
        titulo: titulo.trim(),
        contenido: serialize(content),
        imagenPortada: portada ?? "",
        fechaPublicacion: new Date(fecha).toISOString(),
        activo,
        destacado,
      };

      if (isEdit) {
        await noticiasApi.update(noticia!.slug!, { ...payload, slug: slugUnlocked ? slug : undefined });
        toast.success("Noticia actualizada");
      } else {
        await noticiasApi.create({ ...payload, slug: slug || slugify(titulo) });
        toast.success(activo ? "Noticia publicada" : "Borrador guardado");
      }
      setDirty(false);
      router.push("/noticias");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? `No se pudo guardar: ${err.message}` : "No se pudo guardar la noticia");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = `${SITE_URL}/noticias/${slug || "…"}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/noticias"
            aria-label="Volver a noticias"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-text-muted transition-colors hover:text-brand-dark"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-brand-dark">{isEdit ? "Editar noticia" : "Nueva noticia"}</h1>
            <p className="text-sm text-brand-text-muted">
              {dirty ? "Cambios sin guardar" : "Texto, imágenes y videos en un mismo editor"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={previewing || saving}
            className="h-10 flex-1 border-brand-border bg-white sm:flex-none"
          >
            <Eye className="mr-2 h-4 w-4" />
            {previewing ? "Preparando…" : "Vista previa"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !titulo.trim()}
            className="h-10 flex-1 bg-brand-green px-5 text-white hover:bg-brand-green/90 sm:flex-none"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isEdit ? "Guardar cambios" : activo ? "Publicar" : "Guardar borrador"}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Columna principal */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-brand-border bg-white p-4 shadow-sm sm:p-5">
            <Label htmlFor="titulo" className="text-sm font-semibold text-brand-text">
              Título *
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => handleTitulo(e.target.value)}
              placeholder="Ej: Coodmilla inaugura nuevo centro de acopio"
              className="mt-1.5 h-12 border-brand-border px-4 text-lg font-semibold"
            />
            <div className="mt-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-brand-text-muted">
                <span>Dirección pública:</span>
                <span className="min-w-0 break-all font-mono text-brand-dark">{publicUrl}</span>
                {isEdit && !slugUnlocked && (
                  <button
                    type="button"
                    onClick={() => setSlugUnlocked(true)}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-brand-green hover:bg-brand-green/10"
                  >
                    <Pencil className="h-3 w-3" /> Cambiar
                  </button>
                )}
              </div>
              {slugUnlocked && (
                <div className="space-y-1">
                  <Input
                    aria-label="Dirección (slug)"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugDraft(e.target.value));
                      setSlugTouched(true);
                      markDirty();
                    }}
                    className="h-9 border-brand-border font-mono text-sm"
                  />
                  {isEdit && (
                    <p className="flex items-center gap-1 text-xs text-amber-700">
                      <Lock className="h-3 w-3" /> Cambiar la dirección rompe los enlaces que ya se hayan compartido.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-brand-border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border/70 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Contenido</h2>
              <span className="text-xs text-brand-text-muted">
                Pulsa <strong>+</strong> para añadir imágenes, videos, títulos, listas, citas o enlaces
              </span>
            </div>
            {legacyContent && (
              <p className="mx-4 mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:mx-5">
                Esta noticia tiene contenido en un formato antiguo que el editor no puede abrir. Se conservará tal cual
                mientras no escribas contenido nuevo aquí.
              </p>
            )}
            <div className="px-2 py-3 sm:px-4">
              <EditorWrapper ref={editorRef} holder="editor-noticia" data={initialContent} onChange={markDirty} />
            </div>
          </section>
        </div>

        {/* Columna lateral */}
        <aside className="min-w-0 space-y-6">
          <section className="space-y-4 rounded-lg border border-brand-border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Publicación</h2>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-brand-dark">Estado</p>
                <p className="text-xs text-brand-text-muted">{activo ? "Visible en el sitio" : "Borrador (oculta)"}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={activo}
                aria-label="Publicada"
                onClick={() => {
                  setActivo(!activo);
                  markDirty();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  activo ? "bg-brand-green" : "bg-brand-border"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    activo ? "translate-x-[22px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              aria-pressed={destacado}
              onClick={() => {
                setDestacado(!destacado);
                markDirty();
              }}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                destacado
                  ? "border-brand-gold/40 bg-brand-gold/15 text-[#9a5c08]"
                  : "border-brand-border bg-white text-brand-text-muted hover:text-brand-dark"
              }`}
            >
              <Star className={`h-4 w-4 shrink-0 ${destacado ? "fill-current" : ""}`} />
              <span>
                Noticia destacada
                <span className="block text-xs font-normal opacity-80">Se muestra en grande al inicio de Noticias</span>
              </span>
            </button>

            <div className="space-y-1.5">
              <Label htmlFor="fecha" className="text-sm font-medium text-brand-dark">
                Fecha de publicación
              </Label>
              <Input
                id="fecha"
                type="datetime-local"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  markDirty();
                }}
                className="h-10 border-brand-border"
              />
              <p className="text-xs text-brand-text-muted">Define el orden en el listado de noticias.</p>
            </div>
          </section>

          <section className="rounded-lg border border-brand-border bg-white p-4 shadow-sm sm:p-5">
            <ImageDropField
              label="Imagen de portada"
              hint="Se usa en las tarjetas y al compartir. Recomendado 1600×900"
              currentUrl={portadaUrl ? resolveApiAssetUrl(portadaUrl) : null}
              file={portadaFile}
              onFileChange={(f) => {
                setPortadaFile(f);
                markDirty();
              }}
              onRemoveCurrent={
                portadaUrl
                  ? () => {
                      setPortadaUrl(null);
                      markDirty();
                    }
                  : undefined
              }
            />
            <p className="mt-2 text-xs text-brand-text-muted">
              Sin portada, las tarjetas usan la primera imagen o video del contenido.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
