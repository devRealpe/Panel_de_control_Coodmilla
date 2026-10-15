"use client";

import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { API, BlockTool, BlockToolConstructorOptions, PasteEvent } from "@editorjs/editorjs";
import { VideoUrlField } from "@/components/media/VideoUrlField";
import { normalizeVideoRef, videoWatchUrl, type VideoRef } from "@/lib/media/video";

/**
 * Datos guardados por el bloque. Nunca se guarda HTML ni la URL del iframe:
 * solo proveedor + id validados (el sitio reconstruye la inserción).
 */
export interface VideoBlockData {
  provider?: string;
  id?: string;
  start?: number;
  /** Enlace original escrito por el administrador (se conserva al editar). */
  url?: string;
  caption?: string;
  stretched?: boolean;
  /** true si el enlace escrito no es compatible: el formulario bloquea el guardado. */
  invalid?: boolean;
}

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></svg>';
const ICON_STRETCH =
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';

const YOUTUBE_PASTE = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/\S+$/i;

function VideoBlockEditor({
  initial,
  onChange,
}: {
  initial: VideoBlockData;
  onChange: (patch: Partial<VideoBlockData>) => void;
}) {
  const initialRef = normalizeVideoRef(initial);
  const [caption, setCaption] = useState(initial.caption ?? "");

  return (
    <div className="cdx-video-block space-y-3 rounded-lg border border-brand-border bg-brand-cream/30 p-3 sm:p-4">
      <VideoUrlField
        value={initialRef}
        initialUrl={initial.url}
        autoFocus={!initial.url && !initialRef}
        onChange={(video: VideoRef | null, raw: string) =>
          onChange(
            video
              ? { provider: video.provider, id: video.id, start: video.start, url: raw, invalid: false }
              : { provider: undefined, id: undefined, start: undefined, url: raw, invalid: Boolean(raw) }
          )
        }
      />
      <input
        type="text"
        value={caption}
        onChange={(e) => {
          setCaption(e.target.value);
          onChange({ caption: e.target.value });
        }}
        placeholder="Descripción del video (opcional)"
        className="h-9 w-full rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
      />
    </div>
  );
}

export default class VideoTool implements BlockTool {
  private api: API;
  private data: VideoBlockData;
  private wrapper: HTMLElement | null = null;
  private root: Root | null = null;

  static get toolbox() {
    return { title: "Video", icon: ICON };
  }

  /** Permite Enter dentro de los campos sin crear un bloque nuevo. */
  static get enableLineBreaks() {
    return true;
  }

  static get pasteConfig() {
    return { patterns: { youtube: YOUTUBE_PASTE } };
  }

  constructor({ data, api }: BlockToolConstructorOptions<VideoBlockData>) {
    this.api = api;
    this.data = { ...(data ?? {}) };
  }

  render(): HTMLElement {
    this.wrapper = document.createElement("div");
    this.mount();
    return this.wrapper;
  }

  /**
   * React se monta en un nodo interno propio: EditorJS puede vaciar o retirar
   * `wrapper` al destruir el editor, pero nunca toca los hijos de `mountPoint`,
   * así que el desmontaje diferido de React siempre encuentra sus nodos.
   */
  private mount() {
    if (!this.wrapper) return;
    const previous = this.root;
    if (previous) setTimeout(() => previous.unmount(), 0);
    const mountPoint = document.createElement("div");
    this.wrapper.replaceChildren(mountPoint);
    this.root = createRoot(mountPoint);
    this.root.render(
      <VideoBlockEditor
        key={this.data.url ?? ""}
        initial={this.data}
        onChange={(patch) => {
          this.data = { ...this.data, ...patch };
        }}
      />
    );
  }

  onPaste(event: PasteEvent) {
    if (event.type !== "pattern") return;
    const url = String((event.detail as { data: string }).data ?? "");
    this.data = { ...this.data, url };
    this.mount();
  }

  renderSettings() {
    return [
      {
        icon: ICON_STRETCH,
        label: "Ancho completo",
        toggle: true,
        isActive: Boolean(this.data.stretched),
        closeOnActivate: true,
        onActivate: () => {
          this.data.stretched = !this.data.stretched;
          this.api.blocks.stretchBlock(this.api.blocks.getCurrentBlockIndex(), Boolean(this.data.stretched));
        },
      },
    ];
  }

  rendered() {
    if (this.data.stretched) {
      this.api.blocks.stretchBlock(this.api.blocks.getCurrentBlockIndex(), true);
    }
  }

  save(): VideoBlockData {
    const ref = normalizeVideoRef(this.data);
    const caption = (this.data.caption ?? "").trim();
    if (ref) {
      return {
        provider: ref.provider,
        id: ref.id,
        ...(ref.start ? { start: ref.start } : {}),
        url: this.data.url || videoWatchUrl(ref),
        ...(caption ? { caption } : {}),
        ...(this.data.stretched ? { stretched: true } : {}),
      };
    }
    return { url: this.data.url ?? "", invalid: Boolean(this.data.url), ...(caption ? { caption } : {}) };
  }

  /** Los bloques de video vacíos (sin enlace) se descartan al guardar. */
  validate(saved: VideoBlockData) {
    return Boolean(saved.id || saved.url);
  }

  destroy() {
    const root = this.root;
    this.root = null;
    // Desmontar fuera del ciclo de render de React/EditorJS.
    setTimeout(() => root?.unmount(), 0);
  }
}

/**
 * Convierte bloques "embed" heredados de YouTube al bloque de video actual al
 * abrir una noticia en el editor, para poder editarlos con la nueva interfaz.
 */
export function upgradeLegacyEmbeds<T extends { blocks?: Array<{ id?: string; type: string; data: Record<string, unknown> }> }>(
  doc: T
): T {
  if (!doc?.blocks) return doc;
  return {
    ...doc,
    blocks: doc.blocks.map((block) => {
      if (block.type !== "embed" || block.data?.service !== "youtube") return block;
      return {
        ...block,
        type: "video",
        data: { url: String(block.data.source ?? ""), caption: String(block.data.caption ?? "") },
      };
    }),
  };
}
