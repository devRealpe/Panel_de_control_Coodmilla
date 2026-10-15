/**
 * Vista previa de noticias en el sitio público.
 *
 * Abre /vista-previa/noticia del sitio y le envía el borrador por postMessage
 * (con origen explícito). El sitio lo pinta con el mismo componente que usa la
 * página publicada, así que la vista previa es fiel y no publica nada.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://www.coodmilla.com" : "http://localhost:3000")
).replace(/\/+$/, "");

const READY = "coodmilla:preview-ready";
const DATA = "coodmilla:preview-data";

export interface PreviewNoticia {
  titulo: string;
  contenido: string;
  imagenPortada?: string | null;
  fechaPublicacion?: string | null;
  destacado?: boolean;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Las imágenes aún no subidas viven en URLs blob: del panel, que el sitio
 * (otro origen) no puede leer. Se convierten a data: solo para la vista previa.
 */
export async function inlineBlobUrls(contenido: string): Promise<string> {
  const doc = JSON.parse(contenido) as { blocks?: Array<{ type: string; data?: { file?: { url?: string } } }> };
  for (const block of doc.blocks ?? []) {
    const url = block.type === "image" ? block.data?.file?.url : undefined;
    if (url?.startsWith("blob:")) {
      block.data!.file!.url = await blobToDataUrl(await (await fetch(url)).blob());
    }
  }
  return JSON.stringify(doc);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

let previewWindow: Window | null = null;
let cleanup: (() => void) | null = null;

/** Abre (o reutiliza) la pestaña de vista previa y le envía el borrador. */
export function openPreview(noticia: PreviewNoticia): Window | null {
  const siteOrigin = new URL(SITE_URL).origin;
  const send = () => previewWindow?.postMessage({ type: DATA, noticia }, siteOrigin);

  cleanup?.();
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== siteOrigin || event.source !== previewWindow) return;
    if ((event.data as { type?: string })?.type === READY) send();
  };
  window.addEventListener("message", onMessage);
  cleanup = () => window.removeEventListener("message", onMessage);

  if (previewWindow && !previewWindow.closed) {
    // Pestaña ya abierta: se recarga para pintar el borrador actualizado.
    previewWindow.location.href = `${SITE_URL}/vista-previa/noticia`;
    previewWindow.focus();
  } else {
    previewWindow = window.open(`${SITE_URL}/vista-previa/noticia`, "coodmilla-preview");
  }
  return previewWindow;
}
