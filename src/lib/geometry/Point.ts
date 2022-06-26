/*
 * @class Point
 * @aka L.Point
 *
 * Represents a point with `x` and `y` coordinates in pixels.
 *
 * @example
 *
 * ```js
 * var point = L.point(200, 300);
 * ```
 *
 * All Leaflet methods and options that accept `Point` objects also accept them in a simple Array form (unless noted otherwise), so these lines are equivalent:
 *
 * ```js
 * map.panBy([200, 300]);
 * map.panBy(L.point(200, 300));
 * ```
 *
 * Note that `Point` does not inherit from Leaflet's `Class` object,
 * which means new classes can't inherit from it, and new methods
 * can't be added to it with the `include` function.
 */

import { numberUtil } from '../utils/number.util';

import { Geometry } from './Geometry';

export interface PointOptions {
  x: number;
  y: number;
}

export class Point extends Geometry {
  // @property x: Number; The `x` coordinate of the point
  x: number;
  // @property y: Number; The `y` coordinate of the point
  y: number;
  constructor(options: PointOptions) {
    super();
    this.x = options.x;
    this.y = options.y;
  }

  // @method clone(): Point
  // Returns a copy of the current point.
  clone(): Point {
    return new Point({ x: this.x, y: this.y });
  }

  // @method add(otherPoint: Point): Point
  // Returns the result of addition of the current and the given points.
  add(point: Point) {
    const target = this.clone();
    target.x += point.x;
    target.y += point.y;
    return target;
  }

  // @method subtract(otherPoint: Point): Point
  // Returns the result of subtraction of the given point from the current.
  subtract(point: Point) {
    const target = this.clone();
    target.x -= point.x;
    target.y -= point.y;
    return target;
  }

  // @method divideBy(num: Number): Point
  // Returns the result of division of the current point by the given number.
  divideBy(num: number) {
    const target = this.clone();
    target.x /= num;
    target.y /= num;
    return target;
  }

  // @method multiplyBy(num: Number): Point
  // Returns the result of multiplication of the current point by the given number.
  multiplyBy(num: number) {
    const target = this.clone();
    target.x *= num;
    target.y *= num;
    return target;
  }

  // @method scaleBy(scale: Point): Point
  // Multiply each coordinate of the current point by each coordinate of
  // `scale`. In linear algebra terms, multiply the point by the
  // [scaling matrix](https://en.wikipedia.org/wiki/Scaling_%28geometry%29#Matrix_representation)
  // defined by `scale`.
  scaleBy(point: Point) {
    return new Point({ x: this.x * point.x, y: this.y * point.y });
  }

  // @method unscaleBy(scale: Point): Point
  // Inverse of `scaleBy`. Divide each coordinate of the current point by
  // each coordinate of `scale`.
  unscaleBy(point) {
    return new Point({ x: this.x / point.x, y: this.y / point.y });
  }

  // @method distanceTo(otherPoint: Point): Number
  // Returns the cartesian distance between the current and the given points.
  distanceTo(point: Point) {
    const x = point.x - this.x,
      y = point.y - this.y;

    return Math.sqrt(x * x + y * y);
  }

  // @method equals(otherPoint: Point): Boolean
  // Returns `true` if the given point has the same coordinates.
  equals(point: Point) {
    return point.x === this.x && point.y === this.y;
  }

  // @method contains(otherPoint: Point): Boolean
  // Returns `true` if both coordinates of the given point are less than the corresponding current point coordinates (in absolute values).
  contains(point: Point) {
    return (
      Math.abs(point.x) <= Math.abs(this.x) &&
      Math.abs(point.y) <= Math.abs(this.y)
    );
  }

  // @method toString(): String
  // Returns a string representation of the point for debugging purposes.
  toString() {
    return (
      'Point(' +
      numberUtil.formatNum(this.x) +
      ', ' +
      numberUtil.formatNum(this.y) +
      ')'
    );
  }
}
