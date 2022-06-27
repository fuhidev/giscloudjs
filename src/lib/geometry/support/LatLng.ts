import { Accessor } from '../../core/Accessor';
import { EarthCRS } from '../../projections/crs/Earth.CRS';
import { NumberUtil } from '../../utils/number.util';

import { LatLngBounds } from './LatLngBounds';

export interface LatLngOptions {
  lat: number;
  lng: number;
  alt?: number;
}

export class LatLng extends Accessor {
  lat: number;
  lng: number;
  alt?: number;
  constructor(options: LatLngOptions) {
    super(options);
  }

  equals(target: LatLng, maxMargin?: number) {
    const margin = Math.max(
      Math.abs(this.lat - target.lat),
      Math.abs(this.lng - target.lng)
    );

    return margin <= (maxMargin === undefined ? 1.0e-9 : maxMargin);
  }
  // @method toString(): String
  // Returns a string representation of the point (for debugging purposes).
  toString(precision) {
    return (
      'LatLng(' +
      NumberUtil.formatNum(this.lat, precision) +
      ', ' +
      NumberUtil.formatNum(this.lng, precision) +
      ')'
    );
  }

  // @method distanceTo(otherLatLng: LatLng): Number
  // Returns the distance (in meters) to the given `LatLng` calculated using the [Spherical Law of Cosines](https://en.wikipedia.org/wiki/Spherical_law_of_cosines).
  distanceTo(other: LatLng) {
    return EarthCRS.distance(this, other);
  }

  // @method wrap(): LatLng
  // Returns a new `LatLng` object with the longitude wrapped so it's always between -180 and +180 degrees.
  wrap() {
    return new EarthCRS().wrapLatLng(this);
  }

  // @method toBounds(sizeInMeters: Number): LatLngBounds
  // Returns a new `LatLngBounds` object in which each boundary is `sizeInMeters/2` meters apart from the `LatLng`.
  toBounds(sizeInMeters) {
    const latAccuracy = (180 * sizeInMeters) / 40075017,
      lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);
    return new LatLngBounds(
      new LatLng({ lat: this.lat - latAccuracy, lng: this.lng - lngAccuracy }),
      new LatLng({ lat: this.lat + latAccuracy, lng: this.lng + lngAccuracy })
    );
  }

  clone() {
    return new LatLng({ lat: this.lat, lng: this.lng, alt: this.alt });
  }
}
