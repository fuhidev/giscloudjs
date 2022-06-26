import { Bounds } from '../geometry/Bounds';
import { Point } from '../geometry/Point';
import { LatLng } from '../geometry/support/LatLng';
import { Projection } from './Projection';
export class SphericalMercatorPrj extends Projection {
  static readonly R = 6378137;
  static readonly MAX_LATITUDE = 85.0511287798;
  constructor() {
    super();
  }
  project(latlng: LatLng) {
    const d = Math.PI / 180,
      max = SphericalMercatorPrj.MAX_LATITUDE,
      lat = Math.max(Math.min(max, latlng.lat), -max),
      sin = Math.sin(lat * d);

    return new Point({
      x: SphericalMercatorPrj.R * latlng.lng * d,
      y: (SphericalMercatorPrj.R * Math.log((1 + sin) / (1 - sin))) / 2,
    });
  }

  unproject(point: Point) {
    const d = 180 / Math.PI;

    return new LatLng({
      lat:
        (2 * Math.atan(Math.exp(point.y / SphericalMercatorPrj.R)) -
          Math.PI / 2) *
        d,
      lng: (point.x * d) / SphericalMercatorPrj.R,
    });
  }

  getBounds() {
    const d = SphericalMercatorPrj.R * Math.PI;
    return new Bounds({
      min: new Point({ x: -d, y: -d }),
      max: new Point({ x: d, y: d }),
    });
  }
}
