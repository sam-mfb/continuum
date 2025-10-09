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
  maxVisibleItems?: number
}

export const CustomDropdown = <T extends string | number = string | number>({
  value,
  options,
  onChange,
  scale,
  fontSize = 6 * scale,
  minWidth,
  dataAttribute = 'custom-dropdown',
  maxVisibleItems = 8
}: CustomDropdownProps<T>): React.ReactElement => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContainerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)
  const selectedLabel = selectedOption?.label ?? String(value)

  // Helper function to update scroll indicators
  const updateScrollIndicators = (): void => {
    if (!dropdownContainerRef.current) return

    const container = dropdownContainerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // Can scroll up if not at the top
    setCanScrollUp(scrollTop > 0)

    // Can scroll down if not at the bottom (with 1px tolerance)
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1)
  }

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

    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown, dataAttribute])

  // Calculate whether to open upward or downward based on available space
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const buttonRect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top

      // Calculate max height based on item height and max visible items
      const itemHeight = fontSize + 4 * scale
      const calculatedMaxHeight = itemHeight * maxVisibleItems

      // Open upward if not enough space below and more space above
      if (spaceBelow < calculatedMaxHeight && spaceAbove > spaceBelow) {
        setOpenUpward(true)
      } else {
        setOpenUpward(false)
      }
    }
  }, [showDropdown, fontSize, scale, maxVisibleItems])

  // Auto-scroll to selected item when dropdown opens and update scroll indicators
  useEffect(() => {
    if (showDropdown && dropdownContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is rendered
      requestAnimationFrame(() => {
        updateScrollIndicators()

        const selectedElement = dropdownContainerRef.current?.querySelector(
          '[data-selected="true"]'
        )
        if (selectedElement) {
          selectedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'instant'
          })
        }
        // Update indicators after scroll
        requestAnimationFrame(() => {
          updateScrollIndicators()
        })
      })
    } else {
      // Reset indicators when dropdown closes
      setCanScrollUp(false)
      setCanScrollDown(false)
    }
  }, [showDropdown])

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

  // Calculate max height based on item height and max visible items
  const itemHeight = fontSize + 4 * scale // fontSize + padding top/bottom
  const maxHeight = itemHeight * maxVisibleItems

  const dropdownContainerStyle: React.CSSProperties = {
    position: 'absolute',
    ...(openUpward
      ? { bottom: `calc(100% + ${1 * scale}px)` }
      : { top: `calc(100% + ${1 * scale}px)` }),
    left: 0,
    background: '#000',
    border: `${1 * scale}px solid #fff`,
    zIndex: 1000,
    minWidth: '100%',
    maxHeight: `${maxHeight}px`,
    overflowY: 'auto',
    overflowX: 'hidden'
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
        <div
          ref={dropdownContainerRef}
          style={dropdownContainerStyle}
          onScroll={updateScrollIndicators}
        >
          {/* Top scroll indicator - sticky to top */}
          {canScrollUp && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                left: 0,
                right: 0,
                height: `${8 * scale}px`,
                background: 'rgba(0, 0, 0, 0.9)',
                borderBottom: `${1 * scale}px solid #fff`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: `${6 * scale}px`,
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              ▲
            </div>
          )}

          {options.map(option => (
            <div
              key={String(option.value)}
              data-selected={option.value === value ? 'true' : 'false'}
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

          {/* Bottom scroll indicator - sticky to bottom */}
          {canScrollDown && (
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${8 * scale}px`,
                background: 'rgba(0, 0, 0, 0.9)',
                borderTop: `${1 * scale}px solid #fff`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: `${6 * scale}px`,
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              ▼
            </div>
          )}
        </div>
      )}
    </div>
  )
}
