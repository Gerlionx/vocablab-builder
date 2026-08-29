import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/game-settings/wheel")({
  component: WheelLessonsLayout,
});

/** Parent layout so /wheel/lesson can render through an Outlet. */
function WheelLessonsLayout() {
  return <Outlet />;
}
