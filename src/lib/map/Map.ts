import { Accessor } from '../core/Accessor';
import { Collection } from '../core/collections/Collection';
import { Layer } from '../layers/layer';
import { SpatialReference } from '../projections/SpatialReference';

export interface MapOptions {
  crs: SpatialReference;
  layers: Collection<Layer>;
  center: [number, number];
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
  renderer: undefined;

  // @section Animation Options
  // @option zoomAnimation: Boolean = true
  // Whether the map zoom animation is enabled. By default it's enabled
  // in all browsers that support CSS3 Transitions except Android.
  zoomAnimation: true;

  // @option zoomAnimationThreshold: Number = 4
  // Won't animate zoom if the zoom difference exceeds this value.
  zoomAnimationThreshold: 4;

  // @option fadeAnimation: Boolean = true
  // Whether the tile fade animation is enabled. By default it's enabled
  // in all browsers that support CSS3 Transitions except Android.
  fadeAnimation: true;

  // @option markerZoomAnimation: Boolean = true
  // Whether markers animate their zoom with the zoom animation, if disabled
  // they will disappear for the length of the animation. By default it's
  // enabled in all browsers that support CSS3 Transitions except Android.
  markerZoomAnimation: true;

  // @option transform3DLimit: Number = 2^23
  // Defines the maximum size of a CSS translation transform. The default
  // value should not be changed unless a web browser positions layers in
  // the wrong place after doing a large `panBy`.
  transform3DLimit: 8388608; // Precision limit of a 32-bit float

  // @section Interaction Options
  // @option zoomSnap: Number = 1
  // Forces the map's zoom level to always be a multiple of this, particularly
  // right after a [`fitBounds()`](#map-fitbounds) or a pinch-zoom.
  // By default, the zoom level snaps to the nearest integer; lower values
  // (e.g. `0.5` or `0.1`) allow for greater granularity. A value of `0`
  // means the zoom level will not be snapped after `fitBounds` or a pinch-zoom.
  zoomSnap: 1;

  // @option zoomDelta: Number = 1
  // Controls how much the map's zoom level will change after a
  // [`zoomIn()`](#map-zoomin), [`zoomOut()`](#map-zoomout), pressing `+`
  // or `-` on the keyboard, or using the [zoom controls](#control-zoom).
  // Values smaller than `1` (e.g. `0.5`) allow for greater granularity.
  zoomDelta: 1;

  // @option trackResize: Boolean = true
  // Whether the map automatically handles browser window resize to update itself.
  trackResize: true;
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
export class Map extends Accessor {}
