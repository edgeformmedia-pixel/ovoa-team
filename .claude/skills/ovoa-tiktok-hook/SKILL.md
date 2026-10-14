---
name: ovoa-tiktok-hook
description: Make an OVOA TikTok by clipping a borrowed hook from a TikTok URL, generating the OVOA piece with Seedance 2.5 on OpenRouter (with the band reference images), and stitching them into one vertical mp4. Use when the user shares a TikTok to use as a hook, or asks for an OVOA-style video with a clipped hook.
---

# OVOA hook + generated piece

Pipeline (all in `scripts/make_video.py`, one command):

1. **Clip the hook**: yt-dlp downloads the TikTok (needs `--impersonate chrome`, `curl_cffi` installed), ffmpeg trims `--hook-start` to `--hook-end`.
2. **Generate the piece**: POST `bytedance/seedance-2.5` to OpenRouter `/api/v1/videos` (9:16, 720p, audio on) with `assets/prompt.txt` and the band crops in `assets/refs/` as `input_references`, then poll and download `/content`. The job id is saved in the workdir, so a retry resumes instead of paying twice.
3. **Join**: both pieces are normalized to 720x1280, 30 fps, AAC audio, then concatenated.

**Every finished video goes in `C:\OVOA ADS OUTPUT\`** (user's rule). Work files stay in the temp workdir.

Key lives in `ovoa-team/.env` as `OPENROUTER_API_KEY` (gitignored). Never print it.

## Run

```bash
python .claude/skills/ovoa-tiktok-hook/scripts/make_video.py \
  --hook-url "https://www.tiktok.com/@judysfamilycafe/video/7634615994123652366" \
  --hook-start 0 --hook-end 14.4 \
  --prompt-file .claude/skills/ovoa-tiktok-hook/assets/prompt.txt \
  --refs .claude/skills/ovoa-tiktok-hook/assets/refs \
  --out "C:/OVOA ADS OUTPUT/<name>.mp4" --workdir C:/tmp/ovoa-hook-video
```

`--no-hook` generates only the piece. `--duration` (4-30 s on Seedance 2.5) and `--resolution` (480p default, always use 480p) change cost: about $0.0000107 per video token, so a 5 s 720p clip with sound is roughly $1.

## Writing a new prompt (the creative rules)

- Copy the reference video's **structure, pacing and feeling**, never its props, outfit or set (no pancakes, same sunglasses, neon).
- Character: 20-year-old man, modern 2026 look. Product: the black woven band from the references.
- Say the brand as `ovo-uh` in speech, `OVOA` in any caption. Add the pronunciation note ("oh-voh-uh", never "O-V-O-A").
- Look: low-quality phone TikTok, not a commercial. Start on a black frame when the hook ends in black.
- Videos max out at 30 s total.
- Review the result frame by frame before sending it.
