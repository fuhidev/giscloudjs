/*
 * @namespace Browser
 * @aka L.Browser
 *
 * A namespace with static properties for browser/feature detection used by Leaflet internally.
 *
 * @example
 *
 * ```js
 * if (L.Browser.ielt9) {
 *   alert('Upgrade your browser, dude!');
 * }
 * ```
 */

import { SvgUtil } from '../symbols/support/SVG.Util';

const style = document.documentElement.style;

// @property ie: Boolean; `true` for all Internet Explorer versions (not Edge).
const ie = 'ActiveXObject' in window;

// @property ielt9: Boolean; `true` for Internet Explorer versions less than 9.
const ielt9 = ie && !document.addEventListener;

// @property edge: Boolean; `true` for the Edge web browser.
const edge = 'msLaunchUri' in navigator && !('documentMode' in document);

// @property webkit: Boolean;
// `true` for webkit-based browsers like Chrome and Safari (including mobile versions).
const webkit = userAgentContains('webkit');

// @property android: Boolean
// **Deprecated.** `true` for any browser running on an Android platform.
const android = userAgentContains('android');

// @property android23: Boolean; **Deprecated.** `true` for browsers running on Android 2 or Android 3.
const android23 =
  userAgentContains('android 2') || userAgentContains('android 3');

/* See https://stackoverflow.com/a/17961266 for details on detecting stock Android */
const webkitVer = parseInt(
  /WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1],
  10
); // also matches AppleWebKit
// @property androidStock: Boolean; **Deprecated.** `true` for the Android stock browser (i.e. not Chrome)
const androidStock =
  android &&
  userAgentContains('Google') &&
  webkitVer < 537 &&
  !('AudioNode' in window);

// @property opera: Boolean; `true` for the Opera browser
const opera = !!(window as any).opera;

// @property chrome: Boolean; `true` for the Chrome browser.
const chrome = !edge && userAgentContains('chrome');

// @property gecko: Boolean; `true` for gecko-based browsers like Firefox.
const gecko = userAgentContains('gecko') && !webkit && !opera && !ie;

// @property safari: Boolean; `true` for the Safari browser.
const safari = !chrome && userAgentContains('safari');

const phantom = userAgentContains('phantom');

// @property opera12: Boolean
// `true` for the Opera browser supporting CSS transforms (version 12 or later).
const opera12 = 'OTransition' in style;

// @property win: Boolean; `true` when the browser is running in a Windows platform
const win = navigator.platform.indexOf('Win') === 0;

// @property ie3d: Boolean; `true` for all Internet Explorer versions supporting CSS transforms.
const ie3d = ie && 'transition' in style;

// @property webkit3d: Boolean; `true` for webkit-based browsers supporting CSS transforms.
const webkit3d =
  'WebKitCSSMatrix' in window &&
  'm11' in new window.WebKitCSSMatrix() &&
  !android23;

// @property gecko3d: Boolean; `true` for gecko-based browsers supporting CSS transforms.
const gecko3d = 'MozPerspective' in style;

// @property any3d: Boolean
// `true` for all browsers supporting CSS transforms.
const any3d =
  !(window as any).L_DISABLE_3D &&
  (ie3d || webkit3d || gecko3d) &&
  !opera12 &&
  !phantom;

// @property mobile: Boolean; `true` for all browsers running in a mobile device.
const mobile =
  typeof orientation !== 'undefined' || userAgentContains('mobile');

// @property mobileWebkit: Boolean; `true` for all webkit-based browsers in a mobile device.
const mobileWebkit = mobile && webkit;

// @property mobileWebkit3d: Boolean
// `true` for all webkit-based browsers in a mobile device supporting CSS transforms.
const mobileWebkit3d = mobile && webkit3d;

// @property msPointer: Boolean
// `true` for browsers implementing the Microsoft touch events model (notably IE10).
const msPointer = !window.PointerEvent && (window as any).MSPointerEvent;

// @property pointer: Boolean
// `true` for all browsers supporting [pointer events](https://msdn.microsoft.com/en-us/library/dn433244%28v=vs.85%29.aspx).
const pointer = !!(window.PointerEvent || msPointer);

