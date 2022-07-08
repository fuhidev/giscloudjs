/*
 * @namespace DomEvent
 * Utility functions to work with the [DOM events](https://developer.mozilla.org/docs/Web/API/Event), used by Leaflet internally.
 */

import { Point } from '../../../geometry/Point';
import { ArrayUtil } from '../../../utils/array.util';
import { CoreUtil } from '../../../utils/core.util';
import { StringUtil } from '../../../utils/string.util';
import Browser from '../../Browser';
import { DomUtil } from '../DomUtil';
import { DoubleTapDomEvent } from './DoubleTap.DomEvent';
import { PointerDomEvent } from './Pointer.DomEvent';

// Inspired by John Resig, Dean Edwards and YUI addEvent implementations.

// @function on(el: HTMLElement, types: String, fn: Function, context?: Object): this
// Adds a listener function (`fn`) to a particular DOM event type of the
// element `el`. You can optionally specify the context of the listener
// (object the `this` keyword will point to). You can also pass several
// space-separated types (e.g. `'click dblclick'`).

// @alternative
// @function on(el: HTMLElement, eventMap: Object, context?: Object): this
// Adds a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`
function on(obj, types, fn?, context?) {
  if (types && typeof types === 'object') {
    for (const type in types) {
      addOne(obj, type, types[type], fn);
    }
  } else {
    types = StringUtil.splitWords(types);

    for (let i = 0, len = types.length; i < len; i++) {
      addOne(obj, types[i], fn, context);
    }
  }

  return this;
}

const eventsKey = '_leaflet_events';

// @function off(el: HTMLElement, types: String, fn: Function, context?: Object): this
// Removes a previously added listener function.
// Note that if you passed a custom context to on, you must pass the same
// context to `off` in order to remove the listener.

// @alternative
// @function off(el: HTMLElement, eventMap: Object, context?: Object): this
// Removes a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`

// @alternative
// @function off(el: HTMLElement, types: String): this
// Removes all previously added listeners of given types.

// @alternative
// @function off(el: HTMLElement): this
// Removes all previously added listeners from given HTMLElement
function off(obj, types?, fn?, context?) {
  if (arguments.length === 1) {
    batchRemove(obj);
    delete obj[eventsKey];
  } else if (types && typeof types === 'object') {
    for (const type in types) {
      removeOne(obj, type, types[type], fn);
    }
  } else {
    types = StringUtil.splitWords(types);

    if (arguments.length === 2) {
      batchRemove(obj, function (type) {
        return ArrayUtil.indexOf(types, type) !== -1;
      });
    } else {
      for (let i = 0, len = types.length; i < len; i++) {
        removeOne(obj, types[i], fn, context);
      }
    }
  }

  return this;
}

function batchRemove(obj, filterFn?) {
  for (const id in obj[eventsKey]) {
    const type = id.split(/\d/)[0];
    if (!filterFn || filterFn(type)) {
      removeOne(obj, type, null, null, id);
    }
  }
}

const mouseSubst = {
  mouseenter: 'mouseover',
  mouseleave: 'mouseout',
  wheel: !('onwheel' in window) && 'mousewheel',
};

function addOne(obj, type, fn, context?) {
  const id =
    type + CoreUtil.stamp(fn) + (context ? '_' + CoreUtil.stamp(context) : '');

  if (obj[eventsKey] && obj[eventsKey][id]) {
    return this;
  }

  let handler: any = function (e) {
    return fn.call(context || obj, e || window.event);
  };

  const originalHandler = handler;

  if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
    // Needs DomEvent.Pointer.js
    handler = PointerDomEvent.addPointerListener(obj, type, handler);
  } else if (Browser.touch && type === 'dblclick') {
    handler = DoubleTapDomEvent.addDoubleTapListener(obj, handler);
  } else if ('addEventListener' in obj) {
    if (
      type === 'touchstart' ||
      type === 'touchmove' ||
      type === 'wheel' ||
      type === 'mousewheel'
    ) {
      obj.addEventListener(
        mouseSubst[type] || type,
        handler,
        Browser.passiveEvents ? { passive: false } : false
      );
    } else if (type === 'mouseenter' || type === 'mouseleave') {
      handler = function (e) {
        e = e || window.event;
        if (isExternalTarget(obj, e)) {
          originalHandler(e);
        }
      };
      obj.addEventListener(mouseSubst[type], handler, false);
    } else {
      obj.addEventListener(type, originalHandler, false);
    }
  } else {
    obj.attachEvent('on' + type, handler);
  }

  obj[eventsKey] = obj[eventsKey] || {};
  obj[eventsKey][id] = handler;
}

function removeOne(obj, type, fn, context, id?) {
  id =
    id ||
    type + CoreUtil.stamp(fn) + (context ? '_' + CoreUtil.stamp(context) : '');
  const handler = obj[eventsKey] && obj[eventsKey][id];

  if (!handler) {
    return this;
  }

  if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
    PointerDomEvent.removePointerListener(obj, type, handler);
  } else if (Browser.touch && type === 'dblclick') {
    DoubleTapDomEvent.removeDoubleTapListener(obj, handler);
  } else if ('removeEventListener' in obj) {
    obj.removeEventListener(mouseSubst[type] || type, handler, false);
  } else {
    obj.detachEvent('on' + type, handler);
  }

  obj[eventsKey][id] = null;
}

