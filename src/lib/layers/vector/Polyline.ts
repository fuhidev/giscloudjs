import { Bounds } from '../../geometry/Bounds';
import { Point } from '../../geometry/Point';
import { LatLng } from '../../geometry/support/LatLng';
import { LatLngBounds } from '../../geometry/support/LatLngBounds';
import { Path, PathOptions } from './Path';
import { lineUtil } from './support/LineUtil';

export interface PolylineOptions extends PathOptions {
  smoothFactor?: number;
  noClip?: boolean;
}

export class Polyline extends Path {
  smoothFactor = 1.0;
  noClip = false;
  latlngs: LatLng[];
  private _parts: any;
  _rings: any;
  _bounds: any;
  _rawPxBounds: any;
  _pxBounds: any;
  _renderer: any;
  options: any;
  constructor(latlngs: LatLng[] | LatLng[][], options?: PolylineOptions) {
    super(options);
  }
  // @method getLatLngs(): LatLng[]
  // Returns an array of the points in the path, or nested arrays of points in case of multi-polyline.
  getLatLngs() {
    return this.latlngs;
  }

  // @method setLatLngs(latlngs: LatLng[]): this
  // Replaces all the points in the polyline with the given array of geographical points.
  setLatLngs(latlngs) {
    this._setLatLngs(latlngs);
    return this.redraw();
  }

  // @method isEmpty(): Boolean
  // Returns `true` if the Polyline has no LatLngs.
  isEmpty() {
    return !this.latlngs.length;
  }

  // @method closestLayerPoint(p: Point): Point
  // Returns the point closest to `p` on the Polyline.
  closestLayerPoint(p) {
    let minDistance = Infinity,
      minPoint = null,
      p1,
      p2;
    const closest = lineUtil._sqClosestPointOnSegment;

    for (let j = 0, jLen = this._parts.length; j < jLen; j++) {
      const points = this._parts[j];

      for (let i = 1, len = points.length; i < len; i++) {
        p1 = points[i - 1];
        p2 = points[i];

        const sqDist = closest(p, p1, p2, true) as number;

        if (sqDist < minDistance) {
          minDistance = sqDist;
          minPoint = closest(p, p1, p2);
        }
      }
    }
    if (minPoint) {
      minPoint.distance = Math.sqrt(minDistance);
    }
    return minPoint;
  }

  // @method getCenter(): LatLng
  // Returns the center ([centroid](https://en.wikipedia.org/wiki/Centroid)) of the polyline.
  getCenter() {
    // throws error when not yet added to map as this center calculation requires projected coordinates
    if (!this._map) {
      throw new Error('Must add layer to map before using getCenter()');
    }

    let i, halfDist, segDist, dist, p1, p2, ratio;
    const points = this._rings[0],
      len = points.length;

    if (!len) {
      return null;
    }

    // polyline centroid algorithm; only uses the first ring if there are multiple

    for (i = 0, halfDist = 0; i < len - 1; i++) {
      halfDist += points[i].distanceTo(points[i + 1]) / 2;
    }

    // The line is so small in the current view that all points are on the same pixel.
    if (halfDist === 0) {
      return this._map.layerPointToLatLng(points[0]);
    }

    for (i = 0, dist = 0; i < len - 1; i++) {
      p1 = points[i];
      p2 = points[i + 1];
      segDist = p1.distanceTo(p2);
      dist += segDist;

      if (dist > halfDist) {
        ratio = (dist - halfDist) / segDist;
        return this._map.layerPointToLatLng([
          p2.x - ratio * (p2.x - p1.x),
          p2.y - ratio * (p2.y - p1.y),
        ]);
      }
    }
  }

  // @method getBounds(): LatLngBounds
  // Returns the `LatLngBounds` of the path.
  getBounds() {
    return this._bounds;
  }

  // @method addLatLng(latlng: LatLng, latlngs?: LatLng[]): this
  // Adds a given point to the polyline. By default, adds to the first ring of
  // the polyline in case of a multi-polyline, but can be overridden by passing
  // a specific ring as a LatLng array (that you can earlier access with [`getLatLngs`](#polyline-getlatlngs)).
  addLatLng(latlng: LatLng, latlngs: LatLng[]) {
    latlngs = latlngs || (this._defaultShape() as LatLng[]);
    latlngs.push(latlng);
    this._bounds.extend(latlng);
    return this.redraw();
  }

