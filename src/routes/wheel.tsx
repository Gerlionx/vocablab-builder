import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnswerRevealer } from "@/components/wheel/AnswerRevealer";
import { NameWheel } from "@/components/wheel/NameWheel";
import { PlayLeaderboard } from "@/components/wheel/PlayLeaderboard";
import { SetupPanel } from "@/components/wheel/SetupPanel";
import { TeamToss } from "@/components/wheel/TeamToss";
import {
  DEFAULT_WHEEL_SETTINGS,
  loadWheelSettings,
  saveWheelSettings,
  type WheelSettings,
} from "@/lib/game-settings";
import { parseNames } from "@/lib/parse-names";
import {
  colorById,
  DEFAULT_TEAM_COLOR_IDS,
  rainbowPaint,
  splitTeams,
  teamSlicePaint,
} from "@/lib/team-colors";
import { SEED_WORDS, filterWords, pickPrompt, type Word } from "@/lib/vocab-data";
import {
  readSessionNames,
  readSessionRoster,
  resetSessionNamesForDesk,
  writeSessionNames,
  writeSessionRoster,
} from "@/lib/teacher-session";
import {
  playCorrect,
  playFanfare,
  playMiss,
  playNameLock,
  playPegTick,
  playTimeout,
  playUrgentTick,
  playWhoosh,
} from "@/lib/wheel-audio";
import { winnerIndex } from "@/lib/wheel-math";
import { buildRevealPlan, canRevealMore, displayAnswer } from "@/lib/wheel-answer-reveal";
import { pointsForAnswer } from "@/lib/wheel-scoring";
import { WheelPhysics } from "@/lib/wheel-physics";
import {
  lastWheelLesson,
  lessonToSettings,
  listWheelLessons,
  rememberWheelLessonId,
  type WheelLesson,
} from "@/lib/wheel-lessons";

export const Route = createFileRoute("/wheel")({
  head: () => ({
    meta: [{ title: "Wheel of names — Vocablab" }],
  }),
  component: WheelPage,
});

type TeamId = number;
type Scene =
  "toss" | "wheel" | "spinning" | "landed" | "exiting" | "question" | "entering" | "winner";
type Prompt = { word: Word; askFrench: boolean };
type Player = { name: string; team: TeamId };

function padRoster(parts: string[][]): string[][] {
  return [parts[0] ?? [], parts[1] ?? [], parts[2] ?? []];
}

function openingLesson(): WheelLesson | null {
  if (typeof window === "undefined") return null;
  return lastWheelLesson();
}

