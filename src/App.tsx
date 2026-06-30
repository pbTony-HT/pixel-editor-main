import { useState, useRef, useCallback, useEffect } from 'react'

const GRID_SIZE = 24
const CELL_SIZE = 20
const GAP = 1

const PALETTE = [
  '#000000', '#ffffff', '#808080', '#c0c0c0',
  '#ff0000', '#ff8000', '#ffff00', '#80ff00',
  '#00ff00', '#00ff80', '#00ffff', '#0080ff',
]

type Grid = (string | null)[][]

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  )
}

function copyGrid(grid: Grid): Grid {
  return grid.map(row => [...row])
}

// localStorage helpers
const STORAGE_KEY = 'pixel-art-editor-grid'

function loadGridFromStorage(): Grid | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Failed to load grid from localStorage', e)
  }
  return null
}

function saveGridToStorage(grid: Grid) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid))
  } catch (e) {
    console.warn('Failed to save grid to localStorage', e)
  }
}

export default function App() {
  const [grid, setGrid] = useState<Grid>(() => loadGridFromStorage() ?? createEmptyGrid())
  const [currentColor, setCurrentColor] = useState(PALETTE[0])
  const [isDrawing, setIsDrawing] = useState(false)   // drag-состояние

  const pastRef = useRef<Grid[]>([])
  const futureRef = useRef<Grid[]>([])

  // Сохраняем в localStorage при каждом изменении сетки
  useEffect(() => {
    saveGridToStorage(grid)
  }, [grid])

  const pushHistory = useCallback((newGrid: Grid) => {
    pastRef.current = [...pastRef.current, copyGrid(grid)]
    futureRef.current = []
    setGrid(newGrid)
  }, [grid])

  const paintPixel = (row: number, col: number) => {
    if (grid[row][col] === currentColor) return   // не перезаписываем тот же цвет
    const newGrid = copyGrid(grid)
    newGrid[row][col] = currentColor
    pushHistory(newGrid)
  }

  const handleMouseDown = (row: number, col: number) => {
    setIsDrawing(true)
    paintPixel(row, col)
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (!isDrawing) return
    paintPixel(row, col)
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  // Глобальное отжатие мыши для завершения рисования
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const undo = () => {
    if (pastRef.current.length === 0) return
    const previous = pastRef.current.pop()!
    futureRef.current.push(copyGrid(grid))
    setGrid(previous)
  }

  const redo = () => {
    if (futureRef.current.length === 0) return
    const next = futureRef.current.pop()!
    pastRef.current.push(copyGrid(grid))
    setGrid(next)
  }

  const clearGrid = () => {
    pushHistory(createEmptyGrid())
  }

  // Экспорт PNG (скачать файл)
  const exportPNG = () => {
    const canvas = document.createElement('canvas')
    canvas.width = GRID_SIZE
    canvas.height = GRID_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const color = grid[r][c]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(c, r, 1, 1)
        }
      }
    }

    const link = document.createElement('a')
    link.download = 'pixel-art.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Share (копировать PNG в буфер обмена)
  const shareToClipboard = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = GRID_SIZE
    canvas.height = GRID_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const color = grid[r][c]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(c, r, 1, 1)
        }
      }
    }

    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) {
        alert('Failed to create image blob')
        return
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      alert('PNG скопирован в буфер обмена!')
    } catch (err) {
      console.error('Clipboard write failed', err)
      alert('Не удалось скопировать в буфер обмена')
    }
  }

  // Общие размеры контейнера сетки
  const gridContainerSize = GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * GAP

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 font-sans">
      <h1 className="text-2xl font-bold mb-4">Pixel Art Editor 24×24</h1>

      {/* Панель инструментов */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={undo}
          disabled={pastRef.current.length === 0}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-default rounded text-sm transition"
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={futureRef.current.length === 0}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-default rounded text-sm transition"
        >
          Redo
        </button>
        <button
          onClick={clearGrid}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
        >
          Clear
        </button>
        <button
          onClick={exportPNG}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
        >
          Export PNG
        </button>
        <button
          onClick={shareToClipboard}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
        >
          Share (Copy)
        </button>

        {/* Индикатор текущего цвета */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm">Current:</span>
          <div
            className="w-6 h-6 rounded border-2 border-gray-400"
            style={{ backgroundColor: currentColor }}
          />
        </div>
      </div>

      {/* Основная рабочая область */}
      <div className="flex gap-6 items-start">
        {/* Сетка пикселей */}
        <div
          className="grid select-none border-2 border-gray-500 rounded overflow-hidden bg-gray-800"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gap: `${GAP}px`,
            width: gridContainerSize,
            height: gridContainerSize,
          }}
          onMouseLeave={() => setIsDrawing(false)}   // если ушли за пределы — стоп
        >
          {grid.map((row, r) =>
            row.map((color, c) => (
              <div
                key={`${r}-${c}`}
                className="transition-transform duration-100 hover:scale-125 hover:shadow-[0_0_6px_2px_rgba(255,255,255,0.7)] hover:z-10"
                style={{
                  backgroundColor: color || 'transparent',
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
              />
            ))
          )}
        </div>

        {/* Палитра */}
        <div className="grid grid-cols-4 gap-1.5 bg-gray-800 p-2 rounded border border-gray-600">
          {PALETTE.map(color => (
            <button
              key={color}
              className={`w-7 h-7 rounded border-2 transition hover:scale-110 ${
                color === currentColor
                  ? 'border-white shadow-[0_0_8px_2px_rgba(255,255,255,0.6)]'
                  : 'border-gray-500'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setCurrentColor(color)}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-400">
        Клик или зажмите и ведите — рисовать.
      </p>
    </div>
  )
}