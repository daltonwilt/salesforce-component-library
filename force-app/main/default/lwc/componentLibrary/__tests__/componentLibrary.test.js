import { createElement } from "@lwc/engine-dom";
import ComponentLibrary from "c/componentLibrary";
import { CurrentPageReference } from "lightning/navigation";
import { CATEGORIES, COMPONENTS } from "../registry";
import SNIPPETS from "../snippets";

const fs = require("fs");
const path = require("path");
const {
  collectSnippets,
  render: renderSnippets,
  OUTPUT
} = require("../../../../../../scripts/generate-library-snippets");

// The stock stub's Navigate does nothing observable, so record the calls here.
const mockNavigate = jest.fn();
jest.mock("lightning/navigation", () => {
  const {
    createTestWireAdapter
  } = require("@salesforce/wire-service-jest-util");
  const Navigate = Symbol("Navigate");
  const NavigationMixin = (Base) =>
    class extends Base {
      [Navigate](...args) {
        mockNavigate(...args);
      }
    };
  NavigationMixin.Navigate = Navigate;
  NavigationMixin.GenerateUrl = Symbol("GenerateUrl");
  return {
    CurrentPageReference: createTestWireAdapter(jest.fn()),
    NavigationMixin
  };
});

const PAGE_REF = {
  type: "standard__navItemPage",
  attributes: { apiName: "Component_Library" },
  state: {}
};

const flush = () => Promise.resolve();

function render() {
  const element = createElement("c-component-library", {
    is: ComponentLibrary
  });
  document.body.appendChild(element);
  return element;
}

const $ = (element, selector) => element.shadowRoot.querySelector(selector);
const $$ = (element, selector) => [
  ...element.shadowRoot.querySelectorAll(selector)
];
const title = (element) => $(element, ".library-title").textContent;
const navItems = (element) =>
  $$(element, "lightning-vertical-navigation-item").map((item) => item.name);

async function select(element, name) {
  $(element, "lightning-vertical-navigation").dispatchEvent(
    new CustomEvent("select", { detail: { name } })
  );
  await flush();
}

async function activateTab(element, value) {
  const tab = $$(element, "lightning-tab").find((t) => t.value === value);
  tab.dispatchEvent(new CustomEvent("active"));
  await flush();
}

async function search(element, term) {
  const input = $(element, "lightning-input");
  input.value = term;
  input.dispatchEvent(new CustomEvent("change"));
  await flush();
}

