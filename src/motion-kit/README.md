# Motion kit (copy)

Unchanged copy of `animations/motion-kit.css` and `motion-kit.js` from tgopinath/portfolio-agent (commit 93a3602).
To update, copy both files over again. How the app uses it:

- `src/index.css` imports the CSS into Tailwind's `components` layer, so utility classes still win where both set
  the same property (for example a card's `transition`).
- `src/main.tsx` loads the JS; `src/shell/motion.tsx` has `useMotionKit()` (call after rendering, it is idempotent)
  and `<Words>` (word-by-word headings rendered by React, so the kit never rewrites React-owned text).
- `App.tsx` adds `mk-still` to `<html>` with the app's own Reduce motion setting.

Effects used in the shell: words, stagger, skeleton, press, nudge, drift, pop, float, scene lift (`mk-card`).
