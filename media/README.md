# Add the final demonstration media

Suggested paths (add actual files; none are fabricated or included yet):

- `demo.mp4` — final screen-recorded demonstration.
- `screenshots/overview.png` — complete workspace.
- `screenshots/live-reroute.png` — reroute and its decision entry.
- `screenshots/verify-log.png` — intact chain or detailed mismatch.
- `screenshots/completion.png` — completed response and summary.

After adding those files, add these lines to the root README as appropriate:

```md
[Watch the recorded demonstration](media/demo.mp4)
![RESQNET simulation](media/screenshots/overview.png)
```

For the PPT, after GitHub Pages deployment, the direct video address follows:
`https://<username>.github.io/<repository>/media/demo.mp4`
This is a template, not an existing verified URL. Use the actual Pages base URL shown by GitHub, append `media/demo.mp4`, and test it in a fresh browser before adding it to the PPT.

Prefer an MP4 encoded with H.264 (and AAC if audio is included) for broad browser playback.
Keep a reasonably compressed final recording: GitHub's browser upload limit is 25 MiB;
regular Git pushes warn above 50 MiB and block files above 100 MiB. Larger recordings can
be uploaded as a GitHub Release asset instead; use that asset's actual download URL in
the PPT (it may download rather than play inline). Do not claim a video URL works before testing it.

Source: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
