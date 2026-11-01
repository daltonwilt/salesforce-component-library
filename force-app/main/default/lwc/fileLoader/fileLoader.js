import { LightningElement, api, track } from "lwc";
import { errorMessage, logError } from "c/utils";
import getPrefixOptions from "@salesforce/apex/FileController.getPrefixOptions";
import getFiles from "@salesforce/apex/FileController.getFiles";
import saveFile from "@salesforce/apex/FileController.saveFile";
import removeFile from "@salesforce/apex/FileController.deleteFile";

/**
 * General-purpose file attachment section: pick files, see what is attached, remove one.
 *
 *   <c-file-loader
 *     record-id={recordId}
 *     label="Supporting documents"
 *     prefix-group="Prefix"   <!-- optional: adds a category picker -->
 *     onuploaded={handleUploaded}>
 *   </c-file-loader>
 *
 * Two modes, decided by whether record-id is set:
 *
 *   attached — record-id present. A picked file uploads straight away and joins the list.
 *   staged   — record-id blank, because the record does not exist yet. Picked files are held in the
 *              browser and listed as pending; the host uploads them once it has an Id:
 *
 *                const loader = this.template.querySelector("c-file-loader");
 *                const { uploaded, failed } = await loader.commit(newRecordId);
 *
 *              commit() resolves rather than throws when an upload fails — by then the record
 *              exists, so the host needs to report a partial success, not treat the save as lost.
 *
 * Messages are reported inline and as `uploaded` / `deleted` / `fileerror` events rather than as
 * toasts: this renders inside modals, where a toast raised from the component never reaches the
 * screen (see notify() in c/utils).
 */

// Apex takes the file as base64 in a single call, so this is bounded by the heap the transaction
// can hold rather than by anything configurable.
const MAX_FILE_SIZE = 4500000;

export default class FileLoader extends LightningElement {
  // Record the files are linked to. Blank puts the component in staged mode — see commit().
  // Loaded from the setter because record-id arrives late in plenty of hosts — a wire, a modal
  // opening — and changes when the host switches records. A renderedCallback would miss both:
  // nothing in the template reads recordId, so setting it never re-renders.
  @api
  get recordId() {
    return this._recordId;
  }
  set recordId(value) {
    const changed = value !== this._recordId;
    this._recordId = value;
    if (changed && this._connected) {
      this.loadFiles();
    }
  }
  // Optional second record to share each file with (viewer access), e.g. the item's parent.
  @api parentId;
  // Optional Prefix_Group__mdt developer name. With one, the recipient picks a category and only
  // that group's files are listed; without, files attach and list with no category at all.
  @api prefixGroup;
  @api label = "Attachments";
  @api acceptedFormats; // e.g. ".pdf,.docx" — passed through to lightning-input
  @api disabled = false;
  // Multiple selection is the default; the flag is negative because a public boolean cannot be
  // initialised to true (@lwc/lwc/valid-api).
  @api singleFile = false;

  @track files = []; // already attached, newest first
  @track staged = []; // picked but not yet uploaded (staged mode)
  @track prefixOptions = [];
  @track selectedPrefix;
  @track status; // { variant: 'success' | 'error', message }
  loading = false;
  busy = false;

  connectedCallback() {
    this._connected = true;
    this.loadPrefixOptions();
    this.loadFiles();
  }

  disconnectedCallback() {
    this._connected = false;
  }

  /* ── Data ─────────────────────────────────────────────────────────────────────────────────── */

  async loadPrefixOptions() {
    if (!this.prefixGroup) return;
    try {
      const options = await getPrefixOptions({ prefixGroup: this.prefixGroup });
      this.prefixOptions = (options || []).map((o) => ({
        label: o.label,
        value: o.value,
      }));
      // One category is not a choice — pick it so the recipient is not asked a pointless question.
      if (this.prefixOptions.length === 1) {
        this.selectedPrefix = this.prefixOptions[0].value;
      }
    } catch (e) {
      logError("fileLoader.loadPrefixOptions", e);
      this.fail(errorMessage(e, "File categories could not be loaded."));
    }
  }

  async loadFiles() {
    if (!this.recordId) {
      this.files = [];
      return;
    }
    this.loading = true;
    try {
      const rows = await getFiles({
        recordId: this.recordId,
        prefixGroup: this.prefixGroup,
        prefixOption: null,
      });
      // Shepherd's download endpoint, the same relative form FileController builds its thumbnail URL
      // from, so it resolves inside a community as well as in the internal app.
      this.files = (rows || []).map((row) => ({
        ...row,
        downloadUrl: `/sfc/servlet.shepherd/document/download/${row.contentDocumentId}`,
      }));
    } catch (e) {
      logError("fileLoader.loadFiles", e);
      this.fail(errorMessage(e, "The attached files could not be loaded."));
    } finally {
      this.loading = false;
    }
  }

  @api
  refresh() {
    return this.loadFiles();
  }

  /* ── Presentation ─────────────────────────────────────────────────────────────────────────── */

  get hasFiles() {
    return this.files.length > 0;
  }

  get hasStaged() {
    return this.staged.length > 0;
  }

  get isEmpty() {
    return !this.hasFiles && !this.hasStaged;
  }

  get hasPrefixOptions() {
    return this.prefixOptions.length > 0;
  }

  get allowMultiple() {
    return !this.singleFile;
  }

  // Without a category chosen there is nothing to stamp on the file, so hold the input shut.
  get inputDisabled() {
    return (
      this.disabled ||
      this.busy ||
      (this.hasPrefixOptions && !this.selectedPrefix)
    );
  }

