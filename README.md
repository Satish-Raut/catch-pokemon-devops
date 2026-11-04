
# Catch Pokemon

🚀 **Live Demo:** [https://pokemonword.netlify.app](https://pokemonword.netlify.app)  
<a href="https://pokemonword.netlify.app" target="_blank" style="font-size:1.2em; font-weight:bold; color:#e67e22;">👉 View the Project Live Here</a>

A React project to fetch and display Pokémon data using the PokéAPI. The app features a responsive card layout, search functionality, and modern UI design.

## Features

- Fetches Pokémon data from the PokéAPI
- Displays Pokémon cards with images, types, stats, and abilities
- Responsive grid layout for cards
- Search bar to filter Pokémon by name
- Pokémon detail pages with PokéAPI data and TMDB trailers/clips
- Clean and modern UI with CSS Grid and Flexbox

## Getting Started

### Prerequisites

- Node.js (v16 or above recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Satish-Raut/Catch-Pokemon
   cd Catch-Pokemon
   ```

2. Install dependencies:

   ```sh
   npm install
   # or
   yarn install
   ```

3. Configure the TMDB API key. Copy `.env.example` to `.env.local` and set `VITE_TMDB_API_KEY` to your TMDB v3 API key.

   ```env
   VITE_TMDB_API_KEY=your_tmdb_v3_api_key
   ```

   This browser-based app uses the v3 API key, which is visible in the built frontend. Do not use a private TMDB read access token here.
   TMDB provides title/video metadata; clips play from YouTube. The app searches for Pokémon titles that mention the selected Pokémon by name. TMDB does not provide a character-to-video relationship, so many Pokémon will have no matching clips.

4. Start the development server:

   ```sh
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

For Jenkins/Docker deployment, add a Jenkins **Secret text** credential with ID `tmdb-api-key` and the v3 API key as its value. The Docker build passes it to Vite; the key will be public in the static frontend bundle.

## Project Structure

```
Catch Pokemon/
├── public/
├── src/
│   ├── App.jsx
│   ├── Pokemon.jsx
│   ├── PokemonCards.jsx
│   ├── index.css
│   └── ...
├── package.json
├── vite.config.js
└── README.md
```

## API Reference

- [PokéAPI](https://pokeapi.co/)
- [The Movie Database (TMDB) API](https://developer.themoviedb.org/)

## Notes & Learning Points

- **Promise.all**: Used to fetch multiple Pokémon in parallel. Resolves when all fetches complete, rejects if any fail.
- **Responsive Design**: Utilizes CSS Grid and media queries to ensure cards look good on all devices.
- **Component Structure**: Each Pokémon card is a reusable component (`PokemonCards`).
- **Destructuring & Optional Chaining**: Used for safe access to deeply nested API data.
- **Array Methods**: `.map()`, `.join()`, `.slice()` are used for rendering lists and formatting data.
- **Modern CSS**: Uses Flexbox, Grid, and custom properties for layout and style.
- **Error Handling**: Always handle API errors gracefully in production apps.

---

Feel free to use this project as a reference for learning React, API integration, and responsive design!
