function indexOf(array: Array<any>, el) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === el) {
      return i;
    }
  }
  return -1;
}

export const ArrayUtil = {
  indexOf,
};
