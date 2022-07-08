/*
 * @namespace LineUtil
 *
 * Various utility functions for polyline points processing, used by Leaflet internally to make polylines lightning-fast.
 */

import { Point } from '../../../geometry/Point';

// Simplify polyline with vertex reduction and Douglas-Peucker simplification.
// Improves rendering performance dramatically by lessening the number of points to draw.

// @function simplify(points: Point[], tolerance: Number): Point[]
// Dramatically reduces the number of points in a polyline while retaining
// its shape and returns a new array of simplified points, using the
// [Ramer-Douglas-Peucker algorithm](https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm).
// Used for a huge performance boost when processing/displaying Leaflet polylines for
// each zoom level and also reducing visual noise. tolerance affects the amount of
// simplification (lesser value means higher quality but slower and with more points).
// Also released as a separated micro-library [Simplify.js](https://mourner.github.io/simplify-js/).
function simplify(points, tolerance) {
  if (!tolerance || !points.length) {
    return points.slice();
  }

  const sqTolerance = tolerance * tolerance;

  // stage 1: vertex reduction
  points = _reducePoints(points, sqTolerance);

  // stage 2: Douglas-Peucker simplification
  points = _simplifyDP(points, sqTolerance);

  return points;
}

// @function pointToSegmentDistance(p: Point, p1: Point, p2: Point): Number
// Returns the distance between point `p` and segment `p1` to `p2`.
function pointToSegmentDistance(p, p1, p2) {
  return Math.sqrt(_sqClosestPointOnSegment(p, p1, p2, true) as number);
}

// @function closestPointOnSegment(p: Point, p1: Point, p2: Point): Number
// Returns the closest point from a point `p` on a segment `p1` to `p2`.
function closestPointOnSegment(p, p1, p2) {
  return _sqClosestPointOnSegment(p, p1, p2);
}

// Ramer-Douglas-Peucker simplification, see https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm
function _simplifyDP(points, sqTolerance) {
  const len = points.length,
    ArrayConstructor =
      typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
    markers = new ArrayConstructor(len);

  markers[0] = markers[len - 1] = 1;

  _simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

  const newPoints = [];

  for (let i = 0; i < len; i++) {
    if (markers[i]) {
      newPoints.push(points[i]);
    }
  }

  return newPoints;
}

function _simplifyDPStep(points, markers, sqTolerance, first, last) {
  let maxSqDist = 0,
    index,
    i,
    sqDist;

  for (i = first + 1; i <= last - 1; i++) {
    sqDist = _sqClosestPointOnSegment(
      points[i],
      points[first],
      points[last],
      true
    );

    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    markers[index] = 1;

    _simplifyDPStep(points, markers, sqTolerance, first, index);
    _simplifyDPStep(points, markers, sqTolerance, index, last);
  }
}

// reduce points that are too close to each other to a single point
function _reducePoints(points, sqTolerance) {
  const reducedPoints = [points[0]];
  let prev = 0;
  const len = points.length;
  for (let i = 1; i < len; i++) {
    if (_sqDist(points[i], points[prev]) > sqTolerance) {
      reducedPoints.push(points[i]);
      prev = i;
    }
  }
  if (prev < len - 1) {
    reducedPoints.push(points[len - 1]);
  }
  return reducedPoints;
}

let _lastCode;

// @function clipSegment(a: Point, b: Point, bounds: Bounds, useLastCode?: Boolean, round?: Boolean): Point[]|Boolean
// Clips the segment a to b by rectangular bounds with the
// [Cohen-Sutherland algorithm](https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm)
// (modifying the segment points directly!). Used by Leaflet to only show polyline
// points that are on the screen or near, increasing performance.
function clipSegment(a, b, bounds, useLastCode, round) {
  let codeA = useLastCode ? _lastCode : _getBitCode(a, bounds),
    codeB = _getBitCode(b, bounds),
    codeOut,
    p,
    newCode;

  // save 2nd code to avoid calculating it on the next segment
  _lastCode = codeB;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // if a,b is inside the clip window (trivial accept)
    if (!(codeA | codeB)) {
      return [a, b];
    }

    // if a,b is outside the clip window (trivial reject)
    if (codeA & codeB) {
      return false;
    }

    // other cases
    codeOut = codeA || codeB;
    p = _getEdgeIntersection(a, b, codeOut, bounds, round);
    newCode = _getBitCode(p, bounds);

    if (codeOut === codeA) {
      a = p;
      codeA = newCode;
    } else {
      b = p;
      codeB = newCode;
    }
  }
}

function _getEdgeIntersection(a, b, code, bounds, round) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    min = bounds.min,
    max = bounds.max;
  let x, y;

  if (code & 8) {
    // top
    x = a.x + (dx * (max.y - a.y)) / dy;
    y = max.y;
  } else if (code & 4) {
    // bottom
    x = a.x + (dx * (min.y - a.y)) / dy;
    y = min.y;
  } else if (code & 2) {
    // right
    x = max.x;
    y = a.y + (dy * (max.x - a.x)) / dx;
  } else if (code & 1) {
    // left
    x = min.x;
    y = a.y + (dy * (min.x - a.x)) / dx;
  }

  return new Point({ x, y, round });
}

function _getBitCode(p, bounds) {
  let code = 0;

  if (p.x < bounds.min.x) {
    // left
    code |= 1;
  } else if (p.x > bounds.max.x) {
    // right
    code |= 2;
  }

  if (p.y < bounds.min.y) {
    // bottom
    code |= 4;
  } else if (p.y > bounds.max.y) {
    // top
    code |= 8;
  }

  return code;
}

// square distance (to avoid unnecessary Math.sqrt calls)
function _sqDist(p1, p2) {
  const dx = p2.x - p1.x,
    dy = p2.y - p1.y;
  return dx * dx + dy * dy;
}

// return closest point on segment or distance to that point
function _sqClosestPointOnSegment(p, p1, p2, sqDist?) {
  let x = p1.x,
    y = p1.y,
    dx = p2.x - x,
    dy = p2.y - y,
    t;

  const dot = dx * dx + dy * dy;

  if (dot > 0) {
    t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return sqDist ? dx * dx + dy * dy : new Point({ x, y });
}

// @function isFlat(latlngs: LatLng[]): Boolean
// Returns true if `latlngs` is a flat array, false is nested.
function isFlat(latlngs) {
  return (
    !Array.isArray(latlngs[0]) ||
    (typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined')
  );
}

function _flat(latlngs) {
  console.warn(
    'Deprecated use of _flat, please use L.LineUtil.isFlat instead.'
  );
  return isFlat(latlngs);
}
export const lineUtil = {
  simplify,
  pointToSegmentDistance,
  closestPointOnSegment,
  clipSegment,
  _getEdgeIntersection,
  _getBitCode,
  _sqClosestPointOnSegment,
  isFlat,
  _flat,
};
