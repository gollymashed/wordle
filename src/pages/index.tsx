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
  const [grid, setGrid] = useState<WordleLetter[][]>(
    Array.from({ length: NUM_ROWS }, () =>
      Array.from({ length: NUM_COLS }, () => ({
        letter: "",
        state: LetterState.NONE,
      })),
    ),
  );

  const [words, setWords] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());
  const [submittedGuesses, setSubmittedGuesses] = useState<WordleLetter[]>([]);
  const [completed, setCompleted] = useState<boolean>(false);

  const [cursor, setCursor] = useState<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });

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

        const randomIndex = Math.floor(Math.random() * wordsList.length);
        setSelectedWord(wordsList[randomIndex] ?? "");
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
    const { row, col: column } = cursor;
    handleChange(row, column, "");
    if (column > 0) setCursor({ row, col: column - 1 });
  }, [cursor, handleChange]);

  const handleEnter = useCallback(() => {
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
    const { row, col } = cursor;
    inputsRef.current[row * grid[0]!.length + col]?.focus();
  }, [cursor, grid]);

  const handleGuessSubmission = useCallback(() => {
    const currentGuess = grid[cursor.row]!.map((letter) => letter.letter).join(
      "",
    );

    if (currentGuess.length === 5 && words.has(currentGuess.toLowerCase())) {
      setSubmittedGuesses((prev) => [...prev, ...grid[cursor.row]!]);
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        const newRow = [...(newGrid[cursor.row] || [])];

        newRow.forEach((wordleLetter, idx) => {
          const letter = wordleLetter.letter.toLowerCase();

          if (selectedWord[idx] === letter) {
            wordleLetter.state = LetterState.CORRECT;
          } else if (selectedWord.includes(letter)) {
            const selectedWordArr = Array.from(selectedWord);

            // Check if the letter appears more times in the selected word than it does
            // in the correct position in the current row.
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

        return newGrid;
      });

      const isCompleted = grid[cursor.row]!.every(
        (letter) => letter.state === LetterState.CORRECT,
      );

      setCompleted(isCompleted);

      if (!isCompleted) {
        setCursor({ row: cursor.row + 1, col: 0 });
      }
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

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error occurred while fetching words.</p>;

  return (
    <>
      <Head>
        <title>Wordle Unlimited</title>
        <meta name="description" content="Free unlimited wordle." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="justify-top flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
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
                />
              )),
            )}
          </div>
          <div className="keyboard">
            <div className="keyboard-row">
              {"QWERTYUIOP".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(findHighestStateForLetter(letter))}`}
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
                  className={`key ${getBgClassByState(findHighestStateForLetter(letter))}`}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="keyboard-row">
              <button className="key enter-key bg-purple-500" onClick={() => handleEnter()}>
                ↵
              </button>
              {"ZXCVBNM".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(findHighestStateForLetter(letter))}`}
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
        </div>
      </main>
    </>
  );
}
