import { DomEvent } from '../../core/dom/domEvent/DomEvent';
import { DomUtil } from '../../core/dom/DomUtil';
import { Handler } from '../../core/Handler';
import { Bounds } from '../../geometry/Bounds';
import { LatLngBounds } from '../../geometry/support/LatLngBounds';
import { CoreUtil } from '../../utils/core.util';
import { DMap } from '../Map';

export class BoxZoom extends Handler {
  _container: any;
  _pane: any;
  _resetStateTimeout: number;
  _moved: any;
  _startPoint: any;
  _map: any;
  _box: any;
  _point: any;
  constructor(map: DMap) {
    super(map);
    this._container = map.getContainer();
    this._pane = map.getPane('overlay');
    this._resetStateTimeout = 0;
    map.on('unload', this._destroy, this);
  }
  addHooks(): void {
    DomEvent.on(this._container, 'mousedown', this._onMouseDown, this);
  }
  removeHooks(): void {
    DomEvent.off(this._container, 'mousedown', this._onMouseDown, this);
  }

  moved() {
    return this._moved;
  }

  _destroy() {
    DomUtil.remove(this._pane);
    delete this._pane;
  }

  _resetState() {
    this._resetStateTimeout = 0;
    this._moved = false;
  }

  _clearDeferredResetState() {
    if (this._resetStateTimeout !== 0) {
      clearTimeout(this._resetStateTimeout);
      this._resetStateTimeout = 0;
    }
  }

  _onMouseDown(e) {
    if (!e.shiftKey || (e.which !== 1 && e.button !== 1)) {
      return false;
    }

    // Clear the deferred resetState if it hasn't executed yet, otherwise it
    // will interrupt the interaction and orphan a box element in the container.
    this._clearDeferredResetState();
    this._resetState();

    DomUtil.disableTextSelection();
    DomUtil.disableImageDrag();

    this._startPoint = this._map.mouseEventToContainerPoint(e);

    DomEvent.on(
      document,
      {
        contextmenu: DomEvent.stop,
        mousemove: this._onMouseMove,
        mouseup: this._onMouseUp,
        keydown: this._onKeyDown,
      },
      this
    );
  }

  _onMouseMove(e) {
    if (!this._moved) {
      this._moved = true;

      this._box = DomUtil.create('div', 'leaflet-zoom-box', this._container);
      DomUtil.addClass(this._container, 'leaflet-crosshair');

      this._map.fire('boxzoomstart');
    }

    this._point = this._map.mouseEventToContainerPoint(e);

    const bounds = new Bounds({
        topLeft: this._point,
        bottomRight: this._startPoint,
      }),
      size = bounds.getSize();

    DomUtil.setPosition(this._box, bounds.bottomRight);

    this._box.style.width = size.x + 'px';
    this._box.style.height = size.y + 'px';
  }

  _finish() {
    if (this._moved) {
      DomUtil.remove(this._box);
      DomUtil.removeClass(this._container, 'leaflet-crosshair');
    }

    DomUtil.enableTextSelection();
    DomUtil.enableImageDrag();

    DomEvent.off(
      document,
      {
        contextmenu: DomEvent.stop,
        mousemove: this._onMouseMove,
        mouseup: this._onMouseUp,
        keydown: this._onKeyDown,
      },
      this
    );
  }

  _onMouseUp(e) {
    if (e.which !== 1 && e.button !== 1) {
      return;
    }

    this._finish();

    if (!this._moved) {
      return;
    }
    // Postpone to next JS tick so internal click event handling
    // still see it as "moved".
    this._clearDeferredResetState();
    this._resetStateTimeout = setTimeout(
      CoreUtil.bind(this._resetState, this),
      0
    );

    const bounds = new LatLngBounds({
      southWest: this._map.containerPointToLatLng(this._startPoint),
      northEast: this._map.containerPointToLatLng(this._point),
    });

    this._map.fitBounds(bounds).fire('boxzoomend', { boxZoomBounds: bounds });
  }

  _onKeyDown(e) {
    if (e.keyCode === 27) {
      this._finish();
      this._clearDeferredResetState();
      this._resetState();
    }
  }
}
