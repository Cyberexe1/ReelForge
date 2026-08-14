import { SAMPLE_MOVIE } from '../data/sampleMovie';

/**
 * The only module in the app that talks to the network.
 * Components must never call fetch directly.
 */

const API_URL = import.meta.env.VITE_API_URL ?? '';
const REQUEST_TIMEOUT_MS = 45_000;

export const MEMORY_MIN = 20;
export const MEMORY_MAX = 2000;

/** True when running against the offline fixture instead of a deployed API. */
export const isOfflineMode = () => API_URL === '';

const FRIENDLY_ERRORS = {
  MEMORY_TOO_SHORT: 'That memory is a little too short. Add a few more details.',
  MEMORY_TOO_LONG: 'That memory is too long. Trim it down a bit.',
  INVALID_GENRE: 'That genre is not one of the available options.',
  RATE_LIMITED: 'REELFORGE is busy right now. Try again in a moment.',
  GENERATION_FAILED: 'The model could not finish this one. Try again, or reword the memory.',
  TIMEOUT: 'That took too long to generate. Try again with a shorter memory.',
  NETWORK: 'Could not reach REELFORGE. Check your connection and try again.',
};

export class ApiError extends Error {
  constructor(code, message) {
    super(message ?? FRIENDLY_ERRORS[code] ?? FRIENDLY_ERRORS.GENERATION_FAILED);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Mirrors the server-side validation so the UI can fail fast and for free. */
export function validateMemory(memory) {
  const trimmed = (memory ?? '').trim();
  if (trimmed.length < MEMORY_MIN) return 'MEMORY_TOO_SHORT';
  if (trimmed.length > MEMORY_MAX) return 'MEMORY_TOO_LONG';
  return null;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fixture response shaped by the requested genre, so the studio flow and the
 * Change Genre loop are both testable before Bedrock exists.
 */
async function generateOffline({ memory, genre }) {
  await wait(2400);
  const resolvedGenre = genre === 'Auto' ? 'Coming-of-Age / Comedy' : genre;
  return {
    ...SAMPLE_MOVIE,
    movieId: Math.random().toString(36).slice(2, 10),
    genre: resolvedGenre,
    sourceMemory: memory,
    isSample: true,
  };
}

/**
 * POST /generate-movie
 * @param {{ memory: string, genre: string }} input
 * @returns {Promise<object>} the full movie package
 */
export async function generateMovie({ memory, genre }) {
  const invalid = validateMemory(memory);
  if (invalid) throw new ApiError(invalid);

  if (isOfflineMode()) {
    return generateOffline({ memory, genre });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/generate-movie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory: memory.trim(), genre }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(payload?.error ?? 'GENERATION_FAILED', payload?.message);
    }

    return { ...payload, sourceMemory: memory.trim() };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError('TIMEOUT');
    throw new ApiError('NETWORK');
  } finally {
    clearTimeout(timer);
  }
}
