import { DomEvent } from '../core/dom/domEvent/DomEvent';
import { DomUtil } from '../core/dom/DomUtil';
import { Point } from '../geometry/Point';
import { DivOverlay, DivOverlayOptions } from '../layers/DivOverlay';
import { Path } from '../layers/vector/Path';
import { DMap } from '../map/Map';

export interface PopupOptions extends DivOverlayOptions {
  maxWidth?: number | undefined;
  minWidth?: number | undefined;
  maxHeight?: number | undefined;
  keepInView?: boolean | undefined;
  closeButton?: boolean | undefined;
  autoPan?: boolean | undefined;
  autoPanPaddingTopLeft?: Point | undefined;
  autoPanPaddingBottomRight?: Point | undefined;
  autoPanPadding?: Point | undefined;
  autoClose?: boolean | undefined;
  closeOnClick?: boolean | undefined;
  closeOnEscapeKey?: boolean | undefined;
}

export class Popup extends DivOverlay {
  pane = 'popupPane';
  offset = [0, 7];
  maxWidth = 300;
  minWidth = 50;
  autoPan = true;
  autoPanPaddingTopLeft = null;
  autoPanPaddingBottomRight = null;
  autoPanPadding = [5, 5];
  keepInView = false;
  closeButton = true;
  autoClose = true;
  closeOnClick?: boolean;
  closeOnEscapeKey = true;
  className = '';
  private _tipContainer: HTMLElement;
  maxHeight: any;
  constructor(options: PopupOptions) {
    super(options);
  }

  // @namespace Popup
  // @method openOn(map: Map): this
  // Alternative to `map.openPopup(popup)`.
  // Adds the popup to the map and closes the previous one.
  openOn(map: DMap) {
    map = arguments.length ? map : this._source._map; // experimental, not the part of public api

    if (!map.hasLayer(this) && map._popup && map._popup.options.autoClose) {
      map.removeLayer(map._popup);
    }
    map._popup = this;

    return DivOverlay.prototype.openOn.call(this, map);
  }

  onAdd(map) {
    DivOverlay.prototype.onAdd.call(this, map);

    // @namespace Map
    // @section Popup events
    // @event popupopen: PopupEvent
    // Fired when a popup is opened in the map
    map.fire('popupopen', { popup: this });

    if (this._source) {
      // @namespace Layer
      // @section Popup events
      // @event popupopen: PopupEvent
      // Fired when a popup bound to this layer is opened
      this._source.fire('popupopen', { popup: this }, true);
      // For non-path layers, we toggle the popup when clicking
      // again the layer, so prevent the map to reopen it.
      if (!(this._source instanceof Path)) {
        this._source.on('preclick', DomEvent.stopPropagation);
      }
    }
  }

  onRemove(map) {
    DivOverlay.prototype.onRemove.call(this, map);

    // @namespace Map
    // @section Popup events
    // @event popupclose: PopupEvent
    // Fired when a popup in the map is closed
    map.fire('popupclose', { popup: this });

    if (this._source) {
      // @namespace Layer
      // @section Popup events
      // @event popupclose: PopupEvent
      // Fired when a popup bound to this layer is closed
      this._source.fire('popupclose', { popup: this }, true);
      if (!(this._source instanceof Path)) {
        this._source.off('preclick', DomEvent.stopPropagation);
      }
    }
  }

  getEvents() {
    const events = DivOverlay.prototype.getEvents.call(this);

    if (
      this.closeOnClick !== undefined
        ? this.closeOnClick
        : this._map.options.closePopupOnClick
    ) {
      events.preclick = this.close;
    }

    if (this.keepInView) {
      events.moveend = this._adjustPan;
    }

    return events;
  }

