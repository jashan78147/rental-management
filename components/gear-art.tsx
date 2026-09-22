import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/**
 * Drawn artwork for every item in the fleet.
 *
 * Photography was tried and pulled: stock libraries returned a boardroom for
 * banquet chairs and a statue for a camera body, sometimes with a licence
 * watermark burned in, and a picture of the wrong gear is worse than none on a
 * site whose whole job is to show what it rents. These are drawn instead, so
 * the picture is always of the thing the line is actually named after.
 *
 * All of them share a 160x120 stage with the object sitting between y=18 and
 * y=104 on a soft ground shadow, so a grid of them lines up. Everything is
 * currentColor at three weights: a mass fill, a secondary fill and a full
 * strength stroke. That lets one drawing serve every category tint.
 */

const LINE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const THIN = { ...LINE, strokeWidth: 1.75 } as const;

const MASS = { fill: "currentColor", opacity: 0.16 } as const;
const SHADE = { fill: "currentColor", opacity: 0.34 } as const;

/** The soft contact shadow every object stands on. */
const GROUND = <ellipse cx="80" cy="106" rx="48" ry="4.5" fill="currentColor" opacity="0.12" />;

/* -------------------------------------------------------------------------- */
/* Camera and lenses                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Three bodies that have to be told apart in a row of three. They are drawn
 * from their actual silhouettes rather than parameterised off one shape: the
 * FX6 by its top handle and XLR block, the C70 by its flip-out monitor and no
 * handle at all, the Komodo by being a cube with mounting points.
 */
const fx6: ReactNode = (
  <>
    {GROUND}
    {/* XLR top handle */}
    <rect x="44" y="24" width="30" height="12" rx="2.5" {...SHADE} />
    <rect x="44" y="24" width="30" height="12" rx="2.5" {...LINE} />
    <circle cx="52" cy="30" r="2.5" {...LINE} />
    <circle cx="66" cy="30" r="2.5" {...LINE} />
    <path d="M50 44V36M74 44v-8M40 44h44" {...LINE} />

    {/* Body */}
    <rect x="22" y="44" width="72" height="46" rx="6" {...MASS} />
    <rect x="22" y="44" width="72" height="46" rx="6" {...LINE} />

    {/* Side monitor */}
    <rect x="28" y="52" width="26" height="17" rx="2.5" {...SHADE} />
    <rect x="28" y="52" width="26" height="17" rx="2.5" {...THIN} />
    <circle cx="31" cy="80" r="3" {...SHADE} />
    <path d="M40 78h14M40 84h20" {...THIN} />

    {/* Lens */}
    <circle cx="108" cy="67" r="23" {...MASS} />
    <circle cx="108" cy="67" r="23" {...LINE} />
    <circle cx="108" cy="67" r="14" {...LINE} />
    <circle cx="108" cy="67" r="6" {...SHADE} />
  </>
);

const c70: ReactNode = (
  <>
    {GROUND}
    {/* Tall brick body, no top handle */}
    <rect x="34" y="26" width="62" height="66" rx="7" {...MASS} />
    <rect x="34" y="26" width="62" height="66" rx="7" {...LINE} />

    {/* Flip-out monitor, hinged open to the left */}
    <path d="M34 42h-4a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h4" {...LINE} />
    <rect x="6" y="40" width="24" height="30" rx="3" {...SHADE} />
    <rect x="6" y="40" width="24" height="30" rx="3" {...LINE} />

    {/* Top controls and record lamp */}
    <path d="M44 36h18" {...THIN} />
    <circle cx="88" cy="36" r="3" {...SHADE} />

    {/* Mini XLR posts */}
    <path d="M52 26v-6M66 26v-6" {...LINE} />

    {/* RF mount lens */}
    <circle cx="96" cy="60" r="26" {...MASS} />
    <circle cx="96" cy="60" r="26" {...LINE} />
    <circle cx="96" cy="60" r="16" {...LINE} />
    <circle cx="96" cy="60" r="7" {...SHADE} />
    <path d="M96 34v6M96 80v6" {...THIN} />
  </>
);

