import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Define a type for the transformed data
type TransformedData<T> = T extends object
  ? {
      [K in keyof T as K extends string
        ? K extends `${infer First}_${infer Rest}`
          ? `${First}${Capitalize<Rest>}`
          : K
        : K]: T[K] extends string
        ? T[K] extends `${number}-${number}-${number}T${string}`
          ? Date
          : T[K]
        : TransformedData<T[K]>;
    }
  : T;

// Annotate the function with the type
export const transformData = <T>(data: T): TransformedData<T> =>
  !data || typeof data !== "object"
    ? (data as TransformedData<T>) // Cast primitive types to the return type
    : Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
          typeof value === "string" && /\d{4}-\d{2}-\d{2}T/.test(value)
            ? new Date(value)
            : transformData(value),
        ])
      ) as TransformedData<T>; // Cast the result to the expected type