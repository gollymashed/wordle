export enum LetterState {
  NONE = 0,
  INCORRECT = 1,
  POSITION = 2,
  CORRECT = 3,
}

export type WordleLetter = {
  letter: string;
  state: LetterState;
};
