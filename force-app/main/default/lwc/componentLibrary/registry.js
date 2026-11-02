import datatable from "./docDatatable";
import fileLoader from "./docFileLoader";
import form from "./docForm";
import multiSelect from "./docMultiSelect";
import paginator from "./docPaginator";
import thumbnail from "./docThumbnail";
import tooltip from "./docTooltip";
import utils from "./docUtils";

/**
 * Everything the component library documents. To add a component:
 *
 *   1. Build a runnable demo as its own bundle named example<Component>.
 *   2. Add a branch for it in componentLibraryExample.
 *   3. Write a doc<Component>.js here and list it below.
 *   4. Run `npm run snippets` so the Example tab shows the demo's source.
 *
 * A doc entry has:
 *   name, label, category, description, example, exampleNote?, module?, extends?
 *   documentation: [{ heading, body: [paragraph | { code } | { list: [...] }] }]
 *     Text in `backticks` renders as inline code.
 *   Specification tables, each optional: attributes, fieldOptions, methods, functions, events,
 *   columnTypes, stylingHooks.
 */

export const CATEGORIES = [
  { name: "data", label: "Data" },
  { name: "input", label: "Input" },
  { name: "display", label: "Display" },
  { name: "utility", label: "Utilities" }
];

export const COMPONENTS = [
  datatable,
  paginator,
  form,
  multiSelect,
  fileLoader,
  thumbnail,
  tooltip,
  utils
];
