# README template

A reusable shape for the `README.md` of a portfolio project. Copy it into a
repo, fill each section, delete this preamble. Target reader: someone with ~2
minutes who should come away knowing **what it is**, **whether it runs**, and
**one interesting decision** behind it.

Keep it short. Detail that only matters while working in the repo belongs in
`docs/` or `CLAUDE.md`, not here.

---

## &lt;Project name&gt;

`[![CI](<workflow badge url>)](<workflow url>)`

One or two sentences — the problem it solves and who for. Not a feature list.

**Live:** &lt;url&gt; &nbsp;·&nbsp; a screenshot or short GIF right under the intro.

### What it does

3–6 bullets of user-facing capability, most important first.

### Architecture

- Package / monorepo layout in one line.
- Each package: framework + its role.
- Data store and external services.
- Anything a reader can't guess: the auth model, background jobs, a custom
  parser, an unusual data flow.

### Running it

Prerequisites, then the shortest path to a running app (`install`, `start`).
Then the lint / type-check / test / build commands.

### CI/CD

Which workflow runs what, and where it deploys.

### Decisions

3–5 bullets, each a choice and its trade-off ("X instead of Y, because … ; the
cost is …"). This is the section that separates a portfolio repo from a
tutorial — write it last, from what you actually remember arguing with yourself
about.

### Licence

One line + link to `LICENSE`.
