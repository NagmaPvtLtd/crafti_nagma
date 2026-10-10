# Crafti Nagma --- Color Palette & UI/UX Style Guide

> A warm, handmade, friendly visual identity inspired by Crafti Nagma's
> brown-haired crochet mascot, coral flower, cream floral blouse, and
> soft pastel illustration style.

## 1. Brand direction

**Personality:** warm, handmade, gentle, creative, personal,
trustworthy, and giftable.

**Visual keywords:** soft pastels, rounded shapes, clean layouts, subtle
paper-like warmth, delicate floral accents, confident readable
typography, and generous whitespace.

The website should feel like a modern handmade boutique---not a
children's website. Keep the mascot and decorative details charming,
while product cards, navigation, checkout, and forms remain clear and
professional.

## 2. Core color palette

  -----------------------------------------------------------------------
  Token                   Hex                     Role
  ----------------------- ----------------------- -----------------------
  `brand-cream`           `#FFF8EF`               Main page background;
                                                  warm alternative to
                                                  pure white

  `brand-paper`           `#FFFCF7`               Cards, menus, forms,
                                                  and product surfaces

  `brand-peach`           `#F9D8C8`               Soft section
                                                  backgrounds and
                                                  illustration backdrops

  `brand-coral`           `#F28B7B`               Primary brand accent,
                                                  small highlights,
                                                  badges, and decorative
                                                  hearts

  `brand-coral-dark`      `#C95F50`               Stronger coral for
                                                  accessible buttons,
                                                  links, and active
                                                  states

  `brand-brown`           `#593522`               Main logo outline
                                                  color, headings, icons,
                                                  and strong text

  `brand-brown-soft`      `#81563E`               Secondary text, subtle
                                                  outlines, and
                                                  supporting details

  `brand-yarn`            `#D7A17A`               Warm tan inspired by
                                                  the mascot's hair;
                                                  secondary accent

  `brand-butter`          `#F6C56F`               Small cheerful
                                                  highlights, stars, and
                                                  limited decorative
                                                  accents

  `brand-sage`            `#82975C`               Leaf details,
                                                  nature-inspired
                                                  accents, and secondary
                                                  tags

  `brand-sage-light`      `#E8EEDB`               Muted green section
                                                  backgrounds and soft
                                                  success surfaces

  `brand-border`          `#E9D8C8`               Card borders, dividers,
                                                  and input outlines

  `brand-muted`           `#9B8575`               Muted metadata and
                                                  placeholder text;
                                                  verify contrast before
                                                  use

  `brand-white`           `#FFFFFF`               High-contrast surfaces
                                                  and image backgrounds
  -----------------------------------------------------------------------

## 3. Recommended semantic tokens

Use semantic names in UI code instead of scattering raw hex values
across components.

``` css
:root {
  --color-bg: #FFF8EF;
  --color-surface: #FFFCF7;
  --color-surface-soft: #F9D8C8;

  --color-primary: #C95F50;
  --color-primary-hover: #AD4D41;
  --color-primary-soft: #F9D8C8;

  --color-text: #593522;
  --color-text-secondary: #81563E;
  --color-text-muted: #9B8575;

  --color-border: #E9D8C8;
  --color-accent-yarn: #D7A17A;
  --color-accent-butter: #F6C56F;
  --color-accent-sage: #82975C;
  --color-success-soft: #E8EEDB;

  --color-focus: #81563E;
}
```

For Tailwind CSS, map these tokens into the project's theme
configuration or CSS theme variables, then use consistent semantic
utility names throughout the application.

## 4. Color usage rules

A practical starting balance:

-   **70% warm neutrals:** cream, paper, and white for backgrounds and
    breathing room.
-   **20% browns and borders:** readable typography, outlines,
    navigation, and structure.
-   **10% pastel accents:** coral, peach, sage, and butter for actions
    and decoration.

### Primary actions

-   Use `brand-coral-dark` for important buttons with `brand-white`
    text.
-   Use `brand-brown` for high-emphasis text and icons.
-   Hover states should become slightly darker, not brighter or more
    saturated.
-   Keep one visually dominant action per section where possible.

### Backgrounds and cards

-   Use `brand-cream` as the default page background.
-   Use `brand-paper` for product cards, dropdowns, dialogs, and
    checkout panels.
-   Use `brand-peach` and `brand-sage-light` sparingly for alternating
    sections, callouts, and category areas.
-   Prefer a subtle `brand-border` outline over heavy shadows.

### Decorative colors

-   Coral is the signature accent and should lead the palette.
-   Sage should mostly appear in small details, tags, or nature-related
    content.
-   Butter yellow is for small highlights only; do not use it for long
    text or large primary buttons.
-   Keep the mascot's colors consistent across the website, social
    graphics, packaging, and order messages.

## 5. Typography

Use a friendly display face paired with a highly readable sans-serif.

