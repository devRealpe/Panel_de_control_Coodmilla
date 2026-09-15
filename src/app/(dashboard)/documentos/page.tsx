"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Pen,
  Download,
  GripVertical,
  Search,
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
import { pdfApi, PDFDocumento, resolveApiAssetUrl } from "@/lib/api";

function SortableItem({
  doc,
  onEdit,
  onDelete,
}: {
  doc: PDFDocumento;
  onEdit: (d: PDFDocumento) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id! });

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

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gold/10 shrink-0">
        <FileText className="h-5 w-5 text-brand-gold" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-dark truncate">
          {doc.nombre}
        </p>
        <p className="text-xs text-brand-text-muted truncate">
          {doc.nombreOriginal}
        </p>
      </div>

      <Badge
        variant="outline"
        className="border-brand-green/30 text-brand-green bg-brand-green/5 font-mono shrink-0"
      >
        #{doc.orden}
      </Badge>

      <Badge
        variant={doc.activo ? "default" : "secondary"}
        className={
          doc.activo
            ? "bg-brand-gold/15 text-brand-gold hover:bg-brand-gold/20 shrink-0"
            : "shrink-0"
        }
      >
        {doc.activo ? "Activo" : "Inactivo"}
      </Badge>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-brand-text-muted hover:text-brand-green"
          onClick={() => {
            const url = resolveApiAssetUrl(doc.url);
            window.open(url, "_blank");
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Visualizar/Descargar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-brand-text-muted hover:text-brand-green"
          onClick={() => onEdit(doc)}
        >
          <Pen className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-brand-text-muted hover:text-red-500"
          onClick={() => onDelete(doc.id!)}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function DocumentosPage() {
  const [data, setData] = useState<PDFDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadNombre, setUploadNombre] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editItem, setEditItem] = useState<PDFDocumento | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editNombre, setEditNombre] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editActivo, setEditActivo] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchData = useCallback(async () => {
    try {
      const all = await pdfApi.list();
      setData(all);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Selecciona un archivo PDF");
      return;
    }
    if (!uploadNombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("nombre", uploadNombre.trim());

      const created = await pdfApi.create(formData);
      setData((prev) => [...prev, created]);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadNombre("");
      toast.success("PDF añadido correctamente");
    } catch {
      toast.error("Error al subir el PDF");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      if (e.target) e.target.value = "";
      return;
    }

    setUploadFile(file);
    const nameSinExt = file.name.replace(/\.pdf$/i, "");
    setUploadNombre(nameSinExt);
  };

  const handleSelectEditFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setEditFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      e.target.value = "";
      setEditFile(null);
      return;
    }

    setEditFile(file);
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!editNombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("nombre", editNombre.trim());
      formData.append("activo", String(editActivo));
      if (editFile) {
        formData.append("file", editFile);
      }

      const updated = await pdfApi.update(editItem.id!, formData);
      setData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditItem(null);
      toast.success("PDF actualizado");
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await pdfApi.delete(deleteId);
      setData((prev) => prev.filter((d) => d.id !== deleteId));
      setDeleteId(null);
      toast.success("PDF eliminado");
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
      const updated = await pdfApi.reordenar(ids);
      setData(updated);
    } catch {
      toast.error("Error al reordenar");
      fetchData();
    }
  };

  const openEditDialog = (doc: PDFDocumento) => {
    setEditItem(doc);
    setEditNombre(doc.nombre);
    setEditFile(null);
    setEditActivo(doc.activo ?? true);
  };

  const filtered = data.filter((doc) =>
    doc.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-gold/10 p-2.5">
          <FileText className="h-5 w-5 text-brand-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">
            Documentos DIAN-ESAL
          </h1>
          <p className="text-sm text-brand-text-muted">
            Administra los documentos PDF y su orden de visualización
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-brand-border bg-white"
          />
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger
            render={
              <Button className="bg-brand-green hover:bg-brand-green/90 text-white" />
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir PDF
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Añadir PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="file-input">Archivo PDF</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleSelectFile}
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre-input">Nombre</Label>
                <Input
                  id="nombre-input"
                  value={uploadNombre}
                  onChange={(e) => setUploadNombre(e.target.value)}
                  placeholder="Nombre del documento"
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
                disabled={saving || !uploadFile || !uploadNombre.trim()}
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
          <FileText className="h-12 w-12 mb-3 opacity-30" />
          <p>
            {search
              ? "No hay resultados para esta búsqueda."
              : "No hay PDFs. Añade el primero."}
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
              {filtered.map((doc) => (
                <SortableItem
                  key={doc.id}
                  doc={doc}
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
            <DialogTitle>Editar PDF</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input
                  id="edit-nombre"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  placeholder="Nombre del documento"
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-file">
                  Reemplazar archivo (opcional)
                </Label>
                <Input
                  id="edit-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleSelectEditFile}
                  className="border-brand-border"
                />
                {editFile && (
                  <p className="text-xs text-brand-text-muted">
                    {editFile.name} ({(editFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                {!editFile && editItem.nombreOriginal && (
                  <p className="text-xs text-brand-text-muted">
                    Archivo actual: {editItem.nombreOriginal}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-activo"
                  checked={editActivo}
                  onChange={(e) => setEditActivo(e.target.checked)}
                  className="rounded border-brand-border accent-brand-gold"
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
              disabled={saving || !editNombre.trim()}
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
            ¿Estás seguro de eliminar este PDF? También se borrará el archivo
            físico. Esta acción no se puede deshacer.
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
