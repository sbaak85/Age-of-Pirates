# Cover and startup flow

Generated with the built-in imagegen tool from the four character references in Assets/角色. Master: Assets/age-of-pirates-cover-v1.png. Runtime copy: game/assets/age-of-pirates-cover-v1.png (the local preview server only serves game, ship-preview and node_modules).

## Final generation prompt

Create a premium wide 16:9 cinematic ensemble video game cover illustration for "Age of Pirates". Use the FOUR supplied character reference images as identity/costume references, all four distinct adult characters must prominently appear together, faces unobscured: blonde female pirate with red gold coat and feathered tricorn; massively muscular armored male pirate with giant glowing orange cannon/anchor weapon; blond mustached royal navy captain in blue gold coat holding compass; red-haired female pirate in black gold tricorn with twin ornate pistols. Preserve their recognizable silhouettes, clothing and colors, unify into polished American cartoon animated feature style, rich painterly 3D volume, expressive adventurous faces, not photorealistic. Epic blockbuster cast triangular composition with dynamic poses, four heroes occupying upper and side composition. Below them a magnificent wooden pirate ship surges through turquoise crashing waves with broadside cannon fire; distant tropical towering rock pillars, sea arches, cliffside harbor village, dramatic sun shafts and clouds, warm gold rim light versus deep teal shadows, vivid cinematic spectacle. Designed game title lettering integrated at lower central third: EXACT text "Age of Pirates", huge elegant custom embossed antique gold nautical serif with tasteful flourishes, legible, no other lettering, NO Chinese, no watermarks, no existing brands. Leave bottom 10 percent dark uncluttered sea for runtime Click to continue UI (do not paint this phrase). Landscape 16:9, high detail, all four character heads and title comfortably inside safe margins.

## Startup

Black → cover fade-in and breathing English prompt → click / Enter / Space / gamepad A → black with milestone progress → existing title menu. Game modules, procedural sea and ship, and nearby region details initialize behind the cover. The game is ready after a rendered frame with at least one region loaded; all other regions continue streaming normally. Loading percentages represent milestones, not network byte counts.

The overlay blocks title-menu input while loading. A timer completes transitions without relying on transitionend. After 25 seconds, an already rendered world may enter with optional region details still streaming; if no frame has rendered, a visible retry screen replaces the loading view. Module errors, startup runtime exceptions and WebGL context loss show retry. An independent HTML timer handles missing/broken startup.js. Missing cover art retains the title and continue control. Retry reloads the page without clearing saves.

No browser code can guarantee a working 3D game if WebGL is unavailable, the browser process hangs, or mandatory source files are missing. Recovery guarantees here concern a responsive browser with functioning JavaScript; failures produce an actionable message rather than claiming successful game entry.

## Validation

35 Node tests passed, including early activation, load timeout, rendered-world fallback, failure during fade, keyboard capture and held gamepad A edge detection. Browser verification covers the generated cover and normal title-menu transition. Physical controller and cross-device performance not measured.
