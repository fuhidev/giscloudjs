import { Accessor } from '../core/Accessor';
import { Point } from './Point';

export interface TransformationOptions {
  a: number;
  b: number;
  c: number;
  d: number;
}
/*
 * @class Transformation
 * @aka L.Transformation
 *
 * Represents an affine transformation: a set of coefficients `a`, `b`, `c`, `d`
 * for transforming a point of a form `(x, y)` into `(a*x + b, c*y + d)` and doing
 * the reverse. Used by Leaflet in its projections code.
 *
 * @example
 *
 * ```js
 * var transformation = L.transformation(2, 5, -1, 10),
 * 	p = L.point(1, 2),
 * 	p2 = transformation.transform(p), //  L.point(7, 8)
 * 	p3 = transformation.untransform(p2); //  L.point(1, 2)
 * ```
 */
export class Transformation extends Accessor {
  a: number;
  b: number;
  c: number;
  d: number;
  constructor(options: TransformationOptions) {
    super(options);
  }
  // @method transform(point: Point, scale?: Number): Point
  // Returns a transformed point, optionally multiplied by the given scale.
  // Only accepts actual `L.Point` instances, not arrays.
  transform(point: Point, scale: number) {
    point = point.clone();
    scale = scale || 1;
    point.x = scale * (this.a * point.x + this.b);
    point.y = scale * (this.c * point.y + this.d);
    return point;
  }

  // @method untransform(point: Point, scale?: Number): Point
  // Returns the reverse transformation of the given point, optionally divided
  // by the given scale. Only accepts actual `L.Point` instances, not arrays.
  untransform(point: Point, scale: number) {
    scale = scale || 1;
    return new Point({
      x: (point.x / scale - this.b) / this.a,
      y: (point.y / scale - this.d) / this.c,
    });
  }
}
