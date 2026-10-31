import { createElement } from "@lwc/engine-dom";
import Paginator from "c/paginator";

function render(props = {}) {
  const element = createElement("c-paginator", { is: Paginator });
  Object.assign(element, {
    pageNumber: 1,
    totalRows: 100,
    pageSize: 10,
    ...props
  });
  document.body.appendChild(element);
  return element;
}

const flush = () => Promise.resolve();

const arrow = (element, iconName) =>
  [...element.shadowRoot.querySelectorAll("lightning-button-icon")].find(
    (button) => button.iconName === iconName
  );
const first = (element) => arrow(element, "utility:jump_to_left");
const previous = (element) => arrow(element, "utility:chevronleft");
const next = (element) => arrow(element, "utility:chevronright");
const last = (element) => arrow(element, "utility:jump_to_right");

const pageInput = (element) =>
  element.shadowRoot.querySelector("lightning-input");
const sizePicker = (element) =>
  element.shadowRoot.querySelector("lightning-combobox");
const pageButtons = (element) => [
  ...element.shadowRoot.querySelectorAll("lightning-button")
];

/** The page row as text, ellipses included - e.g. "1 2 3 … 8 9 10". */
function pageRow(element) {
  const row = pageButtons(element)[0].parentElement;
  return [...row.children]
    .map((child) => {
      return child.tagName === "LIGHTNING-BUTTON"
        ? child.label
        : child.textContent;
    })
    .join(" ");
}

function listen(element, name) {
  const handler = jest.fn();
  element.addEventListener(name, handler);
  return handler;
}

function typePage(element, value, event) {
  const input = pageInput(element);
  input.value = value;
  input.dispatchEvent(event);
  return flush();
}