  get statusClass() {
    const variant = (this.status && this.status.variant) || "success";
    return [
      "file-status",
      `file-status_${variant}`,
      "slds-var-m-top_x-small",
    ].join(" ");
  }

  get stagedNote() {
    const count = this.staged.length;
    return `${count} file${count === 1 ? "" : "s"} will be attached when this record is saved.`;
  }

  /* ── Picking ──────────────────────────────────────────────────────────────────────────────── */

  handlePrefixChange(event) {
    this.selectedPrefix = event.detail.value;
  }

  async handleFilesChange(event) {
    const picked = Array.from(event.target.files || []);
    event.target.value = null; // let the same file be picked again after a removal
    if (!picked.length) return;

    const tooBig = picked.filter((f) => f.size > MAX_FILE_SIZE);
    const usable = picked.filter((f) => f.size <= MAX_FILE_SIZE);
    if (tooBig.length) {
      this.fail(
        `${tooBig.map((f) => f.name).join(", ")} exceeds the 4.5 MB limit and was not attached.`,
      );
    }
    if (!usable.length) return;

    // Read every file up front, in parallel: in staged mode the File objects outlive this handler,
    // and reading them later can fail once the input has been reset. A file that will not read is
    // dropped with a message rather than taking the rest of the selection with it.
    const results = await Promise.all(
      usable.map((file) =>
        this.readAsBase64(file)
          .then((base64) => ({
            name: file.name,
            prefix: this.selectedPrefix,
            base64,
          }))
          .catch((e) => {
            logError("fileLoader.read", e);
            this.fail(`${file.name} could not be read.`);
            return null;
          }),
      ),
    );
    const read = results.filter(Boolean);
    if (!read.length) return;

    if (this.recordId) {
      await this.upload(this.recordId, read);
    } else {
      this.staged = [...this.staged, ...read];
      this.clearStatus();
    }
  }

  /* ── Uploading ────────────────────────────────────────────────────────────────────────────── */

  /**
   * Upload everything staged against a record that now exists.
   *
   * @param {string} recordId the newly saved record
   * @returns {Promise<{uploaded: number, failed: number}>} never rejects — the record is already
   *          saved, so a failed file is a partial success the host reports, not a lost save
   */
  @api
  async commit(recordId) {
    const pending = this.staged;
    if (!pending.length) return { uploaded: 0, failed: 0 };
    if (!recordId) return { uploaded: 0, failed: pending.length };

    const result = await this.upload(recordId, pending);
    this.staged = [];
    return result;
  }

  async upload(recordId, items) {
    this.busy = true;
    let uploaded = 0;
    const failures = [];

    for (const item of items) {
      try {
        // Deliberately sequential: each call carries a whole file as base64, and firing them at
        // once risks the Apex heap limit on the receiving end. Files also fail individually, which
        // a Promise.all would flatten into one rejection.
        // eslint-disable-next-line no-await-in-loop
        await saveFile({
          recordId,
          // Prefixing the stored name keeps the category visible wherever the file is listed,
          // including the standard Files related list, which knows nothing about Prefix__c.
          fileName: item.prefix ? `${item.prefix}_${item.name}` : item.name,
          base64Data: encodeURIComponent(item.base64),
          prefix: item.prefix,
          parentId: this.parentId,
        });
        uploaded += 1;
      } catch (e) {
        logError("fileLoader.upload", e);
        failures.push(`${item.name}: ${errorMessage(e, "upload failed")}`);
      }
    }

    this.busy = false;
    if (uploaded) {
      await this.loadFiles();
      this.succeed(
        `${uploaded} file${uploaded === 1 ? "" : "s"} attached.`,
        failures.length === 0,
      );
      this.dispatchEvent(
        new CustomEvent("uploaded", { detail: { count: uploaded } }),
      );
    }
    if (failures.length) {
      this.fail(failures.join(" "));
      this.dispatchEvent(
        new CustomEvent("fileerror", { detail: { failures } }),
      );
    }
    return { uploaded, failed: failures.length };
  }

  /* ── Removing ─────────────────────────────────────────────────────────────────────────────── */

  handleRemoveStaged(event) {
    const name = event.target.dataset.name;
    const index = this.staged.findIndex((s) => s.name === name);
    if (index >= 0) {
      this.staged = this.staged.filter((_, i) => i !== index);
    }
  }

  async handleRemoveFile(event) {
    const contentDocumentId = event.target.dataset.id;
    if (!contentDocumentId) return;
    this.busy = true;
    try {
      await removeFile({ contentDocumentId });
      await this.loadFiles();
      this.succeed("File removed.");
      this.dispatchEvent(
        new CustomEvent("deleted", { detail: { contentDocumentId } }),
      );
    } catch (e) {
      logError("fileLoader.remove", e);
      this.fail(errorMessage(e, "The file could not be removed."));
    } finally {
      this.busy = false;
    }
  }

  /* ── Status ───────────────────────────────────────────────────────────────────────────────── */

  succeed(message, replace = true) {
    if (replace || !this.status || this.status.variant !== "error") {
      this.status = { variant: "success", message };
    }
  }

  fail(message) {
    this.status = { variant: "error", message };
  }

  clearStatus() {
    this.status = undefined;
  }

  readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || "";
        const marker = "base64,";
        const at = result.indexOf(marker);
        resolve(at >= 0 ? result.substring(at + marker.length) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}