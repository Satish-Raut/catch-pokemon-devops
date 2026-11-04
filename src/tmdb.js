const API_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY?.trim();
const TITLE_LIMIT = 12;
const clipsCache = new Map();

export const isTmdbConfigured = Boolean(TMDB_API_KEY);

const fetchTmdbJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status}). Please try again.`);
  }
  return response.json();
};

const getTitleName = (title) =>
  title.title ?? title.name ?? title.original_title ?? title.original_name;

const normalizeTitle = (value) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

const findPokemonClips = async (pokemonName) => {
  if (!TMDB_API_KEY) {
    throw new Error("Add your TMDB API key as VITE_TMDB_API_KEY, then restart the app.");
  }

  const normalizedPokemonName = normalizeTitle(pokemonName);
  const searchUrl = new URL(`${API_BASE}/search/multi`);
  searchUrl.search = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: `Pokémon ${pokemonName}`,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  const searchData = await fetchTmdbJson(searchUrl);
  const titles = searchData.results
    .filter((title) => ["movie", "tv"].includes(title.media_type))
    .filter((title) => {
      const name = getTitleName(title) ?? "";
      return /pok[eé]mon/i.test(name) && normalizeTitle(name).includes(normalizedPokemonName);
    })
    .slice(0, TITLE_LIMIT);

  if (!titles.length) return { clips: [], failedTitleCount: 0 };

  const titleResults = await Promise.allSettled(
    titles.map(async (title) => {
      const videosUrl = new URL(`${API_BASE}/${title.media_type}/${title.id}/videos`);
      videosUrl.search = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: "en-US",
      });
      const videoData = await fetchTmdbJson(videosUrl);
      const videos = videoData.results
        .filter((video) =>
          video.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(video.type),
        )
        .sort((first, second) =>
          Number(second.official) - Number(first.official) ||
          ["Trailer", "Teaser", "Clip"].indexOf(first.type) -
          ["Trailer", "Teaser", "Clip"].indexOf(second.type) ||
          (Date.parse(second.published_at ?? "") || 0) -
          (Date.parse(first.published_at ?? "") || 0),
        )
        .slice(0, 2);

      return videos.map((video) => ({
        ...video,
        titleId: title.id,
        titleName: getTitleName(title),
        mediaType: title.media_type,
        posterPath: title.backdrop_path ?? title.poster_path,
      }));
    }),
  );

  const clips = titleResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  if (!clips.length && titleResults.every((result) => result.status === "rejected")) {
    throw titleResults[0].reason;
  }

  return {
    clips,
    failedTitleCount: titleResults.filter((result) => result.status === "rejected").length,
  };
};

export const loadPokemonClips = (pokemonName) => {
  const cacheKey = normalizeTitle(pokemonName);
  if (!clipsCache.has(cacheKey)) {
    const request = findPokemonClips(pokemonName).catch((error) => {
      clipsCache.delete(cacheKey);
      throw error;
    });
    clipsCache.set(cacheKey, request);
  }
  return clipsCache.get(cacheKey);
};

export const clearPokemonClipsCache = (pokemonName) => {
  clipsCache.delete(normalizeTitle(pokemonName));
};

export const findPokemonWithClips = async (pokemonNames, onProgress, shouldContinue = () => true) => {
  if (!TMDB_API_KEY) {
    throw new Error("Add your TMDB API key as VITE_TMDB_API_KEY, then restart the app.");
  }

  const uniqueNames = [...new Set(pokemonNames)];
  const pokemonWithClips = new Set();
  const failures = [];
  let nextIndex = 0;
  let completed = 0;

  const worker = async () => {
    while (nextIndex < uniqueNames.length && shouldContinue()) {
      const pokemonName = uniqueNames[nextIndex];
      nextIndex += 1;

      try {
        const { clips } = await loadPokemonClips(pokemonName);
        if (clips.length > 0) pokemonWithClips.add(normalizeTitle(pokemonName));
      } catch (error) {
        failures.push(error);
      } finally {
        completed += 1;
        onProgress?.(completed, uniqueNames.length);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(3, uniqueNames.length) }, () => worker()),
  );

  if (failures.length === uniqueNames.length && failures.length > 0) {
    throw failures[0];
  }

  return {
    pokemonWithClips,
    failedCount: failures.length,
  };
};
