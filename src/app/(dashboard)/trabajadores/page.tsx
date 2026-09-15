"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Pen,
  Plus,
  QrCode,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trabajador,
  resolveApiAssetUrl,
  trabajadoresApi,
} from "@/lib/api";

const PUBLIC_WORKER_PAGE = "https://www.coodmilla.com/trabajadores.html";
const VALID_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

type TrabajadorForm = {
  codigoPublico: string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  activo: boolean;
};

const emptyForm: TrabajadorForm = {
  codigoPublico: "",
  primerNombre: "",
  segundoNombre: "",
  primerApellido: "",
  segundoApellido: "",
  activo: true,
};

function publicUrl(codigoPublico: string) {
  return `${PUBLIC_WORKER_PAGE}#${codigoPublico.replace(/^#/, "")}`;
}

function normalizePublicCode(codigoPublico: string) {
  return codigoPublico.trim().replace(/^#/, "").toLowerCase();
}

function initials(trabajador: Trabajador) {
  return `${trabajador.primerNombre?.[0] ?? ""}${trabajador.primerApellido?.[0] ?? ""}`.toUpperCase();
}

function appendWorkerForm(formData: FormData, form: TrabajadorForm) {
  formData.append("codigoPublico", form.codigoPublico.trim().replace(/^#/, ""));
  formData.append("primerNombre", form.primerNombre.trim());
  formData.append("segundoNombre", form.segundoNombre.trim());
  formData.append("primerApellido", form.primerApellido.trim());
  formData.append("segundoApellido", form.segundoApellido.trim());
  formData.append("activo", String(form.activo));
}

function WorkerImage({ trabajador }: { trabajador: Trabajador }) {
  const [failed, setFailed] = useState(false);

  if (failed || !trabajador.fotoUrl) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-cream text-sm font-bold text-brand-green">
        {initials(trabajador) || <UserRound className="h-5 w-5" />}
      </div>
    );
  }

  return (
    <img
      src={resolveApiAssetUrl(trabajador.fotoUrl)}
      alt={trabajador.nombreCompleto || "Trabajador"}
      className="h-14 w-14 shrink-0 rounded-lg border border-brand-border object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function WorkerRow({
  trabajador,
  onEdit,
  onDelete,
  onCopy,
}: {
  trabajador: Trabajador;
  onEdit: (trabajador: Trabajador) => void;
  onDelete: (id: number) => void;
  onCopy: (codigoPublico: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-brand-border bg-white px-4 py-3 shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <div className="flex items-center gap-3">
        <WorkerImage trabajador={trabajador} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-brand-dark">
            {trabajador.nombreCompleto}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 border-brand-green/30 bg-brand-green/5 font-mono text-brand-green"
            >
              <QrCode className="h-3 w-3" />
              #{trabajador.codigoPublico}
            </Badge>
            <Badge
              variant={trabajador.activo ? "default" : "secondary"}
              className={
                trabajador.activo
                  ? "bg-brand-green-light/15 text-brand-green-light hover:bg-brand-green-light/20"
                  : ""
              }
            >
              {trabajador.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-lg bg-brand-cream/30 px-3 py-2 text-xs text-brand-text-muted">
        <p className="truncate font-mono text-brand-dark">
          {publicUrl(trabajador.codigoPublico)}
        </p>
        <p className="mt-1">
          El sitio publico debe leer este codigo desde el hash y consultar solo este registro.
        </p>
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-brand-text-muted hover:text-brand-green"
          onClick={() => onCopy(trabajador.codigoPublico)}
          title="Copiar enlace publico"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-brand-text-muted hover:text-brand-green"
          onClick={() => window.open(publicUrl(trabajador.codigoPublico), "_blank")}
          title="Abrir enlace publico"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-brand-text-muted hover:text-brand-green"
          onClick={() => onEdit(trabajador)}
        >
          <Pen className="mr-1 h-3.5 w-3.5" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-brand-text-muted hover:text-red-500"
          onClick={() => onDelete(trabajador.id!)}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function TrabajadoresPage() {
  const [data, setData] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<TrabajadorForm>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editItem, setEditItem] = useState<Trabajador | null>(null);
  const [editForm, setEditForm] = useState<TrabajadorForm>(emptyForm);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const trabajadores = await trabajadoresApi.list();
      setData(trabajadores);
    } catch {
      setData([]);
      toast.error("No se pudieron cargar los trabajadores");
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;

    return data.filter((trabajador) => {
      const searchable = [
        trabajador.codigoPublico,
        trabajador.nombreCompleto,
        trabajador.primerNombre,
        trabajador.segundoNombre,
        trabajador.primerApellido,
        trabajador.segundoApellido,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query.replace(/^#/, ""));
    });
  }, [data, search]);

  const activos = data.filter((trabajador) => trabajador.activo !== false).length;
  const createCodeOwner = data.find(
    (trabajador) =>
      normalizePublicCode(trabajador.codigoPublico) === normalizePublicCode(form.codigoPublico)
  );
  const editCodeOwner = data.find(
    (trabajador) =>
      trabajador.id !== editItem?.id &&
      normalizePublicCode(trabajador.codigoPublico) === normalizePublicCode(editForm.codigoPublico)
  );
  const createCodeTaken = Boolean(form.codigoPublico.trim() && createCodeOwner);
  const editCodeTaken = Boolean(editForm.codigoPublico.trim() && editCodeOwner);

  const updateForm = (field: keyof TrabajadorForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditForm = (field: keyof TrabajadorForm, value: string | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateImage = (file: File, input: HTMLInputElement) => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imagenes PNG, JPG o WebP");
      input.value = "";
      return false;
    }
    return true;
  };

  const resetCreate = () => {
    setForm(emptyForm);
    setPhotoFile(null);
  };

  const handleCreate = async () => {
    if (!photoFile) {
      toast.error("Selecciona una foto");
      return;
    }
    if (!form.codigoPublico.trim() || !form.primerNombre.trim() || !form.primerApellido.trim()) {
      toast.error("Codigo, primer nombre y primer apellido son obligatorios");
      return;
    }
    if (createCodeTaken) {
      toast.error(`El codigo ${form.codigoPublico.trim()} ya esta asignado`);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      appendWorkerForm(formData, form);

      const created = await trabajadoresApi.create(formData);
      setData((prev) => [...prev, created].sort((a, b) => (a.nombreCompleto || "").localeCompare(b.nombreCompleto || "")));
      setCreateOpen(false);
      resetCreate();
      toast.success("Trabajador creado correctamente");
    } catch {
      toast.error("Error al crear el trabajador");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!editForm.codigoPublico.trim() || !editForm.primerNombre.trim() || !editForm.primerApellido.trim()) {
      toast.error("Codigo, primer nombre y primer apellido son obligatorios");
      return;
    }
    if (editCodeTaken) {
      toast.error(`El codigo ${editForm.codigoPublico.trim()} ya esta asignado`);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      appendWorkerForm(formData, editForm);
      if (editPhotoFile) {
        formData.append("file", editPhotoFile);
      }

      const updated = await trabajadoresApi.update(editItem.id!, formData);
      setData((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditItem(null);
      toast.success("Trabajador actualizado");
    } catch {
      toast.error("Error al actualizar el trabajador");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      await trabajadoresApi.delete(deleteId);
      setData((prev) => prev.filter((trabajador) => trabajador.id !== deleteId));
      setDeleteId(null);
      toast.success("Trabajador eliminado");
    } catch {
      toast.error("Error al eliminar el trabajador");
    }
  };

  const openEdit = (trabajador: Trabajador) => {
    setEditItem(trabajador);
    setEditPhotoFile(null);
    setEditForm({
      codigoPublico: trabajador.codigoPublico || "",
      primerNombre: trabajador.primerNombre || "",
      segundoNombre: trabajador.segundoNombre || "",
      primerApellido: trabajador.primerApellido || "",
      segundoApellido: trabajador.segundoApellido || "",
      activo: trabajador.activo ?? true,
    });
  };

  const copyPublicUrl = async (codigoPublico: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(codigoPublico));
      toast.success("Enlace publico copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-green-light/10 p-2.5">
            <Users className="h-5 w-5 text-brand-green-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Trabajadores</h1>
            <p className="text-sm text-brand-text-muted">
              Administra fotos, nombres, estado activo y codigos QR publicos.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-brand-green/30 bg-brand-green/5 px-3 py-1.5 text-brand-green">
            {data.length} registrados
          </Badge>
          <Badge variant="outline" className="border-brand-green-light/30 bg-brand-green-light/5 px-3 py-1.5 text-brand-green-light">
            {activos} activos
          </Badge>
        </div>
      </div>

      <section className="rounded-lg border border-brand-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
            <Input
              placeholder="Buscar por nombre o codigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-brand-border bg-white pl-9"
            />
          </div>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) resetCreate();
            }}
          >
            <DialogTrigger
              render={
                <Button className="bg-brand-green text-white hover:bg-brand-green/90" />
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo trabajador
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo trabajador</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="codigo-publico">Codigo QR/publico</Label>
                  <Input
                    id="codigo-publico"
                    value={form.codigoPublico}
                    onChange={(e) => updateForm("codigoPublico", e.target.value)}
                    placeholder="ns79"
                    className="border-brand-border font-mono"
                  />
                  <p className="text-xs text-brand-text-muted">
                    Usa exactamente el codigo del carnet impreso, sin depender del orden de registro.
                  </p>
                  {createCodeTaken && (
                    <p className="text-xs font-medium text-red-600">
                      Este codigo ya lo ocupa {createCodeOwner?.nombreCompleto}.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primer-nombre">Primer nombre</Label>
                  <Input
                    id="primer-nombre"
                    value={form.primerNombre}
                    onChange={(e) => updateForm("primerNombre", e.target.value)}
                    className="border-brand-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="segundo-nombre">Segundo nombre</Label>
                  <Input
                    id="segundo-nombre"
                    value={form.segundoNombre}
                    onChange={(e) => updateForm("segundoNombre", e.target.value)}
                    className="border-brand-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primer-apellido">Primer apellido</Label>
                  <Input
                    id="primer-apellido"
                    value={form.primerApellido}
                    onChange={(e) => updateForm("primerApellido", e.target.value)}
                    className="border-brand-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="segundo-apellido">Segundo apellido</Label>
                  <Input
                    id="segundo-apellido"
                    value={form.segundoApellido}
                    onChange={(e) => updateForm("segundoApellido", e.target.value)}
                    className="border-brand-border"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="foto-trabajador">Foto</Label>
                  <Input
                    id="foto-trabajador"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return setPhotoFile(null);
                      if (validateImage(file, e.target)) setPhotoFile(file);
                    }}
                    className="border-brand-border"
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="trabajador-activo"
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => updateForm("activo", e.target.checked)}
                    className="rounded border-brand-border accent-brand-green-light"
                  />
                  <Label htmlFor="trabajador-activo">Activo</Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button
                  onClick={handleCreate}
                  disabled={
                    saving ||
                    !photoFile ||
                    !form.codigoPublico.trim() ||
                    createCodeTaken ||
                    !form.primerNombre.trim() ||
                    !form.primerApellido.trim()
                  }
                  className="bg-brand-green text-white hover:bg-brand-green/90"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-brand-text-muted">
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-brand-text-muted">
          <UserRound className="mb-3 h-12 w-12 opacity-30" />
          <p>{search ? "No hay resultados para esta busqueda." : "No hay trabajadores registrados."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((trabajador) => (
            <WorkerRow
              key={trabajador.id}
              trabajador={trabajador}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onCopy={copyPublicUrl}
            />
          ))}
        </div>
      )}

      <Dialog open={editItem !== null} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar trabajador</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-codigo-publico">Codigo QR/publico</Label>
                <Input
                  id="edit-codigo-publico"
                  value={editForm.codigoPublico}
                  onChange={(e) => updateEditForm("codigoPublico", e.target.value)}
                  className="border-brand-border font-mono"
                />
                <p className="truncate text-xs text-brand-text-muted">
                  Enlace: {publicUrl(editForm.codigoPublico || editItem.codigoPublico)}
                </p>
                {editCodeTaken && (
                  <p className="text-xs font-medium text-red-600">
                    Este codigo ya lo ocupa {editCodeOwner?.nombreCompleto}.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-primer-nombre">Primer nombre</Label>
                <Input
                  id="edit-primer-nombre"
                  value={editForm.primerNombre}
                  onChange={(e) => updateEditForm("primerNombre", e.target.value)}
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-segundo-nombre">Segundo nombre</Label>
                <Input
                  id="edit-segundo-nombre"
                  value={editForm.segundoNombre}
                  onChange={(e) => updateEditForm("segundoNombre", e.target.value)}
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-primer-apellido">Primer apellido</Label>
                <Input
                  id="edit-primer-apellido"
                  value={editForm.primerApellido}
                  onChange={(e) => updateEditForm("primerApellido", e.target.value)}
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-segundo-apellido">Segundo apellido</Label>
                <Input
                  id="edit-segundo-apellido"
                  value={editForm.segundoApellido}
                  onChange={(e) => updateEditForm("segundoApellido", e.target.value)}
                  className="border-brand-border"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-foto-trabajador">Reemplazar foto</Label>
                <Input
                  id="edit-foto-trabajador"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return setEditPhotoFile(null);
                    if (validateImage(file, e.target)) setEditPhotoFile(file);
                  }}
                  className="border-brand-border"
                />
                <p className="text-xs text-brand-text-muted">
                  {editPhotoFile ? editPhotoFile.name : "Deja este campo vacio para conservar la foto actual."}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="edit-trabajador-activo"
                  type="checkbox"
                  checked={editForm.activo}
                  onChange={(e) => updateEditForm("activo", e.target.checked)}
                  className="rounded border-brand-border accent-brand-green-light"
                />
                <Label htmlFor="edit-trabajador-activo">Activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={
                saving ||
                !editForm.codigoPublico.trim() ||
                editCodeTaken ||
                !editForm.primerNombre.trim() ||
                !editForm.primerApellido.trim()
              }
              className="bg-brand-green text-white hover:bg-brand-green/90"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminacion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-text-muted">
            Esta accion elimina el registro y la foto guardada. No se puede deshacer.
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
