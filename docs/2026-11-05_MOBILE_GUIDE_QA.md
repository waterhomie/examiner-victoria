# Mobile guide repair

## Root cause and scope

- At mobile widths the desktop Sound control is hidden, but the tour previously still measured and waited for that hidden element.
- The topbar overlay did not inherit the rounded mobile card shape.
- The mobile sound step now opens More and highlights its Sound control. Desktop keeps its existing target and wording.
- The tour closes menus it opened when leaving the step, including Back, Skip and Finish. A missing or zero-size target exposes a continuation rather than waiting for an impossible click.
- Mobile mode wording refers to the highlighted option, not the hidden Mode label.
- No provider, prompt, scoring or answer-flow changes.

## Automated browser verification

`frontend/guide_browser_test.mjs` serves real header, stage, composer and guide components with fixture session rebuilds. No paid API is used. It requires Playwright and installed Chrome; set PLAYWRIGHT_MODULE_PATH to the Playwright index.mjs path if it is not locally installed.

- Chrome headless: 1440px desktop, 390px and 320px mobile viewports; mobile cases enable touch emulation.
- Practice and Mock; Part 1, Part 2, Part 3; Full path without a topic step.
- Mode/part selection, Sound interaction, Back, Finish, replay, Skip, and menu/overlay cleanup.
- Frontend smoke suite and production build passed.
- Mobile sound-step screenshot inspected: highlighted Sound and navigation controls visible, rounded mask present.

## Remaining release check

This is component-browser verification, not real iPhone WeChat verification or an end-to-end paid backend test. On the deployed build, verify More > Show guide in iPhone WeChat, complete the Sound step and Finish, then confirm normal typing/recording still works. Desktop should complete the same guide once before sharing the link.
