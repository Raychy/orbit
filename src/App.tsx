import { ArrowUpRight } from "lucide-react";
import OrbitPlayground from "./OrbitPlayground";

export default function App() {
  return (
    <main className="orbit-page">
      <header className="container orbit-page-header">
        <div className="orbit-page-title">
          <div>
            <p className="eyebrow">Independent experiment / 001</p>
            <h1>
              Orbit<span>.</span>
            </h1>
          </div>
          <p>
            A kinetic playground.
            <br />A study in motion, interaction, and the space between.
          </p>
        </div>
      </header>
      <div className="container">
        <OrbitPlayground />
      </div>
      <footer className="container orbit-page-contact">
        <p>Built by Racheal Adeyemi.</p>
        <a className="text-link" href="https://racheal-adeyemi.vercel.app">
          See the portfolio <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
