"use client";

import { ImagePlus, Video } from "lucide-react";

export type MediaType = "imagen" | "video";

/** Selector "Subir imagen / Video por enlace" reutilizable. */
export function MediaTypeTabs({ value, onChange }: { value: MediaType; onChange: (t: MediaType) => void }) {
  const options: Array<{ id: MediaType; label: string; icon: typeof Video }> = [
    { id: "imagen", label: "Subir imagen", icon: ImagePlus },
    { id: "video", label: "Video (enlace)", icon: Video },
  ];
  return (
    <div role="radiogroup" aria-label="Tipo de contenido" className="grid grid-cols-2 gap-1 rounded-lg border border-brand-border bg-brand-cream p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
            value === o.id ? "bg-white text-brand-green shadow-sm" : "text-brand-text-muted hover:text-brand-dark"
          }`}
        >
          <o.icon className="h-4 w-4" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
