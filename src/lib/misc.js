/**
 * lowerBound:
 *
 * @template T, [K=T]
 * @param {readonly T[]} array an array or array-like object, already sorted
 *         according to `cmp`
 * @param {K} val the value to add
 * @param {(a: T, val: K) => number} cmp a comparator (or undefined to compare as numbers)
 * @returns {number}
 *
 * Returns the position of the first element that is not
 * lower than `val`, according to `cmp`.
 * That is, returns the first position at which it
 * is possible to insert val without violating the
 * order.
 *
 * This is quite like an ordinary binary search, except
 * that it doesn't stop at first element comparing equal.
 */
function lowerBound(array, val, cmp) {
  let min, max, mid, v;
  cmp ||= (a, b) => a - b;

  if (array.length === 0) return 0;

  min = 0;
  max = array.length;
  while (min < max - 1) {
    mid = Math.floor((min + max) / 2);
    v = cmp(array[mid], val);

    if (v < 0) min = mid + 1;
    else max = mid;
  }

  return min === max || cmp(array[min], val) < 0 ? max : min;
}

/**
 * insertSorted:
 *
 * @template T, [K=T]
 * @param {T[]} array an array sorted according to `cmp`
 * @param {K} val a value to insert
 * @param {(a: T, val: K) => number} cmp the sorting function
 * @returns {number}
 *
 * Inserts `val` into `array`, preserving the
 * sorting invariants.
 *
 * Returns the position at which it was inserted
 */
export function insertSorted(array, val, cmp) {
  let pos = lowerBound(array, val, cmp);
  array.splice(pos, 0, val);

  return pos;
}
