// @function formatNum(num: Number, precision?: Number|false): Number
// Returns the number `num` rounded with specified `precision`.
// The default `precision` value is 6 decimal places.
// `false` can be passed to skip any processing (can be useful to avoid round-off errors).
function formatNum(num: number, precision?: number) {
  if (precision === undefined) {
    return num;
  }
  const pow = Math.pow(10, precision === undefined ? 6 : precision);
  return Math.round(num * pow) / pow;
}

// @function wrapNum(num: Number, range: Number[], includeMax?: Boolean): Number
// Returns the number `num` modulo `range` in such a way so it lies within
// `range[0]` and `range[1]`. The returned value will be always smaller than
// `range[1]` unless `includeMax` is set to `true`.
function wrapNum(x: number, range: [number, number], includeMax?: boolean) {
  const max = range[1],
    min = range[0],
    d = max - min;
  return x === max && includeMax ? x : ((((x - min) % d) + d) % d) + min;
}

export const NumberUtil = {
  formatNum,
  wrapNum,
};
