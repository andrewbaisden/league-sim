import { normalizeTeamStars, type TeamStars } from "@leaguesim/domain";

const STAR_SLOTS = ["s1", "s2", "s3", "s4", "s5"] as const;

export function StarRating({
  stars,
  label = "Club rating",
  size = "md",
}: {
  stars: TeamStars;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const value = normalizeTeamStars(stars);
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  return (
    <div className={`star-rating star-rating-${size}`}>
      <span className="sr-only">
        {label}: {value} out of 5
      </span>
      <span className="star-rating-value" aria-hidden="true">
        {value.toFixed(1)}
      </span>
      <span className="star-rating-glyphs" aria-hidden="true">
        {STAR_SLOTS.map((slot, index) => {
          const kind = index < full ? "full" : index === full && half ? "half" : "empty";
          return (
            <span key={slot} className={`star-glyph star-glyph--${kind}`}>
              <span className="star-glyph-base">★</span>
              {kind === "half" ? <span className="star-glyph-fill">★</span> : null}
            </span>
          );
        })}
      </span>
    </div>
  );
}
