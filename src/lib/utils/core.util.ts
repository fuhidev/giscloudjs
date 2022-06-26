// @property lastId: Number
// Last unique ID used by [`stamp()`](#util-stamp)
let lastId = 0;

// @function stamp(obj: Object): Number
// Returns the unique ID of an object, assigning it one if it doesn't have it.
function stamp(obj) {
  if (!('_leaflet_id' in obj)) {
    obj['_leaflet_id'] = ++lastId;
  }
  return obj._leaflet_id;
}
export const coreUtil = {
  stamp,
};
