export default {
  name: "tooltip",
  label: "Tooltip",
  category: "display",
  description: "Truncated text that shows its full value in a tooltip on hover.",
  example: "exampleTooltip",
  documentation: [
    {
      heading: "Overview",
      body: [
        "`c-tooltip` truncates its value to the width it is given and shows the whole text in a tooltip while the pointer is over it. It is the cell behind the datatable's `tooltip` column type."
      ]
    },
    {
      heading: "Positioning",
      body: [
        "The tooltip is fixed to the viewport rather than to the cell, so it is not clipped by a table that scrolls or hides its overflow. It shrinks to fit short values and wraps long ones at 25rem."
      ]
    },
    {
      heading: "Accessibility",
      body: [
        "The tooltip opens on mouse hover only; keyboard and touch users see the truncated text. Do not put information only in a tooltip that people need to complete a task."
      ]
    }
  ],
  attributes: [
    {
      name: "value",
      type: "string",
      description: "The text, shown truncated in place and in full in the tooltip."
    }
  ]
};
