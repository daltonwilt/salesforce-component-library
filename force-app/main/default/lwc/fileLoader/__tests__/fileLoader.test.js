import { createElement } from "@lwc/engine-dom";
import FileLoader from "c/fileLoader";
import getPrefixOptions from "@salesforce/apex/FileController.getPrefixOptions";
import getFiles from "@salesforce/apex/FileController.getFiles";
import saveFile from "@salesforce/apex/FileController.saveFile";
import deleteFile from "@salesforce/apex/FileController.deleteFile";

jest.mock(
  "@salesforce/apex/FileController.getPrefixOptions",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/FileController.getFiles",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/FileController.saveFile",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/FileController.deleteFile",
  () => ({ default: jest.fn() }),
  { virtual: true }
);

const RECORD_ID = "001000000000001AAA";
const ROWS = [
  { contentDocumentId: "069000000000001AAA", title: "Report.pdf" },
  { contentDocumentId: "069000000000002AAA", title: "Photo.png" }
];
const OPTIONS = [
  { label: "Invoice", value: "INV" },
  { label: "Receipt", value: "RCT" }
];

/** An Apex failure as it reaches the component. */
const apexError = (message) => ({ body: { message } });

function render(props = {}) {
  const element = createElement("c-file-loader", { is: FileLoader });
  Object.assign(element, props);
  document.body.appendChild(element);
  return element;
}

/**
 * Lets Apex promises and FileReader callbacks land. FileReader reports on a later task rather
 * than a microtask, so a plain Promise.resolve() is not enough.
 */
async function settle() {
  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-await-in-loop, @lwc/lwc/no-async-operation
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const query = (element, selector) => element.shadowRoot.querySelector(selector);
const queryAll = (element, selector) => [
  ...element.shadowRoot.querySelectorAll(selector)
];
const fileInput = (element) => query(element, "lightning-input");
const prefixPicker = (element) => query(element, "lightning-combobox");
const fileLinks = (element) => queryAll(element, "a.file-name");
const stagedNames = (element) =>
  queryAll(element, "span.file-name").map((span) => span.textContent);
const status = (element) => query(element, "[role='status']");
const text = (element) => element.shadowRoot.textContent;

function textFile(name, contents = "hello") {
  return new File([contents], name, { type: "text/plain" });
}

function oversizedFile(name) {
  const file = textFile(name);
  Object.defineProperty(file, "size", { value: 5000000 });
  return file;
}

/** Simulates picking files: the stub input has no `files`, so one is put on it first. */
async function pick(element, files) {
  const input = fileInput(element);
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new CustomEvent("change"));
  await settle();
}

function listen(element, name) {
  const handler = jest.fn();
  element.addEventListener(name, handler);
  return handler;
}

