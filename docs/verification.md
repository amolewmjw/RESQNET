# Verification record

## Approved baseline

Source: `RESQNET-phase6-polish-r1.zip`, accepted by the user after local tests of runtime
road blocking, speed changes and Verify Log. The exact baseline SHA-256 is retained in
`tests/baseline.json`. This does not claim that every viewport/zoom combination was tested.

## Structural refactor

The six original script bodies and stylesheet were extracted without changing their
contents. Their order and positions in the document remain unchanged. Tests load the
production external files, not an old duplicate inline implementation.

`structure.test.cjs` reconstructs the original document in memory and asserts its full
SHA-256 equals the baseline. It also verifies asset paths and script order. This covers
HTML content, style and code equivalence, but does not replace browser/network testing.

## Canonical suite

Run `npm test` or `node tests/run-tests.cjs` from the repository root.

| File in tests/ | Coverage |
| --- | --- |
| structure.test.cjs | External files, load order, exact baseline reconstruction |
| phase2.test.cjs | Data model and A* |
| phase3.test.cjs | Dispatch, reservation, delivery and reassignment |
| phase4.test.cjs | Animation and interpolation |
| phase45.test.cjs | Log/hash chain and constrained glyph layout |
| phase5.test.cjs | Live rerouting, mid-edge exception and unreachable routes |
| road-geometry.test.cjs | Full run/all graph edges, <=6 map-unit offsets and stable sides |
| jitter-forensics.test.cjs | Recorded/recomputed hash mismatch reporting |
| playback-status.test.cjs | Normal default, pause, equal chained logs across playback rates |
| phase6-ui.test.cjs | Idle/start, running, stuck/recovery, completion, verification handlers |
| phase4-collision.test.cjs | Compatibility alias for road-geometry; not an independent suite |

`docs/test-results.txt` contains actual output. The runner checks every manifest-listed
file, runs all suites and exits nonzero for any failure or checksum mismatch.

## Remaining release checks

A new automated browser run was not available in the build environment: Chromium's
download returned an invalid archive and cloud-browser policy blocked local-file access.
No new browser screenshots are claimed. The prior UI was accepted by the user; the
modular version still needs a fresh local smoke test and hosted-URL verification.

At 1366x768, 1920x1080, 390x844 and 125% desktop zoom, check idle, running, holding,
completion and forensic mismatch states. Desktop panels should align without unwanted
horizontal scrolling; narrow screens deliberately permit map panning for legibility.
Check missing assets in the browser console, and verify an intact and corrupted log.

## Future intentional edits

The baseline equivalence assertion intentionally protects this release from content
changes. A future approved behavior/style change needs a newly reviewed baseline, not
silent deletion of that assertion. `suite-manifest.json` describes this release's files;
update affected hashes after reviewing edits. Adding media files does not invalidate
existing manifest entries. Editing a manifest-listed README does require refreshing its hash.

## Packaging-time results

- 11 test files passed, 0 failed; 0 manifest integrity errors.
- The local server returned HTTP 200 with byte-identical contents for index.html,
  all six JavaScript files and styles.css (8/8 asset requests).
- A first request after starting the server in a separate tool session received
  connection refused. Running the server and HTTP checks in the same execution
  succeeded; no application change was needed.
