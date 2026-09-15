"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ImagePlus, X, Star } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  noticiasApi,
  resolveApiAssetUrl,
  toApiAssetPath,
  uploadFile,
} from "@/lib/api";
import type { OutputData } from "@editorjs/editorjs";
import type { EditorHandle } from "@/components/EditorWrapper";

const EditorWrapper = dynamic(() => import("@/components/EditorWrapper"), { ssr: false });

function generarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function transformEditorImageUrls(data: OutputData, transform: (url: string) => string): OutputData {
  return {
    ...data,
    blocks: (data.blocks || []).map((block) => {
      if (block.type !== "image" || !block.data?.file?.url) return block;

      return {
        ...block,
        data: {
          ...block.data,
          file: {
            ...block.data.file,
            url: transform(block.data.file.url),
          },
        },
      };
    }),
  };
}

export default function EditarNoticiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const editorRef = useRef<EditorHandle>(null);
  const portadaFileRef = useRef<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [currentSlug, setCurrentSlug] = useState("");
  const [activo, setActivo] = useState(true);
  const [destacado, setDestacado] = useState(false);
  const [imagenPortada, setImagenPortada] = useState<string | null>(null);
  const [portadaPreview, setPortadaPreview] = useState<string | null>(null);
  const [contenidoData, setContenidoData] = useState<OutputData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const noticia = await noticiasApi.getBySlug(slug);
        setTitulo(noticia.titulo);
        setCurrentSlug(noticia.slug || slug);
        setActivo(noticia.activo ?? true);
        setDestacado(noticia.destacado ?? false);
        setImagenPortada(noticia.imagenPortada || null);
        setPortadaPreview(resolveApiAssetUrl(noticia.imagenPortada));

        if (noticia.contenido) {
          try {
            const parsed = JSON.parse(noticia.contenido) as OutputData;
            setContenidoData(transformEditorImageUrls(parsed, resolveApiAssetUrl));
          } catch {
            setContenidoData(undefined);
          }
        }
      } catch {
        toast.error("Error al cargar la noticia");
        router.push("/noticias");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, router]);

  const handlePortadaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    portadaFileRef.current = file;
    setImagenPortada(null);
    setPortadaPreview(URL.createObjectURL(file));
  };

  const removePortada = () => {
    portadaFileRef.current = null;
    setImagenPortada(null);
    setPortadaPreview(null);
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("El titulo es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const output = await editorRef.current?.getData();
      const blocks = output?.blocks || [];
      const pendingFiles = editorRef.current?.getPendingFiles() || new Map();

      for (const block of blocks) {
        if (block.type === "image" && block.data?.file?.tempId) {
          const tempId = block.data.file.tempId;
          const file = pendingFiles.get(tempId);
          if (file) {
            const serverUrl = await uploadFile(file, "imagenes-noticias");
            block.data.file.url = serverUrl;
            delete block.data.file.tempId;
          }
        }
      }

      let portadaUrl = imagenPortada;
      if (portadaFileRef.current) {
        portadaUrl = await uploadFile(portadaFileRef.current, "imagenes-noticias");
        portadaFileRef.current = null;
      }

      const normalized = transformEditorImageUrls(
        { time: output?.time || Date.now(), blocks, version: output?.version || "2.31.6" },
        (url) => toApiAssetPath(url) || url
      );

      await noticiasApi.update(slug, {
        titulo: titulo.trim(),
        slug: currentSlug || generarSlug(titulo),
        contenido: JSON.stringify(normalized),
        imagenPortada: toApiAssetPath(portadaUrl),
        activo,
        destacado,
      });
      toast.success("Noticia actualizada correctamente");
      router.push("/noticias");
    } catch {
      toast.error("Error al actualizar la noticia");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <p className="text-brand-text-muted">Cargando noticia...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/noticias"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border text-brand-text-muted transition-all hover:bg-white hover:text-brand-dark"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Editar noticia</h1>
            <p className="mt-0.5 text-sm text-brand-text-muted">
              Ajusta la informacion, portada y contenido publicado.
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm">
        <div className="border-b border-brand-border/70 bg-brand-cream/30 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">
            Informacion principal
          </h2>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="titulo" className="text-sm font-semibold text-brand-text">
                Titulo
              </Label>
              <Input
                id="titulo"
                name="titulo"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  setCurrentSlug(generarSlug(e.target.value));
                }}
                placeholder="Titulo de la noticia"
                className="h-12 border-brand-border px-4 text-lg font-semibold"
              />
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-cream/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">Estado</p>
                  <p className="text-xs text-brand-text-muted">
                    Controla si la noticia queda publicada o como borrador.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activo}
                    onClick={() => setActivo(!activo)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      activo ? "bg-brand-green" : "bg-brand-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        activo ? "translate-x-[22px]" : "translate-x-[2px]"
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-semibold ${activo ? "text-brand-green" : "text-brand-text-muted"}`}>
                    {activo ? "Publicado" : "Borrador"}
                  </span>
                  <button
                    type="button"
                    aria-pressed={destacado}
                    onClick={() => setDestacado(!destacado)}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                      destacado
                        ? "border-brand-gold/40 bg-brand-gold/15 text-brand-gold"
                        : "border-brand-border bg-white text-brand-text-muted hover:text-brand-dark"
                    }`}
                  >
                    <Star className={`h-4 w-4 ${destacado ? "fill-current" : ""}`} />
                    Destacado
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-brand-text">Imagen de portada</Label>
            {portadaPreview ? (
              <div className="relative overflow-hidden rounded-lg border border-brand-border bg-brand-cream">
                <img src={portadaPreview} alt="Portada" className="h-56 w-full object-cover" />
                <button
                  type="button"
                  onClick={removePortada}
                  className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow transition-colors hover:bg-white"
                >
                  <X className="h-4 w-4 text-red-500" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="portada-upload"
                className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand-border bg-brand-cream/30 transition-all hover:border-brand-green/40 hover:bg-brand-cream/60"
              >
                <div className="flex flex-col items-center gap-1.5 text-brand-text-muted">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-medium">Imagen de portada</span>
                  <span className="text-xs">PNG, JPG o WebP</span>
                </div>
              </label>
            )}
            <input
              id="portada-upload"
              name="portada-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePortadaUpload}
              className="sr-only"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-brand-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-border/70 bg-brand-cream/30 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Contenido</h2>
          <span className="text-xs text-brand-text-muted bg-brand-cream px-2.5 py-1 rounded-md">Editor enriquecido</span>
        </div>
        <div className="px-5 py-5">
          <div className="min-h-[520px] rounded-lg border border-brand-border/60 bg-white">
            {contenidoData ? (
              <EditorWrapper ref={editorRef} holder="editor-editar" data={contenidoData} />
            ) : (
              <EditorWrapper ref={editorRef} holder="editor-editar" />
            )}
          </div>
          <p className="mt-2 text-xs text-brand-text-muted">
            Usa el botón <span className="font-semibold">+</span> para añadir bloques: párrafos, imágenes, encabezados, listas y más.
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t border-brand-border/70 bg-brand-cream/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/noticias" className="w-full sm:w-auto">
            <Button variant="outline" className="h-10 w-full border-brand-border sm:w-auto">
              Cancelar
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving || !titulo.trim()}
            className="h-10 bg-brand-green px-6 text-white hover:bg-brand-green/90"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Guardar cambios
              </span>
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}