describe("c-file-loader", () => {
  beforeEach(() => {
    getPrefixOptions.mockResolvedValue(OPTIONS);
    getFiles.mockResolvedValue(ROWS);
    saveFile.mockResolvedValue("068000000000001AAA");
    deleteFile.mockResolvedValue("ok");
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("attached files", () => {
    it("lists the record's files with download links", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();

      expect(getFiles).toHaveBeenCalledWith({
        recordId: RECORD_ID,
        prefixGroup: undefined,
        prefixOption: null
      });
      expect(
        fileLinks(element).map((link) => [link.textContent, link.href])
      ).toEqual([
        [
          "Report.pdf",
          "http://localhost/sfc/servlet.shepherd/document/download/069000000000001AAA"
        ],
        [
          "Photo.png",
          "http://localhost/sfc/servlet.shepherd/document/download/069000000000002AAA"
        ]
      ]);
      expect(text(element)).not.toContain("No files attached.");
    });

    it("loads once a late record-id arrives", async () => {
      const element = render();
      await settle();
      expect(getFiles).not.toHaveBeenCalled();

      element.recordId = RECORD_ID;
      await settle();

      expect(getFiles).toHaveBeenCalledTimes(1);
      expect(fileLinks(element)).toHaveLength(2);
    });

    it("loads again when the record changes", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();

      element.recordId = "001000000000002AAA";
      await settle();

      expect(getFiles).toHaveBeenCalledTimes(2);
      expect(getFiles.mock.calls[1][0].recordId).toBe("001000000000002AAA");
    });

    it("reloads on refresh()", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();

      await element.refresh();

      expect(getFiles).toHaveBeenCalledTimes(2);
    });

    it("shows the empty note when there is nothing attached", async () => {
      getFiles.mockResolvedValue([]);
      const element = render({ recordId: RECORD_ID });
      await settle();

      expect(fileLinks(element)).toHaveLength(0);
      expect(text(element)).toContain("No files attached.");
    });

    it("reports a failed load inline", async () => {
      getFiles.mockRejectedValue(apexError("Insufficient access"));
      const element = render({ recordId: RECORD_ID });
      await settle();

      expect(status(element).textContent).toBe("Insufficient access");
      expect(status(element).className).toContain("file-status_error");
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("prefix categories", () => {
    it("shows no picker and asks for no options without a prefix group", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();

      expect(getPrefixOptions).not.toHaveBeenCalled();
      expect(prefixPicker(element)).toBe(null);
      expect(fileInput(element).disabled).toBe(false);
    });

    it("holds the input shut until a category is picked", async () => {
      const element = render({ recordId: RECORD_ID, prefixGroup: "Expenses" });
      await settle();

      expect(getPrefixOptions).toHaveBeenCalledWith({ prefixGroup: "Expenses" });
      expect(getFiles.mock.calls[0][0].prefixGroup).toBe("Expenses");
      expect(prefixPicker(element).options).toEqual(OPTIONS);
      expect(fileInput(element).disabled).toBe(true);

      prefixPicker(element).dispatchEvent(
        new CustomEvent("change", { detail: { value: "RCT" } })
      );
      await settle();

      expect(prefixPicker(element).value).toBe("RCT");
      expect(fileInput(element).disabled).toBe(false);
    });

    it("picks the only category itself", async () => {
      getPrefixOptions.mockResolvedValue([OPTIONS[0]]);
      const element = render({ recordId: RECORD_ID, prefixGroup: "Expenses" });
      await settle();

      expect(prefixPicker(element).value).toBe("INV");
      expect(fileInput(element).disabled).toBe(false);
    });

    it("reports categories that will not load", async () => {
      getPrefixOptions.mockRejectedValue(new Error("offline"));
      const element = render({ prefixGroup: "Expenses" });
      await settle();

      expect(prefixPicker(element)).toBe(null);
      expect(status(element).textContent).toBe("offline");
    });
  });

  describe("uploading to a saved record", () => {
    it("uploads a picked file, reloads the list and fires uploaded", async () => {
      const element = render({ recordId: RECORD_ID, parentId: "a00000000000001AAA" });
      await settle();
      const uploaded = listen(element, "uploaded");

      await pick(element, [textFile("notes.txt")]);

      expect(saveFile).toHaveBeenCalledWith({
        recordId: RECORD_ID,
        fileName: "notes.txt",
        base64Data: encodeURIComponent(btoa("hello")),
        prefix: undefined,
        parentId: "a00000000000001AAA"
      });
      expect(getFiles).toHaveBeenCalledTimes(2);
      expect(status(element).textContent).toBe("1 file attached.");
      expect(status(element).className).toContain("file-status_success");
      expect(uploaded.mock.calls[0][0].detail).toEqual({ count: 1 });
    });

    it("stamps the category on the file and its name", async () => {
      getPrefixOptions.mockResolvedValue([OPTIONS[0]]);
      const element = render({ recordId: RECORD_ID, prefixGroup: "Expenses" });
      await settle();

      await pick(element, [textFile("march.pdf")]);

      expect(saveFile.mock.calls[0][0]).toMatchObject({
        fileName: "INV_march.pdf",
        prefix: "INV"
      });
    });

    it("uploads several files one after another", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();

      await pick(element, [textFile("a.txt"), textFile("b.txt")]);

      expect(saveFile.mock.calls.map(([args]) => args.fileName)).toEqual([
        "a.txt",
        "b.txt"
      ]);
      expect(status(element).textContent).toBe("2 files attached.");
    });

    it("keeps the files that worked when one fails", async () => {
      saveFile
        .mockResolvedValueOnce("068000000000001AAA")
        .mockRejectedValueOnce(apexError("Storage limit exceeded"));
      const element = render({ recordId: RECORD_ID });
      await settle();
      const uploaded = listen(element, "uploaded");
      const fileerror = listen(element, "fileerror");

      await pick(element, [textFile("a.txt"), textFile("b.txt")]);

      expect(uploaded.mock.calls[0][0].detail).toEqual({ count: 1 });
      expect(fileerror.mock.calls[0][0].detail).toEqual({
        failures: ["b.txt: Storage limit exceeded"]
      });
      expect(status(element).textContent).toBe("b.txt: Storage limit exceeded");
      expect(status(element).className).toContain("file-status_error");
    });

    it("turns away files over 4.5 MB and uploads the rest", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();

      await pick(element, [oversizedFile("huge.zip"), textFile("small.txt")]);

      expect(saveFile).toHaveBeenCalledTimes(1);
      expect(saveFile.mock.calls[0][0].fileName).toBe("small.txt");
    });

    it("says which file was too big when nothing is left to upload", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();

      await pick(element, [oversizedFile("huge.zip")]);

      expect(saveFile).not.toHaveBeenCalled();
      expect(status(element).textContent).toBe(
        "huge.zip exceeds the 4.5 MB limit and was not attached."
      );
    });

    it("drops a file that will not read without losing the others", async () => {
      const read = FileReader.prototype.readAsDataURL;
      jest
        .spyOn(FileReader.prototype, "readAsDataURL")
        .mockImplementation(function (file) {
          if (file.name === "broken.txt") {
            this.onerror();
            return;
          }
          read.call(this, file);
        });
      const element = render({ recordId: RECORD_ID });
      await settle();

      await pick(element, [textFile("broken.txt"), textFile("fine.txt")]);

      expect(saveFile).toHaveBeenCalledTimes(1);
      expect(saveFile.mock.calls[0][0].fileName).toBe("fine.txt");
    });

    it("ignores an empty selection and clears the input", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();
      fileInput(element).value = "C:\\fakepath\\old.txt";

      await pick(element, []);

      expect(saveFile).not.toHaveBeenCalled();
      expect(fileInput(element).value).toBe(null);
    });

    it("shows that it is working and locks the input mid-upload", async () => {
      let finish;
      saveFile.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        })
      );
      const element = render({ recordId: RECORD_ID });
      await settle();

      await pick(element, [textFile("slow.txt")]);
      expect(text(element)).toContain("Working…");
      expect(fileInput(element).disabled).toBe(true);

      finish("068000000000001AAA");
      await settle();
      expect(text(element)).not.toContain("Working…");
      expect(fileInput(element).disabled).toBe(false);
    });
  });

  describe("staging before the record exists", () => {
    it("holds picked files instead of uploading them", async () => {
      const element = render();
      await settle();

      await pick(element, [textFile("a.txt"), textFile("b.txt")]);

      expect(getFiles).not.toHaveBeenCalled();
      expect(saveFile).not.toHaveBeenCalled();
      expect(stagedNames(element)).toEqual(["a.txt", "b.txt"]);
      expect(text(element)).toContain(
        "2 files will be attached when this record is saved."
      );
      expect(text(element)).not.toContain("No files attached.");
    });

    it("adds to what is already staged", async () => {
      const element = render();
      await pick(element, [textFile("a.txt")]);
      expect(text(element)).toContain(
        "1 file will be attached when this record is saved."
      );

      await pick(element, [textFile("b.txt")]);
      expect(stagedNames(element)).toEqual(["a.txt", "b.txt"]);
    });

    it("removes a staged file", async () => {
      const element = render();
      await pick(element, [textFile("a.txt"), textFile("b.txt")]);

      query(element, "lightning-button-icon[data-name='a.txt']").dispatchEvent(
        new CustomEvent("click")
      );
      await settle();

      expect(stagedNames(element)).toEqual(["b.txt"]);
    });

    it("uploads everything on commit() and clears the list", async () => {
      const element = render({ parentId: "a00000000000001AAA" });
      await pick(element, [textFile("a.txt"), textFile("b.txt")]);

      const result = await element.commit("001000000000009AAA");
      await settle();

      expect(result).toEqual({ uploaded: 2, failed: 0 });
      expect(saveFile.mock.calls.map(([args]) => args.recordId)).toEqual([
        "001000000000009AAA",
        "001000000000009AAA"
      ]);
      expect(saveFile.mock.calls[0][0].parentId).toBe("a00000000000001AAA");
      expect(stagedNames(element)).toEqual([]);
    });

    it("resolves with the failure count instead of rejecting", async () => {
      saveFile
        .mockResolvedValueOnce("068000000000001AAA")
        .mockRejectedValueOnce(apexError("boom"));
      const element = render();
      await pick(element, [textFile("a.txt"), textFile("b.txt")]);

      await expect(element.commit("001000000000009AAA")).resolves.toEqual({
        uploaded: 1,
        failed: 1
      });
    });

    it.each([
      ["nothing is staged", false, "001000000000009AAA", { uploaded: 0, failed: 0 }],
      ["no record Id is given", true, undefined, { uploaded: 0, failed: 1 }]
    ])("commit() uploads nothing when %s", async (_, stage, id, expected) => {
      const element = render();
      if (stage) {
        await pick(element, [textFile("a.txt")]);
      }

      await expect(element.commit(id)).resolves.toEqual(expected);
      expect(saveFile).not.toHaveBeenCalled();
    });
  });

  describe("removing an attached file", () => {
    const removeButton = (element) =>
      query(element, "lightning-button-icon[data-id='069000000000001AAA']");

    it("deletes it, reloads the list and fires deleted", async () => {
      const element = render({ recordId: RECORD_ID });
      await settle();
      const deleted = listen(element, "deleted");

      removeButton(element).dispatchEvent(new CustomEvent("click"));
      await settle();

      expect(deleteFile).toHaveBeenCalledWith({
        contentDocumentId: "069000000000001AAA"
      });
      expect(getFiles).toHaveBeenCalledTimes(2);
      expect(status(element).textContent).toBe("File removed.");
      expect(deleted.mock.calls[0][0].detail).toEqual({
        contentDocumentId: "069000000000001AAA"
      });
    });

    it("reports a failed delete and fires nothing", async () => {
      deleteFile.mockRejectedValue(apexError("Locked"));
      const element = render({ recordId: RECORD_ID });
      await settle();
      const deleted = listen(element, "deleted");

      removeButton(element).dispatchEvent(new CustomEvent("click"));
      await settle();

      expect(status(element).textContent).toBe("Locked");
      expect(deleted).not.toHaveBeenCalled();
      expect(fileInput(element).disabled).toBe(false);
    });
  });

  describe("presentation", () => {
    it("labels the section, and hides the label when it is blank", async () => {
      const element = render();
      expect(query(element, ".file-label").textContent).toBe("Attachments");

      element.label = "";
      await settle();
      expect(query(element, ".file-label")).toBe(null);
    });

    it("passes accepted formats and single-file mode to the input", () => {
      const element = render({ acceptedFormats: ".pdf,.docx", singleFile: true });
      expect(fileInput(element).accept).toBe(".pdf,.docx");
      expect(fileInput(element).multiple).toBe(false);
    });

    it("allows several files by default", () => {
      expect(fileInput(render()).multiple).toBe(true);
    });

    it("disables the input, the picker and every remove button", async () => {
      const element = render({
        recordId: RECORD_ID,
        prefixGroup: "Expenses",
        disabled: true
      });
      await settle();

      const controls = [
        fileInput(element),
        prefixPicker(element),
        ...queryAll(element, "lightning-button-icon")
      ];
      expect(controls).toHaveLength(4);
      expect(controls.every((control) => control.disabled)).toBe(true);
    });
  });
});
