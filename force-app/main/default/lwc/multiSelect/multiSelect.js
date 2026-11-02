import { LightningElement, api } from "lwc";
import { fire } from "c/utils";

/**
 * Multi-select picker: a dropdown that stays open while options are checked and unchecked, and
 * a lightning-pill per choice below it to remove one again.
 *
 *   Program Types
 *   [ 3 options selected               v ]
 *   | ✓ Housing                          |
 *   | ✓ Transit                          |
 *   | ✓ Broadband                        |
 *   |   Childcare                        |
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
 * Events: change (detail: { value: [...], valueString: "a;b" }), fired on every check and
 * uncheck. valueString is the form a multi-select picklist field saves.
 *
 * The list closes when focus leaves the field (a click outside, Tab) or on Escape. Keyboard:
 * ArrowUp/ArrowDown open the list and move through it, Home/End jump to either end, and
 * Enter/Space open it or toggle the highlighted option.
 *
 * Values are strings, so numbers are converted on the way in.
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
  _open = false;
  // The option the keyboard is on, or -1. Focus itself never leaves the input.
  _activeIndex = -1;
  _errorMessage = "";
  // Validation waits until the field has been left once, as native inputs do, so a required
  // field does not open in an error state.
  _touched = false;

  /* ── Presentation ─────────────────────────────────────────────────────────────────── */

  get showLabel() {
    return this.variant !== "label-hidden";
  }

  get labelClass() {
    return this.showLabel ? "slds-form-element__label" : "slds-assistive-text";
  }

  get showHelp() {
    return this.showLabel && !!this.fieldLevelHelp;
  }

  get formElementClass() {
    return this.hasError ? "slds-form-element slds-has-error" : "slds-form-element";
  }

  get isOpen() {
    return this._open && !this.triggerDisabled;
  }

  get comboboxClass() {
    return (
      "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click" +
      (this.isOpen ? " slds-is-open" : "")
    );
  }

  get triggerDisabled() {
    return this.disabled || this._options.length === 0;
  }

  /** Empty with nothing picked, so the placeholder shows. */
  get triggerValue() {
    const picked = this.selectedOptions;
    if (picked.length === 0) {
      return "";
    }
    return picked.length === 1 ? picked[0].label : `${picked.length} options selected`;
  }

  get ariaExpanded() {
    return String(this.isOpen);
  }

  get ariaRequired() {
    return String(this.required);
  }

  get ariaInvalid() {
    return String(this.hasError);
  }

  get describedBy() {
    return this.hasError ? "help-message" : undefined;
  }

  get activeOptionId() {
    return this.isOpen && this._activeIndex >= 0
      ? optionId(this._activeIndex)
      : undefined;
  }

  get listOptions() {
    const selected = new Set(this._value);
    return this._options.map((option, index) => {
      const isSelected = selected.has(option.value);
      let className =
        "slds-media slds-media_small slds-listbox__option slds-listbox__option_plain";
      if (isSelected) {
        className += " slds-is-selected";
      }
      if (index === this._activeIndex) {
        className += " slds-has-focus";
      }
      return {
        ...option,
        index,
        id: optionId(index),
        selected: isSelected,
        ariaSelected: String(isSelected),
        className
      };
    });
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

  get selectionLabel() {
    return `${this.label || ""} selections`.trim();
  }

  // lightning-pill always draws its remove button, so a disabled field shows plain SLDS pills
  // instead of ones that look removable and are not.
  get showRemovablePills() {
    return !this.disabled;
  }

  get hasError() {
    return !!this._errorMessage;
  }

  get errorMessage() {
    return this._errorMessage;
  }

  renderedCallback() {
    if (this.isOpen && this._activeIndex >= 0) {
      const active = this.template.querySelector(
        `[data-index="${this._activeIndex}"]`
      );
      // jsdom has no scrollIntoView.
      if (active && active.scrollIntoView) {
        active.scrollIntoView({ block: "nearest" });
      }
    }
  }

  /* ── Validation ───────────────────────────────────────────────────────────────────── */

  @api
  checkValidity() {
    return !this.required || this.hasSelection;
  }

  @api
  reportValidity() {
    this._touched = true;
    const valid = this.checkValidity();
    this._errorMessage = valid ? "" : this.messageWhenValueMissing;
    return valid;
  }

  @api
  focus() {
    const trigger = this.template.querySelector("input");
    if (trigger) {
      trigger.focus();
    }
  }

  /* ── Dropdown ─────────────────────────────────────────────────────────────────────── */

  handleTriggerClick() {
    if (this.triggerDisabled) {
      return;
    }
    if (this._open) {
      this.close();
    } else {
      this.open();
    }
  }

  handleTriggerKeydown(event) {
    if (this.triggerDisabled) {
      return;
    }
    const last = this._options.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!this._open) {
          this.open();
        } else if (event.key === "ArrowDown") {
          this._activeIndex = this._activeIndex >= last ? 0 : this._activeIndex + 1;
        } else {
          this._activeIndex = this._activeIndex <= 0 ? last : this._activeIndex - 1;
        }
        break;
      case "Home":
      case "End":
        if (this._open) {
          event.preventDefault();
          this._activeIndex = event.key === "Home" ? 0 : last;
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!this._open) {
          this.open();
        } else if (this._activeIndex >= 0) {
          this.toggle(this._options[this._activeIndex].value);
        }
        break;
      case "Escape":
        // Stopped, so an enclosing modal does not close along with the list.
        if (this._open) {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
        break;
      default:
    }
  }

  handleTriggerBlur() {
    this.close();
    this.reportValidity();
  }

  // Keeps focus on the input while an option (or the list's scrollbar) is clicked; otherwise
  // the input would blur and close the list before the click registered.
  handleDropdownMouseDown(event) {
    event.preventDefault();
  }

  handleOptionClick(event) {
    const { index, value } = event.currentTarget.dataset;
    this._activeIndex = Number(index);
    this.toggle(value);
  }

  open() {
    const firstSelected = this._options.findIndex((option) =>
      this._value.includes(option.value)
    );
    this._activeIndex = Math.max(firstSelected, 0);
    this._open = true;
  }

  close() {
    this._open = false;
    this._activeIndex = -1;
  }

  /* ── Selection ────────────────────────────────────────────────────────────────────── */

  toggle(value) {
    this.commit(
      this._value.includes(value)
        ? this._value.filter((v) => v !== value)
        : [...this._value, value]
    );
  }

  handleRemove(event) {
    if (this.disabled) {
      return;
    }
    const removed = event.target.name;
    this.commit(this._value.filter((value) => value !== removed));
  }

  commit(values) {
    this._value = values;
    if (this._touched) {
      this.reportValidity();
    }
    fire(this, "change", { value: [...values], valueString: values.join(";") });
  }
}

function optionId(index) {
  return `option-${index}`;
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
