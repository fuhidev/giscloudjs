import { Bounds } from '../geometry/Bounds';
import { Point } from '../geometry/Point';
import { LatLng } from '../geometry/support/LatLng';
import { Projection } from './Projection';

export class LongLatPrj extends Projection {
  project(latlng: LatLng): Point {
    return new Point({ x: latlng.lng, y: latlng.lat });
  }
  unproject(point: Point): LatLng {
    return new LatLng({ lng: point.x, lat: point.y });
  }
  getBounds(): Bounds {
    return new Bounds({
      topLeft: new Point({ x: -180, y: -90 }),
      bottomRight: new Point({ x: 180, y: 90 }),
    });
  }
}
