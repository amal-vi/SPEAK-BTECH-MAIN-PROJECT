import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full p-4 text-center text-black font-semibold bg-gray-200 ">
      © {new Date().getFullYear()} SPEAK Project. All rights reserved.
    </footer>
  );
}