import { LightningElement } from "lwc";

export default class ExampleDatatable extends LightningElement {
  columns = [
    {
      label: "File",
      fieldName: "title",
      type: "fileThumbnail",
      initialWidth: 80,
      typeAttributes: {
        contentDocumentId: { fieldName: "id" },
        fileType: { fieldName: "fileType" },
        thumbnailUrl: { fieldName: "thumbnailUrl" },
        title: { fieldName: "title" }
      }
    },
    { label: "Title", fieldName: "title" },
    { label: "Notes", fieldName: "notes", type: "tooltip" }
  ];

  // No thumbnailUrl here, so every row falls back to its file type's icon. Rows from
  // FileController.getFiles carry a real rendition URL.
  rows = [
    {
      id: "069000000000001",
      title: "Lease agreement.pdf",
      fileType: "PDF",
      notes:
        "Signed copy, countersigned by the landlord on page 4. The original is held at the regional office."
    },
    {
      id: "069000000000002",
      title: "Household income.xlsx",
      fileType: "EXCEL_X",
      notes: "Twelve months of income for every adult in the household, as entered by the applicant."
    },
    {
      id: "069000000000003",
      title: "Statement of need.docx",
      fileType: "WORD_X",
      notes: "Short."
    },
    {
      id: "069000000000004",
      title: "Site photos.zip",
      fileType: "ZIP",
      notes: "Photos of the property taken during the inspection visit, before any repair work began."
    }
  ];

  previewed;

  handlePreview(event) {
    this.previewed = event.detail.title;
  }
}