function WheelPage() {
  const boot = openingLesson();
  const [years, setYears] = useState<string[]>(boot?.years ?? ["Year 7"]);
  const [terms, setTerms] = useState<string[]>(boot?.terms ?? ["Term 1"]);
  const [topics, setTopics] = useState<string[]>(boot?.topics ?? []);
  const [difficulties, setDifficulties] = useState<string[]>(boot?.difficulties ?? []);
  const [namesText, setNamesText] = useState(() => readSessionNames());
  const [teamsOn, setTeamsOn] = useState(false);
  const [teamCount, setTeamCount] = useState<2 | 3>(2);
  const [colorIds, setColorIds] = useState<string[]>([...DEFAULT_TEAM_COLOR_IDS]);
  const [roster, setRoster] = useState<string[][]>(() => readSessionRoster());
  const [lessons, setLessons] = useState<WheelLesson[]>(() => listWheelLessons());
  const [activeLessonId, setActiveLessonId] = useState<string | null>(boot?.id ?? null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [wheelHover, setWheelHover] = useState(false);
  const deskOpen = !started || panelOpen;
  const playing = started && !panelOpen;
  const paused = started && panelOpen;
  const [settings, setSettings] = useState<WheelSettings>(() => {
    if (boot) return lessonToSettings(boot);
    return typeof window === "undefined" ? DEFAULT_WHEEL_SETTINGS : loadWheelSettings();
  });
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;
  const [scene, setScene] = useState<Scene>("wheel");
  const [angle, setAngle] = useState(0);
  const [clickerDeg, setClickerDeg] = useState(0);
  const [picked, setPicked] = useState<Player | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [revealStep, setRevealStep] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0]);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [banks, setBanks] = useState<number[]>([90, 90, 90]);
  const [turn, setTurn] = useState<TeamId>(0);
  const [winner, setWinner] = useState<TeamId | "draw" | null>(null);
  const [scoreBurst, setScoreBurst] = useState<TeamId | null>(null);
  const [scoreFly, setScoreFly] = useState<{
    target: TeamId;
    value: number;
    player: string;
  } | null>(null);
  const [tossWinner, setTossWinner] = useState<TeamId>(0);
  const [usedWordIds, setUsedWordIds] = useState<Set<string>>(new Set());

  const angleRef = useRef(0);
  const physicsRef = useRef<WheelPhysics | null>(null);
  const landRef = useRef<(deg: number) => void>(() => {});
  const panelRef = useRef<HTMLElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const banksRef = useRef(banks);
  const sceneRef = useRef(scene);
  const turnRef = useRef(turn);
  const scoresRef = useRef(scores);
  const emptyHandled = useRef(false);
  const lastKidRef = useRef<string | null>(null);
  banksRef.current = banks;
  sceneRef.current = scene;
  turnRef.current = turn;
  scoresRef.current = scores;
  const deskOpenRef = useRef(deskOpen);
  deskOpenRef.current = deskOpen;

  const pool = useMemo(
    () => filterWords(SEED_WORDS, { years, terms, topics, difficulties }),
    [years, terms, topics, difficulties],
  );

  const allNames = useMemo(() => parseNames(namesText), [namesText]);

  useEffect(() => {
    if (!teamsOn) return;
    const joined = roster.slice(0, teamCount).flat().join("\n");
    setNamesText((cur) => {
      if (cur === joined) return cur;
      writeSessionNames(joined);
      return joined;
    });
  }, [roster, teamCount, teamsOn]);

  const players = useMemo<Player[]>(() => {
    if (!teamsOn) return allNames.map((name) => ({ name, team: 0 }));
    const seen = new Set<string>();
    const list: Player[] = [];
    for (let t = 0; t < teamCount; t++) {
      for (const name of roster[t] ?? []) {
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ name, team: t });
      }
    }
    return list;
  }, [allNames, roster, teamCount, teamsOn]);

  const palettes = useMemo(
    () => colorIds.slice(0, teamCount).map((id) => colorById(id)),
    [colorIds, teamCount],
  );

  const wheelPlayers = useMemo(() => {
    if (!teamsOn) return players;
    return players.filter((p) => p.team === turn);
  }, [players, teamsOn, turn]);

  const slices = useMemo(() => {
    const list = wheelPlayers.length ? wheelPlayers : [{ name: "Add names", team: turn }];
    if (teamsOn) {
      const palette = palettes[turn] ?? palettes[0]!;
      return list.map((p, i) => ({ name: p.name, ...teamSlicePaint(palette, i) }));
    }
    return list.map((p, i) => ({ name: p.name, ...rainbowPaint(i) }));
  }, [palettes, teamsOn, turn, wheelPlayers]);

  const idleSlices = useMemo(() => {
    if (teamsOn) {
      if (!players.length) {
        return Array.from({ length: 8 }, (_, i) => ({ name: "", ...rainbowPaint(i) }));
      }
      // Same paint as the team name pills: each kid keeps their team colour on the disc.
      const shadeAt = new Map<number, number>();
      return players.map((p) => {
        const i = shadeAt.get(p.team) ?? 0;
        shadeAt.set(p.team, i + 1);
        const palette = palettes[p.team] ?? palettes[0]!;
        return { name: p.name, ...teamSlicePaint(palette, i) };
      });
    }
    if (!allNames.length) {
      return Array.from({ length: 8 }, (_, i) => ({ name: "", ...rainbowPaint(i) }));
    }
    return allNames.map((name, i) => ({ name, ...rainbowPaint(i) }));
  }, [allNames, palettes, players, teamsOn]);

  const onDisc =
    scene === "wheel" ||
    scene === "spinning" ||
    scene === "landed" ||
    scene === "exiting" ||
    scene === "entering";

  /** Setup shows the pasted class; play uses the live turn disc. */
  const wheelSlices = started ? slices : idleSlices;

  const canStart =
    Boolean(activeLessonId) &&
    pool.length > 0 &&
    (teamsOn ? roster.slice(0, teamCount).every((col) => col.length > 0) : allNames.length > 0);

  const matchOn = started && teamsOn;
  const timeMatch = matchOn && settings.winMode === "time";
  const showPlayWheel = playing && onDisc;
  const showWheel = !started || onDisc || paused;
  const namesVisible = scene !== "exiting";
  const wheelMotion = showPlayWheel
    ? scene === "exiting"
      ? "exit"
      : scene === "entering"
        ? "enter"
        : null
    : null;

  // Refresh lesson list when the desk opens (teacher may have just saved one).
  useEffect(() => {
    if (!deskOpen) return;
    setLessons(listWheelLessons());
  }, [deskOpen]);

  useEffect(() => {
    if (!paused) return;
    const onDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (panelRef.current?.contains(node)) return;
      if (tabRef.current?.contains(node)) return;
      setPanelOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [paused]);

  const finishMatch = useCallback(
    (nextScores: number[]) => {
      const slice = nextScores.slice(0, teamCount);
      const max = Math.max(...slice, 0);
      const ids = slice.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0);
      setWinner(ids.length === 1 ? ids[0]! : "draw");
      setScene("winner");
      void playFanfare();
    },
    [teamCount],
  );

  const onBankEmpty = useCallback(
    (emptyTeam: TeamId) => {
      if (sceneRef.current === "winner") return;
      void playTimeout();
      setRevealStep(0);
      setPrompt(null);
      const n = teamCount;
      let next: TeamId | null = null;
      for (let step = 1; step <= n; step++) {
        const cand = (emptyTeam + step) % n;
        if ((banksRef.current[cand] ?? 0) > 0) {
          next = cand;
          break;
        }
      }
      if (next == null) {
        finishMatch(scoresRef.current);
        return;
      }
      setTurn(next);
      angleRef.current = 0;
      setAngle(0);
      physicsRef.current?.reset(0);
      setScene("entering");
      window.setTimeout(() => setScene("wheel"), 650);
    },
    [finishMatch, teamCount],
  );

  useEffect(() => {
    if (scene === "question") emptyHandled.current = false;
  }, [scene, picked]);

  useEffect(() => {
    if (!timeMatch || scene !== "question" || panelOpen) return;
    const id = window.setInterval(() => {
      const team = turnRef.current;
      setBanks((prev) => {
        const current = prev[team] ?? 0;
        if (current <= 0) return prev;
        const remaining = Math.max(0, current - 0.25);
        const next = [...prev];
        next[team] = remaining;
        return next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [timeMatch, scene, panelOpen]);

  useEffect(() => {
    if (!timeMatch || scene !== "question") return;
    if ((banks[turn] ?? 0) > 0) return;
    if (emptyHandled.current) return;
    emptyHandled.current = true;
    onBankEmpty(turn);
  }, [banks, turn, timeMatch, scene, onBankEmpty]);

  const lastUrgent = useRef(11);
  useEffect(() => {
    if (!timeMatch || scene !== "question" || panelOpen) {
      lastUrgent.current = 11;
      return;
    }
    const remaining = banks[turn] ?? 0;
    const sec = Math.ceil(remaining);
    if (remaining > 10 || remaining <= 0) {
      lastUrgent.current = 11;
      return;
    }
    if (sec < lastUrgent.current) {
      lastUrgent.current = sec;
      void playUrgentTick();
    }
  }, [banks, timeMatch, scene, turn, panelOpen]);

  useEffect(() => {
    const sim = new WheelPhysics(Math.max(1, slices.length), {
      onFrame: (frame) => {
        angleRef.current = frame.angleDeg;
        setAngle(frame.angleDeg);
        setClickerDeg(frame.clickerDeg);
      },
      onPegs: (crossed, speed, dt) => {
        if (deskOpenRef.current) return;
        const span = Math.max(0, Math.min(0.05, dt));
        for (let j = 0; j < crossed; j++) {
          void playPegTick(speed, ((j + Math.random()) / crossed) * span);
        }
      },
      onRest: (deg) => landRef.current(deg),
    });
    physicsRef.current = sim;
    if (!started) sim.idle();
    return () => {
      sim.destroy();
      physicsRef.current = null;
    };
    // One simulator for the page; peg count and idle/freeze sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    physicsRef.current?.setPegCount(Math.max(1, wheelSlices.length));
  }, [wheelSlices.length]);

  useEffect(() => {
    const sim = physicsRef.current;
    if (!sim) return;
    if (!started) {
      if (wheelHover) sim.freeze();
      else sim.idle();
      return;
    }
    if (panelOpen || scene !== "spinning") {
      sim.freeze();
    }
  }, [started, panelOpen, scene, wheelHover]);

  function syncNamesIntoTeams(text: string, count = teamCount) {
    const next = padRoster(splitTeams(parseNames(text), count));
    setRoster(next);
    writeSessionRoster(next);
  }

  function handleNames(text: string) {
    setNamesText(text);
    writeSessionNames(text);
    if (!teamsOn) return;
    const names = parseNames(text);
    setRoster((prev) => {
      const kept = prev.map((col) => col.filter((n) => names.includes(n)));
      const assigned = new Set(kept.flat());
      const next = kept.map((col) => [...col]);
      for (const name of names) {
        if (assigned.has(name)) continue;
        let smallest = 0;
        for (let i = 1; i < teamCount; i++) {
          if ((next[i]?.length ?? 0) < (next[smallest]?.length ?? 0)) smallest = i;
        }
        next[smallest]!.push(name);
      }
      const padded = padRoster(next);
      writeSessionRoster(padded);
      return padded;
    });
  }

  function toggleTeams() {
    if (!teamsOn) syncNamesIntoTeams(namesText);
    setTeamsOn((on) => !on);
  }

  function changeTeamCount(n: 2 | 3) {
    setTeamCount(n);
    syncNamesIntoTeams(namesText, n);
  }

  function dropName(name: string, to: number) {
    setRoster((prev) => {
      if (to < 0 || to >= teamCount) return prev;
      if (prev[to]?.includes(name)) return prev;
      const next = padRoster(
        prev.map((col, i) => {
          const without = col.filter((n) => n !== name);
          if (i === to) return [...without, name];
          return without;
        }),
      );
      writeSessionRoster(next);
      return next;
    });
  }

  function pasteTeam(team: number, text: string) {
    const names = parseNames(text);
    setRoster((prev) => {
      const next = padRoster(
        prev.map((col, i) => {
          if (i === team) return names;
          return col.filter((n) => !names.includes(n));
        }),
      );
      writeSessionRoster(next);
      return next;
    });
  }

  function setColorId(team: number, id: string) {
    setColorIds((prev) => {
      const next = [...prev];
      next[team] = id;
      return next;
    });
  }

  function flashNote(text: string) {
    setSaveNote(text);
    window.setTimeout(() => setSaveNote((cur) => (cur === text ? null : cur)), 2600);
  }

  function stopMatch() {
    setStarted(false);
    setPanelOpen(true);
    setScene("wheel");
    setPicked(null);
    setPrompt(null);
    setRevealStep(0);
    setScores([0, 0, 0]);
    setPlayerScores({});
    setBanks([90, 90, 90]);
    setWinner(null);
    setUsedWordIds(new Set());
    lastKidRef.current = null;
    angleRef.current = 0;
    setAngle(0);
    setClickerDeg(0);
    physicsRef.current?.reset(0);
    physicsRef.current?.idle();
  }

  function resumeGame() {
    if (!started) return;
    setPanelOpen(false);
    physicsRef.current?.freeze();
  }

  function loadLesson(id: string) {
    const found = lessons.find((s) => s.id === id) ?? listWheelLessons().find((s) => s.id === id);
    if (!found) return;
    rememberWheelLessonId(found.id);
    setYears(found.years);
    setTerms(found.terms);
    setTopics(found.topics);
    setDifficulties(found.difficulties);
    const next = lessonToSettings(found);
    setSettings(next);
    saveWheelSettings(next);
    setActiveLessonId(found.id);
    setLessons(listWheelLessons());
    flashNote(`Loaded “${found.title}”`);
    stopMatch();
  }

  function resetDesk() {
    resetSessionNamesForDesk();
    setNamesText(readSessionNames());
    setTeamsOn(false);
    setTeamCount(2);
    setColorIds([...DEFAULT_TEAM_COLOR_IDS]);
    setRoster(readSessionRoster());
    // Keep the loaded lesson — only clear the class list / teams.
    stopMatch();
  }

  function startGame() {
    if (!canStart || !activeLesson) return;
    const next = lessonToSettings(activeLesson);
    saveWheelSettings(next);
    setSettings(next);
    setStarted(true);
    setPanelOpen(false);
    setPicked(null);
    setPrompt(null);
    setRevealStep(0);
    setScores(Array.from({ length: 3 }, () => 0));
    setPlayerScores({});
    setBanks(Array.from({ length: 3 }, () => next.secondsPerTeam));
    setWinner(null);
    setUsedWordIds(new Set());
    lastKidRef.current = null;
    angleRef.current = 0;
    setAngle(0);
    physicsRef.current?.reset(0);
    if (teamsOn) {
      const first = Math.floor(Math.random() * teamCount);
      setTossWinner(first);
      setTurn(first);
      setScene("toss");
    } else {
      setTurn(0);
      setScene("wheel");
    }
  }

  function teamForTurn(team: TeamId): Player[] {
    const mine = players.filter((p) => p.team === team);
    if (!timeMatch) return mine;
    return mine.filter((p) => (banks[p.team] ?? 0) > 0);
  }

  function passTurn(from: TeamId): TeamId | null {
    const n = teamCount;
    for (let step = 1; step <= n; step++) {
      const next = (from + step) % n;
      if (!timeMatch || (banks[next] ?? 0) > 0) return next;
    }
    return null;
  }

  function eligiblePlayers(): Player[] {
    if (!teamsOn) return players;
    const mine = teamForTurn(turn);
    if (mine.length) return mine;
    for (let t = 0; t < teamCount; t++) {
      const other = teamForTurn(t);
      if (other.length) return other;
    }
    return players;
  }

  function landFromPhysics(deg: number) {
    if (deskOpenRef.current) return;
    const poolPlayers = eligiblePlayers();
    if (!poolPlayers.length) {
      setScene("wheel");
      return;
    }
    const idx = winnerIndex(deg, poolPlayers.length);
    const landed = poolPlayers[idx] ?? poolPlayers[0]!;
    lastKidRef.current = landed.name;
    setPicked(landed);
    setPrompt(null);
    setRevealStep(0);
    setScene("landed");
    void playNameLock();
  }
  landRef.current = landFromPhysics;

  function playLanded() {
    if (scene !== "landed" || !picked || deskOpen) return;
    const next = pickPrompt(pool, usedWordIds, settings.askDirection);
    setPrompt(next);
    if (next) {
      setUsedWordIds((ids) => new Set(ids).add(next.word.id));
    }
    setRevealStep(0);
    setScene("exiting");
    window.setTimeout(() => {
      if (deskOpenRef.current) return;
      setScene("question");
    }, 720);
  }

  function skipLanded() {
    if (scene !== "landed" || !picked || deskOpen) return;
    setPicked(null);
    setPrompt(null);
    setRevealStep(0);
    setScene("wheel");
    spin();
  }

  function spin() {
    if (!started || deskOpen || scene === "spinning" || scene === "winner") return;
    if (scene !== "wheel" && scene !== "landed") return;
    if (!eligiblePlayers().length) return;
    setScene("spinning");
    setPicked(null);
    setPrompt(null);
    setRevealStep(0);
    void playWhoosh();
    physicsRef.current?.spin();
  }

  function finishTurn(nextScores: number[]) {
    if (teamsOn && settings.winMode === "score") {
      if (nextScores.slice(0, teamCount).some((s) => s >= settings.scoreToWin)) {
        finishMatch(nextScores);
        return;
      }
    }
    if (teamsOn) {
      const nextTurn = passTurn(turnRef.current);
      if (nextTurn == null) {
        finishMatch(nextScores);
        return;
      }
      setTurn(nextTurn);
      angleRef.current = 0;
      setAngle(0);
      physicsRef.current?.reset(0);
    }
    setPrompt(null);
    setRevealStep(0);
    setPicked(null);
    setScene("wheel");
  }

  function answerPoints() {
    if (!answerText) return 0;
    const plan = buildRevealPlan(answerText);
    const fullyRevealed = displayAnswer(plan, revealStep).complete;
    return pointsForAnswer(settings, revealStep, fullyRevealed);
  }

  function awardPoints(pts: number) {
    if (!picked || pts <= 0) return scores;
    const next = [...scores];
    if (teamsOn) {
      next[picked.team] = (next[picked.team] ?? 0) + pts;
      setScores(next);
      setScoreBurst(picked.team);
      setScoreFly({ target: picked.team, value: pts, player: picked.name });
      window.setTimeout(() => setScoreBurst(null), 500);
      window.setTimeout(() => setScoreFly(null), 700);
    } else {
      setPlayerScores((prev) => {
        const updated = { ...prev, [picked.name]: (prev[picked.name] ?? 0) + pts };
        return updated;
      });
      setScoreBurst(0);
      setScoreFly({ target: 0, value: pts, player: picked.name });
      window.setTimeout(() => setScoreBurst(null), 500);
      window.setTimeout(() => setScoreFly(null), 700);
    }
    return next;
  }

  function markCorrect() {
    if (scene !== "question" || !picked) return;
    const pts = answerPoints();
    const next = awardPoints(pts);
    void playCorrect();
    finishTurn(next);
  }

  function markMiss() {
    if (scene !== "question") return;
    void playMiss();
    finishTurn(scores);
  }

  function revealHint() {
    if (scene !== "question" || !prompt || !answerText) return;
    const plan = buildRevealPlan(answerText);
    if (!canRevealMore(revealStep, plan)) return;
    setRevealStep((step) => step + 1);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (started && !panelOpen && scene === "wheel") spin();
      }
      if (scene === "landed") {
        if (e.key === "p" || e.key === "P") playLanded();
        if (e.key === "s" || e.key === "S") skipLanded();
      }
      if (scene === "question") {
        if (e.key === "r" || e.key === "R") revealHint();
        if (e.key === "1" || e.key === "y" || e.key === "Y") markCorrect();
        if (e.key === "2" || e.key === "n" || e.key === "N") markMiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const promptText = prompt ? (prompt.askFrench ? prompt.word.french : prompt.word.english) : null;
  const answerText = prompt ? (prompt.askFrench ? prompt.word.english : prompt.word.french) : null;
  const askLabel = prompt
    ? prompt.askFrench
      ? "What does this mean in English?"
      : "How do you say this in French?"
    : null;

  const activeName = scene === "question" || scene === "landed" ? (picked?.name ?? null) : null;
  const hintAvailable = answerText ? canRevealMore(revealStep, buildRevealPlan(answerText)) : false;

  const activePalette = palettes[picked?.team ?? turn] ?? palettes[0]!;

  const finishToss = useCallback(() => {
    if (deskOpenRef.current) return;
    setScene("entering");
    window.setTimeout(() => {
      if (deskOpenRef.current) return;
      setScene("wheel");
    }, 700);
  }, []);

  const playAgain = () => startGame();

  function openSetup() {
    if (scene === "spinning") {
      physicsRef.current?.freeze();
      setScene("wheel");
    }
    setPanelOpen(true);
  }

  const showScoreRail = started && scene !== "toss" && !deskOpen;

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      {showScoreRail ? (
        <aside
          className={`pointer-events-none absolute inset-y-0 left-0 z-30 w-[min(18rem,30vw)] ${
            deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
          }`}
          aria-label="Scores"
        >
          <PlayLeaderboard
            teamsOn={teamsOn}
            teamCount={teamCount}
            scores={scores}
            playerScores={playerScores}
            players={players}
            palettes={palettes}
            banks={banks}
            timeMatch={Boolean(timeMatch)}
            turn={turn}
            burst={scoreBurst}
            plusFly={scoreFly?.target ?? null}
            plusValue={scoreFly?.value ?? 0}
            activePlayer={scoreFly?.player ?? activeName}
          />
        </aside>
      ) : null}

      <div
        className={`flex h-full min-w-0 flex-col items-center bg-[radial-gradient(ellipse_at_center,oklch(0.97_0.02_220)_0%,var(--background)_70%)] transition-[margin,background] duration-500 ${
          !started || panelOpen ? "lg:mr-[36rem]" : "lg:mr-0"
        } ${showScoreRail ? "ml-[min(18rem,30vw)]" : ""}`}
        style={
          {
            ["--setup-shift"]: !started || panelOpen ? "36rem" : "0px",
            ["--score-rail-width"]: showScoreRail ? "min(18rem, 30vw)" : "0px",
            ...(scene === "question"
              ? teamsOn && picked && !deskOpen
                ? {
                    background: `radial-gradient(ellipse at center, color-mix(in oklch, ${activePalette.fill} 18%, white) 0%, var(--background) 72%)`,
                  }
                : !teamsOn && !deskOpen
                  ? {
                      background:
                        "radial-gradient(ellipse at center, oklch(0.97 0.02 220) 0%, var(--background) 72%)",
                    }
                  : {}
              : {}),
          } as CSSProperties
        }
      >
        <Link
          to="/create"
          className="absolute left-4 top-4 z-20 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </Link>

        <div
          className={`relative flex w-full min-h-0 flex-1 flex-col items-center justify-center self-stretch px-2 pt-1 ${
            playing && onDisc ? "pb-24" : "pb-4"
          }`}
        >
          {showWheel ? (
            <div
              onPointerEnter={() => setWheelHover(true)}
              onPointerLeave={() => setWheelHover(false)}
            >
              <NameWheel
                slices={wheelSlices}
                angle={angle}
                clickerDeg={clickerDeg}
                motion={wheelMotion}
                accent={teamsOn && started ? activePalette.fill : undefined}
                namesVisible={namesVisible}
                hotGlow={playing && namesVisible}
              />
            </div>
          ) : null}
          {started && scene === "landed" && picked ? (
            <p
              className={`absolute font-kids font-semibold tracking-tight ${
                deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
              }`}
              style={{
                fontSize: "clamp(3rem, 8vw, 6.5rem)",
                color: "oklch(0.99 0 0)",
                WebkitTextStroke: "2px oklch(0.16 0.03 80)",
                paintOrder: "stroke fill",
                animation: deskOpen
                  ? undefined
                  : "vocablab-name-spot 0.55s cubic-bezier(0.2, 1.4, 0.3, 1) both",
                textShadow: "0 10px 28px oklch(0.2 0.05 80 / 40%)",
              }}
            >
              {picked.name}
            </p>
          ) : null}
          {started && scene === "question" ? (
            <div
              className={`absolute inset-0 z-10 flex ${
                deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
              }`}
            >
              <QuestionStage
                name={picked?.name ?? ""}
                teamColor={teamsOn ? activePalette.fill : "oklch(0.58 0.21 25)"}
                teamInk={teamsOn ? activePalette.ink : "oklch(0.99 0 0)"}
                askLabel={askLabel}
                promptText={promptText}
                answerText={answerText}
                revealStep={revealStep}
                hintAvailable={hintAvailable}
                onHint={revealHint}
                onCorrect={markCorrect}
                onMiss={markMiss}
              />
            </div>
          ) : null}
          {started && scene === "toss" ? (
            <div
              className={`absolute inset-0 z-10 flex items-center justify-center ${
                deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
              }`}
            >
              <TeamToss teams={palettes} winner={tossWinner} onDone={finishToss} />
            </div>
          ) : null}
        </div>

        {started && scene === "landed" && picked ? (
          <div
            className={`absolute bottom-7 z-20 flex gap-4 ${
              deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
            }`}
          >
            <button
              type="button"
              onClick={skipLanded}
              disabled={deskOpen}
              className="rounded-full bg-surface px-12 py-5 font-kids text-2xl font-semibold shadow-lg ring-1 ring-border disabled:opacity-40"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={playLanded}
              disabled={deskOpen}
              className="rounded-full bg-primary px-12 py-5 font-kids text-2xl font-semibold text-primary-foreground shadow-lg disabled:opacity-40"
            >
              Play
            </button>
          </div>
        ) : null}

        {started && (scene === "wheel" || scene === "spinning") ? (
          <div
            className={`absolute bottom-7 z-20 flex flex-col items-center gap-3 ${
              deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
            }`}
          >
            {scene !== "spinning" ? (
              <p
                className="rounded-full bg-white px-7 py-2 font-kids text-3xl font-semibold shadow-md"
                style={teamsOn ? { color: palettes[turn]?.fill } : undefined}
              >
                {teamsOn ? `${palettes[turn]?.label ?? "Team"}’s turn` : "Who’s next?"}
              </p>
            ) : null}
            <button
              type="button"
              onClick={spin}
              disabled={scene === "spinning" || deskOpen}
              className="rounded-full bg-primary px-16 py-5 font-kids text-3xl font-semibold uppercase tracking-wide text-primary-foreground shadow-lg disabled:opacity-40"
            >
              {scene === "spinning" ? "…" : "Spin"}
            </button>
          </div>
        ) : null}
      </div>

      {started && !panelOpen ? (
        <button
          ref={tabRef}
          type="button"
          onClick={openSetup}
          className="absolute right-0 top-1/2 z-[60] -translate-y-1/2 rounded-l-2xl bg-primary px-2 py-8 font-kids text-sm font-semibold tracking-wide text-primary-foreground shadow-lg"
        >
          Set up
        </button>
      ) : null}

      {!started || panelOpen ? (
        <aside
          ref={panelRef}
          className="absolute inset-y-0 right-0 z-40 flex w-[min(36rem,100%)] flex-col overflow-y-auto border-l border-border bg-card shadow-2xl"
        >
          <SetupPanel
            namesText={namesText}
            onNames={handleNames}
            allNames={allNames}
            teamsOn={teamsOn}
            teamCount={teamCount}
            setTeamCount={changeTeamCount}
            onToggleTeams={toggleTeams}
            roster={roster}
            colorIds={colorIds}
            setColorId={setColorId}
            onDropName={dropName}
            onTeamPaste={pasteTeam}
            onSplit={() => syncNamesIntoTeams(namesText)}
            canStart={canStart}
            started={started}
            onStart={startGame}
            onResume={resumeGame}
            onReset={resetDesk}
            poolCount={pool.length}
            lessons={lessons}
            activeLesson={activeLesson}
            onLoadLesson={loadLesson}
            saveNote={saveNote}
          />
        </aside>
      ) : null}

      {scene === "winner" && winner !== null ? (
        <WinOverlay
          winner={winner}
          scores={scores}
          palettes={palettes}
          onAgain={playAgain}
          away={deskOpen}
        />
      ) : null}
    </div>
  );
}

function QuestionStage({
  name,
  teamColor,
  teamInk,
  askLabel,
  promptText,
  answerText,
  revealStep,
  hintAvailable,
  onHint,
  onCorrect,
  onMiss,
}: {
  name: string;
  teamColor: string;
  teamInk: string;
  askLabel: string | null;
  promptText: string | null;
  answerText: string | null;
  revealStep: number;
  hintAvailable: boolean;
  onHint: () => void;
  onCorrect: () => void;
  onMiss: () => void;
}) {
  return (
    <div className="flex w-full flex-1 flex-col px-8 pb-10 pt-4">
      <div className="mx-auto grid w-full max-w-[92rem] flex-1 items-center gap-x-10 gap-y-6 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.5fr)]">
        <div className="min-w-0">
          {name ? (
            <p
              className="inline-block rounded-full px-8 py-2 font-kids font-semibold tracking-tight shadow-lg"
              style={{
                background: teamColor,
                color: teamInk,
                fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
                animation: "vocablab-name-spot 0.45s both",
              }}
            >
              {name}
            </p>
          ) : null}
          <p
            className="mt-5 font-kids font-semibold leading-[1.12] tracking-tight"
            style={{
              fontSize: "clamp(2.2rem, 4.6vw, 4rem)",
              color: teamColor,
            }}
          >
            {askLabel}
          </p>
        </div>

        <div className="min-w-0 text-left lg:text-right">
          <p
            className="font-kids font-semibold leading-[1.08] tracking-tight"
            style={{
              fontSize: "clamp(2.8rem, 7.2vw, 6.4rem)",
              animation: "vocablab-word-in 0.7s cubic-bezier(0.2, 1.15, 0.3, 1) both",
            }}
          >
            {promptText}
          </p>
          <AnswerRevealer answerText={answerText} revealStep={revealStep} accent={teamColor} />
        </div>
      </div>

      <div className="mx-auto mt-auto flex w-full max-w-2xl flex-col items-center gap-3 pt-8">
        {hintAvailable ? (
          <button
            type="button"
            onClick={onHint}
            className="rounded-full px-6 py-2 font-kids text-lg font-semibold shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            style={{ background: teamColor, color: teamInk }}
          >
            Hint
          </button>
        ) : null}
        <div className="flex w-full gap-4">
          <button
            type="button"
            onClick={onCorrect}
            className="flex-1 rounded-full bg-success py-5 font-kids text-3xl font-semibold text-success-foreground"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={onMiss}
            className="flex-1 rounded-full bg-surface py-5 font-kids text-3xl font-semibold"
          >
            Missed
          </button>
        </div>
      </div>
    </div>
  );
}

function WinOverlay({
  winner,
  scores,
  palettes,
  onAgain,
  away = false,
}: {
  winner: TeamId | "draw";
  scores: number[];
  palettes: ReturnType<typeof colorById>[];
  onAgain: () => void;
  away?: boolean | undefined;
}) {
  const palette = winner === "draw" ? palettes[0] : palettes[winner];
  const title = winner === "draw" ? "It’s a draw" : `${palettes[winner]?.label ?? "Team"} wins`;
  const fill = winner === "draw" ? "oklch(0.25 0.02 80)" : (palette?.fill ?? "oklch(0.25 0.02 80)");
  const ink = winner === "draw" ? "oklch(0.99 0 0)" : (palette?.ink ?? "oklch(0.99 0 0)");

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center ${
        away ? "vocablab-play-layer is-away" : "vocablab-play-layer"
      }`}
      style={{
        background: fill,
        color: ink,
        animation: away ? undefined : "vocablab-wash-in 0.5s ease",
      }}
    >
      <Confetti color={winner === "draw" ? "oklch(0.84 0.16 88)" : (palette?.fill ?? "gold")} />
      <p
        className="font-kids font-semibold tracking-tight"
        style={{
          fontSize: "clamp(3.5rem, 10vw, 8rem)",
          animation: "vocablab-name-spot 0.6s cubic-bezier(0.2, 1.4, 0.3, 1) both",
        }}
      >
        {title}
      </p>
      <p className="mt-4 font-kids text-4xl tabular-nums">
        {palettes.map((_, i) => scores[i] ?? 0).join(" — ")}
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-10 rounded-full bg-white/90 px-12 py-4 font-kids text-2xl font-semibold text-foreground"
      >
        Play again
      </button>
    </div>
  );
}

function Confetti({ color }: { color: string }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${4 + ((i * 17) % 92)}%`,
        delay: `${(i % 8) * 0.08}s`,
        cx: `${-80 + (i % 7) * 28}px`,
        cy: `${60 + (i % 5) * 18}vh`,
        bg: i % 3 === 0 ? color : i % 3 === 1 ? "white" : "oklch(0.84 0.16 88)",
      })),
    [color],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((bit, i) => (
        <span
          key={i}
          className="absolute top-4 size-3 rounded-sm"
          style={
            {
              left: bit.left,
              background: bit.bg,
              animation: `vocablab-confetti 1.8s ease-in ${bit.delay} both`,
              "--cx": bit.cx,
              "--cy": bit.cy,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
