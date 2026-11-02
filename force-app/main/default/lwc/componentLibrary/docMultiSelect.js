export default {
  name: "multiSelect",
  label: "Multi-Select",
  category: "input",
  description:
    "Pick several values from a dropdown that stays open while you check them. Each choice also shows as a removable pill under the picker.",
  example: "exampleMultiSelect",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-multi-select` is a dropdown of checkable options and a `lightning-pill` for each choice to remove it again. Clicking an option checks it, clicking it again unchecks it, and the list stays open the whole time, so several values can be picked in one go.",
        "The field shows the placeholder when nothing is picked, the option's label for one pick, and \"N options selected\" for more. The list closes on a click outside the field, on Tab, or on Escape.",
        "Options take the same `[{ label, value }]` shape `lightning-combobox` does. Values are compared as strings, so numeric values are converted on the way in."
      ]
    },
    {
      heading: "Binding a multi-select picklist",
      body: [
        "`value` accepts an array or a semicolon-separated string, and the `change` event reports both forms, so a multi-select picklist field needs no conversion either way:",
        {
          code: 'handleChange(event) {\n  this.record.Program_Types__c = event.detail.valueString; // "Housing;Transit"\n}'
        }
      ]
    },
    {
      heading: "Values with no matching option",
      body: [
        "A value with no matching option still gets a pill, labelled with the raw value. Options often load after the value does, and hiding a saved choice would let the next save drop it."
      ]
    },
    {
      heading: "Validation",
      body: [
        "`required` needs at least one selection. The error message is drawn under the field, which is outlined in red until a value is picked.",
        "As with native inputs, the error appears only once the field has been left. Call `reportValidity()` before a save to show it straight away:",
        {
          code: 'const picker = this.template.querySelector("c-multi-select");\nif (!picker.reportValidity()) {\n  return;\n}'
        }
      ]
    },
    {
      heading: "Disabled",
      body: [
        "`lightning-pill` always draws a remove button, so a disabled field renders plain SLDS pills instead of ones that look removable and are not."
      ]
    },
    {
      heading: "Accessibility",
      body: [
        "The field is a read-only input with `role=\"combobox\"` controlling a listbox marked `aria-multiselectable`, and each option reports its state through `aria-selected`. Focus stays on the input while the list is open; the highlighted option is tracked with `aria-activedescendant`.",
        "Keyboard: ArrowDown and ArrowUp open the list and move through it, wrapping at either end. Home and End jump to the first and last option. Enter and Space open the list or toggle the highlighted option. Escape closes the list without closing an enclosing modal.",
        "The pills sit in a horizontal listbox labelled with the field's label. With `variant=\"label-hidden\"` the label is hidden visually but still announced by screen readers."
      ]
    }
  ],
  attributes: [
    { name: "label", type: "string", description: "Text label for the field." },
    {
      name: "options",
      type: "object[]",
      default: "[]",
      description: "The choices, as [{ label, value }]."
    },
    {
      name: "value",
      type: "string[] | string",
      default: "[]",
      description:
        "Selected values, as an array or a semicolon-separated string. Reading it always returns a new array."
    },
    {
      name: "name",
      type: "string",
      description: "Set as the name of the inner input."
    },
    {
      name: "placeholder",
      type: "string",
      default: '"Select an option…"',
      description: "Shown in the field while nothing is selected."
    },
    {
      name: "field-level-help",
      type: "string",
      description: "Help text shown in a tooltip next to the label."
    },
    {
      name: "message-when-value-missing",
      type: "string",
      default: '"Complete this field."',
      description: "Error shown when the field is required and empty."
    },
    {
      name: "required",
      type: "boolean",
      default: "false",
      description: "Requires at least one selection."
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description:
        "Disables the picker and shows the pills without remove buttons. The picker is also disabled when there are no options."
    },
    {
      name: "variant",
      type: "string",
      default: '"standard"',
      description: "standard or label-hidden."
    }
  ],
  methods: [
    {
      name: "checkValidity()",
      returns: "boolean",
      description:
        "Whether the field is valid: not required, or at least one value selected. Shows nothing."
    },
    {
      name: "reportValidity()",
      returns: "boolean",
      description:
        "Checks validity, then shows or clears the error on the field."
    },
    {
      name: "focus()",
      returns: "void",
      description: "Moves focus to the field."
    }
  ],
  events: [
    {
      name: "change",
      detail: "{ value: string[], valueString: string }",
      description:
        "A value was checked, unchecked or removed with its pill. Fires on every change, while the list is still open. valueString is the semicolon-joined form a multi-select picklist saves. Does not bubble."
    }
  ]
};
