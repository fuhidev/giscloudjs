/*
 * @class Draggable
 * @aka L.Draggable
 * @inherits Evented
 *
 * A class for making DOM elements draggable (including touch support).
 * Used internally for map and marker dragging. Only works for elements
 * that were positioned with [`L.DomUtil.setPosition`](#domutil-setposition).
 *
 * @example
 * ```js
 * const draggable = new L.Draggable(elementToDrag);
 * draggable.enable();
 * ```
 */

import { Point } from '../../geometry/Point';
import Browser from '../Browser';
import { Evented } from '../Evented';
import { DomEvent } from './domEvent/DomEvent';
import { DomUtil } from './DomUtil';

const START = Browser.touch ? 'touchstart mousedown' : 'mousedown';

export interface DraggableOptions {
  element: HTMLElement;
  dragStartTarget: HTMLElement;
  preventOutline?: boolean;
}

export class Draggable extends Evented {
  clickTolerance = 3;
  _element: any;
  _dragStartTarget: any;
  _preventOutline: any;
  static _dragging: any;
  _enabled: any;
  _moved: boolean;
  _moving: any;
  _startPoint: any;
  _startPos: any;
  _parentScale: any;
  options: any;
  _lastTarget: any;
  _newPos: any;
  _lastEvent: any;
  constructor(options: DraggableOptions) {
    super();
    this._element = options.element;
    this._dragStartTarget = options.dragStartTarget || options.element;
    this._preventOutline = options.preventOutline;
  }

  // @method enable()
  // Enables the dragging ability
  enable() {
    if (this._enabled) {
      return;
    }

    DomEvent.on(this._dragStartTarget, START, this._onDown, this);

    this._enabled = true;
  }

  // @method disable()
  // Disables the dragging ability
  disable() {
    if (!this._enabled) {
      return;
    }

    // If we're currently dragging this draggable,
    // disabling it counts as first ending the drag.
    if (Draggable._dragging === this) {
      this.finishDrag(true);
    }

    DomEvent.off(this._dragStartTarget, START, this._onDown, this);

    this._enabled = false;
    this._moved = false;
  }

  _onDown(e) {
    // Ignore the event if disabled; this happens in IE11
    // under some circumstances, see #3666.
    if (!this._enabled) {
      return;
    }

    this._moved = false;

    if (DomUtil.hasClass(this._element, 'leaflet-zoom-anim')) {
      return;
    }

    if (e.touches && e.touches.length !== 1) {
      // Finish dragging to avoid conflict with touchZoom
      if (Draggable._dragging === this) {
        this.finishDrag();
      }
      return;
    }

    if (
      Draggable._dragging ||
      e.shiftKey ||
      (e.which !== 1 && e.button !== 1 && !e.touches)
    ) {
      return;
    }
    Draggable._dragging = this; // Prevent dragging multiple objects at once.

    if (this._preventOutline) {
      DomUtil.preventOutline(this._element);
    }

    DomUtil.disableImageDrag();
    DomUtil.disableTextSelection();

    if (this._moving) {
      return;
    }

    // @event down: Event
    // Fired when a drag is about to start.
    this.fire('down');

    const first = e.touches ? e.touches[0] : e,
      sizedParent = DomUtil.getSizedParentNode(this._element);

    this._startPoint = new Point({ x: first.clientX, y: first.clientY });
    this._startPos = DomUtil.getPosition(this._element);

    // Cache the scale, so that we can continuously compensate for it during drag (_onMove).
    this._parentScale = DomUtil.getScale(sizedParent);

    const mouseevent = e.type === 'mousedown';
    DomEvent.on(
      document,
      mouseevent ? 'mousemove' : 'touchmove',
      this._onMove,
      this
    );
    DomEvent.on(
      document,
      mouseevent ? 'mouseup' : 'touchend touchcancel',
      this._onUp,
      this
    );
  }

  _onMove(e) {
    // Ignore the event if disabled; this happens in IE11
    // under some circumstances, see #3666.
    if (!this._enabled) {
      return;
    }

    if (e.touches && e.touches.length > 1) {
      this._moved = true;
      return;
    }

    const first = e.touches && e.touches.length === 1 ? e.touches[0] : e,
      offset = new Point({ x: first.clientX, y: first.clientY }).subtract(
        this._startPoint
      );

    if (!offset.x && !offset.y) {
      return;
    }
    if (Math.abs(offset.x) + Math.abs(offset.y) < this.options.clickTolerance) {
      return;
    }

    // We assume that the parent container's position, border and scale do not change for the duration of the drag.
    // Therefore there is no need to account for the position and border (they are eliminated by the subtraction)
    // and we can use the cached value for the scale.
    offset.x /= this._parentScale.x;
    offset.y /= this._parentScale.y;

    DomEvent.preventDefault(e);

    if (!this._moved) {
      // @event dragstart: Event
      // Fired when a drag starts
      this.fire('dragstart');

      this._moved = true;

      DomUtil.addClass(document.body, 'leaflet-dragging');

      this._lastTarget = e.target || e.srcElement;
      // IE and Edge do not give the <use> element, so fetch it
      // if necessary
      if (
        (window as any).SVGElementInstance &&
        this._lastTarget instanceof (window as any).SVGElementInstance
      ) {
        this._lastTarget = this._lastTarget.correspondingUseElement;
      }
      DomUtil.addClass(this._lastTarget, 'leaflet-drag-target');
    }

    this._newPos = this._startPos.add(offset);
    this._moving = true;

    this._lastEvent = e;
    this._updatePosition();
  }

  _updatePosition() {
    const e = { originalEvent: this._lastEvent };

    // @event predrag: Event
    // Fired continuously during dragging *before* each corresponding
    // update of the element's position.
    this.fire('predrag', e);
    DomUtil.setPosition(this._element, this._newPos);

    // @event drag: Event
    // Fired continuously during dragging.
    this.fire('drag', e);
  }

  _onUp() {
    // Ignore the event if disabled; this happens in IE11
    // under some circumstances, see #3666.
    if (!this._enabled) {
      return;
    }
    this.finishDrag();
  }

  finishDrag(noInertia?) {
    DomUtil.removeClass(document.body, 'leaflet-dragging');

    if (this._lastTarget) {
      DomUtil.removeClass(this._lastTarget, 'leaflet-drag-target');
      this._lastTarget = null;
    }

    DomEvent.off(document, 'mousemove touchmove', this._onMove, this);
    DomEvent.off(document, 'mouseup touchend touchcancel', this._onUp, this);

    DomUtil.enableImageDrag();
    DomUtil.enableTextSelection();

    if (this._moved && this._moving) {
      // @event dragend: DragEndEvent
      // Fired when the drag ends.
      this.fire('dragend', {
        noInertia: noInertia,
        distance: this._newPos.distanceTo(this._startPos),
      });
    }

    this._moving = false;
    Draggable._dragging = false;
  }
}
