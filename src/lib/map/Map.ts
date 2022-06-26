import { Accessor } from '../core/Accessor';
import Browser from '../core/Browser';
import { Collection } from '../core/collections/Collection';
import { DomEvent } from '../core/dom/domEvent/DomEvent';
import { DomUtil } from '../core/dom/DomUtil';
import { PosAnimation } from '../core/dom/PosAnimation';
import { Bounds } from '../geometry/Bounds';
import { Point } from '../geometry/Point';
import { LatLng } from '../geometry/support/LatLng';
import { LatLngBounds } from '../geometry/support/LatLngBounds';
import { Layer } from '../layers/layer';
import { CRS } from '../projections/crs/CRS';
import { EPSG3857 } from '../projections/crs/EPSG3857.CRS';
import { ArrayUtil } from '../utils/array.utils';
import { CoreUtil } from '../utils/core.util';

export interface ZoomOptions {
  animate?: boolean;
}

export interface PanOptions extends ZoomOptions {
  duration?: number;
  easeLinearity?: number;
  noMoveStart?: boolean;
}

export interface PaddingOptions {
  paddingTopLeft?: Point;
  paddingBottomRight?: Point;
  padding?: Point;
}

export interface FitBoundOptions
  extends ZoomOptions,
    PanOptions,
    PaddingOptions {
  maxZoom?: number;
}

export interface PanInsideOptions extends PanOptions, PaddingOptions {}

export interface ZoomPanOptions extends ZoomOptions, PanOptions {}

