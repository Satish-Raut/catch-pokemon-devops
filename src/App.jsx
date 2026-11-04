import { useState } from "react";
import { Home } from "./Home";
import { Pokemon } from "./Pokemon";
import "./App.css";

const App = () => {
  const [showPokedex, setShowPokedex] = useState(false);

  return showPokedex ? (
    <Pokemon onHome={() => setShowPokedex(false)} />
  ) : (
    <Home onExplore={() => setShowPokedex(true)} />
  );
};

export default App;