const komodo: ReactNode = (
  <>
    {GROUND}
    {/* A cube, which is the whole point of this body */}
    <rect x="34" y="28" width="68" height="68" rx="7" {...MASS} />
    <rect x="34" y="28" width="68" height="68" rx="7" {...LINE} />

    {/* Mounting points along the top and the side */}
    <circle cx="48" cy="28" r="3" {...LINE} />
    <circle cx="68" cy="28" r="3" {...LINE} />
    <circle cx="88" cy="28" r="3" {...LINE} />
    <path d="M34 48h-6M34 62h-6M34 76h-6" {...THIN} />

    {/* Touchscreen back */}
    <rect x="42" y="38" width="26" height="20" rx="2.5" {...SHADE} />
    <rect x="42" y="38" width="26" height="20" rx="2.5" {...THIN} />
    <path d="M42 70h26M42 80h18" {...THIN} />

    {/* Smaller lens, sitting high on the cube */}
    <circle cx="106" cy="58" r="19" {...MASS} />
    <circle cx="106" cy="58" r="19" {...LINE} />
    <circle cx="106" cy="58" r="11" {...LINE} />
    <circle cx="106" cy="58" r="4.5" {...SHADE} />
  </>
);

const primeSet: ReactNode = (
  <>
    {GROUND}
    {[
      { x: 26, y: 46 },
      { x: 64, y: 34 },
      { x: 102, y: 54 },
    ].map((barrel) => (
      <g key={barrel.x}>
        <rect x={barrel.x} y={barrel.y} width="30" height={96 - barrel.y} rx="5" {...MASS} />
        <rect x={barrel.x} y={barrel.y} width="30" height={96 - barrel.y} rx="5" {...LINE} />
        <ellipse cx={barrel.x + 15} cy={barrel.y + 2} rx="15" ry="5.5" {...SHADE} />
        <ellipse cx={barrel.x + 15} cy={barrel.y + 2} rx="15" ry="5.5" {...LINE} />
        <path
          d={`M${barrel.x} ${barrel.y + 20}h30M${barrel.x} ${barrel.y + 30}h30`}
          {...THIN}
        />
      </g>
    ))}
  </>
);

const gimbal: ReactNode = (
  <>
    {GROUND}
    {/* Grip */}
    <rect x="72" y="74" width="17" height="30" rx="8.5" {...MASS} />
    <rect x="72" y="74" width="17" height="30" rx="8.5" {...LINE} />
    <path d="M76 84h9" {...THIN} />

    {/* Arms */}
    <path d="M80.5 74V54h30v14" {...LINE} />
    <circle cx="80.5" cy="52" r="7" {...SHADE} />
    <circle cx="80.5" cy="52" r="7" {...LINE} />
    <circle cx="110.5" cy="70" r="7" {...SHADE} />
    <circle cx="110.5" cy="70" r="7" {...LINE} />
    <path d="M73 52H50" {...LINE} />

    {/* Camera on the cradle */}
    <rect x="24" y="40" width="34" height="24" rx="3.5" {...MASS} />
    <rect x="24" y="40" width="34" height="24" rx="3.5" {...LINE} />
    <circle cx="48" cy="52" r="8" {...LINE} />
  </>
);

/* -------------------------------------------------------------------------- */
/* Lighting and grip                                                           */
/* -------------------------------------------------------------------------- */

