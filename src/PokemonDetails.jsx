import { useEffect, useRef, useState } from "react";
import { PokemonClips } from "./PokemonClips";

const typeColors = {
  bug: "#8a9b39",
  dark: "#66564a",
  dragon: "#6574c8",
  electric: "#c79724",
  fairy: "#bd789c",
  fighting: "#bd5848",
  fire: "#d96d43",
  flying: "#798fc1",
  ghost: "#786794",
  grass: "#648b58",
  ground: "#b28a4e",
  ice: "#61a4a8",
  normal: "#89877a",
  poison: "#98638d",
  psychic: "#cf6681",
  rock: "#928044",
  steel: "#71858c",
  water: "#5686b2",
};

const statLabels = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Attack",
  "special-defense": "Sp. Defense",
  speed: "Speed",
};

const formatLabel = (value = "") =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const getEvolutionNames = (chain) => {
  if (!chain) return [];

  const names = [];
  const visit = (stage) => {
    if (!stage) return;
    names.push(stage.species.name);
    stage.evolves_to.forEach(visit);
  };
  visit(chain);
  return names;
};

const getWeaknesses = (typeDetails) => {
  const attackTypes = new Set(
    typeDetails.flatMap(({ damage_relations: relations }) =>
      [
        ...relations.double_damage_from,
        ...relations.half_damage_from,
        ...relations.no_damage_from,
      ].map(({ name }) => name),
    ),
  );

  return [...attackTypes]
    .map((attackType) => {
      const multiplier = typeDetails.reduce((total, { damage_relations: relations }) => {
        if (relations.no_damage_from.some(({ name }) => name === attackType)) return 0;
        if (relations.double_damage_from.some(({ name }) => name === attackType)) return total * 2;
        if (relations.half_damage_from.some(({ name }) => name === attackType)) return total * 0.5;
        return total;
      }, 1);
      return { name: attackType, multiplier };
    })
    .filter(({ multiplier }) => multiplier > 1)
    .sort((first, second) => second.multiplier - first.multiplier || first.name.localeCompare(second.name));
};

