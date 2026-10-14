#!/usr/bin/env python3
"""Record an HTML page (480x854) to mp4 with Playwright + system Chrome. Stops when document.title == 'done'.
    python record_html.py page.html out.mp4"""
import sys, shutil, subprocess, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright

page_path, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
tmp = Path(tempfile.mkdtemp())
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    ctx = b.new_context(viewport={"width": 480, "height": 854}, record_video_dir=str(tmp), record_video_size={"width": 480, "height": 854})
    pg = ctx.new_page(); pg.goto(page_path.as_uri())
    pg.wait_for_function("document.title==='done'", timeout=60000)
    time.sleep(0.3); ctx.close(); b.close()
webm = next(tmp.glob("*.webm"))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(webm), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-c:a", "aac", "-shortest", str(out)], check=True)
shutil.rmtree(tmp, ignore_errors=True); print("wrote", out)
