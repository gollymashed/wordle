import { useState, useEffect, useCallback, useRef } from "react";

import Head from "next/head";

export default function Home() {
  // Grid state
  type WordleLetter = {
    letter: string;
    state: "none" | "correct" | "incorrect" | "wrong-position";
  };
  const NUM_COLS = 5;
  const NUM_ROWS = 6;
  const [grid, setGrid] = useState<WordleLetter[][]>(
    Array.from({ length: NUM_ROWS }, () =>
      Array.from({ length: NUM_COLS }, () => ({ letter: "", state: "none" })),
    ),
  );

  const [words, setWords] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());
  const [submittedGuesses, setSubmittedGuesses] = useState<WordleLetter[]>([]);

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
            state: newRow[column]?.state || "none",
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
      setCursor({ row: cursor.row + 1, col: 0 });
    } else {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        const newRow = [...(newGrid[cursor.row] || [])];

        newRow.forEach((letter, index) => {
          newRow[index] = {
            letter: "",
            state: "none",
          };
        });
        newGrid[cursor.row] = newRow;

        return newGrid;
      });
      setCursor({ row: cursor.row, col: 0 });
    }
  }, [cursor, grid, words]);

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
                  className="h-10 w-10 text-center"
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
                  className="key"
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
                  className="key"
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="keyboard-row">
              <button className="key enter-key" onClick={() => handleEnter()}>
                ↵
              </button>
              {"ZXCVBNM".split("").map((letter) => (
                <button
                  key={letter}
                  className="key"
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
              <button
                className="key backspace-key"
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
