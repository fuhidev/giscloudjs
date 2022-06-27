import { Accessor } from '../../core/Accessor';
import { LatLng } from './LatLng';

export interface LatLngBoundsOptions {
  southWest: LatLng;
  northEast: LatLng;
}

export class LatLngBounds extends Accessor {
  southWest: LatLng;
  northEast: LatLng;
  constructor(options: LatLngBoundsOptions) {
    super(options);
    const latlngs: LatLng[] = [options.southWest, options.northEast];

    for (let i = 0, len = latlngs.length; i < len; i++) {
      this.extend(latlngs[i]);
    }
  }

  extend(obj: LatLng | LatLngBounds) {
    const sw = this.southWest,
      ne = this.northEast;
    let sw2: LatLng, ne2: LatLng;

    if (obj instanceof LatLng) {
      sw2 = obj;
      ne2 = obj;
    } else if (obj instanceof LatLngBounds) {
      sw2 = obj.southWest;
      ne2 = obj.northEast;

      if (!sw2 || !ne2) {
        return this;
      }
    } else {
      return obj ? this.extend(obj) : this;
    }

    if (!sw && !ne) {
      this.southWest = new LatLng({ lat: sw2.lat, lng: sw2.lng });
      this.northEast = new LatLng({ lat: ne2.lat, lng: ne2.lng });
    } else {
      sw.lat = Math.min(sw2.lat, sw.lat);
      sw.lng = Math.min(sw2.lng, sw.lng);
      ne.lat = Math.max(ne2.lat, ne.lat);
      ne.lng = Math.max(ne2.lng, ne.lng);
    }

    return this;
  }
  // @method pad(bufferRatio: Number): LatLngBounds
  // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
  // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
  // Negative values will retract the bounds.
  pad(bufferRatio: number): LatLngBounds {
    const sw = this.southWest,
      ne = this.northEast,
      heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
      widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

    return new LatLngBounds(
      new LatLng({ lat: sw.lat - heightBuffer, lng: sw.lng - widthBuffer }),
      new LatLng({ lat: ne.lat + heightBuffer, lng: ne.lng + widthBuffer })
    );
  }

  // @method getCenter(): LatLng
  // Returns the center point of the bounds.
  getCenter(): LatLng {
    return new LatLng({
      lat: (this.southWest.lat + this.northEast.lat) / 2,
      lng: (this.southWest.lng + this.northEast.lng) / 2,
    });
  }

  // @method getSouthWest(): LatLng
  // Returns the south-west point of the bounds.
  getSouthWest() {
    return this.southWest;
  }

  // @method getNorthEast(): LatLng
  // Returns the north-east point of the bounds.
  getNorthEast() {
    return this.northEast;
  }

  // @method getNorthWest(): LatLng
  // Returns the north-west point of the bounds.
  getNorthWest() {
    return new LatLng({ lat: this.getNorth(), lng: this.getWest() });
  }

  // @method getSouthEast(): LatLng
  // Returns the south-east point of the bounds.
  getSouthEast() {
    return new LatLng({ lat: this.getSouth(), lng: this.getEast() });
  }

  // @method getWest(): Number
  // Returns the west longitude of the bounds
  getWest() {
    return this.southWest.lng;
  }

  // @method getSouth(): Number
  // Returns the south latitude of the bounds
  getSouth() {
    return this.southWest.lat;
  }

  // @method getEast(): Number
  // Returns the east longitude of the bounds
  getEast() {
    return this.northEast.lng;
  }

  // @method getNorth(): Number
  // Returns the north latitude of the bounds
  getNorth() {
    return this.northEast.lat;
  }

  // @method contains(otherBounds: LatLngBounds): Boolean
  // Returns `true` if the rectangle contains the given one.

  // @alternative
  // @method contains (latlng: LatLng): Boolean
  // Returns `true` if the rectangle contains the given point.
  contains(obj: LatLng | LatLngBounds) {
    const sw = this.southWest,
      ne = this.northEast;
    let sw2: LatLng, ne2: LatLng;

    if (obj instanceof LatLngBounds) {
      sw2 = obj.getSouthWest();
      ne2 = obj.getNorthEast();
    } else {
      sw2 = ne2 = obj;
    }

    return (
      sw2.lat >= sw.lat &&
      ne2.lat <= ne.lat &&
      sw2.lng >= sw.lng &&
      ne2.lng <= ne.lng
    );
  }

  // @method intersects(otherBounds: LatLngBounds): Boolean
  // Returns `true` if the rectangle intersects the given bounds. Two bounds intersect if they have at least one point in common.
  intersects(bounds: LatLngBounds) {
    const sw = this.southWest,
      ne = this.northEast,
      sw2 = bounds.getSouthWest(),
      ne2 = bounds.getNorthEast(),
      latIntersects = ne2.lat >= sw.lat && sw2.lat <= ne.lat,
      lngIntersects = ne2.lng >= sw.lng && sw2.lng <= ne.lng;

    return latIntersects && lngIntersects;
  }

  // @method overlaps(otherBounds: LatLngBounds): Boolean
  // Returns `true` if the rectangle overlaps the given bounds. Two bounds overlap if their intersection is an area.
  overlaps(bounds: LatLngBounds) {
    const sw = this.southWest,
      ne = this.northEast,
      sw2 = bounds.getSouthWest(),
      ne2 = bounds.getNorthEast(),
      latOverlaps = ne2.lat > sw.lat && sw2.lat < ne.lat,
      lngOverlaps = ne2.lng > sw.lng && sw2.lng < ne.lng;

    return latOverlaps && lngOverlaps;
  }

  // @method toBBoxString(): String
  // Returns a string with bounding box coordinates in a 'southwest_lng,southwest_lat,northeast_lng,northeast_lat' format. Useful for sending requests to web services that return geo data.
  toBBoxString() {
    return [
      this.getWest(),
      this.getSouth(),
      this.getEast(),
      this.getNorth(),
    ].join(',');
  }

  // @method equals(otherBounds: LatLngBounds, maxMargin?: Number): Boolean
  // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
  equals(bounds: LatLngBounds): boolean {
    if (!bounds) {
      return false;
    }

    return (
      this.southWest.equals(bounds.getSouthWest()) &&
      this.northEast.equals(bounds.getNorthEast())
    );
  }

  // @method isValid(): Boolean
  // Returns `true` if the bounds are properly initialized.
  isValid(): boolean {
    return !!(this.southWest && this.northEast);
  }
}
