export default {
  name: "utils",
  label: "Utils",
  category: "utility",
  module: true,
  description:
    "Shared helpers: events, toasts that work from modals, error messages, debounce, logging and downloads.",
  example: "exampleUtils",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c/utils` is a service module. It renders nothing; import only the functions you need:",
        { code: 'import { toast, toastError, fire, debounce, errorMessage } from "c/utils";' },
        "Every helper that dispatches an event takes the component as its first argument, because only the component can dispatch. It is a module rather than a base class so it combines with `LightningModal`, `NavigationMixin` or anything else."
      ]
    },
    {
      heading: "Toasts from modals",
      body: [
        "A toast raised from inside a `lightning/modal` never appears, because the modal renders outside the opener's part of the page. The opener passes a relay in, and the modal calls `notify()`, which uses the relay when there is one and falls back to a toast when there is not:",
        {
          code: '// Opener\nawait EditModal.open({ recordId, notifyOpener: toastRelay(this) });\n\n// Modal\n@api notifyOpener;\n...\nnotify(this, "Saved", "Item added.", "success");'
        },
        "`toast()` never throws. A toast that fails to dispatch is logged and swallowed, so a failed toast cannot stop the reload or close that follows it."
      ]
    },
    {
      heading: "Reading errors",
      body: [
        "Apex, Lightning Data Service and plain JavaScript report failures in different shapes. `errorMessage()` finds the readable text in any of them, so callers never reach into `error.body` themselves. `errorMessages()` returns each message separately, for a list."
      ]
    },
    {
      heading: "Debounce",
      body: [
        "`debounce()` runs a function once calls stop arriving for the given time. Assign the result to a class field so every call shares one timer, and cancel it when the component is removed:",
        {
          code: "search = debounce((term) => this.runSearch(term), 400);\n\ndisconnectedCallback() {\n  this.search.cancel();\n}"
        }
      ]
    },
    {
      heading: "Logging",
      body: [
        "`debug()` logs only after `setDebug(true)`, so calls left in a component are silent in production. `logError()` always logs."
      ]
    },
    {
      heading: "Downloads",
      body: [
        "`saveFile()` hands content to the browser to save. Lightning Web Security only allows object URLs for a few MIME types, so text content is always wrapped as text/plain; the file name passed in is what sets the type the user sees."
      ]
    }
  ],
  functions: [
    {
      name: "fire",
      arguments: "(cmp, name, detail?, options?)",
      returns: "CustomEvent",
      description: "Dispatches a CustomEvent. options: { bubbles, composed }."
    },
    {
      name: "toast",
      arguments: "(cmp, title, message?, variant?, mode?)",
      returns: "void",
      description: "Shows a toast. Errors default to sticky. Never throws."
    },
    {
      name: "toastError",
      arguments: "(cmp, error, fallback?, title?)",
      returns: "void",
      description: "Shows an error toast with the message read from error."
    },
    {
      name: "notify",
      arguments: "(cmp, title, message?, variant?)",
      returns: "void",
      description: "Like toast, but through cmp.notifyOpener when the component is a modal."
    },
    {
      name: "notifyError",
      arguments: "(cmp, error, fallback?, title?)",
      returns: "void",
      description: "notify for a caught error."
    },
    {
      name: "toastRelay",
      arguments: "(cmp)",
      returns: "function",
      description: "The callback an opener passes to a modal as notifyOpener."
    },
    {
      name: "errorMessage",
      arguments: "(error, fallback?)",
      returns: "string",
      description: "Every readable message in an error, joined with commas."
    },
    {
      name: "errorMessages",
      arguments: "(error)",
      returns: "string[]",
      description: "Every readable message in an error, deduplicated."
    },
    {
      name: "debounce",
      arguments: "(fn, wait = 300)",
      returns: "function",
      description: "fn, delayed until calls stop. Has cancel() and flush()."
    },
    {
      name: "setDebug",
      arguments: "(enabled)",
      returns: "void",
      description: "Turns debug() output on or off for the page."
    },
    {
      name: "isDebug",
      arguments: "()",
      returns: "boolean",
      description: "Whether debug() is logging."
    },
    {
      name: "debug",
      arguments: "(source, ...args)",
      returns: "void",
      description: "Logs only when debugging is on."
    },
    {
      name: "debugFor",
      arguments: "(source)",
      returns: "function",
      description: "debug() with the source filled in."
    },
    {
      name: "logError",
      arguments: "(source, error)",
      returns: "void",
      description: "Always logs an error and its message."
    },
    {
      name: "decodeBase64",
      arguments: "(encoded)",
      returns: "ArrayBuffer",
      description: "Bytes from base64, as Apex returns file content."
    },
    {
      name: "saveFile",
      arguments: "(data, filename, options?)",
      returns: "void",
      description: "Downloads a Blob or string. options: { anchor, fallbackType, source }."
    }
  ]
};
