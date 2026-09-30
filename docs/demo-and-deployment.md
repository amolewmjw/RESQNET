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

## GitHub Pages deployment (completed)

Deployed and verified live at <https://amolewmjw.github.io/RESQNET/>, published from the
repository root via Settings → Pages → Deploy from a branch → `/(root)`. No custom build
command required — relative asset paths and the `.nojekyll` marker support this directly.

Confirmed working on the live URL: scripts and styles load, Start Simulation runs the full
scenario, road controls and playback function, and Verify Log behaves correctly, including
the deliberate-corruption demonstration.

**Still pending from the team:** the final recording and screenshots (see `media/README.md`),
and adding the verified live link and video link to the submission PPT.

**If redeploying after a future code change:** extract the updated package so `index.html`
sits at the repository root (not nested), run `npm test` and smoke-test locally first,
commit and push to the deployed branch, then re-verify the live URL in a fresh browser
before treating the redeploy as complete.

Official publishing instructions:
<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>