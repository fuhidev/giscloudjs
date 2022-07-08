import { DomEvent } from '../../core/dom/domEvent/DomEvent';
import { DomUtil } from '../../core/dom/DomUtil';
import { Handler } from '../../core/Handler';
import { CoreUtil } from '../../utils/core.util';

export class TouchZoom extends Handler {
  _zooming: boolean;
  _centerPoint: any;
  _startLatLng: import('d:/Programing/LIBRARY/giscloudjs/src/lib/geometry/support/LatLng').LatLng;
  _pinchStartLatLng: import('d:/Programing/LIBRARY/giscloudjs/src/lib/geometry/support/LatLng').LatLng;
  _startDist: number;
  _startZoom: any;
  _moved: boolean;
  _map: any;
  _zoom: any;
  _center: any;
  private _animRequest: number;
  addHooks() {
    DomUtil.addClass(this.map.getContainer(), 'leaflet-touch-zoom');
    DomEvent.on(
      this.map.getContainer(),
      'touchstart',
      this._onTouchStart,
      this
    );
  }

  removeHooks() {
    DomUtil.removeClass(this.map.getContainer(), 'leaflet-touch-zoom');
    DomEvent.off(
      this.map.getContainer(),
      'touchstart',
      this._onTouchStart,
      this
    );
  }

  _onTouchStart(e) {
    const map = this.map;
    if (
      !e.touches ||
      e.touches.length !== 2 ||
      map._animatingZoom ||
      this._zooming
    ) {
      return;
    }

    const p1 = map.mouseEventToContainerPoint(e.touches[0]),
      p2 = map.mouseEventToContainerPoint(e.touches[1]);

    this._centerPoint = map.getSize()._divideBy(2);
    this._startLatLng = map.containerPointToLatLng(this._centerPoint);
    if (map.options.touchZoom !== 'center') {
      this._pinchStartLatLng = map.containerPointToLatLng(
        p1.add(p2).divideBy(2)
      );
    }

    this._startDist = p1.distanceTo(p2);
    this._startZoom = map.getZoom();

    this._moved = false;
    this._zooming = true;

    map.stop();

    DomEvent.on(document, 'touchmove', this._onTouchMove, this);
    DomEvent.on(document, 'touchend touchcancel', this._onTouchEnd, this);

    DomEvent.preventDefault(e);
  }

  _onTouchMove(e) {
    if (!e.touches || e.touches.length !== 2 || !this._zooming) {
      return;
    }

    const map = this._map,
      p1 = map.mouseEventToContainerPoint(e.touches[0]),
      p2 = map.mouseEventToContainerPoint(e.touches[1]),
      scale = p1.distanceTo(p2) / this._startDist;

    this._zoom = map.getScaleZoom(scale, this._startZoom);

    if (
      !map.options.bounceAtZoomLimits &&
      ((this._zoom < map.getMinZoom() && scale < 1) ||
        (this._zoom > map.getMaxZoom() && scale > 1))
    ) {
      this._zoom = map._limitZoom(this._zoom);
    }

    if (map.options.touchZoom === 'center') {
      this._center = this._startLatLng;
      if (scale === 1) {
        return;
      }
    } else {
      // Get delta from pinch to center, so centerLatLng is delta applied to initial pinchLatLng
      const delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
      if (scale === 1 && delta.x === 0 && delta.y === 0) {
        return;
      }
      this._center = map.unproject(
        map.project(this._pinchStartLatLng, this._zoom).subtract(delta),
        this._zoom
      );
    }

    if (!this._moved) {
      map._moveStart(true, false);
      this._moved = true;
    }

    CoreUtil.cancelAnimFrame(this._animRequest);

    const moveFn = CoreUtil.bind(map._move, map, this._center, this._zoom, {
      pinch: true,
      round: false,
    });
    this._animRequest = CoreUtil.requestAnimFrame(moveFn, this, true);

    DomEvent.preventDefault(e);
  }

  _onTouchEnd() {
    if (!this._moved || !this._zooming) {
      this._zooming = false;
      return;
    }

    this._zooming = false;
    CoreUtil.cancelAnimFrame(this._animRequest);

    DomEvent.off(document, 'touchmove', this._onTouchMove, this);
    DomEvent.off(document, 'touchend touchcancel', this._onTouchEnd, this);

    // Pinch updates GridLayers' levels only when zoomSnap is off, so zoomSnap becomes noUpdate.
    if (this._map.options.zoomAnimation) {
      this._map._animateZoom(
        this._center,
        this._map._limitZoom(this._zoom),
        true,
        this._map.options.zoomSnap
      );
    } else {
      this._map._resetView(this._center, this._map._limitZoom(this._zoom));
    }
  }
}
