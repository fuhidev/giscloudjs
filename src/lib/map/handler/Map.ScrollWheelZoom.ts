import { DomEvent } from '../../core/dom/domEvent/DomEvent';
import { Handler } from '../../core/Handler';
import { CoreUtil } from '../../utils/core.util';

export class ScrollWheelZoom extends Handler {
  _delta: number;
  _map: any;
  _lastMousePos: any;
  _startTime: any;
  private _timer: number;
  addHooks() {
    DomEvent.on(this.map.getContainer(), 'wheel', this._onWheelScroll, this);

    this._delta = 0;
  }

  removeHooks() {
    DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this);
  }

  _onWheelScroll(e) {
    const delta = DomEvent.getWheelDelta(e);

    const debounce = this._map.options.wheelDebounceTime;

    this._delta += delta;
    this._lastMousePos = this._map.mouseEventToContainerPoint(e);

    if (!this._startTime) {
      this._startTime = +new Date();
    }

    const left = Math.max(debounce - (+new Date() - this._startTime), 0);

    clearTimeout(this._timer);
    this._timer = setTimeout(CoreUtil.bind(this._performZoom, this), left);

    DomEvent.stop(e);
  }

  _performZoom() {
    const map = this.map,
      zoom = map.getZoom(),
      snap = this._map.options.zoomSnap || 0;

    map.stop(); // stop panning and fly animations if any

    // map the delta with a sigmoid function to -4..4 range leaning on -1..1
    const d2 = this._delta / (this._map.options.wheelPxPerZoomLevel * 4),
      d3 = (4 * Math.log(2 / (1 + Math.exp(-Math.abs(d2))))) / Math.LN2,
      d4 = snap ? Math.ceil(d3 / snap) * snap : d3,
      delta = map._limitZoom(zoom + (this._delta > 0 ? d4 : -d4)) - zoom;

    this._delta = 0;
    this._startTime = null;

    if (!delta) {
      return;
    }

    if (map.options.scrollWheelZoom === 'center') {
      map.setZoom(zoom + delta);
    } else {
      map.setZoomAround(this._lastMousePos, zoom + delta);
    }
  }
}
