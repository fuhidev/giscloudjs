import { Accessor } from '../core/Accessor';
import { Collection } from '../core/collections/Collection';
import { LatLng } from '../geometry/support/LatLng';
import { LatLngBounds } from '../geometry/support/LatLngBounds';
import { Layer } from '../layers/layer';
import { CRS } from '../projections/crs/CRS';
import { EPSG3857 } from '../projections/crs/EPSG3857.CRS';

export interface MapOptions {
  crs: CRS;
  layers: Collection<Layer>;
  center: LatLng | [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  // @option maxBounds: LatLngBounds = null
  // When this option is set, the map restricts the view to the given
  // geographical bounds, bouncing the user back if the user tries to pan
  // outside the view. To set the restriction dynamically, use
  // [`setMaxBounds`](#map-setmaxbounds) method.
  maxBounds: undefined;

  // @option renderer: Renderer = *
  // The default method for drawing vector layers on the map. `L.SVG`
  // or `L.Canvas` by default depending on browser support.
  //   renderer: undefined;

  // @section Animation Options
  // @option zoomAnimation: Boolean = true
  // Whether the map zoom animation is enabled. By default it's enabled
  // in all browsers that support CSS3 Transitions except Android.
  zoomAnimation: boolean;

  // @option zoomAnimationThreshold: Number = 4
  // Won't animate zoom if the zoom difference exceeds this value.
  zoomAnimationThreshold: number;

  // @option fadeAnimation: Boolean = true
  // Whether the tile fade animation is enabled. By default it's enabled
  // in all browsers that support CSS3 Transitions except Android.
  fadeAnimation: boolean;

  // @option markerZoomAnimation: Boolean = true
  // Whether markers animate their zoom with the zoom animation, if disabled
  // they will disappear for the length of the animation. By default it's
  // enabled in all browsers that support CSS3 Transitions except Android.
  markerZoomAnimation: boolean;

  // @option transform3DLimit: Number = 2^23
  // Defines the maximum size of a CSS translation transform. The default
  // value should not be changed unless a web browser positions layers in
  // the wrong place after doing a large `panBy`.
  //   transform3DLimit: 8388608; // Precision limit of a 32-bit float

  // @section Interaction Options
  // @option zoomSnap: Number = 1
  // Forces the map's zoom level to always be a multiple of this, particularly
  // right after a [`fitBounds()`](#map-fitbounds) or a pinch-zoom.
  // By default, the zoom level snaps to the nearest integer; lower values
  // (e.g. `0.5` or `0.1`) allow for greater granularity. A value of `0`
  // means the zoom level will not be snapped after `fitBounds` or a pinch-zoom.
  zoomSnap: number;

  // @option zoomDelta: Number = 1
  // Controls how much the map's zoom level will change after a
  // [`zoomIn()`](#map-zoomin), [`zoomOut()`](#map-zoomout), pressing `+`
  // or `-` on the keyboard, or using the [zoom controls](#control-zoom).
  // Values smaller than `1` (e.g. `0.5`) allow for greater granularity.
  zoomDelta: number;

  // @option trackResize: Boolean = true
  // Whether the map automatically handles browser window resize to update itself.
  trackResize: boolean;
}

/*
 * @class Map
 * @aka L.Map
 * @inherits Evented
 *
 * The central class of the API — it is used to create a map on a page and manipulate it.
 *
 * @example
 *
 * ```js
 * // initialize the map on the "map" div with a given center and zoom
 * var map = L.map('map', {
 * 	center: [51.505, -0.09],
 * 	zoom: 13
 * });
 * ```
 *
 */
export class Map extends Accessor {
  crs: CRS;
  center: LatLng;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  layers: Array<Layer> = [];
  maxBounds: LatLngBounds;
  zoomAnimation = true;
  zoomAnimationThreshold = 4;
  fadeAnimation = true;
  markerZoomAnimation = true;
  transform3DLimit = 8388608;
  zoomSnap = 1;
  zoomDelta = 1;
  trackResize: true;
  _handlers: any[];
  _layers: {};
  _zoomBoundLayers: {};
  _sizeChanged: boolean;
  _onResize: any;
  _zoom: any;
  _zoomAnimated: any;
  options: any;
  constructor(options: MapOptions) {
    super();
    this.crs = new EPSG3857();
    if (options.center) {
      if (Array.isArray(options.center)) {
        this.center = new LatLng({
          lng: options.center[0],
          lat: options.center[1],
        });
      } else if (options.center instanceof LatLng) {
        this.center = options.center;
      }
    }
    this._handlers = [];
    this._layers = {};
    this._zoomBoundLayers = {};
    this._sizeChanged = true;

    this._initContainer(id);
    this._initLayout();

    // hack for https://github.com/Leaflet/Leaflet/issues/1980
    this._onResize = Util.bind(this._onResize, this);

    this._initEvents();

    if (options.maxBounds) {
      this.setMaxBounds(options.maxBounds);
    }

    if (options.zoom !== undefined) {
      this._zoom = this._limitZoom(options.zoom);
    }

    if (options.center && options.zoom !== undefined) {
      this.setView(toLatLng(options.center), options.zoom, { reset: true });
    }

    this.callInitHooks();

    // don't animate on browsers without hardware-accelerated transitions or old Android/Opera
    this._zoomAnimated =
      DomUtil.TRANSITION &&
      Browser.any3d &&
      !Browser.mobileOpera &&
      this.options.zoomAnimation;

    // zoom transitions run with the same duration for all layers, so if one of transitionend events
    // happens after starting zoom animation (propagating to the map pane), we know that it ended globally
    if (this._zoomAnimated) {
      this._createAnimProxy();
      DomEvent.on(
        this._proxy,
        DomUtil.TRANSITION_END,
        this._catchTransitionEnd,
        this
      );
    }

    this._addLayers(this.options.layers);
  }
  _initContainer(id: any) {
    throw new Error('Method not implemented.');
  }
  _initLayout() {
    throw new Error('Method not implemented.');
  }
  _initEvents() {
    throw new Error('Method not implemented.');
  }
  setMaxBounds(maxBounds: never) {
    throw new Error('Method not implemented.');
  }
  _limitZoom(zoom: number): any {
    throw new Error('Method not implemented.');
  }
  setView(arg0: any, zoom: number, arg2: { reset: boolean }) {
    throw new Error('Method not implemented.');
  }
  callInitHooks() {
    throw new Error('Method not implemented.');
  }
  _createAnimProxy() {
    throw new Error('Method not implemented.');
  }
  _proxy(
    _proxy: any,
    TRANSITION_END: any,
    _catchTransitionEnd: any,
    arg3: this
  ) {
    throw new Error('Method not implemented.');
  }
  _catchTransitionEnd(
    _proxy: any,
    TRANSITION_END: any,
    _catchTransitionEnd: any,
    arg3: this
  ) {
    throw new Error('Method not implemented.');
  }
  _addLayers(layers: any) {
    throw new Error('Method not implemented.');
  }
}
