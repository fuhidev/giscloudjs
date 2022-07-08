import Browser from '../../core/Browser';
import { DomEvent, DomUtil } from '../../core/dom';
import { CoreUtil, StringUtil } from '../../utils';
import { ImageUtil } from '../../utils/image.util';
import { GridLayer, GridLayerOptions } from './GridLayer';
export interface TileLayerOptions extends GridLayerOptions {
  id?: string | undefined;
  accessToken?: string | undefined;
  minZoom?: number | undefined;
  maxZoom?: number | undefined;
  maxNativeZoom?: number | undefined;
  minNativeZoom?: number | undefined;
  subdomains?: string | string[] | undefined;
  errorTileUrl?: string | undefined;
  zoomOffset?: number | undefined;
  tms?: boolean | undefined;
  zoomReverse?: boolean | undefined;
  detectRetina?: boolean | undefined;
  crossOrigin?: boolean | string | undefined;
}
export class TileLayer extends GridLayer {
  minZoom = 0;
  maxZoom = 18;
  subdomains = 'abc';
  errorTileUrl = '';
  zoomOffset = 0;
  tms = false;
  zoomReverse = false;
  detectRetina = false;
  crossOrigin = false;
  referrerPolicy = false;
  _url: string;

  constructor(url: string, options?: TileLayerOptions) {
    super(options);
    this._url = url;
    if (options.detectRetina && Browser.retina && options.maxZoom > 0) {
      if (typeof options.tileSize == 'number')
        options.tileSize = Math.floor(options.tileSize / 2);

      if (!options.zoomReverse) {
        options.zoomOffset++;
        options.maxZoom = Math.max(options.minZoom, options.maxZoom - 1);
      } else {
        options.zoomOffset--;
        options.minZoom = Math.min(options.maxZoom, options.minZoom + 1);
      }

      options.minZoom = Math.max(0, options.minZoom);
    } else if (!options.zoomReverse) {
      // make sure maxZoom is gte minZoom
      options.maxZoom = Math.max(options.minZoom, options.maxZoom);
    } else {
      // make sure minZoom is lte maxZoom
      options.minZoom = Math.min(options.maxZoom, options.minZoom);
    }

    if (typeof options.subdomains === 'string') {
      options.subdomains = options.subdomains.split('');
    }
    this.on('tileunload', this._onTileRemove);
  }

  setUrl(url, noRedraw) {
    if (this._url === url && noRedraw === undefined) {
      noRedraw = true;
    }

    this._url = url;

    if (!noRedraw) {
      this.redraw();
    }
    return this;
  }

  // @method createTile(coords: Object, done?): HTMLElement
  // Called only internally, overrides GridLayer's [`createTile()`](#gridlayer-createtile)
  // to return an `<img>` HTML element with the appropriate image URL given `coords`. The `done`
  // callback is called when the tile has been loaded.
  createTile(coords, done) {
    const tile = document.createElement('img');

    DomEvent.on(
      tile,
      'load',
      CoreUtil.bind(this._tileOnLoad, this, done, tile)
    );
    DomEvent.on(
      tile,
      'error',
      CoreUtil.bind(this._tileOnError, this, done, tile)
    );

    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin =
        this.options.crossOrigin === true ? '' : this.options.crossOrigin;
    }

    // for this new option we follow the documented behavior
    // more closely by only setting the property when string
    if (typeof this.options.referrerPolicy === 'string') {
      tile.referrerPolicy = this.options.referrerPolicy;
    }

    // The alt attribute is set to the empty string,
    // allowing screen readers to ignore the decorative image tiles.
    // https://www.w3.org/WAI/tutorials/images/decorative/
    // https://www.w3.org/TR/html-aria/#el-img-empty-alt
    tile.alt = '';

    tile.src = this.getTileUrl(coords);

    return tile;
  }

  // @section Extension methods
  // @uninheritable
  // Layers extending `TileLayer` might reimplement the following method.
  // @method getTileUrl(coords: Object): String
  // Called only internally, returns the URL for a tile given its coordinates.
  // Classes extending `TileLayer` can override this function to provide custom tile URL naming schemes.
  getTileUrl(coords) {
    const data = {
      r: Browser.retina ? '@2x' : '',
      s: this._getSubdomain(coords),
      x: coords.x,
      y: coords.y,
      z: this._getZoomForUrl(),
    };
    if (this._map && !this._map.options.crs.infinite) {
      const invertedY = this._globalTileRange.max.y - coords.y;
      if (this.options.tms) {
        data['y'] = invertedY;
      }
      data['-y'] = invertedY;
    }

    return StringUtil.template(this._url, Object.assign(data, this.options));
  }

  _tileOnLoad(done, tile) {
    // For https://github.com/Leaflet/Leaflet/issues/3332
    if (Browser.ielt9) {
      setTimeout(CoreUtil.bind(done, this, null, tile), 0);
    } else {
      done(null, tile);
    }
  }

  _tileOnError(done, tile, e) {
    const errorUrl = this.options.errorTileUrl;
    if (errorUrl && tile.getAttribute('src') !== errorUrl) {
      tile.src = errorUrl;
    }
    done(e, tile);
  }

  _onTileRemove(e) {
    e.tile.onload = null;
  }

  _getZoomForUrl() {
    const maxZoom = this.options.maxZoom,
      zoomReverse = this.options.zoomReverse,
      zoomOffset = this.options.zoomOffset;
    let zoom = this._tileZoom;
    if (zoomReverse) {
      zoom = maxZoom - zoom;
    }

    return zoom + zoomOffset;
  }

  _getSubdomain(tilePoint) {
    const index =
      Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
    return this.options.subdomains[index];
  }

  // stops loading all tiles in the background layer
  _abortLoading() {
    let i, tile;
    for (i in this._tiles) {
      if (this._tiles[i].coords.z !== this._tileZoom) {
        tile = this._tiles[i].el;

        tile.onload = CoreUtil.falseFn;
        tile.onerror = CoreUtil.falseFn;

        if (!tile.complete) {
          tile.src = ImageUtil.emptyImageUrl;
          const coords = this._tiles[i].coords;
          DomUtil.remove(tile);
          delete this._tiles[i];
          // @event tileabort: TileEvent
          // Fired when a tile was loading but is now not wanted.
          this.fire('tileabort', {
            tile: tile,
            coords: coords,
          });
        }
      }
    }
  }

  _removeTile(key) {
    const tile = this._tiles[key];
    if (!tile) {
      return;
    }

    // Cancels any pending http requests associated with the tile
    tile.el.setAttribute('src', ImageUtil.emptyImageUrl);

    return GridLayer.prototype._removeTile.call(this, key);
  }

  _tileReady(coords, err, tile) {
    if (
      !this._map ||
      (tile && tile.getAttribute('src') === ImageUtil.emptyImageUrl)
    ) {
      return;
    }

    return GridLayer.prototype._tileReady.call(this, coords, err, tile);
  }
}
