'use client';

import React from 'react';

type Props = {
  onClick: () => void;
};

export default function Fab({ onClick }: Props): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Acción principal"
      className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-white shadow-xl outline-none ring-offset-2 focus:ring-2 focus:ring-sky-400"
    >
      {/* Simple plus icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

