"use client";

import { useMemo, useState } from "react";
import { normalizeText } from "@/lib/game";
import type { AnswerChoice } from "@/types/game";

interface AnswerPickerProps {
  choices: AnswerChoice[];
  selectedId: string | null;
  disabled: boolean;
  onSelect: (choice: AnswerChoice) => void;
  placeholder: string;
}

export function AnswerPicker({ choices, selectedId, disabled, onSelect, placeholder }: AnswerPickerProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const filteredChoices = useMemo(() => {
    const normalized = normalizeText(query);
    return normalized ? choices.filter((choice) => normalizeText(`${choice.label} ${choice.detail ?? ""}`).includes(normalized)) : choices;
  }, [choices, query]);

  return (
    <div className={`answer-picker${expanded ? " answer-picker-expanded" : ""}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false); }}>
      <label className="search-label" htmlFor="answer-search">Buscar respuesta</label>
      <div className="search-wrap">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon"><circle cx="10.8" cy="10.8" r="6.4" /><path d="m16 16 4.2 4.2" /></svg>
        <input
          id="answer-search"
          autoComplete="off"
          role="combobox"
          aria-expanded={expanded}
          aria-controls="answer-list"
          aria-activedescendant={filteredChoices[activeIndex] ? `answer-${filteredChoices[activeIndex].id}` : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onFocus={() => setExpanded(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, filteredChoices.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            if (event.key === "Enter" && filteredChoices[activeIndex]) { event.preventDefault(); onSelect(filteredChoices[activeIndex]); setExpanded(false); }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        <kbd className="search-shortcut">⌕</kbd>
      </div>
      <div className="answer-list" role="listbox" id="answer-list" aria-label="Opciones de respuesta">
        {filteredChoices.length ? filteredChoices.map((choice, index) => (
          <button
            type="button"
            role="option"
            aria-selected={selectedId === choice.id}
            id={`answer-${choice.id}`}
            key={choice.id}
            className={`answer-option${selectedId === choice.id ? " answer-option-selected" : ""}${activeIndex === index ? " answer-option-active" : ""}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => { onSelect(choice); setExpanded(false); }}
            disabled={disabled}
          >
            <span>{choice.label}</span>
            {choice.detail && <small>{choice.detail}</small>}
            {selectedId === choice.id && <span className="choice-check" aria-hidden="true">✓</span>}
          </button>
        )) : <p className="empty-search">No hay coincidencias. Prueba con otra búsqueda.</p>}
      </div>
      <p className="picker-tip">Escribe para filtrar · usa ↑ ↓ y Enter para elegir</p>
    </div>
  );
}
