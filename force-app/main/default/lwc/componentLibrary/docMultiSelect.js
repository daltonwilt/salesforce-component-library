export default {
  name: "multiSelect",
  label: "Multi-Select",
  category: "input",
  description:
    "Pick several values from a list. Each choice shows as a removable pill under the picker.",
  example: "exampleMultiSelect",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-multi-select` is a `lightning-combobox` to pick from and a `lightning-pill` for each choice to remove it again. An option disappears from the list once it is picked, so a value cannot be chosen twice.",
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
        "`required` is enforced by the component rather than passed to the combobox, which is emptied after every pick and would otherwise always report the field as missing.",
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
      description: "Passed through to the inner combobox."
    },
    {
      name: "placeholder",
      type: "string",
      default: '"Select an option…"',
      description:
        'Shown in the picker. Replaced with "All options selected" once every option is picked.'
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
      description: "Disables the picker and shows the pills without remove buttons."
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
    }
  ],
  events: [
    {
      name: "change",
      detail: "{ value: string[], valueString: string }",
      description:
        "A value was added or removed. valueString is the semicolon-joined form a multi-select picklist saves. Does not bubble."
    }
  ]
};
