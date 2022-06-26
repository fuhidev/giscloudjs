import { Bounds } from '../geometry/Bounds';
import { Point } from '../geometry/Point';
import { LatLng } from '../geometry/support/LatLng';

export abstract class Projection {
  abstract project(latlng: LatLng): Point;
  abstract unproject(point: Point): LatLng;
  abstract getBounds(): Bounds;
}
