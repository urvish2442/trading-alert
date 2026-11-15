import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names safely with Tailwind conflict resolution
 * @param {...any} inputs - Class names or conditional class expressions
 * @returns {string} - Merged className string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

