export {
  highscoreSlice,
  type HighScore,
  type HighScoreState,
  type HighScoreTable,
  getDefaultHighScores,
  getDefaultHighScoreTable
} from './highscoreSlice'
export { highscoreMiddleware, loadHighScores } from './highscoreMiddleware'

// Import and re-export actions
import { highscoreSlice as _highscoreSlice } from './highscoreSlice'
export const { setHighScore, resetHighScores, resetGalaxyHighScores } =
  _highscoreSlice.actions