describe("c-component-library", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    mockNavigate.mockReset();
  });

  describe("navigation list", () => {
    it("lists every component, grouped by category", () => {
      const element = render();
      const sections = $$(element, "lightning-vertical-navigation-section");
      expect(sections.map((s) => s.label)).toEqual(
        CATEGORIES.map((c) => c.label)
      );
      expect(navItems(element).sort()).toEqual(
        COMPONENTS.map((doc) => doc.name).sort()
      );
    });

    it("opens on the first component's example", () => {
      const element = render();
      expect(title(element)).toBe(COMPONENTS[0].label);
      expect($(element, "lightning-tabset").activeTabValue).toBe("example");
    });

    it("filters by name or description, ignoring case", async () => {
      const element = render();
      await search(element, "PAGE");
      expect(navItems(element)).toEqual(["paginator"]);

      await search(element, "pill");
      expect(navItems(element)).toEqual(["multiSelect"]);
    });

    it("says so when nothing matches, and keeps showing the selection", async () => {
      const element = render();
      await search(element, "zzz");
      expect($(element, "lightning-vertical-navigation")).toBeNull();
      expect($(element, ".library-empty").textContent).toBe(
        "No components match."
      );
      expect(title(element)).toBe(COMPONENTS[0].label);
    });
  });

  describe("selecting a component", () => {
    it("shows its header, usage and example", async () => {
      const element = render();
      await select(element, "multiSelect");

      expect(title(element)).toBe("Multi-Select");
      expect($(element, ".library-usage").textContent).toBe(
        "<c-multi-select>"
      );
      expect($(element, "c-component-library-example").name).toBe(
        "exampleMultiSelect"
      );
      expect($(element, "c-component-library-code").files).toEqual(
        SNIPPETS.exampleMultiSelect
      );
    });

    it("shows an import, not a tag, for a service module", async () => {
      const element = render();
      await select(element, "utils");
      expect($(element, ".library-usage").textContent).toBe(
        'import { … } from "c/utils";'
      );
    });

    it("links the base component a component extends", () => {
      const element = render(); // datatable
      const link = $(element, ".library-extends a");
      expect(link.textContent).toBe("lightning-datatable");
      expect(link.href).toContain("lightning-datatable.html");
    });

    it("goes back to the Example tab", async () => {
      const element = render();
      await activateTab(element, "specification");
      await select(element, "paginator");
      expect($(element, "lightning-tabset").activeTabValue).toBe("example");
    });

    it("shows a component's example note only when it has one", async () => {
      const element = render();
      expect($(element, ".library-note")).toBeNull();
      await select(element, "form");
      expect($(element, ".library-note").textContent).toContain(
        "creates a real Account"
      );
    });
  });

  describe("documentation tab", () => {
    it("renders headings, inline code and code blocks", async () => {
      const element = render();
      await select(element, "multiSelect");

      const headings = $$(element, ".library-doc .library-section-heading");
      expect(headings.map((h) => h.textContent)).toContain("Validation");

      const inline = $$(element, ".library-paragraph .library-inline-code");
      expect(inline.map((c) => c.textContent)).toContain("c-multi-select");
      // The backticks themselves never reach the page.
      expect($(element, ".library-doc").textContent).not.toContain("`");

      const blocks = $$(element, ".library-doc pre.library-code");
      expect(blocks.length).toBeGreaterThan(0);
    });
  });

  describe("specification tab", () => {
    it("builds a table per section the component defines", async () => {
      const element = render();
      await select(element, "multiSelect");
      const tables = $$(element, "table.library-table");
      expect(tables.map((t) => t.getAttribute("aria-label"))).toEqual([
        "Attributes",
        "Methods",
        "Events"
      ]);
    });

    it("fills a row per attribute, with code-styled names", async () => {
      const element = render();
      await select(element, "paginator");
      const table = $(element, 'table[aria-label="Attributes"]');
      const rows = [...table.querySelectorAll("tbody tr")];
      const doc = COMPONENTS.find((d) => d.name === "paginator");
      expect(rows).toHaveLength(doc.attributes.length);

      const firstCell = rows[0].querySelector("td");
      expect(firstCell.querySelector("code").textContent).toBe("page-number");
    });

    it("marks required attributes", async () => {
      const element = render();
      await select(element, "form");
      const row = $$(element, 'table[aria-label="Attributes"] tbody tr')[0];
      const cells = [...row.querySelectorAll("td")].map((td) =>
        td.textContent.trim()
      );
      expect(cells[0]).toBe("object-api-name");
      expect(cells[4]).toBe("Yes");
    });
  });

  describe("URL state", () => {
    it("opens the component and tab the URL names", async () => {
      const element = render();
      CurrentPageReference.emit({
        ...PAGE_REF,
        state: { c__component: "tooltip", c__tab: "specification" }
      });
      await flush();
      expect(title(element)).toBe("Tooltip");
      expect($(element, "lightning-tabset").activeTabValue).toBe(
        "specification"
      );
    });

    it("ignores names it does not know", async () => {
      const element = render();
      CurrentPageReference.emit({
        ...PAGE_REF,
        state: { c__component: "nope", c__tab: "nope" }
      });
      await flush();
      expect(title(element)).toBe(COMPONENTS[0].label);
      expect($(element, "lightning-tabset").activeTabValue).toBe("example");
    });

    it("writes the selection back, replacing the history entry", async () => {
      const element = render();
      CurrentPageReference.emit({ ...PAGE_REF, state: { c__other: "kept" } });
      await flush();

      await select(element, "form");
      expect(mockNavigate).toHaveBeenLastCalledWith(
        {
          ...PAGE_REF,
          state: {
            c__other: "kept",
            c__component: "form",
            c__tab: "example"
          }
        },
        true
      );

      await activateTab(element, "documentation");
      expect(mockNavigate.mock.calls.at(-1)[0].state.c__tab).toBe(
        "documentation"
      );
    });

    it("does not navigate for the tab it is already on", async () => {
      const element = render();
      CurrentPageReference.emit(PAGE_REF);
      await flush();
      await activateTab(element, "example");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("registry", () => {
    it.each(COMPONENTS.map((doc) => [doc.name, doc]))(
      "%s is complete",
      (name, doc) => {
        expect(name).toMatch(/^[a-z][A-Za-z]+$/);
        expect(CATEGORIES.map((c) => c.name)).toContain(doc.category);
        expect(doc.label).toBeTruthy();
        expect(doc.description).toBeTruthy();
        expect(doc.documentation.length).toBeGreaterThan(0);
        expect(SNIPPETS[doc.example]).toBeDefined();
        // A documented component has to exist in the repo.
        const bundle = path.resolve(__dirname, "..", "..", name);
        expect(fs.existsSync(bundle)).toBe(true);
      }
    );

    it("has snippets.js in step with the example bundles", () => {
      // If this fails, run `npm run snippets` and commit the result.
      expect(fs.readFileSync(OUTPUT, "utf8")).toBe(
        renderSnippets(collectSnippets())
      );
    });
  });
});
