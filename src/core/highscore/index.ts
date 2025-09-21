export {
  highscoreSlice,
  type HighScore,
  type HighScoreState,
  getDefaultHighScores
} from './highscoreSlice'
export { highscoreMiddleware, loadHighScores } from './highscoreMiddleware'

// Import and re-export actions
import { highscoreSlice as _highscoreSlice } from './highscoreSlice'
export const { setHighScore, resetHighScores } = _highscoreSlice.actions