const cobLight = (big: boolean): ReactNode => {
  const r = big ? 30 : 25;
  return (
    <>
      {GROUND}
      {/* Stand */}
      <path d="M80 74v24M60 104l20-14 20 14" {...LINE} />

      {/* Yoke */}
      <path
        d={`M${80 - r - 6} 46a${r + 6} ${r + 6} 0 0 0 ${(r + 6) * 2} 0`}
        {...THIN}
      />

      {/* Reflector */}
      <circle cx="80" cy="46" r={r} {...MASS} />
      <circle cx="80" cy="46" r={r} {...LINE} />
      <circle cx="80" cy="46" r={r - 9} {...LINE} />
      <circle cx="80" cy="46" r={r - 17} {...SHADE} />

      {/* Barn doors */}
      <path d={`M${80 - r} 30l-12-8M${80 + r} 30l12-8`} {...LINE} />
    </>
  );
};

const tubeKit: ReactNode = (
  <>
    {GROUND}
    {[30, 52, 74, 96].map((x, i) => (
      <g key={x}>
        <rect x={x} y={26 + i * 4} width="14" height={74 - i * 4} rx="7" {...MASS} />
        <rect x={x} y={26 + i * 4} width="14" height={74 - i * 4} rx="7" {...LINE} />
        <path d={`M${x + 7} ${34 + i * 4}v${58 - i * 4}`} {...THIN} />
      </g>
    ))}
    <rect x="118" y="46" width="14" height="54" rx="7" {...LINE} />
  </>
);

const butterfly: ReactNode = (
  <>
    {GROUND}
    {/* Frame */}
    <rect x="26" y="22" width="108" height="66" rx="4" {...MASS} />
    <rect x="26" y="22" width="108" height="66" rx="4" {...LINE} />
    {/* Diffusion, tied at the corners */}
    <path d="M26 22l108 66M134 22L26 88" {...THIN} />
    <path d="M32 28l6 6M128 28l-6 6M32 82l6-6M128 82l-6-6" {...LINE} />
    {/* Stand */}
    <path d="M80 88v14M66 104l14-10 14 10" {...LINE} />
  </>
);

/* -------------------------------------------------------------------------- */
/* Audio and comms                                                             */
/* -------------------------------------------------------------------------- */

const fieldRecorder: ReactNode = (
  <>
    {GROUND}
    {/* XLR inputs on the top edge */}
    <path d="M40 40v-8M60 40v-8M80 40v-8M100 40v-8M120 40v-8" {...LINE} />
    <circle cx="40" cy="30" r="4" {...LINE} />
    <circle cx="60" cy="30" r="4" {...LINE} />
    <circle cx="80" cy="30" r="4" {...LINE} />
    <circle cx="100" cy="30" r="4" {...LINE} />
    <circle cx="120" cy="30" r="4" {...LINE} />

    <rect x="24" y="40" width="112" height="56" rx="6" {...MASS} />
    <rect x="24" y="40" width="112" height="56" rx="6" {...LINE} />

    {/* Screen */}
    <rect x="32" y="48" width="44" height="26" rx="3" {...SHADE} />
    <rect x="32" y="48" width="44" height="26" rx="3" {...THIN} />

    {/* Gain pots */}
    {[88, 106, 124].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy="58" r="7.5" {...LINE} />
        <path d={`M${cx} 58v-5`} {...THIN} />
      </g>
    ))}
    {/* Track faders */}
    <path d="M32 84h44M88 84h44" {...THIN} />
    <circle cx="52" cy="84" r="3.5" {...SHADE} />
    <circle cx="112" cy="84" r="3.5" {...SHADE} />
  </>
);

const shotgunMic: ReactNode = (
  <>
    {GROUND}
    {/* Boom pole */}
    <path d="M132 100L64 46" {...LINE} />
    <path d="M104 80l-4 6M88 68l-4 6" {...THIN} />

    {/* Suspension cradle */}
    <path d="M58 54l8 6M50 64l8 6" {...THIN} />

    {/* Blimp / windshield */}
    <g transform="rotate(-38 54 44)">
      <rect x="14" y="32" width="80" height="24" rx="12" {...MASS} />
      <rect x="14" y="32" width="80" height="24" rx="12" {...LINE} />
      <path d="M34 32v24M54 32v24M74 32v24" {...THIN} />
    </g>
  </>
);

