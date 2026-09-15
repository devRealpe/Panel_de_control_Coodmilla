declare module "@editorjs/checklist" {
  import { BlockToolConstructable } from "@editorjs/editorjs";
  const Checklist: BlockToolConstructable;
  export default Checklist;
}

declare module "@editorjs/delimiter" {
  import { BlockToolConstructable } from "@editorjs/editorjs";
  const Delimiter: BlockToolConstructable;
  export default Delimiter;
}

declare module "@editorjs/inline-code" {
  import { InlineToolConstructable } from "@editorjs/editorjs";
  const InlineCode: InlineToolConstructable;
  export default InlineCode;
}

declare module "@editorjs/link" {
  import { BlockToolConstructable } from "@editorjs/editorjs";
  const LinkTool: BlockToolConstructable;
  export default LinkTool;
}

declare module "@editorjs/embed" {
  import { BlockToolConstructable } from "@editorjs/editorjs";
  const Embed: BlockToolConstructable;
  export default Embed;
}

declare module "@editorjs/attaches" {
  import { BlockToolConstructable } from "@editorjs/editorjs";
  const AttachesTool: BlockToolConstructable;
  export default AttachesTool;
}
