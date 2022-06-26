import { EarthCRS } from './Earth.CRS';

export class EPSG4326 extends EarthCRS {
  constructor() {
    super();
    this.code = 'EPSG:4326';
  }
}