const intercom: ReactNode = (
  <>
    {GROUND}
    {/* Headband */}
    <path d="M38 62a42 42 0 0 1 84 0" {...LINE} />
    <path d="M44 62a36 36 0 0 1 72 0" {...THIN} />

    {/* Cups */}
    <rect x="28" y="58" width="22" height="32" rx="10" {...MASS} />
    <rect x="28" y="58" width="22" height="32" rx="10" {...LINE} />
    <rect x="110" y="58" width="22" height="32" rx="10" {...MASS} />
    <rect x="110" y="58" width="22" height="32" rx="10" {...LINE} />

    {/* Boom mic */}
    <path d="M50 82q22 16 34 2" {...LINE} />
    <circle cx="86" cy="82" r="5" {...SHADE} />
    <circle cx="86" cy="82" r="5" {...LINE} />
  </>
);

const lineArray: ReactNode = (
  <>
    {GROUND}
    {/* Flown cabinets, each rotated a little further out */}
    <path d="M80 12v8" {...LINE} />
    {[
      { y: 20, w: 58, r: 0 },
      { y: 44, w: 62, r: 6 },
      { y: 68, w: 66, r: 12 },
    ].map((cab) => (
      <g key={cab.y} transform={`rotate(${cab.r} 80 ${cab.y + 10})`}>
        <rect x={80 - cab.w / 2} y={cab.y} width={cab.w} height="20" rx="3" {...MASS} />
        <rect x={80 - cab.w / 2} y={cab.y} width={cab.w} height="20" rx="3" {...LINE} />
        <circle cx={80 - cab.w / 2 + 16} cy={cab.y + 10} r="6" {...THIN} />
        <circle cx={80 + cab.w / 2 - 16} cy={cab.y + 10} r="6" {...THIN} />
        <path d={`M74 ${cab.y + 6}h12M74 ${cab.y + 14}h12`} {...THIN} />
      </g>
    ))}
  </>
);

/* -------------------------------------------------------------------------- */
/* Staging and trussing                                                        */
/* -------------------------------------------------------------------------- */

const stageDeck: ReactNode = (
  <>
    {GROUND}
    {/* Top surface in shallow perspective */}
    <path d="M22 56l36-18h68l14 18z" {...MASS} />
    <path d="M22 56l36-18h68l14 18z" {...LINE} />
    <path d="M58 38l14 18M92 38l14 18" {...THIN} />

    {/* Skirt */}
    <path d="M22 56v14h118V56" {...LINE} />
    <path d="M22 70h118" {...THIN} />

    {/* Legs */}
    <path d="M30 70v28M132 70v28M30 98h10M126 98h10" {...LINE} />
  </>
);

const boxTruss: ReactNode = (
  <>
    {GROUND}
    {/* Chords */}
    <path d="M20 42h120M20 82h120" {...LINE} />
    <path d="M20 42v40M140 42v40" {...LINE} />
    {/* Bracing */}
    <path d="M20 82l30-40 30 40 30-40 30 40" {...THIN} />
    <path d="M20 42l30 40 30-40 30 40 30-40" {...THIN} />
    {/* Connector plates */}
    <circle cx="20" cy="42" r="4" {...SHADE} />
    <circle cx="20" cy="82" r="4" {...SHADE} />
    <circle cx="140" cy="42" r="4" {...SHADE} />
    <circle cx="140" cy="82" r="4" {...SHADE} />
  </>
);

const crowdBarrier: ReactNode = (
  <>
    {GROUND}
    <rect x="22" y="36" width="116" height="58" rx="4" {...MASS} />
    <rect x="22" y="36" width="116" height="58" rx="4" {...LINE} />
    <path d="M22 50h116M22 80h116" {...LINE} />
    {[45, 68, 91, 114].map((x) => (
      <path key={x} d={`M${x} 50v30`} {...THIN} />
    ))}
    {/* Feet */}
    <path d="M34 94v8h-12M126 94v8h12" {...LINE} />
  </>
);

