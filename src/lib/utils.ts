import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert integer milligrams to display grams string */
export function mgToGrams(mg: number): string {
  return (mg / 1000).toFixed(1);
}

/** Convert display grams to integer milligrams */
export function gramsToMg(grams: number): number {
  return Math.round(grams * 1000);
}

/** Convert integer centavos to display pesos string */
export function centavosToPesos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

/** Convert display pesos to integer centavos */
export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}
