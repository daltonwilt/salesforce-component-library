import { createElement } from "@lwc/engine-dom";
import Thumbnail from "c/thumbnail";

const FILE = {
  contentDocumentId: "069000000000001",
  contentVersionId: "068000000000001",
  fileType: "PNG",
  thumbnailUrl: "/sfc/servlet.shepherd/version/renditionDownload?versionId=1",
  title: "Site photo"
};

function render(props = {}) {
  const element = createElement("c-thumbnail", { is: Thumbnail });
  Object.assign(element, { ...FILE, ...props });
  document.body.appendChild(element);
  return element;
}

const query = (element, selector) => element.shadowRoot.querySelector(selector);
const image = (element) => query(element, "img");
const icon = (element) => query(element, "lightning-icon");
const thumbCell = (element) => query(element, ".thumbCell");
const flush = () => Promise.resolve();

function press(element, key) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true
  });
  thumbCell(element).dispatchEvent(event);
  return event;
}

describe("c-thumbnail", () => {
  let handlers = [];

  afterEach(() => {
    handlers.forEach((handler) =>
      document.removeEventListener("previewfile", handler)
    );
    handlers = [];
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // Listens on the document, so a passing test also proves the event leaves the shadow tree.
  const preview = () => {
    const handler = jest.fn();
    document.addEventListener("previewfile", handler);
    handlers.push(handler);
    return handler;
  };

  describe("rendering", () => {
    it("shows the thumbnail image for a renderable file", () => {
      const element = render();

      expect(image(element).getAttribute("src")).toBe(FILE.thumbnailUrl);
      expect(image(element).alt).toBe("Preview of Site photo");
      expect(thumbCell(element).title).toBe("Site photo");
      expect(icon(element)).toBeNull();
    });

    it.each(["png", "Pdf", "pptx", "POWER_POINT_X"])(
      "treats %s as renderable regardless of case",
      (fileType) => {
        expect(image(render({ fileType }))).not.toBeNull();
      }
    );

    it.each([
      ["no thumbnail URL", { thumbnailUrl: undefined }],
      ["no file type", { fileType: undefined }],
      ["a type with no rendition", { fileType: "SVG" }]
    ])("falls back to an icon with %s", (_, props) => {
      const element = render(props);

      expect(image(element)).toBeNull();
      expect(icon(element)).not.toBeNull();
    });

    it("falls back to an icon when the image fails to load", async () => {
      const element = render();

      image(element).dispatchEvent(new CustomEvent("error"));
      await flush();

      expect(image(element)).toBeNull();
      expect(icon(element).iconName).toBe("doctype:image");
      expect(icon(element).alternativeText).toBe("Preview of Site photo");
    });

    it.each([
      ["XLSX", "doctype:excel"],
      ["csv", "doctype:csv"],
      ["WORD_X", "doctype:word"],
      ["TXT", "doctype:txt"],
      ["ZIP", "doctype:zip"],
      ["MP4", "doctype:video"],
      ["MP3", "doctype:audio"],
      ["SVG", "doctype:image"],
      ["UNHEARD_OF", "doctype:unknown"]
    ])("uses the right icon for %s", (fileType, iconName) => {
      const element = render({ fileType, thumbnailUrl: undefined });
      expect(icon(element).iconName).toBe(iconName);
    });

    it("uses the unknown icon when there is no file type", () => {
      const element = render({ fileType: undefined });
      expect(icon(element).iconName).toBe("doctype:unknown");
    });

    it("uses generic alt text when the file has no title", () => {
      const element = render({ title: undefined });
      expect(image(element).alt).toBe("File thumbnail");
    });
  });

  describe("preview", () => {
    const DETAIL = {
      contentDocumentId: FILE.contentDocumentId,
      contentVersionId: FILE.contentVersionId,
      title: FILE.title
    };

    it("fires previewfile out of the shadow tree on click", () => {
      const element = render();
      const handler = preview();

      thumbCell(element).click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(DETAIL);
    });

    it.each(["Enter", " "])("fires previewfile on the %p key", (key) => {
      const element = render();
      const handler = preview();

      const event = press(element, key);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(DETAIL);
      // Space would otherwise scroll the page.
      expect(event.defaultPrevented).toBe(true);
    });

    it("ignores other keys", () => {
      const element = render();
      const handler = preview();

      const event = press(element, "Tab");

      expect(handler).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("stops the click from reaching the row", () => {
      const element = render();
      const rowClick = jest.fn();
      element.addEventListener("click", rowClick);

      thumbCell(element).click();

      expect(rowClick).not.toHaveBeenCalled();
    });
  });
});
