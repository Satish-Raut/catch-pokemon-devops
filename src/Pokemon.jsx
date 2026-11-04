import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PokemonCards } from "./PokemonCards";
import { PokemonDetails } from "./PokemonDetails";
import { findPokemonWithClips } from "./tmdb";
import "./index.css";

const API = "https://pokeapi.co/api/v2/pokemon?limit=200";
const PAGE_SIZE = 20;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}). Please try again.`);
  }
  return response.json();
}

export const Pokemon = ({ onHome }) => {
  const [pokemonIndex, setPokemonIndex] = useState([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagePokemon, setPagePokemon] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [indexAttempt, setIndexAttempt] = useState(0);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [videoFilterEnabled, setVideoFilterEnabled] = useState(false);
  const [videoScanComplete, setVideoScanComplete] = useState(false);
  const [videoScanLoading, setVideoScanLoading] = useState(false);
  const [videoScanProgress, setVideoScanProgress] = useState({ completed: 0, total: 0 });
  const [videoPokemonNames, setVideoPokemonNames] = useState(new Set());
  const [videoScanError, setVideoScanError] = useState("");
  const [videoScanFailedCount, setVideoScanFailedCount] = useState(0);

  useEffect(() => () => {
    videoScanRequest.current += 1;
  }, []);
  const normalizedSearch = search.trim().toLowerCase();
  const detailCache = useRef(new Map());
  const modalRequest = useRef(0);
  const videoScanRequest = useRef(0);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedPokemonDetails, setSelectedPokemonDetails] = useState(null);
  const [selectedPokemonLoading, setSelectedPokemonLoading] = useState(false);
  const [selectedPokemonError, setSelectedPokemonError] = useState("");

  const fetchCached = useCallback((url) => {
    if (!detailCache.current.has(url)) {
      const request = fetchJson(url).catch((fetchError) => {
        detailCache.current.delete(url);
        throw fetchError;
      });
      detailCache.current.set(url, request);
    }

    return detailCache.current.get(url);
  }, []);

  useEffect(() => {
    let active = true;

    fetchJson(API)
      .then((data) => {
        if (active) setPokemonIndex(data.results);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message);
      })
      .finally(() => {
        if (active) setIndexLoading(false);
      });

    return () => {
      active = false;
    };
  }, [indexAttempt]);

  const filteredPokemon = useMemo(
    () => pokemonIndex.filter((pokemon) => {
      const matchesSearch = pokemon.name.toLowerCase().includes(normalizedSearch);
      const hasVideo = !videoFilterEnabled ||
        !videoScanComplete ||
        videoPokemonNames.has(pokemon.name.replace(/[^a-z0-9]/gi, "").toLowerCase());
      return matchesSearch && hasVideo;
    }),
    [pokemonIndex, normalizedSearch, videoFilterEnabled, videoScanComplete, videoPokemonNames],
  );
  const pageCount = Math.ceil(filteredPokemon.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const pageEntries = useMemo(
    () =>
      filteredPokemon.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredPokemon, currentPage],
  );

  useEffect(() => {
    if (indexLoading || !pokemonIndex.length) return undefined;

    let active = true;
    setDetailsLoading(pageEntries.length > 0);
    setError("");

    Promise.all(
      pageEntries.map((entry) => fetchCached(entry.url)),
    )
      .then((details) => {
        if (active) setPagePokemon(details);
      })
      .catch((fetchError) => {
        if (active) {
          setPagePokemon([]);
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detailAttempt, fetchCached, indexLoading, pageEntries, pokemonIndex.length]);

  const openPokemonDetails = async (pokemon) => {
    const requestId = modalRequest.current + 1;
    modalRequest.current = requestId;
    setSelectedPokemon(pokemon);
    setSelectedPokemonDetails(null);
    setSelectedPokemonLoading(true);
    setSelectedPokemonError("");

    try {
      const [species, types, abilities] = await Promise.all([
        fetchCached(pokemon.species.url),
        Promise.all(pokemon.types.map(({ type }) => fetchCached(type.url))),
        Promise.all(pokemon.abilities.map(({ ability }) => fetchCached(ability.url))),
      ]);
      const evolutionChain = species.evolution_chain?.url
        ? await fetchCached(species.evolution_chain.url)
        : null;

      if (modalRequest.current === requestId) {
        setSelectedPokemonDetails({ species, types, abilities, evolutionChain });
      }
    } catch (fetchError) {
      if (modalRequest.current === requestId) {
        setSelectedPokemonError(fetchError.message);
      }
    } finally {
      if (modalRequest.current === requestId) {
        setSelectedPokemonLoading(false);
      }
    }
  };

  const closePokemonDetails = () => {
    modalRequest.current += 1;
    setSelectedPokemon(null);
    setSelectedPokemonDetails(null);
    setSelectedPokemonError("");
    setSelectedPokemonLoading(false);
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const scanPokemonVideos = async () => {
    const requestId = videoScanRequest.current + 1;
    videoScanRequest.current = requestId;
    setVideoScanComplete(false);
    setVideoScanLoading(true);
    setVideoScanError("");
    setVideoScanProgress({ completed: 0, total: pokemonIndex.length });

    try {
      const result = await findPokemonWithClips(
        pokemonIndex.map(({ name }) => name),
        (completed, total) => {
          if (videoScanRequest.current === requestId) {
            setVideoScanProgress({ completed, total });
          }
        },
        () => videoScanRequest.current === requestId,
      );

      if (videoScanRequest.current === requestId) {
        setVideoPokemonNames(result.pokemonWithClips);
        setVideoScanFailedCount(result.failedCount);
        setVideoScanComplete(true);
      }
    } catch (scanError) {
      if (videoScanRequest.current === requestId) {
        setVideoScanError(scanError.message);
      }
    } finally {
      if (videoScanRequest.current === requestId) {
        setVideoScanLoading(false);
      }
    }
  };

  const handleVideoFilter = () => {
    if (videoFilterEnabled) {
      if (videoScanLoading) {
        videoScanRequest.current += 1;
        setVideoScanLoading(false);
      }
      setVideoFilterEnabled(false);
      setPage(1);
      return;
    }

    setVideoFilterEnabled(true);
    setPage(1);
    if (!videoScanComplete && !videoScanLoading) scanPokemonVideos();
  };

  const firstResult = filteredPokemon.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const lastResult = Math.min(currentPage * PAGE_SIZE, filteredPokemon.length);

  if (indexLoading) {
    return (
      <div className="container pokedex-page">
        <header className="pokedex-header">
          <button className="home-link" onClick={onHome} type="button">← Home</button>
          <h1>Loading Pokédex...</h1>
        </header>
      </div>
    );
  }

  if (error && pokemonIndex.length === 0) {
    return (
      <div className="container pokedex-page">
        <header className="pokedex-header">
          <button className="home-link" onClick={onHome} type="button">← Home</button>
          <h1>Unable to load Pokédex</h1>
        </header>
        <p className="pokemon-error" role="alert">{error}</p>
        <button
          className="retry-button"
          onClick={() => {
            setError("");
            setIndexLoading(true);
            setIndexAttempt((attempt) => attempt + 1);
          }}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="container pokedex-page">
      <header className="pokedex-header">
        <button className="home-link" onClick={onHome} type="button">
          ← Home
        </button>
        <h1>Let&apos;s Catch Pokémon</h1>
      </header>

      <div className="pokemon-search">
        <input
          aria-label="Search Pokémon by name"
          autoComplete="off"
          onChange={handleSearch}
          placeholder="Search by Pokémon name"
          type="search"
          value={search}
        />
        <button
          aria-pressed={videoFilterEnabled}
          className={`video-filter-button${videoFilterEnabled ? " is-active" : ""}`}
          onClick={handleVideoFilter}
          type="button"
        >
          <span aria-hidden="true">▶</span>
          {videoScanLoading
            ? `Cancel scan · ${videoScanProgress.completed}/${videoScanProgress.total}`
            : videoFilterEnabled
              ? `Has videos${videoScanComplete ? ` · ${videoPokemonNames.size}` : ""} ✓`
              : "Has videos"}
        </button>
      </div>

      {videoScanLoading && (
        <p className="video-filter-status" role="status">
          Checking TMDB for clips across the Pokédex ({videoScanProgress.completed} of {videoScanProgress.total})…
        </p>
      )}
      {videoScanError && (
        <div className="pokemon-error video-filter-error" role="alert">
          <p>{videoScanError}</p>
          <button className="retry-button" onClick={scanPokemonVideos} type="button">
            Retry video scan
          </button>
        </div>
      )}
      {!videoScanLoading && videoFilterEnabled && videoScanComplete && videoScanFailedCount > 0 && (
        <div className="video-filter-status video-filter-partial" role="status">
          <span>
            {videoScanFailedCount} Pokémon could not be checked. The filtered results may be incomplete.
          </span>
          <button className="retry-button" onClick={scanPokemonVideos} type="button">
            Recheck failed Pokémon
          </button>
        </div>
      )}

      <div className="pokemon-results-heading" aria-live="polite">
        <p>
          {videoScanLoading
            ? "Finding Pokémon with videos…"
            : videoFilterEnabled && videoScanComplete
            ? `${filteredPokemon.length} Pokémon with videos${normalizedSearch ? ` matching “${search.trim()}”` : ""}`
            : normalizedSearch
            ? `${filteredPokemon.length} result${filteredPokemon.length === 1 ? "" : "s"} for “${search.trim()}”`
            : "Explore the Pokédex"}
        </p>
        <span>
          {filteredPokemon.length > 0
            ? `${firstResult}–${lastResult} of ${filteredPokemon.length}`
            : "0 Pokémon"}
        </span>
      </div>

      {error && (
        <div className="pokemon-error" role="alert">
          <p>{error}</p>
          <button
            className="retry-button"
            onClick={() => {
              setError("");
              setDetailsLoading(true);
              setDetailAttempt((attempt) => attempt + 1);
            }}
            type="button"
          >
            Retry this page
          </button>
        </div>
      )}

      {detailsLoading ? (
        <p className="pokemon-loading" role="status">Loading Pokémon details...</p>
      ) : filteredPokemon.length === 0 ? (
        <p className="pokemon-empty">
          {videoFilterEnabled && videoScanComplete
            ? "No Pokémon with matching TMDB videos were found."
            : `No Pokémon match “${search.trim()}”. Try another name.`}
        </p>
      ) : (
        <ul className="cards">
          {pagePokemon.map((pokemon) => (
            <PokemonCards
              key={pokemon.id}
              onSelect={openPokemonDetails}
              pokemonData={pokemon}
            />
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav className="pokemon-pagination" aria-label="Pokédex pages">
          <button
            className="pagination-button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            type="button"
          >
            ← Previous
          </button>
          <div className="pagination-pages">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                aria-current={pageNumber === currentPage ? "page" : undefined}
                aria-label={`Page ${pageNumber}`}
                className={`page-number${pageNumber === currentPage ? " is-current" : ""}`}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button
            className="pagination-button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
            type="button"
          >
            Next →
          </button>
        </nav>
      )}

      {selectedPokemon && (
        <PokemonDetails
          details={selectedPokemonDetails}
          error={selectedPokemonError}
          loading={selectedPokemonLoading}
          onClose={closePokemonDetails}
          onRetry={() => openPokemonDetails(selectedPokemon)}
          pokemon={selectedPokemon}
        />
      )}
    </div>
  );
};
