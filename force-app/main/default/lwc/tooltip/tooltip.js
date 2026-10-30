import { LightningElement, api } from "lwc";

export default class Tooltip extends LightningElement {
  @api value;
  showTooltip = false;
  _position;

  handleMouseEnter(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    this._position = { top: rect.bottom + 4, left: rect.left };
    this.showTooltip = true;
  }

  handleMouseLeave() {
    this.showTooltip = false;
  }

  // The bubble only exists once showTooltip has rendered it, so it is placed here rather than
  // through a style binding in the template. Its top/left are viewport coordinates for the
  // bubble's position: fixed.
  renderedCallback() {
    const bubble = this.template.querySelector(".tooltipBubble");
    if (!bubble || !this._position) return;
    bubble.style.top = `${this._position.top}px`;
    bubble.style.left = `${this._position.left}px`;
  }
}
