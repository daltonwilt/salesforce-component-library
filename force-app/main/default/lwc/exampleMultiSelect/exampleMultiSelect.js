import { LightningElement } from "lwc";

export default class ExampleMultiSelect extends LightningElement {
  options = [
    { label: "Housing", value: "Housing" },
    { label: "Transit", value: "Transit" },
    { label: "Broadband", value: "Broadband" },
    { label: "Childcare", value: "Childcare" },
    { label: "Energy Assistance", value: "Energy" }
  ];

  // A multi-select picklist value can be passed straight in.
  value = "Housing;Transit";
  savedValue = "Housing;Transit";

  handleChange(event) {
    this.value = event.detail.value;
    this.savedValue = event.detail.valueString || "(none)";
  }
}
