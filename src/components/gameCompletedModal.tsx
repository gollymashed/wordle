import React from "react";
import {
  copyStringToClipboard,
  generateChallengeLink,
  generateResultString,
} from "~/helpers/stringHelpers";
import { type WordleLetter } from "~/types/wordleTypes";

export function Modal({
  onReset,
  onClose,
  selectedWord,
  grid,
  score,
  success,
}: {
  onReset: () => void;
  onClose: () => void;
  selectedWord: string;
  grid: WordleLetter[][];
  score: number;
  success: boolean;
}) {
  const handleCopyResult = () => {
    const url = generateChallengeLink(selectedWord);
    const resultString =
      generateResultString(grid, score) +
      "\n" +
      "Try and beat my score: " +
      url;
    copyStringToClipboard(resultString); // copy to clipboard
  };

  const handleCopyChallengeLink = () => {
    const url = generateChallengeLink(selectedWord);
    copyStringToClipboard(url); // copy to clipboard
  };

  return (
    <div
      id="defaultModal"
      aria-hidden="false"
      className="fixed bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center"
    >
      <div className="relative max-h-full w-full max-w-2xl px-4">
        <div className="relative rounded-lg bg-dark_accent shadow">
          <div className="border-gray-600 flex items-start justify-between rounded-t border-b p-4">
            <h3 className="text-xl font-semibold text-[#D9D9D9]">
              Game Completed!
            </h3>
            <button
              type="button"
              className="bg-transparent text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              onClick={onClose}
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
            <p className="text-center text-base leading-relaxed text-[#efefef]">
              {success ? "You got it!" : "Better luck next time!"}
              <br />
              Would you like to play again?
            </p>
            <p className="text-[#efefef] rounded-2xl px-5 py-2.5 text-center text-md font-medium outline-dashed outline-light">
              {selectedWord}
            </p>
            <p
              className="text-center text-base text-[#efefef]"
              style={{ whiteSpace: "pre-line" }}
            >
              {generateResultString(grid, score)}
            </p>
            <p
              className="cursor-copy text-center text-xs text-[#c0c0c0] hover:text-[#939393]"
              onClick={handleCopyChallengeLink}
            >
              {generateChallengeLink(selectedWord)}
            </p>
          </div>

          <div className="border-gray-600 flex items-center justify-center space-x-2 rounded-b border-t p-6">
            <button
              type="button"
              onClick={handleCopyResult}
              className="text-white rounded-lg bg-medium px-5 py-2.5 text-center text-sm font-bold hover:bg-light focus:outline-none focus:ring-4 focus:ring-[#CDACFA]"
            >
              Copy Result
            </button>
            <button
              type="button"
              className="text-white rounded-lg bg-medium px-5 py-2.5 text-center text-sm font-bold hover:bg-light focus:outline-none focus:ring-4 focus:ring-[#CDACFA]"
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