  _initLayout() {
    const prefix = 'leaflet-popup',
      container = (this._container = DomUtil.create(
        'div',
        prefix + ' ' + (this.className || '') + ' leaflet-zoom-animated'
      ));

    const wrapper = DomUtil.create(
      'div',
      prefix + '-content-wrapper',
      container
    );
    this._contentNode = DomUtil.create('div', prefix + '-content', wrapper);

    DomEvent.disableClickPropagation(container);
    DomEvent.disableScrollPropagation(this._contentNode);
    DomEvent.on(container, 'contextmenu', DomEvent.stopPropagation);

    this._tipContainer = DomUtil.create(
      'div',
      prefix + '-tip-container',
      container
    );
    DomUtil.create('div', prefix + '-tip', this._tipContainer);

    if (this.closeButton) {
      const closeButton = DomUtil.create(
        'a',
        prefix + '-close-button',
        container
      ) as HTMLLinkElement;
      closeButton.setAttribute('role', 'button'); // overrides the implicit role=link of <a> elements #7399
      closeButton.setAttribute('aria-label', 'Close popup');
      closeButton.href = '#close';
      closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';

      DomEvent.on(
        closeButton,
        'click',
        function (ev) {
          DomEvent.preventDefault(ev);
          this.close();
        },
        this
      );
    }
  }

  _updateLayout() {
    const container = this._contentNode,
      style = container.style;

    style.width = '';
    style.whiteSpace = 'nowrap';

    let width = container.offsetWidth;
    width = Math.min(width, this.maxWidth);
    width = Math.max(width, this.minWidth);

    style.width = width + 1 + 'px';
    style.whiteSpace = '';

    style.height = '';

    const height = container.offsetHeight,
      maxHeight = this.maxHeight,
      scrolledClass = 'leaflet-popup-scrolled';

    if (maxHeight && height > maxHeight) {
      style.height = maxHeight + 'px';
      DomUtil.addClass(container, scrolledClass);
    } else {
      DomUtil.removeClass(container, scrolledClass);
    }

    this._containerWidth = this._container.offsetWidth;
  }

  _animateZoom(e) {
    const pos = this._map._latLngToNewLayerPoint(
        this._latlng,
        e.zoom,
        e.center
      ),
      anchor = this._getAnchor();
    DomUtil.setPosition(this._container, pos.add(anchor));
  }

  _adjustPan(e) {
    if (!this.autoPan) {
      return;
    }
    if (this._map._panAnim) {
      this._map._panAnim.stop();
    }

    const map = this._map,
      marginBottom =
        parseInt(DomUtil.getStyle(this._container, 'marginBottom'), 10) || 0,
      containerHeight = this._container.offsetHeight + marginBottom,
      containerWidth = this._containerWidth,
      layerPos = new Point({
        x: this._containerLeft,
        y: -containerHeight - this._containerBottom,
      });

    layerPos.add(DomUtil.getPosition(this._container));

    const containerPos = map.layerPointToContainerPoint(layerPos),
      padding = this.autoPanPadding,
      paddingTL = this.autoPanPaddingTopLeft || padding,
      paddingBR = this.autoPanPaddingBottomRight || padding,
      size = map.getSize();
    let dx = 0,
      dy = 0;

    if (containerPos.x + containerWidth + paddingBR.x > size.x) {
      // right
      dx = containerPos.x + containerWidth - size.x + paddingBR.x;
    }
    if (containerPos.x - dx - paddingTL.x < 0) {
      // left
      dx = containerPos.x - paddingTL.x;
    }
    if (containerPos.y + containerHeight + paddingBR.y > size.y) {
      // bottom
      dy = containerPos.y + containerHeight - size.y + paddingBR.y;
    }
    if (containerPos.y - dy - paddingTL.y < 0) {
      // top
      dy = containerPos.y - paddingTL.y;
    }

    // @namespace Map
    // @section Popup events
    // @event autopanstart: Event
    // Fired when the map starts autopanning when opening a popup.
    if (dx || dy) {
      map
        .fire('autopanstart')
        .panBy([dx, dy], { animate: e && e.type === 'moveend' });
    }
  }

  _getAnchor() {
    // Where should we anchor the popup on the source layer?
    return this._source && '_getPopupAnchor' in this._source
      ? new Point((this._source as any)._getPopupAnchor())
      : new Point();
  }
}