/* -------------------------------------------------------------------------- */
/* Power and distribution                                                      */
/* -------------------------------------------------------------------------- */

const generator: ReactNode = (
  <>
    {GROUND}
    {/* Canopy */}
    <path d="M22 44a6 6 0 0 1 6-6h104a6 6 0 0 1 6 6v42H22z" {...MASS} />
    <path d="M22 44a6 6 0 0 1 6-6h104a6 6 0 0 1 6 6v42H22z" {...LINE} />

    {/* Exhaust */}
    <path d="M116 38V26h10v12" {...LINE} />

    {/* Acoustic louvres */}
    <path d="M32 54h30M32 62h30M32 70h30" {...THIN} />

    {/* Control panel */}
    <rect x="78" y="50" width="46" height="26" rx="3" {...SHADE} />
    <rect x="78" y="50" width="46" height="26" rx="3" {...THIN} />
    <circle cx="90" cy="63" r="5" {...THIN} />
    <path d="M102 58h14M102 68h14" {...THIN} />

    {/* Skid and wheels */}
    <path d="M22 86h116" {...LINE} />
    <circle cx="44" cy="96" r="8" {...LINE} />
    <circle cx="116" cy="96" r="8" {...LINE} />
  </>
);

const distroBox: ReactNode = (
  <>
    {GROUND}
    <rect x="30" y="26" width="100" height="72" rx="6" {...MASS} />
    <rect x="30" y="26" width="100" height="72" rx="6" {...LINE} />

    {/* Breaker row */}
    <rect x="40" y="36" width="80" height="20" rx="3" {...SHADE} />
    <rect x="40" y="36" width="80" height="20" rx="3" {...THIN} />
    {[54, 68, 82, 96].map((x) => (
      <path key={x} d={`M${x} 38v16`} {...THIN} />
    ))}

    {/* Outlets */}
    {[
      [54, 74],
      [80, 74],
      [106, 74],
    ].map(([cx, cy]) => (
      <g key={cx}>
        <circle cx={cx} cy={cy} r="10" {...LINE} />
        <circle cx={cx - 3.5} cy={cy - 2} r="1.8" {...SHADE} />
        <circle cx={cx + 3.5} cy={cy - 2} r="1.8" {...SHADE} />
        <circle cx={cx} cy={cy + 4} r="1.8" {...SHADE} />
      </g>
    ))}
  </>
);

const batterySet: ReactNode = (
  <>
    {GROUND}
    {[
      { x: 26, y: 46 },
      { x: 62, y: 38 },
      { x: 98, y: 52 },
    ].map((cell) => (
      <g key={cell.x}>
        <rect x={cell.x} y={cell.y} width="36" height={96 - cell.y} rx="4" {...MASS} />
        <rect x={cell.x} y={cell.y} width="36" height={96 - cell.y} rx="4" {...LINE} />
        {/* V-mount rails */}
        <path d={`M${cell.x + 8} ${cell.y}v${96 - cell.y}M${cell.x + 28} ${cell.y}v${96 - cell.y}`} {...THIN} />
        {/* Charge lamps */}
        <circle cx={cell.x + 13} cy={cell.y + 12} r="2.2" {...SHADE} />
        <circle cx={cell.x + 19} cy={cell.y + 12} r="2.2" {...SHADE} />
        <circle cx={cell.x + 25} cy={cell.y + 12} r="2.2" {...SHADE} />
      </g>
    ))}
  </>
);

/* -------------------------------------------------------------------------- */
/* Furniture and decor                                                         */
/* -------------------------------------------------------------------------- */

