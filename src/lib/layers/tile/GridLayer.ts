import Browser from '../../core/Browser';
import { DomUtil } from '../../core/dom';
import { Bounds, LatLngBounds, Point } from '../../geometry';
import { CoreUtil, NumberUtil } from '../../utils';
import { Layer } from '../Layer';

export interface GridLayerOptions {
  tileSize?: number | Point | undefined;
  opacity?: number | undefined;
  updateWhenIdle?: boolean | undefined;
  updateWhenZooming?: boolean | undefined;
  updateInterval?: number | undefined;
  attribution?: string | undefined;
  zIndex?: number | undefined;
  bounds?: LatLngBounds | undefined;
  minZoom?: number | undefined;
  maxZoom?: number | undefined;
  /**
   * Maximum zoom number the tile source has available. If it is specified, the tiles on all zoom levels higher than
   * `maxNativeZoom` will be loaded from `maxNativeZoom` level and auto-scaled.
   */
  maxNativeZoom?: number | undefined;
  /**
   * Minimum zoom number the tile source has available. If it is specified, the tiles on all zoom levels lower than
   * `minNativeZoom` will be loaded from `minNativeZoom` level and auto-scaled.
   */
  minNativeZoom?: number | undefined;
  noWrap?: boolean | undefined;
  pane?: string | undefined;
  className?: string | undefined;
  keepBuffer?: number | undefined;
}
export abstract class GridLayer extends Layer {
  tileSize = 256;
  opacity = 1;
  updateWhenIdle = Browser.mobile;
  updateWhenZooming = true;
  updateInterval = 200;
  zIndex = 1;
  bounds = null;
  minZoom = 0;
  maxZoom = undefined;
  maxNativeZoom = undefined;
  minNativeZoom = undefined;
  noWrap = false;
  pane = 'tilePane';
  className = '';
  keepBuffer = 2;
  _levels = {};
  _tiles = {};
  _tileZoom: any;
  options: any;
  _loading: any;
  _onMove: any;
  _noPrune: any;
  _level: any;
  _tileSize: Point;
  _globalTileRange: Bounds;
  _wrapX: [number, number];
  _wrapY: [number, number];
  private _container: any;
  _fadeFrame: number;
  constructor(options: GridLayerOptions) {
    super(options);
  }

  onAdd() {
    this._initContainer();

    this._levels = {};
    this._tiles = {};

    this._resetView(); // implicit _update() call
  }

  beforeAdd(map) {
    map._addZoomLimit(this);
  }

  onRemove(map) {
    this._removeAllTiles();
    DomUtil.remove(this._container);
    map._removeZoomLimit(this);
    this._container = null;
    this._tileZoom = undefined;
  }
  // @method bringToFront: this
  // Brings the tile layer to the top of all tile layers.
  bringToFront() {
    if (this._map) {
      DomUtil.toFront(this._container);
      this._setAutoZIndex(Math.max);
    }
    return this;
  }

  // @method bringToBack: this
  // Brings the tile layer to the bottom of all tile layers.
  bringToBack() {
    if (this._map) {
      DomUtil.toBack(this._container);
      this._setAutoZIndex(Math.min);
    }
    return this;
  }

  // @method getContainer: HTMLElement
  // Returns the HTML element that contains the tiles for this layer.
  getContainer() {
    return this._container;
  }

  // @method setOpacity(opacity: Number): this
  // Changes the [opacity](#gridlayer-opacity) of the grid layer.
  setOpacity(opacity) {
    this.options.opacity = opacity;
    this._updateOpacity();
    return this;
  }

  // @method setZIndex(zIndex: Number): this
  // Changes the [zIndex](#gridlayer-zindex) of the grid layer.
  setZIndex(zIndex) {
    this.options.zIndex = zIndex;
    this._updateZIndex();

    return this;
  }

  // @method isLoading: Boolean
  // Returns `true` if any tile in the grid layer has not finished loading.
  isLoading() {
    return this._loading;
  }

