import { LatLng } from '../lib/geometry';
import { TileLayer } from '../lib/layers';
import { DMap } from '../lib/map';

const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  osmAttrib =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  osm = new TileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib });

new DMap('map')
  .setView(
    new LatLng({
      lng: 50.5,
      lat: 30.51,
    }),
    15
  )
  .addLayer(osm);
