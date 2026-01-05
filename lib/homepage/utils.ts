import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    movies: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    nightlife: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    family: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
    music: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
    dining: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    festivals: "bg-green-500/20 text-green-300 border border-green-500/30",
    entertainment: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    arts: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    shopping: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    sports: "bg-red-500/20 text-red-300 border border-red-500/30",
  }

  return colors[category] || "bg-gray-500/20 text-gray-300 border border-gray-500/30"
}
