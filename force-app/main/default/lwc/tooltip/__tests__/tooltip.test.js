import { createElement } from "@lwc/engine-dom";
import Tooltip from "c/tooltip";

function render(props = {}) {
  const element = createElement("c-tooltip", { is: Tooltip });
  Object.assign(element, { value: "A long description", ...props });
  document.body.appendChild(element);
  return element;
}

const cell = (element) => element.shadowRoot.querySelector(".tooltipCell");
const bubble = (element) => element.shadowRoot.querySelector(".tooltipBubble");
const flush = () => Promise.resolve();

function hover(element, rect = { bottom: 40, left: 12 }) {
  cell(element).getBoundingClientRect = () => rect;
  cell(element).dispatchEvent(new CustomEvent("mouseenter"));
  return flush();
}

describe("c-tooltip", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders the value without a bubble", () => {
    const element = render();

    expect(element.shadowRoot.querySelector(".tooltipText").textContent).toBe(
      "A long description"
    );
    expect(bubble(element)).toBeNull();
  });

  it("shows the value in a bubble just below the cell on hover", async () => {
    const element = render();

    await hover(element);

    expect(bubble(element).textContent).toBe("A long description");
    expect(bubble(element).style.top).toBe("44px");
    expect(bubble(element).style.left).toBe("12px");
  });

  it("hides the bubble when the pointer leaves", async () => {
    const element = render();
    await hover(element);

    cell(element).dispatchEvent(new CustomEvent("mouseleave"));
    await flush();

    expect(bubble(element)).toBeNull();
  });

  it("repositions the bubble on each hover", async () => {
    const element = render();
    await hover(element);
    cell(element).dispatchEvent(new CustomEvent("mouseleave"));

    await hover(element, { bottom: 100, left: 50 });

    expect(bubble(element).style.top).toBe("104px");
    expect(bubble(element).style.left).toBe("50px");
  });

  it("updates the text when the value changes", async () => {
    const element = render();
    await hover(element);

    element.value = "Updated";
    await flush();

    expect(element.shadowRoot.querySelector(".tooltipText").textContent).toBe(
      "Updated"
    );
    expect(bubble(element).textContent).toBe("Updated");
  });
});
