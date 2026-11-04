import { useEffect, useState } from "react";
import { clearPokemonClipsCache, isTmdbConfigured, loadPokemonClips } from "./tmdb";

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export const PokemonClips = ({ pokemonName }) => {
  const [clips, setClips] = useState([]);
  const [failedTitleCount, setFailedTitleCount] = useState(0);
  const [activeClip, setActiveClip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setClips([]);
    setFailedTitleCount(0);
    setActiveClip(null);
    setLoading(true);
    setError("");

    loadPokemonClips(pokemonName)
      .then(({ clips: results, failedTitleCount: failedCount }) => {
        if (active) {
          setClips(results);
          setFailedTitleCount(failedCount);
        }
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pokemonName]);

  const retry = () => {
    clearPokemonClipsCache(pokemonName);
    setActiveClip(null);
    setLoading(true);
    setError("");
    loadPokemonClips(pokemonName)
      .then(({ clips: results, failedTitleCount: failedCount }) => {
        setClips(results);
        setFailedTitleCount(failedCount);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  };

  return (
    <section aria-labelledby="pokemon-clips-title" className="pokemon-clips">
      <div className="clips-heading">
        <div>
          <p className="detail-eyebrow">ON THE BIG SCREEN</p>
          <h3 id="pokemon-clips-title">{formatPokemonName(pokemonName)} on screen</h3>
        </div>
        {!loading && !error && <span className="clips-count">{clips.length} videos</span>}
      </div>

      {loading && (
        <p className="clips-status" role="status">
          Searching TMDB for titles featuring {formatPokemonName(pokemonName)}…
        </p>
      )}
      {error && (
        <div className="clips-error" role="alert">
          <p>{error}</p>
          {isTmdbConfigured && <button className="detail-retry" onClick={retry} type="button">Try again</button>}
        </div>
      )}
      {!loading && !error && failedTitleCount > 0 && (
        <p className="clips-partial-note">
          Some Pokémon titles could not be checked. The clips shown may be incomplete.
        </p>
      )}
      {!loading && !error && clips.length === 0 && (
        <p className="clips-status">
          TMDB has no Pokémon movie or show titles naming {formatPokemonName(pokemonName)}, so there are no character-specific clips to show.
          {" "}
          <a
            href={`https://www.themoviedb.org/search?query=${encodeURIComponent(`Pokémon ${pokemonName}`)}`}
            rel="noreferrer"
            target="_blank"
          >
            Browse Pokémon titles on TMDB
          </a>
        </p>
      )}

      {activeClip && (
        <div className="clip-player">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeClip.key)}?autoplay=1&rel=0`}
            title={`${activeClip.titleName}: ${activeClip.name}`}
          />
          <button
            aria-label="Close video player"
            className="clip-player-close"
            onClick={() => setActiveClip(null)}
            type="button"
          >
            Close video
          </button>
        </div>
      )}

      {clips.length > 0 && (
        <div className="clips-grid">
          {clips.map((clip) => (
            <button
              aria-pressed={activeClip?.id === clip.id}
              className={`clip-card${activeClip?.id === clip.id ? " is-playing" : ""}`}
              key={`${clip.mediaType}-${clip.titleId}-${clip.id}`}
              onClick={() => setActiveClip(clip)}
              type="button"
            >
              <span className="clip-thumbnail">
                {clip.posterPath && (
                  <img
                    alt=""
                    loading="lazy"
                    src={`${IMAGE_BASE}${clip.posterPath}`}
                  />
                )}
                <span className="clip-play" aria-hidden="true">▶</span>
                <span className="clip-kind">{clip.type}</span>
              </span>
              <span className="clip-card-info">
                <strong>{clip.titleName}</strong>
                <span>{clip.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="tmdb-attribution">
        <a href="https://www.themoviedb.org/" rel="noreferrer" target="_blank">TMDB</a>
        {" "}provides the film and television data. Results are limited to Pokémon titles that mention this Pokémon by name. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </section>
  );
};

const formatPokemonName = (name) =>
  name.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
