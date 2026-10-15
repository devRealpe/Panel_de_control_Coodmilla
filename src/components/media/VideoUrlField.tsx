"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle, CheckCircle2, Link2, Play } from "lucide-react";
import {
  parseVideoUrl,
  SUPPORTED_VIDEO_PROVIDERS,
  videoEmbedUrl,
  videoIframeAllow,
  videoThumbnailUrl,
  videoWatchUrl,
  type VideoRef,
} from "@/lib/media/video";

interface VideoUrlFieldProps {
  /** Video actual (al editar). */
  value?: VideoRef | null;
  /** URL tal como la escribió el administrador (para conservarla al editar). */
  initialUrl?: string;
  onChange: (video: VideoRef | null, rawUrl: string) => void;
  label?: string;
  autoFocus?: boolean;
  /** Muestra la vista previa reproducible debajo del campo. */
  showPreview?: boolean;
}

/**
 * Campo reutilizable para añadir un video por enlace. Valida en vivo,
 * muestra mensajes claros y una vista previa reproducible con el reproductor
 * oficial. Se usa en el carrusel y en el bloque de video del editor de noticias.
 */
export function VideoUrlField({
  value,
  initialUrl,
  onChange,
  label = "Enlace del video",
  autoFocus,
  showPreview = true,
}: VideoUrlFieldProps) {
  const inputId = useId();
  const [raw, setRaw] = useState(initialUrl ?? (value ? videoWatchUrl(value) : ""));
  const [touched, setTouched] = useState(Boolean(initialUrl || value));
  // Clave del video que se está reproduciendo: si cambia el enlace, la vista previa vuelve a la miniatura.
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const result = raw.trim() ? parseVideoUrl(raw) : null;
  const video = result?.ok ? result.video : null;
  const error = touched && result && !result.ok ? result.error : null;

  // Notifica al padre cada vez que cambia el resultado de la validación.
  const videoKey = video ? `${video.provider}:${video.id}:${video.start ?? 0}` : "";
  useEffect(() => {
    onChange(video, raw.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoKey]);
  const playing = Boolean(videoKey) && playingKey === videoKey;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-brand-text">
        {label}
      </label>
      <div className="relative">
        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
        <input
          id={inputId}
          type="url"
          inputMode="url"
          autoFocus={autoFocus}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            if (!e.target.value.trim()) setTouched(false);
          }}
          onBlur={() => raw.trim() && setTouched(true)}
          onPaste={() => setTouched(true)}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-invalid={Boolean(error)}
          aria-describedby={`${inputId}-help`}
          className="h-10 w-full rounded-lg border border-brand-border bg-white pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-brand-text-muted/70 focus:border-brand-green focus:ring-2 focus:ring-brand-green/15 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100"
        />
        {video && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-green" aria-label="Enlace válido" />}
      </div>
      <p
        id={`${inputId}-help`}
        className={`flex items-start gap-1.5 text-xs ${error ? "text-red-600" : "text-brand-text-muted"}`}
        role={error ? "alert" : undefined}
      >
        {error ? (
          <>
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            {error}
          </>
        ) : (
          <>Pega el enlace del video ({SUPPORTED_VIDEO_PROVIDERS.join(", ")}). No hace falta subir archivos.</>
        )}
      </p>

      {showPreview && video && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-brand-border bg-brand-dark">
          {playing ? (
            <iframe
              src={videoEmbedUrl(video, { autoplay: true })}
              title="Vista previa del video"
              allow={videoIframeAllow(video)}
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlayingKey(videoKey)}
              className="group absolute inset-0 flex items-center justify-center"
              aria-label="Reproducir vista previa"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={videoThumbnailUrl(video)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-black/25" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6 fill-brand-dark text-brand-dark" />
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
