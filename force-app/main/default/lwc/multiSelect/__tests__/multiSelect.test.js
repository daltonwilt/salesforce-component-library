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

const combobox = (element) =>
  element.shadowRoot.querySelector("lightning-combobox");
const pills = (element) => [
  ...element.shadowRoot.querySelectorAll("lightning-pill")
];
const flush = () => Promise.resolve();

function pick(element, value) {
  combobox(element).dispatchEvent(
    new CustomEvent("change", { detail: { value } })
  );
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
    it("shows a pill per pick and lists only unpicked options", () => {
      const element = render({ value: "transit;housing" });

      expect(pills(element).map((pill) => pill.label)).toEqual([
        "Transit",
        "Housing"
      ]);
      expect(combobox(element).options.map((o) => o.value)).toEqual([
        "broadband"
      ]);
    });

    it("labels a value with no matching option with the raw value", () => {
      const element = render({ value: "legacy" });
      expect(pills(element)[0].label).toBe("legacy");
    });

    it("disables the combobox once every option is picked", () => {
      const element = render({ value: OPTIONS.map((o) => o.value) });
      expect(combobox(element).disabled).toBe(true);
      expect(combobox(element).placeholder).toBe("All options selected");
    });

    it("shows plain, non-removable pills when disabled", () => {
      const element = render({ value: "housing", disabled: true });
      expect(pills(element)).toHaveLength(0);
      expect(
        element.shadowRoot.querySelector(".slds-pill__label").textContent
      ).toBe("Housing");
      expect(combobox(element).disabled).toBe(true);
    });

    it("draws the required marker and hides the label for label-hidden", async () => {
      const element = render({ required: true });
      expect(element.shadowRoot.querySelector("abbr.slds-required")).not.toBe(
        null
      );

      element.variant = "label-hidden";
      await flush();
      expect(
        element.shadowRoot.querySelector(".slds-form-element__label")
      ).toBe(null);
    });
  });

  describe("selection", () => {
    it("adds a pick, fires change, and clears the combobox", async () => {
      const element = render({ value: "housing" });
      const handler = jest.fn();
      element.addEventListener("change", handler);

      await pick(element, "transit");

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        value: ["housing", "transit"],
        valueString: "housing;transit"
      });
      expect(combobox(element).value).toBe(null);
      expect(pills(element)).toHaveLength(2);
    });

    it("ignores a duplicate or empty pick", async () => {
      const element = render({ value: "housing" });
      const handler = jest.fn();
      element.addEventListener("change", handler);

      await pick(element, "housing");
      await pick(element, "");

      expect(handler).not.toHaveBeenCalled();
    });

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
    });
  });

  describe("validation", () => {
    it.each([
      [false, "", true],
      [true, "", false],
      [true, "housing", true]
    ])("required=%p, value=%p is valid: %p", (required, value, valid) => {
      expect(render({ required, value }).checkValidity()).toBe(valid);
    });

    it("reports the missing-value message on the combobox", () => {
      const element = render({
        required: true,
        messageWhenValueMissing: "Pick one."
      });
      const setCustomValidity = jest.spyOn(
        combobox(element),
        "setCustomValidity"
      );

      expect(element.reportValidity()).toBe(false);
      expect(setCustomValidity).toHaveBeenCalledWith("Pick one.");
    });

    it("waits for blur before re-validating on change", async () => {
      const element = render({ required: true, value: "housing" });
      const setCustomValidity = jest.spyOn(
        combobox(element),
        "setCustomValidity"
      );

      pills(element)[0].dispatchEvent(new CustomEvent("remove"));
      await flush();
      expect(setCustomValidity).not.toHaveBeenCalled();

      combobox(element).dispatchEvent(new CustomEvent("blur"));
      expect(setCustomValidity).toHaveBeenLastCalledWith(
        "Complete this field."
      );

      await pick(element, "transit");
      expect(setCustomValidity).toHaveBeenLastCalledWith("");
    });
  });
});
