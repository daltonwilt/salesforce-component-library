import LightningDatatable from "lightning/datatable";
import tTooltip from "./tTooltip.html";
import tThumbnail from "./tThumbnail.html";

export default class Datatable extends LightningDatatable {
  static customTypes = {
    tooltip: {
      template: tTooltip,
      standardCellLayout: false,
      typeAttributes: []
    },
    fileThumbnail: {
      template: tThumbnail,
      standardCellLayout: false,
      typeAttributes: [
        "contentDocumentId",
        "contentVersionId",
        "fileType",
        "thumbnailUrl",
        "title"
      ]
    }
  };
}
