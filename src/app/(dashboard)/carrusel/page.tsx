"use client";

import { useEffect, useState, useCallback } from "react";
import { Images, Plus, Trash2, Pen, GripVertical, Search, Play, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { carruselApi, Carrusel, resolveApiAssetUrl } from "@/lib/api";
import { videoThumbnailUrl, type VideoRef } from "@/lib/media/video";
import { MediaTypeTabs, type MediaType } from "@/components/media/MediaTypeTabs";
import { VideoUrlField } from "@/components/media/VideoUrlField";
import { ImageDropField } from "@/components/media/ImageDropField";

/** Imagen a mostrar para un elemento: la subida, o la miniatura del video. */
function itemThumb(item: Carrusel): string {
  if (item.imagenUrl) return resolveApiAssetUrl(item.imagenUrl);
  if (item.tipo === "video" && item.video) return videoThumbnailUrl(item.video);
  return "";
}

function Thumb({ item, className }: { item: Carrusel; className: string }) {
  const src = itemThumb(item);
  return (
    <div className={`relative overflow-hidden bg-brand-cream ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-brand-text-muted">Sin imagen</div>
      )}
      {item.tipo === "video" && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/95">
            <Play className="ml-px h-3 w-3 fill-brand-dark text-brand-dark" />
          </span>
        </span>
      )}
    </div>
  );
}

function MiniCarruselPreview({ items }: { items: Carrusel[] }) {
  const activos = items.filter((i) => i.activo);
  if (activos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand-border bg-white p-8 text-center text-sm text-brand-text-muted">
        No hay elementos activos. Lo que añadas aparecerá aquí en el orden en que se mostrará en el sitio.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-cream/30 p-3">
      <ol className="flex gap-3">
        {activos.map((item, index) => (
          <li key={item.id} className="w-44 shrink-0 overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm sm:w-52">
            <Thumb item={item} className="aspect-[16/9]" />
            <p className="truncate p-2 text-xs font-medium text-brand-dark">
              {index + 1}. {item.titulo}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SortableItem({
  item,
  onEdit,
  onDelete,
  dragDisabled,
}: {
  item: Carrusel;
  onEdit: (d: Carrusel) => void;
  onDelete: (item: Carrusel) => void;
  dragDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id!,
    disabled: dragDisabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-border bg-white p-3 shadow-sm sm:flex-nowrap sm:px-4"
    >
      <button
        {...attributes}
        {...listeners}
        disabled={dragDisabled}
        aria-label={`Reordenar ${item.titulo}`}
        title={dragDisabled ? "Limpia la búsqueda para reordenar" : "Arrastra para reordenar"}
        className="flex h-9 w-7 cursor-grab touch-none items-center justify-center text-brand-text-muted hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <Thumb item={item} className="h-12 w-20 shrink-0 rounded-md border border-brand-border" />

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium text-brand-dark">{item.titulo}</p>
        <p className="flex items-center gap-1 truncate text-xs text-brand-text-muted">
          {item.tipo === "video" ? "Video de YouTube" : "Imagen"}
          {item.linkUrl && (
            <>
              <span aria-hidden>·</span>
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.linkUrl}</span>
            </>
          )}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Badge variant="outline" className="border-brand-border font-mono text-brand-text-muted">
          #{item.orden}
        </Badge>
        <Badge
          variant={item.activo ? "default" : "secondary"}
          className={item.activo ? "bg-brand-green-light/15 text-brand-green-light hover:bg-brand-green-light/20" : ""}
        >
          {item.activo ? "Activo" : "Inactivo"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-brand-text-muted hover:text-brand-green"
          onClick={() => onEdit(item)}
        >
          <Pen className="mr-1 h-3.5 w-3.5" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-brand-text-muted hover:text-red-500"
          onClick={() => onDelete(item)}
          aria-label={`Eliminar ${item.titulo}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

type FormState = {
  tipo: MediaType;
  titulo: string;
  linkUrl: string;
  activo: boolean;
  file: File | null;
  video: VideoRef | null;
  videoUrl: string;
  quitarImagen: boolean;
};

const EMPTY_FORM: FormState = {
  tipo: "imagen",
  titulo: "",
  linkUrl: "",
  activo: true,
  file: null,
  video: null,
  videoUrl: "",
  quitarImagen: false,
};

function formFromItem(item: Carrusel | null): FormState {
  if (!item) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    tipo: item.tipo ?? "imagen",
    titulo: item.titulo,
    linkUrl: item.linkUrl ?? "",
    activo: item.activo ?? true,
    video: item.video ?? null,
    videoUrl: item.videoUrl ?? "",
  };
}

/** Diálogo de alta/edición. Se monta al abrirse, con el estado inicial del elemento. */
function CarruselDialog({
  item,
  onClose,
  onSaved,
}: {
  item: Carrusel | null;
  onClose: () => void;
  onSaved: (saved: Carrusel, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formFromItem(item));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const currentImage = item?.imagenUrl && !form.quitarImagen ? resolveApiAssetUrl(item.imagenUrl) : null;
  const needsImage = form.tipo === "imagen" && !form.file && !currentImage;
  const needsVideo = form.tipo === "video" && !form.video;
  const canSave = form.titulo.trim() && !needsImage && !needsVideo && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("tipo", form.tipo);
      fd.append("titulo", form.titulo.trim());
      fd.append("linkUrl", form.linkUrl.trim());
      fd.append("activo", String(form.activo));
      if (form.file) fd.append("file", form.file);
      if (form.tipo === "video") fd.append("videoUrl", form.videoUrl);
      if (form.quitarImagen) fd.append("quitarImagen", "true");

      const saved = item ? await carruselApi.update(item.id!, fd) : await carruselApi.create(fd);
      onSaved(saved, !item);
      toast.success(item ? "Elemento actualizado" : "Elemento añadido al carrusel");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Editar elemento del carrusel" : "Añadir al carrusel"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <MediaTypeTabs value={form.tipo} onChange={(t) => set("tipo", t)} />

          {form.tipo === "imagen" ? (
            <ImageDropField
              label={item ? "Imagen" : "Imagen *"}
              currentUrl={currentImage}
              file={form.file}
              onFileChange={(f) => {
                set("file", f);
                if (f && !form.titulo) set("titulo", f.name.replace(/\.[^.]+$/, ""));
              }}
            />
          ) : (
            <>
              <VideoUrlField
                value={form.video}
                initialUrl={form.videoUrl || undefined}
                onChange={(video, raw) => setForm((f) => ({ ...f, video, videoUrl: raw }))}
              />
              <ImageDropField
                label="Portada personalizada (opcional)"
                hint="Si no subes una, se usa la miniatura del video"
                currentUrl={currentImage}
                file={form.file}
                onFileChange={(f) => set("file", f)}
                onRemoveCurrent={currentImage ? () => set("quitarImagen", true) : undefined}
              />
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="carrusel-titulo">Título *</Label>
            <Input
              id="carrusel-titulo"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Se muestra sobre la imagen o el video"
              className="h-10 border-brand-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="carrusel-link">Enlace “Conoce más” (opcional)</Label>
            <Input
              id="carrusel-link"
              value={form.linkUrl}
              onChange={(e) => set("linkUrl", e.target.value)}
              placeholder="https://… o /noticias"
              className="h-10 border-brand-border"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set("activo", e.target.checked)}
              className="h-4 w-4 rounded border-brand-border accent-brand-green"
            />
            Mostrar en el sitio (activo)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="bg-brand-green text-white hover:bg-brand-green/90">
            {saving ? "Guardando…" : item ? "Guardar cambios" : "Añadir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CarruselPage() {
  const [data, setData] = useState<Carrusel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; item: Carrusel | null }>({ open: false, item: null });
  const [deleteItem, setDeleteItem] = useState<Carrusel | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async () => {
    try {
      setData(await carruselApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el carrusel");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial: loading arranca en true y solo cambia cuando responde la API.
    let active = true;
    carruselApi
      .list()
      .then((items) => active && setData(items))
      .catch((err) => toast.error(err instanceof Error ? err.message : "No se pudo cargar el carrusel"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await carruselApi.delete(deleteItem.id!);
      setData((prev) => prev.filter((d) => d.id !== deleteItem.id));
      toast.success("Elemento eliminado");
      setDeleteItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = data.findIndex((d) => d.id === active.id);
    const newIndex = data.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...data];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setData(reordered);
    try {
      setData(await carruselApi.reordenar(reordered.map((d) => d.id!)));
    } catch {
      toast.error("Error al reordenar");
      fetchData();
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = data.filter((item) => item.titulo.toLowerCase().includes(term));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-green-light/10 p-2.5">
            <Images className="h-5 w-5 text-brand-green-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Carrusel</h1>
            <p className="text-sm text-brand-text-muted">Imágenes y videos de la portada y la página de servicios</p>
          </div>
        </div>
        <Button
          onClick={() => setDialog({ open: true, item: null })}
          className="h-10 bg-brand-green text-white hover:bg-brand-green/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Añadir imagen o video
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-text-muted">Orden en el sitio</h2>
        <MiniCarruselPreview items={data} />
      </section>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
        <Input
          placeholder="Buscar por título…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 border-brand-border bg-white pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-lg border border-brand-border bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-brand-border bg-white py-14 text-brand-text-muted">
          <Images className="mb-3 h-12 w-12 opacity-30" />
          <p>{search ? "No hay resultados para esta búsqueda." : "El carrusel está vacío. Añade el primer elemento."}</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((d) => d.id!)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {filtered.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  dragDisabled={Boolean(term)}
                  onEdit={(it) => setDialog({ open: true, item: it })}
                  onDelete={setDeleteItem}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {dialog.open && (
        <CarruselDialog
          key={dialog.item?.id ?? "nuevo"}
          item={dialog.item}
          onClose={() => setDialog({ open: false, item: null })}
          onSaved={(saved, isNew) =>
            setData((prev) => (isNew ? [...prev, saved] : prev.map((d) => (d.id === saved.id ? saved : d))))
          }
        />
      )}

      <Dialog open={deleteItem !== null} onOpenChange={(v) => !v && !deleting && setDeleteItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar elemento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-text-muted">
            ¿Eliminar <strong className="text-brand-dark">{deleteItem?.titulo}</strong> del carrusel? Si tiene una imagen subida,
            también se borrará el archivo. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
