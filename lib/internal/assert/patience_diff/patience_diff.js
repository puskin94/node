'use strict';

const {
  ArrayPrototypePush,
  MapPrototypeGet,
  MapPrototypeHas,
  MapPrototypeSet,
  SafeMap,
  StringPrototypeCharAt,
  StringPrototypeSlice,
} = primordials;

function normalizeLine(line) {
  const len = line.length;
  return StringPrototypeCharAt(line, len - 1) === ',' ? StringPrototypeSlice(line, 0, len - 1) : line;
}

function mapGetLine(map, line, checkCommaDisparity) {
  if (checkCommaDisparity) {
    const normalizedLine = normalizeLine(line);
    const normalizedWithComma = `${line},`;
    return MapPrototypeGet(map, line) ||
      MapPrototypeGet(map, normalizedLine) ||
      MapPrototypeGet(map, normalizedWithComma);
  }
  return MapPrototypeGet(map, line);
}

function mapSetLine(map, line, value, checkCommaDisparity) {
  if (checkCommaDisparity) {
    const normalizedLine = normalizeLine(line);
    const normalizedWithComma = `${line},`;
    if (!MapPrototypeHas(map, line) &&
      !MapPrototypeHas(map, normalizedLine) &&
      !MapPrototypeHas(map, normalizedWithComma)) {
      MapPrototypeSet(map, line, value);
    }
  } else if (!MapPrototypeHas(map, line)) {
    MapPrototypeSet(map, line, value);
  }
}

function getUniqueCommonLines(actual, expected, checkCommaDisparity) {
  const aMap = new SafeMap();
  const bMap = new SafeMap();
  const common = [];

  for (let index = 0; index < actual.length; index++) {
    const line = actual[index];
    mapSetLine(aMap, line, [index], checkCommaDisparity);
  }

  for (let index = 0; index < expected.length; index++) {
    const line = expected[index];
    mapSetLine(bMap, line, [index], checkCommaDisparity);
  }

  for (const { 0: line, 1: aIndices } of aMap) {
    if (aIndices.length === 1) {
      const bIndices = mapGetLine(bMap, line, checkCommaDisparity);
      if (bIndices && bIndices.length === 1) {
        ArrayPrototypePush(common, { line, aIndex: aIndices[0], bIndex: bIndices[0] });
      }
    }
  }

  return common.sort((x, y) => x.aIndex - y.aIndex);
}

function mergeAdjacentChanges(diff) {
  const merged = [];
  let i = 0;
  const len = diff.length;

  while (i < len) {
    const current = diff[i];
    const next = diff[i + 1];

    if (next && current.type === 'insert' && next.type === 'delete' && current.value === next.value) {
      ArrayPrototypePush(merged, { type: 'nop', value: current.value });
      i += 2;
    } else {
      ArrayPrototypePush(merged, current);
      i++;
    }
  }

  return merged;
}

function patienceDiff(actual, expected, checkCommaDisparity = false) {
  const common = getUniqueCommonLines(actual, expected, checkCommaDisparity);
  const result = [];
  let aIndex = 0;
  let bIndex = 0;

  for (let commonIdx = 0, len = common.length; commonIdx < len; commonIdx++) {
    const { line, aIndex: commonAIndex, bIndex: commonBIndex } = common[commonIdx];

    while (aIndex < commonAIndex) {
      ArrayPrototypePush(result, { __proto__: null, type: 'insert', value: actual[aIndex++] });
    }

    while (bIndex < commonBIndex) {
      ArrayPrototypePush(result, { __proto__: null, type: 'delete', value: expected[bIndex++] });
    }

    ArrayPrototypePush(result, { __proto__: null, type: 'nop', value: line });
    aIndex++;
    bIndex++;
  }

  while (aIndex < actual.length) {
    ArrayPrototypePush(result, { __proto__: null, type: 'insert', value: actual[aIndex++] });
  }

  while (bIndex < expected.length) {
    ArrayPrototypePush(result, { __proto__: null, type: 'delete', value: expected[bIndex++] });
  }

  return mergeAdjacentChanges(result);
}

module.exports = { patienceDiff };
