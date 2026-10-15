/**
 * Helpers compartidos para mapear filas snake_case ↔ camelCase y Storage.
 */

import { normalizeVideoRef } from "@/lib/media/video";

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200) || "item";
}

export function randomCodigoPublico(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `tr-${hex}`;
}

export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/**
 * URLs de Storage usadas por una noticia (portada + imágenes del contenido).
 * Sirve para borrar los archivos que dejan de usarse al editar o eliminar.
 */
export function noticiaMediaUrls(contenido: string | null | undefined, portada?: string | null): Set<string> {
  const urls = new Set<string>();
  if (portada && storagePathFromPublicUrl(portada)) urls.add(portada);
  if (!contenido) return urls;
  try {
    const doc = JSON.parse(contenido) as { blocks?: Array<{ type?: string; data?: { file?: { url?: string } } }> };
    for (const block of doc.blocks ?? []) {
      const url = block.type === "image" ? block.data?.file?.url : undefined;
      if (url && storagePathFromPublicUrl(url)) urls.add(url);
    }
  } catch {
    // contenido heredado (HTML / texto): no tiene imágenes gestionadas
  }
  return urls;
}

export type DbNoticia = {
  id: number;
  titulo: string;
  slug: string;
  contenido: string | null;
  imagen_portada: string | null;
  fecha_publicacion: string | null;
  activo: boolean;
  destacado: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DbCarrusel = {
  id: number;
  titulo: string;
  /** En videos es opcional (portada personalizada). */
  imagen_url: string | null;
  link_url: string | null;
  orden: number;
  activo: boolean;
  /** Columnas de la migración 002 (ausentes si aún no se aplicó). */
  tipo?: "imagen" | "video";
  video_proveedor?: string | null;
  video_id?: string | null;
  video_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DbPdf = {
  id: number;
  nombre: string;
  nombre_original: string | null;
  ruta_archivo: string;
  url: string;
  orden: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DbTrabajador = {
  id: number;
  codigo_publico: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  foto_url: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};

export function mapNoticia(row: DbNoticia) {
  return {
    id: row.id,
    titulo: row.titulo,
    slug: row.slug,
    contenido: row.contenido ?? "",
    imagenPortada: row.imagen_portada ?? undefined,
    fechaPublicacion: row.fecha_publicacion ?? undefined,
    activo: row.activo,
    destacado: row.destacado,
  };
}

export function mapCarrusel(row: DbCarrusel) {
  return {
    id: row.id,
    titulo: row.titulo,
    imagenUrl: row.imagen_url ?? "",
    linkUrl: row.link_url ?? undefined,
    tipo: (row.tipo === "video" ? "video" : "imagen") as "imagen" | "video",
    video: row.tipo === "video" ? normalizeVideoRef({ provider: row.video_proveedor, id: row.video_id }) : null,
    videoUrl: row.video_url ?? undefined,
    orden: row.orden,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPdf(row: DbPdf) {
  return {
    id: row.id,
    nombre: row.nombre,
    nombreOriginal: row.nombre_original ?? undefined,
    rutaArchivo: row.ruta_archivo,
    url: row.url,
    orden: row.orden,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function nombreCompleto(t: {
  primer_nombre: string;
  segundo_nombre?: string | null;
  primer_apellido: string;
  segundo_apellido?: string | null;
}) {
  return [t.primer_nombre, t.segundo_nombre, t.primer_apellido, t.segundo_apellido]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nombreCompletoPublico(t: {
  primer_nombre: string;
  segundo_nombre?: string | null;
  primer_apellido: string;
  segundo_apellido?: string | null;
}) {
  return [t.primer_apellido, t.segundo_apellido, t.primer_nombre, t.segundo_nombre]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapTrabajador(row: DbTrabajador) {
  return {
    id: row.id,
    codigoPublico: row.codigo_publico,
    primerNombre: row.primer_nombre,
    segundoNombre: row.segundo_nombre ?? undefined,
    primerApellido: row.primer_apellido,
    segundoApellido: row.segundo_apellido ?? undefined,
    nombreCompleto: nombreCompleto(row),
    fotoUrl: row.foto_url,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
