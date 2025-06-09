import React from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { loadGraphicsFile } from '../../store/graphicsSlice'

export const GraphicsList: React.FC = () => {
  const dispatch = useAppDispatch()
  const { availableFiles, selectedFile, loadingState } = useAppSelector(
    state => state.graphics
  )

  const handleSelectFile = (fileName: string): void => {
    dispatch(loadGraphicsFile(fileName))
  }

  return (
    <div className="graphics-list">
      <h3>Graphics Files</h3>
      {loadingState === 'loading' && <div className="loading">Loading...</div>}
      <ul>
        {availableFiles.map(fileName => (
          <li
            key={fileName}
            className={selectedFile === fileName ? 'selected' : ''}
            onClick={() => handleSelectFile(fileName)}
          >
            <div className="graphics-item">
              <span className="graphics-name">
                {fileName.replace('.mac', '').replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="graphics-info">MacPaint (576x720)</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}