import { LatLng } from '../../geometry/support/LatLng';
import { CRS } from './CRS';

export class EarthCRS extends CRS {
  // Mean Earth Radius, as recommended for use by
  // the International Union of Geodesy and Geophysics,
  // see https://rosettacode.org/wiki/Haversine_formula
  public static readonly R = 6371000;
  constructor() {
    super();
    this.wrapLng = [-180, 180];
  }

  // distance between two geographical points using spherical law of cosines approximation
  distance(latlng1: LatLng, latlng2: LatLng) {
    const rad = Math.PI / 180,
      lat1 = latlng1.lat * rad,
      lat2 = latlng2.lat * rad,
      sinDLat = Math.sin(((latlng2.lat - latlng1.lat) * rad) / 2),
      sinDLon = Math.sin(((latlng2.lng - latlng1.lng) * rad) / 2),
      a =
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EarthCRS.R * c;
  }
}
