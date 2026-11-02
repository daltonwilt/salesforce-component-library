export default {
  name: "fileLoader",
  label: "File Loader",
  category: "input",
  description:
    "Attach files to a record, list what is attached, and remove a file. Works before the record exists.",
  example: "exampleFileLoader",
  exampleNote:
    "This example has no record-id, so picked files are staged in the browser and nothing is uploaded.",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-file-loader` is a file picker, the list of files already attached to a record, and a remove button on each. It is backed by the `FileController` Apex class."
      ]
    },
    {
      heading: "Attached and staged modes",
      body: [
        "With a `record-id`, a picked file uploads straight away and joins the list.",
        "Without one — because the record has not been saved yet — picked files are held in the browser and listed as pending. Once the host has saved the record, it uploads them with `commit()`:",
        {
          code: 'const loader = this.template.querySelector("c-file-loader");\nconst { uploaded, failed } = await loader.commit(newRecordId);\nif (failed) {\n  // The record is saved; report a partial success rather than a failed save.\n}'
        },
        "`commit()` resolves rather than rejecting when a file fails. By then the record exists, so a failed file is a partial success to report, not a lost save."
      ]
    },
    {
      heading: "File categories",
      body: [
        "Set `prefix-group` to the developer name of a `Prefix_Group__mdt` record to ask for a category with each upload. The choices are that group's `Prefix_Option__mdt` records, and only files in the group are listed. A group with a single option is selected automatically.",
        "The category is stored in `ContentVersion.Prefix__c` and prepended to the file name, so it is still visible in the standard Files related list."
      ]
    },
    {
      heading: "Limits",
      body: [
        "Each file is sent to Apex as base64 in a single call, so files over 4.5 MB are refused with a message rather than failing on the server. Files upload one at a time to stay inside the Apex heap, and each one succeeds or fails on its own."
      ]
    },
    {
      heading: "Messages",
      body: [
        "Success and failure are shown inline and fired as events rather than raised as toasts: the component is often used inside a modal, where a toast never reaches the screen."
      ]
    }
  ],
  attributes: [
    {
      name: "record-id",
      type: "string",
      description: "Record the files are attached to. Leave blank for staged mode."
    },
    {
      name: "parent-id",
      type: "string",
      description: "A second record each uploaded file is shared with, with viewer access."
    },
    {
      name: "prefix-group",
      type: "string",
      description: "Prefix_Group__mdt developer name. Adds a category picker."
    },
    {
      name: "label",
      type: "string",
      default: '"Attachments"',
      description: "Heading above the picker."
    },
    {
      name: "accepted-formats",
      type: "string",
      description: "File types the picker offers, e.g. .pdf,.docx."
    },
    {
      name: "single-file",
      type: "boolean",
      default: "false",
      description: "Allow one file per pick instead of several."
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Disables picking and removing."
    }
  ],
  methods: [
    {
      name: "commit(recordId)",
      returns: "Promise<{ uploaded, failed }>",
      description: "Uploads every staged file to a record that now exists. Never rejects."
    },
    {
      name: "refresh()",
      returns: "Promise",
      description: "Reloads the list of attached files."
    }
  ],
  events: [
    {
      name: "uploaded",
      detail: "{ count: number }",
      description: "One or more files were attached."
    },
    {
      name: "deleted",
      detail: "{ contentDocumentId }",
      description: "A file was removed."
    },
    {
      name: "fileerror",
      detail: "{ failures: string[] }",
      description: "One or more uploads failed. Each failure names its file."
    }
  ]
};
