'use strict';

const {
  ArrayPrototypePush,
  ArrayPrototypeSlice,
  StringPrototypeEndsWith,
} = primordials;

const colors = require('internal/util/colors');

const kNopLinesToCollapse = 5;

function areLinesEqual(actual, expected, checkCommaDisparity) {
  if (actual === expected) {
    return true;
  }
  if (checkCommaDisparity) {
    return `${actual},` === expected || actual === `${expected},`;
  }
  return false;
}

function patienceDiff(actual, expected, checkCommaDisparity = false) {
  // Recursively compute diff between actual[a...b) and expected[c...d)
  function diffSegment(a, b, c, d) {
    let result = [];
    if (a >= b && c >= d) {
      return result;
    }

    // Find unique common anchors in the current segments.
    const anchors = findAnchors(actual, expected, a, b, c, d, checkCommaDisparity);
    if (anchors.length === 0) {
      for (let j = c; j < d; j++) {
        ArrayPrototypePush(result, { __proto__: null, type: 'delete', value: expected[j] });
      }
      for (let i = a; i < b; i++) {
        ArrayPrototypePush(result, { __proto__: null, type: 'insert', value: actual[i] });
      }
      return result;
    }

    // Obtain the longest increasing subsequence (LIS) of anchors based on expected indices.
    const lis = longestIncreasingSequence(anchors);
    let lastA = a;
    let lastE = c;
    for (let k = 0; k < lis.length; k++) {
      const anchor = lis[k];
      result = result.concat(diffSegment(lastA, anchor.a, lastE, anchor.e));
      // For the common (nop) line, use the same logic as Myers: if checkCommaDisparity is true and the actual line doesn't end with a comma,
      // then take the expected value instead.
      const commonValue = (!checkCommaDisparity || StringPrototypeEndsWith(actual[anchor.a], ',')) ?
        actual[anchor.a] : expected[anchor.e];
      ArrayPrototypePush(result, { __proto__: null, type: 'nop', value: commonValue });
      lastA = anchor.a + 1;
      lastE = anchor.e + 1;
    }
    result = result.concat(diffSegment(lastA, b, lastE, d));
    return result;
  }

  // Find anchors in actual[a...b) and expected[c...d) that are unique in each.
  function findAnchors(actual, expected, a, b, c, d, checkCommaDisparity) {
    let anchors = [];
    for (let i = a; i < b; i++) {
      const lineA = actual[i];
      let countA = 0;
      for (let i2 = a; i2 < b; i2++) {
        if (areLinesEqual(actual[i2], lineA, checkCommaDisparity)) {
          countA++;
          if (countA > 1) break;
        }
      }
      if (countA !== 1) continue;
      let pos = -1;
      let countE = 0;
      for (let j = c; j < d; j++) {
        if (areLinesEqual(expected[j], lineA, checkCommaDisparity)) {
          countE++;
          pos = j;
          if (countE > 1) break;
        }
      }
      if (countE === 1) {
        anchors.push({ a: i, e: pos });
      }
    }
    return anchors;
  }

  // Compute the longest increasing subsequence (LIS) of anchors based on expected indices.
  function longestIncreasingSequence(anchors) {
    const n = anchors.length;
    const dp = new Array(n).fill(1);
    const prev = new Array(n).fill(-1);
    let maxLength = 0;
    let maxIndex = -1;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (anchors[j].e < anchors[i].e && dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1;
          prev[i] = j;
        }
      }
      if (dp[i] > maxLength) {
        maxLength = dp[i];
        maxIndex = i;
      }
    }
    const sequence = [];
    let index = maxIndex;
    while (index !== -1) {
      ArrayPrototypePush(sequence, anchors[index]);
      index = prev[index];
    }
    sequence.reverse();
    return sequence;
  }

  // Build the diff then reverse it to mimic the backtracking order expected by the printing functions.
  const diff = diffSegment(0, actual.length, 0, expected.length);
  return diff.reverse();
}

function printSimplePatienceDiff(diff) {
  let message = '';

  for (let diffIdx = diff.length - 1; diffIdx >= 0; diffIdx--) {
    const { type, value } = diff[diffIdx];
    let color = colors.white;

    if (type === 'insert') {
      color = colors.green;
    } else if (type === 'delete') {
      color = colors.red;
    }

    message += `${color}${value}${colors.white}`;
  }

  return `\n${message}`;
}

function printPatienceDiff(diff, operator) {
  let message = '';
  let skipped = false;
  let nopCount = 0;

  for (let diffIdx = diff.length - 1; diffIdx >= 0; diffIdx--) {
    const { type, value } = diff[diffIdx];
    const previousType = diffIdx < diff.length - 1 ? diff[diffIdx + 1].type : null;

    if (previousType === 'nop' && type !== previousType) {
      if (nopCount === kNopLinesToCollapse + 1) {
        message += `${colors.white}  ${diff[diffIdx + 1].value}\n`;
      } else if (nopCount === kNopLinesToCollapse + 2) {
        message += `${colors.white}  ${diff[diffIdx + 2].value}\n`;
        message += `${colors.white}  ${diff[diffIdx + 1].value}\n`;
      } else if (nopCount >= kNopLinesToCollapse + 3) {
        message += `${colors.blue}...${colors.white}\n`;
        message += `${colors.white}  ${diff[diffIdx + 1].value}\n`;
        skipped = true;
      }
      nopCount = 0;
    }

    if (type === 'insert') {
      if (operator === 'partialDeepStrictEqual') {
        message += `${colors.gray}${colors.hasColors ? ' ' : '+'} ${value}${colors.white}\n`;
      } else {
        message += `${colors.green}+${colors.white} ${value}\n`;
      }
    } else if (type === 'delete') {
      message += `${colors.red}-${colors.white} ${value}\n`;
    } else if (type === 'nop') {
      if (nopCount < kNopLinesToCollapse) {
        message += `${colors.white}  ${value}\n`;
      }
      nopCount++;
    }
  }

  message = message.trimEnd();

  return { message: `\n${message}`, skipped };
}

module.exports = { patienceDiff, printPatienceDiff, printSimplePatienceDiff };
