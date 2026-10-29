import { LightningElement, api } from "lwc";
import { fire } from "c/utils";

/**
 * Multi-select picker: a lightning-combobox to pick from, and a lightning-pill per choice below
 * it to remove one again.
 *
 *   Program Types
 *   [ Select an option…                v ]
 *   (Housing ×) (Transit ×) (Broadband ×)
 *
 *   <c-multi-select
 *     label="Program Types"
 *     options={programTypeOptions}
 *     value={selectedProgramTypes}
 *     required
 *     onchange={handleProgramTypesChange}>
 *   </c-multi-select>
 *
 * options: [{ label, value }] — the same shape lightning-combobox takes.
 * value:   an array of option values, or a semicolon-separated string, so a multi-select
 *          picklist field's value can be passed straight in.
 *
 * Events: change (detail: { value: [...], valueString: "a;b" }). valueString is the form a
 * multi-select picklist field saves.
 *
 * Values are strings: lightning-combobox compares option values as strings, so numbers are
 * converted on the way in.
 */
export default class MultiSelect extends LightningElement {
  @api label;
  @api name;
  @api placeholder = "Select an option…";
  @api fieldLevelHelp;
  @api messageWhenValueMissing = "Complete this field.";
  @api disabled = false;
  @api required = false;
  /** 'standard' or 'label-hidden'. The label is still read out by screen readers when hidden. */
  @api variant = "standard";

  @api
  get options() {
    return this._options;
  }
  set options(value) {
    this._options = (value || []).map((option) => ({
      label: option.label,
      value: String(option.value)
    }));
  }

  @api
  get value() {
    return [...this._value];
  }
  set value(value) {
    this._value = parseValueList(value);
  }

  _options = [];
  _value = [];
  // Validation waits until the field has been left once, as native inputs do, so a required
  // field does not open in an error state.
  _touched = false;

  /* ── Presentation ─────────────────────────────────────────────────────────────────── */

  get showLabel() {
    return this.variant !== "label-hidden";
  }

  get hasHelp() {
    return !!this.fieldLevelHelp;
  }

  /**
   * The picks, in the order they were made. A value with no matching option still gets a pill,
   * labelled with the raw value — options often load after the value does, and silently hiding
   * a saved choice would let the next save drop it.
   */
  get selectedOptions() {
    const byValue = new Map(
      this._options.map((option) => [option.value, option])
    );
    return this._value.map((value) => ({
      key: value,
      value,
      label: byValue.has(value) ? byValue.get(value).label : value
    }));
  }

  get hasSelection() {
    return this._value.length > 0;
  }

  get availableOptions() {
    const selected = new Set(this._value);
    return this._options.filter((option) => !selected.has(option.value));
  }

  get comboboxDisabled() {
    return this.disabled || this.availableOptions.length === 0;
  }

  get comboboxPlaceholder() {
    return this._options.length && !this.availableOptions.length
      ? "All options selected"
      : this.placeholder;
  }

  // lightning-pill always draws its remove button, so a disabled field shows plain SLDS pills
  // instead of ones that look removable and are not.
  get showRemovablePills() {
    return !this.disabled;
  }

  /* ── Validation ───────────────────────────────────────────────────────────────────── */

  // `required` is handled here rather than passed to the combobox: the combobox is emptied after
  // every pick, so it would report the field missing no matter how much had been selected.
  @api
  checkValidity() {
    return !this.required || this.hasSelection;
  }

  @api
  reportValidity() {
    this._touched = true;
    const valid = this.checkValidity();
    const combobox = this.template.querySelector("lightning-combobox");
    if (combobox) {
      combobox.setCustomValidity(valid ? "" : this.messageWhenValueMissing);
      combobox.reportValidity();
    }
    return valid;
  }

  /* ── Selection ────────────────────────────────────────────────────────────────────── */

  handleAdd(event) {
    const picked = event.detail.value;
    // Clear the combobox straight away. Its bound value never changes from empty, so the
    // template alone would leave the last pick sitting in the box.
    event.target.value = null;
    if (!picked || this._value.includes(picked)) {
      return;
    }
    this.commit([...this._value, picked]);
  }

  handleRemove(event) {
    if (this.disabled) {
      return;
    }
    const removed = event.target.name;
    this.commit(this._value.filter((value) => value !== removed));
  }

  handleBlur() {
    this.reportValidity();
  }

  commit(values) {
    this._value = values;
    if (this._touched) {
      this.reportValidity();
    }
    fire(this, "change", { value: [...values], valueString: values.join(";") });
  }
}

function parseValueList(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value == null ? "" : value).split(";");
  const values = raw
    .map((part) => String(part).trim())
    .filter((part) => part !== "");
  return [...new Set(values)];
}
