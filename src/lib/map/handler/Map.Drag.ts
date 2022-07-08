/*
 * L.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
 */

import { DomUtil } from '../../core/dom/DomUtil';
import { Draggable } from '../../core/dom/Draggable';
import { Handler } from '../../core/Handler';
import { Bounds } from '../../geometry/Bounds';
import { LatLng } from '../../geometry/support/LatLng';
import { CoreUtil } from '../../utils/core.util';

// @namespace Map
// @section Interaction Options
export class Drag extends Handler {
  _draggable: any;
  _positions: any[];
  _times: any[];
  _offsetLimit: any;
  _viscosity: number;
  _lastTime: number;
  _lastPos: any;
  _initialWorldOffset: number;
  _worldWidth: number;
  addHooks() {
    if (!this._draggable) {
      const map = this.map;

      this._draggable = new Draggable({
        element: map.getMapPane(),
        dragStartTarget: map.getContainer(),
      });

      this._draggable.on(
        {
          dragstart: this._onDragStart,
          drag: this._onDrag,
          dragend: this._onDragEnd,
        },
        this
      );

      this._draggable.on('predrag', this._onPreDragLimit, this);
      if (map.options.worldCopyJump) {
        this._draggable.on('predrag', this._onPreDragWrap, this);
        map.on('zoomend', this._onZoomEnd, this);

        map.whenReady(this._onZoomEnd, this);
      }
    }
    DomUtil.addClass(
      this.map.getContainer(),
      'leaflet-grab leaflet-touch-drag'
    );
    this._draggable.enable();
    this._positions = [];
    this._times = [];
  }

  removeHooks() {
    DomUtil.removeClass(this.map.getContainer(), 'leaflet-grab');
    DomUtil.removeClass(this.map.getContainer(), 'leaflet-touch-drag');
    this._draggable.disable();
  }

  moved() {
    return this._draggable && this._draggable._moved;
  }

  moving() {
    return this._draggable && this._draggable._moving;
  }

  _onDragStart() {
    const map = this.map;

    map.stop();
    if (this.map.options.maxBounds && this.map.options.maxBoundsViscosity) {
      const bounds = this.map.options.maxBounds;

      this._offsetLimit = new Bounds({
        topLeft: this.map
          .latLngToContainerPoint(bounds.getNorthWest())
          .multiplyBy(-1),
        bottomRight: this.map
          .latLngToContainerPoint(bounds.getSouthEast())
          .multiplyBy(-1)
          .add(this.map.getSize()),
      });

      this._viscosity = Math.min(
        1.0,
        Math.max(0.0, this.map.options.maxBoundsViscosity)
      );
    } else {
      this._offsetLimit = null;
    }

    map.fire('movestart').fire('dragstart');

    if (map.options.inertia) {
      this._positions = [];
      this._times = [];
    }
  }

  _onDrag(e) {
    if (this.map.options.inertia) {
      const time = (this._lastTime = +new Date()),
        pos = (this._lastPos =
          this._draggable._absPos || this._draggable._newPos);

      this._positions.push(pos);
      this._times.push(time);

      this._prunePositions(time);
    }

    this.map.fire('move', e).fire('drag', e);
  }

  _prunePositions(time) {
    while (this._positions.length > 1 && time - this._times[0] > 50) {
      this._positions.shift();
      this._times.shift();
    }
  }

  _onZoomEnd() {
    const pxCenter = this.map.getSize().divideBy(2),
      pxWorldCenter = this.map.latLngToLayerPoint(new LatLng());

    this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
    this._worldWidth = this.map.getPixelWorldBounds().getSize().x;
  }

  _viscousLimit(value, threshold) {
    return value - (value - threshold) * this._viscosity;
  }

  _onPreDragLimit() {
    if (!this._viscosity || !this._offsetLimit) {
      return;
    }

    const offset = this._draggable._newPos.subtract(this._draggable._startPos);

    const limit = this._offsetLimit;
    if (offset.x < limit.min.x) {
      offset.x = this._viscousLimit(offset.x, limit.min.x);
    }
    if (offset.y < limit.min.y) {
      offset.y = this._viscousLimit(offset.y, limit.min.y);
    }
    if (offset.x > limit.max.x) {
      offset.x = this._viscousLimit(offset.x, limit.max.x);
    }
    if (offset.y > limit.max.y) {
      offset.y = this._viscousLimit(offset.y, limit.max.y);
    }

    this._draggable._newPos = this._draggable._startPos.add(offset);
  }

  _onPreDragWrap() {
    // TODO refactor to be able to adjust map pane position after zoom
    const worldWidth = this._worldWidth,
      halfWidth = Math.round(worldWidth / 2),
      dx = this._initialWorldOffset,
      x = this._draggable._newPos.x,
      newX1 = ((x - halfWidth + dx) % worldWidth) + halfWidth - dx,
      newX2 = ((x + halfWidth + dx) % worldWidth) - halfWidth - dx,
      newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

    this._draggable._absPos = this._draggable._newPos.clone();
    this._draggable._newPos.x = newX;
  }

  _onDragEnd(e) {
    const map = this.map,
      options = map.options,
      noInertia = !options.inertia || e.noInertia || this._times.length < 2;

    map.fire('dragend', e);

    if (noInertia) {
      map.fire('moveend');
    } else {
      this._prunePositions(+new Date());

      const direction = this._lastPos.subtract(this._positions[0]),
        duration = (this._lastTime - this._times[0]) / 1000,
        ease = options.easeLinearity,
        speedVector = direction.multiplyBy(ease / duration),
        speed = speedVector.distanceTo([0, 0]),
        limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
        limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),
        decelerationDuration =
          limitedSpeed / (options.inertiaDeceleration * ease);
      let offset = limitedSpeedVector
        .multiplyBy(-decelerationDuration / 2)
        .round();

      if (!offset.x && !offset.y) {
        map.fire('moveend');
      } else {
        offset = map._limitOffset(offset, map.options.maxBounds);

        CoreUtil.requestAnimFrame(function () {
          map.panBy(offset, {
            duration: decelerationDuration,
            easeLinearity: ease,
            noMoveStart: true,
            animate: true,
          });
        });
      }
    }
  }
}