const chiavariChair: ReactNode = (
  <>
    {GROUND}
    {/* Back frame */}
    <path d="M52 78V24a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v54" {...LINE} />
    <path d="M52 34h48M52 48h48M52 62h48" {...THIN} />
    <path d="M66 20v58M80 20v58M94 20v58" {...THIN} />

    {/* Seat */}
    <path d="M42 78h72l-4 12H46z" {...MASS} />
    <path d="M42 78h72l-4 12H46z" {...LINE} />

    {/* Legs */}
    <path d="M50 90l-4 14M106 90l4 14M62 90v14M98 90v14" {...LINE} />
  </>
);

const cocktailTable: ReactNode = (
  <>
    {GROUND}
    {/* Top */}
    <ellipse cx="80" cy="34" rx="50" ry="13" {...MASS} />
    <ellipse cx="80" cy="34" rx="50" ry="13" {...LINE} />
    <path d="M30 34v6a50 13 0 0 0 100 0v-6" {...LINE} />

    {/* Column and base */}
    <path d="M72 46v42M88 46v42" {...LINE} />
    <ellipse cx="80" cy="92" rx="28" ry="8" {...SHADE} />
    <ellipse cx="80" cy="92" rx="28" ry="8" {...LINE} />
  </>
);

const loungeCluster: ReactNode = (
  <>
    {GROUND}
    {/* Back */}
    <path d="M24 78V46a8 8 0 0 1 8-8h96a8 8 0 0 1 8 8v32" {...MASS} />
    <path d="M24 78V46a8 8 0 0 1 8-8h96a8 8 0 0 1 8 8v32" {...LINE} />
    <path d="M80 38v24" {...THIN} />

    {/* Arms */}
    <rect x="18" y="58" width="14" height="30" rx="7" {...SHADE} />
    <rect x="18" y="58" width="14" height="30" rx="7" {...LINE} />
    <rect x="128" y="58" width="14" height="30" rx="7" {...SHADE} />
    <rect x="128" y="58" width="14" height="30" rx="7" {...LINE} />

    {/* Seat cushions */}
    <path d="M32 62h96v26H32z" {...MASS} />
    <path d="M32 62h96v26H32z" {...LINE} />
    <path d="M80 62v26" {...THIN} />

    {/* Feet */}
    <path d="M36 88v10M124 88v10" {...LINE} />
  </>
);

/* -------------------------------------------------------------------------- */

const GEAR: Record<string, ReactNode> = {
  "p-fx6": fx6,
  "p-c70": c70,
  "p-komodo": komodo,
  "p-primes": primeSet,
  "p-gimbal": gimbal,

  "p-600d": cobLight(false),
  "p-evoke": cobLight(true),
  "p-tubes": tubeKit,
  "p-butterfly": butterfly,

  "p-mixpre": fieldRecorder,
  "p-shotgun": shotgunMic,
  "p-comms": intercom,
  "p-pa": lineArray,

  "p-deck": stageDeck,
  "p-truss": boxTruss,
  "p-barrier": crowdBarrier,

  "p-genset": generator,
  "p-distro": distroBox,
  "p-vmount": batterySet,

  "p-chairs": chiavariChair,
  "p-tables": cocktailTable,
  "p-lounge": loungeCluster,
};

/** One drawing per category, for the bands and for anything unrecognised. */
const CATEGORY_FALLBACK: Record<string, ReactNode> = {
  "cat-camera": fx6,
  "cat-light": cobLight(false),
  "cat-audio": lineArray,
  "cat-stage": boxTruss,
  "cat-power": generator,
  "cat-decor": loungeCluster,
};

export function hasGearArt(productId: string): boolean {
  return productId in GEAR;
}

export function GearArt({
  productId,
  categoryId,
  className,
}: {
  productId?: string;
  categoryId?: string;
  className?: string;
}) {
  const art =
    (productId ? GEAR[productId] : undefined) ??
    (categoryId ? CATEGORY_FALLBACK[categoryId] : undefined) ??
    CATEGORY_FALLBACK["cat-stage"];

  return (
    <svg
      viewBox="0 0 160 120"
      role="presentation"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
    >
      {art}
    </svg>
  );
}
