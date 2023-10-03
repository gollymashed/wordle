import { LetterState, type WordleLetter } from "~/types/wordleTypes";

export const copyStringToClipboard = (string: string) => {
  const el = document.createElement("textarea");
  el.value = string;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
};

export const generateResultString = (grid: WordleLetter[][], score: number) => {
  let resultString = `Wordle ∞ ${score}/6\n\n`; // replace XXX and X/X with actual game number and score.
  for (let i = 0; i < score; i++) {
    if (grid[i] === undefined) break;
    let rowString = "";
    grid[i]!.forEach((wordleLetter) => {
      switch (wordleLetter.state) {
        case LetterState.CORRECT:
          rowString += "🟩";
          break;
        case LetterState.POSITION:
          rowString += "🟨";
          break;
        case LetterState.INCORRECT:
          rowString += "🟥";
          break;
        default:
          rowString += "⬜";
          break;
      }
    });
    resultString += rowString + "\n";
  }
  return resultString;
};

export const generateChallengeLink = (selectedWord: string) => {
    const obfuscatedWord = btoa(selectedWord);
    const url = `${window.location.origin}${window.location.pathname}?challenge=${obfuscatedWord}`;
    return url;
  };