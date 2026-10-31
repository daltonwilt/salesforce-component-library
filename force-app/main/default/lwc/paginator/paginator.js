import { LightningElement, api } from "lwc";

/**
 * Page navigation: a page box and rows-per-page on the left, windowed page numbers and
 * first/previous/next/last on the right.
 *
 *   Page [ 1 ] of 10  |  Rows per page [ 10 v ]      « ‹ 1 2 3 … 8 9 10 › »
 *
 *   <c-paginator
 *     page-number={pageNumber}
 *     total-rows={totalRows}
 *     page-size={pageSize}
 *     disabled={isBusy}
 *     onpagechange={handlePageChange}
 *     onpagesizechange={handlePageSizeChange}>
 *   </c-paginator>
 *
 * Deliberately knows nothing about how pages are fetched. It takes a row count and gives back
 * a page number, so it serves a keyset cursor, a cached Id list and an OFFSET query equally
 * well - which is the point of having one of these rather than the six near-identical
 * paginator bundles already in this org.
 *
 * One-way data flow: `page-number` and `page-size` are inputs and are never written to. The
 * component asks for a change by firing an event, and the host decides whether to honour it
 * and passes the new value back down. That keeps what is displayed and what is loaded from
 * drifting apart when a fetch fails.
 */

/** Pages always shown at each end of the range. Three is what makes `1 2 3 … 8 9 10` rather
 *  than the tighter `1 … 10`, and it keeps the row a predictable width. */
const EDGE_PAGES = 3;

/** Pages shown either side of the current one, on top of the edges. */
const SIBLING_PAGES = 1;

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default class Paginator extends LightningElement {
  /** The page being shown, 1-based. An input only - see the class note. */
  @api pageNumber = 1;

  /** How many rows match in total. With pageSize this is what the page count comes from. */
  @api totalRows = 0;

  /** Rows per page. An input only; changing it is a request, not a local action. */
  @api pageSize = 50;

  /** Greys out every control, for while the host is loading. */
  @api disabled = false;

  /**
   * Hides the page box and the page numbers, leaving the arrows. Negative because a public
   * boolean cannot be initialised to true (@lwc/lwc/valid-api).
   */
  @api hidePageJump = false;

  /** Hides the rows-per-page picker, for a host whose page size is fixed. */
  @api hidePageSize = false;

  /**
   * Page count when the host knows it directly and has no row count to derive it from - a
   * cursor walk that was cut short, say. Ignored when absent.
   */
  @api totalPagesOverride;

  /** Rows-per-page choices, as an array or a comma-separated list. */
  @api
  get pageSizeOptions() {
    return this._pageSizeOptions;
  }
  set pageSizeOptions(value) {
    const parsed = parseNumberList(value);
    this._pageSizeOptions = parsed.length ? parsed : DEFAULT_PAGE_SIZE_OPTIONS;
  }

  _pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  /**
   * The page count, from the override when given and from the row count otherwise. Never
   * below 1: an empty result set is one empty page, not zero pages, and zero would make every
   * control look disabled for the wrong reason.
   */
  @api
  get totalPages() {
    if (this.totalPagesOverride) {
      return Math.max(toNumber(this.totalPagesOverride, 1), 1);
    }
    const rows = toNumber(this.totalRows, 0);
    const size = Math.max(toNumber(this.pageSize, 50), 1);
    return Math.max(Math.ceil(rows / size), 1);
  }

  get currentPage() {
    return Math.min(Math.max(toNumber(this.pageNumber, 1), 1), this.totalPages);
  }

  /* ── Presentation ─────────────────────────────────────────────────────────────────── */

  get showPageJump() {
    return !this.hidePageJump;
  }

  get showPageSize() {
    return !this.hidePageSize;
  }

  get sizeOptions() {
    return this._pageSizeOptions.map((size) => ({
      value: String(size),
      label: String(size),
    }));
  }

  /** lightning-combobox compares option values as strings. */
  get pageSizeValue() {
    return String(toNumber(this.pageSize, 50));
  }

  get pageCountLabel() {
    return "of " + this.totalPages.toLocaleString();
  }

  /**
   * The page numbers to render, with gaps collapsed to an ellipsis.
   *
   * Both ends are always present so the first and last pages are one click away, and the
   * current page carries its neighbours so stepping through does not make the row jump about.
   * Whatever the page count, this renders at most nine numbers and two ellipses - the width is
   * bounded, which matters for something sitting under a table.
   */
  get pageItems() {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages = new Set();

    for (let page = 1; page <= Math.min(EDGE_PAGES, total); page++) {
      pages.add(page);
    }
    for (
      let page = Math.max(total - EDGE_PAGES + 1, 1);
      page <= total;
      page++
    ) {
      pages.add(page);
    }
    for (
      let page = Math.max(current - SIBLING_PAGES, 1);
      page <= Math.min(current + SIBLING_PAGES, total);
      page++
    ) {
      pages.add(page);
    }

    const items = [];
    let previous = 0;
    for (const page of [...pages].sort((a, b) => a - b)) {
      if (previous && page - previous > 1) {
        items.push({ key: "gap-" + page, isGap: true });
      }
      const isCurrent = page === current;
      items.push({
        key: "page-" + page,
        page,
        label: page.toLocaleString(),
        isGap: false,
        isCurrent,
        ariaCurrent: isCurrent ? "page" : null,
        variant: isCurrent ? "brand" : "base",
      });
      previous = page;
    }
    return items;
  }

  get previousDisabled() {
    return this.disabled || this.currentPage <= 1;
  }

  get nextDisabled() {
    return this.disabled || this.currentPage >= this.totalPages;
  }

  /* ── Navigation ───────────────────────────────────────────────────────────────────── */

  handleFirst() {
    this.request(1);
  }

  handlePrevious() {
    this.request(this.currentPage - 1);
  }

  handleNext() {
    this.request(this.currentPage + 1);
  }

  handleLast() {
    this.request(this.totalPages);
  }

  handlePageClick(event) {
    this.request(event.currentTarget.dataset.page);
  }

  /**
   * Committed on Enter or on blur rather than per keystroke. Every commit costs the host a
   * fetch, and typing "271" would otherwise ask for page 2 and page 27 on the way there.
   */
  handlePageInput(event) {
    if (event.type === "keyup" && event.key !== "Enter") {
      return;
    }
    const requested = this.clamp(event.target.value);
    // Put the clamped number back, so a typed 900 does not sit there looking like the page
    // being shown.
    event.target.value = String(requested);
    this.request(requested);
  }

  handlePageSizeChange(event) {
    const size = toNumber(event.detail.value, 0);
    if (size > 0 && size !== toNumber(this.pageSize, 50)) {
      // A request, not a local change. The host owns page size, because for a keyset pager it
      // decides where the page boundaries fall - every one of them has to be resolved again.
      this.dispatchEvent(
        new CustomEvent("pagesizechange", { detail: { pageSize: size } }),
      );
    }
  }

  clamp(value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) {
      return 1;
    }
    return Math.min(parsed, this.totalPages);
  }

  request(page) {
    const target = this.clamp(page);
    if (target === this.currentPage) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("pagechange", { detail: { page: target } }),
    );
  }
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

function parseNumberList(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value == null ? "" : value).split(",");
  return raw
    .map((part) => Number(String(part).trim()))
    .filter((part) => !isNaN(part) && part > 0);
}
