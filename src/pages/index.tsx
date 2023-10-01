import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "react-query";

import Head from "next/head";

export default function Home() {
  const [words, setWords] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [submittedGuesses, setSubmittedGuesses] = useState<CellState[][][]>([]);

  type CellState = {
    letter: string;
    state: "correct" | "incorrect" | "wrong-position" | "";
  };

  // Initialize your state with proper typing:
  const [inputState, setInputState] = useState<CellState[][]>(
    Array.from({ length: 6 }, () =>
      Array<CellState>(5).fill({ letter: "", state: "" }),
    ),
  );

  const handleGuessSubmission = useCallback(() => {
    setSubmittedGuesses((prev) => [...prev, inputState]);
    setInputState(
      Array.from({ length: 6 }, () =>
        Array<CellState>(5).fill({ letter: "", state: "" }),
      ),
    );
  }, [inputState]);

  const [grid, setGrid] = useState<string[][]>(() => {
    const rows = 6;
    const cols = 5;
    return Array.from({ length: rows }, () => Array<string>(cols).fill(""));
  });

  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());

  const [cursor, setCursor] = useState<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (rowIdx: number, colIdx: number, value: string) => {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        newGrid[rowIdx]![colIdx] = value;
        return newGrid;
      });
    },
    [],
  );

  const [colLength, setColLength] = useState<number>(5); // Assuming the initial column length is 5

  const moveToNextInput = useCallback(
    (row: number, col: number) => {
      if (col < colLength - 1) {
        inputsRef.current[row * colLength + (col + 1)]?.focus();
      } else if (row < grid.length - 1) {
        inputsRef.current[(row + 1) * colLength]?.focus();
      }
    },
    [colLength, grid.length],
  );

  const moveToPrevInput = useCallback(
    (row: number, col: number) => {
      if (col > 0) {
        inputsRef.current[row * colLength + (col - 1)]?.focus();
      } else if (row > 0) {
        inputsRef.current[(row - 1) * colLength + (colLength - 1)]?.focus();
      }
    },
    [colLength],
  );

  const handleLetterClick = useCallback(
    (letter: string) => {
      const { row, col } = cursor;
      if (
        row < grid.length &&
        col < grid[0]!.length &&
        !inputState[row]![col]!.letter
      ) {
        // ensure that cell is empty before allowing to enter a letter

        let newState: CellState["state"] = ""; // explicitly type newState to avoid assignment errors

        const correctLetter = selectedWord.charAt(col); // assuming selectedWord is stored as string

        if (correctLetter === letter) newState = "correct";
        else if (selectedWord.includes(letter)) newState = "wrong-position";
        else newState = "incorrect";

        setInputState((prev) => {
          const copy = [...prev];
          copy[row]![col] = { letter, state: newState };
          return copy;
        });

        let nextRow = row;
        let nextCol = col + 1;

        if (col === grid[0]!.length - 1 && row < grid.length - 1) {
          nextRow++;
          nextCol = 0;
        }

        setCursor({ row: nextRow, col: nextCol });
      }
    },
    [cursor, grid, inputState, selectedWord],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { row, col } = cursor;
      if (
        /[a-zA-Z]/.test(e.key) &&
        e.key.length === 1 &&
        grid[row]![col] === "" // Additional condition to check if the current box is empty
      ) {
        e.preventDefault(); // Prevent default to stop lowercase input
        handleChange(row, col, e.key.toUpperCase());
        if (col < grid[0]!.length - 1 || row === grid.length - 1) {
          // Only move to the next cell if not at the end of a row, or if at the last row
          setCursor({ row, col: col < grid[0]!.length - 1 ? col + 1 : col });
        }
      } else if (
        e.key === "Enter" &&
        col === grid[0]!.length - 1 &&
        row < grid.length - 1 &&
        grid[row]![col] !== "" // Condition to check if the last box is not empty
      ) {
        // If Enter is pressed at the end of a row, move to the next row
        e.preventDefault();
        handleGuessSubmission();
        setCursor({ row: row + 1, col: 0 });
      } else if (e.key === "Backspace") {
        // Handle backspace key
        handleChange(row, col, "");
        if (col > 0) setCursor({ row, col: col - 1 });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cursor, grid, handleChange, handleGuessSubmission]);

  useEffect(() => {
    const { row, col } = cursor;
    inputsRef.current[row * grid[0]!.length + col]?.focus();
  }, [cursor, grid]);

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
        setWords(wordsList);

        // select a random word from the list
        const randomIndex = Math.floor(Math.random() * wordsList.length);
        setSelectedWord(wordsList[randomIndex] ?? ""); // Just to ensure there is no undefined
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
            Wordle
          </h1>
          <div className="grid grid-cols-5 grid-rows-6 gap-4">
            {inputState.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <input
                  key={`${rowIdx}-${colIdx}`}
                  ref={(el) =>
                    (inputsRef.current[rowIdx * grid[0]!.length + colIdx] = el)
                  }
                  className={`h-10 w-10 text-center ${
                    cell.state === "correct"
                      ? "bg-green-500"
                      : cell.state === "wrong-position"
                      ? "bg-orange-500"
                      : cell.state === "incorrect"
                      ? "bg-gray-700"
                      : "bg-white"
                  }`}
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
                  className={`key ${usedLetters.has(letter) ? "used-key" : ""}`}
                  onClick={() => handleLetterClick(letter)}
                  disabled={usedLetters.has(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="keyboard-row">
              {"ASDFGHJKL".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${usedLetters.has(letter) ? "used-key" : ""}`}
                  onClick={() => handleLetterClick(letter)}
                  disabled={usedLetters.has(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <div className="keyboard-row">
              <button
                className="key enter-key"
                onClick={() => {
                  handleGuessSubmission();
                  const { row, col } = cursor;
                  if (col === grid[0]!.length - 1 && row < grid.length - 1)
                    setCursor({ row: row + 1, col: 0 });
                }}
              >
                ↵
              </button>
              {"ZXCVBNM".split("").map((letter) => (
                <button
                  key={letter}
                  className={`key ${usedLetters.has(letter) ? "used-key" : ""}`}
                  onClick={() => handleLetterClick(letter)}
                  disabled={usedLetters.has(letter)}
                >
                  {letter}
                </button>
              ))}
              <button className="key backspace-key">&larr;</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
