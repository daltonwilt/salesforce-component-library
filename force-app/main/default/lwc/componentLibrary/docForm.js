export default {
  name: "form",
  label: "Form",
  category: "input",
  description:
    "A record form built from a layout config: sections, field sizes and a button row.",
  example: "exampleForm",
  exampleNote: "Saving this example creates a real Account in this org.",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-form` renders a `lightning-record-edit-form`, its fields and its buttons from a layout config, so a caller describes a form instead of writing one.",
        "It owns the whole form rather than just the fields because `lightning-input-field` finds its form through the DOM tree, and cannot do that from inside a nested component."
      ]
    },
    {
      heading: "Layout",
      body: [
        "Pass `sections`, each with an optional title and hint and a list of fields, or pass `fields` for a single unlabelled group. A field is an API name, or an object for more control:",
        {
          code: 'sections = [\n  {\n    title: "Contact",\n    fields: [\n      { apiName: "LastName", size: "half", required: true },\n      { apiName: "Email", size: "half" },\n      "Phone"\n    ]\n  }\n];'
        },
        "Sizes are responsive: `third` is one column on a phone, two on a tablet and three on a desktop; `half` is one then two; `full` always takes the row."
      ]
    },
    {
      heading: "Creating and editing",
      body: [
        "Leave `record-id` blank to create a record. After a successful create the form rebuilds itself empty, ready for the next record.",
        "Changing `record-id` rebuilds the inner form, so no values carry over from the record edited before. Values that belong on the record but not on screen, such as a parent lookup, go in `preset-fields`."
      ]
    },
    {
      heading: "Using your own buttons",
      body: [
        "In a modal the buttons usually belong in the footer. Set `hide-buttons` and call `save()` from your own button; the outcome still arrives as `saved` or `formerror`:",
        {
          code: '<c-form object-api-name="Case" fields={fields} hide-buttons onsaved={handleSaved}></c-form>\n\n<lightning-modal-footer>\n  <lightning-button variant="brand" label="Save" onclick={handleSave}></lightning-button>\n</lightning-modal-footer>'
        },
        {
          code: 'handleSave() {\n  this.template.querySelector("c-form").save();\n}'
        },
        "`save()` ignores a second call while the first is still saving, so a double click cannot create two records."
      ]
    },
    {
      heading: "Errors",
      body: [
        "A failed save shows in the form's error banner and against the field. If you also handle `formerror` yourself, pass `hide-messages` so the same failure is not reported three times."
      ]
    }
  ],
  attributes: [
    {
      name: "object-api-name",
      type: "string",
      required: true,
      description: "API name of the object, such as Account."
    },
    {
      name: "record-id",
      type: "string",
      description: "Record to edit. Leave blank to create one."
    },
    {
      name: "sections",
      type: "object[]",
      description: "[{ title?, hint?, fields }]. See Field options."
    },
    {
      name: "fields",
      type: "object[]",
      description: "A single unlabelled group of fields, used when sections is not set."
    },
    {
      name: "preset-fields",
      type: "object",
      description: "Values saved with the record but not shown, e.g. { AccountId: parentId }."
    },
    {
      name: "submit-label",
      type: "string",
      default: '"Save"',
      description: "Label of the save button."
    },
    {
      name: "submit-variant",
      type: "string",
      default: '"brand"',
      description: "lightning-button variant of the save button."
    },
    {
      name: "cancel-label",
      type: "string",
      description: "Label of the cancel button. Leave blank to hide it."
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Disables every field."
    },
    {
      name: "hide-buttons",
      type: "boolean",
      default: "false",
      description: "Hides the button row, for a caller that calls save() itself."
    },
    {
      name: "hide-messages",
      type: "boolean",
      default: "false",
      description: "Hides the form-level error banner."
    }
  ],
  fieldOptions: [
    {
      name: "apiName",
      type: "string",
      required: true,
      description: "Field API name."
    },
    {
      name: "size",
      type: "string",
      default: '"third"',
      description: "full, half or third."
    },
    {
      name: "variant",
      type: "string",
      default: '"label-stacked"',
      description: "Any lightning-input-field variant."
    },
    {
      name: "required",
      type: "boolean",
      default: "false",
      description: "Marks the field required on this form."
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Disables this one field."
    }
  ],
  methods: [
    {
      name: "save()",
      returns: "void",
      description: "Submits the form, as the save button does."
    },
    {
      name: "reset()",
      returns: "void",
      description: "Restores every field to its initial value."
    }
  ],
  events: [
    {
      name: "saved",
      detail: "{ id, apiName, fields }",
      description: "The record was saved."
    },
    {
      name: "cancelled",
      detail: "—",
      description: "The cancel button was clicked."
    },
    {
      name: "formerror",
      detail: "the record-edit-form error",
      description: "The save failed."
    }
  ],
  stylingHooks: [
    {
      name: "--c-form-font-family",
      description: "Font family for the form and its fields. Everything else follows the SLDS 2 global hooks."
    }
  ]
};
