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

  const getFileInfo = (fileName: string): string => {
    if (fileName === 'rsrc_261.bin') {
      return 'Compressed Resource (512x342)'
    }
    return 'MacPaint (576x720)'
  }

  const getDisplayName = (fileName: string): string => {
    if (fileName === 'rsrc_261.bin') {
      return 'RSRC 261 (TITLE PAGE)'
    }
    return fileName.replace('.mac', '').replace(/_/g, ' ').toUpperCase()
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
                {getDisplayName(fileName)}
              </span>
              <span className="graphics-info">{getFileInfo(fileName)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}