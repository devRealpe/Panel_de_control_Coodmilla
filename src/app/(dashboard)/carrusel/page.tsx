"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Images,
  Plus,
  Trash2,
  Pen,
  GripVertical,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { carruselApi, Carrusel, resolveApiAssetUrl } from "@/lib/api";

function MiniCarruselPreview({ items }: { items: Carrusel[] }) {
  const activos = items.filter((i) => i.activo);

  if (activos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand-border p-8 text-center text-sm text-brand-text-muted">
        No hay imágenes activas para mostrar en la vista previa
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-cream/30 p-3">
      <div className="flex gap-4" style={{ minWidth: "max-content" }}>
        {activos.map((item, index) => (
          <div
            key={item.id}
            className="relative flex-shrink-0 w-52 rounded-lg overflow-hidden bg-white shadow-sm border border-brand-border"
          >
            <div className="aspect-[16/9] bg-brand-cream overflow-hidden">
              <img
                src={resolveApiAssetUrl(item.imagenUrl)}
                alt={item.titulo}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27112%27 viewBox=%270 0 200 112%27%3E%3Crect fill=%27%23ddd8ce%27 width=%27200%27 height=%27112%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%235a7a62%27 font-size=%2712%27%3ESin imagen%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-brand-dark truncate">
                {index + 1}. {item.titulo}
              </p>
              {item.linkUrl && (
                <p className="text-[10px] text-brand-text-muted truncate mt-0.5">
                  {item.linkUrl}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SortableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: Carrusel;
  onEdit: (d: Carrusel) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-brand-border bg-white px-4 py-3 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-brand-text-muted hover:text-brand-dark"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex h-12 w-20 shrink-0 rounded-md overflow-hidden bg-brand-cream border border-brand-border">
        <img
          src={resolveApiAssetUrl(item.imagenUrl)}
          alt={item.titulo}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-dark truncate">
          {item.titulo}
        </p>
        {item.linkUrl && (
          <p className="text-xs text-brand-text-muted truncate">
            {item.linkUrl}
          </p>
        )}
      </div>

      <Badge
        variant="outline"
        className="border-brand-green-light/30 text-brand-green-light bg-brand-green-light/5 font-mono shrink-0"
      >
        #{item.orden}
      </Badge>

      <Badge
        variant={item.activo ? "default" : "secondary"}
        className={
          item.activo
            ? "bg-brand-green-light/15 text-brand-green-light hover:bg-brand-green-light/20 shrink-0"
            : "shrink-0"
        }
      >
        {item.activo ? "Activo" : "Inactivo"}
      </Badge>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-brand-text-muted hover:text-brand-green"
          onClick={() => onEdit(item)}
        >
          <Pen className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-brand-text-muted hover:text-red-500"
          onClick={() => onDelete(item.id!)}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CarruselPage() {
  const [data, setData] = useState<Carrusel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitulo, setUploadTitulo] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLinkUrl, setUploadLinkUrl] = useState("");

  const [editItem, setEditItem] = useState<Carrusel | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTitulo, setEditTitulo] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editActivo, setEditActivo] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await carruselApi.list();
      setData(all);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (!uploadTitulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("titulo", uploadTitulo.trim());
      if (uploadLinkUrl.trim()) {
        formData.append("linkUrl", uploadLinkUrl.trim());
      }

      const created = await carruselApi.create(formData);
      setData((prev) => [...prev, created]);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitulo("");
      setUploadLinkUrl("");
      toast.success("Imagen añadida correctamente");
    } catch {
      toast.error("Error al subir la imagen");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten imágenes (PNG, JPG, GIF, WebP)");
      if (e.target) e.target.value = "";
      return;
    }

    setUploadFile(file);
    const nameSinExt = file.name.replace(/\.[^.]+$/, "");
    if (!uploadTitulo) {
      setUploadTitulo(nameSinExt);
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!editTitulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("titulo", editTitulo.trim());
      formData.append("linkUrl", editLinkUrl.trim());
      formData.append("activo", String(editActivo));
      if (editFile) {
        formData.append("file", editFile);
      }

      const updated = await carruselApi.update(editItem.id!, formData);
      setData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditItem(null);
      toast.success("Imagen actualizada");
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await carruselApi.delete(deleteId);
      setData((prev) => prev.filter((d) => d.id !== deleteId));
      setDeleteId(null);
      toast.success("Imagen eliminada");
    } catch {
      toast.error("Error al eliminar");
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
      const ids = reordered.map((d) => d.id!);
      const updated = await carruselApi.reordenar(ids);
      setData(updated);
    } catch {
      toast.error("Error al reordenar");
      fetchData();
    }
  };

  const openEditDialog = (item: Carrusel) => {
    setEditItem(item);
    setEditTitulo(item.titulo);
    setEditLinkUrl(item.linkUrl || "");
    setEditFile(null);
    setEditActivo(item.activo ?? true);
  };

  const filtered = data.filter((item) =>
    item.titulo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-green-light/10 p-2.5">
          <Images className="h-5 w-5 text-brand-green-light" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">
            Carrusel de imágenes
          </h1>
          <p className="text-sm text-brand-text-muted">
            Administra las imágenes del carrusel principal
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2">
          Vista previa del carrusel
        </p>
        <MiniCarruselPreview items={data} />
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-brand-border bg-white"
          />
        </div>

        <Dialog
          open={uploadOpen}
          onOpenChange={(v) => {
            setUploadOpen(v);
            if (!v) {
              setUploadFile(null);
              setUploadTitulo("");
              setUploadLinkUrl("");
            }
          }}
        >
          <DialogTrigger
            render={
              <Button className="bg-brand-green hover:bg-brand-green/90 text-white" />
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir imagen
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Añadir imagen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="file-input">Archivo</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleSelectFile}
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titulo-input">Título</Label>
                <Input
                  id="titulo-input"
                  value={uploadTitulo}
                  onChange={(e) => setUploadTitulo(e.target.value)}
                  placeholder="Título de la imagen"
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-input">
                  Link (opcional)
                </Label>
                <Input
                  id="link-input"
                  value={uploadLinkUrl}
                  onChange={(e) => setUploadLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="border-brand-border"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                onClick={handleUpload}
                disabled={saving || !uploadFile || !uploadTitulo.trim()}
                className="bg-brand-green hover:bg-brand-green/90 text-white"
              >
                {saving ? "Subiendo..." : "Subir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-brand-text-muted">
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-brand-text-muted">
          <Images className="h-12 w-12 mb-3 opacity-30" />
          <p>
            {search
              ? "No hay resultados para esta búsqueda."
              : "No hay imágenes. Añade la primera."}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={data.map((d) => d.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filtered.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onEdit={openEditDialog}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog
        open={editItem !== null}
        onOpenChange={(v) => {
          if (!v) setEditItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar imagen</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-titulo">Título</Label>
                <Input
                  id="edit-titulo"
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  placeholder="Título de la imagen"
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-link">Link (opcional)</Label>
                <Input
                  id="edit-link"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-file">
                  Reemplazar imagen (opcional)
                </Label>
                <Input
                  id="edit-file"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                  className="border-brand-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-activo"
                  checked={editActivo}
                  onChange={(e) => setEditActivo(e.target.checked)}
                  className="rounded border-brand-border accent-brand-green-light"
                />
                <Label htmlFor="edit-activo" className="text-sm">
                  Activo
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !editTitulo.trim()}
              className="bg-brand-green hover:bg-brand-green/90 text-white"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteId !== null}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-text-muted">
            ¿Estás seguro de eliminar esta imagen? También se borrará el
            archivo físico. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
