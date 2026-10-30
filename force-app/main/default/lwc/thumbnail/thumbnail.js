import { LightningElement, api } from "lwc";

const RENDERABLE_TYPES = new Set([
  "PNG",
  "JPG",
  "JPEG",
  "GIF",
  "BMP",
  "PDF",
  "POWER_POINT",
  "POWER_POINT_X",
  "PPT",
  "PPTX"
]);

const ICON_BY_TYPE = {
  PNG: "doctype:image",
  JPG: "doctype:image",
  JPEG: "doctype:image",
  GIF: "doctype:image",
  BMP: "doctype:image",
  SVG: "doctype:image",
  PDF: "doctype:pdf",
  EXCEL: "doctype:excel",
  EXCEL_X: "doctype:excel",
  XLS: "doctype:excel",
  XLSX: "doctype:excel",
  CSV: "doctype:csv",
  WORD: "doctype:word",
  WORD_X: "doctype:word",
  DOC: "doctype:word",
  DOCX: "doctype:word",
  POWER_POINT: "doctype:ppt",
  POWER_POINT_X: "doctype:ppt",
  PPT: "doctype:ppt",
  PPTX: "doctype:ppt",
  TEXT: "doctype:txt",
  TXT: "doctype:txt",
  ZIP: "doctype:zip",
  HTML: "doctype:html",
  HTM: "doctype:html",
  XML: "doctype:xml",
  MP4: "doctype:video",
  MOV: "doctype:video",
  AVI: "doctype:video",
  MP3: "doctype:audio",
  WAV: "doctype:audio"
};

export default class Thumbnail extends LightningElement {
  @api contentDocumentId;
  @api contentVersionId;
  @api fileType;
  @api thumbnailUrl;
  @api title;

  imageFailed = false;

  get hasRenderableThumbnail() {
    return (
      !this.imageFailed &&
      this.thumbnailUrl &&
      this.fileType &&
      RENDERABLE_TYPES.has(this.fileType.toUpperCase())
    );
  }

  get iconName() {
    if (!this.fileType) return "doctype:unknown";
    return ICON_BY_TYPE[this.fileType.toUpperCase()] || "doctype:unknown";
  }

  get altText() {
    return this.title ? `Preview of ${this.title}` : "File thumbnail";
  }

  handleImageError() {
    this.imageFailed = true;
  }

  handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("previewfile", {
        bubbles: true,
        composed: true,
        detail: {
          contentDocumentId: this.contentDocumentId,
          contentVersionId: this.contentVersionId,
          title: this.title
        }
      })
    );
  }

  handleKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
      this.handleClick(event);
    }
  }
}
