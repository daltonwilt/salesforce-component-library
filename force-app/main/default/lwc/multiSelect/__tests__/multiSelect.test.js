import { createElement } from "@lwc/engine-dom";
import MultiSelect from "c/multiSelect";

const OPTIONS = [
  { label: "Housing", value: "housing" },
  { label: "Transit", value: "transit" },
  { label: "Broadband", value: "broadband" }
];

function render(props = {}) {
  const element = createElement("c-multi-select", { is: MultiSelect });
  Object.assign(element, {
    label: "Program Types",
    options: OPTIONS,
    ...props
  });
  document.body.appendChild(element);
  return element;
}

const $ = (element, selector) => element.shadowRoot.querySelector(selector);
const $$ = (element, selector) => [
  ...element.shadowRoot.querySelectorAll(selector)
];
const trigger = (element) => $(element, "input");
const combobox = (element) => $(element, ".slds-combobox");
const options = (element) => $$(element, '[role="option"]');
const pills = (element) => $$(element, "lightning-pill");
const flush = () => Promise.resolve();

const isOpen = (element) =>
  combobox(element).classList.contains("slds-is-open");
const checked = (element) =>
  options(element)
    .filter((option) => option.getAttribute("aria-selected") === "true")
    .map((option) => option.dataset.value);

function click(target) {
  target.click();
  return flush();
}

function key(element, name) {
  const event = new KeyboardEvent("keydown", {
    key: name,
    bubbles: true,
    composed: true,
    cancelable: true
  });
  trigger(element).dispatchEvent(event);
  return flush().then(() => event);
}

function blur(element) {
  trigger(element).dispatchEvent(new CustomEvent("blur"));
  return flush();
}