// @property touchNative: Boolean
// `true` for all browsers supporting [touch events](https://developer.mozilla.org/docs/Web/API/Touch_events).
// **This does not necessarily mean** that the browser is running in a computer with
// a touchscreen, it only means that the browser is capable of understanding
// touch events.
const touchNative = 'ontouchstart' in window || !!window.TouchEvent;

// @property touch: Boolean
// `true` for all browsers supporting either [touch](#browser-touch) or [pointer](#browser-pointer) events.
// Note: pointer events will be preferred (if available), and processed for all `touch*` listeners.
const touch = !(window as any).L_NO_TOUCH && (touchNative || pointer);

// @property mobileOpera: Boolean; `true` for the Opera browser in a mobile device.
const mobileOpera = mobile && opera;

// @property mobileGecko: Boolean
// `true` for gecko-based browsers running in a mobile device.
const mobileGecko = mobile && gecko;

// @property retina: Boolean
// `true` for browsers on a high-resolution "retina" screen or on any screen when browser's display zoom is more than 100%.
const retina =
  (window.devicePixelRatio ||
    (window.screen as any).deviceXDPI / (window.screen as any).logicalXDPI) > 1;

// @property passiveEvents: Boolean
// `true` for browsers that support passive events.
const passiveEvents = (function () {
  let supportsPassiveOption = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: function () {
        supportsPassiveOption = true;
      },
    });
    window.addEventListener(
      'testPassiveEventSupport',
      function () {
        return false;
      },
      opts
    );
    window.removeEventListener(
      'testPassiveEventSupport',
      function () {
        return false;
      },
      opts
    );
  } catch (e) {
    // Errors can safely be ignored since this is only a browser support test.
  }
  return supportsPassiveOption;
})();

// @property canvas: Boolean
// `true` when the browser supports [`<canvas>`](https://developer.mozilla.org/docs/Web/API/Canvas_API).
const canvas = (function () {
  return !!document.createElement('canvas').getContext;
})();

// @property svg: Boolean
// `true` when the browser supports [SVG](https://developer.mozilla.org/docs/Web/SVG).
const svg = !!(
  document.createElementNS && SvgUtil.svgCreate('svg').createSVGRect
);

const inlineSvg =
  !!svg &&
  (function () {
    const div = document.createElement('div');
    div.innerHTML = '<svg/>';
    return (
      (div.firstChild && (div.firstChild as any).namespaceURI) ===
      'http://www.w3.org/2000/svg'
    );
  })();

// @property vml: Boolean
// `true` if the browser supports [VML](https://en.wikipedia.org/wiki/Vector_Markup_Language).
const vml =
  !svg &&
  (function () {
    try {
      const div = document.createElement('div');
      div.innerHTML = '<v:shape adj="1"/>';

      const shape = div.firstChild as any;
      shape.style.behavior = 'url(#default#VML)';

      return shape && typeof shape.adj === 'object';
    } catch (e) {
      return false;
    }
  })();

function userAgentContains(str) {
  return navigator.userAgent.toLowerCase().indexOf(str) >= 0;
}

export default {
  ie: ie,
  ielt9: ielt9,
  edge: edge,
  webkit: webkit,
  android: android,
  android23: android23,
  androidStock: androidStock,
  opera: opera,
  chrome: chrome,
  gecko: gecko,
  safari: safari,
  phantom: phantom,
  opera12: opera12,
  win: win,
  ie3d: ie3d,
  webkit3d: webkit3d,
  gecko3d: gecko3d,
  any3d: any3d,
  mobile: mobile,
  mobileWebkit: mobileWebkit,
  mobileWebkit3d: mobileWebkit3d,
  msPointer: msPointer,
  pointer: pointer,
  touch: touch,
  touchNative: touchNative,
  mobileOpera: mobileOpera,
  mobileGecko: mobileGecko,
  retina: retina,
  passiveEvents: passiveEvents,
  canvas: canvas,
  svg: svg,
  vml: vml,
  inlineSvg: inlineSvg,
};
