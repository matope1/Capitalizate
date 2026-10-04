"use client";

import { useEffect, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, Sphere, ZoomableGroup } from "react-simple-maps";
import { COUNTRY_BY_ID } from "@/lib/countries";
import { getMapCountryState } from "@/lib/map-state";
import type { Country, QuestionDirection } from "@/types/game";

interface WorldMapProps {
  current: Country | null;
  completedIds: ReadonlySet<string>;
  failedIds: ReadonlySet<string>;
  direction?: QuestionDirection;
  onCountrySelect?: (country: Country) => void;
  selectedCountryId?: string | null;
}

const SMALL_COUNTRY_IDS = new Set(["AND", "LIE", "MCO", "SMR", "VAT", "MLT", "SGP", "BHR"]);

export function WorldMap({ current, completedIds, failedIds, direction, onCountrySelect, selectedCountryId }: WorldMapProps) {
  const hideCurrent = direction === "country-capital-map";
  const mapCurrent = hideCurrent ? null : current;
  const [worldViewFor, setWorldViewFor] = useState<string | null>(null);
  const [peekCountry, setPeekCountry] = useState<Country | null>(null);
  const userGestureRef = useRef(false);
  const zoomLevelRef = useRef(1);
  const showWorld = hideCurrent || worldViewFor === (current?.id ?? "empty-map");
  const viewKey = showWorld ? "world" : current?.id ?? "empty-map";
  const [zoomOverride, setZoomOverride] = useState<{ viewKey: string; zoom: number } | null>(null);
  const [centerOverride, setCenterOverride] = useState<{ viewKey: string; center: [number, number] } | null>(null);
  const zoomLevel = zoomOverride?.viewKey === viewKey ? zoomOverride.zoom : mapCurrent && !showWorld ? 2.7 : 1;
  const mapCenter = centerOverride?.viewKey === viewKey ? centerOverride.center : mapCurrent && !showWorld ? mapCurrent.coordinates : [0, 0] as [number, number];

  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [viewKey, zoomLevel]);

  return (
    <section className="map-card" aria-label="Mapa interactivo del mundo">
      <div className="map-head">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> MAPA INTERACTIVO</div>
          <h2>{hideCurrent ? current?.name ?? "Explora el mapa" : peekCountry?.name ?? current?.name ?? "Una vuelta al mundo"}</h2>
          <p>{hideCurrent ? "Selecciona en el mapa el país de la pregunta." : peekCountry ? "País señalado en el mapa." : current ? "El país de esta pregunta está resaltado en el mapa." : "195 países · fronteras y territorios."}</p>
        </div>
        <div className="map-controls">
          <div className="zoom-controls" aria-label="Controles de zoom"><button type="button" aria-label="Ampliar mapa" onClick={() => { const next = Math.min(zoomLevelRef.current * 1.5, 16); zoomLevelRef.current = next; setZoomOverride({ viewKey, zoom: next }); }}>+</button><button type="button" aria-label="Reducir mapa" onClick={() => { const next = Math.max(zoomLevelRef.current / 1.5, 1); zoomLevelRef.current = next; setZoomOverride({ viewKey, zoom: next }); }}>−</button></div>
          {!hideCurrent && <button className="map-control" onClick={() => setWorldViewFor(showWorld ? null : current?.id ?? "empty-map")} type="button" aria-label={showWorld ? "Centrar el mapa en el país actual" : "Mostrar el mapa completo"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 8l5 5m11-5-5 5m5 3-5-5m-11 5 5-5" /></svg>
            {showWorld ? "Centrar país" : "Ver mundo"}
          </button>}
        </div>
      </div>
      <div className="map-canvas">
        <ComposableMap className="world-map" projection="geoEqualEarth" projectionConfig={{ scale: 154 }} aria-label="Mapa mundial interactivo">
          <ZoomableGroup
            center={mapCenter}
            zoom={zoomLevel}
            minZoom={1}
            maxZoom={16}
            onMoveStart={(_, event) => { if (event.sourceEvent) userGestureRef.current = true; }}
            onMove={({ zoom }) => { if (typeof zoom === "number") zoomLevelRef.current = zoom; }}
            onMoveEnd={({ zoom, coordinates }) => {
              if (!userGestureRef.current) return;
              userGestureRef.current = false;
              setPeekCountry(null);
              if (typeof zoom === "number") {
                zoomLevelRef.current = zoom;
                setZoomOverride({ viewKey, zoom });
              }
              if (coordinates) setCenterOverride({ viewKey, center: coordinates });
            }}
          >
            <Sphere fill="#f5f7f7" stroke="#dfe5e3" strokeWidth={0.5} />
            <Geographies geography="/countries-50m.json">
              {({ geographies }) => geographies.map((geography) => {
                const { country, isCurrent, isComplete, hasFailed } = getMapCountryState(
                  String(geography.id ?? ""), mapCurrent?.id, completedIds, failedIds,
                );
                const isSelected = country?.id === selectedCountryId;
                return (
                  <Geography
                    key={geography.rsmKey}
                    geography={geography}
                    aria-label={country ? `${country.name}${isCurrent ? ", país actual" : ""}${isComplete ? ", completado" : ""}` : String(geography.properties?.name ?? "País")}
                    role={country ? "button" : undefined}
                    tabIndex={country ? 0 : -1}
                    onMouseEnter={() => country && !userGestureRef.current && setPeekCountry(country)}
                    onMouseLeave={() => !userGestureRef.current && setPeekCountry(null)}
                    onFocus={() => country && setPeekCountry(country)}
                    onBlur={() => setPeekCountry(null)}
                    onClick={() => {
                      if (!country) return;
                      if (direction === "capital-country" || direction === "country-capital-map") onCountrySelect?.(country);
                      else setPeekCountry(country);
                    }}
                    onKeyDown={(event) => {
                      if (country && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        if (direction === "capital-country" || direction === "country-capital-map") onCountrySelect?.(country);
                        else setPeekCountry(country);
                      }
                    }}
                    className={`${isCurrent ? "country-current" : ""}${isComplete ? " country-complete" : ""}${hasFailed ? " country-failed" : ""}${isSelected ? " country-choice" : ""}`}
                    fill={isCurrent ? "#ed8c4f" : isSelected ? "#b9a6d5" : isComplete ? "#97cfc1" : hasFailed ? "#f4c0ab" : "#e4e9e6"}
                    stroke={isCurrent ? "#c46032" : isSelected ? "#715797" : isComplete ? "#78b3a4" : "#ffffff"}
                    strokeWidth={isCurrent || isSelected ? 1.45 : isComplete ? 0.75 : 0.55}
                    strokeDasharray={isComplete ? "2 1" : undefined}
                    style={{ cursor: country && (direction === "capital-country" || direction === "country-capital-map") ? "pointer" : "default" }}
                  />
                );
              })}
            </Geographies>
            {mapCurrent?.mapPointFallback && <Marker coordinates={mapCurrent.coordinates}>
              <circle r={4.6 / zoomLevel} fill="#ed8c4f" stroke="#fff" strokeWidth={1.3} />
              <circle r={8 / zoomLevel} fill="none" stroke="#c46032" strokeWidth={0.7} />
            </Marker>}
            {Array.from(SMALL_COUNTRY_IDS, (id) => {
              const country = COUNTRY_BY_ID.get(id);
              if (!country) return null;
              const isCurrent = mapCurrent?.id === id;
              const isPeeked = peekCountry?.id === id;
              return <Marker key={`small-${id}`} coordinates={country.coordinates}>
                <circle
                  className="small-country-marker"
                  r={(isCurrent || isPeeked ? 3.6 : 2.2) / zoomLevel}
                  fill={isCurrent ? "#ed8c4f" : selectedCountryId === id ? "#b9a6d5" : isPeeked ? "#d18b62" : "#668d78"}
                  stroke={selectedCountryId === id ? "#715797" : "#fff"}
                  strokeWidth={(selectedCountryId === id ? 2 : 1.25) / zoomLevel}
                  role="button"
                  tabIndex={0}
                  aria-label={country.name}
                  onMouseEnter={() => !userGestureRef.current && setPeekCountry(country)}
                  onMouseLeave={() => !userGestureRef.current && setPeekCountry(null)}
                  onFocus={() => setPeekCountry(country)}
                  onBlur={() => setPeekCountry(null)}
                  onClick={() => (direction === "capital-country" || direction === "country-capital-map") && onCountrySelect?.(country)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (direction === "capital-country" || direction === "country-capital-map") onCountrySelect?.(country);
                      else setPeekCountry(country);
                    }
                  }}
                />
              </Marker>;
            })}
          </ZoomableGroup>
        </ComposableMap>
        {current && !hideCurrent && <div className="map-callout"><span className="map-callout-icon">⌖</span><span>{peekCountry?.name ?? current.name}</span><span className="map-callout-label">{peekCountry?.id === current.id ? "PAÍS ACTUAL" : peekCountry ? "EXPLORANDO" : "PAÍS ACTUAL"}</span></div>}
      </div>
      <div className="map-legend" aria-label="Leyenda del mapa">
        {hideCurrent ? <span><i className="legend-dot" style={{ background: "#b9a6d5" }} /> Tu selección</span> : <span><i className="legend-dot legend-active" /> Pregunta actual</span>}
        <span><i className="legend-dot legend-done">✓</i> Aprendidos</span>
        <span><i className="legend-dot legend-error">!</i> Con errores</span>
        <span className="map-pan-note">Arrastra para mover · rueda para acercar</span>
      </div>
    </section>
  );
}
