import { createClient } from "@/lib/supabase/client";
import {
  DbCarrusel,
  DbNoticia,
  DbPdf,
  DbTrabajador,
  mapCarrusel,
  mapNoticia,
  mapPdf,
  mapTrabajador,
  noticiaMediaUrls,
  randomCodigoPublico,
  slugify,
  storagePathFromPublicUrl,
} from "@/lib/mappers";
import { normalizeVideoRef, parseVideoUrl, type VideoRef } from "@/lib/media/video";

export type Noticia = {
  id?: number;
  titulo: string;
  slug?: string;
  contenido: string;
  imagenPortada?: string;
  fechaPublicacion?: string;
  activo?: boolean;
  destacado?: boolean;
};

export type Carrusel = {
  id?: number;
  titulo: string;
  imagenUrl: string;
  linkUrl?: string;
  tipo?: "imagen" | "video";
  video?: VideoRef | null;
  videoUrl?: string;
  orden?: number;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Trabajador = {
  id?: number;
  codigoPublico: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  nombreCompleto?: string;
  fotoUrl: string;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PDFDocumento = {
  id?: number;
  nombre: string;
  nombreOriginal?: string;
  rutaArchivo?: string;
  url?: string;
  orden?: number;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** URLs de Storage ya son absolutas; se mantienen por compatibilidad con el UI. */
export function resolveApiAssetUrl(url?: string | null): string {
  return url ?? "";
}

export function toApiAssetPath(url?: string | null): string | undefined {
  return url ?? undefined;
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    if (typeof window !== "undefined") {
      await supabase.auth.signOut().catch(() => undefined);
      window.location.href = "/login";
    }
    throw new Error("No autorizado");
  }
  return supabase;
}

async function ensureUniqueSlug(base: string, excludeId?: number): Promise<string> {
  const supabase = createClient();
  const candidate = base || "noticia";
  let n = 0;
  for (;;) {
    const slug = n === 0 ? candidate : `${candidate}-${n}`;
    const { data } = await supabase.from("noticias").select("id").eq("slug", slug).maybeSingle();
    if (!data || (excludeId != null && data.id === excludeId)) return slug;
    n += 1;
  }
}

async function uploadToMedia(folder: string, file: File, preferredName?: string): Promise<{ path: string; url: string }> {
  const supabase = await requireUser();
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const safeBase = (preferredName || file.name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";
  const path = `${folder}/${crypto.randomUUID()}-${safeBase}${ext && !safeBase.endsWith(ext) ? ext : ""}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function removeMediaByUrl(url?: string | null) {
  await removeMediaByUrls(url ? [url] : []);
}

/** Borra archivos del bucket. Un fallo aquí no debe deshacer la operación principal. */
async function removeMediaByUrls(urls: string[]) {
  const paths = urls.map((u) => storagePathFromPublicUrl(u)).filter((p): p is string => Boolean(p));
  if (!paths.length) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from("media").remove(paths);
  if (error) console.warn("[media] No se pudieron borrar archivos:", error.message);
}

export async function uploadFile(file: File, folder = "imagenes-noticias"): Promise<string> {
  const { url } = await uploadToMedia(folder, file);
  return url;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("noticias").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

export const noticiasApi = {
  async list() {
    const supabase = await requireUser();
    const { data, error } = await supabase
      .from("noticias")
      .select("*")
      .order("fecha_publicacion", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as DbNoticia[]).map(mapNoticia);
  },

  async getBySlug(slug: string) {
    const supabase = await requireUser();
    const { data, error } = await supabase.from("noticias").select("*").eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("la noticia no existe o fue eliminada");
    return mapNoticia(data as DbNoticia);
  },

  async create(input: Omit<Noticia, "id">) {
    const supabase = await requireUser();
    assertNoticiaValida(input);
    const base = slugify(input.slug || input.titulo);
    const slug = await ensureUniqueSlug(base);
    const { data, error } = await supabase
      .from("noticias")
      .insert({
        titulo: input.titulo,
        slug,
        contenido: input.contenido ?? "",
        imagen_portada: input.imagenPortada ?? null,
        fecha_publicacion: input.fechaPublicacion ?? new Date().toISOString(),
        activo: input.activo ?? true,
        destacado: input.destacado ?? false,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapNoticia(data as DbNoticia);
  },

  async update(slug: string, input: Partial<Noticia>) {
    const supabase = await requireUser();
    assertNoticiaValida(input);
    const { data: current, error: findErr } = await supabase
      .from("noticias")
      .select("*")
      .eq("slug", slug)
      .single();
    if (findErr) throw new Error(findErr.message);

    // El slug solo cambia si se envía explícitamente: editar el título no debe
    // romper los enlaces ya compartidos de la noticia.
    const nextSlug =
      input.slug && slugify(input.slug) !== current.slug
        ? await ensureUniqueSlug(slugify(input.slug), current.id)
        : current.slug;

    const { data, error } = await supabase
      .from("noticias")
      .update({
        titulo: input.titulo ?? current.titulo,
        slug: nextSlug,
        contenido: input.contenido ?? current.contenido,
        imagen_portada:
          input.imagenPortada !== undefined ? input.imagenPortada || null : current.imagen_portada,
        fecha_publicacion: input.fechaPublicacion ?? current.fecha_publicacion,
        activo: input.activo ?? current.activo,
        destacado: input.destacado ?? current.destacado,
      })
      .eq("id", current.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Borra del Storage las imágenes que la noticia dejó de usar.
    const before = noticiaMediaUrls(current.contenido, current.imagen_portada);
    const after = noticiaMediaUrls(data.contenido, data.imagen_portada);
    await removeMediaByUrls([...before].filter((u) => !after.has(u)));

    return mapNoticia(data as DbNoticia);
  },

  async delete(slug: string) {
    const supabase = await requireUser();
    const { data, error: findErr } = await supabase
      .from("noticias")
      .select("imagen_portada, contenido")
      .eq("slug", slug)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    const { error } = await supabase.from("noticias").delete().eq("slug", slug);
    if (error) throw new Error(error.message);
    await removeMediaByUrls([...noticiaMediaUrls(data?.contenido, data?.imagen_portada)]);
  },
};

/**
 * Validación de la noticia antes de persistirla (además de la del formulario):
 * los bloques de video deben referenciar un proveedor admitido con id válido.
 */
function assertNoticiaValida(input: Partial<Noticia>) {
  if (input.titulo !== undefined && !input.titulo.trim()) throw new Error("El título es obligatorio");
  if (!input.contenido) return;
  let doc: { blocks?: Array<{ type?: string; data?: Record<string, unknown> }> };
  try {
    doc = JSON.parse(input.contenido);
  } catch {
    throw new Error("El contenido no tiene un formato válido");
  }
  for (const block of doc.blocks ?? []) {
    if (block.type === "video" && !normalizeVideoRef(block.data)) {
      throw new Error("Hay un video con un enlace no compatible. Corrígelo o elimínalo antes de guardar.");
    }
  }
}

function formBool(fd: FormData, key: string, fallback = true): boolean {
  const v = fd.get(key);
  if (v == null || v === "") return fallback;
  return String(v) === "true" || v === "on" || v === "1";
}

function formStr(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

/** Enlaces del carrusel: solo http(s) o rutas internas (evita "javascript:" y similares). */
function safeLinkUrl(value?: string): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    // formato inválido
  }
  throw new Error("El enlace debe empezar por https:// o ser una ruta del sitio (por ejemplo /noticias)");
}

function carruselMediaFromForm(formData: FormData) {
  const tipo = formStr(formData, "tipo") === "video" ? "video" : "imagen";
  if (tipo === "imagen") {
    return { tipo, columns: { tipo, video_proveedor: null, video_id: null, video_url: null } } as const;
  }
  const raw = formStr(formData, "videoUrl") ?? "";
  const parsed = parseVideoUrl(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  return {
    tipo,
    columns: { tipo, video_proveedor: parsed.video.provider, video_id: parsed.video.id, video_url: raw },
  } as const;
}

function friendlyCarruselError(message: string): string {
  if (/column .*(tipo|video_)|schema cache/i.test(message)) {
    return "La base de datos aún no admite videos en el carrusel. Aplica la migración supabase/migrations/002_carrusel_videos.sql en Supabase.";
  }
  if (/carrusel_media_chk/.test(message)) return "El video no es válido o falta la imagen.";
  return message;
}

export const carruselApi = {
  async list() {
    const supabase = await requireUser();
    const { data, error } = await supabase.from("carrusel").select("*").order("orden", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as DbCarrusel[]).map(mapCarrusel);
  },

  async get(id: number) {
    const supabase = await requireUser();
    const { data, error } = await supabase.from("carrusel").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    return mapCarrusel(data as DbCarrusel);
  },

  async create(formData: FormData) {
    const supabase = await requireUser();
    const media = carruselMediaFromForm(formData);
    const file = formData.get("file");
    const hasFile = file instanceof File && file.size > 0;
    if (media.tipo === "imagen" && !hasFile) throw new Error("La imagen es obligatoria");
    const linkUrl = safeLinkUrl(formStr(formData, "linkUrl"));

    const { data: maxRow } = await supabase
      .from("carrusel")
      .select("orden")
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    const uploaded = hasFile ? await uploadToMedia("imagenes-carrusel", file as File) : null;
    const { data, error } = await supabase
      .from("carrusel")
      .insert({
        titulo: formStr(formData, "titulo") || "Sin título",
        imagen_url: uploaded?.url ?? null,
        link_url: linkUrl,
        activo: formBool(formData, "activo", true),
        orden: (maxRow?.orden ?? 0) + 1,
        // Las columnas de video solo se envían para videos: así las imágenes
        // siguen funcionando aunque la migración 002 aún no esté aplicada.
        ...(media.tipo === "video" ? media.columns : {}),
      })
      .select("*")
      .single();
    if (error) {
      await removeMediaByUrl(uploaded?.url);
      throw new Error(friendlyCarruselError(error.message));
    }
    return mapCarrusel(data as DbCarrusel);
  },

  async update(id: number, formData: FormData) {
    const supabase = await requireUser();
    const { data: current, error: findErr } = await supabase
      .from("carrusel")
      .select("*")
      .eq("id", id)
      .single();
    if (findErr) throw new Error(findErr.message);

    const migrated = "tipo" in current;
    const media = formData.has("tipo") ? carruselMediaFromForm(formData) : null;
    const tipo = media?.tipo ?? (current.tipo === "video" ? "video" : "imagen");

    let imagenUrl: string | null = current.imagen_url;
    const file = formData.get("file");
    const newFile = file instanceof File && file.size > 0;
    const removePoster = formStr(formData, "quitarImagen") === "true";
    if (tipo === "imagen" && !newFile && !imagenUrl) throw new Error("La imagen es obligatoria");

    const uploaded = newFile ? await uploadToMedia("imagenes-carrusel", file as File) : null;
    if (uploaded) imagenUrl = uploaded.url;
    else if (removePoster && tipo === "video") imagenUrl = null;

    const { data, error } = await supabase
      .from("carrusel")
      .update({
        titulo: formStr(formData, "titulo") ?? current.titulo,
        link_url: formData.has("linkUrl") ? safeLinkUrl(formStr(formData, "linkUrl")) : current.link_url,
        activo: formData.has("activo") ? formBool(formData, "activo", true) : current.activo,
        imagen_url: imagenUrl,
        ...(media && (migrated || media.tipo === "video") ? media.columns : {}),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      await removeMediaByUrl(uploaded?.url);
      throw new Error(friendlyCarruselError(error.message));
    }
    if (current.imagen_url && current.imagen_url !== data.imagen_url) await removeMediaByUrl(current.imagen_url);
    return mapCarrusel(data as DbCarrusel);
  },

  async delete(id: number) {
    const supabase = await requireUser();
    const { data } = await supabase.from("carrusel").select("imagen_url").eq("id", id).maybeSingle();
    await removeMediaByUrl(data?.imagen_url);
    const { error } = await supabase.from("carrusel").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async reordenar(ids: number[]) {
    const supabase = await requireUser();
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase.from("carrusel").update({ orden: i + 1 }).eq("id", ids[i]);
      if (error) throw new Error(error.message);
    }
    return this.list();
  },
};

export const pdfApi = {
  async list() {
    const supabase = await requireUser();
    const { data, error } = await supabase
      .from("pdf_documentos")
      .select("*")
      .order("orden", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as DbPdf[]).map(mapPdf);
  },

  async get(id: number) {
    const supabase = await requireUser();
    const { data, error } = await supabase.from("pdf_documentos").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    return mapPdf(data as DbPdf);
  },

  async create(formData: FormData) {
    const supabase = await requireUser();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("El PDF es obligatorio");

    const { data: maxRow } = await supabase
      .from("pdf_documentos")
      .select("orden")
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nombre = formStr(formData, "nombre") || file.name.replace(/\.pdf$/i, "");
    const uploaded = await uploadToMedia("archivos-pdf", file, nombre);
    const ordenRaw = formStr(formData, "orden");
    const { data, error } = await supabase
      .from("pdf_documentos")
      .insert({
        nombre,
        nombre_original: file.name,
        ruta_archivo: uploaded.path,
        url: uploaded.url,
        activo: formBool(formData, "activo", true),
        orden: ordenRaw ? Number(ordenRaw) : (maxRow?.orden ?? 0) + 1,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapPdf(data as DbPdf);
  },

  async update(id: number, formData: FormData) {
    const supabase = await requireUser();
    const { data: current, error: findErr } = await supabase
      .from("pdf_documentos")
      .select("*")
      .eq("id", id)
      .single();
    if (findErr) throw new Error(findErr.message);

    let url = current.url;
    let ruta = current.ruta_archivo;
    let nombreOriginal = current.nombre_original;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadToMedia("archivos-pdf", file, formStr(formData, "nombre"));
      await removeMediaByUrl(current.url);
      url = uploaded.url;
      ruta = uploaded.path;
      nombreOriginal = file.name;
    }

    const ordenRaw = formStr(formData, "orden");
    const { data, error } = await supabase
      .from("pdf_documentos")
      .update({
        nombre: formStr(formData, "nombre") ?? current.nombre,
        activo: formData.has("activo") ? formBool(formData, "activo", true) : current.activo,
        orden: ordenRaw ? Number(ordenRaw) : current.orden,
        url,
        ruta_archivo: ruta,
        nombre_original: nombreOriginal,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapPdf(data as DbPdf);
  },

  async delete(id: number) {
    const supabase = await requireUser();
    const { data } = await supabase.from("pdf_documentos").select("url").eq("id", id).maybeSingle();
    await removeMediaByUrl(data?.url);
    const { error } = await supabase.from("pdf_documentos").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async reordenar(ids: number[]) {
    const supabase = await requireUser();
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase.from("pdf_documentos").update({ orden: i + 1 }).eq("id", ids[i]);
      if (error) throw new Error(error.message);
    }
    return this.list();
  },
};

export const trabajadoresApi = {
  async list() {
    const supabase = await requireUser();
    const { data, error } = await supabase
      .from("trabajadores")
      .select("*")
      .order("primer_apellido", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as DbTrabajador[]).map(mapTrabajador);
  },

  async get(id: number) {
    const supabase = await requireUser();
    const { data, error } = await supabase.from("trabajadores").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    return mapTrabajador(data as DbTrabajador);
  },

  async getPublico(codigoPublico: string) {
    const supabase = await requireUser();
    const code = codigoPublico.replace(/^#/, "");
    const { data, error } = await supabase
      .from("trabajadores")
      .select("*")
      .eq("codigo_publico", code)
      .single();
    if (error) throw new Error(error.message);
    return mapTrabajador(data as DbTrabajador);
  },

  async create(formData: FormData) {
    const supabase = await requireUser();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("La foto es obligatoria");

    const primerNombre = formStr(formData, "primerNombre");
    const primerApellido = formStr(formData, "primerApellido");
    if (!primerNombre || !primerApellido) throw new Error("Nombre y primer apellido son obligatorios");

    let codigo = (formStr(formData, "codigoPublico") || randomCodigoPublico()).replace(/^#/, "");
    const { data: exists } = await supabase
      .from("trabajadores")
      .select("id")
      .eq("codigo_publico", codigo)
      .maybeSingle();
    if (exists) codigo = randomCodigoPublico();

    const uploaded = await uploadToMedia("imagenes-trabajadores", file);
    const { data, error } = await supabase
      .from("trabajadores")
      .insert({
        codigo_publico: codigo,
        primer_nombre: primerNombre,
        segundo_nombre: formStr(formData, "segundoNombre") ?? null,
        primer_apellido: primerApellido,
        segundo_apellido: formStr(formData, "segundoApellido") ?? null,
        foto_url: uploaded.url,
        activo: formBool(formData, "activo", true),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapTrabajador(data as DbTrabajador);
  },

  async update(id: number, formData: FormData) {
    const supabase = await requireUser();
    const { data: current, error: findErr } = await supabase
      .from("trabajadores")
      .select("*")
      .eq("id", id)
      .single();
    if (findErr) throw new Error(findErr.message);

    let fotoUrl = current.foto_url;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadToMedia("imagenes-trabajadores", file);
      await removeMediaByUrl(current.foto_url);
      fotoUrl = uploaded.url;
    }

    let codigo = formStr(formData, "codigoPublico");
    if (codigo) {
      codigo = codigo.replace(/^#/, "");
      if (codigo !== current.codigo_publico) {
        const { data: clash } = await supabase
          .from("trabajadores")
          .select("id")
          .eq("codigo_publico", codigo)
          .neq("id", id)
          .maybeSingle();
        if (clash) throw new Error("El código público ya está en uso");
      }
    }

    const { data, error } = await supabase
      .from("trabajadores")
      .update({
        codigo_publico: codigo ?? current.codigo_publico,
        primer_nombre: formStr(formData, "primerNombre") ?? current.primer_nombre,
        segundo_nombre: formData.has("segundoNombre")
          ? formStr(formData, "segundoNombre") ?? null
          : current.segundo_nombre,
        primer_apellido: formStr(formData, "primerApellido") ?? current.primer_apellido,
        segundo_apellido: formData.has("segundoApellido")
          ? formStr(formData, "segundoApellido") ?? null
          : current.segundo_apellido,
        foto_url: fotoUrl,
        activo: formData.has("activo") ? formBool(formData, "activo", true) : current.activo,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapTrabajador(data as DbTrabajador);
  },

  async delete(id: number) {
    const supabase = await requireUser();
    const { data } = await supabase.from("trabajadores").select("foto_url").eq("id", id).maybeSingle();
    await removeMediaByUrl(data?.foto_url);
    const { error } = await supabase.from("trabajadores").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
