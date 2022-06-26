import { Bounds } from '../geometry/Bounds';
import { Point } from '../geometry/Point';
import { LatLng } from '../geometry/support/LatLng';
import { Projection } from './Projection';

export class MercatorPrj extends Projection {
  static readonly R = 6378137;
  static readonly R_MINOR = 6356752.314245179;

  getBounds() {
    return new Bounds({
      topLeft: new Point({ x: -20037508.34279, y: -15496570.73972 }),

      bottomRight: new Point({ x: 20037508.34279, y: 18764656.23138 }),
    });
  }

  project(latlng: LatLng): Point {
    const d = Math.PI / 180;
    let y = latlng.lat * d;
    const r = MercatorPrj.R,
      tmp = MercatorPrj.R_MINOR / r,
      e = Math.sqrt(1 - tmp * tmp),
      con = e * Math.sin(y);

    const ts =
      Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), e / 2);
    y = -r * Math.log(Math.max(ts, 1e-10));

    return new Point({ x: latlng.lng * d * r, y });
  }
  unproject(point: Point): LatLng {
    const d = 180 / Math.PI,
      r = MercatorPrj.R,
      tmp = MercatorPrj.R_MINOR / r,
      e = Math.sqrt(1 - tmp * tmp),
      ts = Math.exp(-point.y / r);
    let phi = Math.PI / 2 - 2 * Math.atan(ts);

    for (let i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
      con = e * Math.sin(phi);
      con = Math.pow((1 - con) / (1 + con), e / 2);
      dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
      phi += dphi;
    }

    return new LatLng({ lat: phi * d, lng: (point.x * d) / r });
  }
}