export const PokemonDetails = ({ pokemon, details, loading, error, onClose, onRetry }) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [artworkFailed, setArtworkFailed] = useState(false);
  onCloseRef.current = onClose;
  const artwork =
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.other?.dream_world?.front_default ??
    pokemon.sprites.front_default;
  const primaryType = pokemon.types[0]?.type.name ?? "normal";
  const flavorText = details?.species.flavor_text_entries
    ?.find(({ language }) => language.name === "en")
    ?.flavor_text.replace(/[\f\n\r]+/g, " ");
  const genus = details?.species.genera?.find(({ language }) => language.name === "en")?.genus;
  const weaknesses = details ? getWeaknesses(details.types) : [];
  const evolutionNames = getEvolutionNames(details?.evolutionChain?.chain);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    if (!dialog) return undefined;

    const handleCancel = (event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    document.addEventListener("keydown", handleKeyDown);
    dialog.showModal();
    dialog.querySelector(".detail-close")?.focus();

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      document.removeEventListener("keydown", handleKeyDown);
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  return (
    <dialog
      aria-labelledby="pokemon-detail-name"
      className="pokemon-detail-dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
    >
      <div
        className={`pokemon-detail-shell type-${primaryType}`}
        style={{ "--detail-accent": typeColors[primaryType] ?? "#4a795e" }}
      >
        <button
          aria-label="Close Pokémon details"
          className="detail-close"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="pokemon-detail-scroll">
          <header className="detail-stage">
            <div className="detail-side detail-side-left">
              <div className="detail-title">
                <span className="detail-number">Nº {String(pokemon.id).padStart(3, "0")}</span>
                <h2 id="pokemon-detail-name">{formatLabel(pokemon.name)}</h2>
                {genus && <p className="detail-genus">{genus}</p>}
              </div>
              {flavorText && <p className="detail-description">{flavorText}</p>}
              <section className="detail-section detail-facts-panel">
                <p className="detail-eyebrow">FIELD NOTES</p>
                <h3>At a glance</h3>
                <div className="detail-facts">
                  <p><span>Height</span><strong>{(pokemon.height / 10).toFixed(1)} m</strong></p>
                  <p><span>Weight</span><strong>{(pokemon.weight / 10).toFixed(1)} kg</strong></p>
                  <p><span>Base experience</span><strong>{pokemon.base_experience ?? "—"}</strong></p>
                  {details && (
                    <>
                      <p><span>Capture rate</span><strong>{details.species.capture_rate ?? "—"}</strong></p>
                      <p><span>Growth</span><strong>{formatLabel(details.species.growth_rate?.name)}</strong></p>
                      <p>
                        <span>Habitat</span>
                        <strong>{formatLabel(details.species.habitat?.name ?? "Unknown")}</strong>
                      </p>
                    </>
                  )}
                </div>
                {details?.species.egg_groups?.length > 0 && (
                  <p className="detail-egg-groups">
                    <span>Egg groups</span>
                    {details.species.egg_groups.map(({ name }) => formatLabel(name)).join(" · ")}
                  </p>
                )}
              </section>
            </div>

            <div className="detail-artwork">
              <span className="detail-artwork-number" aria-hidden="true">
                {String(pokemon.id).padStart(3, "0")}
              </span>
              {artwork && !artworkFailed ? (
                <img
                  src={artwork}
                  alt={formatLabel(pokemon.name)}
                  onError={() => setArtworkFailed(true)}
                />
              ) : (
                <span className="detail-artwork-fallback" aria-hidden="true">✦</span>
              )}
            </div>

            <aside className="detail-side detail-side-right">
              <section className="detail-section detail-type-panel">
                <p className="detail-eyebrow">TYPE</p>
                <div className="detail-types" aria-label="Types">
                  {pokemon.types.map(({ type }) => (
                    <span className={`type-badge type-${type.name}`} key={type.name}>
                      {type.name}
                    </span>
                  ))}
                </div>
              </section>
              {details && (
                <>
                  <section className="detail-section">
                    <p className="detail-eyebrow">TYPE MATCHUPS</p>
                    <h3>Watch out for</h3>
                    {weaknesses.length ? (
                      <div className="detail-weaknesses">
                        {weaknesses.map(({ name, multiplier }) => (
                          <span className={`type-badge type-${name}`} key={name}>
                            {name}
                            {multiplier > 2 && <strong> ×{multiplier}</strong>}
                          </span>
                        ))}
                      </div>
                    ) : <p className="detail-muted">No type weaknesses found.</p>}
                  </section>

                  <section className="detail-section detail-stats">
                    <p className="detail-eyebrow">THE NUMBERS</p>
                    <h3>Base stats</h3>
                    {pokemon.stats.map(({ base_stat: value, stat }) => (
                      <div className="stat-row" key={stat.name}>
                        <span className="stat-name">{statLabels[stat.name] ?? formatLabel(stat.name)}</span>
                        <span className="stat-value">{value}</span>
                        <span
                          aria-label={`${statLabels[stat.name] ?? formatLabel(stat.name)} ${value}`}
                          className="stat-track"
                          role="img"
                        >
                          <span style={{ width: `${Math.min((value / 255) * 100, 100)}%` }} />
                        </span>
                      </div>
                    ))}
                  </section>
                </>
              )}
            </aside>
          </header>

          {loading && <p className="detail-status" role="status">Gathering field notes…</p>}
          {error && (
            <div className="detail-error" role="alert">
              <p>{error}</p>
              <button className="detail-retry" onClick={onRetry} type="button">Try again</button>
            </div>
          )}

          {details && (
            <div className="detail-support-grid">
              <section className="detail-section">
                <p className="detail-eyebrow">SPECIAL TALENTS</p>
                <h3>Abilities</h3>
                <div className="detail-abilities">
                  {pokemon.abilities.map(({ ability, is_hidden: isHidden }, index) => {
                    const abilityDetails = details.abilities[index];
                    const effect = abilityDetails.effect_entries?.find(
                      ({ language }) => language.name === "en",
                    )?.short_effect;

                    return (
                      <article className="ability-item" key={ability.name}>
                        <div>
                          <h4>{formatLabel(ability.name)}</h4>
                          {isHidden && <span className="hidden-ability">Hidden ability</span>}
                        </div>
                        {effect && <p>{effect}</p>}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="detail-section">
                <p className="detail-eyebrow">GROWING UP</p>
                <h3>Evolution family</h3>
                {evolutionNames.length ? (
                  <div className="detail-evolutions">
                    {evolutionNames.map((name, index) => (
                      <span className="evolution-stage" key={`${name}-${index}`}>
                        {index > 0 && <span className="evolution-arrow" aria-hidden="true">→</span>}
                        {formatLabel(name)}
                      </span>
                    ))}
                  </div>
                ) : <p className="detail-muted">No evolution details available.</p>}
              </section>

              <details className="detail-moves">
                <summary>Moves <span>{pokemon.moves.length} total</span></summary>
                <div className="move-list">
                  {pokemon.moves.map(({ move }) => (
                    <span key={move.name}>{formatLabel(move.name)}</span>
                  ))}
                </div>
              </details>
            </div>
          )}

          <PokemonClips pokemonName={pokemon.name} />
        </div>
      </div>
    </dialog>
  );
};
