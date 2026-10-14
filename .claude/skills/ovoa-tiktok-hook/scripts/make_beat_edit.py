#!/usr/bin/env python3
"""Deterministic beat-synced motion edit from the band cutouts: renders assets/beat/index.html frame by frame
(Playwright + system Chrome), synthesizes a 120 bpm track, and muxes to mp4.
    python make_beat_edit.py "C:/OVOA ADS OUTPUT/BeatEdit.mp4"
"""
import sys, json, subprocess, shutil, tempfile, wave
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parents[1] / "assets" / "beat"
FPS, BPM, BEATS = 30, 120, 28
B = 60 / BPM
DUR = BEATS * B


def green_centroid(p):
    a = np.asarray(Image.open(p).convert("RGBA")).astype(int)
    m = (a[..., 3] > 200) & (a[..., 1] > 170) & (a[..., 0] < 150) & (a[..., 2] < 170) & (a[..., 1] - a[..., 0] > 70)
    ys, xs = np.nonzero(m)
    if len(xs):
        return {"x": float(xs.mean()), "y": float(ys.mean()), "n": int(m.sum())}
    return {"x": a.shape[1] / 2, "y": a.shape[0] / 2, "n": 0}


def synth(path):
    sr = 44100
    n = int(DUR * sr) + sr
    out = np.zeros(n)

    def add(sig, at):
        i = int(at * sr)
        j = min(n, i + len(sig))
        if i < n:
            out[i:j] += sig[:j - i]

    def kick():
        d = np.arange(int(.35 * sr)) / sr
        f = 50 + 120 * np.exp(-d * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-d * 9)

    def clap():
        d = np.arange(int(.2 * sr)) / sr
        return .45 * np.random.default_rng(1).standard_normal(len(d)) * np.exp(-d * 22)

    def hat(g=.12):
        d = np.arange(int(.05 * sr)) / sr
        x = np.diff(np.random.default_rng(2).standard_normal(len(d)), prepend=0)
        return g * x * np.exp(-d * 90)

    def bass(freq, dur):
        d = np.arange(int(dur * sr)) / sr
        return .42 * np.tanh(2.2 * np.sin(2 * np.pi * freq * d)) * np.exp(-d * 3.2)

    def pluck(freq):
        d = np.arange(int(.28 * sr)) / sr
        s = sum(np.sin(2 * np.pi * freq * k * d) / k for k in (1, 2, 3))
        return .16 * s * np.exp(-d * 9)

    for b in range(2, BEATS):
        at = b * B
        if not (6 <= b < 8 and b % 2 == 1):
            add(kick(), at)
        if b >= 4 and b % 2 == 1:
            add(clap(), at)
        if b >= 8:
            add(hat(), at + B / 2)
        if b >= 16:
            add(hat(.08), at + B / 4)
            add(hat(.08), at + 3 * B / 4)
        root = [55, 55, 65.41, 49][(b // 4) % 4]
        if b >= 4:
            add(bass(root, B * .9), at + B / 2)
        if b >= 12:
            arp = [1, 1.5, 2, 3, 2, 1.5, 2, 1.5]
            for k in range(2):
                add(pluck(root * 4 * arp[(b * 2 + k) % 8]), at + k * B / 2)
    r = int(2 * B * sr)
    d = np.arange(r) / sr
    noise = np.random.default_rng(3).standard_normal(r) * (d / (2 * B)) ** 2 * .35
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * (d / (2 * B)) ** 2) / sr) * (d / (2 * B)) * .18
    out[:r] += noise + sweep
    for at in (2 * B, 24 * B):
        d = np.arange(int(1.4 * sr)) / sr
        add(.8 * np.sin(2 * np.pi * 42 * d) * np.exp(-d * 2.6) + .25 * np.random.default_rng(4).standard_normal(len(d)) * np.exp(-d * 6), at)
    out = out[:int(DUR * sr)]
    fade = int(.5 * sr)
    out[-fade:] *= np.linspace(1, 0, fade)
    out = np.tanh(out * 1.1)
    out /= np.abs(out).max() * 1.05
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((out * 32767).astype("<i2").tobytes())


def main():
    out = Path(sys.argv[1])
    cfg = {"b1": green_centroid(HERE / "b1.png"), "back": green_centroid(HERE / "b2_back.png")}
    print("green", cfg)
    (HERE / "config.js").write_text("const CFG=" + json.dumps(cfg) + ";")
    tmp = Path(tempfile.mkdtemp())
    synth(tmp / "a.wav")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        br = p.chromium.launch(channel="chrome")
        pg = br.new_page(viewport={"width": 720, "height": 1280})
        pg.goto((HERE / "index.html").as_uri())
        pg.wait_for_function("window.ready && window.ready()")
        for i in range(int(DUR * FPS)):
            pg.evaluate("render(%s)" % (i / FPS))
            pg.locator("#c").screenshot(path=str(tmp / ("f_%04d.jpg" % i)), type="jpeg", quality=93)
        br.close()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", str(tmp / "f_%04d.jpg"), "-i", str(tmp / "a.wav"),
                    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", str(out)], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print("wrote", out, "%.1fs" % DUR)


if __name__ == "__main__":
    main()
