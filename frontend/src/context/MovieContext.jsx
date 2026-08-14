import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Holds the generated movie between /studio and /movie.
 * Deliberately in-memory only — the app is stateless by design, so a refresh
 * on /movie sends the visitor back to the studio rather than restoring a movie.
 */
const MovieContext = createContext(null);

export function MovieProvider({ children }) {
  const [movie, setMovie] = useState(null);
  const [lastInput, setLastInput] = useState({ memory: '', genre: 'Auto' });

  const saveMovie = useCallback((next, input) => {
    setMovie(next);
    if (input) setLastInput(input);
  }, []);

  const clearMovie = useCallback(() => setMovie(null), []);

  const value = useMemo(
    () => ({ movie, lastInput, saveMovie, clearMovie }),
    [movie, lastInput, saveMovie, clearMovie],
  );

  return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
}

export function useMovie() {
  const context = useContext(MovieContext);
  if (!context) {
    throw new Error('useMovie must be used inside a MovieProvider');
  }
  return context;
}
