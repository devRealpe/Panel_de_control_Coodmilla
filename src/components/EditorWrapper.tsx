"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import ImageTool from "@editorjs/image";
import Quote from "@editorjs/quote";
import Delimiter from "@editorjs/delimiter";
import InlineCode from "@editorjs/inline-code";
import LinkTool from "@editorjs/link";
import Checklist from "@editorjs/checklist";
import VideoTool, { upgradeLegacyEmbeds } from "@/components/editor/VideoTool";

const i18n = {
  messages: {
    ui: {
      blockTunes: { toggler: { "Click to tune": "Ajustes", "or drag to move": "o arrastra para mover" } },
      inlineToolbar: { converter: { "Convert to": "Convertir a" } },
      toolbar: { toolbox: { Add: "Añadir" } },
      popover: { Filter: "Filtrar", "Nothing found": "Sin resultados", "Convert to": "Convertir a" },
    },
    toolNames: {
      Text: "Texto",
      Heading: "Título",
      "Unordered List": "Lista con viñetas",
      "Ordered List": "Lista numerada",
      List: "Lista",
      Checklist: "Lista de verificación",
      Quote: "Cita",
      Delimiter: "Separador",
      Link: "Enlace con vista previa",
      Image: "Imagen",
      Video: "Video (YouTube)",
      Bold: "Negrita",
      Italic: "Cursiva",
      InlineCode: "Código",
    },
    tools: {
      header: { "Heading 1": "Título 1", "Heading 2": "Título 2", "Heading 3": "Título 3", "Heading 4": "Título 4" },
      list: { Unordered: "Viñetas", Ordered: "Numerada", Checklist: "Verificación", "Start with": "Empezar en", "Counter type": "Tipo de numeración", Numeric: "Números", "Lower Roman": "Romanos (minúscula)", "Upper Roman": "Romanos (mayúscula)", "Lower Alpha": "Letras (minúscula)", "Upper Alpha": "Letras (mayúscula)" },
      image: {
        Caption: "Pie de foto",
        "Select an Image": "Seleccionar imagen",
        "With border": "Con borde",
        "Stretch image": "Ancho completo",
        "With background": "Con fondo",
        "Couldn't upload image. Please try another": "No se pudo cargar la imagen. Intenta con otra",
      },
      linkTool: {
        Link: "Enlace",
        "Couldn't fetch the link data": "No se pudo obtener la información del enlace",
        "Couldn't get this link data, try the other one": "No se pudo leer este enlace, prueba con otro",
        "Wrong response format from the server": "Respuesta inválida del servidor",
      },
      quote: { "Align Left": "Alinear a la izquierda", "Align Center": "Centrar" },
      link: { "Add a link": "Añadir enlace" },
      stub: { "The block can not be displayed correctly.": "Este bloque no se puede mostrar en el editor, pero se conservará." },
    },
    blockTunes: {
      delete: { Delete: "Eliminar", "Click to delete": "Confirmar eliminación" },
      moveUp: { "Move up": "Subir" },
      moveDown: { "Move down": "Bajar" },
    },
  },
};

export interface EditorHandle {
  getData: () => Promise<OutputData>;
  getPendingFiles: () => Map<string, File>;
}

interface EditorWrapperProps {
  holder: string;
  data?: OutputData;
  readOnly?: boolean;
  /** Se llama cuando el contenido cambia (para avisar de cambios sin guardar). */
  onChange?: () => void;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EditorWrapper = forwardRef<EditorHandle, EditorWrapperProps>(function EditorWrapper(
  { holder, data, readOnly, onChange },
  ref
) {
  const editorRef = useRef<EditorJS | null>(null);
  const initialized = useRef(false);
  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    getData: async () => {
      if (!editorRef.current) return { blocks: [], time: Date.now(), version: "2.31.6" };
      await editorRef.current.isReady;
      return editorRef.current.save();
    },
    getPendingFiles: () => pendingFilesRef.current,
  }));

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const pending = pendingFilesRef.current;

    const editor = new EditorJS({
      holder,
      data: data ? (upgradeLegacyEmbeds(data as never) as OutputData) : undefined,
      readOnly: readOnly || false,
      placeholder: "Escribe el contenido de la noticia o pulsa + para añadir imágenes, videos y más…",
      i18n,
      onChange: () => onChangeRef.current?.(),
      tools: {
        header: {
          class: Header as never,
          inlineToolbar: true,
          config: { placeholder: "Título", levels: [1, 2, 3, 4], defaultLevel: 2 },
        },
        list: { class: List as never, inlineToolbar: true, config: { defaultStyle: "unordered" } },
        image: {
          class: ImageTool as never,
          config: {
            captionPlaceholder: "Pie de foto (opcional)",
            buttonContent: "Seleccionar imagen",
            types: IMAGE_TYPES.join(","),
            uploader: {
              // Las imágenes se suben al guardar la noticia; mientras tanto se
              // muestran desde memoria para poder previsualizar sin publicar nada.
              uploadByFile(file: File) {
                if (!IMAGE_TYPES.includes(file.type)) {
                  return Promise.resolve({ success: 0, message: "Formato no admitido" });
                }
                if (file.size > MAX_IMAGE_BYTES) {
                  return Promise.resolve({ success: 0, message: "La imagen supera 10 MB" });
                }
                const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const blobUrl = URL.createObjectURL(file);
                pending.set(tempId, file);
                // El plugin muestra una vista previa leyendo el archivo con FileReader
                // (asíncrono) justo antes de llamar a este método. Si respondiéramos al
                // instante, la imagen terminaría de cargar antes que esa vista previa y
                // el bloque quedaría atascado en "subiendo" (spinner y pie oculto).
                // Leer el archivo aquí también garantiza que la vista previa llegue antes.
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () =>
                    setTimeout(() => resolve({ success: 1, file: { url: blobUrl, tempId } }), 0);
                  reader.readAsDataURL(file);
                });
              },
              uploadByUrl(url: string) {
                if (!/^https:\/\//i.test(url)) return Promise.resolve({ success: 0 });
                return Promise.resolve({ success: 1, file: { url } });
              },
            },
          },
        },
        video: { class: VideoTool as never },
        quote: { class: Quote as never, inlineToolbar: true, config: { quotePlaceholder: "Texto de la cita", captionPlaceholder: "Autor" } },
        // Conservado para noticias existentes que usan el bloque de verificación antiguo.
        checklist: { class: Checklist as never, inlineToolbar: true, toolbox: false },
        delimiter: Delimiter as never,
        inlineCode: { class: InlineCode as never },
        linkTool: { class: LinkTool as never, config: { endpoint: "/api/link-meta" } },
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
        initialized.current = false;
      }
    };
    // El editor se crea una sola vez; los datos iniciales se pasan al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={holder} className="editorjs-wrapper" />;
});

export default EditorWrapper;
