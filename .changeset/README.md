# Changesets

This folder drives Jelly's versioning and changelog. Only the **`desktop`** app
is versioned here — its version is the release/auto-update version (the internal
`@jelly/*` packages are ignored, see `config.json`).

To record a change, run:

```bash
bun run changeset
```

Pick **`desktop`**, choose a bump (patch/minor/major), and write a user-facing
line. Commit the generated `.changeset/*.md` file with your PR. On merge to
`main`, CI opens a "Version Packages" PR; merging that tags the release and
builds it.

See [Changesets docs](https://github.com/changesets/changesets) for details.
