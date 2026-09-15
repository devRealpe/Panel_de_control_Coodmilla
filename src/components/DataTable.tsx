"use client";

import { useState } from "react";
import { Pen, Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface Column<T> {
  key: keyof T | "actions";
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends { id?: number }> {
  title: string;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onSave: (item: Partial<T>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  emptyMessage?: string;
  formFields: (props: {
    item: Partial<T>;
    onChange: (field: keyof T, value: unknown) => void;
  }) => React.ReactNode;
  defaultItem: Partial<T>;
}

export default function DataTable<T extends { id?: number }>({
  title,
  columns,
  data,
  loading,
  onSave,
  onDelete,
  emptyMessage = "No hay registros.",
  formFields,
  defaultItem,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<Partial<T> | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = data.filter((item) =>
    Object.values(item as Record<string, unknown>).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await onSave(editItem);
      toast.success(editItem.id ? "Registro actualizado" : "Registro creado");
      setOpen(false);
      setEditItem(null);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await onDelete(deleteId);
      toast.success("Registro eliminado");
      setDeleteId(null);
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-brand-border bg-white"
          />
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditItem(null);
          }}
        >
          <DialogTrigger
            onClick={() => setEditItem(defaultItem)}
            render={
              <Button className="bg-brand-green hover:bg-brand-green/90 text-white" />
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editItem?.id ? "Editar" : "Nuevo"} {title}
              </DialogTitle>
            </DialogHeader>
            {editItem &&
              formFields({
                item: editItem,
                onChange: (field, value) =>
                  setEditItem((prev) => (prev ? { ...prev, [field]: value } : prev)),
              })}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand-green hover:bg-brand-green/90 text-white"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-brand-border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-brand-cream/50">
              {columns.map((col) => (
                <TableHead key={String(col.key)} className="text-brand-text-muted font-semibold text-xs uppercase tracking-wider">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-24 text-right text-brand-text-muted font-semibold text-xs uppercase tracking-wider">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-12 text-brand-text-muted">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-12 text-brand-text-muted">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-brand-cream/30">
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className="text-brand-text">
                      {col.render
                        ? col.render(item)
                        : String(item[col.key as keyof T] ?? "")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-brand-text-muted hover:text-brand-green"
                        onClick={() => {
                          setEditItem(item as Partial<T>);
                          setOpen(true);
                        }}
                      >
                        <Pen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-brand-text-muted hover:text-red-500"
                        onClick={() => setDeleteId(item.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-text-muted">
            ¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
