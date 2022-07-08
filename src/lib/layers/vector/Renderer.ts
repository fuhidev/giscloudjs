import Browser from '../../core/Browser';
import { DomUtil } from '../../core/dom/DomUtil';
import { Bounds } from '../../geometry/Bounds';
import { CoreUtil } from '../../utils/core.util';
import { Layer, LayerOptions } from '../Layer';

export interface RendererOptions extends LayerOptions {
  padding?: number | undefined;
  tolerance?: number | undefined;
}

export abstract class Renderer extends Layer {
  padding = 0.1;
  tolerance?: number;
  _layers: any;
  _container: any;
  _bounds: any;
  _center: any;
  _zoom: any;
  constructor(options?: RendererOptions) {
    super(options);
    CoreUtil.stamp(this);
    this._layers = this._layers || {};
  }

  abstract _initContainer();

  onAdd() {
    if (!this._container) {
      this._initContainer(); // defined by renderer implementations

      if (this._zoomAnimated) {
        DomUtil.addClass(this._container, 'leaflet-zoom-animated');
      }
    }

    this.getPane().appendChild(this._container);
    this._update();
    this.on('update', this._updatePaths, this);
    return this;
  }

  onRemove() {
    this.off('update', this._updatePaths, this);
    this._destroyContainer();
  }
  _destroyContainer() {
    throw new Error('Method not implemented.');
  }

  getEvents() {
    const events = {
      viewreset: this._reset,
      zoom: this._onZoom,
      moveend: this._update,
      zoomend: this._onZoomEnd,
      zoomanim: null,
    };
    if (this._zoomAnimated) {
      events.zoomanim = this._onAnimZoom;
    }
    return events;
  }

  _onAnimZoom(ev) {
    this._updateTransform(ev.center, ev.zoom);
  }

  _onZoom() {
    this._updateTransform(this._map.getCenter(), this._map.getZoom());
  }

  _updateTransform(center, zoom) {
    const scale = this._map.getZoomScale(zoom, this._zoom),
      viewHalf = this._map.getSize().multiplyBy(0.5 + this.padding),
      currentCenterPoint = this._map.project(this._center, zoom),
      topLeftOffset = viewHalf
        .multiplyBy(-scale)
        .add(currentCenterPoint)
        .subtract(this._map._getNewPixelOrigin(center, zoom));

    if (Browser.any3d) {
      DomUtil.setTransform(this._container, topLeftOffset, scale);
    } else {
      DomUtil.setPosition(this._container, topLeftOffset);
    }
  }

  _reset() {
    this._update();
    this._updateTransform(this._center, this._zoom);

    for (const id in this._layers) {
      this._layers[id]._reset();
    }
  }

  _onZoomEnd() {
    for (const id in this._layers) {
      this._layers[id]._project();
    }
  }

  _updatePaths() {
    for (const id in this._layers) {
      this._layers[id]._update();
    }
  }

  _update() {
    // Update pixel bounds of renderer container (for positioning/sizing/clipping later)
    // Subclasses are responsible of firing the 'update' event.
    const p = this.padding,
      size = this._map.getSize(),
      min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

    this._bounds = new Bounds({
      topLeft: min,
      bottomRight: min.add(size.multiplyBy(1 + p * 2)).round(),
    });

    this._center = this._map.getCenter();
    this._zoom = this._map.getZoom();
  }

  abstract _initPath(layer: Layer);
  abstract _addPath(layer: Layer);
  abstract _removePath(layer: Layer);
  abstract _updatePath(layer: Layer);
  abstract _bringToFront(layer: Layer);
  abstract _bringToBack(layer: Layer);
  abstract _updateStyle(layer: Layer);
}
