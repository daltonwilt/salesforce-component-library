import { LightningElement } from "lwc";

export default class ExamplePaginator extends LightningElement {
  totalRows = 237;
  pageNumber = 1;
  pageSize = 10;

  get rangeLabel() {
    const first = (this.pageNumber - 1) * this.pageSize + 1;
    const last = Math.min(this.pageNumber * this.pageSize, this.totalRows);
    return "Showing rows " + first + "–" + last + " of " + this.totalRows;
  }

  // The paginator only asks for a page. A real host would fetch it here and update
  // pageNumber once the fetch succeeds, so a failed load leaves the display unchanged.
  handlePageChange(event) {
    this.pageNumber = event.detail.page;
  }

  handlePageSizeChange(event) {
    this.pageSize = event.detail.pageSize;
    this.pageNumber = 1;
  }
}
