'use strict';

const colors = require('internal/util/colors');

const kNopLinesToCollapse = 5;

function printSimplePatienceDiff(diff) {
  let message = '';

  for (let diffIdx = diff.length - 1; diffIdx >= 0; diffIdx--) {
    const { type, value } = diff[diffIdx];
    if (type === 'insert') {
      message += `${colors.green}${value}${colors.white}`;
    } else if (type === 'delete') {
      message += `${colors.red}${value}${colors.white}`;
    } else {
      message += `${colors.white}${value}${colors.white}`;
    }
  }

  return `\n${message}`;
}

function printPatienceDiff(diff, simple = false) {
  let message = '';
  let skipped = false;
  let nopCount = 0;

  for (let diffIdx = 0; diffIdx < diff.length; diffIdx++) {
    const { type, value } = diff[diffIdx];
    const previousType = (diffIdx < 1) ? null : diff[diffIdx - 1].type;
    const typeChanged = previousType && (type !== previousType);

    if (typeChanged && previousType === 'nop') {
      // Avoid grouping if only one line would have been grouped otherwise
      if (nopCount === kNopLinesToCollapse + 1) {
        message += `${colors.white}  ${diff[diffIdx - 1].value}\n`;
      } else if (nopCount === kNopLinesToCollapse + 2) {
        message += `${colors.white}  ${diff[diffIdx - 2].value}\n`;
        message += `${colors.white}  ${diff[diffIdx - 1].value}\n`;
      } if (nopCount >= (kNopLinesToCollapse + 3)) {
        message += `${colors.blue}...${colors.white}\n`;
        message += `${colors.white}  ${diff[diffIdx - 1].value}\n`;
        skipped = true;
      }
      nopCount = 0;
    }

    if (type === 'insert') {
      message += `${colors.green}+${colors.white} ${value}\n`;
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

module.exports = { printPatienceDiff, printSimplePatienceDiff };
