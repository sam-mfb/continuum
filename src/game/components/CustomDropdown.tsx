import React, { useState, useEffect, useRef } from 'react'

export type DropdownOption<T extends string | number = string | number> = {
  value: T
  label: string
}

type CustomDropdownProps<T extends string | number = string | number> = {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  scale: number
  fontSize?: number
  minWidth?: number
  dataAttribute?: string
}

export const CustomDropdown = <T extends string | number = string | number>({
  value,
  options,
  onChange,
  scale,
  fontSize = 6 * scale,
  minWidth,
  dataAttribute = 'custom-dropdown'
}: CustomDropdownProps<T>): React.ReactElement => {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)
  const selectedLabel = selectedOption?.label ?? String(value)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && showDropdown) {
        e.preventDefault()
        e.stopPropagation()
        setShowDropdown(false)
      }
    }

    const handleClickOutside = (e: MouseEvent): void => {
      if (showDropdown) {
        const target = e.target as HTMLElement
        if (!target.closest(`[data-custom-dropdown="${dataAttribute}"]`)) {
          setShowDropdown(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown, dataAttribute])

  const buttonStyle: React.CSSProperties = {
    background: '#000',
    color: '#fff',
    border: `${1 * scale}px solid #fff`,
    padding: `${2 * scale}px ${4 * scale}px`,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: `${fontSize}px`,
    textTransform: 'uppercase',
    minWidth: minWidth ? `${minWidth * scale}px` : undefined
  }

  const dropdownContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    background: '#000',
    border: `${1 * scale}px solid #fff`,
    zIndex: 1000,
    minWidth: '100%'
  }

  const optionStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: `${2 * scale}px ${4 * scale}px`,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: `${fontSize}px`,
    textTransform: 'uppercase',
    background: isSelected ? '#333' : '#000',
    color: '#fff'
  })

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative' }}
      data-custom-dropdown={dataAttribute}
    >
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={buttonStyle}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#333'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#000'
        }}
      >
        {selectedLabel}
      </button>
      {showDropdown && (
        <div style={dropdownContainerStyle}>
          {options.map(option => (
            <div
              key={String(option.value)}
              onClick={() => {
                onChange(option.value)
                setShowDropdown(false)
              }}
              style={optionStyle(option.value === value)}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#555'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background =
                  option.value === value ? '#333' : '#000'
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
