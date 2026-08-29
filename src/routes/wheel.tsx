import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnswerRevealer } from "@/components/wheel/AnswerRevealer";
import { Fireworks } from "@/components/wheel/Fireworks";
import { FuseWire } from "@/components/wheel/FuseWire";
import { NameWheel } from "@/components/wheel/NameWheel";
import { PlayLeaderboard } from "@/components/wheel/PlayLeaderboard";
import { SetupPanel } from "@/components/wheel/SetupPanel";
import { TeamToss } from "@/components/wheel/TeamToss";
import { LangFlag } from "@/components/LangFlag";
import {
  DEFAULT_FUSE,
  DEFAULT_WHEEL_SETTINGS,
  applyModeSettingsToDraft,
  loadFuseConfig,
  loadModeSettings,
  loadWheelSettings,
  saveWheelSettings,
  type FuseConfig,
  type WheelSettings,
} from "@/lib/game-settings";
import { isWheelGameModeId, type WheelGameModeId } from "@/lib/wheel-modes";
import { parseNames } from "@/lib/parse-names";
import {
  colorById,
  DEFAULT_TEAM_COLOR_IDS,
  rainbowPaint,
  splitTeams,
  teamSlicePaint,
} from "@/lib/team-colors";
import { SEED_WORDS, filterWords, type Word } from "@/lib/vocab-data";
import { resolveImageSrc } from "@/lib/image-library";
import { pickPrompt, wheelPlayableWords } from "@/lib/wheel-prompt";
import { applyWordPatches } from "@/lib/word-patches";
import {
  readSessionNames,
  readSessionRoster,
  readWheelMatch,
  resetSessionNamesForDesk,
  writeSessionNames,
  writeSessionRoster,
  writeWheelMatch,
  clearWheelMatch,
} from "@/lib/teacher-session";
import {
  playCorrect,
  playFanfare,
  playFireworks,
  playMiss,
  playNameLock,
  playPegTick,
  playTimeout,
  playUrgentTick,
  playWhoosh,
} from "@/lib/wheel-audio";
import { winnerIndex } from "@/lib/wheel-math";
import { buildRevealPlan, displayAnswer } from "@/lib/wheel-answer-reveal";
import { pointsForAnswer } from "@/lib/wheel-scoring";
import {
  nextCatchUpIndex,
  rankScores,
  reachedScoreToWin,
  shouldEndScoreMatch,
  shouldEndSoloScoreMatch,
  teamWinnerFromScores,
  type RankedEntry,
} from "@/lib/wheel-score-race";
import {
  applyCorrectEscape,
  applySkipPenalty,
  countAlive,
  elapsedFromRoundClock,
  rankTimeBankContestants,
  roundClockSeconds,
  shouldEndTimeBankMatch,
  soleSurvivorIndex,
} from "@/lib/wheel-time-bank";
import { WheelPhysics } from "@/lib/wheel-physics";
import {
  lastWheelLesson,
  lessonToSettings,
  listWheelLessons,
  rememberWheelLessonId,
  type WheelLesson,
} from "@/lib/wheel-lessons";
import {
  canMarkAnswer,
  canRevealHint,
  canUnlockAnswer,
  sceneAfterMarked,
} from "@/lib/wheel-turn-flow";

export const Route = createFileRoute("/wheel")({
  validateSearch: (raw: Record<string, unknown>): { mode?: WheelGameModeId } => {
    const mode = raw["mode"];
    return isWheelGameModeId(mode) ? { mode } : {};
  },
  head: () => ({
    meta: [{ title: "Wheel of names — Vocablab" }],
  }),
  component: WheelPage,
});

/** Apply Activity-board mode choice onto lesson/global settings for this play session. */
function settingsForPlayMode(base: WheelSettings, mode: WheelGameModeId): WheelSettings {
  return applyModeSettingsToDraft(base, mode, loadModeSettings());
}

