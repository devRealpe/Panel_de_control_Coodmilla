"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NoticiaForm } from "@/components/noticias/NoticiaForm";
import { noticiasApi, type Noticia } from "@/lib/api";

export default function EditarNoticiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [noticia, setNoticia] = useState<Noticia | null>(null);

  useEffect(() => {
    let active = true;
    noticiasApi
      .getBySlug(slug)
      .then((n) => active && setNoticia(n))
      .catch((err) => {
        toast.error(err instanceof Error ? `No se pudo cargar la noticia: ${err.message}` : "No se pudo cargar la noticia");
        router.push("/noticias");
      });
    return () => {
      active = false;
    };
  }, [slug, router]);

  if (!noticia) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6" aria-busy>
        <div className="h-10 w-64 animate-pulse rounded-lg bg-white" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-[520px] animate-pulse rounded-lg border border-brand-border bg-white" />
          <div className="h-80 animate-pulse rounded-lg border border-brand-border bg-white" />
        </div>
      </div>
    );
  }

  return <NoticiaForm key={noticia.id} noticia={noticia} />;
}
