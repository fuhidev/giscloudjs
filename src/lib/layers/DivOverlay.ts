import { DomUtil } from '../core/dom/DomUtil';
import { Point } from '../geometry/Point';
import { LatLng } from '../geometry/support/LatLng';
import { CoreUtil } from '../utils/core.util';
import { FeatureGroup } from './FeatureGroup';
import { Layer } from './Layer';

export interface DivOverlayOptions {
  interactive?: boolean;
  offset?: [number, number];
  className?: string;
  pane?: string;
}

export abstract class DivOverlay extends Layer {
  interactive = false;
  offset = [0, 0];
  className = '';
  pane = undefined;
  protected _latlng: any;
  protected _container: any;
  protected _containerBottom: number;
  protected _containerLeft: number;
  protected _containerWidth: number;
  protected _content: any;
  protected _contentNode: any;
  protected _source: Layer;
  protected _removeTimeout: number;
  constructor(options: DivOverlayOptions, source?: Layer) {
    super(options);
    if (options.interactive !== undefined) {
      this.interactive = options.interactive;
    }
    if (options.offset !== undefined) {
      this.offset = options.offset;
    }
    if (this.className !== undefined) {
      this.className = options.className;
    }
    if (this.pane !== undefined) {
      this.pane = options.pane;
    }
    this._source = source;
  }

  abstract _animateZoom(e?);

  // @method openOn(map: Map): this
  // Adds the overlay to the map.
  // Alternative to `map.openPopup(popup)`/`.openTooltip(tooltip)`.
  openOn(map) {
    map = arguments.length ? map : this._source._map; // experimental, not the part of public api
    if (!map.hasLayer(this)) {
      map.addLayer(this);
    }
    return this;
  }

  // @method close(): this
  // Closes the overlay.
  // Alternative to `map.closePopup(popup)`/`.closeTooltip(tooltip)`
  // and `layer.closePopup()`/`.closeTooltip()`.
  close() {
    if (this._map) {
      this._map.removeLayer(this);
    }
    return this;
  }

  // @method toggle(layer?: Layer): this
  // Opens or closes the overlay bound to layer depending on its current state.
  // Argument may be omitted only for overlay bound to layer.
  // Alternative to `layer.togglePopup()`/`.toggleTooltip()`.
  toggle(layer) {
    if (this._map) {
      this.close();
    } else {
      if (arguments.length) {
        this._source = layer;
      } else {
        layer = this._source;
      }
      this._prepareOpen();

      // open the overlay on the map
      this.openOn(layer._map);
    }
    return this;
  }

  abstract _initLayout();

  onAdd(map) {
    this._zoomAnimated = map._zoomAnimated;

    if (!this._container) {
      this._initLayout();
    }

    if (map._fadeAnimated) {
      DomUtil.setOpacity(this._container, 0);
    }

    clearTimeout(this._removeTimeout);
    this.getPane().appendChild(this._container);
    this.update();

    if (map._fadeAnimated) {
      DomUtil.setOpacity(this._container, 1);
    }

    this.bringToFront();

    if (this.interactive) {
      DomUtil.addClass(this._container, 'leaflet-interactive');
      this.addInteractiveTarget(this._container);
    }
  }

  onRemove(map) {
    if (map._fadeAnimated) {
      DomUtil.setOpacity(this._container, 0);
      this._removeTimeout = setTimeout(
        CoreUtil.bind(DomUtil.remove, undefined, this._container),
        200
      );
    } else {
      DomUtil.remove(this._container);
    }

    if (this.interactive) {
      DomUtil.removeClass(this._container, 'leaflet-interactive');
      this.removeInteractiveTarget(this._container);
    }
  }

  // @namespace DivOverlay
  // @method getLatLng: LatLng
  // Returns the geographical point of the overlay.
  getLatLng() {
    return this._latlng;
  }

  abstract _adjustPan(e?): any;

  // @method setLatLng(latlng: LatLng): this
  // Sets the geographical point where the overlay will open.
  setLatLng(latlng: LatLng) {
    this._latlng = latlng;
    if (this._map) {
      this._updatePosition();
      this._adjustPan();
    }
    return this;
  }

