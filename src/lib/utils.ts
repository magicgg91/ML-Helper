import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FocusEvent } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Bloc 33/D: a prefilled numeric field (e.g. target level defaulting to 2)
// otherwise forces the user to manually clear it before typing a new
// value — selecting the whole value on focus lets typing replace it
// directly instead.
export function selectOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}
