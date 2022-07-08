import { DomEvent } from '../../core/dom/domEvent/DomEvent';
import { Handler } from '../../core/Handler';
import { Point } from '../../geometry/Point';
import { DMap } from '../Map';

export class Keyboard extends Handler {
  keyCodes = {
    left: [37],
    right: [39],
    down: [40],
    up: [38],
    zoomIn: [187, 107, 61, 171],
    zoomOut: [189, 109, 54, 173],
  };
  _map: any;
  _focused: any;
  _panKeys = {};
  _zoomKeys = {};

  constructor(map: DMap) {
    super(map);
    this._setPanDelta(map.options.keyboardPanDelta);
    this._setZoomDelta(map.options.zoomDelta);
  }

  addHooks() {
    const container = this.map.getContainer();

    // make the container focusable by tabbing
    if (container.tabIndex <= 0) {
      container.tabIndex = '0';
    }

    DomEvent.on(
      container,
      {
        focus: this._onFocus,
        blur: this._onBlur,
        mousedown: this._onMouseDown,
      },
      this
    );

    this.map.on(
      {
        focus: this._addHooks,
        blur: this._removeHooks,
      },
      this
    );
  }

  removeHooks() {
    this._removeHooks();

    DomEvent.off(
      this._map._container,
      {
        focus: this._onFocus,
        blur: this._onBlur,
        mousedown: this._onMouseDown,
      },
      this
    );

    this.map.off(
      {
        focus: this._addHooks,
        blur: this._removeHooks,
      },
      this
    );
  }

  _onMouseDown() {
    if (this._focused) {
      return;
    }

    const body = document.body,
      docEl = document.documentElement,
      top = body.scrollTop || docEl.scrollTop,
      left = body.scrollLeft || docEl.scrollLeft;

    this._map._container.focus();

    window.scrollTo(left, top);
  }

  _onFocus() {
    this._focused = true;
    this._map.fire('focus');
  }

  _onBlur() {
    this._focused = false;
    this._map.fire('blur');
  }

  _setPanDelta(panDelta) {
    const keys = (this._panKeys = {}),
      codes = this.keyCodes;
    let i, len;

    for (i = 0, len = codes.left.length; i < len; i++) {
      keys[codes.left[i]] = [-1 * panDelta, 0];
    }
    for (i = 0, len = codes.right.length; i < len; i++) {
      keys[codes.right[i]] = [panDelta, 0];
    }
    for (i = 0, len = codes.down.length; i < len; i++) {
      keys[codes.down[i]] = [0, panDelta];
    }
    for (i = 0, len = codes.up.length; i < len; i++) {
      keys[codes.up[i]] = [0, -1 * panDelta];
    }
  }

  _setZoomDelta(zoomDelta) {
    const keys = (this._zoomKeys = {}),
      codes = this.keyCodes;
    let i, len;

    for (i = 0, len = codes.zoomIn.length; i < len; i++) {
      keys[codes.zoomIn[i]] = zoomDelta;
    }
    for (i = 0, len = codes.zoomOut.length; i < len; i++) {
      keys[codes.zoomOut[i]] = -zoomDelta;
    }
  }

  _addHooks() {
    DomEvent.on(document, 'keydown', this._onKeyDown, this);
  }

  _removeHooks() {
    DomEvent.off(document, 'keydown', this._onKeyDown, this);
  }

  _onKeyDown(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }

    const key = e.keyCode,
      map = this._map;
    let offset;

    if (key in this._panKeys) {
      if (!map._panAnim || !map._panAnim._inProgress) {
        offset = this._panKeys[key];
        if (e.shiftKey) {
          offset = new Point(offset).multiplyBy(3);
        }

        map.panBy(offset);

        if (map.options.maxBounds) {
          map.panInsideBounds(map.options.maxBounds);
        }
      }
    } else if (key in this._zoomKeys) {
      map.setZoom(map.getZoom() + (e.shiftKey ? 3 : 1) * this._zoomKeys[key]);
    } else if (
      key === 27 &&
      map._popup &&
      map._popup.options.closeOnEscapeKey
    ) {
      map.closePopup();
    } else {
      return;
    }

    DomEvent.stop(e);
  }
}
