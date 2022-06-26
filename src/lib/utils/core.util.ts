/* eslint-disable prefer-rest-params */
// @property lastId: Number
// Last unique ID used by [`stamp()`](#util-stamp)
let lastId = 0;

// @function stamp(obj: Object): Number
// Returns the unique ID of an object, assigning it one if it doesn't have it.
function stamp(obj) {
  if (!('_leaflet_id' in obj)) {
    obj['_leaflet_id'] = ++lastId;
  }
  return obj._leaflet_id;
}
let lastTime = 0;
function timeoutDefer(fn) {
  const time = +new Date(),
    timeToCall = Math.max(0, 16 - (time - lastTime));

  lastTime = time + timeToCall;
  return window.setTimeout(fn, timeToCall);
}
function getPrefixed(name) {
  return window['webkit' + name] || window['moz' + name] || window['ms' + name];
}
const requestFn =
  window.requestAnimationFrame ||
  getPrefixed('RequestAnimationFrame') ||
  timeoutDefer;
const cancelFn =
  window.cancelAnimationFrame ||
  getPrefixed('CancelAnimationFrame') ||
  getPrefixed('CancelRequestAnimationFrame') ||
  function (id) {
    window.clearTimeout(id);
  };

function bind(fn, obj) {
  const slice = Array.prototype.slice;

  if (fn.bind) {
    // eslint-disable-next-line prefer-spread
    return fn.bind.apply(fn, slice.call(arguments, 1));
  }

  const args = slice.call(arguments, 2);

  return function () {
    return fn.apply(
      obj,
      args.length ? args.concat(slice.call(arguments)) : arguments
    );
  };
}

function requestAnimFrame(fn, context, immediate?) {
  if (immediate && requestFn === timeoutDefer) {
    fn.call(context);
  } else {
    return requestFn.call(window, bind(fn, context));
  }
}

// @function cancelAnimFrame(id: Number): undefined
// Cancels a previous `requestAnimFrame`. See also [window.cancelAnimationFrame](https://developer.mozilla.org/docs/Web/API/window/cancelAnimationFrame).
function cancelAnimFrame(id) {
  if (id) {
    cancelFn.call(window, id);
  }
}
export const CoreUtil = {
  stamp,
  cancelAnimFrame,
  requestAnimFrame,
};
