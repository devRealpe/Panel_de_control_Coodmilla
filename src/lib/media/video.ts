/**
 * Proveedores de video admitidos — validación, normalización e inserción segura.
 *
 * ⚠️ Archivo espejo, idéntico en los dos proyectos:
 *    - Coodmilla/lib/media/video.ts                     (sitio público)
 *    - ControlCodmilla/frontend/src/lib/media/video.ts  (panel de control)
 * Se despliegan por separado (sin paquete compartido): cualquier cambio debe
 * aplicarse en ambos. Verificación: `node scripts/check-mirrors.mjs`.
 *
 * Reglas de seguridad:
 * - Solo se aceptan proveedores registrados en `PROVIDERS`.
 * - Nunca se guarda ni se inserta HTML o una URL de iframe provista por el usuario:
 *   se extrae un identificador validado y la URL de inserción se reconstruye aquí.
 *
 * Para añadir otro proveedor (p. ej. Vimeo) basta con registrar un objeto
 * `VideoProvider` más en `PROVIDERS`; el resto del sistema no cambia.
 */

export type VideoProviderId = "youtube"

export interface VideoRef {
  provider: VideoProviderId
  /** Identificador validado del video en el proveedor. */
  id: string
  /** Segundo de inicio opcional (enteros ≥ 0). */
  start?: number
}

export interface VideoProvider {
  id: VideoProviderId
  label: string
  /** Devuelve la referencia si la URL pertenece a este proveedor; `null` si no. */
  parse(url: URL): VideoRef | null | "invalid"
  embedUrl(ref: VideoRef, opts?: { autoplay?: boolean }): string
  watchUrl(ref: VideoRef): string
  thumbnailUrl(ref: VideoRef): string
  /** Valor para el atributo `allow` del iframe (lo más restrictivo posible). */
  allow: string
}

// ─── YouTube ─────────────────────────────────────────────────────────────────

const YT_ID = /^[A-Za-z0-9_-]{11}$/
const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
])

function parseStart(value: string | null): number | undefined {
  if (!value) return undefined
  // Formatos: "90", "90s", "1m30s", "1h2m3s"
  if (/^\d+$/.test(value)) return Number(value)
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

const youtube: VideoProvider = {
  id: "youtube",
  label: "YouTube",
  allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen",
  parse(url) {
    const host = url.hostname.toLowerCase()
    if (!YT_HOSTS.has(host)) return null

    let id: string | null = null
    if (host === "youtu.be") {
      id = url.pathname.split("/")[1] ?? null
    } else {
      const parts = url.pathname.split("/").filter(Boolean)
      if (parts[0] === "watch") id = url.searchParams.get("v")
      else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null
      else if (parts.length === 0) id = url.searchParams.get("v")
    }

    // Es un dominio de YouTube pero no apunta a un video concreto
    // (canal, lista sin video, página de inicio…).
    if (!id || !YT_ID.test(id)) return "invalid"

    const start = parseStart(url.searchParams.get("t") ?? url.searchParams.get("start"))
    return start ? { provider: "youtube", id, start } : { provider: "youtube", id }
  },
  embedUrl(ref, opts) {
    // youtube-nocookie: modo de privacidad mejorada (sin cookies hasta reproducir).
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" })
    if (ref.start) params.set("start", String(ref.start))
    if (opts?.autoplay) params.set("autoplay", "1")
    return `https://www.youtube-nocookie.com/embed/${ref.id}?${params.toString()}`
  },
  watchUrl(ref) {
    return `https://www.youtube.com/watch?v=${ref.id}${ref.start ? `&t=${ref.start}s` : ""}`
  },
  thumbnailUrl(ref) {
    return `https://i.ytimg.com/vi/${ref.id}/hqdefault.jpg`
  },
}

// ─── Registro ────────────────────────────────────────────────────────────────

const PROVIDERS: Record<VideoProviderId, VideoProvider> = { youtube }

export const SUPPORTED_VIDEO_PROVIDERS = Object.values(PROVIDERS).map((p) => p.label)

export function getVideoProvider(id: string | undefined | null): VideoProvider | null {
  // hasOwn: evita que claves como "__proto__" o "toString" resuelvan al prototipo.
  return id && Object.hasOwn(PROVIDERS, id) ? PROVIDERS[id as VideoProviderId] : null
}

export type ParseVideoResult =
  | { ok: true; video: VideoRef }
  | { ok: false; error: string }

/**
 * Analiza una URL ingresada por el administrador.
 * Devuelve un mensaje en español listo para mostrar si no es compatible.
 */
export function parseVideoUrl(input: string): ParseVideoResult {
  const raw = (input ?? "").trim()
  if (!raw) return { ok: false, error: "Ingresa el enlace del video." }
  if (/<|>|"/.test(raw)) {
    return { ok: false, error: "Pega solo el enlace del video, no el código de inserción (iframe)." }
  }

  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return { ok: false, error: "El enlace no tiene un formato válido." }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "El enlace debe empezar por https://" }
  }

  for (const provider of Object.values(PROVIDERS)) {
    const result = provider.parse(url)
    if (result === "invalid") {
      return {
        ok: false,
        error: `El enlace es de ${provider.label} pero no apunta a un video concreto. Usa el enlace "Compartir" del video.`,
      }
    }
    if (result) return { ok: true, video: result }
  }

  return {
    ok: false,
    error: `Plataforma no compatible. Por ahora se admiten videos de: ${SUPPORTED_VIDEO_PROVIDERS.join(", ")}.`,
  }
}

/**
 * Normaliza una referencia almacenada (p. ej. JSON de una noticia) antes de
 * renderizarla. Rechaza cualquier dato que no cumpla el formato del proveedor.
 */
export function normalizeVideoRef(value: unknown): VideoRef | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const provider = getVideoProvider(typeof v.provider === "string" ? v.provider : null)
  if (!provider) return null
  if (typeof v.id !== "string") return null
  // Revalidamos el id reconstruyendo la URL canónica y analizándola de nuevo.
  const reparsed = provider.parse(new URL(provider.watchUrl({ provider: provider.id, id: v.id })))
  if (!reparsed || reparsed === "invalid" || reparsed.id !== v.id) return null
  const start = typeof v.start === "number" && Number.isFinite(v.start) && v.start > 0 ? Math.floor(v.start) : undefined
  return start ? { provider: provider.id, id: v.id, start } : { provider: provider.id, id: v.id }
}

export function videoEmbedUrl(ref: VideoRef, opts?: { autoplay?: boolean }): string {
  return PROVIDERS[ref.provider].embedUrl(ref, opts)
}

export function videoWatchUrl(ref: VideoRef): string {
  return PROVIDERS[ref.provider].watchUrl(ref)
}

export function videoThumbnailUrl(ref: VideoRef): string {
  return PROVIDERS[ref.provider].thumbnailUrl(ref)
}

export function videoIframeAllow(ref: VideoRef): string {
  return PROVIDERS[ref.provider].allow
}
