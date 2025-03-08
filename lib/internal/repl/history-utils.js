'use strict';

const {
  Array,
  ArrayPrototypeJoin,
  ArrayPrototypeReverse,
  ArrayPrototypeSlice,
  StringPrototypeSplit,
  StringPrototypeTrim,
} = primordials;

const kBrackets = { '{': 1, '[': 1, '(': 1, '}': -1, ']': -1, ')': -1 };

function parseHistoryFromFile(historyText, historySize) {
  const lines = StringPrototypeSplit(StringPrototypeTrim(historyText), '\n');
  let linesLength = lines.length;
  if (linesLength > historySize) linesLength = historySize;

  const commands = new Array(linesLength);
  let commandsIndex = 0;
  const currentCommand = new Array(linesLength);
  let currentCommandIndex = 0;
  let bracketCount = 0;
  let inString = false;
  let stringDelimiter = '';

  for (let lineIdx = linesLength - 1; lineIdx >= 0; lineIdx--) {
    const line = lines[lineIdx];
    currentCommand[currentCommandIndex++] = line;

    const lineLength = line.length;
    for (let charIdx = 0; charIdx < lineLength; charIdx++) {
      const char = line[charIdx];

      if ((char === "'" || char === '"' || char === '`') &&
          (charIdx === 0 || line.charCodeAt(charIdx - 1) !== 92)) { // 92 is '\\'
        if (!inString) {
          inString = true;
          stringDelimiter = char;
        } else if (char === stringDelimiter) {
          inString = false;
        }
      }

      if (!inString) {
        const bracketValue = kBrackets[char];
        if (bracketValue) bracketCount += bracketValue;
      }
    }

    if (!inString && bracketCount <= 0) {
      commands[commandsIndex++] = ArrayPrototypeJoin(
        ArrayPrototypeSlice(currentCommand, 0, currentCommandIndex),
        '\n',
      );
      currentCommandIndex = 0;
      bracketCount = 0;
    }
  }

  if (currentCommandIndex > 0) {
    commands[commandsIndex++] = ArrayPrototypeJoin(
      ArrayPrototypeSlice(currentCommand, 0, currentCommandIndex),
      '\n',
    );
  }

  return ArrayPrototypeReverse(ArrayPrototypeSlice(commands, 0, commandsIndex));
}

module.exports = { parseHistoryFromFile };
