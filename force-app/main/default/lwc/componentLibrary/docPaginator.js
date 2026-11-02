export default {
  name: "paginator",
  label: "Paginator",
  category: "data",
  description:
    "Page navigation for a table or list: a page box, rows per page, and windowed page numbers.",
  example: "examplePaginator",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-paginator` shows the page box and a rows-per-page picker on the left, and the page numbers with first, previous, next and last on the right.",
        "It knows nothing about how pages are fetched. It takes a row count and gives back a page number, so it works the same over an OFFSET query, a keyset cursor or an array sliced in the browser."
      ]
    },
    {
      heading: "One-way data flow",
      body: [
        "`page-number` and `page-size` are inputs only: the component never writes them. Clicking a page fires `pagechange`, and the host decides whether to honour it and passes the new value back down. A fetch that fails therefore leaves the paginator showing the page that is actually loaded.",
        {
          code: "async handlePageChange(event) {\n  const page = event.detail.page;\n  await this.loadPage(page); // if this throws, pageNumber stays put\n  this.pageNumber = page;\n}\n\nhandlePageSizeChange(event) {\n  this.pageSize = event.detail.pageSize;\n  this.pageNumber = 1;\n}"
        }
      ]
    },
    {
      heading: "Page numbers",
      body: [
        "The first three and last three pages are always shown, plus the pages either side of the current one, with gaps collapsed to an ellipsis — for example `1 2 3 … 8 9 10`. That is at most nine numbers and two ellipses whatever the page count, so the row has a bounded width under a table."
      ]
    },
    {
      heading: "Typing a page",
      body: [
        "The page box commits on Enter or when it loses focus, not on every keystroke, so typing 271 does not ask for page 2 and page 27 on the way. Out-of-range numbers are clamped and written back into the box."
      ]
    },
    {
      heading: "Unknown row counts",
      body: [
        "When the host knows the page count but not the row count — a cursor walk that was cut short, say — pass `total-pages-override` instead of `total-rows`.",
        "Zero rows is one empty page, not zero pages, so the controls disable for the right reason."
      ]
    }
  ],
  attributes: [
    {
      name: "page-number",
      type: "number",
      default: "1",
      description: "The page being shown, 1-based."
    },
    {
      name: "total-rows",
      type: "number",
      default: "0",
      description: "How many rows match in total. The page count comes from this and page-size."
    },
    {
      name: "page-size",
      type: "number",
      default: "50",
      description: "Rows per page."
    },
    {
      name: "page-size-options",
      type: "number[] | string",
      default: "[10, 25, 50, 100]",
      description: "Rows-per-page choices, as an array or a comma-separated list."
    },
    {
      name: "total-pages-override",
      type: "number",
      description: "Page count to use instead of deriving one from total-rows."
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Disables every control, for while the host is loading."
    },
    {
      name: "hide-page-jump",
      type: "boolean",
      default: "false",
      description: "Hides the page box and the page numbers, leaving the arrows."
    },
    {
      name: "hide-page-size",
      type: "boolean",
      default: "false",
      description: "Hides the rows-per-page picker, for a fixed page size."
    },
    {
      name: "total-pages",
      type: "number",
      description: "Read-only. The page count, never less than 1."
    }
  ],
  events: [
    {
      name: "pagechange",
      detail: "{ page: number }",
      description:
        "Asks for a different page. Already clamped to the page range, and never fired for the current page."
    },
    {
      name: "pagesizechange",
      detail: "{ pageSize: number }",
      description: "Asks for a different page size."
    }
  ]
};
