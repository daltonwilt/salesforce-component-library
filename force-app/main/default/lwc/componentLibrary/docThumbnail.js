export default {
  name: "thumbnail",
  label: "Thumbnail",
  category: "display",
  description: "A clickable file preview: the file's image where there is one, its type icon otherwise.",
  example: "exampleThumbnail",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-thumbnail` shows `thumbnail-url` for file types Salesforce renders a preview for — images, PDFs and PowerPoint files — and the matching `doctype` icon for everything else. If the image fails to load, it falls back to the icon.",
        "It is the cell behind the datatable's `fileThumbnail` column type, and works on its own too."
      ]
    },
    {
      heading: "Opening a preview",
      body: [
        "The thumbnail does not open anything itself. Clicking it, or pressing Enter or Space on it, fires `previewfile`, and the host decides what to show. To open the standard file preview:",
        {
          code: 'handlePreview(event) {\n  this[NavigationMixin.Navigate]({\n    type: "standard__namedPage",\n    attributes: { pageName: "filePreview" },\n    state: { selectedRecordId: event.detail.contentDocumentId }\n  });\n}'
        }
      ]
    }
  ],
  attributes: [
    {
      name: "content-document-id",
      type: "string",
      description: "Returned in the previewfile event."
    },
    {
      name: "content-version-id",
      type: "string",
      description: "Returned in the previewfile event."
    },
    {
      name: "file-type",
      type: "string",
      description:
        "ContentVersion.FileType, e.g. PDF or WORD_X. Picks the icon, and decides whether the image is shown."
    },
    {
      name: "thumbnail-url",
      type: "string",
      description: "Preview image URL."
    },
    {
      name: "title",
      type: "string",
      description: "File name. Used for the hover text and the image's alt text."
    }
  ],
  events: [
    {
      name: "previewfile",
      detail: "{ contentDocumentId, contentVersionId, title }",
      description: "The thumbnail was clicked or activated from the keyboard. Bubbles and is composed."
    }
  ]
};