  _setLatLngs(latlngs) {
    this._bounds = new LatLngBounds();
    this.latlngs = this._convertLatLngs(latlngs);
  }

  _defaultShape() {
    return lineUtil.isFlat(this.latlngs) ? this.latlngs : this.latlngs[0];
  }

  // recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
  _convertLatLngs(latlngs: LatLng[] | LatLng[][]) {
    const result = [],
      flat = lineUtil.isFlat(latlngs);

    for (let i = 0, len = latlngs.length; i < len; i++) {
      if (flat) {
        result[i] = latlngs[i];
        this._bounds.extend(result[i]);
      } else {
        result[i] = this._convertLatLngs(latlngs[i] as LatLng[]);
      }
    }

    return result;
  }

  _project() {
    const pxBounds = new Bounds();
    this._rings = [];
    this._projectLatlngs(this.latlngs, this._rings, pxBounds);

    if (this._bounds.isValid() && pxBounds.isValid()) {
      this._rawPxBounds = pxBounds;
      this._updateBounds();
    }
  }

  _updateBounds() {
    const w = this._clickTolerance(),
      p = new Point({ x: w, y: w });

    if (!this._rawPxBounds) {
      return;
    }

    this._pxBounds = new Bounds({
      topLeft: this._rawPxBounds.min.subtract(p),
      bottomRight: this._rawPxBounds.max.add(p),
    });
  }

  // recursively turns latlngs into a set of rings with projected coordinates
  _projectLatlngs(latlngs, result, projectedBounds) {
    const flat = latlngs[0] instanceof LatLng,
      len = latlngs.length;
    let i, ring;

    if (flat) {
      ring = [];
      for (i = 0; i < len; i++) {
        ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
        projectedBounds.extend(ring[i]);
      }
      result.push(ring);
    } else {
      for (i = 0; i < len; i++) {
        this._projectLatlngs(latlngs[i], result, projectedBounds);
      }
    }
  }

  // clip polyline by renderer bounds so that we have less to render for performance
  _clipPoints() {
    const bounds = this._renderer._bounds;

    this._parts = [];
    if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
      return;
    }

    if (this.options.noClip) {
      this._parts = this._rings;
      return;
    }

    const parts = this._parts;
    let i, j, k, len, len2, segment, points;

    for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
      points = this._rings[i];

      for (j = 0, len2 = points.length; j < len2 - 1; j++) {
        segment = lineUtil.clipSegment(
          points[j],
          points[j + 1],
          bounds,
          j,
          true
        );

        if (!segment) {
          continue;
        }

        parts[k] = parts[k] || [];
        parts[k].push(segment[0]);

        // if segment goes out of screen, or it's the last one, it's the end of the line part
        if (segment[1] !== points[j + 1] || j === len2 - 2) {
          parts[k].push(segment[1]);
          k++;
        }
      }
    }
  }

  // simplify each clipped part of the polyline for performance
  _simplifyPoints() {
    const parts = this._parts,
      tolerance = this.options.smoothFactor;

    for (let i = 0, len = parts.length; i < len; i++) {
      parts[i] = lineUtil.simplify(parts[i], tolerance);
    }
  }

  _update() {
    if (!this._map) {
      return;
    }

    this._clipPoints();
    this._simplifyPoints();
    this._updatePath();
  }

  _updatePath() {
    this._renderer._updatePoly(this);
  }

  // Needed by the `Canvas` renderer for interactivity
  _containsPoint(p, closed) {
    let i, j, k, len, len2, part;
    const w = this._clickTolerance();

    if (!this._pxBounds || !this._pxBounds.contains(p)) {
      return false;
    }

    // hit detection for polylines
    for (i = 0, len = this._parts.length; i < len; i++) {
      part = this._parts[i];

      for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
        if (!closed && j === 0) {
          continue;
        }

        if (lineUtil.pointToSegmentDistance(p, part[k], part[j]) <= w) {
          return true;
        }
      }
    }
    return false;
  }
}
