import { createElement } from "@lwc/engine-dom";
import { LightningElement, api } from "lwc";
import Datatable from "c/datatable";

const { customTypes } = Datatable;

// lightning-datatable renders a custom type by rendering its template with the cell's `value`
// and `typeAttributes` in scope. The jest stub for lightning/datatable renders nothing, so this
// host stands in for a cell.
class CellHost extends LightningElement {
  @api cellTemplate;
  @api value;
  @api typeAttributes = {};

  render() {
    return this.cellTemplate;
  }
}

function renderCell(type, { value, typeAttributes } = {}) {
  const element = createElement("c-cell-host", { is: CellHost });
  Object.assign(element, {
    cellTemplate: customTypes[type].template,
    value,
    typeAttributes
  });
  document.body.appendChild(element);
  return element;
}

describe("c-datatable", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("registers the tooltip and fileThumbnail custom types", () => {
    expect(Object.keys(customTypes).sort()).toEqual([
      "fileThumbnail",
      "tooltip"
    ]);
  });

  it("lets both custom types lay out their own cells", () => {
    expect(customTypes.tooltip.standardCellLayout).toBe(false);
    expect(customTypes.fileThumbnail.standardCellLayout).toBe(false);
  });

  it("declares every attribute the thumbnail cell reads", () => {
    expect(customTypes.fileThumbnail.typeAttributes).toEqual([
      "contentDocumentId",
      "contentVersionId",
      "fileType",
      "thumbnailUrl",
      "title"
    ]);
  });

  it("still renders as a lightning-datatable", () => {
    const element = createElement("c-datatable", { is: Datatable });
    element.keyField = "Id";
    element.data = [{ Id: "1" }];
    document.body.appendChild(element);

    expect(element.keyField).toBe("Id");
    expect(element.data).toEqual([{ Id: "1" }]);
  });

  it("renders a tooltip cell with the cell value", () => {
    const host = renderCell("tooltip", { value: "Full description" });
    const tooltip = host.shadowRoot.querySelector("c-tooltip");

    expect(tooltip.value).toBe("Full description");
  });

  it("renders a thumbnail cell from the type attributes", () => {
    const typeAttributes = {
      contentDocumentId: "069000000000001",
      contentVersionId: "068000000000001",
      fileType: "PDF",
      thumbnailUrl: "/thumb.png",
      title: "Contract"
    };
    const host = renderCell("fileThumbnail", { typeAttributes });
    const thumbnail = host.shadowRoot.querySelector("c-thumbnail");

    expect({
      contentDocumentId: thumbnail.contentDocumentId,
      contentVersionId: thumbnail.contentVersionId,
      fileType: thumbnail.fileType,
      thumbnailUrl: thumbnail.thumbnailUrl,
      title: thumbnail.title
    }).toEqual(typeAttributes);
  });
});
