"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import ImageTool from "@editorjs/image";
import Quote from "@editorjs/quote";
import Checklist from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import InlineCode from "@editorjs/inline-code";
import LinkTool from "@editorjs/link";
import Embed from "@editorjs/embed";

const i18n = {
  messages: {
    ui: {
      blockTunes: { toggler: { "Click to tune": "Ajustes", "or drag to move": "o arrastra para mover" } },
      inlineToolbar: { converter: "Convertir a" },
      toolbar: { toolbox: { Add: "Añadir" } },
      popover: { "Filter": "Filtrar", "Nothing found": "Sin resultados", "Convert to": "Convertir a" },
    },
    toolNames: {
      Text: "Texto", Heading: "Título", List: "Lista", Checklist: "Lista de verificación",
      Quote: "Cita", Delimiter: "Separador", Link: "Enlace",
      Image: "Imagen", Embed: "Insertar",
    },
    tools: {
      link: { "Add a link": "Añadir enlace" },
      image: { "Select an Image": "Seleccionar imagen", "Couldn't upload image. Please try another": "No se pudo subir la imagen. Intenta con otra" },
    },
    blockTunes: {
      delete: { "Delete": "Eliminar", "Click to delete": "Eliminar bloque" },
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
}

const EditorWrapper = forwardRef<EditorHandle, EditorWrapperProps>(
  function EditorWrapper({ holder, data, readOnly }, ref) {
    const editorRef = useRef<EditorJS | null>(null);
    const initialized = useRef(false);
    const pendingFilesRef = useRef<Map<string, File>>(new Map());

    useImperativeHandle(ref, () => ({
      getData: async () => {
        if (!editorRef.current) return { blocks: [], time: Date.now(), version: "2.31.6" };
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
        data: data as any,
        readOnly: readOnly || false,
        i18n,
        tools: {
          header: { class: Header, inlineToolbar: true, config: { placeholder: "Título", levels: [1, 2, 3, 4], defaultLevel: 2 } },
          list: { class: List, inlineToolbar: true },
          image: {
            class: ImageTool,
            config: {
              uploader: {
                uploadByFile(file: File) {
                  const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  const blobUrl = URL.createObjectURL(file);
                  pending.set(tempId, file);
                  return Promise.resolve({ success: 1, file: { url: blobUrl, tempId } });
                },
                uploadByUrl(url: string) {
                  return Promise.resolve({ success: 1, file: { url } });
                },
              },
            },
          },
          quote: { class: Quote, inlineToolbar: true },
          checklist: { class: Checklist, inlineToolbar: true },
          delimiter: Delimiter,
          inlineCode: { class: InlineCode },
          linkTool: { class: LinkTool },
          embed: { class: Embed, config: { services: { youtube: true, vimeo: true } } },
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
    }, []);

    return <div id={holder} className="editorjs-wrapper" />;
  }
);

export default EditorWrapper;