describe("c-paginator", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  describe("totalPages", () => {
    it("divides the row count by the page size, rounding up", () => {
      expect(render({ totalRows: 101, pageSize: 10 }).totalPages).toBe(11);
    });

    it("is one empty page, not zero, when there are no rows", () => {
      expect(render({ totalRows: 0 }).totalPages).toBe(1);
    });

    it("prefers the override when given", () => {
      expect(render({ totalPagesOverride: 7 }).totalPages).toBe(7);
    });

    it.each([
      ["a zero page size", { pageSize: 0 }, 100],
      ["a non-numeric row count", { totalRows: "lots" }, 1],
      ["a non-numeric override", { totalPagesOverride: "x" }, 1]
    ])("survives %s", (_, props, expected) => {
      expect(render(props).totalPages).toBe(expected);
    });
  });

  describe("rendering", () => {
    it("shows the current page and the page count", () => {
      const element = render({ pageNumber: 3 });
      expect(pageInput(element).value).toBe(3);
      expect(pageInput(element).max).toBe(10);
      expect(element.shadowRoot.textContent).toContain("of 10");
    });

    it("clamps a page number past the end to the last page", () => {
      const element = render({ pageNumber: 50 });
      expect(pageInput(element).value).toBe(10);
      expect(next(element).disabled).toBe(true);
    });

    it.each([
      [1, 10, "1 2 3 … 8 9 10"],
      [5, 10, "1 2 3 4 5 6 … 8 9 10"],
      [10, 20, "1 2 3 … 9 10 11 … 18 19 20"],
      [1, 4, "1 2 3 4"]
    ])("on page %i of %i shows %s", (pageNumber, pages, expected) => {
      const element = render({ pageNumber, totalRows: pages * 10 });
      expect(pageRow(element)).toBe(expected);
    });

    it("marks only the current page as brand", () => {
      const element = render({ pageNumber: 2 });
      const current = pageButtons(element).filter(
        (button) => button.variant === "brand"
      );
      expect(current.map((button) => button.label)).toEqual(["2"]);
    });

    it("formats large page numbers for the locale", () => {
      const element = render({ totalRows: 12345, pageSize: 1 });
      expect(element.shadowRoot.textContent).toContain("of 12,345");
      expect(pageButtons(element).pop().label).toBe("12,345");
    });

    it("gives every arrow button alternative text", () => {
      const element = render();
      expect(
        [first, previous, next, last].map((get) => get(element).alternativeText)
      ).toEqual(["First page", "Previous page", "Next page", "Last page"]);
    });

    it("hides the page box and numbers with hide-page-jump", () => {
      const element = render({ hidePageJump: true });
      expect(pageInput(element)).toBe(null);
      expect(pageButtons(element)).toHaveLength(0);
      expect(next(element)).toBeTruthy();
    });

    it("hides the rows-per-page picker with hide-page-size", () => {
      expect(sizePicker(render({ hidePageSize: true }))).toBe(null);
    });
  });

  describe("arrows", () => {
    it("disables first and previous on the first page", () => {
      const element = render({ pageNumber: 1 });
      expect(first(element).disabled).toBe(true);
      expect(previous(element).disabled).toBe(true);
      expect(next(element).disabled).toBe(false);
      expect(last(element).disabled).toBe(false);
    });

    it("disables every arrow when there is a single page", () => {
      const element = render({ totalRows: 5 });
      expect(
        [first, previous, next, last].map((get) => get(element).disabled)
      ).toEqual([true, true, true, true]);
    });

    it.each([
      ["first", 1, first],
      ["previous", 4, previous],
      ["next", 6, next],
      ["last", 10, last]
    ])("%s asks for page %i", async (_, expected, get) => {
      const element = render({ pageNumber: 5 });
      const handler = listen(element, "pagechange");

      get(element).dispatchEvent(new CustomEvent("click"));
      await flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ page: expected });
    });

    it("does not change its own page - the host passes it back down", async () => {
      const element = render({ pageNumber: 5 });
      next(element).dispatchEvent(new CustomEvent("click"));
      await flush();
      expect(element.pageNumber).toBe(5);
      expect(pageInput(element).value).toBe(5);
    });
  });

  describe("page numbers", () => {
    it("asks for the clicked page", async () => {
      const element = render();
      const handler = listen(element, "pagechange");

      pageButtons(element)
        .find((button) => button.label === "9")
        .dispatchEvent(new CustomEvent("click"));
      await flush();

      expect(handler.mock.calls[0][0].detail).toEqual({ page: 9 });
    });

    it("does not ask for the page already shown", async () => {
      const element = render({ pageNumber: 2 });
      const handler = listen(element, "pagechange");

      pageButtons(element)
        .find((button) => button.label === "2")
        .dispatchEvent(new CustomEvent("click"));
      await flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("page box", () => {
    it("commits on Enter", async () => {
      const element = render();
      const handler = listen(element, "pagechange");

      await typePage(element, "4", new KeyboardEvent("keyup", { key: "Enter" }));

      expect(handler.mock.calls[0][0].detail).toEqual({ page: 4 });
    });

    it("commits on blur", async () => {
      const element = render();
      const handler = listen(element, "pagechange");

      await typePage(element, "7", new CustomEvent("blur"));

      expect(handler.mock.calls[0][0].detail).toEqual({ page: 7 });
    });

    it("waits for Enter rather than committing per keystroke", async () => {
      const element = render();
      const handler = listen(element, "pagechange");

      await typePage(element, "2", new KeyboardEvent("keyup", { key: "2" }));

      expect(handler).not.toHaveBeenCalled();
    });

    it.each([
      ["900", 10],
      ["0", 1],
      ["abc", 1],
      ["", 1]
    ])("clamps %p to page %i and shows it", async (typed, expected) => {
      const element = render({ pageNumber: 5 });
      const handler = listen(element, "pagechange");

      await typePage(element, typed, new CustomEvent("blur"));

      expect(pageInput(element).value).toBe(String(expected));
      expect(handler.mock.calls[0][0].detail).toEqual({ page: expected });
    });
  });

  describe("rows per page", () => {
    it("offers the default sizes, selected as a string", () => {
      const element = render({ pageSize: 25 });
      expect(sizePicker(element).options.map((o) => o.value)).toEqual([
        "10",
        "25",
        "50",
        "100"
      ]);
      expect(sizePicker(element).value).toBe("25");
    });

    it.each([
      ["a comma-separated string", "5, 20,x,-1"],
      ["an array", [5, "20", 0]]
    ])("parses size options from %s", (_, pageSizeOptions) => {
      const element = render({ pageSizeOptions });
      expect(element.pageSizeOptions).toEqual([5, 20]);
      expect(sizePicker(element).options).toEqual([
        { value: "5", label: "5" },
        { value: "20", label: "20" }
      ]);
    });

    it.each([null, "", "nope"])(
      "falls back to the defaults for %p",
      (pageSizeOptions) => {
        expect(render({ pageSizeOptions }).pageSizeOptions).toEqual([
          10, 25, 50, 100
        ]);
      }
    );

    it("asks for a new size", async () => {
      const element = render({ pageSize: 10 });
      const handler = listen(element, "pagesizechange");

      sizePicker(element).dispatchEvent(
        new CustomEvent("change", { detail: { value: "50" } })
      );
      await flush();

      expect(handler.mock.calls[0][0].detail).toEqual({ pageSize: 50 });
      expect(element.pageSize).toBe(10);
    });

    it.each(["10", "0", "abc"])("ignores %p", async (value) => {
      const element = render({ pageSize: 10 });
      const handler = listen(element, "pagesizechange");

      sizePicker(element).dispatchEvent(
        new CustomEvent("change", { detail: { value } })
      );
      await flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("disabled", () => {
    it("disables every control", () => {
      const element = render({ pageNumber: 5, disabled: true });
      const controls = [
        first(element),
        previous(element),
        next(element),
        last(element),
        pageInput(element),
        sizePicker(element),
        ...pageButtons(element)
      ];
      expect(controls.every((control) => control.disabled)).toBe(true);
    });
  });
});
