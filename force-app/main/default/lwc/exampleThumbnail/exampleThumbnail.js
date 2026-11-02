import { LightningElement } from "lwc";

export default class ExampleThumbnail extends LightningElement {
  files = [
    { id: "069000000000001", title: "Lease agreement.pdf", fileType: "PDF" },
    { id: "069000000000002", title: "Budget.xlsx", fileType: "EXCEL_X" },
    { id: "069000000000003", title: "Letter.docx", fileType: "WORD_X" },
    { id: "069000000000004", title: "Slides.pptx", fileType: "POWER_POINT_X" },
    { id: "069000000000005", title: "Export.csv", fileType: "CSV" },
    { id: "069000000000006", title: "Photos.zip", fileType: "ZIP" },
    { id: "069000000000007", title: "Unknown.bin", fileType: "UNKNOWN" }
  ];

  previewed;

  handlePreview(event) {
    this.previewed = event.detail.title;
  }
}
