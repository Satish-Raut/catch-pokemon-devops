import { useEffect, useMemo, useRef, useState } from "react";
import { PokemonCards } from "./PokemonCards";
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
  const normalizedSearch = search.trim().toLowerCase();
  const detailCache = useRef(new Map());

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
    () =>
      pokemonIndex.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(normalizedSearch),
      ),
    [pokemonIndex, normalizedSearch],
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
      pageEntries.map(async (entry) => {
        if (!detailCache.current.has(entry.url)) {
          const detailRequest = fetchJson(entry.url).catch((fetchError) => {
            detailCache.current.delete(entry.url);
            throw fetchError;
          });
          detailCache.current.set(entry.url, detailRequest);
        }
        return detailCache.current.get(entry.url);
      }),
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
  }, [detailAttempt, indexLoading, pageEntries, pokemonIndex.length]);

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
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
      </div>

      <div className="pokemon-results-heading" aria-live="polite">
        <p>
          {normalizedSearch
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
        <p className="pokemon-empty">No Pokémon match “{search.trim()}”. Try another name.</p>
      ) : (
        <ul className="cards">
          {pagePokemon.map((pokemon) => (
            <PokemonCards key={pokemon.id} pokemonData={pokemon} />
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
    </div>
  );
};
