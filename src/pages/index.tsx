import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import wordleWords from "../content/wordleWords";
import wordleAnswers from "../content/wordleAnswers";

import Head from "next/head";
import { Modal } from "~/components/gameCompletedModal";
import { LetterState, type WordleLetter } from "~/types/wordleTypes";

export default function Home() {
  const router = useRouter();
  const NUM_COLS = 5;
  const NUM_ROWS = 6;
  const INITIAL_GRID = Array.from({ length: NUM_ROWS }, () =>
    Array.from({ length: NUM_COLS }, () => ({
      letter: "",
      state: LetterState.NONE,
    })),
  );
  const INITIAL_CURSOR = useMemo(() => ({ row: 0, col: 0 }), []);

  const [grid, setGrid] = useState<WordleLetter[][]>(INITIAL_GRID);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [completed, setCompleted] = useState<boolean>(false);
  const [isGameCompletedModalVisible, setGameCompletedModalVisible] =
    useState(false);
  const [cursor, setCursor] = useState<{ row: number; col: number }>(
    INITIAL_CURSOR,
  );

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const setRandomWord = useCallback((wordsList: string[]) => {
    const randomIndex = Math.floor(Math.random() * wordsList.length);
    setSelectedWord(wordsList[randomIndex] ?? "");
  }, []);

  const words = useRef(new Set(wordleWords));

  useEffect(() => {
    const obfuscatedWord = router.query.challenge as string;
    if (obfuscatedWord) {
      const decodedWord = atob(obfuscatedWord);
      if (words.current.has(decodedWord)) {
        setSelectedWord(decodedWord);
        return;
      }
    }
    setRandomWord(wordleAnswers);
  }, [router.query.challenge, setRandomWord, setSelectedWord]); // Dependency on wordsRef is not needed as it does not cause re-renders

  const handleChange = useCallback(
    (row: number, column: number, value: string) => {
      setGrid((prevGrid) => {
        if (
          row >= 0 &&
          row < prevGrid.length &&
          column >= 0 &&
          column < (prevGrid[row]?.length ?? 0)
        ) {
          const newGrid = [...prevGrid];
          const newRow = [...(newGrid[row] ?? [])];

          newRow[column] = {
            letter: value,
            state: newRow[column]?.state ?? LetterState.NONE,
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

        if (col < grid[0]!.length - 1 ?? row === grid.length - 1) {
          setCursor({ row, col: col < grid[0]!.length - 1 ? col + 1 : col });
        }
      }
    },
    [grid, handleChange],
  );

  const handleGuessSubmission = useCallback(() => {
    const currentGuess = grid[cursor.row]!.map((letter) => letter.letter).join(
      "",
    );

    if (
      currentGuess.length === 5 &&
      words.current.has(currentGuess.toLowerCase())
    ) {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        const newRow = [...(newGrid[cursor.row] ?? [])];

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
          setGameCompletedModalVisible(true);
        } else {
          setCursor({ row: cursor.row + 1, col: 0 });
        }

        return newGrid;
      });
    } else {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        const newRow = [...(newGrid[cursor.row] ?? [])];

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
  }, [cursor, grid, words, selectedWord]);

  const backspaceHandler = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault(); // Prevent default to avoid any double firing
    handleBackspace();
  };

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
  }, [cursor, handleChange, grid, completed]);

  const enterHandler = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    handleEnter();
  };

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
  }, [cursor, grid, completed, handleGuessSubmission]);

  const performLetterAction = useCallback(
    (letter: string) => {
      const { row, col: column } = cursor;
      if (row < grid.length && column < grid[0]!.length) {
        insertLetterAndMoveCursor(row, column, letter);
      }
    },
    [cursor, insertLetterAndMoveCursor, grid],
  );

  const letterHandler = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      const letter = event.currentTarget.textContent ?? "";
      performLetterAction(letter);
    },
    [performLetterAction],
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
  }, [
    cursor,
    grid,
    handleChange,
    handleEnter,
    handleBackspace,
    insertLetterAndMoveCursor,
  ]);

  const focusCursor = useCallback(() => {
    const { row, col } = cursor;
      setSelectedCell({ row, col });
  }, [cursor]);

  useEffect(() => {
    focusCursor();
  }, [cursor, focusCursor]);

  useEffect(() => {
    focusCursor();
  }, [focusCursor]);

  function getBgClassByState(state: LetterState) {
    switch (state) {
      case LetterState.NONE:
        return "bg-light";
      case LetterState.CORRECT:
        return "bg-green";
      case LetterState.POSITION:
        return "bg-orange";
      case LetterState.INCORRECT:
        return "bg-red";
      default:
        return "";
    }
  }

  function findHighestStateForLetter(letter: string) {
    let highestState = LetterState.NONE;
    for (const row of grid) {
      for (const cell of row) {
        if (cell.letter.toLowerCase() === letter.toLowerCase()) {
          if (cell.state > highestState) {
            highestState = cell.state;
          }
        }
      }
    }
    return highestState;
  }

  const resetGame = useCallback(() => {
    setGrid(INITIAL_GRID);
    setCursor(INITIAL_CURSOR);
    setRandomWord(wordleAnswers);
    setCompleted(false);
    setGameCompletedModalVisible(false);
  }, [INITIAL_GRID, INITIAL_CURSOR, setRandomWord]);

  return (
    <>
      <Head>
        <title>Wordle ∞</title>
        <meta name="description" content="Free ∞ wordle." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        className="justify-top from-dark to-dark_accent flex h-screen flex-col items-center overflow-scroll bg-gradient-to-b"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="justify-top container flex h-screen max-w-lg flex-col items-center gap-4 p-4">
          <h1 className="text-medium font-mono text-2xl font-bold tracking-tight">
            wordle ∞
          </h1>
          <div className="grid grid-rows-6 gap-2 px-8">
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-5 gap-2">
                {row.map((cell, colIdx) => (
                  <input
                    key={`${rowIdx}-${colIdx}`}
                    ref={(el) =>
                      (inputsRef.current[rowIdx * grid[0]!.length + colIdx] =
                        el)
                    }
                    className={`cell ${
                      rowIdx === selectedCell?.row &&
                      colIdx === selectedCell?.col
                        ? "selected"
                        : ""
                    } ${getBgClassByState(cell.state)}`}
                    maxLength={1}
                    value={cell.letter}
                    onChange={(e) =>
                      handleChange(rowIdx, colIdx, e.target.value)
                    }
                    readOnly
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="keyboard">
            <div className="keyboard-row">
              {"QWERTYUIOP".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(
                    findHighestStateForLetter(letter),
                  )}`}
                  onClick={letterHandler}
                  onTouchEnd={letterHandler}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="keyboard-row">
              <div className="flex-1"></div>
              {"ASDFGHJKL".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(
                    findHighestStateForLetter(letter),
                  )}`}
                  onClick={letterHandler}
                  onTouchEnd={letterHandler}
                >
                  {letter}
                </button>
              ))}
              <div className="flex-1"></div>
            </div>
            <div className="keyboard-row">
              <button
                className="key backspace-key bg-medium"
                onClick={backspaceHandler}
              >
                &larr;
              </button>
              {"ZXCVBNM".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${getBgClassByState(
                    findHighestStateForLetter(letter),
                  )}`}
                  onClick={letterHandler}
                  onTouchEnd={letterHandler}
                >
                  {letter}
                </button>
              ))}
              <button
                className="key enter-key bg-medium"
                onClick={enterHandler}
              >
                ↵
              </button>
            </div>
          </div>
          {isGameCompletedModalVisible && (
            <Modal
              onClose={() => setGameCompletedModalVisible(false)}
              onReset={resetGame}
              selectedWord={selectedWord}
              grid={grid}
              score={cursor.row + 1}
            />
          )}
        </div>
      </main>
    </>
  );
}
