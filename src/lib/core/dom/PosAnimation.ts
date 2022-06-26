/*
 * @class PosAnimation
 * @aka L.PosAnimation
 * @inherits Evented
 * Used internally for panning animations, utilizing CSS3 Transitions for modern browsers and a timer fallback for IE6-9.
 *
 * @example
 * ```js
 * const myPositionMarker = L.marker([48.864716, 2.294694]).addTo(map);
 *
 * myPositionMarker.on("click", function() {
 * 	const pos = map.latLngToLayerPoint(myPositionMarker.getLatLng());
 * 	pos.y -= 25;
 * 	const fx = new L.PosAnimation();
 *
 * 	fx.once('end',function() {
 * 		pos.y += 25;
 * 		fx.run(myPositionMarker._icon, pos, 0.8);
 * 	});
 *
 * 	fx.run(myPositionMarker._icon, pos, 0.3);
 * });
 *
 * ```
 *
 * @constructor L.PosAnimation()
 * Creates a `PosAnimation` object.
 *
 */

import { CoreUtil } from '../../utils/core.util';
import { Evented } from '../Evented';
import { DomUtil } from './DomUtil';

export class PosAnimation extends Evented {
  _el: any;
  _inProgress: boolean;
  _duration: any;
  _easeOutPower: number;
  _startPos: any;
  _offset: any;
  _startTime: number;
  _animId: any;
  // @method run(el: HTMLElement, newPos: Point, duration?: Number, easeLinearity?: Number)
  // Run an animation of a given element to a new position, optionally setting
  // duration in seconds (`0.25` by default) and easing linearity factor (3rd
  // argument of the [cubic bezier curve](https://cubic-bezier.com/#0,0,.5,1),
  // `0.5` by default).
  run(el, newPos, duration, easeLinearity) {
    this.stop();

    this._el = el;
    this._inProgress = true;
    this._duration = duration || 0.25;
    this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);

    this._startPos = DomUtil.getPosition(el);
    this._offset = newPos.subtract(this._startPos);
    this._startTime = +new Date();

    // @event start: Event
    // Fired when the animation starts
    this.fire('start');

    this._animate();
  }

  // @method stop()
  // Stops the animation (if currently running).
  stop() {
    if (!this._inProgress) {
      return;
    }

    this._step(true);
    this._complete();
  }

  private _animate() {
    // animation loop
    this._animId = CoreUtil.requestAnimFrame(this._animate, this);
    this._step();
  }

  private _step(round?: boolean) {
    const elapsed = +new Date() - this._startTime,
      duration = this._duration * 1000;

    if (elapsed < duration) {
      this._runFrame(this._easeOut(elapsed / duration), round);
    } else {
      this._runFrame(1);
      this._complete();
    }
  }

  private _runFrame(progress, round?: boolean) {
    const pos = this._startPos.add(this._offset.multiplyBy(progress));
    if (round) {
      pos._round();
    }
    DomUtil.setPosition(this._el, pos);

    // @event step: Event
    // Fired continuously during the animation.
    this.fire('step');
  }

  private _complete() {
    CoreUtil.cancelAnimFrame(this._animId);

    this._inProgress = false;
    // @event end: Event
    // Fired when the animation ends.
    this.fire('end');
  }

  private _easeOut(t) {
    return 1 - Math.pow(1 - t, this._easeOutPower);
  }
}
