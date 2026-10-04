"use client";

import { CONTINENTS } from "@/types/game";
import type { ContinentProgress } from "@/types/game";

interface ProgressPanelProps {
  completed: number;
  total: number;
  percent: number;
  byContinent: ContinentProgress[];
  compact?: boolean;
  onReset?: () => void;
}

const CONTINENT_ICONS: Record<string, string> = {
  Europa: "✳", Asia: "◈", África: "✺", América: "◉", Oceanía: "⌁",
};

export function ProgressPanel({ completed, total, percent, byContinent, compact = false, onReset }: ProgressPanelProps) {
  const counts = new Map(byContinent.map((item) => [item.continent, item]));
  return (
    <aside className={`progress-card${compact ? " progress-card-compact" : ""}`} aria-label="Progreso por continente">
      {!compact && <div className="progress-title-row"><div><div className="eyebrow">TU RECORRIDO</div><h2>Tu progreso</h2></div><span className="progress-globe">◎</span></div>}
      <div className="progress-total">
        <div><strong>{completed}</strong><span> / {total} países</span></div><b>{percent}%</b>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Progreso total" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${percent}%` }} /></div>
      <p className="progress-caption">países aprendidos</p>
      <div className="continent-list">
        {CONTINENTS.map((continent) => {
          const value = counts.get(continent) ?? { continent, completed: 0, total: 0 };
          const width = value.total ? Math.round((value.completed / value.total) * 100) : 0;
          return <div className="continent-row" key={continent}>
            <span className="continent-icon" aria-hidden="true">{CONTINENT_ICONS[continent]}</span>
            <div className="continent-copy"><span>{continent}</span><div className="continent-track"><i style={{ width: `${width}%` }} /></div></div>
            <small>{value.completed}<span>/{value.total}</span></small>
          </div>;
        })}
      </div>
      {compact && onReset && <button type="button" className="progress-reset-button" aria-label="Reiniciar progreso guardado" onClick={onReset}><span aria-hidden="true">↻</span><span className="progress-reset-label">Reiniciar</span></button>}
      <div className="progress-footer"><span className="footer-sparkle">✳</span><span>Cada respuesta te acerca a una vuelta al mundo.</span></div>
    </aside>
  );
}
