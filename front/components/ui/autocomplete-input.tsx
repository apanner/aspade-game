import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  getSuggestions: (query: string) => Promise<string[]>
  minChars?: number
}

export function AutocompleteInput({
  value,
  onChange,
  placeholder = "Enter your name...",
  className,
  disabled = false,
  getSuggestions,
  minChars = 3
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])

  // Fetch suggestions when value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length >= minChars) {
        setLoading(true)
        try {
          const results = await getSuggestions(value)
          setSuggestions(results)
          setShowSuggestions(results.length > 0)
          setSelectedIndex(-1)
        } catch (error) {
          console.error('Error fetching suggestions:', error)
          setSuggestions([])
          setShowSuggestions(false)
        } finally {
          setLoading(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [value, minChars, getSuggestions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    
    // Auto-capitalize first letter (like mobile does)
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1)
    }
    
    onChange(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const selectSuggestion = (suggestion: string) => {
    // Ensure first letter is capitalized when selecting suggestion
    const capitalizedSuggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
    onChange(capitalizedSuggestion)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }, 150)
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedIndex])

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />
      
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                ref={el => { suggestionRefs.current[index] = el }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
                onClick={() => selectSuggestion(suggestion)}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{suggestion}</span>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No matching players found
            </div>
          )}
        </div>
      )}
    </div>
  )
} 