  // @method getContent: String|HTMLElement
  // Returns the content of the overlay.
  getContent() {
    return this._content;
  }

  // @method setContent(htmlContent: String|HTMLElement|Function): this
  // Sets the HTML content of the overlay. If a function is passed the source layer will be passed to the function.
  // The function should return a `String` or `HTMLElement` to be used in the overlay.
  setContent(content) {
    this._content = content;
    this.update();
    return this;
  }

  // @method getElement: String|HTMLElement
  // Returns the HTML container of the overlay.
  getElement() {
    return this._container;
  }

  abstract _updateLayout();

  // @method update: null
  // Updates the overlay content, layout and position. Useful for updating the overlay after something inside changed, e.g. image loaded.
  update() {
    if (!this._map) {
      return;
    }

    this._container.style.visibility = 'hidden';

    this._updateContent();
    this._updateLayout();
    this._updatePosition();

    this._container.style.visibility = '';

    this._adjustPan();
  }

  getEvents() {
    const events = {
      zoom: this._updatePosition,
      viewreset: this._updatePosition,
      zoomanim: null,
    };

    if (this._zoomAnimated) {
      events.zoomanim = this._animateZoom;
    }
    return events;
  }

  // @method isOpen: Boolean
  // Returns `true` when the overlay is visible on the map.
  isOpen() {
    return !!this._map && this._map.hasLayer(this);
  }

  // @method bringToFront: this
  // Brings this overlay in front of other overlays (in the same map pane).
  bringToFront() {
    if (this._map) {
      DomUtil.toFront(this._container);
    }
    return this;
  }

  // @method bringToBack: this
  // Brings this overlay to the back of other overlays (in the same map pane).
  bringToBack() {
    if (this._map) {
      DomUtil.toBack(this._container);
    }
    return this;
  }

  // prepare bound overlay to open: update latlng pos / content source (for FeatureGroup)
  _prepareOpen(latlng?) {
    let source: any = this._source;
    if (!source._map) {
      return false;
    }

    if (source instanceof FeatureGroup) {
      source = null;
      const layers = (this._source as FeatureGroup)._layers;
      for (const id in layers) {
        if (layers[id]._map) {
          source = layers[id];
          break;
        }
      }
      if (!source) {
        return false;
      } // Unable to get source layer.

      // set overlay source to this layer
      this._source = source;
    }

    if (!latlng) {
      if (source.getCenter) {
        latlng = source.getCenter();
      } else if (source.getLatLng) {
        latlng = source.getLatLng();
      } else if (source.getBounds) {
        latlng = source.getBounds().getCenter();
      } else {
        throw new Error('Unable to get source layer LatLng.');
      }
    }
    this.setLatLng(latlng);

    if (this._map) {
      // update the overlay (content, layout, etc...)
      this.update();
    }

    return true;
  }

  _updateContent() {
    if (!this._content) {
      return;
    }

    const node = this._contentNode;
    const content =
      typeof this._content === 'function'
        ? this._content(this._source || this)
        : this._content;

    if (typeof content === 'string') {
      node.innerHTML = content;
    } else {
      while (node.hasChildNodes()) {
        node.removeChild(node.firstChild);
      }
      node.appendChild(content);
    }

    // @namespace DivOverlay
    // @section DivOverlay events
    // @event contentupdate: Event
    // Fired when the content of the overlay is updated
    this.fire('contentupdate');
  }

  _updatePosition() {
    if (!this._map) {
      return;
    }

    const pos = this._map.latLngToLayerPoint(this._latlng);
    let offset = new Point({ x: this.offset[0], y: this.offset[1] });
    const anchor = this._getAnchor();

    if (this._zoomAnimated) {
      DomUtil.setPosition(this._container, pos.add(anchor));
    } else {
      offset = offset.add(pos).add(new Point({ x: anchor[0], y: anchor[1] }));
    }

    const bottom = (this._containerBottom = -offset.y),
      left = (this._containerLeft =
        -Math.round(this._containerWidth / 2) + offset.x);

    // bottom position the overlay in case the height of the overlay changes (images loading etc)
    this._container.style.bottom = bottom + 'px';
    this._container.style.left = left + 'px';
  }

  _getAnchor() {
    return new Point();
  }
}