  // @method redraw: this
  // Causes the layer to clear all the tiles and request them again.
  redraw() {
    if (this._map) {
      this._removeAllTiles();
      const tileZoom = this._clampZoom(this._map.getZoom());
      if (tileZoom !== this._tileZoom) {
        this._tileZoom = tileZoom;
        this._updateLevels();
      }
      this._update();
    }
    return this;
  }

  getEvents() {
    const events = {
      viewprereset: this._invalidateAll,
      viewreset: this._resetView,
      zoom: this._resetView,
      moveend: this._onMoveEnd,
      move: undefined,
      zoomanim: undefined,
    };

    if (!this.options.updateWhenIdle) {
      // update tiles on move, but not more often than once per given interval
      if (!this._onMove) {
        this._onMove = CoreUtil.throttle(
          this._onMoveEnd,
          this.options.updateInterval,
          this
        );
      }

      events.move = this._onMove;
    }

    if (this._zoomAnimated) {
      events.zoomanim = this._animateZoom;
    }

    return events;
  }

  // @section Extension methods
  // Layers extending `GridLayer` shall reimplement the following method.
  // @method createTile(coords: Object, done?): HTMLElement
  // Called only internally, must be overridden by classes extending `GridLayer`.
  // Returns the `HTMLElement` corresponding to the given `coords`. If the `done` callback
  // is specified, it must be called when the tile has finished loading and drawing.
  abstract createTile(coords, done);

  // @section
  // @method getTileSize: Point
  // Normalizes the [tileSize option](#gridlayer-tilesize) into a point. Used by the `createTile()` method.
  getTileSize() {
    const s = this.options.tileSize;
    return s instanceof Point ? s : new Point({ x: s, y: s });
  }

  _updateZIndex() {
    if (
      this._container &&
      this.options.zIndex !== undefined &&
      this.options.zIndex !== null
    ) {
      this._container.style.zIndex = this.options.zIndex;
    }
  }

  _setAutoZIndex(compare) {
    // go through all other layers of the same pane, set zIndex to max + 1 (front) or min - 1 (back)

    const layers = this.getPane().children;
    let edgeZIndex = -compare(-Infinity, Infinity); // -Infinity for max, Infinity for min

    for (let i = 0, len = layers.length, zIndex; i < len; i++) {
      zIndex = layers[i].style.zIndex;

      if (layers[i] !== this._container && zIndex) {
        edgeZIndex = compare(edgeZIndex, +zIndex);
      }
    }

    if (isFinite(edgeZIndex)) {
      this.options.zIndex = edgeZIndex + compare(-1, 1);
      this._updateZIndex();
    }
  }

  _updateOpacity() {
    if (!this._map) {
      return;
    }

    // IE doesn't inherit filter opacity properly, so we're forced to set it on tiles
    if (Browser.ielt9) {
      return;
    }

    DomUtil.setOpacity(this._container, this.options.opacity);

    const now = +new Date();
    let nextFrame = false,
      willPrune = false;

    for (const key in this._tiles) {
      const tile = this._tiles[key];
      if (!tile.current || !tile.loaded) {
        continue;
      }

      const fade = Math.min(1, (now - tile.loaded) / 200);

      DomUtil.setOpacity(tile.el, fade);
      if (fade < 1) {
        nextFrame = true;
      } else {
        if (tile.active) {
          willPrune = true;
        }
        tile.active = true;
      }
    }

    if (willPrune && !this._noPrune) {
      this._pruneTiles();
    }

    if (nextFrame) {
      CoreUtil.cancelAnimFrame(this._fadeFrame);
      this._fadeFrame = CoreUtil.requestAnimFrame(this._updateOpacity, this);
    }
  }

  _onOpaqueTile = CoreUtil.falseFn;

  _initContainer() {
    if (this._container) {
      return;
    }

    this._container = DomUtil.create(
      'div',
      'leaflet-layer ' + (this.options.className || '')
    );
    this._updateZIndex();

    if (this.options.opacity < 1) {
      this._updateOpacity();
    }

    this.getPane().appendChild(this._container);
  }

