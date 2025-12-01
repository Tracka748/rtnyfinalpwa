"use client"

import { Calendar, Filter, ChevronDown } from "lucide-react"
import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type DateFilter = "all" | "today" | "this-week" | "this-month"

interface EventFiltersProps {
  selectedCategory: string
  selectedDate: DateFilter
  onCategoryChange: (category: string) => void
  onDateChange: (date: DateFilter) => void
  categories: string[]
}

export function EventFilters({
  selectedCategory,
  selectedDate,
  onCategoryChange,
  onDateChange,
  categories,
}: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const dateOptions = [
    { value: "all", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "this-week", label: "This Week" },
    { value: "this-month", label: "This Month" },
  ]

  return (
    <div className="w-full">
      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-2xl bg-[#1A1A1A] px-6 py-4 font-sans text-[#F9FDFF] transition-all hover:bg-[#2A2A2A] md:hidden"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#59FFA0]" />
          <span className="font-medium">Filters</span>
        </div>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Filter Content */}
      <div
        className={`mt-4 space-y-4 md:mt-0 md:flex md:items-center md:gap-4 md:space-y-0 ${
          isOpen ? "block" : "hidden md:flex"
        }`}
      >
        {/* Category Filter */}
        <div className="flex-1">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-12 rounded-xl border-0 bg-[#1A1A1A] font-sans text-[#F9FDFF] focus:ring-2 focus:ring-[#59FFA0] focus:ring-offset-0">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 bg-[#1A1A1A]">
              <SelectItem 
                value="all" 
                className="font-sans text-[#F9FDFF] focus:bg-[#2A2A2A] focus:text-[#F9FDFF]"
              >
                All Categories
              </SelectItem>
              {categories.map((category) => (
                <SelectItem
                  key={category}
                  value={category}
                  className="font-sans text-[#F9FDFF] focus:bg-[#2A2A2A] focus:text-[#F9FDFF]"
                >
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Filter */}
        <div className="flex-1">
          <Select value={selectedDate} onValueChange={(val) => onDateChange(val as DateFilter)}>
            <SelectTrigger className="h-12 rounded-xl border-0 bg-[#1A1A1A] font-sans text-[#F9FDFF] focus:ring-2 focus:ring-[#1AC8ED] focus:ring-offset-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1AC8ED]" />
                <SelectValue placeholder="All Dates" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 bg-[#1A1A1A]">
              {dateOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="font-sans text-[#F9FDFF] focus:bg-[#2A2A2A] focus:text-[#F9FDFF]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}