export const PokemonCards = ({ pokemonData, onSelect }) => {
  const image =
    pokemonData.sprites?.other?.["official-artwork"]?.front_default ??
    pokemonData.sprites?.other?.dream_world?.front_default ??
    pokemonData.sprites?.front_default;

  return (
    <li className="pokemon-card">
      <button
        aria-label={`View details for ${pokemonData.name}`}
        className="pokemon-card-button"
        onClick={() => onSelect(pokemonData)}
        type="button"
      >
        <figure>
          {image && <img src={image} alt="" className="pokemon-image" loading="lazy" />}
        </figure>

        <h2 className="pokemon-name">{pokemonData.name}</h2>

        <div className="pokemon-info pokemon-highlight">
          <p>
            {pokemonData.types.map(({ type }) => type.name).join(", ")}
          </p>
        </div>

        <div className="grid-three-cols">
          <p className="pokemon-info">
            <span>Height: </span> {(pokemonData.height / 10).toFixed(1)} m
          </p>
          <p className="pokemon-info">
            <span>Weight: </span> {(pokemonData.weight / 10).toFixed(1)} kg
          </p>
          <p className="pokemon-info">
            <span>Speed: </span>
            {pokemonData.stats.find(({ stat }) => stat.name === "speed")?.base_stat ?? "—"}
          </p>
        </div>

        <div className="grid-three-cols">
          <div className="pokemon-info">
            <p>{pokemonData.base_experience ?? "—"}</p>
            <span>Experience</span>
          </div>
          <div className="pokemon-info">
            <p>
              {pokemonData.stats.find(({ stat }) => stat.name === "attack")?.base_stat ?? "—"}
            </p>
            <span>Attack</span>
          </div>
          <div className="pokemon-info">
            <p>{pokemonData.abilities.length}</p>
            <span>Abilities</span>
          </div>
        </div>

        <span className="card-details-hint">Explore profile <span aria-hidden="true">↗</span></span>
      </button>
    </li>
  );
};
