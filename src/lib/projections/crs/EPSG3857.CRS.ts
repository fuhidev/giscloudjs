import { SphericalMercatorPrj } from '../SphericalMercator.Projection';
import { EarthCRS } from './Earth.CRS';

export class EPSG3857CRS extends EarthCRS {
  constructor() {
    super();
    this.projection = new SphericalMercatorPrj();
    this.code = 'EPSG:3857';
  }
}
