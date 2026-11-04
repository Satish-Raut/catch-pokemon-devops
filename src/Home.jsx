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
          <img
            className="hero-pokemon"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
            alt="Pikachu, the Electric Mouse Pokémon"
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
              <img src={pokemon.image} alt={pokemon.name} loading="lazy" />
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
