# Cinematic production artwork

Generated with the built-in image-generation tool, following the approved `concept-v1.png` checkpoint. No reference images or video frames are shipped as production artwork.

## Saved assets

- `public/images/cinematic/kratos-windup.webp` — 1312 × 1199, 168,520 bytes.
- `public/images/cinematic/kratos-apex.webp` — 1536 × 1024, 142,098 bytes.
- `public/images/cinematic/blade.webp` — 1536 × 1024, 164,072 bytes.

Total: 474,690 bytes (about 464 KiB). The tool painted a checkerboard instead of generating alpha on its initial attempts. A targeted background-only image edit produced black-backed sprites, composited with CSS `mix-blend-mode: screen` on the black stage. This preserves the layered composition without a painted checkerboard. Sharp performs WebP format conversion only (quality 85); no programmatic artwork drawing, masking, or retouching.

## Initial generation prompts

### Wind-up

Use case: stylized-concept. Generate a PRODUCTION TRANSPARENT PNG sprite of Greek-era Kratos for the approved cinematic. The attached storyboard is a reference only. Match the storyboard's realistic 3D-painted hybrid, ash-white skin, red tattoo, bald head, short black goatee, bronze right shoulder armor, red-brown Greek leather skirt and chain-wrapped bracers/greaves. Same original artwork appearance as approved sheet. Exactly one character, full body, all weapons and feet inside the frame with 8% margin. Two matched broad fiery hooked Blades of Chaos held correctly, sculpted bronze guards and orange glowing inset cores. Detailed clean silhouette suitable for compositing onto black. No ground, no smoke, no ambient particles, no detached rocks, no background, no text. GENUINE alpha transparency, not a checkerboard painting. Do not include sheet labels. No blood/gore/other people. Pose: WIND-UP matching top-left storyboard panel. Knees deeply flexed in wide planted stance; torso rotates slightly, both arms coiled across his body toward the viewer's left; one blade raised outward to left near shoulder level, second crossing low in front of torso. Face looking straight at viewer. Strong anticipated explosive outward swing. Subtle warm blade edge illumination, cool soft key on skin. Landscape square-ish sprite.

### Arms-wide apex

Use case: stylized-concept. Generate a PRODUCTION TRANSPARENT PNG sprite of Greek-era Kratos for the approved cinematic. The attached storyboard is a reference only. Match the storyboard's realistic 3D-painted hybrid, ash-white skin, red tattoo, bald head, short black goatee, bronze right shoulder armor, red-brown Greek leather skirt and chain-wrapped bracers/greaves. Same original artwork appearance as approved sheet. Exactly one character, full body, all weapons and feet inside the frame with 8% margin. Two matched broad fiery hooked Blades of Chaos held correctly, sculpted bronze guards and orange glowing inset cores. Detailed clean silhouette suitable for compositing onto black. No ground, no smoke, no ambient particles, no detached rocks, no background, no text. GENUINE alpha transparency, not a checkerboard painting. Do not include sheet labels. No blood/gore/other people. Pose: APEX matching top-right storyboard panel. Symmetric, square to camera, braced wide stance with knees slightly bent. Both arms stretched wide near shoulder height and slightly forward, one outward/upward pointing fiery hooked blade in each hand, arms correctly attached, symmetrical scale. Powerful full-body triumphant double-blade extension. Chains attached to bracers, not floating. Subtle warm blade edge illumination and cool soft key on skin. Wide landscape sprite.

### Independent blade

Use case: stylized-concept. Generate ONE isolated Blades of Chaos weapon sprite for an opening cinematic, matching the blades in the attached approved storyboard. A single large broad hooked blade, detailed weathered silver cutting edge, dark iron core with glowing orange-red inlaid branching fire pattern, ornate sculpted bronze guard, dark wrapped leather grip and a short attached chain at pommel. Horizontal orientation, pommel left, tip right and hooking upward. Photorealistic painted 3D game-asset style. Entire blade and short chain visible with 10% margin. GENUINE transparent alpha background. No character, hand, flames outside the blade, particles, ground, text, multiple items, or checkerboard painting.

## Final background correction prompt (applied separately to each sprite)

Edit target: attached production sprite. Preserve the character/weapon exactly, including pose, scale, framing, colors, face, all anatomy and detail. Change ONLY the background: remove ALL painted checkerboard, grey white patterns, glow haze, environmental light and shadows outside the subject and replace with absolutely uniform PURE BLACK RGB 0,0,0. Clean precise silhouette edges, no halo. Background must be SOLID BLACK throughout every space outside the subject including gaps between arms/chains and body. This is a black-background compositing sprite. Do not draw checkerboards. Do not alter the subject, do not add anything. No lettering.

