import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { colorById, rainbowPaint, TEAM_COLORS, teamSlicePaint } from "@/lib/team-colors";
import { describeLesson, type WheelLesson } from "@/lib/wheel-lessons";

export function SetupPanel({
  namesText,
  onNames,
  allNames,
  teamsOn,
  teamCount,
  setTeamCount,
  onToggleTeams,
  roster,
  colorIds,
  setColorId,
  onDropName,
  onTeamPaste,
  onSplit,
  canStart,
  started,
  onStart,
  onResume,
  onReset,
  poolCount,
  lessons,
  activeLesson,
  onLoadLesson,
  saveNote,
}: {
  namesText: string;
  onNames: (v: string) => void;
  allNames: string[];
  teamsOn: boolean;
  teamCount: 2 | 3;
  setTeamCount: (n: 2 | 3) => void;
  onToggleTeams: () => void;
  roster: string[][];
  colorIds: string[];
  setColorId: (team: number, id: string) => void;
  onDropName: (name: string, toTeam: number) => void;
  onTeamPaste: (team: number, text: string) => void;
  onSplit: () => void;
  canStart: boolean;
  started: boolean;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
  poolCount: number;
  lessons: WheelLesson[];
  activeLesson: WheelLesson | null;
  onLoadLesson: (id: string) => void;
  saveNote: string | null;
}) {
  const [namesOpen, setNamesOpen] = useState(false);

  return (
    <div className="setup-panel flex min-h-full flex-col gap-5 bg-card p-5 font-kids">
      <div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">Class</p>
        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
          {activeLesson
            ? `${activeLesson.title} · ${poolCount} words · ${describeLesson(activeLesson)}`
            : "Load a lesson, then paste names"}
        </p>
      </div>

      <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Lesson
        </p>
        {lessons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No lessons yet.{" "}
            <Link to="/game-settings/wheel" className="font-semibold text-primary underline-offset-2 hover:underline">
              Prep one in Game settings
            </Link>
            .
          </p>
        ) : (
          <select
            value={activeLesson?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) onLoadLesson(id);
            }}
            className="mt-2 w-full rounded-full bg-background px-4 py-2.5 text-base font-semibold text-foreground ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a saved lesson…</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Vocabulary and game mode are locked in the lesson. Edit them under Game settings → Wheel.
        </p>
        {saveNote ? (
          <p className="mt-2 text-sm font-semibold text-success">{saveNote}</p>
        ) : null}
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onToggleTeams}
          className={`flex-1 rounded-full py-2.5 text-lg font-semibold transition ${
            teamsOn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {teamsOn ? "Teams on" : "Teams"}
        </button>
        {teamsOn ? (
          <>
            <button
              type="button"
              onClick={() => setTeamCount(2)}
              className={`rounded-full px-4 text-lg font-semibold ${
                teamCount === 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => setTeamCount(3)}
              className={`rounded-full px-4 text-lg font-semibold ${
                teamCount === 3
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              3
            </button>
          </>
        ) : null}
      </div>

      {teamsOn ? (
        <>
          <div
            className="grid min-h-64 flex-1 gap-2"
            style={{ gridTemplateColumns: `repeat(${teamCount}, minmax(0, 1fr))` }}
          >
            {roster.slice(0, teamCount).map((names, i) => (
              <TeamColumn
                key={i}
                index={i}
                colorId={colorIds[i] ?? TEAM_COLORS[i]!.id}
                usedIds={colorIds.filter((_, j) => j !== i && j < teamCount)}
                names={names}
                onColor={(id) => setColorId(i, id)}
                onPaste={(text) => onTeamPaste(i, text)}
                onDrop={(name) => onDropName(name, i)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onSplit}
            className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Split evenly
          </button>
        </>
      ) : (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Names
            <span className="ml-2 normal-case tracking-normal">
              this login only · wiped on log out
            </span>
          </p>
          <textarea
            value={namesText}
            onChange={(e) => onNames(e.target.value)}
            onFocus={() => setNamesOpen(true)}
            onBlur={() => setNamesOpen(false)}
            rows={namesOpen ? 14 : 3}
            placeholder="Paste the class list"
            className={`mt-1.5 w-full rounded-2xl bg-background px-3 py-3 text-lg leading-snug ring-1 ring-input transition-[min-height] duration-200 focus:outline-none focus:ring-2 focus:ring-ring ${
              namesOpen ? "min-h-64 resize-y" : "min-h-20 resize-none"
            }`}
          />
          <div className="mt-2 flex flex-wrap content-start gap-1.5">
            {allNames.map((name, i) => {
              const paint = rainbowPaint(i);
              return (
                <span
                  key={`${name}-${i}`}
                  className="rounded-full px-2.5 py-1 text-sm font-semibold"
                  style={{ background: paint.fill, color: paint.ink }}
                >
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full bg-muted px-6 py-4 text-xl font-semibold text-foreground ring-1 ring-border"
        >
          Reset
        </button>
        {started ? (
          <button
            type="button"
            onClick={onResume}
            className="flex-1 rounded-full bg-primary py-4 text-2xl font-semibold text-primary-foreground shadow-md"
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="flex-1 rounded-full bg-primary py-4 text-2xl font-semibold text-primary-foreground shadow-md disabled:opacity-40"
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
}

function TeamColumn({
  index,
  colorId,
  usedIds,
  names,
  onColor,
  onPaste,
  onDrop,
}: {
  index: number;
  colorId: string;
  usedIds: string[];
  names: string[];
  onColor: (id: string) => void;
  onPaste: (text: string) => void;
  onDrop: (name: string) => void;
}) {
  const color = colorById(colorId);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);

  return (
    <div
      className="flex min-h-0 flex-col rounded-2xl p-2.5 transition-shadow"
      style={{
        background: `color-mix(in oklch, ${color.fill} 18%, white)`,
        boxShadow: over ? `inset 0 0 0 3px ${color.fill}` : undefined,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const name = e.dataTransfer.getData("text/plain").trim();
        if (name) onDrop(name);
      }}
    >
      <p className="text-center text-lg font-semibold" style={{ color: color.fill }}>
        {color.label}
      </p>
      <div className="mt-1.5 flex justify-center gap-1">
        {TEAM_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.label}
            disabled={usedIds.includes(c.id)}
            onClick={() => onColor(c.id)}
            className={`size-5 rounded-full ring-2 ring-offset-1 disabled:opacity-25 ${
              c.id === colorId ? "ring-foreground" : "ring-transparent"
            }`}
            style={{ background: c.fill }}
          />
        ))}
      </div>
      <textarea
        value={names.join("\n")}
        onChange={(e) => onPaste(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        rows={open ? 10 : 3}
        placeholder={`Paste team ${index + 1}`}
        className={`mt-2 w-full rounded-xl bg-white/80 px-2.5 py-2 text-base leading-snug ring-1 ring-border transition-[min-height] duration-200 focus:outline-none focus:ring-2 focus:ring-ring ${
          open ? "min-h-44 resize-y" : "min-h-16 resize-none"
        }`}
      />
      <div className="mt-2 flex min-h-24 flex-col gap-1">
        {names.map((name, i) => {
          const paint = teamSlicePaint(color, i);
          return (
            <button
              key={`${name}-${i}`}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", name);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab rounded-full px-2 py-1.5 text-left text-sm font-semibold active:cursor-grabbing"
              style={{ background: paint.fill, color: paint.ink }}
            >
              {name}
            </button>
          );
        })}
        {names.length === 0 ? (
          <p className="py-6 text-center text-sm font-medium text-muted-foreground">
            Drop names here
          </p>
        ) : null}
      </div>
    </div>
  );
}
