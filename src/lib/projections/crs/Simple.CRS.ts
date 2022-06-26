import { LatLng } from '../../geometry/support/LatLng';
import { Transformation } from '../../geometry/Transformation';
import { LongLatPrj } from '../LonLat.Projection';
import { CRS } from './CRS';

export class SimpleCRS extends CRS {
  constructor() {
    super();
    this.projection = new LongLatPrj();
    this.transformation = new Transformation({
      a: 1,
      b: 0,
      c: -1,
      d: 0,
    });
    this.infinite = true;
  }

  scale(zoom: number): number {
    return Math.pow(2, zoom);
  }

  zoom(scale: number): number {
    return Math.log(scale) / Math.LN2;
  }

  distance(from: LatLng, to: LatLng) {
    const dx = to.lng - from.lng,
      dy = to.lat - from.lat;

    return Math.sqrt(dx * dx + dy * dy);
  }
}