function readRequestedPlayMode(urlMode?: WheelGameModeId): WheelGameModeId | null {
  if (urlMode) return urlMode;
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("vocablab.wheel.playMode");
    if (isWheelGameModeId(raw)) {
      sessionStorage.removeItem("vocablab.wheel.playMode");
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

type TeamId = number;
type Scene =
  | "toss"
  | "wheel"
  | "spinning"
  | "landed"
  | "exiting"
  | "question"
  | "show"
  | "entering"
  | "winner";
type ShowKind = "got" | "miss" | "timeout";
type Prompt = { word: Word; askFrench: boolean };
type Player = { name: string; team: TeamId };

/** Prompt word colour on question and result — projector-readable azure. */
const WORD_AZURE = "oklch(0.56 0.13 236)";
/** Revealed answer + hint dots — same green as Got it. */
const ANSWER_GREEN = "oklch(0.55 0.11 160)";
/** Ask / feedback copy — elegant mid-tone navy. */
const ASK_NAVY = "oklch(0.44 0.075 255)";

function padRoster(parts: string[][]): string[][] {
  return [parts[0] ?? [], parts[1] ?? [], parts[2] ?? []];
}

function WheelPage() {
  const { mode: modeFromUrl } = Route.useSearch();
  const [years, setYears] = useState<string[]>(["Year 7"]);
  const [terms, setTerms] = useState<string[]>(["Term 1"]);
  const [topics, setTopics] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [namesText, setNamesText] = useState("");
  const [teamsOn, setTeamsOn] = useState(false);
  const [teamCount, setTeamCount] = useState<2 | 3>(2);
  const [colorIds, setColorIds] = useState<string[]>([...DEFAULT_TEAM_COLOR_IDS]);
  const [roster, setRoster] = useState<string[][]>(() => padRoster([[], [], []]));
  const [lessons, setLessons] = useState<WheelLesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  /** Teams mode the live match was started with — Setup can diverge until Start. */
  const [matchTeamsOn, setMatchTeamsOn] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [wheelHover, setWheelHover] = useState(false);
  const deskOpen = !started || panelOpen;
  const playing = started && !panelOpen;
  const paused = started && panelOpen;
  const [settings, setSettings] = useState<WheelSettings>(DEFAULT_WHEEL_SETTINGS);
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;
  const [scene, setScene] = useState<Scene>("wheel");
  const [angle, setAngle] = useState(0);
  const [clickerDeg, setClickerDeg] = useState(0);
  const [picked, setPicked] = useState<Player | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [revealStep, setRevealStep] = useState(0);
  /** Full answer unlocked by teacher — gates Got it / Miss it and freezes the fuse. */
  const [answerOpen, setAnswerOpen] = useState(false);
  const [scores, setScores] = useState<number[]>([0, 0, 0]);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [playerScoredAt, setPlayerScoredAt] = useState<Record<string, number>>({});
  const [teamScoredAt, setTeamScoredAt] = useState<number[]>([0, 0, 0]);
  const [teamSpins, setTeamSpins] = useState<number[]>([0, 0, 0]);
  const [playerSpins, setPlayerSpins] = useState<Record<string, number>>({});
  const [banks, setBanks] = useState<number[]>([90, 90, 90]);
  const [teamEliminated, setTeamEliminated] = useState<boolean[]>([false, false, false]);
  const [teamInBuffer, setTeamInBuffer] = useState<boolean[]>([false, false, false]);
  const [playerBanks, setPlayerBanks] = useState<Record<string, number>>({});
  const [playerEliminated, setPlayerEliminated] = useState<Record<string, boolean>>({});
  const [playerInBuffer, setPlayerInBuffer] = useState<Record<string, boolean>>({});
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([]);
  const [roundClockStart, setRoundClockStart] = useState(0);
  const [turn, setTurn] = useState<TeamId>(0);
  const [winner, setWinner] = useState<TeamId | "draw" | null>(null);
  const [soloPodium, setSoloPodium] = useState<RankedEntry[] | null>(null);
  const [scoreBurst, setScoreBurst] = useState<TeamId | null>(null);
  const [scoreFly, setScoreFly] = useState<{
    target: TeamId;
    value: number;
    player: string;
  } | null>(null);
  const [tossWinner, setTossWinner] = useState<TeamId>(0);
  const [usedWordIds, setUsedWordIds] = useState<Set<string>>(new Set());
  const [fuse, setFuse] = useState<FuseConfig>(DEFAULT_FUSE);
  const [fuseLeft, setFuseLeft] = useState<number | null>(null);
  const [showKind, setShowKind] = useState<ShowKind | null>(null);
  const [showPts, setShowPts] = useState(0);
  const [matchEnding, setMatchEnding] = useState(false);

  const angleRef = useRef(0);
  const physicsRef = useRef<WheelPhysics | null>(null);
  const landRef = useRef<(deg: number) => void>(() => {});
  const panelRef = useRef<HTMLElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const banksRef = useRef(banks);
  const teamEliminatedRef = useRef(teamEliminated);
  const teamInBufferRef = useRef(teamInBuffer);
  const playerBanksRef = useRef(playerBanks);
  const playerEliminatedRef = useRef(playerEliminated);
  const playerInBufferRef = useRef(playerInBuffer);
  const eliminationOrderRef = useRef(eliminationOrder);
  const roundClockStartRef = useRef(roundClockStart);
  const fuseLeftRef = useRef(fuseLeft);
  const sceneRef = useRef(scene);
  const turnRef = useRef(turn);
  const scoresRef = useRef(scores);
  const playerScoresRef = useRef(playerScores);
  const teamSpinsRef = useRef(teamSpins);
  const playerSpinsRef = useRef(playerSpins);
  const fuseHandled = useRef(false);
  const fuseArmed = useRef(false);
  const lastKidRef = useRef<string | null>(null);
  const endShowTimer = useRef<number | null>(null);
  const endShowArmed = useRef(false);
  banksRef.current = banks;
  teamEliminatedRef.current = teamEliminated;
  teamInBufferRef.current = teamInBuffer;
  playerBanksRef.current = playerBanks;
  playerEliminatedRef.current = playerEliminated;
  playerInBufferRef.current = playerInBuffer;
  eliminationOrderRef.current = eliminationOrder;
  roundClockStartRef.current = roundClockStart;
  fuseLeftRef.current = fuseLeft;
  sceneRef.current = scene;
  turnRef.current = turn;
  scoresRef.current = scores;
  playerScoresRef.current = playerScores;
  teamSpinsRef.current = teamSpins;
  playerSpinsRef.current = playerSpins;
  const deskOpenRef = useRef(deskOpen);
  deskOpenRef.current = deskOpen;

  const matchHydrated = useRef(false);

  useEffect(() => {
    setNamesText(readSessionNames());
    setRoster(readSessionRoster());
    setLessons(listWheelLessons());
    const boot = lastWheelLesson();
    let nextSettings = boot ? lessonToSettings(boot) : loadWheelSettings();
    if (boot) {
      setYears(boot.years);
      setTerms(boot.terms);
      setTopics(boot.topics);
      setDifficulties(boot.difficulties);
      setActiveLessonId(boot.id);
    }

    const requested = readRequestedPlayMode(modeFromUrl);
    if (requested) {
      nextSettings = settingsForPlayMode(nextSettings, requested);
      saveWheelSettings(nextSettings);
    }

    const match = readWheelMatch();
    if (match?.started) {
      const stamped = match.gameMode;
      const conflict =
        requested != null &&
        ((stamped != null && stamped !== requested) ||
          (stamped == null && requested === "time"));
      if (conflict) {
        clearWheelMatch();
        setStarted(false);
        setWinner(null);
        setSoloPodium(null);
        setScene("wheel");
        setPanelOpen(true);
      } else {
        if (stamped && stamped !== nextSettings.gameMode) {
          nextSettings = settingsForPlayMode(nextSettings, stamped);
          saveWheelSettings(nextSettings);
        }
        setStarted(true);
        setMatchTeamsOn(match.matchTeamsOn);
        setTeamsOn(match.teamsOn);
        setTeamCount(match.teamCount);
        setTurn(match.turn as TeamId);
        setScores(match.scores);
        setPlayerScores(match.playerScores);
        setPlayerScoredAt(match.playerScoredAt);
        setTeamScoredAt(match.teamScoredAt);
        setTeamSpins(match.teamSpins);
        setPlayerSpins(match.playerSpins);
        setBanks(match.banks);
        setTeamEliminated(match.teamEliminated);
        setTeamInBuffer(match.teamInBuffer);
        setPlayerBanks(match.playerBanks);
        setPlayerEliminated(match.playerEliminated);
        setPlayerInBuffer(match.playerInBuffer);
        setEliminationOrder(match.eliminationOrder);
        setUsedWordIds(new Set(match.usedWordIds));
        if (match.colorIds.length >= 2) {
          setColorIds([
            match.colorIds[0] ?? DEFAULT_TEAM_COLOR_IDS[0],
            match.colorIds[1] ?? DEFAULT_TEAM_COLOR_IDS[1],
            match.colorIds[2] ?? DEFAULT_TEAM_COLOR_IDS[2],
          ]);
        }
        if (match.soloPodium?.length) {
          setSoloPodium(match.soloPodium);
          setWinner(null);
          setScene("winner");
        } else if (match.winner === "draw" || typeof match.winner === "number") {
          setWinner(match.winner === "draw" ? "draw" : (match.winner as TeamId));
          setSoloPodium(null);
          setScene("winner");
        } else {
          setWinner(null);
          setSoloPodium(null);
          setScene("wheel");
        }
        setPanelOpen(false);
        setPicked(null);
        setPrompt(null);
        setRevealStep(0);
      }
    }

    setSettings(nextSettings);
    matchHydrated.current = true;
  }, [modeFromUrl]);

  useEffect(() => {
    if (!matchHydrated.current || !started) return;
    writeWheelMatch({
      v: 1,
      started: true,
      gameMode: settings.gameMode,
      matchTeamsOn,
      teamsOn,
      teamCount,
      turn,
      scores,
      playerScores,
      playerScoredAt,
      teamScoredAt,
      teamSpins,
      playerSpins,
      banks,
      teamEliminated,
      teamInBuffer,
      playerBanks,
      playerEliminated,
      playerInBuffer,
      eliminationOrder,
      usedWordIds: [...usedWordIds],
      colorIds,
      winner,
      soloPodium,
    });
  }, [
    started,
    settings.gameMode,
    matchTeamsOn,
    teamsOn,
    teamCount,
    turn,
    scores,
    playerScores,
    playerScoredAt,
    teamScoredAt,
    teamSpins,
    playerSpins,
    banks,
    teamEliminated,
    teamInBuffer,
    playerBanks,
    playerEliminated,
    playerInBuffer,
    eliminationOrder,
    usedWordIds,
    colorIds,
    winner,
    soloPodium,
  ]);

  const pool = useMemo(() => {
    const matched = wheelPlayableWords(
      filterWords(applyWordPatches(SEED_WORDS), {
        years,
        terms,
        topics,
        difficulties,
      }),
    );
    const excluded = new Set(activeLesson?.excludedWordIds ?? []);
    return excluded.size ? matched.filter((w) => !excluded.has(w.id)) : matched;
  }, [years, terms, topics, difficulties, activeLesson?.excludedWordIds]);

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
    if (!teamsOn) {
      if (started && settings.gameMode === "time") {
        return players.filter((p) => !playerEliminated[p.name]);
      }
      return players;
    }
    return players.filter(
      (p) => p.team === turn && !(started && settings.gameMode === "time" && teamEliminated[p.team]),
    );
  }, [players, teamsOn, turn, started, settings.gameMode, playerEliminated, teamEliminated]);

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

  /** Time bank elimination mode — teams or solo. */
  const timeBankMatch = started && settings.gameMode === "time";
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
      setSoloPodium(null);
      setWinner(teamWinnerFromScores(slice) as TeamId | "draw");
      setScene("winner");
    },
    [teamCount],
  );

  const finishSoloMatch = useCallback((nextScores: Record<string, number>, names: string[]) => {
    const podium = rankScores(names.map((id) => ({ id, score: nextScores[id] ?? 0 })));
    setWinner(null);
    setSoloPodium(podium);
    setScene("winner");
  }, []);

  const finishTimeBankTeamMatch = useCallback(() => {
    const elim = teamEliminatedRef.current.slice(0, teamCount);
    const survivor = soleSurvivorIndex(elim);
    setSoloPodium(null);
    setWinner(survivor == null ? "draw" : (survivor as TeamId));
    setScene("winner");
  }, [teamCount]);

  const finishTimeBankSoloMatch = useCallback((names: string[]) => {
    const ranked = rankTimeBankContestants(
      names.map((id) => ({
        id,
        bank: playerBanksRef.current[id] ?? 0,
        eliminated: Boolean(playerEliminatedRef.current[id]),
      })),
      eliminationOrderRef.current,
    );
    setWinner(null);
    setSoloPodium(
      ranked.map((row) => ({
        id: row.id,
        score: Math.round(row.bank),
        place: row.place,
      })),
    );
    setScene("winner");
  }, []);

  const eliminateContestant = useCallback(
    (who: Player) => {
      if (teamsOn) {
        const next = [...teamEliminatedRef.current];
        if (next[who.team]) return;
        next[who.team] = true;
        teamEliminatedRef.current = next;
        setTeamEliminated(next);
        const id = String(who.team);
        const order = [...eliminationOrderRef.current, id];
        eliminationOrderRef.current = order;
        setEliminationOrder(order);
      } else {
        if (playerEliminatedRef.current[who.name]) return;
        const next = { ...playerEliminatedRef.current, [who.name]: true };
        playerEliminatedRef.current = next;
        setPlayerEliminated(next);
        const order = [...eliminationOrderRef.current, who.name];
        eliminationOrderRef.current = order;
        setEliminationOrder(order);
      }
    },
    [teamsOn],
  );

  const openShowRef = useRef<((kind: ShowKind, pts: number) => void) | null>(null);

  useEffect(() => {
    if (scene !== "question") return;
    fuseHandled.current = false;
    fuseArmed.current = false;
    setAnswerOpen(false);
    if (timeBankMatch && picked) {
      const bank = teamsOn
        ? (banksRef.current[picked.team] ?? 0)
        : (playerBanksRef.current[picked.name] ?? 0);
      const inBuf = teamsOn
        ? Boolean(teamInBufferRef.current[picked.team])
        : Boolean(playerInBufferRef.current[picked.name]);
      const secs = roundClockSeconds(bank, settings.bufferSeconds, inBuf);
      roundClockStartRef.current = secs;
      setRoundClockStart(secs);
      setFuse({ enabled: true, seconds: Math.max(1, Math.round(secs) || 1) });
      setFuseLeft(secs);
      if (secs <= 0 && picked) {
        // No time left on the round clock — treat as timeout elimination.
        window.setTimeout(() => {
          if (fuseHandled.current) return;
          fuseHandled.current = true;
          eliminateContestant(picked);
          void playTimeout();
          openShowRef.current?.("timeout", 0);
        }, 0);
      }
      return;
    }
    const cfg = loadFuseConfig();
    setFuse(cfg);
    setFuseLeft(cfg.enabled ? cfg.seconds : null);
    roundClockStartRef.current = 0;
    setRoundClockStart(0);
  }, [scene, picked, timeBankMatch, teamsOn, settings.bufferSeconds, eliminateContestant]);

  useEffect(() => {
    if (scene !== "question") return;
    const fuseOn = timeBankMatch || fuse.enabled;
    if (!fuseOn || panelOpen) return;
    if (!timeBankMatch && answerOpen) return;
    const id = window.setInterval(() => {
      setFuseLeft((prev) => {
        if (prev == null) return prev;
        return Math.max(0, prev - 0.05);
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [scene, fuse.enabled, panelOpen, answerOpen, picked, timeBankMatch]);

  useEffect(() => {
    if (scene !== "question") return;
    const fuseOn = timeBankMatch || fuse.enabled;
    if (!fuseOn) return;
    if (!timeBankMatch && answerOpen) return;
    if (fuseLeft == null) return;
    if (fuseLeft > 0) {
      fuseArmed.current = true;
      return;
    }
    if (!fuseArmed.current || fuseHandled.current) return;
    fuseHandled.current = true;
    void playTimeout();
    if (timeBankMatch && picked) {
      eliminateContestant(picked);
    }
    openShowRef.current?.("timeout", 0);
  }, [fuseLeft, scene, fuse.enabled, answerOpen, timeBankMatch, picked, eliminateContestant]);

  const lastUrgent = useRef(11);
  useEffect(() => {
    if (!timeBankMatch || scene !== "question" || panelOpen) {
      lastUrgent.current = 11;
      return;
    }
    const remaining = fuseLeft ?? 0;
    const sec = Math.ceil(remaining);
    if (remaining > 10 || remaining <= 0) {
      lastUrgent.current = 11;
      return;
    }
    if (sec < lastUrgent.current) {
      lastUrgent.current = sec;
      void playUrgentTick();
    }
  }, [fuseLeft, timeBankMatch, scene, panelOpen]);

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
    if (panelOpen) {
      if (scene === "spinning") sim.pause?.();
      else sim.freeze();
      return;
    }
    if (scene === "spinning") {
      sim.resume?.();
      return;
    }
    sim.freeze();
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
    if (!teamsOn) {
      setTeamCount(2);
      syncNamesIntoTeams(namesText, 2);
    }
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
    setMatchTeamsOn(false);
    setPanelOpen(true);
    setScene("wheel");
    setPicked(null);
    setPrompt(null);
    setRevealStep(0);
    setScores([0, 0, 0]);
    setPlayerScores({});
    setPlayerScoredAt({});
    setTeamScoredAt([0, 0, 0]);
    setTeamSpins([0, 0, 0]);
    setPlayerSpins({});
    setBanks([90, 90, 90]);
    setTeamEliminated([false, false, false]);
    setTeamInBuffer([false, false, false]);
    setPlayerBanks({});
    setPlayerEliminated({});
    setPlayerInBuffer({});
    setEliminationOrder([]);
    setRoundClockStart(0);
    setWinner(null);
    setSoloPodium(null);
    setMatchEnding(false);
    setUsedWordIds(new Set());
    lastKidRef.current = null;
    angleRef.current = 0;
    setAngle(0);
    setClickerDeg(0);
    physicsRef.current?.reset(0);
    physicsRef.current?.idle();
    if (endShowTimer.current != null) {
      window.clearTimeout(endShowTimer.current);
      endShowTimer.current = null;
    }
    endShowArmed.current = false;
    clearWheelMatch();
  }

  function resumeGame() {
    if (!started) return;
    if (teamsOn !== matchTeamsOn) setTeamsOn(matchTeamsOn);
    setPanelOpen(false);
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
    setMatchTeamsOn(teamsOn);
    setPanelOpen(false);
    setPicked(null);
    setPrompt(null);
    setRevealStep(0);
    setScores(Array.from({ length: 3 }, () => 0));
    setPlayerScores({});
    setPlayerScoredAt({});
    setTeamScoredAt([0, 0, 0]);
    setTeamSpins([0, 0, 0]);
    setPlayerSpins({});
    setBanks(Array.from({ length: 3 }, () => next.secondsPerTeam));
    banksRef.current = Array.from({ length: 3 }, () => next.secondsPerTeam);
    setTeamEliminated([false, false, false]);
    setTeamInBuffer([false, false, false]);
    const soloBank: Record<string, number> = {};
    for (const p of players) soloBank[p.name] = next.secondsPerTeam;
    setPlayerBanks(soloBank);
    playerBanksRef.current = soloBank;
    setPlayerEliminated({});
    playerEliminatedRef.current = {};
    setPlayerInBuffer({});
    playerInBufferRef.current = {};
    setEliminationOrder([]);
    eliminationOrderRef.current = [];
    setRoundClockStart(0);
    teamEliminatedRef.current = [false, false, false];
    teamInBufferRef.current = [false, false, false];
    setWinner(null);
    setSoloPodium(null);
    setMatchEnding(false);
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
    if (!timeBankMatch) return mine;
    return mine.filter((p) => !teamEliminatedRef.current[p.team]);
  }

  function passTurn(from: TeamId, spins = teamSpinsRef.current): TeamId | null {
    const n = teamCount;
    const sliceSpins = spins.slice(0, n);
    const sliceScores = scoresRef.current.slice(0, n);
    if (
      !timeBankMatch &&
      settings.winMode === "score" &&
      reachedScoreToWin(sliceScores, settings.scoreToWin)
    ) {
      const catchUp = nextCatchUpIndex(from, sliceSpins);
      return catchUp == null ? null : (catchUp as TeamId);
    }
    for (let step = 1; step <= n; step++) {
      const next = (from + step) % n;
      if (!timeBankMatch || !teamEliminatedRef.current[next]) return next as TeamId;
    }
    return null;
  }

  function eligiblePlayers(): Player[] {
    if (!teamsOn) {
      if (!timeBankMatch) return players;
      return players.filter((p) => !playerEliminatedRef.current[p.name]);
    }
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
    const poolPlayers = eligiblePlayers();
    if (!poolPlayers.length) return;
    const deg = physicsRef.current?.angleDeg ?? angle;
    const idx = winnerIndex(deg, poolPlayers.length);
    const landed = poolPlayers[idx] ?? picked;
    if (landed.name !== picked.name) {
      setPicked(landed);
      lastKidRef.current = landed.name;
    }
    const next = pickPrompt(pool, usedWordIds, settings.askDirection);
    setPrompt(next);
    if (next) {
      setUsedWordIds((ids) => {
        if (next.reshuffled) return new Set([next.word.id]);
        return new Set(ids).add(next.word.id);
      });
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
    if (timeBankMatch) {
      const penalty = settings.skipPenaltySeconds;
      if (teamsOn) {
        const team = picked.team;
        const result = applySkipPenalty(
          banksRef.current[team] ?? 0,
          penalty,
          settings.bufferSeconds,
          Boolean(teamInBufferRef.current[team]),
        );
        const nextBanks = [...banksRef.current];
        nextBanks[team] = result.bank;
        banksRef.current = nextBanks;
        setBanks(nextBanks);
        const nextBuf = [...teamInBufferRef.current];
        nextBuf[team] = result.inBufferZone;
        teamInBufferRef.current = nextBuf;
        setTeamInBuffer(nextBuf);
      } else {
        const result = applySkipPenalty(
          playerBanksRef.current[picked.name] ?? 0,
          penalty,
          settings.bufferSeconds,
          Boolean(playerInBufferRef.current[picked.name]),
        );
        const nextBanks = { ...playerBanksRef.current, [picked.name]: result.bank };
        playerBanksRef.current = nextBanks;
        setPlayerBanks(nextBanks);
        const nextBuf = {
          ...playerInBufferRef.current,
          [picked.name]: result.inBufferZone,
        };
        playerInBufferRef.current = nextBuf;
        setPlayerInBuffer(nextBuf);
      }
    }
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
    endShowArmed.current = false;
    if (endShowTimer.current != null) {
      window.clearTimeout(endShowTimer.current);
      endShowTimer.current = null;
    }
    setMatchEnding(false);
    const who = picked;
    let nextTeamSpins = teamSpinsRef.current;
    let nextPlayerSpins = playerSpinsRef.current;

    if (who) {
      if (teamsOn) {
        nextTeamSpins = [...teamSpinsRef.current];
        nextTeamSpins[who.team] = (nextTeamSpins[who.team] ?? 0) + 1;
        teamSpinsRef.current = nextTeamSpins;
        setTeamSpins(nextTeamSpins);
      } else {
        nextPlayerSpins = {
          ...playerSpinsRef.current,
          [who.name]: (playerSpinsRef.current[who.name] ?? 0) + 1,
        };
        playerSpinsRef.current = nextPlayerSpins;
        setPlayerSpins(nextPlayerSpins);
      }
    }

    if (timeBankMatch) {
      if (teamsOn) {
        const elim = teamEliminatedRef.current.slice(0, teamCount);
        if (shouldEndTimeBankMatch(countAlive(elim))) {
          finishTimeBankTeamMatch();
          return;
        }
        const nextTurn = passTurn(turnRef.current, nextTeamSpins);
        if (nextTurn == null) {
          finishTimeBankTeamMatch();
          return;
        }
        setTurn(nextTurn);
        angleRef.current = 0;
        setAngle(0);
        physicsRef.current?.reset(0);
      } else {
        const names = players.map((p) => p.name);
        const flags = names.map((n) => Boolean(playerEliminatedRef.current[n]));
        if (shouldEndTimeBankMatch(countAlive(flags))) {
          finishTimeBankSoloMatch(names);
          return;
        }
      }
      setPrompt(null);
      setRevealStep(0);
      setPicked(null);
      setShowKind(null);
      setShowPts(0);
      setScene("wheel");
      return;
    }

    if (settings.winMode === "score") {
      if (teamsOn) {
        const slice = nextScores.slice(0, teamCount);
        const spins = nextTeamSpins.slice(0, teamCount);
        if (shouldEndScoreMatch(slice, spins, settings.scoreToWin)) {
          finishMatch(nextScores);
          return;
        }
        if (reachedScoreToWin(slice, settings.scoreToWin)) {
          const nextTurn = passTurn(turnRef.current, nextTeamSpins);
          if (nextTurn == null) {
            finishMatch(nextScores);
            return;
          }
          setTurn(nextTurn);
          angleRef.current = 0;
          setAngle(0);
          physicsRef.current?.reset(0);
          setPrompt(null);
          setRevealStep(0);
          setPicked(null);
          setShowKind(null);
          setShowPts(0);
          setScene("wheel");
          return;
        }
      } else {
        const names = players.map((p) => p.name);
        const pts = names.map((n) => playerScoresRef.current[n] ?? 0);
        if (shouldEndSoloScoreMatch(pts, settings.scoreToWin)) {
          finishSoloMatch(playerScoresRef.current, names);
          return;
        }
      }
    }

    if (teamsOn) {
      const nextTurn = passTurn(turnRef.current, nextTeamSpins);
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
    setShowKind(null);
    setShowPts(0);
    setScene("wheel");
  }

  function answerPoints() {
    if (!answerText) return 0;
    const fullyRevealed = displayAnswer(answerText, revealStep).complete;
    return pointsForAnswer(settings, revealStep, fullyRevealed);
  }

  function awardPoints(pts: number) {
    if (!picked || pts <= 0) return scores;
    const next = [...scores];
    const when = Date.now();
    if (teamsOn) {
      next[picked.team] = (next[picked.team] ?? 0) + pts;
      scoresRef.current = next;
      setScores(next);
      setTeamScoredAt((prev) => {
        const times = [...prev];
        times[picked.team] = when;
        return times;
      });
      setScoreBurst(picked.team);
      setScoreFly({ target: picked.team, value: pts, player: picked.name });
      window.setTimeout(() => setScoreBurst(null), 500);
      window.setTimeout(() => setScoreFly(null), 700);
    } else {
      const updated = {
        ...playerScoresRef.current,
        [picked.name]: (playerScoresRef.current[picked.name] ?? 0) + pts,
      };
      playerScoresRef.current = updated;
      setPlayerScores(updated);
      setPlayerScoredAt((prev) => ({ ...prev, [picked.name]: when }));
      setScoreBurst(0);
      setScoreFly({ target: 0, value: pts, player: picked.name });
      window.setTimeout(() => setScoreBurst(null), 500);
      window.setTimeout(() => setScoreFly(null), 700);
    }
    return next;
  }

  function willFinishAfterThisTurn(): boolean {
    if (timeBankMatch) {
      if (teamsOn) {
        return shouldEndTimeBankMatch(
          countAlive(teamEliminatedRef.current.slice(0, teamCount)),
        );
      }
      const flags = players.map((p) => Boolean(playerEliminatedRef.current[p.name]));
      return shouldEndTimeBankMatch(countAlive(flags));
    }
    if (settings.winMode !== "score" || !picked) return false;
    if (teamsOn) {
      const nextSpins = [...teamSpinsRef.current];
      nextSpins[picked.team] = (nextSpins[picked.team] ?? 0) + 1;
      const slice = scoresRef.current.slice(0, teamCount);
      const spins = nextSpins.slice(0, teamCount);
      if (shouldEndScoreMatch(slice, spins, settings.scoreToWin)) return true;
      if (
        reachedScoreToWin(slice, settings.scoreToWin) &&
        nextCatchUpIndex(turnRef.current, spins) == null
      ) {
        return true;
      }
      return false;
    }
    const pts = players.map((p) => playerScoresRef.current[p.name] ?? 0);
    return shouldEndSoloScoreMatch(pts, settings.scoreToWin);
  }

  function openShow(kind: ShowKind, pts: number) {
    fuseHandled.current = true;
    setShowKind(kind);
    setShowPts(pts);
    setScene(sceneAfterMarked());
    if (endShowTimer.current != null) {
      window.clearTimeout(endShowTimer.current);
      endShowTimer.current = null;
    }
    endShowArmed.current = false;
    const ending = willFinishAfterThisTurn();
    setMatchEnding(ending);
    if (ending) {
      endShowArmed.current = true;
      endShowTimer.current = window.setTimeout(() => {
        endShowTimer.current = null;
        if (!endShowArmed.current) return;
        endShowArmed.current = false;
        finishTurn(scoresRef.current);
      }, 2000);
    }
  }
  openShowRef.current = openShow;

  function applyTimeBankEscape() {
    if (!picked) return;
    const elapsed = elapsedFromRoundClock(
      roundClockStartRef.current,
      fuseLeftRef.current ?? 0,
    );
    if (teamsOn) {
      const team = picked.team;
      const result = applyCorrectEscape(
        banksRef.current[team] ?? 0,
        elapsed,
        settings.bufferSeconds,
        Boolean(teamInBufferRef.current[team]),
      );
      const nextBanks = [...banksRef.current];
      nextBanks[team] = result.bank;
      banksRef.current = nextBanks;
      setBanks(nextBanks);
      const nextBuf = [...teamInBufferRef.current];
      nextBuf[team] = result.inBufferZone;
      teamInBufferRef.current = nextBuf;
      setTeamInBuffer(nextBuf);
    } else {
      const result = applyCorrectEscape(
        playerBanksRef.current[picked.name] ?? 0,
        elapsed,
        settings.bufferSeconds,
        Boolean(playerInBufferRef.current[picked.name]),
      );
      const nextBanks = { ...playerBanksRef.current, [picked.name]: result.bank };
      playerBanksRef.current = nextBanks;
      setPlayerBanks(nextBanks);
      const nextBuf = {
        ...playerInBufferRef.current,
        [picked.name]: result.inBufferZone,
      };
      playerInBufferRef.current = nextBuf;
      setPlayerInBuffer(nextBuf);
    }
  }

  function markCorrect() {
    if (!canMarkAnswer(scene, answerOpen) || !picked) return;
    if (timeBankMatch) {
      applyTimeBankEscape();
      void playCorrect();
      openShow("got", 0);
      return;
    }
    const pts = answerPoints();
    awardPoints(pts);
    void playCorrect();
    openShow("got", pts);
  }

  function markMiss() {
    if (!canMarkAnswer(scene, answerOpen)) return;
    if (timeBankMatch && picked) {
      eliminateContestant(picked);
    }
    void playMiss();
    openShow("miss", 0);
  }

  function nextAfterShow() {
    if (scene !== "show" || matchEnding) return;
    finishTurn(scoresRef.current);
  }

  function unlockAnswer() {
    if (!canUnlockAnswer(scene, answerOpen) || !prompt) return;
    setAnswerOpen(true);
  }

  function revealHint() {
    if (!prompt || !answerText) return;
    const plan = buildRevealPlan(answerText);
    if (!canRevealHint(scene, revealStep, plan, answerOpen)) return;
    setRevealStep((step) => step + 1);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (started && !panelOpen && scene === "wheel") spin();
        if (started && !panelOpen && scene === "show") nextAfterShow();
      }
      if (scene === "landed") {
        if (e.key === "p" || e.key === "P") playLanded();
        if (e.key === "s" || e.key === "S") skipLanded();
      }
      if (scene === "question") {
        if ((e.key === "r" || e.key === "R") && !answerOpen) revealHint();
        if (e.key === "Enter" && !answerOpen) unlockAnswer();
        if (e.key === "1" || e.key === "y" || e.key === "Y") markCorrect();
        if (e.key === "2" || e.key === "n" || e.key === "N") markMiss();
      }
      if (scene === "show") {
        if (e.key === "Enter" || e.key === "n" || e.key === "N") nextAfterShow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const promptText = prompt ? (prompt.askFrench ? prompt.word.french : prompt.word.english) : null;
  const answerText = prompt ? (prompt.askFrench ? prompt.word.english : prompt.word.french) : null;
  const askLabel = prompt
    ? prompt.askFrench
      ? "what does this mean in English?"
      : "how do you say this in French?"
    : null;

  const activeName = scene === "question" || scene === "landed" ? (picked?.name ?? null) : null;
  const hintAvailable = answerText
    ? canRevealHint(scene, revealStep, buildRevealPlan(answerText), answerOpen)
    : false;

  const activePalette = palettes[picked?.team ?? turn] ?? palettes[0]!;
  const nameColor = (() => {
    if (teamsOn) return activePalette.fill;
    const idx = players.findIndex((p) => p.name === picked?.name);
    if (idx >= 0) return rainbowPaint(idx).fill;
    return "oklch(0.58 0.21 25)";
  })();

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
    setPanelOpen(true);
  }

  const boardScores = timeBankMatch
    ? banks.map((b, i) => (teamEliminated[i] ? 0 : Math.round(b)))
    : scores;
  const boardPlayerScores = timeBankMatch
    ? Object.fromEntries(
        players.map((p) => [
          p.name,
          playerEliminated[p.name] ? 0 : Math.round(playerBanks[p.name] ?? 0),
        ]),
      )
    : playerScores;
  const showScoreRail = started && scene !== "toss" && !deskOpen;
  const teamCorners = teamsOn && teamCount === 2;

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      {showScoreRail ? (
        teamCorners ? (
          <PlayLeaderboard
            teamsOn={teamsOn}
            teamCount={teamCount}
            scores={boardScores}
            playerScores={boardPlayerScores}
            players={players}
            palettes={palettes}
            playerScoredAt={playerScoredAt}
            teamScoredAt={teamScoredAt}
            burst={scoreBurst}
            plusFly={scoreFly?.target ?? null}
            plusValue={scoreFly?.value ?? 0}
            activePlayer={scoreFly?.player ?? activeName}
            unit={timeBankMatch ? "s" : "pts"}
          />
        ) : (
          <aside
            className={`vocablab-score-rail pointer-events-none absolute bottom-28 left-0 top-0 z-30 w-[min(15rem,32vw)] overflow-x-hidden overflow-y-auto ${
              deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
            }`}
            aria-label="Scores"
          >
            <PlayLeaderboard
              teamsOn={teamsOn}
              teamCount={teamCount}
              scores={boardScores}
              playerScores={boardPlayerScores}
              players={players}
              palettes={palettes}
              playerScoredAt={playerScoredAt}
              teamScoredAt={teamScoredAt}
              burst={scoreBurst}
              plusFly={scoreFly?.target ?? null}
              plusValue={scoreFly?.value ?? 0}
              activePlayer={scoreFly?.player ?? activeName}
              unit={timeBankMatch ? "s" : "pts"}
            />
          </aside>
        )
      ) : null}

      <div
        className={`flex h-full min-w-0 flex-col items-center bg-[radial-gradient(ellipse_at_center,oklch(0.97_0.02_220)_0%,var(--background)_70%)] transition-[margin,background] duration-500 ${
          !started || panelOpen ? "lg:mr-[36rem]" : "lg:mr-0"
        }`}
        style={
          {
            ["--setup-shift"]: !started || panelOpen ? "36rem" : "0px",
            ["--score-rail-width"]: "0px",
            ...(scene === "question" || scene === "show"
              ? picked && !deskOpen
                ? {
                    background: `radial-gradient(ellipse at center, color-mix(in oklch, ${nameColor} 18%, white) 0%, var(--background) 72%)`,
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
                teamColor={nameColor}
                teamInk={teamsOn ? activePalette.ink : "oklch(0.99 0 0)"}
                askLabel={askLabel}
                askFrench={Boolean(prompt?.askFrench)}
                promptText={promptText}
                answerText={answerText}
                imageSrc={prompt?.word.image ? resolveImageSrc(prompt.word.image) : undefined}
                revealStep={revealStep}
                answerOpen={answerOpen}
                hintAvailable={hintAvailable}
                fuseEnabled={timeBankMatch || fuse.enabled}
                fuseSeconds={fuse.seconds}
                fusePaused={panelOpen || (!timeBankMatch && answerOpen)}
                fuseKey={prompt?.word.id ?? picked?.name ?? "fuse"}
                onUnlock={unlockAnswer}
                onHint={revealHint}
                onCorrect={markCorrect}
                onMiss={markMiss}
              />
            </div>
          ) : null}
          {started && scene === "show" ? (
            <div
              className={`absolute inset-0 z-10 flex ${
                deskOpen ? "vocablab-play-layer is-away" : "vocablab-play-layer"
              }`}
            >
              <ResultShow
                name={picked?.name ?? ""}
                teamColor={nameColor}
                askFrench={Boolean(prompt?.askFrench)}
                englishText={prompt?.word.english ?? null}
                frenchText={prompt?.word.french ?? null}
                kind={showKind}
                points={showPts}
                hideNext={matchEnding}
                onNext={nextAfterShow}
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
          className="absolute bottom-7 right-0 z-[60] rounded-l-2xl bg-primary px-2 py-8 font-kids text-sm font-semibold tracking-wide text-primary-foreground shadow-lg"
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
            showRestart={started && teamsOn !== matchTeamsOn}
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

      {scene === "winner" && (winner !== null || soloPodium) ? (
        <WinOverlay
          winner={winner}
          soloPodium={soloPodium}
          scores={timeBankMatch ? boardScores : scores}
          players={players}
          palettes={palettes}
          teamCount={teamCount}
          onAgain={playAgain}
          away={deskOpen}
          timeBank={timeBankMatch}
        />
      ) : null}
    </div>
  );
}

function QuestionStage({
  name,
  teamColor,
  askLabel,
  askFrench,
  promptText,
  answerText,
  imageSrc,
  revealStep,
  answerOpen,
  hintAvailable,
  fuseEnabled,
  fuseSeconds,
  fusePaused,
  fuseKey,
  onUnlock,
  onHint,
  onCorrect,
  onMiss,
}: {
  name: string;
  teamColor: string;
  teamInk: string;
  askLabel: string | null;
  askFrench: boolean;
  promptText: string | null;
  answerText: string | null;
  imageSrc?: string;
  revealStep: number;
  answerOpen: boolean;
  hintAvailable: boolean;
  fuseEnabled: boolean;
  fuseSeconds: number;
  fusePaused: boolean;
  fuseKey: string;
  onUnlock: () => void;
  onHint: () => void;
  onCorrect: () => void;
  onMiss: () => void;
}) {
  const HINT_AMBER = "oklch(0.74 0.16 58)";
  const questionLang: "en" | "fr" = askFrench ? "fr" : "en";
  const answerLang: "en" | "fr" = askFrench ? "en" : "fr";

  return (
    <div className={`vocablab-result-stage vocablab-ask-stage${imageSrc ? " has-vocab-image" : ""}`}>
      {imageSrc ? (
        <figure className="vocablab-ask-image">
          <img src={imageSrc} alt="" decoding="async" />
        </figure>
      ) : null}

      <div className="vocablab-result-composition">
        <p className="vocablab-result-copy vocablab-result-congrats vocablab-result-line font-kids font-semibold leading-[1.12] tracking-tight">
          <span style={{ color: teamColor }}>{name}</span>
          {askLabel ? (
            <>
              <span style={{ color: ASK_NAVY }}>, {askLabel}</span>
            </>
          ) : null}
        </p>
        {promptText ? (
          <p
            className="vocablab-result-copy vocablab-result-question vocablab-result-word vocablab-result-pair font-kids font-semibold leading-[1.12] tracking-tight"
            style={{ color: WORD_AZURE }}
          >
            <LangFlag lang={questionLang} />
            <span>{promptText}</span>
          </p>
        ) : null}
        <AnswerRevealer
          answerText={answerText}
          revealStep={revealStep}
          accent={ANSWER_GREEN}
          answerLang={answerLang}
          unlocked={answerOpen}
          onUnlock={onUnlock}
        />
      </div>

      <div className="vocablab-ask-controls">
        <div className="vocablab-ask-actions">
          {answerOpen ? (
            <>
              <button
                type="button"
                onClick={onCorrect}
                className="vocablab-round-act bg-success text-success-foreground"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={onMiss}
                className="vocablab-round-act text-white"
                style={{ background: "oklch(0.68 0.19 32)" }}
              >
                Miss it
              </button>
            </>
          ) : hintAvailable ? (
            <button
              type="button"
              onClick={onHint}
              className="vocablab-round-act"
              style={{ background: HINT_AMBER, color: "oklch(0.995 0 0)" }}
            >
              Hint
            </button>
          ) : (
            <span className="vocablab-round-act vocablab-round-act-ghost" aria-hidden="true" />
          )}
        </div>

        {fuseEnabled ? (
          <div className="vocablab-ask-fuse">
            <FuseWire seconds={fuseSeconds} paused={fusePaused} resetKey={fuseKey} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultShow({
  name,
  teamColor,
  askFrench,
  englishText,
  frenchText,
  kind,
  points,
  hideNext = false,
  onNext,
}: {
  name: string;
  teamColor: string;
  askFrench: boolean;
  englishText: string | null;
  frenchText: string | null;
  kind: ShowKind | null;
  points: number;
  hideNext?: boolean;
  onNext: () => void;
}) {
  const ptsBit = points > 0 ? ` and got ${points} pts` : "";
  const questionText = askFrench ? frenchText : englishText;
  const answerText = askFrench ? englishText : frenchText;
  const questionLang: "en" | "fr" = askFrench ? "fr" : "en";
  const answerLang: "en" | "fr" = askFrench ? "en" : "fr";

  return (
    <div className="vocablab-result-stage vocablab-ask-stage vocablab-show-stage">
      <div className="vocablab-result-composition">
        <p className="vocablab-result-copy vocablab-result-congrats vocablab-result-line font-kids font-semibold leading-[1.12] tracking-tight">
          {kind === "timeout" ? (
            <>
              <span style={{ color: ASK_NAVY }}>Time is up, </span>
              <span style={{ color: teamColor }}>{name}</span>
            </>
          ) : kind === "got" ? (
            <>
              <span style={{ color: teamColor }}>{name}</span>
              <span style={{ color: ASK_NAVY }}>, you answered correctly{ptsBit}</span>
            </>
          ) : (
            <>
              <span style={{ color: teamColor }}>{name}</span>
              <span style={{ color: ASK_NAVY }}>, missed this question</span>
            </>
          )}
        </p>
        {questionText ? (
          <p
            className="vocablab-result-copy vocablab-result-question vocablab-result-word vocablab-result-pair font-kids font-semibold leading-[1.12] tracking-tight"
            style={{ color: WORD_AZURE }}
          >
            <LangFlag lang={questionLang} />
            <span>{questionText}</span>
          </p>
        ) : null}
        {answerText ? (
          <p
            className="vocablab-result-copy vocablab-result-answer vocablab-result-pair font-kids font-semibold leading-[1.12] tracking-tight"
            style={{ color: ANSWER_GREEN }}
          >
            <LangFlag lang={answerLang} />
            <span>{answerText}</span>
          </p>
        ) : null}
      </div>
      {!hideNext ? (
        <div className="vocablab-result-next">
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-primary px-12 py-4 font-kids text-2xl font-semibold text-primary-foreground shadow-lg sm:px-16 sm:py-5 sm:text-3xl"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WinOverlay({
  winner,
  soloPodium,
  scores,
  players,
  palettes,
  teamCount = 2,
  onAgain,
  away = false,
  timeBank = false,
}: {
  winner: TeamId | "draw" | null;
  soloPodium: RankedEntry[] | null;
  scores: number[];
  players: { name: string; team: number }[];
  palettes: ReturnType<typeof colorById>[];
  teamCount?: number;
  onAgain: () => void;
  away?: boolean | undefined;
  timeBank?: boolean;
}) {
  const solo = Boolean(soloPodium?.length);
  const firstSolo = soloPodium?.[0];
  const nameIndex = new Map(players.map((p, i) => [p.name, i]));
  const soloPaint = firstSolo ? rainbowPaint(nameIndex.get(firstSolo.id) ?? 0) : null;
  const isDraw = !solo && winner === "draw";
  const winTeam = !solo && typeof winner === "number" ? winner : null;
  const winPalette = solo
    ? soloPaint
    : winTeam != null
      ? (palettes[winTeam] ?? palettes[0] ?? null)
      : null;

  const title = solo
    ? firstSolo && soloPodium!.filter((p) => p.place === 1).length > 1
      ? "It’s a tie for 1st"
      : `${firstSolo?.id ?? "Player"} wins`
    : isDraw
      ? "It’s a draw"
      : `${(winTeam != null ? palettes[winTeam]?.label : null) ?? "Team"} wins`;

  const accent = (winPalette && "fill" in winPalette ? winPalette.fill : null) ?? "oklch(0.84 0.14 88)";
  const ink = "oklch(0.99 0.01 95)";
  const fireworkColors = useMemo(() => {
    if (solo && soloPodium) {
      return [
        ...soloPodium.slice(0, 3).map((row) => rainbowPaint(nameIndex.get(row.id) ?? 0).fill),
        "oklch(0.92 0.04 95)",
        "#fff",
      ];
    }
    if (isDraw) {
      return [
        ...palettes.slice(0, teamCount).map((p) => p.fill),
        "oklch(0.84 0.14 88)",
        "#fff",
      ];
    }
    return [accent, "oklch(0.92 0.04 95)", "#fff", "oklch(0.78 0.12 55)"];
  }, [accent, isDraw, nameIndex, palettes, solo, soloPodium, teamCount]);

  useEffect(() => {
    if (away) return;
    void playFanfare();
    const id = window.setTimeout(() => {
      void playFireworks();
    }, 180);
    return () => window.clearTimeout(id);
  }, [away]);

  const scoreLine = solo
    ? null
    : palettes
        .slice(0, teamCount)
        .map((_, i) => scores[i] ?? 0)
        .join(" — ");

  return (
    <div
      className={`vocablab-win-overlay absolute inset-0 z-50 flex flex-col items-center justify-center ${
        away ? "vocablab-play-layer is-away" : "vocablab-play-layer"
      }`}
      style={
        {
          color: ink,
          ["--win-accent"]: accent,
        } as CSSProperties
      }
    >
      <div className="vocablab-win-glow" aria-hidden />
      <Fireworks colors={fireworkColors} />
      <div className="vocablab-win-copy relative z-10 flex flex-col items-center px-6 text-center">
        <p className="vocablab-win-kicker font-kids font-semibold uppercase tracking-[0.28em]">
          {solo ? "Final results" : isDraw ? "Match complete" : "Winner"}
        </p>
        <p className="vocablab-win-title font-kids font-semibold tracking-tight">{title}</p>
        {solo && soloPodium ? (
          <ul className="vocablab-win-podium mt-8 flex max-h-[42vh] w-full max-w-lg flex-col gap-2.5 overflow-auto">
            {soloPodium.map((row) => {
              const paint = rainbowPaint(nameIndex.get(row.id) ?? 0);
              const placeLabel =
                row.place === 1
                  ? "1st"
                  : row.place === 2
                    ? "2nd"
                    : row.place === 3
                      ? "3rd"
                      : `${row.place}th`;
              return (
                <li key={row.id} className="vocablab-win-row font-kids font-semibold">
                  <span className="vocablab-win-place tabular-nums">{placeLabel}</span>
                  <span className="vocablab-win-name" style={{ color: paint.fill }}>
                    {row.id}
                  </span>
                  <span className="vocablab-win-pts tabular-nums">
                    {row.score} {timeBank ? "s" : "pts"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="vocablab-win-score mt-5 font-kids font-semibold tabular-nums">{scoreLine}</p>
        )}
        <button type="button" onClick={onAgain} className="vocablab-win-again font-kids font-semibold">
          Play again
        </button>
      </div>
    </div>
  );
}
