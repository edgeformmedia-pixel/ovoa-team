#!/usr/bin/env python3
"""Clip a hook from a TikTok, generate the OVOA piece on OpenRouter (Seedance), join them.

    python make_video.py --hook-url URL --hook-start 0 --hook-end 14.4 \
        --prompt-file assets/prompt.txt --refs assets/refs --out final.mp4

Needs: ffmpeg, yt-dlp (+ curl_cffi for TikTok), OPENROUTER_API_KEY in ovoa-team/.env.
Re-running with the same --workdir reuses the downloaded hook and the submitted job, so a retry never pays twice.
"""
import argparse, base64, json, mimetypes, os, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path

API = "https://openrouter.ai/api/v1"
ROOT = Path(__file__).resolve().parents[4]  # ovoa-team


def load_key():
    key = os.environ.get("OPENROUTER_API_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        sys.exit("OPENROUTER_API_KEY missing: put it in ovoa-team/.env")
    return key


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"command failed: {' '.join(map(str, cmd))[:200]}\n{r.stderr[-1500:]}")
    return r.stdout


def api(key, path, body=None, raw=False):
    req = urllib.request.Request(API + path, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenRouter {e.code} on {path}: {e.read().decode()[:600]}")
    return data if raw else json.loads(data)


def has_audio(p):
    return bool(run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", str(p)]).strip())


def normalize(src, dst, w, h, start=None, end=None):
    """Same size/fps/audio on both pieces so they join cleanly (adds silent audio if a clip has none)."""
    cmd = ["ffmpeg", "-v", "error", "-y"]
    if start is not None: cmd += ["-ss", str(start)]
    if end is not None: cmd += ["-to", str(end)]
    cmd += ["-i", str(src)]
    silent = not has_audio(src)
    if silent: cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
    vf = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p"
    cmd += ["-vf", vf, "-map", "0:v:0", "-map", "1:a:0" if silent else "0:a:0", "-c:v", "libx264", "-crf", "18",
            "-c:a", "aac", "-ar", "48000", "-ac", "2"] + (["-shortest"] if silent else []) + [str(dst)]
    run(cmd)


def add_captions(src, dst, caps, w, h):
    """Glowing yellow caption overlays: caps = [{"text","start","end"}] in seconds from the start of src."""
    font = r"C\:/Windows/Fonts/impact.ttf"
    parts = []
    for c in caps:
        t = c["text"].replace("'", "").replace(":", r"\:")
        en = f"between(t,{c['start']},{c['end']})"
        if c.get("style") == "white":  # reel-style plain caption: bold white, black outline, lower middle
            wf = r"C\:/Windows/Fonts/arialbd.ttf"
            parts.append(f"drawtext=fontfile='{wf}':text='{t}':fontsize={int(w*c.get('size',0.062))}:x=(w-text_w)/2:y=h*0.62:"
                         f"fontcolor=white:borderw=4:bordercolor=black@0.9:enable='{en}'")
            continue
        common = f"fontfile='{font}':text='{t}':fontsize={int(w*c.get('size',0.17))}:x=(w-text_w)/2:y=h*{c.get('y',0.16)}:enable='{en}'"
        parts.append(f"drawtext={common}:fontcolor=0xFFC400@0.35:borderw=16:bordercolor=0xFFC400@0.30")
        parts.append(f"drawtext={common}:fontcolor=0xFFE600:borderw=2:bordercolor=0xB88A00")
    run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", ",".join(parts), "-c:v", "libx264", "-crf", "18",
         "-c:a", "copy", str(dst)])


def fetch_hook(url, wd):
    out = wd / "hook_full.mp4"
    if not out.exists():
        run([sys.executable, "-m", "yt_dlp", "--impersonate", "chrome", "-o", str(wd / "hook_full.%(ext)s"), url])
    return out


def data_url(p):
    try:  # Seedance rejects images under 300px: upscale small ones
        from PIL import Image
        im = Image.open(p)
        if min(im.size) < 400:
            k = 400 / min(im.size)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            import io
            buf = io.BytesIO(); im.save(buf, "PNG")
            return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        pass
    mime = mimetypes.guess_type(str(p))[0] or "image/png"
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()


def generate(key, a, wd):
    jobf = wd / "job.json"
    clip = wd / "generated_raw.mp4"
    if clip.exists():
        return clip
    if jobf.exists():
        job = json.loads(jobf.read_text())
        print("reusing submitted job", job["id"])
    else:
        body = {"model": a.model, "prompt": Path(a.prompt_file).read_text(), "duration": a.duration,
                "resolution": a.resolution, "aspect_ratio": "9:16", "generate_audio": not a.no_audio}
        refs = sorted(Path(a.refs).glob("*.png")) if a.refs else []
        if refs:
            body["input_references"] = [{"type": "image_url", "image_url": {"url": data_url(p)}} for p in refs]
        job = api(key, "/videos", body)
        jobf.write_text(json.dumps(job))
        print("submitted job", job["id"], "status", job.get("status"))
    t0 = time.time()
    while True:
        st = api(key, f"/videos/{job['id']}")
        s = st.get("status")
        print(f"  [{int(time.time()-t0)}s] {s}", flush=True)
        if s == "completed": break
        if s in ("failed", "cancelled", "expired"):
            sys.exit(f"generation {s}: {json.dumps(st)[:800]}")
        time.sleep(10)
        if time.time() - t0 > 1500: sys.exit("timed out waiting; re-run to resume the same job")
    clip.write_bytes(api(key, f"/videos/{job['id']}/content?index=0", raw=True))
    (wd / "job_status.json").write_text(json.dumps(st, indent=1))
    return clip


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hook-url", required=True)
    ap.add_argument("--hook-start", type=float, default=0)
    ap.add_argument("--hook-end", type=float, required=True)
    ap.add_argument("--prompt-file", required=True)
    ap.add_argument("--refs", help="folder of reference images (png) for the product")
    ap.add_argument("--out", required=True)
    ap.add_argument("--workdir", default=str(Path(os.environ.get("TEMP", "/tmp")) / "ovoa-hook-video"))
    ap.add_argument("--model", default="bytedance/seedance-2.5")
    ap.add_argument("--duration", type=int, default=5)
    ap.add_argument("--resolution", default="480p")
    ap.add_argument("--captions", help="json file: [{text,start,end}] seconds into the generated piece")
    ap.add_argument("--no-audio", action="store_true", help="generate without sound")
    ap.add_argument("--no-hook", action="store_true", help="only generate the piece")
    a = ap.parse_args()

    key = load_key()
    wd = Path(a.workdir); wd.mkdir(parents=True, exist_ok=True)
    w, h = (720, 1280) if a.resolution == "720p" else (480, 854)

    gen_raw = generate(key, a, wd)
    gen = wd / "generated_norm.mp4"; normalize(gen_raw, gen, w, h)
    if a.captions:
        capped = wd / "generated_caps.mp4"
        add_captions(gen, capped, json.loads(Path(a.captions).read_text()), w, h)
        gen = capped
    if a.no_hook:
        Path(a.out).write_bytes(gen.read_bytes()); print("wrote", a.out); return
    hook_full = fetch_hook(a.hook_url, wd)
    hook = wd / "hook_norm.mp4"; normalize(hook_full, hook, w, h, a.hook_start, a.hook_end)
    run(["ffmpeg", "-v", "error", "-y", "-i", str(hook), "-i", str(gen), "-filter_complex",
         "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-movflags", "+faststart", a.out])
    print("wrote", a.out)


if __name__ == "__main__":
    main()
