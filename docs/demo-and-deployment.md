# Demo and deployment

## Local rehearsal

Run `npm start`, open <http://localhost:8080> and press Start Simulation. Normal 1x is the
approved default. Pause to explain a hospital decision. Click an upcoming road twice
to fully block it and show the reroute entry. Clear roads to demonstrate recovery.
On completion, point out delivered, under-resourced, elapsed time and delivery trips.
Verify Log should confirm an intact chain.

For the deliberate-tampering demonstration, open <http://localhost:8080/#audit-dev>,
start a run, expand Demo tools and click Corrupt entry 2. Verify Log then shows the
entry number, recorded hash and recomputed hash. Reload starts a fresh session.

## GitHub upload and Pages (perform when ready)

1. Extract this package. Put its contents at the intended repository root: `index.html`
   must sit beside `README.md`, `assets`, `tests` and `docs`, not inside an extra nested folder.
2. If using the existing RESQNET repository, retain/back up earlier backend work on its
   existing branch or another branch before replacing the root. This package has not
   modified or pushed to that repository.
3. Run `npm test`; smoke-test locally. Commit the package and push to your intended branch.
4. In GitHub repository Settings → Pages, select Deploy from a branch, select that branch
   and `/(root)`, then Save. No custom build command is required.
5. Open the actual URL GitHub reports in a fresh browser. Check scripts/styles load, start,
   road controls, playback, completion and Verify Log. Also check narrower screens.
6. Add your final recording and screenshots using media/README.md. Verify the video URL.
7. Add the verified live site and video links to the README and submission PPT.

Relative asset paths support repository-subpath hosting. The `.nojekyll` marker accompanies
the static files. No automatic deployment workflow has been added or executed.

Official publishing instructions:
<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>
