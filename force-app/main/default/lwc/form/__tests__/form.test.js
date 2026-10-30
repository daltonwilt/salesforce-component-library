import { createElement } from "@lwc/engine-dom";
import Form from "c/form";

const SECTIONS = [
  {
    title: "Details",
    hint: "Basic account information.",
    fields: [
      "Name",
      { apiName: "Phone", size: "half", required: true },
      { apiName: "Website", size: "full", variant: "label-inline" }
    ]
  },
  { fields: [{ apiName: "Description", disabled: true }] }
];

function render(props = {}) {
  const element = createElement("c-form", { is: Form });
  Object.assign(element, {
    objectApiName: "Account",
    sections: SECTIONS,
    ...props
  });
  document.body.appendChild(element);
  return element;
}

const query = (element, selector) => element.shadowRoot.querySelector(selector);
const queryAll = (element, selector) => [
  ...element.shadowRoot.querySelectorAll(selector)
];
const recordForm = (element) => query(element, "lightning-record-edit-form");
const inputFields = (element) => queryAll(element, "lightning-input-field");
const buttons = (element) => queryAll(element, "lightning-button");
const flush = () => Promise.resolve();

// The stub's submit() does nothing, and the form element is replaced on every rebuild, so each
// test spies on whichever element is current.
function mockSubmit(element) {
  const submit = jest.fn();
  recordForm(element).submit = submit;
  return submit;
}

function listen(element, name) {
  const handler = jest.fn();
  element.addEventListener(name, handler);
  return handler;
}

