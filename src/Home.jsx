import { useState } from "react";

const featuredPokemon = [
  {
    name: "Bulbasaur",
    type: "Grass · Poison",
    number: "001",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
    color: "mint",
  },
  {
    name: "Charmander",
    type: "Fire",
    number: "004",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png",
    color: "peach",
  },
  {
    name: "Squirtle",
    type: "Water",
    number: "007",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png",
    color: "blue",
  },
];

const PokemonImage = ({ src, alt, className, loading = "lazy", priority = false }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`artwork-fallback ${className}`} role="img" aria-label={`${alt} artwork unavailable`}>
        <span aria-hidden="true">✦</span>
      </span>
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      loading={loading}
      onError={() => setFailed(true)}
      src={src}
    />
  );
};

const morePokemon = [
  {
    name: "Eevee",
    detail: "A friend for every kind of adventure",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png",
    color: "lavender",
  },
  {
    name: "Gengar",
    detail: "A little mischief after dark",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png",
    color: "lilac",
  },
  {
    name: "Snorlax",
    detail: "Big naps, even bigger heart",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png",
    color: "sage",
  },
  {
    name: "Dragonite",
    detail: "A gentle giant with sky-high dreams",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png",
    color: "butter",
  },
];

export const Home = ({ onExplore }) => {
  return (
    <main className="home-page">
      <header className="home-nav">
        <a className="home-brand" href="#home" aria-label="Pokéworld home">
          <span className="pokeball-mark" aria-hidden="true">
            <span />
          </span>
          <span>poké<span>world</span></span>
        </a>
        <nav className="home-nav-links" aria-label="Main navigation">
          <a className="active" href="#home">Home</a>
          <a href="#starters">Starters</a>
          <a href="#discover">Discover</a>
          <a href="#about">About</a>
        </nav>
        <button className="nav-cta" onClick={onExplore} type="button">
          Pokédex <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="hero-kicker"><span /> YOUR NEXT ADVENTURE STARTS HERE</p>
          <h1>Find your<br />kind of <span>wonder.</span></h1>
          <p className="hero-description">
            Meet your next favorite Pokémon. Explore a world full of curious
            creatures, unexpected friends, and little adventures.
          </p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={onExplore} type="button">
              Explore Pokémon <span aria-hidden="true">→</span>
            </button>
            <a className="text-cta" href="#starters">Meet the starters <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-note">
            <span className="note-icon" aria-hidden="true">✦</span>
            <span>A whole little world, waiting to be found.</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Featured Pokémon artwork">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-spark spark-one" aria-hidden="true">✳</div>
          <div className="art-spark spark-two" aria-hidden="true">✦</div>
          <div className="art-caption">
            <span className="caption-dot" />
            <span>YOUR ADVENTURE<br /><strong>BEGINS WITH A HELLO</strong></span>
          </div>
          <PokemonImage
            alt="Pikachu, the Electric Mouse Pokémon"
            className="hero-pokemon"
            loading="eager"
            priority
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
          />
          <div className="hero-pokemon-label">
            <span className="label-number">NO. 025</span>
            <span className="label-name">Pikachu</span>
            <span className="label-type"><span /> Electric</span>
          </div>
        </div>
      </section>

      <section className="starter-section" id="starters">
        <div className="section-heading">
          <div>
            <p className="section-kicker">A GOOD PLACE TO BEGIN</p>
            <h2>Say hello to the starters</h2>
          </div>
          <button className="all-pokemon-link" onClick={onExplore} type="button">
            Meet them all <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="starter-grid">
          {featuredPokemon.map((pokemon) => (
            <article className={`starter-card ${pokemon.color}`} key={pokemon.name}>
              <span className="starter-number">NO. {pokemon.number}</span>
              <PokemonImage
                src={pokemon.image}
                alt={pokemon.name}
                className="starter-pokemon"
                loading="eager"
              />
              <div className="starter-info">
                <div>
                  <h3>{pokemon.name}</h3>
                  <p>{pokemon.type}</p>
                </div>
                <span className="card-arrow" aria-hidden="true">↗</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="discover-section" id="discover">
        <div className="section-heading">
          <div>
            <p className="section-kicker">THE WORLD IS FULL OF SURPRISES</p>
            <h2>There are more friends to meet</h2>
          </div>
          <button className="all-pokemon-link" onClick={onExplore} type="button">
            Open the Pokédex <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="discover-grid">
          {morePokemon.map((pokemon, index) => (
            <article className={`discover-card ${pokemon.color}`} key={pokemon.name}>
              <span className="discover-number">FIELD NOTE 0{index + 1}</span>
              <PokemonImage src={pokemon.image} alt={pokemon.name} className="discover-pokemon" />
              <div className="discover-info">
                <div>
                  <h3>{pokemon.name}</h3>
                  <p>{pokemon.detail}</p>
                </div>
                <span aria-hidden="true">✦</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="field-guide-section">
        <div className="field-guide-heading">
          <p className="section-kicker">A POCKET-SIZED FIELD GUIDE</p>
          <h2>Every Pokémon has a story.<br /><span>Find the details that surprise you.</span></h2>
        </div>
        <div className="field-guide-grid">
          <article className="guide-card">
            <span className="guide-icon search-icon" aria-hidden="true">⌕</span>
            <span className="guide-step">01 / LOOK CLOSER</span>
            <h3>Search your curiosity</h3>
            <p>Have a name in mind? Search the Pokédex and find them in a moment.</p>
          </article>
          <article className="guide-card">
            <span className="guide-icon stat-icon" aria-hidden="true">↗</span>
            <span className="guide-step">02 / GET TO KNOW THEM</span>
            <h3>Compare the details</h3>
            <p>Discover each Pokémon’s type, height, weight, speed, and attack.</p>
          </article>
          <article className="guide-card">
            <span className="guide-icon heart-icon" aria-hidden="true">♡</span>
            <span className="guide-step">03 / PICK A FAVORITE</span>
            <h3>Follow your feeling</h3>
            <p>From tiny and speedy to big and sleepy, there’s a Pokémon for you.</p>
          </article>
        </div>
        <button className="primary-cta guide-cta" onClick={onExplore} type="button">
          Start your Pokédex adventure <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="about-strip" id="about">
        <span className="about-icon" aria-hidden="true">◉</span>
        <p><strong>Curiosity looks good on you.</strong> There are 200 Pokémon waiting in the Pokédex.</p>
        <button onClick={onExplore} type="button">Start exploring <span aria-hidden="true">→</span></button>
      </section>

      <footer className="home-footer">
        <a className="home-brand footer-brand" href="#home">
          <span className="pokeball-mark" aria-hidden="true"><span /></span>
          <span>poké<span>world</span></span>
        </a>
        <p>A little adventure, powered by PokéAPI.</p>
        <span className="footer-tag">GOTTA FIND YOUR FAVORITE ✦</span>
      </footer>
    </main>
  );
};
