import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

/**
 * Zoom levels for desktop responsive design
 * Not for mobile/tablet - desktop only
 */
export type ZoomLevel = 'small' | 'medium' | 'large' | 'xlarge'

interface ZoomContextType {
  zoomLevel: ZoomLevel
  setZoomLevel: (level: ZoomLevel) => void
  fontSize: number
  screenSize: 'compact' | 'normal' | 'wide' | 'ultrawide'
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined)

/**
 * Desktop breakpoints (not mobile/tablet)
 */
const BREAKPOINTS = {
  compact: 1280,    // Small desktop
  normal: 1440,     // Standard desktop
  wide: 1920,       // Full HD
  ultrawide: 2560   // 2K/4K
}

/**
 * Font sizes based on zoom level (in pixels)
 */
const FONT_SIZES: Record<ZoomLevel, number> = {
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 18
}

/**
 * Zoom Context Provider
 * Manages zoom level and responsive font sizing for desktop
 */
export const ZoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load zoom from localStorage or default to 'medium'
  const [zoomLevel, setZoomLevelState] = useState<ZoomLevel>(() => {
    const saved = localStorage.getItem('zoomLevel')
    return (saved as ZoomLevel) || 'medium'
  })

  const [screenSize, setScreenSize] = useState<'compact' | 'normal' | 'wide' | 'ultrawide'>('normal')

  // Update screen size based on window width
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth

      if (width >= BREAKPOINTS.ultrawide) {
        setScreenSize('ultrawide')
      } else if (width >= BREAKPOINTS.wide) {
        setScreenSize('wide')
      } else if (width >= BREAKPOINTS.normal) {
        setScreenSize('normal')
      } else {
        setScreenSize('compact')
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  // Save zoom level to localStorage
  const setZoomLevel = (level: ZoomLevel) => {
    setZoomLevelState(level)
    localStorage.setItem('zoomLevel', level)
  }

  // Update CSS variables when zoom changes
  useEffect(() => {
    const fontSize = FONT_SIZES[zoomLevel]
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`)

    // Scale factors for different UI elements
    document.documentElement.style.setProperty('--heading-scale', zoomLevel === 'small' ? '1.2' : zoomLevel === 'xlarge' ? '1.5' : '1.35')
    document.documentElement.style.setProperty('--spacing-scale', zoomLevel === 'small' ? '0.8' : zoomLevel === 'xlarge' ? '1.2' : '1')
  }, [zoomLevel])

  return (
    <ZoomContext.Provider
      value={{
        zoomLevel,
        setZoomLevel,
        fontSize: FONT_SIZES[zoomLevel],
        screenSize
      }}
    >
      {children}
    </ZoomContext.Provider>
  )
}

/**
 * Hook to access zoom context
 */
export const useZoom = () => {
  const context = useContext(ZoomContext)
  if (!context) {
    throw new Error('useZoom must be used within ZoomProvider')
  }
  return context
}