describe("c-multi-select", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  describe("value", () => {
    it.each([
      ["a semicolon-separated string", " transit; housing;;transit "],
      ["an array", ["transit", "housing", "transit"]]
    ])("accepts %s, trimmed and de-duplicated", (_, value) => {
      expect(render({ value }).value).toEqual(["transit", "housing"]);
    });

    it("converts numbers to strings", () => {
      const element = render({
        options: [{ label: "One", value: 1 }],
        value: [1]
      });
      expect(element.value).toEqual(["1"]);
      expect(element.options).toEqual([{ label: "One", value: "1" }]);
    });

    it.each([null, undefined, ""])("treats %p as empty", (value) => {
      expect(render({ value }).value).toEqual([]);
    });
  });

  describe("rendering", () => {
    it.each([
      ["", ""],
      ["transit", "Transit"],
      ["transit;housing", "2 options selected"]
    ])("summarises %p as %p", (value, text) => {
      const element = render({ value });
      expect(trigger(element).value).toBe(text);
      expect(trigger(element).placeholder).toBe("Select an option…");
    });

    it("lists every option and checks the selected ones", () => {
      const element = render({ value: "transit;housing" });

      expect(options(element).map((o) => o.dataset.value)).toEqual([
        "housing",
        "transit",
        "broadband"
      ]);
      expect(checked(element)).toEqual(["housing", "transit"]);
      expect($$(element, '[role="option"] lightning-icon')).toHaveLength(2);
      expect(
        $(element, '[role="listbox"]').getAttribute("aria-multiselectable")
      ).toBe("true");
    });

    it("shows a pill per pick, in pick order", () => {
      const element = render({ value: "transit;housing" });
      expect(pills(element).map((pill) => pill.label)).toEqual([
        "Transit",
        "Housing"
      ]);
    });

    it("labels a value with no matching option with the raw value", () => {
      const element = render({ value: "legacy" });
      expect(pills(element)[0].label).toBe("legacy");
      expect(trigger(element).value).toBe("legacy");
    });

    it("shows plain, non-removable pills and disables the input when disabled", () => {
      const element = render({ value: "housing", disabled: true });
      expect(pills(element)).toHaveLength(0);
      expect($(element, ".slds-pill__label").textContent).toBe("Housing");
      expect(trigger(element).disabled).toBe(true);
    });

    it("disables the input when there are no options", () => {
      expect(trigger(render({ options: [] })).disabled).toBe(true);
    });

    it("draws the required marker and hides the label for label-hidden", async () => {
      const element = render({ required: true });
      expect($(element, "abbr.slds-required")).not.toBe(null);
      expect($(element, "label").className).toBe("slds-form-element__label");

      element.variant = "label-hidden";
      await flush();
      expect($(element, "label").className).toBe("slds-assistive-text");
    });
  });

  describe("dropdown", () => {
    it("opens on click and closes on a second click", async () => {
      const element = render();
      expect(isOpen(element)).toBe(false);
      expect(trigger(element).getAttribute("aria-expanded")).toBe("false");

      await click(trigger(element));
      expect(isOpen(element)).toBe(true);
      expect(trigger(element).getAttribute("aria-expanded")).toBe("true");

      await click(trigger(element));
      expect(isOpen(element)).toBe(false);
    });

    it("stays open while several options are checked", async () => {
      const element = render();
      const handler = jest.fn();
      element.addEventListener("change", handler);

      await click(trigger(element));
      await click(options(element)[0]);
      await click(options(element)[2]);

      expect(isOpen(element)).toBe(true);
      expect(checked(element)).toEqual(["housing", "broadband"]);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[1][0].detail).toEqual({
        value: ["housing", "broadband"],
        valueString: "housing;broadband"
      });
      expect(trigger(element).value).toBe("2 options selected");
    });

    it("unchecks a selected option when it is clicked", async () => {
      const element = render({ value: "housing;transit" });
      const handler = jest.fn();
      element.addEventListener("change", handler);

      await click(trigger(element));
      await click(options(element)[0]);

      expect(checked(element)).toEqual(["transit"]);
      expect(handler.mock.calls[0][0].detail.valueString).toBe("transit");
    });

    it("keeps focus on the input when the list is pressed", () => {
      const element = render();
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true
      });
      options(element)[0].dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it("closes when focus leaves", async () => {
      const element = render();
      await click(trigger(element));
      await blur(element);
      expect(isOpen(element)).toBe(false);
    });

    it("does not open when disabled", async () => {
      const element = render({ disabled: true });
      await click(trigger(element));
      await key(element, "ArrowDown");
      expect(isOpen(element)).toBe(false);
    });
  });

  describe("keyboard", () => {
    const active = (element) => {
      const id = trigger(element).getAttribute("aria-activedescendant");
      const option = options(element).find((o) => o.id === id);
      return option ? option.dataset.value : null;
    };

    it("opens on ArrowDown, starting on the first selected option", async () => {
      const element = render({ value: "transit" });
      await key(element, "ArrowDown");
      expect(isOpen(element)).toBe(true);
      expect(active(element)).toBe("transit");
    });

    it("moves with the arrows, wrapping, and jumps with Home and End", async () => {
      const element = render();
      await key(element, "ArrowDown");
      expect(active(element)).toBe("housing");

      await key(element, "ArrowUp");
      expect(active(element)).toBe("broadband");
      await key(element, "ArrowDown");
      expect(active(element)).toBe("housing");

      await key(element, "End");
      expect(active(element)).toBe("broadband");
      await key(element, "Home");
      expect(active(element)).toBe("housing");
    });

    it("toggles the highlighted option with Enter and Space, staying open", async () => {
      const element = render();
      await key(element, "Enter");
      expect(isOpen(element)).toBe(true);
      expect(checked(element)).toEqual([]);

      await key(element, "Enter");
      await key(element, "ArrowDown");
      await key(element, " ");
      expect(checked(element)).toEqual(["housing", "transit"]);

      await key(element, " ");
      expect(checked(element)).toEqual(["housing"]);
      expect(isOpen(element)).toBe(true);
    });

    it("closes on Escape without letting it reach an enclosing modal", async () => {
      const element = render();
      const outer = jest.fn();
      document.body.addEventListener("keydown", outer);

      await key(element, "ArrowDown");
      const event = await key(element, "Escape");

      expect(isOpen(element)).toBe(false);
      expect(event.defaultPrevented).toBe(true);
      expect(outer).toHaveBeenCalledTimes(1); // the ArrowDown only
      document.body.removeEventListener("keydown", outer);
    });
  });

  describe("pills", () => {
    it("removes a pick when its pill is removed", async () => {
      const element = render({ value: "housing;transit" });
      const handler = jest.fn();
      element.addEventListener("change", handler);

      pills(element)[0].dispatchEvent(new CustomEvent("remove"));
      await flush();

      expect(handler.mock.calls[0][0].detail).toEqual({
        value: ["transit"],
        valueString: "transit"
      });
      expect(pills(element).map((pill) => pill.label)).toEqual(["Transit"]);
      expect(checked(element)).toEqual(["transit"]);
    });
  });

  describe("validation", () => {
    const error = (element) => $(element, ".slds-form-element__help");

    it.each([
      [false, "", true],
      [true, "", false],
      [true, "housing", true]
    ])("required=%p, value=%p is valid: %p", (required, value, valid) => {
      expect(render({ required, value }).checkValidity()).toBe(valid);
    });

    it("shows the missing-value message and marks the field invalid", async () => {
      const element = render({
        required: true,
        messageWhenValueMissing: "Pick one."
      });

      expect(element.reportValidity()).toBe(false);
      await flush();

      expect(error(element).textContent.trim()).toBe("Pick one.");
      expect(
        $(element, ".slds-form-element").classList.contains("slds-has-error")
      ).toBe(true);
      expect(trigger(element).getAttribute("aria-invalid")).toBe("true");
      expect(trigger(element).getAttribute("aria-describedby")).toBe(
        error(element).id
      );
    });

    it("waits for blur before re-validating on change", async () => {
      const element = render({ required: true, value: "housing" });

      pills(element)[0].dispatchEvent(new CustomEvent("remove"));
      await flush();
      expect(error(element)).toBe(null);

      await blur(element);
      expect(error(element).textContent.trim()).toBe("Complete this field.");

      await click(trigger(element));
      await click(options(element)[1]);
      expect(error(element)).toBe(null);
    });
  });
});
