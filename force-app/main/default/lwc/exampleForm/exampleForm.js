import { LightningElement } from "lwc";

export default class ExampleForm extends LightningElement {
  sections = [
    {
      title: "Account",
      fields: [
        { apiName: "Name", size: "half", required: true },
        { apiName: "Website", size: "half" },
        "Industry",
        "Type",
        "Rating"
      ]
    },
    {
      title: "Notes",
      hint: "A full-width field takes the whole row at every screen size.",
      fields: [{ apiName: "Description", size: "full" }]
    }
  ];

  savedId;

  handleSaved(event) {
    this.savedId = event.detail.id;
  }

  handleReset() {
    this.template.querySelector("c-form").reset();
  }
}
