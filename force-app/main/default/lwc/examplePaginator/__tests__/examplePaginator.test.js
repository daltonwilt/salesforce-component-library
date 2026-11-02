import { createElement } from "@lwc/engine-dom";
import ExamplePaginator from "c/examplePaginator";

const flush = () => Promise.resolve();

function render() {
  const element = createElement("c-example-paginator", {
    is: ExamplePaginator
  });
  document.body.appendChild(element);
  return element;
}

const label = (element) => element.shadowRoot.querySelector("p").textContent;
const paginator = (element) => element.shadowRoot.querySelector("c-paginator");

describe("c-example-paginator", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("starts on the first page", () => {
    expect(label(render())).toBe("Showing rows 1–10 of 237");
  });

  it("moves to the page the paginator asks for", async () => {
    const element = render();
    paginator(element).dispatchEvent(
      new CustomEvent("pagechange", { detail: { page: 24 } })
    );
    await flush();
    expect(label(element)).toBe("Showing rows 231–237 of 237");
    expect(paginator(element).pageNumber).toBe(24);
  });

  it("goes back to page 1 when the page size changes", async () => {
    const element = render();
    paginator(element).dispatchEvent(
      new CustomEvent("pagechange", { detail: { page: 5 } })
    );
    paginator(element).dispatchEvent(
      new CustomEvent("pagesizechange", { detail: { pageSize: 50 } })
    );
    await flush();
    expect(label(element)).toBe("Showing rows 1–50 of 237");
  });
});
