export default {
  name: "datatable",
  label: "Datatable",
  category: "data",
  description:
    "lightning-datatable with two extra column types: tooltip text and file thumbnails.",
  example: "exampleDatatable",
  extends: {
    label: "lightning-datatable",
    url: "https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-datatable.html"
  },
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-datatable` extends `lightning-datatable`, so every attribute, method and event of the base component works unchanged. It adds two column types, set through a column's `type`."
      ]
    },
    {
      heading: "Tooltip columns",
      body: [
        "A `tooltip` column shows the value truncated to the column width and the full text in a tooltip on hover. Use it for long free text in a narrow column:",
        { code: '{ label: "Notes", fieldName: "notes", type: "tooltip" }' }
      ]
    },
    {
      heading: "File thumbnail columns",
      body: [
        "A `fileThumbnail` column renders `c-thumbnail`: a preview image for images, PDFs and PowerPoint files that have a `thumbnailUrl`, and the matching file-type icon for everything else. The rows returned by `FileController.getFiles` carry every field it needs:",
        {
          code: '{\n  label: "File",\n  fieldName: "title",\n  type: "fileThumbnail",\n  initialWidth: 80,\n  typeAttributes: {\n    contentDocumentId: { fieldName: "contentDocumentId" },\n    contentVersionId: { fieldName: "contentVersionId" },\n    fileType: { fieldName: "fileType" },\n    thumbnailUrl: { fieldName: "thumbnailUrl" },\n    title: { fieldName: "title" }\n  }\n}'
        },
        "Clicking a thumbnail fires `previewfile`, which bubbles out of the table, so handle it on `c-datatable` itself."
      ]
    }
  ],
  columnTypes: [
    {
      name: "tooltip",
      typeAttributes: "—",
      description: "Truncated text with the full value in a tooltip on hover."
    },
    {
      name: "fileThumbnail",
      typeAttributes: "contentDocumentId, contentVersionId, fileType, thumbnailUrl, title",
      description: "A file preview image, or the file type's icon when there is none."
    }
  ],
  events: [
    {
      name: "previewfile",
      detail: "{ contentDocumentId, contentVersionId, title }",
      description:
        "A fileThumbnail cell was clicked, or activated with Enter or Space. Bubbles and is composed."
    }
  ]
};
