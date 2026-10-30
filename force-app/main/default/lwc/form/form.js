import { LightningElement, api } from "lwc";
import { fire } from "c/utils";

/**
 * General-purpose record form.
 *
 * Renders a lightning-record-edit-form, its fields and its button row from a layout config, so
 * callers describe a form instead of writing one:
 *
 *   <c-g_-form
 *     object-api-name="Account"
 *     record-id={recordId}
 *     sections={sections}
 *     preset-fields={presetFields}
 *     submit-label="Save"
 *     cancel-label="Cancel"
 *     onsaved={handleSaved}
 *     oncancelled={handleCancelled}>
 *   </c-g_-form>
 *
 * The component owns the whole form rather than just the fields because lightning-input-field
 * registers with its form through the DOM tree — it cannot be rendered from a nested component
 * and still find a form that lives in the caller's template.
 *
 * sections: [{ title?, hint?, fields: [...] }]
 * A field is either an API name or { apiName, size, variant, required, disabled }.
 *   size:    'full' | 'half' | 'third' (default 'third')
 *   variant: any lightning-input-field variant (default 'label-stacked')
 * Pass `fields` instead of `sections` for a single unlabelled group.
 *
 * Styling: --c-form-* custom properties, listed at the top of form.css.
 *
 * Events: saved (detail: {id, apiName, fields}), cancelled, formerror (detail: the form error).
 * A caller listening for formerror should pass hide-messages, so one failure is not reported three
 * times over — the field's own inline error stays either way.
 *
 * Switching record-id — including to undefined for create mode — rebuilds the inner form, so no
 * values survive from the record previously being edited. In create mode the form clears itself
 * after a successful save, ready for the next record.
 */

const SIZE_CLASSES = {
  full: "slds-col slds-size_1-of-1",
  half: "slds-col slds-size_1-of-1 slds-medium-size_1-of-2",
  third:
    "slds-col slds-size_1-of-1 slds-medium-size_1-of-2 slds-large-size_1-of-3"
};

export default class Form extends LightningElement {
  @api objectApiName;
  @api sections;
  @api fields;
  @api presetFields;
  @api submitLabel = "Save";
  @api submitVariant = "brand";
  @api cancelLabel;
  @api disabled = false;
  // Hide the built-in button row when the caller supplies its own — a modal footer, say. It then
  // drives the form by calling save() on this component.
  @api hideButtons = false;
  // Hide the form-level error banner. For a caller that handles `formerror` the banner is a third
  // report of one failure, behind the caller's own message and the field's inline error.
  @api hideMessages = false;

  _recordId;
  _formKey = 0;
  _saving = false;

  // Changing the record being edited must not leave the previous record's values on screen.
  // The inner form is rendered through a keyed iteration, so bumping the key here makes LWC
  // discard the old form element and build a new one.
  @api
  get recordId() {
    return this._recordId;
  }
  set recordId(value) {
    if (value === this._recordId) return;
    this._recordId = value;
    this._formKey += 1;
  }

  // Single-element iteration purely to get a keyed, replaceable form element.
  get formInstances() {
    return [{ key: `form-${this._formKey}`, recordId: this._recordId }];
  }

  get hasCancel() {
    return !!this.cancelLabel;
  }

  get showButtons() {
    return !this.hideButtons;
  }

  get showMessages() {
    return !this.hideMessages;
  }

  // Normalize the caller's layout into render-ready rows — LWC templates cannot compute classes
  // or keys inline.
  get renderSections() {
    const source =
      this.sections && this.sections.length
        ? this.sections
        : [{ fields: this.fields || [] }];

    return source.map((section, index) => ({
      key: `section-${index}`,
      title: section.title,
      hint: section.hint,
      fields: (section.fields || []).map((field) => {
        const spec = typeof field === "string" ? { apiName: field } : field;
        return {
          key: spec.apiName,
          apiName: spec.apiName,
          variant: spec.variant || "label-stacked",
          required: !!spec.required,
          disabled: this.disabled || !!spec.disabled,
          cssClass: `${SIZE_CLASSES[spec.size] || SIZE_CLASSES.third} field`
        };
      })
    }));
  }

  // Clear the form back to its defaults.
  @api
  reset() {
    const form = this.template.querySelector("lightning-record-edit-form");
    if (form) form.reset();
  }

  // The save button is deliberately NOT type="submit". A submit button only drives a form it
  // shares a DOM tree with, and under native shadow DOM the button is slotted into the form
  // rather than a descendant of it — so the click reaches nothing and the save silently never
  // happens. Reading the values off the input fields and calling submit() directly does not
  // depend on form association at all.
  handleSaveClick() {
    this.save();
  }

  // Still wired to the form's own submit event so pressing Enter in a field saves too.
  handleSubmit(event) {
    event.preventDefault();
    this.save();
  }

  // Public so a caller rendering its own buttons (see hideButtons) can submit the form. Reports the
  // outcome through the same saved / formerror events either way.
  @api
  save() {
    if (this._saving) return; // clicking twice must not create two records
    const values = { ...(this.presetFields || {}) };
    this.template.querySelectorAll("lightning-input-field").forEach((field) => {
      values[field.fieldName] = field.value;
    });
    if (this._recordId) {
      values.Id = this._recordId;
    }
    this._saving = true;
    this.template.querySelector("lightning-record-edit-form").submit(values);
  }

  handleSuccess(event) {
    this._saving = false;
    // Creating: rebuild the form so the next record can be entered straight away. Bumping the
    // key gives a brand new element, which is guaranteed empty — reset() only restores fields
    // to their initial values, and leaves anything the form did not consider a field behind.
    // Editing: the caller usually drops record-id, which rebuilds the form anyway.
    if (!this._recordId) {
      this._formKey += 1;
    }
    fire(this, "saved", {
      id: event.detail.id,
      apiName: event.detail.apiName,
      fields: event.detail.fields
    });
  }

  handleError(event) {
    this._saving = false;
    fire(this, "formerror", event.detail);
  }

  handleCancel() {
    fire(this, "cancelled");
  }
}
