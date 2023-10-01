import { useState, useEffect, useCallback, useRef } from "react";

import Head from "next/head";

export default function Home() {
  // Grid state
  enum LetterState {
    NONE = 0,
    INCORRECT = 1,
    POSITION = 2,
    CORRECT = 3,
  }
  type WordleLetter = {
    letter: string;
    state: LetterState;
  };
  const NUM_COLS = 5;
  const NUM_ROWS = 6;
  const INITIAL_GRID = Array.from({ length: NUM_ROWS }, () =>
    Array.from({ length: NUM_COLS }, () => ({
      letter: "",
      state: LetterState.NONE,
    })),
  );
  const INITIAL_CURSOR = { row: 0, col: 0 };
  const [grid, setGrid] = useState<WordleLetter[][]>(INITIAL_GRID);

  const [words, setWords] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<boolean>(false);
  const [isCompleteModalVisible, setCompleteModalVisible] = useState(false);

  const [cursor, setCursor] = useState<{ row: number; col: number }>(
    INITIAL_CURSOR,
  );

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/tabatkins/wordle-list/main/words",
        );
        if (!response.ok)
          throw new Error("Network response was not ok" + response.statusText);
        const text = await response.text();
        const wordsList = text.split("\n").filter(Boolean); // to remove any empty string if exists
        setWords(new Set(wordsList));
        setRandomWord(wordsList);
      } catch (error) {
        console.error(
          "There has been a problem with your fetch operation:",
          error,
        );
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void fetchWords();
  }, []);

  const setRandomWord = useCallback(
    (wordsList: string[]) => {
      const randomIndex = Math.floor(Math.random() * wordsList.length);
      setSelectedWord(wordsList[randomIndex] ?? "");
    },
    [words],
  );

  const handleChange = useCallback(
    (row: number, column: number, value: string) => {
      setGrid((prevGrid) => {
        if (
          row >= 0 &&
          row < prevGrid.length &&
          column >= 0 &&
          column < (prevGrid[row]?.length || 0)
        ) {
          const newGrid = [...prevGrid];
          const newRow = [...(newGrid[row] || [])];

          newRow[column] = {
            letter: value,
            state: newRow[column]?.state || LetterState.NONE,
          };
          newGrid[row] = newRow;

          return newGrid;
        }

        console.log("Invalid row or column");
        return prevGrid;
      });
    },
    [],
  );

  const insertLetterAndMoveCursor = useCallback(
    (row: number, col: number, letter: string) => {
      if (
        /[a-zA-Z]/.test(letter) &&
        letter.length === 1 &&
        grid[row]![col]!.letter === ""
      ) {
        handleChange(row, col, letter.toUpperCase());

        if (col < grid[0]!.length - 1 || row === grid.length - 1) {
          setCursor({ row, col: col < grid[0]!.length - 1 ? col + 1 : col });
        }
      }
    },
    [grid, handleChange],
  );

  const handleBackspace = useCallback(() => {
    if (completed) return;

    const { row, col: column } = cursor;

    if (grid[row]![column]!.letter !== "") {
      handleChange(row, column, "");
      return;
    }

    if (column > 0) {
      handleChange(row, column - 1, "");
      setCursor({ row, col: column - 1 });
    }
  }, [cursor, handleChange, grid]);

  const handleEnter = useCallback(() => {
    if (completed) return;

    const { row, col: column } = cursor;

    if (
      column === grid[0]!.length - 1 &&
      row < grid.length - 1 &&
      grid[row]![column]!.letter !== ""
    ) {
      handleGuessSubmission();
    }
  }, [cursor, grid]);

  const handleLetterClick = useCallback(
    (letter: string) => {
      const { row, col: column } = cursor;
      if (row < grid.length && column < grid[0]!.length) {
        insertLetterAndMoveCursor(row, column, letter);
      }
    },
    [cursor, grid, insertLetterAndMoveCursor],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      insertLetterAndMoveCursor(cursor.row, cursor.col, e.key);

      if (e.key === "Enter") {
        handleEnter();
      }

      if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cursor, grid, handleChange, handleEnter, handleBackspace]);

  useEffect(() => {
    focusCursor();
  }, [cursor]);

  const focusCursor = useCallback(() => {
    const { row, col } = cursor;
    inputsRef.current[row * grid[0]!.length + col]?.focus();
  }, [cursor]);

  const handleGuessSubmission = useCallback(() => {
    const currentGuess = grid[cursor.row]!.map((letter) => letter.letter).join(
      "",
    );

    if (currentGuess.length === 5 && words.has(currentGuess.toLowerCase())) {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        const newRow = [...(newGrid[cursor.row] || [])];

        newRow.forEach((wordleLetter, idx) => {
          const letter = wordleLetter.letter.toLowerCase();

          if (selectedWord[idx] === letter) {
            wordleLetter.state = LetterState.CORRECT;
          } else if (selectedWord.includes(letter)) {
            const selectedWordArr = Array.from(selectedWord);

            const isInMorePositions =
              selectedWordArr.filter(
                (swLetter, swIdx) =>
                  swLetter === letter &&
                  newRow[swIdx]?.state !== LetterState.CORRECT,
              ).length > 0;

            wordleLetter.state = isInMorePositions
              ? LetterState.POSITION
              : LetterState.INCORRECT;
          } else {
            wordleLetter.state = LetterState.INCORRECT;
          }
        });

        newGrid[cursor.row] = newRow;

        const isCompleted = newRow.every(
          (letter) => letter.state === LetterState.CORRECT,
        );

        setCompleted(isCompleted);

        if (isCompleted) {
          setCompleteModalVisible(true);
        } else {
          setCursor({ row: cursor.row + 1, col: 0 });
        }

        return newGrid;
      });
    } else {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        const newRow = [...(newGrid[cursor.row] || [])];

        newRow.forEach((letter, index) => {
          newRow[index] = {
            letter: "",
            state: LetterState.NONE,
          };
        });
        newGrid[cursor.row] = newRow;

        return newGrid;
      });
      setCursor({ row: cursor.row, col: 0 });
    }
  }, [cursor, grid, words]);

  function getBgClassByState(state: LetterState) {
    switch (state) {
      case LetterState.NONE:
        return "bg-purple-500";
      case LetterState.CORRECT:
        return "bg-green-500";
      case LetterState.POSITION:
        return "bg-yellow-500";
      case LetterState.INCORRECT:
        return "bg-gray-500";
      default:
        return "";
    }
  }

  function findHighestStateForLetter(letter: string) {
    let highestState = LetterState.NONE;
    for (let row of grid) {
      for (let cell of row) {
        if (cell.letter.toLowerCase() === letter.toLowerCase()) {
          if (cell.state > highestState) {
            highestState = cell.state;
          }
        }
      }
    }
    return highestState;
  }

  const generateResultString = () => {
    const score = cursor.row + 1;
    let resultString = `Wordle Unlimited ${score}/6\n\n`; // replace XXX and X/X with actual game number and score.
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

  const copyStringToClipboard = (string: string) => {
    const el = document.createElement("textarea");
    el.value = string;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  function Modal(onReset: () => void) {
    const handleCopy = () => {
      const resultString = generateResultString(); // get the result string
      copyStringToClipboard(resultString); // copy to clipboard
    };

    return (
      <div
        id="defaultModal"
        aria-hidden="false"
        className="fixed bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center"
      >
        <div className="relative max-h-full w-full max-w-2xl">
          <div className="relative rounded-lg bg-white shadow dark:bg-gray-700">
            <div className="flex items-start justify-between rounded-t border-b p-4 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Game Completed!
              </h3>
              <button
                type="button"
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
                onClick={() => setCompleteModalVisible(false)}
              >
                <svg
                  className="h-3 w-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
                <span className="sr-only">Close modal</span>
              </button>
            </div>
            <div className="flex flex-col items-center justify-center space-y-6 p-6">
              <p className="text-center text-base leading-relaxed text-gray-500 dark:text-gray-400">
                You got it! Would you like to play again?
              </p>
              <p
                className="text-center text-base text-gray-500 dark:text-gray-400"
                style={{ whiteSpace: "pre-line" }}
              >
                {generateResultString()}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 rounded-b border-t border-gray-200 p-6 dark:border-gray-600">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Copy Result
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                onClick={onReset}
              >
                Reset Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const resetGame = useCallback(() => {
    setGrid(INITIAL_GRID);
    setCursor(INITIAL_CURSOR);
    setRandomWord(Array.from(words));
    setCompleted(false);
    setCompleteModalVisible(false);
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error occurred while fetching words.</p>;

  return (
    <>
      <Head>
        <title>Wordle Unlimited</title>
        <meta name="description" content="Free unlimited wordle." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        className="justify-top flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c]"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="pb-10 text-xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Wordle Unlimited
          </h1>
          <div className="grid grid-cols-5 grid-rows-6 gap-4">
            {grid.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <input
                  key={`${rowIdx}-${colIdx}`}
                  ref={(el) =>
                    (inputsRef.current[rowIdx * grid[0]!.length + colIdx] = el)
                  }
                  className={`h-10 w-10 text-center ${getBgClassByState(
                    cell.state,
                  )}`}
                  maxLength={1}
                  value={cell.letter}
                  onChange={(e) => handleChange(rowIdx, colIdx, e.target.value)}
                  readOnly
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              )),
            )}
          </div>
          <div className="keyboard">
            <div className="keyboard-row">
              {"QWERTYUIOP".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(
                    findHighestStateForLetter(letter),
                  )}`}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="keyboard-row">
              {"ASDFGHJKL".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(
                    findHighestStateForLetter(letter),
                  )}`}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="keyboard-row">
              <button
                className="key enter-key bg-purple-500"
                onClick={() => handleEnter()}
              >
                ↵
              </button>
              {"ZXCVBNM".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(
                    findHighestStateForLetter(letter),
                  )}`}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
              <button
                className="key backspace-key bg-purple-500"
                onClick={() => handleBackspace()}
              >
                &larr;
              </button>
            </div>
          </div>
          {isCompleteModalVisible && (
            <Modal
              onClose={() => setCompleteModalVisible(false)}
              onReset={resetGame}
            />
          )}
        </div>
      </main>
    </>
  );
}