// @function stopPropagation(ev: DOMEvent): this
// Stop the given event from propagation to parent elements. Used inside the listener functions:
// ```js
// L.DomEvent.on(div, 'click', function (ev) {
// 	L.DomEvent.stopPropagation(ev);
// });
// ```
function stopPropagation(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  } else if (e.originalEvent) {
    // In case of Leaflet event.
    e.originalEvent._stopped = true;
  } else {
    e.cancelBubble = true;
  }

  return this;
}

// @function disableScrollPropagation(el: HTMLElement): this
// Adds `stopPropagation` to the element's `'wheel'` events (plus browser constiants).
function disableScrollPropagation(el) {
  addOne(el, 'wheel', stopPropagation);
  return this;
}

// @function disableClickPropagation(el: HTMLElement): this
// Adds `stopPropagation` to the element's `'click'`, `'dblclick'`, `'contextmenu'`,
// `'mousedown'` and `'touchstart'` events (plus browser constiants).
function disableClickPropagation(el) {
  on(el, 'mousedown touchstart dblclick contextmenu', stopPropagation);
  el['_leaflet_disable_click'] = true;
  return this;
}

// @function preventDefault(ev: DOMEvent): this
// Prevents the default action of the DOM Event `ev` from happening (such as
// following a link in the href of the a element, or doing a POST request
// with page reload when a `<form>` is submitted).
// Use it inside listener functions.
function preventDefault(e) {
  if (e.preventDefault) {
    e.preventDefault();
  } else {
    e.returnValue = false;
  }
  return this;
}

// @function stop(ev: DOMEvent): this
// Does `stopPropagation` and `preventDefault` at the same time.
function stop(e) {
  preventDefault(e);
  stopPropagation(e);
  return this;
}

// @function getPropagationPath(ev: DOMEvent): Array
// Compatibility polyfill for [`Event.composedPath()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath).
// Returns an array containing the `HTMLElement`s that the given DOM event
// should propagate to (if not stopped).
function getPropagationPath(ev) {
  if (ev.composedPath) {
    return ev.composedPath();
  }

  const path = [];
  let el = ev.target;

  while (el) {
    path.push(el);
    el = el.parentNode;
  }
  return path;
}

// @function getMousePosition(ev: DOMEvent, container?: HTMLElement): Point
// Gets normalized mouse position from a DOM event relative to the
// `container` (border excluded) or to the whole page if not specified.
function getMousePosition(e, container) {
  if (!container) {
    return new Point({ x: e.clientX, y: e.clientY });
  }

  const scale = DomUtil.getScale(container),
    offset = scale.boundingClientRect; // left and top  values are in page scale (like the event clientX/Y)

  return new Point(
    // offset.left/top values are in page scale (like clientX/Y),
    // whereas clientLeft/Top (border width) values are the original values (before CSS scale applies).
    {
      x: (e.clientX - offset.left) / scale.x - container.clientLeft,
      y: (e.clientY - offset.top) / scale.y - container.clientTop,
    }
  );
}

// Chrome on Win scrolls double the pixels as in other platforms (see #4538),
// and Firefox scrolls device pixels, not CSS pixels
const wheelPxFactor =
  Browser.win && Browser.chrome
    ? 2 * window.devicePixelRatio
    : Browser.gecko
    ? window.devicePixelRatio
    : 1;

// @function getWheelDelta(ev: DOMEvent): Number
// Gets normalized wheel delta from a wheel DOM event, in vertical
// pixels scrolled (negative if scrolling down).
// Events from pointing devices without precise scrolling are mapped to
// a best guess of 60 pixels.
function getWheelDelta(e) {
  return Browser.edge
    ? e.wheelDeltaY / 2 // Don't trust window-geometry-based delta
    : e.deltaY && e.deltaMode === 0
    ? -e.deltaY / wheelPxFactor // Pixels
    : e.deltaY && e.deltaMode === 1
    ? -e.deltaY * 20 // Lines
    : e.deltaY && e.deltaMode === 2
    ? -e.deltaY * 60 // Pages
    : e.deltaX || e.deltaZ
    ? 0 // Skip horizontal/depth wheel events
    : e.wheelDelta
    ? (e.wheelDeltaY || e.wheelDelta) / 2 // Legacy IE pixels
    : e.detail && Math.abs(e.detail) < 32765
    ? -e.detail * 20 // Legacy Moz lines
    : e.detail
    ? (e.detail / -32765) * 60 // Legacy Moz pages
    : 0;
}

// check if element really left/entered the event target (for mouseenter/mouseleave)
function isExternalTarget(el, e) {
  let related = e.relatedTarget;

  if (!related) {
    return true;
  }

  try {
    while (related && related !== el) {
      related = related.parentNode;
    }
  } catch (err) {
    return false;
  }
  return related !== el;
}

export const DomEvent = {
  on,
  off,
  addListener: on,
  removeListener: off,
  stopPropagation,
  disableScrollPropagation,
  disableClickPropagation,
  preventDefault,
  stop,
  getPropagationPath,
  getMousePosition,
  getWheelDelta,
  isExternalTarget,
};
