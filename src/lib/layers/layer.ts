import { Accessor } from '../core/Accessor';
import { DomEvent } from '../core/dom/domEvent/DomEvent';
import { Popup } from '../popup/Popup';
import { CoreUtil } from '../utils/core.util';
import { Path } from './vector/Path';
export interface LayerOptions {
  pane?: string | undefined;
  attribution?: string | undefined;
}
export abstract class Layer extends Accessor {
  pane = 'overlayerPane';
  attribution = null;
  bubblingMouseEvents = true;
  _map: any;
  _mapToAdd: any;
  options: any;
  _zoomAnimated: any;
  _popup: any;
  private _popupHandlersAdded: boolean;
  constructor(options?: LayerOptions) {
    super(options);
  }

  /* @section
   * Classes extending `L.Layer` will inherit the following methods:
   *
   * @method addTo(map: Map|LayerGroup): this
   * Adds the layer to the given map or layer group.
   */
  addTo(map) {
    map.addLayer(this);
    return this;
  }

  // @method remove: this
  // Removes the layer from the map it is currently active on.
  remove() {
    return this.removeFrom(this._map || this._mapToAdd);
  }

  // @method removeFrom(map: Map): this
  // Removes the layer from the given map
  //
  // @alternative
  // @method removeFrom(group: LayerGroup): this
  // Removes the layer from the given `LayerGroup`
  removeFrom(obj) {
    if (obj) {
      obj.removeLayer(this);
    }
    return this;
  }

  // @method getPane(name? : String): HTMLElement
  // Returns the `HTMLElement` representing the named pane on the map. If `name` is omitted, returns the pane for this layer.
  getPane(name?: string) {
    return this._map.getPane(
      name ? this.options[name] || name : this.options.pane
    );
  }

  addInteractiveTarget(targetEl) {
    this._map._targets[CoreUtil.stamp(targetEl)] = this;
    return this;
  }

  removeInteractiveTarget(targetEl) {
    delete this._map._targets[CoreUtil.stamp(targetEl)];
    return this;
  }

  getEvents() {
    return null;
  }

  // @method getAttribution: String
  // Used by the `attribution control`, returns the [attribution option](#gridlayer-attribution).
  getAttribution() {
    return this.options.attribution;
  }

  _layerAdd(e) {
    const map = e.target;

    // check in case layer gets added and then removed before the map is ready
    if (!map.hasLayer(this)) {
      return;
    }

    this._map = map;
    this._zoomAnimated = map._zoomAnimated;

    const events = this.getEvents();
    if (events) {
      map.on(events, this);
      this.once(
        'remove',
        function () {
          map.off(events, this);
        },
        this
      );
    }
    this.onAdd(map);

    this.fire('add');
    map.fire('layeradd', { layer: this });
  }
  onAdd(map: any) {
    throw new Error('Method not implemented.');
  }

  _initOverlay(OverlayClass, old, content, options) {
    let overlay = content;
    if (overlay instanceof OverlayClass) {
      if (options) {
        Object.keys(options).forEach((key) => {
          overlay[key] = options[key];
        });
      }
      overlay._source = this;
    } else {
      overlay = old && !options ? old : new OverlayClass(options, this);
      overlay.setContent(content);
    }
    return overlay;
  }

  bindPopup(content, options) {
    this._popup = this._initOverlay(Popup, this._popup, content, options);
    if (!this._popupHandlersAdded) {
      this.on({
        click: this._openPopup,
        keypress: this._onKeyPress,
        remove: this.closePopup,
        move: this._movePopup,
      });
      this._popupHandlersAdded = true;
    }

    return this;
  }

  // @method unbindPopup(): this
  // Removes the popup previously bound with `bindPopup`.
  unbindPopup() {
    if (this._popup) {
      this.off({
        click: this._openPopup,
        keypress: this._onKeyPress,
        remove: this.closePopup,
        move: this._movePopup,
      });
      this._popupHandlersAdded = false;
      this._popup = null;
    }
    return this;
  }

  // @method openPopup(latlng?: LatLng): this
  // Opens the bound popup at the specified `latlng` or at the default popup anchor if no `latlng` is passed.
  openPopup(latlng) {
    if (this._popup && this._popup._prepareOpen(latlng)) {
      // open the popup on the map
      this._popup.openOn(this._map);
    }
    return this;
  }

  // @method closePopup(): this
  // Closes the popup bound to this layer if it is open.
  closePopup() {
    if (this._popup) {
      this._popup.close();
    }
    return this;
  }

  // @method togglePopup(): this
  // Opens or closes the popup bound to this layer depending on its current state.
  togglePopup() {
    if (this._popup) {
      this._popup.toggle(this);
    }
    return this;
  }

  // @method isPopupOpen(): boolean
  // Returns `true` if the popup bound to this layer is currently open.
  isPopupOpen() {
    return this._popup ? this._popup.isOpen() : false;
  }

  // @method setPopupContent(content: String|HTMLElement|Popup): this
  // Sets the content of the popup bound to this layer.
  setPopupContent(content) {
    if (this._popup) {
      this._popup.setContent(content);
    }
    return this;
  }

  // @method getPopup(): Popup
  // Returns the popup bound to this layer.
  getPopup() {
    return this._popup;
  }

  _openPopup(e) {
    if (!this._popup || !this._map) {
      return;
    }
    // prevent map click
    DomEvent.stop(e);

    const target = e.layer || e.target;
    if (this._popup._source === target && !(target instanceof Path)) {
      // treat it like a marker and figure out
      // if we should toggle it open/closed
      if (this._map.hasLayer(this._popup)) {
        this.closePopup();
      } else {
        this.openPopup(e.latlng);
      }
      return;
    }
    this._popup._source = target;
    this.openPopup(e.latlng);
  }

  _movePopup(e) {
    this._popup.setLatLng(e.latlng);
  }

  _onKeyPress(e) {
    if (e.originalEvent.keyCode === 13) {
      this._openPopup(e);
    }
  }
}
