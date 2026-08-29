import {
  getGameSettingsFn,
  saveGameSettingsFn,
} from "@/lib/api/game-settings";
import {
  deleteLessonFn,
  listLessonsFn,
  upsertLessonFn,
} from "@/lib/api/lessons";
import {
  loadBoardModes,
  loadFuseConfig,
  loadModeSettings,
  loadWheelSettings,
  saveBoardModes,
  saveFuseConfig,
  saveModeSettings,
  saveWheelSettings,
  withoutCloudSettingsPush,
  type BoardModesState,
  type FuseConfig,
  type WheelModeSettingsStore,
  type WheelSettings,
} from "@/lib/game-settings";
import {
  isLessonUuid,
  listWheelLessons,
  replaceWheelLessonsCache,
  upsertWheelLesson,
  writeWheelLessonCache,
  deleteWheelLesson,
  type WheelLesson,
} from "@/lib/wheel-lessons";

/** Pull lessons + game settings from Postgres into local caches. */
export async function hydrateTeacherCloud() {
  const [remoteLessons, remoteSettings] = await Promise.all([
    listLessonsFn(),
    getGameSettingsFn(),
  ]);
  let lessons = remoteLessons;
  if (lessons.length === 0) {
    // First cloud session: upload any lessons still only on this device.
    const local = listWheelLessons();
    for (const lesson of local) {
      try {
        await persistLessonCloud(lesson);
      } catch {
        break;
      }
    }
    lessons = await listLessonsFn();
  }
  if (lessons.length > 0) replaceWheelLessonsCache(lessons);

  const board = (remoteSettings.board_modes ?? {}) as Partial<BoardModesState>;
  const modeSettings = (remoteSettings.mode_settings ?? {}) as Partial<WheelModeSettingsStore>;
  const fuse = (remoteSettings.fuse ?? {}) as Partial<FuseConfig>;
  const wheel = (remoteSettings.wheel ?? {}) as Partial<WheelSettings>;

  withoutCloudSettingsPush(() => {
    if (board && (Array.isArray(board.enabled) || board.active)) {
      saveBoardModes({
        enabled: Array.isArray(board.enabled) ? board.enabled : loadBoardModes().enabled,
        active: board.active ?? loadBoardModes().active,
      });
    }
    if (modeSettings && (modeSettings.basic || modeSettings.time)) {
      saveModeSettings({
        ...loadModeSettings(),
        ...modeSettings,
        basic: { ...loadModeSettings().basic, ...(modeSettings.basic ?? {}) },
        time: { ...loadModeSettings().time, ...(modeSettings.time ?? {}) },
      });
    }
    if (fuse && (typeof fuse.enabled === "boolean" || typeof fuse.seconds === "number")) {
      saveFuseConfig({
        enabled: fuse.enabled !== false,
        seconds: typeof fuse.seconds === "number" ? fuse.seconds : loadFuseConfig().seconds,
      });
    }
    if (wheel && Object.keys(wheel).length) {
      saveWheelSettings({ ...loadWheelSettings(), ...wheel });
    }
  });

  // First cloud session with empty remote settings: upload local defaults once.
  const remoteEmpty =
    !Array.isArray(board.enabled) &&
    !board.active &&
    !modeSettings.basic &&
    !modeSettings.time &&
    typeof fuse.enabled !== "boolean" &&
    !Object.keys(wheel).length;
  if (remoteEmpty) {
    void pushGameSettingsCloud().catch(() => {});
  }

  return {
    lessons,
    board: loadBoardModes(),
    modeSettings: loadModeSettings(),
    fuse: loadFuseConfig(),
    wheel: loadWheelSettings(),
  };
}

/** Push current local game settings blob to Postgres. */
export async function pushGameSettingsCloud() {
  await saveGameSettingsFn({
    data: {
      board_modes: loadBoardModes(),
      mode_settings: loadModeSettings(),
      fuse: loadFuseConfig(),
      wheel: loadWheelSettings(),
    },
  });
}

export async function persistLessonCloud(
  input: Omit<WheelLesson, "id" | "savedAt"> & { id?: string },
): Promise<WheelLesson> {
  const local = upsertWheelLesson(input);
  const payload = {
    id: isLessonUuid(local.id) ? local.id : undefined,
    title: local.title,
    gameMode: local.gameMode,
    years: local.years,
    terms: local.terms,
    topics: local.topics,
    difficulties: local.difficulties,
    excludedWordIds: local.excludedWordIds,
    askDirection: local.askDirection,
    winMode: local.winMode,
    scoreToWin: local.scoreToWin,
    pointsCorrect: local.pointsCorrect,
    pointsRevealed: local.pointsRevealed,
    pointsSkip: local.pointsSkip,
    secondsPerTeam: local.secondsPerTeam,
    bufferSeconds: local.bufferSeconds,
    skipPenaltySeconds: local.skipPenaltySeconds,
  };
  const remote = await upsertLessonFn({ data: payload });
  if (remote.id !== local.id) {
    deleteWheelLesson(local.id);
  }
  writeWheelLessonCache(remote);
  return remote;
}

export async function deleteLessonCloud(id: string) {
  deleteWheelLesson(id);
  if (isLessonUuid(id)) {
    await deleteLessonFn({ data: { id } });
  }
}
