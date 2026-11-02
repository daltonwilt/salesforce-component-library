import { LightningElement } from "lwc";
import { debounce, toast, toastError } from "c/utils";

// The shape an Apex method's rejection takes in a catch block.
const SAMPLE_APEX_ERROR = {
  status: 400,
  body: { message: "Insufficient access rights on cross-reference id." }
};

export default class ExampleUtils extends LightningElement {
  searchCount = 0;
  lastTerm = "(none)";

  // A class field, so every keystroke shares one timer.
  search = debounce((term) => {
    this.searchCount += 1;
    this.lastTerm = term || "(empty)";
  }, 400);

  disconnectedCallback() {
    this.search.cancel();
  }

  handleSuccess() {
    toast(this, "Saved", "Request submitted.", "success");
  }

  handleError() {
    // toastError digs the readable message out of the error, whatever its shape.
    toastError(this, SAMPLE_APEX_ERROR, "The request could not be saved.");
  }

  handleSearchInput(event) {
    this.search(event.target.value);
  }
}