export interface InvalidateSizeOptions extends ZoomPanOptions {
  debounceMoveend?: boolean | undefined;
  pan?: boolean | undefined;
}
export interface LocateOptions {
  watch?: boolean | undefined;
  setView?: boolean | undefined;
  maxZoom?: number | undefined;
  timeout?: number | undefined;
  maximumAge?: number | undefined;
  enableHighAccuracy?: boolean | undefined;
}
export interface MapOptions {
  crs: CRS;
  layers: Collection<Layer>;
  center: LatLng | [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  maxBounds: undefined;
  zoomAnimation: boolean;
  zoomAnimationThreshold: number;
  fadeAnimation: boolean;
  markerZoomAnimation: boolean;
  zoomSnap: number;
  zoomDelta: number;
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
 * const map = L.map('map', {
 * 	center: [51.505, -0.09],
 * 	zoom: 13
 * });
 * ```
 *
 */
export class DMap extends Accessor {
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
  private _handlers: any[];
  private _layers = new Collection<Layer>();
  private _sizeChanged: boolean;
  private _zoom: any;
  private _zoomAnimated: any;
  options: any;
  private _loaded: boolean;
  private _panAnim: any;
  private _enforcingBounds: boolean;
  private _lastCenter: any;
  private _locateOptions: any;
  private _locationWatchId: number;
  private _container: any;
  private _containerId: any;
  private _clearControlPos: any;
  private _resizeRequest: any;
  private _panes = new Map<string, HTMLElement>();
  private _renderer: any;
  private _layersMinZoom: number;
  private _layersMaxZoom: any;
  private _size: any;
  private _pixelOrigin: any;
  private _fadeAnimated: boolean;
  private _initControlPos: any;
  private _targets = new Map<string, any>();
  boxZoom: any;
  private _animatingZoom: boolean;
  private _animateToCenter: any;
  private _animateToZoom: any;
  private _tempFireZoomEvent: any;
  private _proxy: any;
  private _mapPane: any;
  constructor(container: HTMLDivElement, options: MapOptions) {
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
    this._sizeChanged = true;

    this._initContainer(container);
    this._initLayout();

    // hack for https://github.com/Leaflet/Leaflet/issues/1980
    this._onResize = this._onResize.bind(this);

    this._initEvents();

    if (options.maxBounds) {
      this.setMaxBounds(options.maxBounds);
    }

    if (options.zoom !== undefined) {
      this._zoom = this._limitZoom(options.zoom);
    }

    if (options.center && options.zoom !== undefined) {
      this.setView(this.center, options.zoom);
    }

    // this.callInitHooks();

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

    this.addMany(this.options.layers);
  }

  add(layer: Layer) {
    //
  }

  addMany(layers: Layer[]) {
    //
  }
  // @section Methods for modifying map state

  // @method setView(center: LatLng, zoom: Number, options?: Zoom/pan options): this
  // Sets the view of the map (geographical center and zoom) with the given
  // animation options.
  setView(center: LatLng, zoom?: number, options?: ZoomPanOptions) {
    zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);
    center = this._limitCenter(this.center, zoom, this.options.maxBounds);
    options = options || {};

    this._stop();

    if (this._loaded) {
      // try animating pan or zoom
      const moved =
        this._zoom !== zoom
          ? this._tryAnimatedZoom &&
            this._tryAnimatedZoom(center, zoom, options)
          : this._tryAnimatedPan(center, options);

      if (moved) {
        // prevent resize handler call, the view will refresh after animation anyway
        clearTimeout(this._sizeTimer);
        return this;
      }
    }

    // animation didn't start, just reset the map view
    this._resetView(center, zoom, options?.noMoveStart);

    return this;
  }
  private _sizeTimer: number;
  // @method setZoom(zoom: Number, options?: Zoom/pan options): this
  // Sets the zoom of the map.
  setZoom(zoom: number, options?: ZoomOptions) {
    if (!this._loaded) {
      this._zoom = zoom;
      return this;
    }
    return this.setView(this.getCenter(), zoom, options);
  }

  // @method zoomIn(delta?: Number, options?: Zoom options): this
  // Increases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
  zoomIn(delta, options) {
    delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
    return this.setZoom(this._zoom + delta, options);
  }

  // @method zoomOut(delta?: Number, options?: Zoom options): this
  // Decreases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
  zoomOut(delta, options) {
    delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
    return this.setZoom(this._zoom - delta, options);
  }

  // @method setZoomAround(latlng: LatLng, zoom: Number, options: Zoom options): this
  // Zooms the map while keeping a specified geographical point on the map
  // stationary (e.g. used internally for scroll zoom and double-click zoom).
  // @alternative
  // @method setZoomAround(offset: Point, zoom: Number, options: Zoom options): this
  // Zooms the map while keeping a specified pixel on the map (relative to the top-left corner) stationary.
  setZoomAround(latlng: LatLng, zoom: number, options) {
    const scale = this.getZoomScale(zoom),
      viewHalf = this.getSize().divideBy(2),
      containerPoint =
        latlng instanceof Point ? latlng : this.latLngToContainerPoint(latlng),
      centerOffset = containerPoint
        .subtract(viewHalf)
        .multiplyBy(1 - 1 / scale),
      newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

    return this.setView(newCenter, zoom, options);
  }

  private _getBoundsCenterZoom(bounds: LatLngBounds, options) {
    options = options || {};
    const paddingTL = new Point(
        options.paddingTopLeft || options.padding || [0, 0]
      ),
      paddingBR = new Point(
        options.paddingBottomRight || options.padding || [0, 0]
      );
    let zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));

    zoom =
      typeof options.maxZoom === 'number'
        ? Math.min(options.maxZoom, zoom)
        : zoom;

    if (zoom === Infinity) {
      return {
        center: bounds.getCenter(),
        zoom: zoom,
      };
    }

    const paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),
      swPoint = this.project(bounds.getSouthWest(), zoom),
      nePoint = this.project(bounds.getNorthEast(), zoom),
      center = this.unproject(
        swPoint.add(nePoint).divideBy(2).add(paddingOffset),
        zoom
      );

    return {
      center: center,
      zoom: zoom,
    };
  }

  // @method fitBounds(bounds: LatLngBounds, options?: fitBounds options): this
  // Sets a map view that contains the given geographical bounds with the
  // maximum zoom level possible.
  fitBounds(bounds: LatLngBounds, options: FitBoundOptions) {
    if (!bounds.isValid()) {
      throw new Error('Bounds are not valid.');
    }

    const target = this._getBoundsCenterZoom(bounds, options);
    return this.setView(target.center, target.zoom, options);
  }

  // @method fitWorld(options?: fitBounds options): this
  // Sets a map view that mostly contains the whole world with the maximum
  // zoom level possible.
  fitWorld(options?: FitBoundOptions) {
    return this.fitBounds(
      new LatLngBounds({
        southWest: new LatLng({
          lat: -90,
          lng: -180,
        }),
        northEast: new LatLng({
          lat: 90,
          lng: 180,
        }),
      }),
      options
    );
  }

  // @method panTo(latlng: LatLng, options?: Pan options): this
  // Pans the map to a given center.
  panTo(center: LatLng, options?: PanOptions) {
    // (LatLng)
    return this.setView(center, this._zoom, options);
  }

  // @method panBy(offset: Point, options?: Pan options): this
  // Pans the map by a given number of pixels (animated).
  panBy(offset: Point, options?: PanOptions) {
    options = options || {};

    if (!offset.x && !offset.y) {
      return this.fire('moveend');
    }
    // If we pan too far, Chrome gets issues with tiles
    // and makes them disappear or appear in the wrong place (slightly offset) #2602
    if (options.animate !== true && !this.getSize().contains(offset)) {
      this._resetView(
        this.unproject(this.project(this.getCenter()).add(new Point(offset))),
        this.getZoom()
      );
      return this;
    }

    if (!this._panAnim) {
      this._panAnim = new PosAnimation();

      this._panAnim.on(
        {
          step: this._onPanTransitionStep,
          end: this._onPanTransitionEnd,
        },
        this
      );
    }

    // don't fire movestart if animating inertia
    if (!options.noMoveStart) {
      this.fire('movestart');
    }

    // animate pan unless animate: false specified
    if (options.animate !== false) {
      DomUtil.addClass(this._mapPane, 'leaflet-pan-anim');

      const newPos = this._getMapPanePos().subtract(offset).round();
      this._panAnim.run(
        this._mapPane,
        newPos,
        options.duration || 0.25,
        options.easeLinearity
      );
    } else {
      this._rawPanBy(offset);
      this.fire('move').fire('moveend');
    }

    return this;
  }

  // @method flyTo(latlng: LatLng, zoom?: Number, options?: Zoom/pan options): this
  // Sets the view of the map (geographical center and zoom) performing a smooth
  // pan-zoom animation.
  flyTo(targetCenter: LatLng, targetZoom?: number, options?: ZoomPanOptions) {
    options = options || {};
    if (options.animate === false || !Browser.any3d) {
      return this.setView(targetCenter, targetZoom, options);
    }

    this._stop();

    const from = this.project(this.getCenter()),
      to = this.project(targetCenter),
      size = this.getSize(),
      startZoom = this._zoom;

    targetZoom = targetZoom === undefined ? startZoom : targetZoom;

    const w0 = Math.max(size.x, size.y),
      w1 = w0 * this.getZoomScale(startZoom, targetZoom),
      u1 = to.distanceTo(from) || 1,
      rho = 1.42,
      rho2 = rho * rho;

    function r(i) {
      const s1 = i ? -1 : 1,
        s2 = i ? w1 : w0,
        t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1,
        b1 = 2 * s2 * rho2 * u1,
        b = t1 / b1,
        sq = Math.sqrt(b * b + 1) - b;

      // workaround for floating point precision bug when sq = 0, log = -Infinite,
      // thus triggering an infinite loop in flyTo
      const log = sq < 0.000000001 ? -18 : Math.log(sq);

      return log;
    }

    function sinh(n) {
      return (Math.exp(n) - Math.exp(-n)) / 2;
    }
    function cosh(n) {
      return (Math.exp(n) + Math.exp(-n)) / 2;
    }
    function tanh(n) {
      return sinh(n) / cosh(n);
    }

    const r0 = r(0);

    function w(s) {
      return w0 * (cosh(r0) / cosh(r0 + rho * s));
    }
    function u(s) {
      return (w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0))) / rho2;
    }

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 1.5);
    }

    const start = Date.now(),
      S = (r(1) - r0) / rho,
      duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8;

    function frame() {
      const t = (Date.now() - start) / duration,
        s = easeOut(t) * S;

      if (t <= 1) {
        this._flyToFrame = CoreUtil.requestAnimFrame(frame, this);

        this._move(
          this.unproject(
            from.add(to.subtract(from).multiplyBy(u(s) / u1)),
            startZoom
          ),
          this.getScaleZoom(w0 / w(s), startZoom),
          { flyTo: true }
        );
      } else {
        this._move(targetCenter, targetZoom)._moveEnd(true);
      }
    }

    this._moveStart(true, options.noMoveStart);

    frame.call(this);
    return this;
  }

  // @method flyToBounds(bounds: LatLngBounds, options?: fitBounds options): this
  // Sets the view of the map with a smooth animation like [`flyTo`](#map-flyto),
  // but takes a bounds parameter like [`fitBounds`](#map-fitbounds).
  flyToBounds(bounds: LatLngBounds, options: FitBoundOptions) {
    const target = this._getBoundsCenterZoom(bounds, options);
    return this.flyTo(target.center, target.zoom, options);
  }

  // @method setMaxBounds(bounds: LatLngBounds): this
  // Restricts the map view to the given bounds (see the [maxBounds](#map-maxbounds) option).
  setMaxBounds(bounds: LatLngBounds) {
    if (this.listens('moveend', this._panInsideMaxBounds)) {
      this.off('moveend', this._panInsideMaxBounds);
    }

    if (!bounds.isValid()) {
      this.options.maxBounds = null;
      return this;
    }

    this.options.maxBounds = bounds;

    if (this._loaded) {
      this._panInsideMaxBounds();
    }

    return this.on('moveend', this._panInsideMaxBounds);
  }

  // @method setMinZoom(zoom: Number): this
  // Sets the lower limit for the available zoom levels (see the [minZoom](#map-minzoom) option).
  setMinZoom(zoom) {
    const oldZoom = this.options.minZoom;
    this.options.minZoom = zoom;

    if (this._loaded && oldZoom !== zoom) {
      this.fire('zoomlevelschange');

      if (this.getZoom() < this.options.minZoom) {
        return this.setZoom(zoom);
      }
    }

    return this;
  }

  // @method setMaxZoom(zoom: Number): this
  // Sets the upper limit for the available zoom levels (see the [maxZoom](#map-maxzoom) option).
  setMaxZoom(zoom) {
    const oldZoom = this.options.maxZoom;
    this.options.maxZoom = zoom;

    if (this._loaded && oldZoom !== zoom) {
      this.fire('zoomlevelschange');

      if (this.getZoom() > this.options.maxZoom) {
        return this.setZoom(zoom);
      }
    }

    return this;
  }

  // @method panInsideBounds(bounds: LatLngBounds, options?: Pan options): this
  // Pans the map to the closest view that would lie inside the given bounds (if it's not already), controlling the animation using the options specific, if any.
  panInsideBounds(bounds: LatLngBounds, options?: PanOptions) {
    this._enforcingBounds = true;
    const center = this.getCenter(),
      newCenter = this._limitCenter(center, this._zoom, bounds);

    if (!center.equals(newCenter)) {
      this.panTo(newCenter, options);
    }

    this._enforcingBounds = false;
    return this;
  }

  // @method panInside(latlng: LatLng, options?: padding options): this
  // Pans the map the minimum amount to make the `latlng` visible. Use
  // padding options to fit the display to more restricted bounds.
  // If `latlng` is already within the (optionally padded) display bounds,
  // the map will not be panned.
  panInside(latlng: LatLng, options?: PanInsideOptions) {
    const paddingTL =
        options.paddingTopLeft || options.padding || new Point({ x: 0, y: 0 }),
      paddingBR =
        options.paddingBottomRight ||
        options.padding ||
        new Point({ x: 0, y: 0 }),
      pixelCenter = this.project(this.getCenter()),
      pixelPoint = this.project(latlng),
      pixelBounds = this.getPixelBounds(),
      paddedBounds = new Bounds({
        topLeft: pixelBounds.min.add(paddingTL),
        bottomRight: pixelBounds.max.subtract(paddingBR),
      }),
      paddedSize = paddedBounds.getSize();

    if (!paddedBounds.contains(pixelPoint)) {
      this._enforcingBounds = true;
      const centerOffset = pixelPoint.subtract(paddedBounds.getCenter());
      const offset = paddedBounds
        .extend(pixelPoint)
        .getSize()
        .subtract(paddedSize);
      pixelCenter.x += centerOffset.x < 0 ? -offset.x : offset.x;
      pixelCenter.y += centerOffset.y < 0 ? -offset.y : offset.y;
      this.panTo(this.unproject(pixelCenter), options);
      this._enforcingBounds = false;
    }
    return this;
  }

  // @method invalidateSize(options: Zoom/pan options): this
  // Checks if the map container size changed and updates the map if so —
  // call it after you've changed the map size dynamically, also animating
  // pan by default. If `options.pan` is `false`, panning will not occur.
  // If `options.debounceMoveend` is `true`, it will delay `moveend` event so
  // that it doesn't happen often even if the method is called many
  // times in a row.

  // @alternative
  // @method invalidateSize(animate: Boolean): this
  // Checks if the map container size changed and updates the map if so —
  // call it after you've changed the map size dynamically, also animating
  // pan by default.
  invalidateSize(pOptions?: boolean | InvalidateSizeOptions) {
    if (!this._loaded) {
      return this;
    }

    let options: InvalidateSizeOptions = {
      animate:
        typeof pOptions === 'boolean' && pOptions === true ? true : false,
      pan: true,
    };
    if (typeof pOptions === 'object') {
      options = Object.assign(options, pOptions);
    }

    const oldSize = this.getSize();
    this._sizeChanged = true;
    this._lastCenter = null;

    const newSize = this.getSize(),
      oldCenter = oldSize.divideBy(2).round(),
      newCenter = newSize.divideBy(2).round(),
      offset = oldCenter.subtract(newCenter);

    if (!offset.x && !offset.y) {
      return this;
    }

    if (options.animate && options.pan) {
      this.panBy(offset);
    } else {
      if (options.pan) {
        this._rawPanBy(offset);
      }

      this.fire('move');

      if (options.debounceMoveend) {
        clearTimeout(this._sizeTimer);
        this._sizeTimer = setTimeout(() => {
          this.fire('moveend', this);
        }, 200);
      } else {
        this.fire('moveend');
      }
    }

    // @section Map state change events
    // @event resize: ResizeEvent
    // Fired when the map is resized.
    return this.fire('resize', {
      oldSize: oldSize,
      newSize: newSize,
    });
  }

  // @section Methods for modifying map state
  // @method stop(): this
  // Stops the currently running `panTo` or `flyTo` animation, if any.
  stop() {
    this.setZoom(this._limitZoom(this._zoom));
    if (!this.options.zoomSnap) {
      this.fire('viewreset');
    }
    return this._stop();
  }

  // @section Geolocation methods
  // @method locate(options?: Locate options): this
  // Tries to locate the user using the Geolocation API, firing a [`locationfound`](#map-locationfound)
  // event with location data on success or a [`locationerror`](#map-locationerror) event on failure,
  // and optionally sets the map view to the user's location with respect to
  // detection accuracy (or to the world view if geolocation failed).
  // Note that, if your page doesn't use HTTPS, this method will fail in
  // modern browsers ([Chrome 50 and newer](https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-powerful-features-on-insecure-origins))
  // See `Locate options` for more details.
  locate(options?: LocateOptions) {
    options = this._locateOptions = {
      timeout: 10000,
      watch: false,
      ...options,
    };

    if (!('geolocation' in navigator)) {
      this._handleGeolocationError({
        code: 0,
        message: 'Geolocation not supported.',
      });
      return this;
    }

    const onResponse = this._handleGeolocationResponse.bind(this),
      onError = this._handleGeolocationError.bind(this);

    if (options.watch) {
      this._locationWatchId = navigator.geolocation.watchPosition(
        onResponse,
        onError,
        options
      );
    } else {
      navigator.geolocation.getCurrentPosition(onResponse, onError, options);
    }
    return this;
  }

  // @method stopLocate(): this
  // Stops watching location previously initiated by `map.locate({watch: true})`
  // and aborts resetting the map view if map.locate was called with
  // `{setView: true}`.
  stopLocate() {
    if (navigator.geolocation && navigator.geolocation.clearWatch) {
      navigator.geolocation.clearWatch(this._locationWatchId);
    }
    if (this._locateOptions) {
      this._locateOptions.setView = false;
    }
    return this;
  }

  private _handleGeolocationError(error) {
    if (!this._container._leaflet_id) {
      return;
    }

    const c = error.code,
      message =
        error.message ||
        (c === 1
          ? 'permission denied'
          : c === 2
          ? 'position unavailable'
          : 'timeout');

    if (this._locateOptions.setView && !this._loaded) {
      this.fitWorld();
    }

    // @section Location events
    // @event locationerror: ErrorEvent
    // Fired when geolocation (using the [`locate`](#map-locate) method) failed.
    this.fire('locationerror', {
      code: c,
      message: 'Geolocation error: ' + message + '.',
    });
  }

  private _handleGeolocationResponse(pos) {
    if (!this._container._leaflet_id) {
      return;
    }

    const lat = pos.coords.latitude,
      lng = pos.coords.longitude,
      latlng = new LatLng({ lat, lng }),
      bounds = latlng.toBounds(pos.coords.accuracy * 2),
      options = this._locateOptions;

    if (options.setView) {
      const zoom = this.getBoundsZoom(bounds);
      this.setView(
        latlng,
        options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom
      );
    }

    const data = {
      latlng: latlng,
      bounds: bounds,
      timestamp: pos.timestamp,
    };

    for (const i in pos.coords) {
      if (typeof pos.coords[i] === 'number') {
        data[i] = pos.coords[i];
      }
    }

    // @event locationfound: LocationEvent
    // Fired when geolocation (using the [`locate`](#map-locate) method)
    // went successfully.
    this.fire('locationfound', data);
  }

  // TODO Appropriate docs section?
  // @section Other Methods
  // @method addHandler(name: String, HandlerClass): this
  // Adds a new `Handler` to the map, given its name and constructor function.
  addHandler(name: string, HandlerClass) {
    if (!HandlerClass) {
      return this;
    }

    const handler = (this[name] = new HandlerClass(this));

    this._handlers.push(handler);

    if (this.options[name]) {
      handler.enable();
    }

    return this;
  }

  // @method remove(): this
  // Destroys the map and clears all related event listeners.
  remove() {
    this._initEvents(true);
    if (this.options.maxBounds) {
      this.off('moveend', this._panInsideMaxBounds);
    }

    if (this._containerId !== this._container._leaflet_id) {
      throw new Error('Map container is being reused by another instance');
    }

    try {
      // throws error in IE6-8
      delete this._container._leaflet_id;
      delete this._containerId;
    } catch (e) {
      this._container._leaflet_id = undefined;
      this._containerId = undefined;
    }

    if (this._locationWatchId !== undefined) {
      this.stopLocate();
    }

    this._stop();

    DomUtil.remove(this._mapPane);

    if (this._clearControlPos) {
      this._clearControlPos();
    }
    if (this._resizeRequest) {
      CoreUtil.cancelAnimFrame(this._resizeRequest);
      this._resizeRequest = null;
    }

    this._clearHandlers();

    if (this._loaded) {
      // @section Map state change events
      // @event unload: Event
      // Fired when the map is destroyed with [remove](#map-remove) method.
      this.fire('unload');
    }

    let i;
    for (i in this._layers) {
      this._layers[i].remove();
    }
    for (i of this._panes.keys()) {
      DomUtil.remove(this._panes[i]);
    }

    this._layers = [];
    this._panes.clear();
    delete this._mapPane;
    delete this._renderer;

    return this;
  }

  // @section Other Methods
  // @method createPane(name: String, container?: HTMLElement): HTMLElement
  // Creates a new [map pane](#map-pane) with the given name if it doesn't exist already,
  // then returns it. The pane is created as a child of `container`, or
  // as a child of the main map pane if not set.
  createPane(name: string, container?: HTMLElement) {
    const className =
        'leaflet-pane' +
        (name ? ' leaflet-' + name.replace('Pane', '') + '-pane' : ''),
      pane = DomUtil.create('div', className, container || this._mapPane);

    if (name) {
      this._panes.set(name, pane);
    }
    return pane;
  }

  // @section Methods for Getting Map State

  // @method getCenter(): LatLng
  // Returns the geographical center of the map view
  getCenter() {
    this._checkIfLoaded();

    if (this._lastCenter && !this._moved()) {
      return this._lastCenter.clone();
    }
    return this.layerPointToLatLng(this._getCenterLayerPoint());
  }

  // @method getZoom(): Number
  // Returns the current zoom level of the map view
  getZoom() {
    return this._zoom;
  }

  // @method getBounds(): LatLngBounds
  // Returns the geographical bounds visible in the current map view
  getBounds() {
    const bounds = this.getPixelBounds(),
      sw = this.unproject(bounds.getBottomLeft()),
      ne = this.unproject(bounds.getTopRight());

    return new LatLngBounds({ southWest: sw, northEast: ne });
  }

  // @method getMinZoom(): Number
  // Returns the minimum zoom level of the map (if set in the `minZoom` option of the map or of any layers), or `0` by default.
  getMinZoom() {
    return this.options.minZoom === undefined
      ? this._layersMinZoom || 0
      : this.options.minZoom;
  }

  // @method getMaxZoom(): Number
  // Returns the maximum zoom level of the map (if set in the `maxZoom` option of the map or of any layers).
  getMaxZoom() {
    return this.options.maxZoom === undefined
      ? this._layersMaxZoom === undefined
        ? Infinity
        : this._layersMaxZoom
      : this.options.maxZoom;
  }

  // @method getBoundsZoom(bounds: LatLngBounds, inside?: Boolean, padding?: Point): Number
  // Returns the maximum zoom level on which the given bounds fit to the map
  // view in its entirety. If `inside` (optional) is set to `true`, the method
  // instead returns the minimum zoom level on which the map view fits into
  // the given bounds in its entirety.
  getBoundsZoom(
    bounds: LatLngBounds,
    inside?: boolean,
    padding?: Point
  ): number {
    padding = padding || new Point();

    let zoom = this.getZoom() || 0;
    const min = this.getMinZoom(),
      max = this.getMaxZoom(),
      nw = bounds.getNorthWest(),
      se = bounds.getSouthEast(),
      size = this.getSize().subtract(padding),
      boundsSize = new Bounds({
        topLeft: this.project(se, zoom),
        bottomRight: this.project(nw, zoom),
      }).getSize(),
      snap = Browser.any3d ? this.options.zoomSnap : 1,
      scalex = size.x / boundsSize.x,
      scaley = size.y / boundsSize.y,
      scale = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);

    zoom = this.getScaleZoom(scale, zoom);

    if (snap) {
      zoom = Math.round(zoom / (snap / 100)) * (snap / 100); // don't jump if within 1% of a snap level
      zoom = inside
        ? Math.ceil(zoom / snap) * snap
        : Math.floor(zoom / snap) * snap;
    }

    return Math.max(min, Math.min(max, zoom));
  }

  // @method getSize(): Point
  // Returns the current size of the map container (in pixels).
  getSize() {
    if (!this._size || this._sizeChanged) {
      this._size = new Point({
        x: this._container.clientWidth || 0,
        y: this._container.clientHeight || 0,
      });

      this._sizeChanged = false;
    }
    return this._size.clone();
  }

  // @method getPixelBounds(): Bounds
  // Returns the bounds of the current map view in projected pixel
  // coordinates (sometimes useful in layer and overlay implementations).
  getPixelBounds(center?: LatLng, zoom?: number) {
    const topLeftPoint = this._getTopLeftPoint(center, zoom);
    return new Bounds({
      topLeft: topLeftPoint,
      bottomRight: topLeftPoint.add(this.getSize()),
    });
  }

  // TODO: Check semantics - isn't the pixel origin the 0,0 coord relative to
  // the map pane? "left point of the map layer" can be confusing, specially
  // since there can be negative offsets.
  // @method getPixelOrigin(): Point
  // Returns the projected pixel coordinates of the top left point of
  // the map layer (useful in custom layer and overlay implementations).
  getPixelOrigin() {
    this._checkIfLoaded();
    return this._pixelOrigin;
  }

  // @method getPixelWorldBounds(zoom?: Number): Bounds
  // Returns the world's bounds in pixel coordinates for zoom level `zoom`.
  // If `zoom` is omitted, the map's current zoom level is used.
  getPixelWorldBounds(zoom) {
    return this.crs.getProjectedBounds(
      zoom === undefined ? this.getZoom() : zoom
    );
  }

  // @section Other Methods

  // @method getPane(pane: String|HTMLElement): HTMLElement
  // Returns a [map pane](#map-pane), given its name or its HTML element (its identity).
  getPane(pane) {
    return typeof pane === 'string' ? this._panes.get(pane) : pane;
  }

  // @method getPanes(): Object
  // Returns a plain object containing the names of all [panes](#map-pane) as keys and
  // the panes as values.
  getPanes() {
    return this._panes;
  }

  // @method getContainer: HTMLElement
  // Returns the HTML element that contains the map.
  getContainer() {
    return this._container;
  }

  // @section Conversion Methods

  // @method getZoomScale(toZoom: Number, fromZoom: Number): Number
  // Returns the scale factor to be applied to a map transition from zoom level
  // `fromZoom` to `toZoom`. Used internally to help with zoom animations.
  getZoomScale(toZoom: number, fromZoom?: number) {
    // TODO replace with universal implementation after refactoring projections
    const crs = this.crs;
    fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
    return crs.scale(toZoom) / crs.scale(fromZoom);
  }

  // @method getScaleZoom(scale: Number, fromZoom: Number): Number
  // Returns the zoom level that the map would end up at, if it is at `fromZoom`
  // level and everything is scaled by a factor of `scale`. Inverse of
  // [`getZoomScale`](#map-getZoomScale).
  getScaleZoom(scale, fromZoom) {
    const crs = this.crs;
    fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
    const zoom = crs.zoom(scale * crs.scale(fromZoom));
    return isNaN(zoom) ? Infinity : zoom;
  }

  // @method project(latlng: LatLng, zoom: Number): Point
  // Projects a geographical coordinate `LatLng` according to the projection
  // of the map's CRS, then scales it according to `zoom` and the CRS's
  // `Transformation`. The result is pixel coordinate relative to
  // the CRS origin.
  project(latlng: LatLng, zoom?: number) {
    zoom = zoom === undefined ? this._zoom : zoom;
    return this.crs.latLngToPoint(latlng, zoom);
  }

  // @method unproject(point: Point, zoom: Number): LatLng
  // Inverse of [`project`](#map-project).
  unproject(point: Point, zoom?: number) {
    zoom = zoom === undefined ? this._zoom : zoom;
    return this.crs.pointToLatLng(point, zoom);
  }

  // @method layerPointToLatLng(point: Point): LatLng
  // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
  // returns the corresponding geographical coordinate (for the current zoom level).
  layerPointToLatLng(point: Point) {
    const projectedPoint = point.add(this.getPixelOrigin());
    return this.unproject(projectedPoint);
  }

  // @method latLngToLayerPoint(latlng: LatLng): Point
  // Given a geographical coordinate, returns the corresponding pixel coordinate
  // relative to the [origin pixel](#map-getpixelorigin).
  latLngToLayerPoint(latlng: LatLng) {
    const projectedPoint = this.project(latlng).round();
    return projectedPoint.subtract(this.getPixelOrigin());
  }

  // @method wrapLatLng(latlng: LatLng): LatLng
  // Returns a `LatLng` where `lat` and `lng` has been wrapped according to the
  // map's CRS's `wrapLat` and `wrapLng` properties, if they are outside the
  // CRS's bounds.
  // By default this means longitude is wrapped around the dateline so its
  // value is between -180 and +180 degrees.
  wrapLatLng(latlng: LatLng) {
    return this.crs.wrapLatLng(latlng);
  }

  // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
  // Returns a `LatLngBounds` with the same size as the given one, ensuring that
  // its center is within the CRS's bounds.
  // By default this means the center longitude is wrapped around the dateline so its
  // value is between -180 and +180 degrees, and the majority of the bounds
  // overlaps the CRS's bounds.
  wrapLatLngBounds(bounds: LatLngBounds) {
    return this.crs.wrapLatLngBounds(bounds);
  }

  // @method distance(latlng1: LatLng, latlng2: LatLng): Number
  // Returns the distance between two geographical coordinates according to
  // the map's CRS. By default this measures distance in meters.
  distance(latlng1: LatLng, latlng2: LatLng) {
    return this.crs.distance(latlng1, latlng2);
  }

  // @method containerPointToLayerPoint(point: Point): Point
  // Given a pixel coordinate relative to the map container, returns the corresponding
  // pixel coordinate relative to the [origin pixel](#map-getpixelorigin).
  containerPointToLayerPoint(point: Point) {
    // (Point)
    return point.subtract(this._getMapPanePos());
  }

  // @method layerPointToContainerPoint(point: Point): Point
  // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
  // returns the corresponding pixel coordinate relative to the map container.
  layerPointToContainerPoint(point: Point) {
    // (Point)
    return point.add(this._getMapPanePos());
  }

  // @method containerPointToLatLng(point: Point): LatLng
  // Given a pixel coordinate relative to the map container, returns
  // the corresponding geographical coordinate (for the current zoom level).
  containerPointToLatLng(point: Point) {
    const layerPoint = this.containerPointToLayerPoint(point);
    return this.layerPointToLatLng(layerPoint);
  }

  // @method latLngToContainerPoint(latlng: LatLng): Point
  // Given a geographical coordinate, returns the corresponding pixel coordinate
  // relative to the map container.
  latLngToContainerPoint(latlng: LatLng) {
    return this.layerPointToContainerPoint(this.latLngToLayerPoint(latlng));
  }

  // @method mouseEventToContainerPoint(ev: MouseEvent): Point
  // Given a MouseEvent object, returns the pixel coordinate relative to the
  // map container where the event took place.
  mouseEventToContainerPoint(e: MouseEvent) {
    return DomEvent.getMousePosition(e, this._container);
  }

  // @method mouseEventToLayerPoint(ev: MouseEvent): Point
  // Given a MouseEvent object, returns the pixel coordinate relative to
  // the [origin pixel](#map-getpixelorigin) where the event took place.
  mouseEventToLayerPoint(e: MouseEvent) {
    return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
  }

  // @method mouseEventToLatLng(ev: MouseEvent): LatLng
  // Given a MouseEvent object, returns geographical coordinate where the
  // event took place.
  mouseEventToLatLng(e: MouseEvent) {
    // (MouseEvent)
    return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
  }

  // map initialization methods

  private _initContainer(id: HTMLDivElement) {
    const container = (this._container = DomUtil.get(id));

    if (!container) {
      throw new Error('Map container not found.');
    } else if (container._leaflet_id) {
      throw new Error('Map container is already initialized.');
    }

    DomEvent.on(container, 'scroll', this._onScroll, this);
    this._containerId = CoreUtil.stamp(container);
  }

  private _initLayout() {
    const container = this._container;

    this._fadeAnimated = this.options.fadeAnimation && Browser.any3d;

    DomUtil.addClass(
      container,
      'leaflet-container' +
        (Browser.touch ? ' leaflet-touch' : '') +
        (Browser.retina ? ' leaflet-retina' : '') +
        (Browser.ielt9 ? ' leaflet-oldie' : '') +
        (Browser.safari ? ' leaflet-safari' : '') +
        (this._fadeAnimated ? ' leaflet-fade-anim' : '')
    );

    const position = DomUtil.getStyle(container, 'position');

    if (
      position !== 'absolute' &&
      position !== 'relative' &&
      position !== 'fixed'
    ) {
      container.style.position = 'relative';
    }

    this._initPanes();

    if (this._initControlPos) {
      this._initControlPos();
    }
  }

  private _initPanes() {
    // @section
    //
    // Panes are DOM elements used to control the ordering of layers on the map. You
    // can access panes with [`map.getPane`](#map-getpane) or
    // [`map.getPanes`](#map-getpanes) methods. New panes can be created with the
    // [`map.createPane`](#map-createpane) method.
    //
    // Every map has the following default panes that differ only in zIndex.
    //
    // @pane mapPane: HTMLElement = 'auto'
    // Pane that contains all other map panes

    this._mapPane = this.createPane('mapPane', this._container);
    DomUtil.setPosition(this._mapPane, new Point());

    // @pane tilePane: HTMLElement = 200
    // Pane for `GridLayer`s and `TileLayer`s
    this.createPane('tilePane');
    // @pane overlayPane: HTMLElement = 400
    // Pane for vectors (`Path`s, like `Polyline`s and `Polygon`s), `ImageOverlay`s and `VideoOverlay`s
    this.createPane('overlayPane');
    // @pane shadowPane: HTMLElement = 500
    // Pane for overlay shadows (e.g. `Marker` shadows)
    this.createPane('shadowPane');
    // @pane markerPane: HTMLElement = 600
    // Pane for `Icon`s of `Marker`s
    this.createPane('markerPane');
    // @pane tooltipPane: HTMLElement = 650
    // Pane for `Tooltip`s.
    this.createPane('tooltipPane');
    // @pane popupPane: HTMLElement = 700
    // Pane for `Popup`s.
    this.createPane('popupPane');

    if (!this.options.markerZoomAnimation) {
      DomUtil.addClass(this._panes.get('markerPane'), 'leaflet-zoom-hide');
      DomUtil.addClass(this._panes.get('shadowPane'), 'leaflet-zoom-hide');
    }
  }

  // private methods that modify map state

  // @section Map state change events
  private _resetView(center: LatLng, zoom: number, noMoveStart?: boolean) {
    DomUtil.setPosition(this._mapPane, new Point({ x: 0, y: 0 }));

    const loading = !this._loaded;
    this._loaded = true;
    zoom = this._limitZoom(zoom);

    this.fire('viewprereset');

    const zoomChanged = this._zoom !== zoom;
    this._moveStart(zoomChanged, noMoveStart)
      ._move(center, zoom)
      ._moveEnd(zoomChanged);

    // @event viewreset: Event
    // Fired when the map needs to redraw its content (this usually happens
    // on map zoom or load). Very useful for creating custom overlays.
    this.fire('viewreset');

    // @event load: Event
    // Fired when the map is initialized (when its center and zoom are set
    // for the first time).
    if (loading) {
      this.fire('load');
    }
  }

  private _moveStart(zoomChanged, noMoveStart) {
    // @event zoomstart: Event
    // Fired when the map zoom is about to change (e.g. before zoom animation).
    // @event movestart: Event
    // Fired when the view of the map starts changing (e.g. user starts dragging the map).
    if (zoomChanged) {
      this.fire('zoomstart');
    }
    if (!noMoveStart) {
      this.fire('movestart');
    }
    return this;
  }

  private _move(
    center: LatLng,
    zoom: number,
    data?: any,
    supressEvent?: boolean
  ) {
    if (zoom === undefined) {
      zoom = this._zoom;
    }
    const zoomChanged = this._zoom !== zoom;

    this._zoom = zoom;
    this._lastCenter = center;
    this._pixelOrigin = this._getNewPixelOrigin(center);

    if (!supressEvent) {
      // @event zoom: Event
      // Fired repeatedly during any change in zoom level,
      // including zoom and fly animations.
      if (zoomChanged || (data && data.pinch)) {
        // Always fire 'zoom' if pinching because #3530
        this.fire('zoom', data);
      }

      // @event move: Event
      // Fired repeatedly during any movement of the map,
      // including pan and fly animations.
      this.fire('move', data);
    } else if (data && data.pinch) {
      // Always fire 'zoom' if pinching because #3530
      this.fire('zoom', data);
    }
    return this;
  }

  private _moveEnd(zoomChanged) {
    // @event zoomend: Event
    // Fired when the map zoom changed, after any animations.
    if (zoomChanged) {
      this.fire('zoomend');
    }

    // @event moveend: Event
    // Fired when the center of the map stops changing
    // (e.g. user stopped dragging the map or after non-centered zoom).
    return this.fire('moveend');
  }

  private _stop() {
    CoreUtil.cancelAnimFrame(this._flyToFrame);
    if (this._panAnim) {
      this._panAnim.stop();
    }
    return this;
  }
  private _flyToFrame(_flyToFrame: any) {
    throw new Error('Method not implemented.');
  }

  private _rawPanBy(offset) {
    DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
  }

  private _getZoomSpan() {
    return this.getMaxZoom() - this.getMinZoom();
  }

  private _panInsideMaxBounds() {
    if (!this._enforcingBounds) {
      this.panInsideBounds(this.options.maxBounds);
    }
  }

  private _checkIfLoaded() {
    if (!this._loaded) {
      throw new Error('Set map center and zoom first.');
    }
  }

  // DOM event handling

  // @section Interaction events
  private _initEvents(remove?: boolean) {
    this._targets.clear();
    this._targets.set(CoreUtil.stamp(this._container), this);

    const onOff = remove ? DomEvent.off : DomEvent.on;

    // @event click: MouseEvent
    // Fired when the user clicks (or taps) the map.
    // @event dblclick: MouseEvent
    // Fired when the user double-clicks (or double-taps) the map.
    // @event mousedown: MouseEvent
    // Fired when the user pushes the mouse button on the map.
    // @event mouseup: MouseEvent
    // Fired when the user releases the mouse button on the map.
    // @event mouseover: MouseEvent
    // Fired when the mouse enters the map.
    // @event mouseout: MouseEvent
    // Fired when the mouse leaves the map.
    // @event mousemove: MouseEvent
    // Fired while the mouse moves over the map.
    // @event contextmenu: MouseEvent
    // Fired when the user pushes the right mouse button on the map, prevents
    // default browser context menu from showing if there are listeners on
    // this event. Also fired on mobile when the user holds a single touch
    // for a second (also called long press).
    // @event keypress: KeyboardEvent
    // Fired when the user presses a key from the keyboard that produces a character value while the map is focused.
    // @event keydown: KeyboardEvent
    // Fired when the user presses a key from the keyboard while the map is focused. Unlike the `keypress` event,
    // the `keydown` event is fired for keys that produce a character value and for keys
    // that do not produce a character value.
    // @event keyup: KeyboardEvent
    // Fired when the user releases a key from the keyboard while the map is focused.
    onOff(
      this._container,
      'click dblclick mousedown mouseup ' +
        'mouseover mouseout mousemove contextmenu keypress keydown keyup',
      this._handleDOMEvent,
      this
    );

    if (this.options.trackResize) {
      onOff(window, 'resize', this._onResize, this);
    }

    if (Browser.any3d && this.options.transform3DLimit) {
      (remove ? this.off : this.on).call(this, 'moveend', this._onMoveEnd);
    }
  }

  private _onResize() {
    CoreUtil.cancelAnimFrame(this._resizeRequest);
    this._resizeRequest = CoreUtil.requestAnimFrame(function () {
      this.invalidateSize({ debounceMoveend: true });
    }, this);
  }

  private _onScroll() {
    this._container.scrollTop = 0;
    this._container.scrollLeft = 0;
  }

  private _onMoveEnd() {
    const pos = this._getMapPanePos();
    if (
      Math.max(Math.abs(pos.x), Math.abs(pos.y)) >=
      this.options.transform3DLimit
    ) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1203873 but Webkit also have
      // a pixel offset on very high values, see: https://jsfiddle.net/dg6r5hhb/
      this._resetView(this.getCenter(), this.getZoom());
    }
  }

  private _findEventTargets(e, type) {
    const isHover = type === 'mouseout' || type === 'mouseover';

    let targets = [],
      target,
      dragging = false,
      src = e.target || e.srcElement;

    while (src) {
      target = this._targets.get(CoreUtil.stamp(src));
      if (
        target &&
        (type === 'click' || type === 'preclick') &&
        this._draggableMoved(target)
      ) {
        // Prevent firing click after you just dragged an object.
        dragging = true;
        break;
      }
      if (target && target.listens(type, true)) {
        if (isHover && !DomEvent.isExternalTarget(src, e)) {
          break;
        }
        targets.push(target);
        if (isHover) {
          break;
        }
      }
      if (src === this._container) {
        break;
      }
      src = src.parentNode;
    }
    if (!targets.length && !dragging && !isHover && this.listens(type, true)) {
      targets = [this];
    }
    return targets;
  }

  private _isClickDisabled(el) {
    while (el && el !== this._container) {
      if (el['_leaflet_disable_click']) {
        return true;
      }
      el = el.parentNode;
    }
  }

  private _handleDOMEvent(e) {
    const el = e.target || e.srcElement;
    if (
      !this._loaded ||
      el['_leaflet_disable_events'] ||
      (e.type === 'click' && this._isClickDisabled(el))
    ) {
      return;
    }

    const type = e.type;

    if (type === 'mousedown') {
      // prevents outline when clicking on keyboard-focusable element
      DomUtil.preventOutline(el);
    }

    this._fireDOMEvent(e, type);
  }

  private _mouseEvents = [
    'click',
    'dblclick',
    'mouseover',
    'mouseout',
    'contextmenu',
  ];

  private _fireDOMEvent(e, type: string, canvasTargets?) {
    if (e.type === 'click') {
      // Fire a synthetic 'preclick' event which propagates up (mainly for closing popups).
      // @event preclick: MouseEvent
      // Fired before mouse click on the map (sometimes useful when you
      // want something to happen on click before any existing click
      // handlers start running).
      const synth = { ...e };
      synth.type = 'preclick';
      this._fireDOMEvent(synth, synth.type, canvasTargets);
    }

    // Find the layer the event is propagating from and its parents.
    let targets = this._findEventTargets(e, type);

    if (canvasTargets) {
      const filtered = []; // pick only targets with listeners
      for (let i = 0; i < canvasTargets.length; i++) {
        if (canvasTargets[i].listens(type, true)) {
          filtered.push(canvasTargets[i]);
        }
      }
      targets = filtered.concat(targets);
    }

    if (!targets.length) {
      return;
    }

    if (type === 'contextmenu') {
      DomEvent.preventDefault(e);
    }

    const target = targets[0];
    const data: {
      originalEvent: any;
      containerPoint?: Point;
      layerPoint?: Point;
      latlng?: Point;
    } = {
      originalEvent: e,
    };

    if (e.type !== 'keypress' && e.type !== 'keydown' && e.type !== 'keyup') {
      const isMarker =
        target.getLatLng && (!target._radius || target._radius <= 10);
      data.containerPoint = isMarker
        ? this.latLngToContainerPoint(target.getLatLng())
        : this.mouseEventToContainerPoint(e);
      data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
      data.latlng = isMarker
        ? target.getLatLng()
        : this.layerPointToLatLng(data.layerPoint);
    }

    for (let i = 0; i < targets.length; i++) {
      targets[i].fire(type, data, true);
      if (
        data.originalEvent._stopped ||
        (targets[i].options.bubblingMouseEvents === false &&
          ArrayUtil.indexOf(this._mouseEvents, type) !== -1)
      ) {
        return;
      }
    }
  }

  private _draggableMoved(obj) {
    obj = obj.dragging && obj.dragging.enabled() ? obj : this;
    return (
      (obj.dragging && obj.dragging.moved()) ||
      (this.boxZoom && this.boxZoom.moved())
    );
  }

  private _clearHandlers() {
    for (let i = 0, len = this._handlers.length; i < len; i++) {
      this._handlers[i].disable();
    }
  }

  // @section Other Methods

  // @method whenReady(fn, context?: Object): this
  // Runs the given function `fn` when the map gets initialized with
  // a view (center and zoom) and at least one layer, or immediately
  // if it's already initialized, optionally passing a function context.
  whenReady(callback, context) {
    if (this._loaded) {
      callback.call(context || this, { target: this });
    } else {
      this.on('load', callback, context);
    }
    return this;
  }

  // private methods for getting map state

  private _getMapPanePos() {
    return DomUtil.getPosition(this._mapPane) || new Point();
  }

  private _moved() {
    const pos = this._getMapPanePos();
    return pos && !pos.equals([0, 0]);
  }

  private _getTopLeftPoint(center, zoom) {
    const pixelOrigin =
      center && zoom !== undefined
        ? this._getNewPixelOrigin(center, zoom)
        : this.getPixelOrigin();
    return pixelOrigin.subtract(this._getMapPanePos());
  }

  private _getNewPixelOrigin(center: LatLng, zoom?: number) {
    const viewHalf = this.getSize()._divideBy(2);
    return this.project(center, zoom)
      .subtract(viewHalf)
      .add(this._getMapPanePos())
      .round();
  }

  // layer point of the current center
  private _getCenterLayerPoint() {
    return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
  }

  // offset of the specified place to the current center in pixels
  private _getCenterOffset(latlng) {
    return this.latLngToLayerPoint(latlng).subtract(
      this._getCenterLayerPoint()
    );
  }

  // adjust center for view to get inside bounds
  private _limitCenter(center, zoom, bounds) {
    if (!bounds) {
      return center;
    }

    const centerPoint = this.project(center, zoom),
      viewHalf = this.getSize().divideBy(2),
      viewBounds = new Bounds({
        topLeft: centerPoint.subtract(viewHalf),
        bottomRight: centerPoint.add(viewHalf),
      }),
      offset = this._getBoundsOffset(viewBounds, bounds, zoom);

    // If offset is less than a pixel, ignore.
    // This prevents unstable projections from getting into
    // an infinite loop of tiny offsets.
    if (offset.round().equals(new Point())) {
      return center;
    }

    return this.unproject(centerPoint.add(offset), zoom);
  }

  // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
  private _getBoundsOffset(
    pxBounds: Bounds,
    maxBounds: LatLngBounds,
    zoom?: number
  ) {
    const projectedMaxBounds = new Bounds({
        topLeft: this.project(maxBounds.getNorthEast(), zoom),
        bottomRight: this.project(maxBounds.getSouthWest(), zoom),
      }),
      minOffset = projectedMaxBounds.min.subtract(pxBounds.min),
      maxOffset = projectedMaxBounds.max.subtract(pxBounds.max),
      dx = this._rebound(minOffset.x, -maxOffset.x),
      dy = this._rebound(minOffset.y, -maxOffset.y);

    return new Point({ x: dx, y: dy });
  }

  private _rebound(left, right) {
    return left + right > 0
      ? Math.round(left - right) / 2
      : Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
  }

  private _limitZoom(zoom) {
    const min = this.getMinZoom(),
      max = this.getMaxZoom(),
      snap = Browser.any3d ? this.options.zoomSnap : 1;
    if (snap) {
      zoom = Math.round(zoom / snap) * snap;
    }
    return Math.max(min, Math.min(max, zoom));
  }

  private _onPanTransitionStep() {
    this.fire('move');
  }

  private _onPanTransitionEnd() {
    DomUtil.removeClass(this._mapPane, 'leaflet-pan-anim');
    this.fire('moveend');
  }

  private _tryAnimatedPan(center: LatLng, options) {
    // difference between the new and current centers in pixels
    const offset = this._getCenterOffset(center).trunc();

    // don't animate too far unless animate: true specified in options
    if (
      (options && options.animate) !== true &&
      !this.getSize().contains(offset)
    ) {
      return false;
    }

    this.panBy(offset, options);

    return true;
  }

  private _createAnimProxy() {
    const proxy = (this._proxy = DomUtil.create(
      'div',
      'leaflet-proxy leaflet-zoom-animated'
    ));
    this._panes.get('mapPane').appendChild(proxy);

    this.on(
      'zoomanim',
      function (e) {
        const prop = DomUtil.TRANSFORM,
          transform = this._proxy.style[prop];

        DomUtil.setTransform(
          this._proxy,
          this.project(e.center, e.zoom),
          this.getZoomScale(e.zoom, 1)
        );

        // workaround for case when transform is the same and so transitionend event is not fired
        if (transform === this._proxy.style[prop] && this._animatingZoom) {
          this._onZoomTransitionEnd();
        }
      },
      this
    );

    this.on('load moveend', this._animMoveEnd, this);

    this._on('unload', this._destroyAnimProxy, this);
  }
  private _on(arg0: string, _destroyAnimProxy: () => void, arg2: this) {
    throw new Error('Method not implemented.');
  }

  private _destroyAnimProxy() {
    DomUtil.remove(this._proxy);
    this.off('load moveend', this._animMoveEnd, this);
    delete this._proxy;
  }

  private _animMoveEnd() {
    const c = this.getCenter(),
      z = this.getZoom();
    DomUtil.setTransform(
      this._proxy,
      this.project(c, z),
      this.getZoomScale(z, 1)
    );
  }

  private _catchTransitionEnd(e) {
    if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
      this._onZoomTransitionEnd();
    }
  }

  private _nothingToAnimate() {
    return !this._container.getElementsByClassName('leaflet-zoom-animated')
      .length;
  }

  private _tryAnimatedZoom(center, zoom, options) {
    if (this._animatingZoom) {
      return true;
    }

    options = options || {};

    // don't animate if disabled, not supported or zoom difference is too large
    if (
      !this._zoomAnimated ||
      options.animate === false ||
      this._nothingToAnimate() ||
      Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold
    ) {
      return false;
    }

    // offset is the pixel coords of the zoom origin relative to the current center
    const scale = this.getZoomScale(zoom),
      offset = this._getCenterOffset(center).divideBy(1 - 1 / scale);

    // don't animate if the zoom origin isn't within one screen from the current center, unless forced
    if (options.animate !== true && !this.getSize().contains(offset)) {
      return false;
    }

    CoreUtil.requestAnimFrame(function () {
      this._moveStart(true, false)._animateZoom(center, zoom, true);
    }, this);

    return true;
  }

  private _onZoomTransitionEnd() {
    if (!this._animatingZoom) {
      return;
    }

    if (this._mapPane) {
      DomUtil.removeClass(this._mapPane, 'leaflet-zoom-anim');
    }

    this._animatingZoom = false;

    this._move(this._animateToCenter, this._animateToZoom, undefined, true);

    if (this._tempFireZoomEvent) {
      this.fire('zoom');
    }
    delete this._tempFireZoomEvent;

    this.fire('move');

    this._moveEnd(true);
  }
}
