import { createFileRoute, Link } from "@tanstack/react-router";
import { VocabLabLogo } from "@/components/VocabLabLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vocablab — French vocabulary for secondary classrooms" },
      {
        name: "description",
        content:
          "Vocablab helps secondary teachers run calm, focused French vocabulary lessons and classroom wheel games.",
      },
      { property: "og:title", content: "Vocablab" },
      {
        property: "og:description",
        content:
          "French vocabulary for secondary classrooms — lessons, images, and Wheel of Names.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="vocablab-landing">
      <div className="vocablab-landing-atmosphere" aria-hidden="true">
        <span className="vocablab-landing-orb vocablab-landing-orb-a" />
        <span className="vocablab-landing-orb vocablab-landing-orb-b" />
        <span className="vocablab-landing-orb vocablab-landing-orb-c" />
        <span className="vocablab-landing-wheel" />
        <span className="vocablab-landing-grain" />
      </div>

      <div className="vocablab-landing-stage">
        <VocabLabLogo className="is-hero" />
        <p className="vocablab-landing-line">
          French vocabulary for secondary classrooms.
        </p>
        <Link to="/login" className="vocablab-landing-cta font-kids">
          Log in
        </Link>
      </div>
    </main>
  );
}