  _updateLevels() {
    const zoom = this._tileZoom,
      maxZoom = this.options.maxZoom;

    if (zoom === undefined) {
      return undefined;
    }

    for (const zS in this._levels) {
      const z = Number(zS);
      if (this._levels[z].el.children.length || z === zoom) {
        this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom - z);
      } else {
        DomUtil.remove(this._levels[z].el);
        this._removeTilesAtZoom(z);
        delete this._levels[z];
      }
    }

    let level = this._levels[zoom];
    const map = this._map;

    if (!level) {
      level = this._levels[zoom] = {};

      level.el = DomUtil.create(
        'div',
        'leaflet-tile-container leaflet-zoom-animated',
        this._container
      );
      level.el.style.zIndex = maxZoom;

      level.origin = map
        .project(map.unproject(map.getPixelOrigin()), zoom)
        .round();
      level.zoom = zoom;

      this._setZoomTransform(level, map.getCenter(), map.getZoom());

      // force the browser to consider the newly added element for transition
    }

    this._level = level;

    return level;
  }

  _pruneTiles() {
    if (!this._map) {
      return;
    }

    let key, tile;

    const zoom = this._map.getZoom();
    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      this._removeAllTiles();
      return;
    }

    for (key in this._tiles) {
      tile = this._tiles[key];
      tile.retain = tile.current;
    }

    for (key in this._tiles) {
      tile = this._tiles[key];
      if (tile.current && !tile.active) {
        const coords = tile.coords;
        if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
          this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
        }
      }
    }

    for (key in this._tiles) {
      if (!this._tiles[key].retain) {
        this._removeTile(key);
      }
    }
  }

  _removeTilesAtZoom(zoom) {
    for (const key in this._tiles) {
      if (this._tiles[key].coords.z !== zoom) {
        continue;
      }
      this._removeTile(key);
    }
  }

  _removeAllTiles() {
    for (const key in this._tiles) {
      this._removeTile(key);
    }
  }

  _invalidateAll() {
    for (const z in this._levels) {
      DomUtil.remove(this._levels[z].el);
      delete this._levels[z];
    }
    this._removeAllTiles();

    this._tileZoom = undefined;
  }

  _retainParent(x, y, z, minZoom) {
    const x2 = Math.floor(x / 2),
      y2 = Math.floor(y / 2),
      z2 = z - 1,
      coords2 = new Point({ x: +x2, y: +y2 });
    coords2.z = +z2;

    const key = this._tileCoordsToKey(coords2),
      tile = this._tiles[key];

    if (tile && tile.active) {
      tile.retain = true;
      return true;
    } else if (tile && tile.loaded) {
      tile.retain = true;
    }

    if (z2 > minZoom) {
      return this._retainParent(x2, y2, z2, minZoom);
    }

    return false;
  }

  _retainChildren(x, y, z, maxZoom) {
    for (let i = 2 * x; i < 2 * x + 2; i++) {
      for (let j = 2 * y; j < 2 * y + 2; j++) {
        const coords = new Point({ x: i, y: j });
        coords.z = z + 1;

        const key = this._tileCoordsToKey(coords),
          tile = this._tiles[key];

        if (tile && tile.active) {
          tile.retain = true;
          continue;
        } else if (tile && tile.loaded) {
          tile.retain = true;
        }

        if (z + 1 < maxZoom) {
          this._retainChildren(i, j, z + 1, maxZoom);
        }
      }
    }
  }

  _resetView(e?) {
    const animating = e && (e.pinch || e.flyTo);
    this._setView(
      this._map.getCenter(),
      this._map.getZoom(),
      animating,
      animating
    );
  }

  _animateZoom(e) {
    this._setView(e.center, e.zoom, true, e.noUpdate);
  }

  _clampZoom(zoom) {
    const options = this.options;

    if (undefined !== options.minNativeZoom && zoom < options.minNativeZoom) {
      return options.minNativeZoom;
    }

    if (undefined !== options.maxNativeZoom && options.maxNativeZoom < zoom) {
      return options.maxNativeZoom;
    }

    return zoom;
  }

  abstract _abortLoading();

  _setView(center, zoom, noPrune?, noUpdate?) {
    let tileZoom = Math.round(zoom);
    if (
      (this.options.maxZoom !== undefined && tileZoom > this.options.maxZoom) ||
      (this.options.minZoom !== undefined && tileZoom < this.options.minZoom)
    ) {
      tileZoom = undefined;
    } else {
      tileZoom = this._clampZoom(tileZoom);
    }

    const tileZoomChanged =
      this.options.updateWhenZooming && tileZoom !== this._tileZoom;

    if (!noUpdate || tileZoomChanged) {
      this._tileZoom = tileZoom;

      if (this._abortLoading) {
        this._abortLoading();
      }

      this._updateLevels();
      this._resetGrid();

      if (tileZoom !== undefined) {
        this._update(center);
      }

      if (!noPrune) {
        this._pruneTiles();
      }

      // Flag to prevent _updateOpacity from pruning tiles during
      // a zoom anim or a pinch gesture
      this._noPrune = !!noPrune;
    }

    this._setZoomTransforms(center, zoom);
  }

  _setZoomTransforms(center, zoom) {
    for (const i in this._levels) {
      this._setZoomTransform(this._levels[i], center, zoom);
    }
  }

  _setZoomTransform(level, center, zoom) {
    const scale = this._map.getZoomScale(zoom, level.zoom),
      translate = level.origin
        .multiplyBy(scale)
        .subtract(this._map._getNewPixelOrigin(center, zoom))
        .round();

    if (Browser.any3d) {
      DomUtil.setTransform(level.el, translate, scale);
    } else {
      DomUtil.setPosition(level.el, translate);
    }
  }

  _resetGrid() {
    const map = this._map,
      crs = map.options.crs,
      tileSize = (this._tileSize = this.getTileSize()),
      tileZoom = this._tileZoom;

    const bounds = this._map.getPixelWorldBounds(this._tileZoom);
    if (bounds) {
      this._globalTileRange = this._pxBoundsToTileRange(bounds);
    }

    this._wrapX = crs.wrapLng &&
      !this.options.noWrap && [
        Math.floor(map.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
        Math.ceil(map.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y),
      ];
    this._wrapY = crs.wrapLat &&
      !this.options.noWrap && [
        Math.floor(map.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
        Math.ceil(map.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y),
      ];
  }

  _onMoveEnd() {
    if (!this._map || this._map._animatingZoom) {
      return;
    }

    this._update();
  }

  _getTiledPixelBounds(center) {
    const map = this._map,
      mapZoom = map._animatingZoom
        ? Math.max(map._animateToZoom, map.getZoom())
        : map.getZoom(),
      scale = map.getZoomScale(mapZoom, this._tileZoom),
      pixelCenter = map.project(center, this._tileZoom).floor(),
      halfSize = map.getSize().divideBy(scale * 2);

    return new Bounds({
      topLeft: pixelCenter.subtract(halfSize),
      bottomRight: pixelCenter.add(halfSize),
    });
  }

  // Private method to load tiles in the grid's active zoom level according to map bounds
  _update(center?) {
    const map = this._map;
    if (!map) {
      return;
    }
    const zoom = this._clampZoom(map.getZoom());

    if (center === undefined) {
      center = map.getCenter();
    }
    if (this._tileZoom === undefined) {
      return;
    } // if out of minzoom/maxzoom

    const pixelBounds = this._getTiledPixelBounds(center),
      tileRange = this._pxBoundsToTileRange(pixelBounds),
      tileCenter = tileRange.getCenter(),
      queue = [],
      margin = this.options.keepBuffer,
      noPruneRange = new Bounds({
        topLeft: tileRange
          .getBottomLeft()
          .subtract(new Point({ x: margin, y: -margin })),
        bottomRight: tileRange
          .getTopRight()
          .add(new Point({ x: margin, y: -margin })),
      });

    // Sanity check: panic if the tile range contains Infinity somewhere.
    if (
      !(
        isFinite(tileRange.min.x) &&
        isFinite(tileRange.min.y) &&
        isFinite(tileRange.max.x) &&
        isFinite(tileRange.max.y)
      )
    ) {
      throw new Error('Attempted to load an infinite number of tiles');
    }

    for (const key in this._tiles) {
      const c = this._tiles[key].coords;
      if (c.z !== this._tileZoom || !noPruneRange.contains(new Point(c))) {
        this._tiles[key].current = false;
      }
    }

    // _update just loads more tiles. If the tile zoom level differs too much
    // from the map's, let _setView reset levels and prune old tiles.
    if (Math.abs(zoom - this._tileZoom) > 1) {
      this._setView(center, zoom);
      return;
    }

    // create a queue of coordinates to load tiles from
    for (let y = tileRange.min.y; y <= tileRange.max.y; y++) {
      for (let x = tileRange.min.x; x <= tileRange.max.x; x++) {
        const coords = new Point({ x, y });
        coords.z = this._tileZoom;

        if (!this._isValidTile(coords)) {
          continue;
        }

        const tile = this._tiles[this._tileCoordsToKey(coords)];
        if (tile) {
          tile.current = true;
        } else {
          queue.push(coords);
        }
      }
    }

    // sort tile queue to load tiles in order of their distance to center
    queue.sort(function (a, b) {
      return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
    });

    if (queue.length !== 0) {
      // if it's the first batch of tiles to load
      if (!this._loading) {
        this._loading = true;
        // @event loading: Event
        // Fired when the grid layer starts loading tiles.
        this.fire('loading');
      }

      // create DOM fragment to append tiles in one batch
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < queue.length; i++) {
        this._addTile(queue[i], fragment);
      }

      this._level.el.appendChild(fragment);
    }
  }

  _isValidTile(coords) {
    const crs = this._map.options.crs;

    if (!crs.infinite) {
      // don't load tile if it's out of bounds and not wrapped
      const bounds = this._globalTileRange;
      if (
        (!crs.wrapLng &&
          (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
        (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))
      ) {
        return false;
      }
    }

    if (!this.options.bounds) {
      return true;
    }

    // don't load tile if it doesn't intersect the bounds in options
    const tileBounds = this._tileCoordsToBounds(coords);
    return new LatLngBounds(this.options.bounds).overlaps(tileBounds);
  }

  _keyToBounds(key) {
    return this._tileCoordsToBounds(this._keyToTileCoords(key));
  }

  _tileCoordsToNwSe(coords) {
    const map = this._map,
      tileSize = this.getTileSize(),
      nwPoint = coords.scaleBy(tileSize),
      sePoint = nwPoint.add(tileSize),
      nw = map.unproject(nwPoint, coords.z),
      se = map.unproject(sePoint, coords.z);
    return [nw, se];
  }

  // converts tile coordinates to its geographical bounds
  _tileCoordsToBounds(coords) {
    const bp = this._tileCoordsToNwSe(coords);
    let bounds = new LatLngBounds({ southWest: bp[0], northEast: bp[1] });

    if (!this.options.noWrap) {
      bounds = this._map.wrapLatLngBounds(bounds);
    }
    return bounds;
  }
  // converts tile coordinates to key for the tile cache
  _tileCoordsToKey(coords) {
    return coords.x + ':' + coords.y + ':' + coords.z;
  }

  // converts tile cache key to coordinates
  _keyToTileCoords(key) {
    const k = key.split(':'),
      coords = new Point({ x: +k[0], y: +k[1] });
    coords.z = +k[2];
    return coords;
  }

  _removeTile(key) {
    const tile = this._tiles[key];
    if (!tile) {
      return;
    }

    DomUtil.remove(tile.el);

    delete this._tiles[key];

    // @event tileunload: TileEvent
    // Fired when a tile is removed (e.g. when a tile goes off the screen).
    this.fire('tileunload', {
      tile: tile.el,
      coords: this._keyToTileCoords(key),
    });
  }

  _initTile(tile) {
    DomUtil.addClass(tile, 'leaflet-tile');

    const tileSize = this.getTileSize();
    tile.style.width = tileSize.x + 'px';
    tile.style.height = tileSize.y + 'px';

    tile.onselectstart = CoreUtil.falseFn;
    tile.onmousemove = CoreUtil.falseFn;

    // update opacity on tiles in IE7-8 because of filter inheritance problems
    if (Browser.ielt9 && this.options.opacity < 1) {
      DomUtil.setOpacity(tile, this.options.opacity);
    }
  }

  _addTile(coords, container) {
    const tilePos = this._getTilePos(coords),
      key = this._tileCoordsToKey(coords);

    const tile = this.createTile(
      this._wrapCoords(coords),
      CoreUtil.bind(this._tileReady, this, coords)
    );

    this._initTile(tile);

    // if createTile is defined with a second argument ("done" callback),
    // we know that tile is async and will be ready later; otherwise
    if (this.createTile.length < 2) {
      // mark tile as ready, but delay one frame for opacity animation to happen
      CoreUtil.requestAnimFrame(
        CoreUtil.bind(this._tileReady, this, coords, null, tile)
      );
    }

    DomUtil.setPosition(tile, tilePos);

    // save tile in cache
    this._tiles[key] = {
      el: tile,
      coords: coords,
      current: true,
    };

    container.appendChild(tile);
    // @event tileloadstart: TileEvent
    // Fired when a tile is requested and starts loading.
    this.fire('tileloadstart', {
      tile: tile,
      coords: coords,
    });
  }

  _tileReady(coords, err, tile) {
    if (err) {
      // @event tileerror: TileErrorEvent
      // Fired when there is an error loading a tile.
      this.fire('tileerror', {
        error: err,
        tile: tile,
        coords: coords,
      });
    }

    const key = this._tileCoordsToKey(coords);

    tile = this._tiles[key];
    if (!tile) {
      return;
    }

    tile.loaded = +new Date();
    if (this._map._fadeAnimated) {
      DomUtil.setOpacity(tile.el, 0);
      CoreUtil.cancelAnimFrame(this._fadeFrame);
      this._fadeFrame = CoreUtil.requestAnimFrame(this._updateOpacity, this);
    } else {
      tile.active = true;
      this._pruneTiles();
    }

    if (!err) {
      DomUtil.addClass(tile.el, 'leaflet-tile-loaded');

      // @event tileload: TileEvent
      // Fired when a tile loads.
      this.fire('tileload', {
        tile: tile.el,
        coords: coords,
      });
    }

    if (this._noTilesToLoad()) {
      this._loading = false;
      // @event load: Event
      // Fired when the grid layer loaded all visible tiles.
      this.fire('load');

      if (Browser.ielt9 || !this._map._fadeAnimated) {
        CoreUtil.requestAnimFrame(this._pruneTiles, this);
      } else {
        // Wait a bit more than 0.2 secs (the duration of the tile fade-in)
        // to trigger a pruning.
        setTimeout(CoreUtil.bind(this._pruneTiles, this), 250);
      }
    }
  }

  _getTilePos(coords) {
    return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
  }

  _wrapCoords(coords) {
    const newCoords = new Point({
      x: this._wrapX ? NumberUtil.wrapNum(coords.x, this._wrapX) : coords.x,
      y: this._wrapY ? NumberUtil.wrapNum(coords.y, this._wrapY) : coords.y,
    });
    newCoords.z = coords.z;
    return newCoords;
  }

  _pxBoundsToTileRange(bounds) {
    const tileSize = this.getTileSize();
    return new Bounds({
      topLeft: bounds.min.unscaleBy(tileSize).floor(),
      bottomRight: bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]),
    });
  }

  _noTilesToLoad() {
    for (const key in this._tiles) {
      if (!this._tiles[key].loaded) {
        return false;
      }
    }
    return true;
  }
}
