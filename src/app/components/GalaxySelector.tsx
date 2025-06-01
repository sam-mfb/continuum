import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { loadGalaxyFile } from '../../store/galaxySlice';

export const GalaxySelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loadingState, error, loadedGalaxy } = useAppSelector(state => state.galaxy);

  const handleLoadGalaxy = (fileName: 'continuum_galaxy.bin' | 'release_galaxy.bin') => {
    dispatch(loadGalaxyFile(fileName));
  };

  return (
    <div className="galaxy-selector">
      <h2>Select Galaxy</h2>
      
      <div className="button-group">
        <button 
          onClick={() => handleLoadGalaxy('continuum_galaxy.bin')}
          disabled={loadingState === 'loading'}
          className="mac-button"
        >
          Load Continuum Galaxy
        </button>
        
        <button 
          onClick={() => handleLoadGalaxy('release_galaxy.bin')}
          disabled={loadingState === 'loading'}
          className="mac-button"
        >
          Load Release Galaxy
        </button>
      </div>

      {loadingState === 'loading' && <p>Loading galaxy...</p>}
      {error && <p className="error">Error: {error}</p>}
      {loadedGalaxy && (
        <p className="success">
          Loaded galaxy with {loadedGalaxy.planets} planets
        </p>
      )}
    </div>
  );
};