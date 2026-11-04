import { useEffect, useState } from "react";
import { PokemonCards } from "./PokemonCards";
import "./index.css";

const API = "https://pokeapi.co/api/v2/pokemon?limit=200";

export const Pokemon = ({ onHome }) => {
  const [pokemon, setPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchPokemon = async () => {
    try {
      const responce = await fetch(API); // Fetch the Main API
      // console.log(responce)
      const data = await responce.json();
      // console.log(data);

      const pokemonData = data.results.map(async (currPokemon) => {
        const responce = await fetch(currPokemon.url); // Fetching Api for Individual Pokemons
        const data = await responce.json();

        // console.log(data);
        return data;
      });

        // console.log(pokemonData); // All are Promises
      const detailedResponce = await Promise.all(pokemonData);
      //   console.log(detailedResponce);

      setPokemon(detailedResponce);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
      setError(error);
    }
  };

  useEffect(() => {
    fetchPokemon();
  }, []);

  // Search Functionality
  const searchData = pokemon.filter((curPokemon) =>
    curPokemon.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container pokedex-page">
        <header className="pokedex-header">
          <button className="home-link" onClick={onHome} type="button">
            ← Home
          </button>
          <h1>Loading...</h1>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container pokedex-page">
        <header className="pokedex-header">
          <button className="home-link" onClick={onHome} type="button">
            ← Home
          </button>
          <h1>Error: {error.message}</h1>
        </header>
      </div>
    );
  }

  return (
    <div className="container pokedex-page">
      <header className="pokedex-header">
        <button className="home-link" onClick={onHome} type="button">
          ← Home
        </button>
        <h1>Let's Catch Pokémon </h1>
      </header>

      <div className="pokemon-search">
        <input
          type="text"
          placeholder="Search Pokemon"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div>
        <ul className="cards">
          {searchData.map((currPokemon) => {
            return (
              <PokemonCards key={currPokemon.id} pokemonData={currPokemon} />
            );
          })}
        </ul>
      </div>
    </div>
  );
};