describe("c-form", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  describe("layout", () => {
    it("renders each section's title, hint and fields", () => {
      const element = render();

      expect(
        queryAll(element, ".group-title").map((p) => p.textContent)
      ).toEqual(["Details"]);
      expect(queryAll(element, ".hint").map((p) => p.textContent)).toEqual([
        "Basic account information."
      ]);
      expect(queryAll(element, ".section")).toHaveLength(2);
      expect(inputFields(element).map((field) => field.fieldName)).toEqual([
        "Name",
        "Phone",
        "Website",
        "Description"
      ]);
    });

    it("normalizes string and object field specs", () => {
      const [name, phone, website, description] = inputFields(render());

      expect(name.variant).toBe("label-stacked");
      expect(name.required).toBe(false);
      expect(phone.required).toBe(true);
      expect(website.variant).toBe("label-inline");
      expect(description.disabled).toBe(true);
      expect(name.disabled).toBe(false);
    });

    it("sizes field columns, defaulting to a third", () => {
      const element = render();
      const classes = inputFields(element).map(
        (field) => field.parentElement.className
      );

      expect(classes[0]).toContain("slds-large-size_1-of-3");
      expect(classes[1]).toContain("slds-medium-size_1-of-2");
      expect(classes[1]).not.toContain("slds-large-size_1-of-3");
      expect(classes[2]).toBe("slds-col slds-size_1-of-1 field");
    });

    it("renders `fields` as one unlabelled section when no sections are given", () => {
      const element = render({
        sections: undefined,
        fields: ["Name", "Phone"]
      });

      expect(queryAll(element, ".section")).toHaveLength(1);
      expect(query(element, ".group-title")).toBeNull();
      expect(inputFields(element).map((field) => field.fieldName)).toEqual([
        "Name",
        "Phone"
      ]);
    });

    it("disables every field when the form is disabled", () => {
      const element = render({ disabled: true });
      expect(inputFields(element).every((field) => field.disabled)).toBe(true);
    });

    it("passes the object and record to the record-edit form", () => {
      const form = recordForm(render({ recordId: "001000000000001" }));
      expect(form.objectApiName).toBe("Account");
      expect(form.recordId).toBe("001000000000001");
    });
  });

  describe("buttons and messages", () => {
    it("shows a save button with the default label and variant", () => {
      const [save, ...rest] = buttons(render());

      expect(save.label).toBe("Save");
      expect(save.variant).toBe("brand");
      expect(rest).toHaveLength(0);
    });

    it("shows a cancel button only when given a cancel label", () => {
      const element = render({
        submitLabel: "Create",
        submitVariant: "success",
        cancelLabel: "Back"
      });

      expect(buttons(element).map((button) => button.label)).toEqual([
        "Create",
        "Back"
      ]);
      expect(buttons(element)[0].variant).toBe("success");
    });

    it("hides the button row with hide-buttons", () => {
      expect(buttons(render({ hideButtons: true }))).toHaveLength(0);
    });

    it("shows form messages unless hide-messages is set", () => {
      expect(query(render(), "lightning-messages")).not.toBeNull();
      expect(
        query(render({ hideMessages: true }), "lightning-messages")
      ).toBeNull();
    });
  });

  describe("saving", () => {
    it("submits the field values with the preset fields", () => {
      const element = render({ presetFields: { Type: "Customer" } });
      const submit = mockSubmit(element);
      const [name, phone] = inputFields(element);
      name.value = "Acme";
      phone.value = "555-0100";

      buttons(element)[0].click();

      expect(submit).toHaveBeenCalledWith({
        Type: "Customer",
        Name: "Acme",
        Phone: "555-0100",
        Website: undefined,
        Description: undefined
      });
    });

    it("includes the record Id when editing", () => {
      const element = render({ recordId: "001000000000001" });
      const submit = mockSubmit(element);

      element.save();

      expect(submit.mock.calls[0][0].Id).toBe("001000000000001");
    });

    it("saves instead of submitting natively when the form submits", () => {
      const element = render();
      const submit = mockSubmit(element);
      const event = new CustomEvent("submit", { cancelable: true });

      recordForm(element).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it("ignores a second save while the first is in flight", () => {
      const element = render();
      const submit = mockSubmit(element);

      element.save();
      element.save();

      expect(submit).toHaveBeenCalledTimes(1);
    });

    it("fires saved with the new record and rebuilds the form in create mode", async () => {
      const element = render();
      const saved = listen(element, "saved");
      const before = recordForm(element);
      mockSubmit(element);

      element.save();
      before.dispatchEvent(
        new CustomEvent("success", {
          detail: { id: "001NEW", apiName: "Account", fields: { Name: {} } }
        })
      );
      await flush();

      expect(saved).toHaveBeenCalledTimes(1);
      expect(saved.mock.calls[0][0].detail).toEqual({
        id: "001NEW",
        apiName: "Account",
        fields: { Name: {} }
      });
      expect(recordForm(element)).not.toBe(before);

      // The guard is released, so the next record can be saved.
      const submit = mockSubmit(element);
      element.save();
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it("keeps the same form after saving in edit mode", async () => {
      const element = render({ recordId: "001000000000001" });
      const before = recordForm(element);
      mockSubmit(element);

      element.save();
      before.dispatchEvent(
        new CustomEvent("success", { detail: { id: "001000000000001" } })
      );
      await flush();

      expect(recordForm(element)).toBe(before);
    });

    it("fires formerror and allows a retry when the save fails", () => {
      const element = render();
      const formerror = listen(element, "formerror");
      const submit = mockSubmit(element);
      const detail = { message: "Required fields are missing" };

      element.save();
      recordForm(element).dispatchEvent(new CustomEvent("error", { detail }));
      element.save();

      expect(formerror.mock.calls[0][0].detail).toEqual(detail);
      expect(submit).toHaveBeenCalledTimes(2);
    });
  });

  describe("record switching and reset", () => {
    it("rebuilds the form when the record changes", async () => {
      const element = render({ recordId: "001000000000001" });
      const before = recordForm(element);

      element.recordId = "001000000000001";
      await flush();
      expect(recordForm(element)).toBe(before);

      element.recordId = "001000000000002";
      await flush();
      expect(recordForm(element)).not.toBe(before);
      expect(recordForm(element).recordId).toBe("001000000000002");
    });

    it("resets the record-edit form", () => {
      const element = render();
      const reset = jest.fn();
      recordForm(element).reset = reset;

      element.reset();

      expect(reset).toHaveBeenCalledTimes(1);
    });
  });

  it("fires cancelled from the cancel button", () => {
    const element = render({ cancelLabel: "Cancel" });
    const cancelled = listen(element, "cancelled");

    buttons(element)[1].click();

    expect(cancelled).toHaveBeenCalledTimes(1);
  });
});
