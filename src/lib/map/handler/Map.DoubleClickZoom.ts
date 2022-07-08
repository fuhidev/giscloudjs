import { Handler } from '../../core/Handler';

export class DoubleClickZoom extends Handler {
  addHooks() {
    this.map.on('dblclick', this._onDoubleClick, this);
  }

  removeHooks() {
    this.map.off('dblclick', this._onDoubleClick, this);
  }

  _onDoubleClick(e) {
    const map = this.map,
      oldZoom = map.getZoom(),
      delta = map.options.zoomDelta,
      zoom = e.originalEvent.shiftKey ? oldZoom - delta : oldZoom + delta;

    if (map.options.doubleClickZoom === 'center') {
      map.setZoom(zoom);
    } else {
      map.setZoomAround(e.containerPoint, zoom);
    }
  }
}
