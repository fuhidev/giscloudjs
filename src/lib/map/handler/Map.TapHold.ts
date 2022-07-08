/*
 * L.Map.TapHold is used to simulate `contextmenu` event on long hold,
 * which otherwise is not fired by mobile Safari.
 */

import { DomEvent } from '../../core/dom/domEvent/DomEvent';
import { Handler } from '../../core/Handler';
import { Point } from '../../geometry/Point';
import { CoreUtil } from '../../utils/core.util';

// @namespace Map
// @section Interaction Options

export class TapHold extends Handler {
  private _holdTimeout: number;
  _startPos: Point;
  _newPos: Point;
  _map: any;
  public readonly tapHoldDelay = 5000;
  addHooks() {
    DomEvent.on(this.map.getContainer(), 'touchstart', this._onDown, this);
  }

  removeHooks() {
    DomEvent.off(this.map.getContainer(), 'touchstart', this._onDown, this);
  }

  _onDown(e) {
    clearTimeout(this._holdTimeout);
    if (e.touches.length !== 1) {
      return;
    }

    const first = e.touches[0];
    this._startPos = this._newPos = new Point({
      x: first.clientX,
      y: first.clientY,
    });

    this._holdTimeout = setTimeout(
      CoreUtil.bind(function () {
        this._cancel();
        if (!this._isTapValid()) {
          return;
        }

        // prevent simulated mouse events https://w3c.github.io/touch-events/#mouse-events
        DomEvent.on(document, 'touchend', DomEvent.preventDefault);
        DomEvent.on(document, 'touchend touchcancel', this._cancelClickPrevent);
        this._simulateEvent('contextmenu', first);
      }, this),
      this.tapHoldDelay
    );

    DomEvent.on(
      document,
      'touchend touchcancel contextmenu',
      this._cancel,
      this
    );
    DomEvent.on(document, 'touchmove', this._onMove, this);
  }

  _cancelClickPrevent() {
    DomEvent.off(document, 'touchend', DomEvent.preventDefault);
    DomEvent.off(document, 'touchend touchcancel', this._cancelClickPrevent);
  }

  _cancel() {
    clearTimeout(this._holdTimeout);
    DomEvent.off(
      document,
      'touchend touchcancel contextmenu',
      this._cancel,
      this
    );
    DomEvent.off(document, 'touchmove', this._onMove, this);
  }

  _onMove(e) {
    const first = e.touches[0];
    this._newPos = new Point({ x: first.clientX, y: first.clientY });
  }

  _isTapValid() {
    return (
      this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance
    );
  }

  _simulateEvent(type, e) {
    const simulatedEvent = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      screenX: e.screenX,
      screenY: e.screenY,
      clientX: e.clientX,
      clientY: e.clientY,
    });

    e.target.dispatchEvent(simulatedEvent);
  }
}