**Suggested pairing** - **Headings:** `Nunito` --- rounded,
approachable, and friendly. - **Body/UI:** `Inter` --- clean and
readable for product information, forms, prices, and checkout. -
**Optional decorative accent:** a restrained handwritten font for short
labels or packaging-style messages only. Never use it for body text or
essential instructions.

Example CSS:

``` css
:root {
  --font-heading: "Nunito", sans-serif;
  --font-body: "Inter", sans-serif;
}

body {
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  color: var(--color-text);
}
```

Use sentence case for headings and buttons. Keep prices, shipping
details, policies, and checkout labels especially clear.

## 6. Shape, spacing, and layout

-   **Corners:** 12--16px for cards and inputs; 999px pills only for
    small chips and tags.
-   **Buttons:** rounded 12px corners, clear labels, and comfortable
    touch targets.
-   **Cards:** thin warm borders, very light shadows if needed, and
    consistent internal padding.
-   **Spacing:** use a consistent 4px or 8px spacing scale. Give product
    photography and headings room to breathe.
-   **Layout:** clean grid, generous whitespace, clear hierarchy, and
    responsive layouts that work well on mobile.
-   **Borders:** use warm brown for the mascot illustration; use lighter
    `brand-border` for website containers.

Avoid excessive rounded blobs, too many floating decorations, thick
shadows, glassmorphism, neon gradients, or a different pastel color for
every component.

## 7. Components and interaction states

  -----------------------------------------------------------------------
  Component               Default style           Interaction guidance
  ----------------------- ----------------------- -----------------------
  Primary button          Coral-dark background,  Darken on hover; show a
                          white text              clear focus ring

  Secondary button        Paper background, brown Soft peach hover
                          text, warm border       background

  Text link               Coral-dark text         Underline on hover and
                                                  preserve visible focus

  Product card            Paper surface, warm     Gentle border/shadow
                          border                  change; avoid large
                                                  movement

  Input/select            Paper surface, warm     Stronger brown outline
                          border, brown text      on focus

  Badge/tag               Peach or sage-light     Brown text; use coral
                          background              for important status
                                                  only

  Navigation              Cream/paper surface,    Coral accent for active
                          brown text              item

  Success message         Sage-light background,  Pair color with an icon
                          dark brown text         and clear wording

  Error message           Pale coral background,  Pair color with an icon
                          dark brown text         and a specific
                                                  explanation
  -----------------------------------------------------------------------

## 8. Photography and illustration

-   Use bright, soft natural lighting and warm neutral backgrounds for
    handmade products.
-   Show texture and craftsmanship clearly; do not apply heavy color
    filters that distort product colors.
-   Keep product photography larger and more prominent than decorative
    graphics.
-   Use the mascot as a brand signature in the About section, order
    confirmation, thank-you pages, packaging, and occasional empty
    states.
-   Keep the mascot's brown hair, coral flower, cream floral clothing,
    and warm outlines consistent.
-   For small icons, prefer simple rounded line icons with consistent
    stroke widths.
-   Do not place text or UI elements over busy parts of the mascot
    illustration.

## 9. Accessibility and contrast

-   Use `brand-brown` (`#593522`) for most body text on cream or paper
    backgrounds.
-   Use `brand-white` text on `brand-coral-dark` (`#C95F50`) for primary
    buttons; verify contrast for the final font size and weight.
-   Do not use `brand-coral`, `brand-butter`, or `brand-sage` as small
    body text on light backgrounds without checking contrast.
-   Never communicate success, errors, stock status, or selection using
    color alone. Add text, icons, or other visual cues.
-   Provide visible keyboard focus states and ensure buttons and
    controls are comfortably tappable on mobile.
-   Check all final color combinations against WCAG contrast
    requirements, especially small text and disabled states.

## 10. Do / Don't

### Do

-   Keep the experience warm, handmade, calm, and easy to shop.
-   Reuse the same semantic colors across pages and components.
-   Use coral for meaningful actions and brown for strong contrast.
-   Keep product images and product details easy to scan.
-   Use decorative flowers, hearts, and yarn-inspired details in
    moderation.

### Don't

-   Use pure black as the default text color; prefer `brand-brown`.
-   Make every section coral or peach.
-   Use handwritten fonts for navigation, long descriptions, or
    checkout.
-   add excessive gradients, glossy effects, or strong drop shadows.
-   Change the mascot's core colors from page to page.

## 11. Brand implementation checklist

-   [ ] Add the palette as shared design tokens.
-   [ ] Define semantic colors for backgrounds, text, borders, actions,
    and states.
-   [ ] Create primary, secondary, outline, and text button variants.
-   [ ] Standardize card, input, badge, and dialog styles.
-   [ ] Load and apply the selected heading and body fonts.
-   [ ] Test responsive layouts on mobile and desktop.
-   [ ] Verify contrast and keyboard focus states.
-   [ ] Check the website against the mascot and packaging artwork
    before launch.

------------------------------------------------------------------------

**Brand summary:** warm cream + cocoa brown + signature coral, supported
by yarn tan, butter yellow, and sage green. Keep the interface clean and
modern, and let the handmade mascot supply the charm.
