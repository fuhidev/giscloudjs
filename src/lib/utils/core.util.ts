let lastId = 0;
('use strict');
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
/*eslint-disabled no-shadow-restricted-names: "error"*/
function bind(fn, obj, ...args: any[]) {
  const slice = Array.prototype.slice;

  if (fn.bind) {
    // eslint-disable-next-line prefer-spread
    return fn.bind.apply(fn, slice.call(args, 1));
  }

  const argus = slice.call(args, 2);

  return function () {
    return fn.apply(obj, argus.length ? argus.concat(slice.call(args)) : args);
  };
}

function requestAnimFrame(
  fn: (timestamp: number) => void,
  context?: any,
  immediate?: boolean
): number {
  if (immediate && requestFn === timeoutDefer) {
    fn.call(context);
    return 0;
  } else {
    return requestFn.call(window, bind(fn, context));
  }
}

// @function cancelAnimFrame(id: Number): undefined
// Cancels a previous `requestAnimFrame`. See also [window.cancelAnimationFrame](https://developer.mozilla.org/docs/Web/API/window/cancelAnimationFrame).
function cancelAnimFrame(id: number) {
  if (id) {
    cancelFn.call(window, id);
  }
}

function throttle(fn, time, context, ...argument) {
  let lock, args;
  const later = function () {
    // reset lock and call if queued
    lock = false;
    if (args) {
      wrapperFn.apply(context, args);
      args = false;
    }
  };

  const wrapperFn = function () {
    if (lock) {
      // called too soon, queue to call later
      args = argument;
    } else {
      // call and lock until later
      fn.apply(context, argument);
      setTimeout(later, time);
      lock = true;
    }
  };

  return wrapperFn;
}
function falseFn() {
  return false;
}
export const CoreUtil = {
  stamp,
  bind,
  cancelAnimFrame,
  requestAnimFrame,
  throttle,
  falseFn,
};
