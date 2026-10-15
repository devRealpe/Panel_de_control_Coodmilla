"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ImagePlus, X } from "lucide-react";

const DEFAULT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface ImageDropFieldProps {
  label: string;
  /** URL de la imagen actual (al editar). */
  currentUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Permite quitar la imagen actual (cuando es opcional). */
  onRemoveCurrent?: () => void;
  hint?: string;
  maxBytes?: number;
  aspect?: string;
}

/**
 * Selector de imagen con vista previa, validación de tipo/tamaño y opción de
 * reemplazar o quitar. Usado por el carrusel y la portada de noticias.
 */
export function ImageDropField({
  label,
  currentUrl,
  file,
  onFileChange,
  onRemoveCurrent,
  hint = "PNG, JPG, WebP o GIF · máx. 10 MB",
  maxBytes = 10 * 1024 * 1024,
  aspect = "aspect-[16/9]",
}: ImageDropFieldProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const preview = objectUrl ?? currentUrl ?? null;

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!DEFAULT_TYPES.includes(f.type)) {
      setError("Formato no admitido. Usa PNG, JPG, WebP o GIF.");
      return;
    }
    if (f.size > maxBytes) {
      setError(`La imagen supera ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      return;
    }
    setError(null);
    onFileChange(f);
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-semibold text-brand-text">{label}</span>
      {preview ? (
        <div className={`relative ${aspect} overflow-hidden rounded-lg border border-brand-border bg-brand-cream`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2.5">
            <label
              htmlFor={id}
              className="cursor-pointer rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-dark shadow hover:bg-white"
            >
              Reemplazar
            </label>
            {(file || onRemoveCurrent) && (
              <button
                type="button"
                onClick={() => {
                  if (file) onFileChange(null);
                  else onRemoveCurrent?.();
                }}
                className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-600 shadow hover:bg-white"
              >
                <X className="h-3.5 w-3.5" />
                {file && currentUrl ? "Descartar cambio" : "Quitar"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex ${aspect} cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-border bg-brand-cream/30 px-4 text-center text-brand-text-muted transition-colors hover:border-brand-green/40 hover:bg-brand-cream/60 hover:text-brand-green`}
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm font-medium">Haz clic o arrastra una imagen</span>
          <span className="text-xs">{hint}</span>
        </label>
      )}
      <input
        id={id}
        type="file"
        accept={DEFAULT_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
