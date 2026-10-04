"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnswerPicker } from "@/components/AnswerPicker";
import { ProgressPanel } from "@/components/ProgressPanel";
import { WorldMap } from "@/components/WorldMap";
import { COUNTRIES, COUNTRY_BY_ID } from "@/lib/countries";
import { createQuestionOrder, filterCountries, getProgress, isCorrectAnswer, normalizeText, searchCapitals, searchCountries } from "@/lib/game";
import { EMPTY_PROGRESS, loadProgress, saveProgress } from "@/lib/progress-store";
import { CONTINENTS } from "@/types/game";
import type { AnswerChoice, ContinentFilter, GameMode, Question, SavedProgress } from "@/types/game";

const MODES: Array<{ id: GameMode; label: string; short: string; icon: string }> = [
  { id: "country-capital", label: "País → capital", short: "Aprende las capitales", icon: "⌖" },
  { id: "capital-country", label: "Capital → país", short: "Encuentra cada país", icon: "◉" },
  { id: "random", label: "Aleatorio", short: "Una mezcla sorpresa", icon: "✳" },
  { id: "country-capital-map", label: "Capital + mapa", short: "Responde y ubica el país", icon: "◎" },
];

function choiceId(countryId: string, value: string) {
  return `${countryId}:${normalizeText(value)}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function CapitalGame() {
  const [mode, setMode] = useState<GameMode>("country-capital");
  const [continent, setContinent] = useState<ContinentFilter>("Mundo");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [progress, setProgress] = useState<SavedProgress>(EMPTY_PROGRESS);
  const [runCompleted, setRunCompleted] = useState<Set<string>>(new Set());
  const [selectedChoice, setSelectedChoice] = useState<AnswerChoice | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [questionAttempts, setQuestionAttempts] = useState(0);
  const questionAttemptsRef = useRef(0);
  const [selectedMapCountryId, setSelectedMapCountryId] = useState<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const answerLockedRef = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const [runErrors, setRunErrors] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ready, setReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentQuestion = questions[questionIndex] ?? null;
  const currentCountry = currentQuestion ? COUNTRY_BY_ID.get(currentQuestion.countryId) ?? null : null;
  const activeCountries = useMemo(() => filterCountries(COUNTRIES, continent), [continent]);
  const completedIds = useMemo(() => new Set(progress.completedIds), [progress.completedIds]);
  const failedIds = useMemo(() => new Set(progress.failedIds), [progress.failedIds]);
  const concealCurrentMapStatus = currentQuestion?.direction === "country-capital-map" && questionAttempts < 3;
  const mapCompletedIds = useMemo(() => {
    if (!concealCurrentMapStatus || !currentCountry || !completedIds.has(currentCountry.id)) return completedIds;
    const visibleIds = new Set(completedIds);
    visibleIds.delete(currentCountry.id);
    return visibleIds;
  }, [completedIds, concealCurrentMapStatus, currentCountry]);
  const mapFailedIds = useMemo(() => {
    if (!concealCurrentMapStatus || !currentCountry || !failedIds.has(currentCountry.id)) return failedIds;
    const visibleIds = new Set(failedIds);
    visibleIds.delete(currentCountry.id);
    return visibleIds;
  }, [concealCurrentMapStatus, currentCountry, failedIds]);
  const overallProgress = useMemo(() => getProgress(COUNTRIES, completedIds), [completedIds]);
  const isFinished = ready && hasStarted && !currentQuestion;

  const beginGame = useCallback((nextMode: GameMode = mode, nextContinent: ContinentFilter = continent) => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    const countries = filterCountries(COUNTRIES, nextContinent);
    setMode(nextMode);
    setContinent(nextContinent);
    setQuestions(createQuestionOrder(countries, nextMode));
    setQuestionIndex(0);
    setRunCompleted(new Set());
    setSelectedChoice(null);
    setFeedback(null);
    setQuestionAttempts(0);
    questionAttemptsRef.current = 0;
    setSelectedMapCountryId(null);
    setAnswerLocked(false);
    answerLockedRef.current = false;
    setRunErrors(0);
    setHasStarted(true);
    const now = Date.now();
    setStartedAt(now);
    setElapsedSeconds(0);
  }, [continent, mode]);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      const restored = loadProgress(window.localStorage);
      const validIds = new Set(COUNTRIES.map((country) => country.id));
      const sanitized = {
        ...restored,
        completedIds: restored.completedIds.filter((id) => validIds.has(id)),
        failedIds: restored.failedIds.filter((id) => validIds.has(id)),
      };
      setProgress(sanitized);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  }, []);

  useEffect(() => {
    if (!hasStarted || !startedAt || isFinished) return;
    const update = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, isFinished, hasStarted]);

  useEffect(() => {
    if (!showResetConfirm) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowResetConfirm(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showResetConfirm]);

  const save = useCallback((next: SavedProgress) => {
    setProgress(next);
    saveProgress(window.localStorage, next);
  }, []);

  const resetProgress = useCallback(() => {
    save(EMPTY_PROGRESS);
    setShowResetConfirm(false);
    beginGame(mode, continent);
  }, [beginGame, continent, mode, save]);

  const advanceQuestion = useCallback(() => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    setQuestionIndex((index) => index + 1);
    setSelectedChoice(null);
    setSelectedMapCountryId(null);
    setQuestionAttempts(0);
    questionAttemptsRef.current = 0;
    setFeedback(null);
    setAnswerLocked(false);
    answerLockedRef.current = false;
  }, []);

  const scheduleAdvance = useCallback(() => {
    advanceTimer.current = window.setTimeout(advanceQuestion, 650);
  }, [advanceQuestion]);

  const submitAttempt = useCallback((choice: AnswerChoice, mapCountryId?: string) => {
    if (!currentQuestion || !currentCountry || answerLockedRef.current) return;
    const capitalOrCountryCorrect = isCorrectAnswer(currentQuestion, currentCountry, choice);
    const mapCorrect = currentQuestion.direction !== "country-capital-map" || mapCountryId === currentCountry.id;
    if (capitalOrCountryCorrect && mapCorrect) {
      setSelectedChoice(choice);
      setSelectedMapCountryId(mapCountryId ?? null);
      setFeedback("correct");
      setAnswerLocked(true);
      answerLockedRef.current = true;
      setRunCompleted((previous) => new Set(previous).add(currentCountry.id));
      save({
        ...progress,
        completedIds: [...new Set([...progress.completedIds, currentCountry.id])],
        failedIds: progress.failedIds.filter((id) => id !== currentCountry.id),
        correctAnswers: progress.correctAnswers + 1,
      });
      scheduleAdvance();
      return;
    }

    const attempts = questionAttemptsRef.current + 1;
    questionAttemptsRef.current = attempts;
    setQuestionAttempts(attempts);
    setRunErrors((errors) => errors + 1);
    setFeedback("incorrect");
    const shouldMarkFailed = currentQuestion.direction !== "country-capital-map" || attempts >= 3;
    save({
      ...progress,
      failedIds: shouldMarkFailed ? [...new Set([...progress.failedIds, currentCountry.id])] : progress.failedIds,
      errors: progress.errors + 1,
    });
    if (currentQuestion.direction === "country-capital-map") {
      setSelectedChoice(null);
      setSelectedMapCountryId(null);
    } else {
      setSelectedChoice(choice);
    }
    if (attempts >= 3) {
      setAnswerLocked(true);
      answerLockedRef.current = true;
      scheduleAdvance();
    }
  }, [currentCountry, currentQuestion, progress, save, scheduleAdvance]);

  const selectChoice = useCallback((choice: AnswerChoice) => {
    if (!currentQuestion || !currentCountry || answerLockedRef.current) return;
    if (currentQuestion.direction === "country-capital-map") {
      setSelectedChoice(choice);
      if (selectedMapCountryId) submitAttempt(choice, selectedMapCountryId);
      return;
    }
    submitAttempt(choice);
  }, [currentCountry, currentQuestion, selectedMapCountryId, submitAttempt]);

  const choices = useMemo<AnswerChoice[]>(() => {
    if (!currentQuestion) return [];
    if (currentQuestion.direction === "capital-country") {
      return searchCountries(activeCountries, "").map((country) => ({
        id: country.id,
        countryId: country.id,
        value: country.id,
        label: country.name,
      })).sort((left, right) => left.label.localeCompare(right.label, "es"));
    }
    const allOptions = searchCapitals(activeCountries, "");
    const counts = new Map<string, number>();
    for (const option of allOptions) {
      const key = normalizeText(option.capital);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return allOptions.map(({ country, capital }) => ({
      id: choiceId(country.id, capital),
      countryId: country.id,
      value: capital,
      label: capital,
      ...(counts.get(normalizeText(capital))! > 1 ? { detail: country.name } : {}),
    })).sort((left, right) => left.label.localeCompare(right.label, "es") || left.detail?.localeCompare(right.detail ?? "", "es") || 0);
  }, [activeCountries, currentQuestion]);

  const selectMapCountry = (countryId: string) => {
    if (answerLockedRef.current || !currentQuestion) return;
    const country = COUNTRY_BY_ID.get(countryId);
    if (!country) return;
    if (currentQuestion.direction === "country-capital-map") {
      setSelectedMapCountryId(country.id);
      if (selectedChoice) submitAttempt(selectedChoice, country.id);
      return;
    }
    selectChoice({ id: country.id, countryId: country.id, value: country.id, label: country.name });
  };

  return (
    <main className="game-page">
      <div className="game-container">
        <header className="site-header">
          <a href="#inicio" className="brand" aria-label="Capitalízate, inicio" onClick={(event) => { if (hasStarted) { event.preventDefault(); setHasStarted(false); } }}>
            <span className="brand-mark"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="13"/><path d="M5.5 18h25M18 5c4.4 4 6.3 8.2 6.3 13S22.4 27 18 31M18 5c-4.4 4-6.3 8.2-6.3 13S13.6 27 18 31"/><path d="M7.2 11.8c3.3 2 7 3 10.8 3s7.5-1 10.8-3M7.2 24.2c3.3-2 7-3 10.8-3s7.5 1 10.8 3"/></svg></span>
            <span className="brand-word">capitalízate<span className="brand-dot">.</span></span>
          </a>
          <div className="header-right"><span className="header-tag"><span /> APRENDE JUGANDO</span><span className="header-divider" /><button className="header-help" type="button" onClick={() => hasStarted ? setHasStarted(false) : document.getElementById("how-to-play")?.scrollIntoView({ behavior: "smooth" })}>{hasStarted ? "Cambiar recorrido" : "¿Cómo se juega?"} <span>{hasStarted ? "↗" : "↓"}</span></button></div>
        </header>

        {!hasStarted && <section className="intro" id="inicio">
          <div className="intro-copy"><div className="eyebrow intro-kicker">GEOGRAFÍA PARA EXPLORADORES</div><h1>Un mundo por<br/><span>descubrir.</span></h1><p>¿Sabrías encontrar las 195 capitales? Explora el mapa y pon a prueba lo que sabes.</p></div>
          <div className="intro-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-sun"/><span className="art-star star-one">✳</span><span className="art-star star-two">✦</span><span className="art-star star-three">·</span><div className="art-tag">195<br/><small>PAÍSES</small></div></div>
        </section>}

        {!hasStarted && <section className="mode-section" aria-label="Elige un modo de juego">
          <div className="section-label"><span>01</span> ELIGE TU RECORRIDO</div>
          <div className="mode-grid">
            {MODES.map((item) => <button key={item.id} type="button" className={`mode-card${mode === item.id ? " mode-card-active" : ""}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
              <span className="mode-icon" aria-hidden="true">{item.icon}</span><span className="mode-copy"><strong>{item.label}</strong><small>{item.short}</small></span><span className="mode-radio" aria-hidden="true">{mode === item.id && <i/>}</span>
            </button>)}
          </div>
          <div className="continent-row-select"><span className="section-label"><span>02</span> ELIGE UNA REGIÓN</span><div className="continent-chips" role="group" aria-label="Filtrar por continente">
            {["Mundo", ...CONTINENTS].map((item) => <button type="button" key={item} className={`continent-chip${continent === item ? " continent-chip-active" : ""}`} aria-pressed={continent === item} onClick={() => setContinent(item as ContinentFilter)}>{item}</button>)}
          </div></div>
          <div className="setup-actions"><span>Elige el modo y la región y empieza cuando quieras.</span><button type="button" className="setup-play-button" onClick={() => beginGame(mode, continent)} disabled={!ready}>JUGAR <span aria-hidden="true">→</span></button></div>
        </section>}

        {!hasStarted ? <div className="lower-layout setup-lower">
          <section className="journey-card" id="how-to-play"><div className="journey-top"><div><div className="eyebrow">PEQUEÑOS PASOS, GRAN VIAJE</div><h2>Así se aprende<br/>el mundo.</h2></div><span className="journey-star" aria-hidden="true">✳</span></div><ol className="journey-steps"><li><span>01</span><div><strong>Elige un desafío</strong><p>Empieza por donde quieras: países, capitales o un poco de ambos.</p></div></li><li><span>02</span><div><strong>Explora el mapa</strong><p>La pista se ilumina para ayudarte a ubicar cada lugar.</p></div></li><li><span>03</span><div><strong>Aprende a tu ritmo</strong><p>Tu progreso queda guardado para que vuelvas cuando quieras.</p></div></li></ol><div className="journey-footer"><span>✦</span> Un planeta, 195 historias por conocer.</div></section>
        </div> : <>
        <div className="game-screen-heading"><div><div className="section-label"><span>03</span> TU PARTIDA</div><p>{MODES.find((item) => item.id === mode)?.label} <i>·</i> {continent}</p></div><span className="round-count">{currentQuestion ? `${runCompleted.size} / ${questions.length} COMPLETADOS` : "RECORRIDO COMPLETADO"}</span></div>

        {!isFinished ? <section className="play-layout play-layout-focused" aria-label="Partida">
          <WorldMap current={currentCountry} completedIds={mapCompletedIds} failedIds={mapFailedIds} direction={currentQuestion?.direction} selectedCountryId={selectedMapCountryId} onCountrySelect={(country) => selectMapCountry(country.id)} />
          <div className="map-answer-overlay"><AnswerPicker key={`${questionIndex}-${currentQuestion?.countryId}`} choices={choices} selectedId={selectedChoice?.id ?? null} disabled={answerLocked} onSelect={selectChoice} placeholder={currentQuestion?.direction === "capital-country" ? "Buscar país…" : "Buscar capital…"} /></div>
          <div className="map-question-bar" aria-label="Pregunta actual">
            <div className="map-question-copy"><span className="question-badge"><i/> PREGUNTA {String(questionIndex + 1).padStart(2, "0")} <span className="question-timer">{formatDuration(elapsedSeconds)}</span></span><strong>{currentQuestion?.direction === "capital-country" ? `¿En qué país está ${currentCountry?.capital}?` : currentQuestion?.direction === "country-capital-map" ? `¿Cuál es la capital de ${currentCountry?.name} y dónde está en el mapa?` : `¿Cuál es la capital de ${currentCountry?.name}?`}</strong>{currentQuestion?.direction === "country-capital-map" && <small>Debes acertar la capital y seleccionar el país en el mapa. {selectedChoice ? "Ahora señala el país en el mapa." : "Puedes responder en el orden que prefieras."}</small>}{currentCountry?.capitalNote && <small>Nota: {currentCountry.capitalNote}</small>}</div>
            <div className={`feedback-box feedback-box-compact${feedback ? ` feedback-${feedback}` : " feedback-empty"}`} aria-live="polite" aria-atomic="true">
              {feedback === "correct" ? <><span className="feedback-symbol">✓</span><span><strong>¡Muy bien!</strong><small>{currentQuestion?.direction === "capital-country" ? currentCountry?.name : currentCountry?.capital} es correcto. Siguiente…</small></span></> : feedback === "incorrect" ? <><span className="feedback-symbol">↻</span><span><strong>{questionAttempts >= 3 ? "Se acabaron los intentos" : `Respuesta incorrecta · intento ${questionAttempts} de 3`}</strong><small>{questionAttempts >= 3 ? "Pasando a la siguiente pregunta…" : currentQuestion?.direction === "country-capital-map" ? `Debes acertar ambas partes. Te quedan ${3 - questionAttempts} ${questionAttempts === 2 ? "intento" : "intentos"}.` : `Vuelve a elegir. Te quedan ${3 - questionAttempts} ${questionAttempts === 2 ? "intento" : "intentos"}.`}</small></span></> : <><span className="feedback-symbol">✳</span><span><strong>Tu turno</strong><small>{currentQuestion?.direction === "country-capital-map" ? "Elige la capital y señala el país en el mapa." : "Elige una respuesta para continuar."}</small></span></>}
            </div>
          </div>
        </section> : <section className="results-card" aria-labelledby="results-title">
          <div className="results-ornament" aria-hidden="true">✳</div><span className="eyebrow">HAS COMPLETADO TU RECORRIDO</span><h2 id="results-title">¡Vuelta al mundo<br/><em>completada!</em></h2><p className="results-subtitle">Cada respuesta es un nuevo lugar que ahora conoces.</p>
          <div className="result-stat-grid"><div><strong>{runCompleted.size}<small> / {questions.length}</small></strong><span>RESPUESTAS CORRECTAS</span></div><div><strong>{overallProgress.percent}<small>%</small></strong><span>PROGRESO TOTAL</span></div><div><strong>{formatDuration(elapsedSeconds)}</strong><span>TIEMPO DE PARTIDA</span></div><div><strong>{runErrors}</strong><span>ERRORES</span></div></div>
          <button type="button" className="continue-button result-button" onClick={() => beginGame(mode, continent)}>Jugar otra vez <span aria-hidden="true">↻</span></button>
          <button type="button" className="result-reset-button" onClick={() => setShowResetConfirm(true)}>Reiniciar progreso guardado</button>
        </section>}
        {!isFinished && <ProgressPanel compact completed={overallProgress.completed} total={overallProgress.total} percent={overallProgress.percent} byContinent={overallProgress.byContinent} onReset={() => setShowResetConfirm(true)}/>}
        </>}
        {!hasStarted && <footer className="site-footer"><a href="#inicio" className="footer-brand">capitalízate<span>.</span></a><span>Hecho para mentes curiosas <b>✳</b></span><a href="#how-to-play">¿Cómo funciona? ↑</a></footer>}
        {showResetConfirm && <div className="reset-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowResetConfirm(false); }}><section className="reset-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"><span className="eyebrow">PROGRESO GUARDADO</span><h2 id="reset-title">¿Reiniciar tu progreso?</h2><p id="reset-description">Se borrarán los países aprendidos y los errores guardados. Esta partida volverá a empezar desde cero.</p><div className="reset-dialog-actions"><button type="button" className="reset-cancel-button" onClick={() => setShowResetConfirm(false)} autoFocus>Cancelar</button><button type="button" className="reset-confirm-button" onClick={resetProgress}>Sí, reiniciar</button></div></section></div>}
      </div>
    </main>
  );
}
