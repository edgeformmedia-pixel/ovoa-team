#!/usr/bin/env python3
"""Generate a library of short, clean, effect-free product clips (Seedance 2.5, 480p, no audio) to cut up by hand.
    python make_library.py [name ...]      # no names = all clips
Output: C:/OVOA ADS OUTPUT/Library/<name>.mp4 (one 4 s clip each, ~$0.41). Re-running resumes finished jobs.
"""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
OUT = Path("C:/OVOA ADS OUTPUT/Library")
WORK = Path("C:/tmp/ovoa-library")

BASE = (
    "Vertical 9:16, 4 seconds, one single continuous shot, no cuts, smooth, clean, high-end 3D product render look, "
    "sharp focus, soft even studio lighting, no glow effects, no particles, no lens flares, no light trails, no color grading, "
    "no neon, no text, no letters, no logos, no watermarks, no people's faces. The attached reference images show the product: "
    "a black wristband made of diamond-pattern woven fabric with a small sensor module on the inside, one small side button, "
    "and a hook-and-loop strap. Keep this exact band, same black textured weave, no screen, no extra buttons. "
    "The sensor lights stay off or dim, never glowing. "
)

CLIPS = {
    "white_turntable": "Seamless pure white studio background and a soft floor shadow. The band stands upright at the center and does one smooth, even 360-degree turntable spin, camera fixed, full band in frame.",
    "white_macro_weave": "Seamless pure white studio background. Extreme macro of the diamond weave of the band, the camera slowly slides sideways along the fabric with shallow depth of field, fibers crisp.",
    "white_orbit": "Seamless pure white studio background. The band floats upright at the center while the camera makes a smooth slow half-orbit around it at eye level.",
    "black_turntable": "Seamless pure black studio background with a subtle glossy floor reflection and soft white rim light. The band does one smooth even 360-degree turntable spin at the center, camera fixed.",
    "black_macro_sensor": "Seamless pure black background, soft white rim light. Macro of the inside of the band, the sensor module and its lens windows, camera slowly pushes in, the sensor lights stay dark.",
    "gray_flip": "Seamless medium gray studio background with a soft shadow. The band floats at the center and slowly rotates to flip from showing its outside weave to showing its inside sensor module, camera fixed.",
    "gray_button_press": "Seamless medium gray studio background. Close-up of the band's side button, a fingertip enters from the side and presses the button once, the band barely moves. No glow, no effects.",
    "greenscreen_spin": "Flat, even, solid chroma-key green screen background (pure bright green, no shadows or gradients on the screen). The band floats at the center and does one smooth 360-degree spin, camera fixed, evenly lit, clean edges for keying.",
    "greenscreen_wrist_turn": "Flat, even, solid chroma-key green screen background (pure bright green, no gradients). A forearm and hand wearing the band, the wrist slowly rotates palm up to palm down, camera fixed, evenly lit, clean edges for keying, no face.",
    "white_wrist_pushin": "Seamless pure white studio background. A bare forearm wearing the band is held still, the camera does a smooth slow push-in toward the band on the wrist, no face.",
}


def run(name):
    prompt = WORK / (name + ".txt")
    WORK.mkdir(parents=True, exist_ok=True)
    prompt.write_text(BASE + CLIPS[name], encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, str(SKILL / "scripts" / "make_video.py"), "--hook-url", "none", "--hook-end", "1", "--no-hook",
           "--no-audio", "--duration", "4", "--prompt-file", str(prompt), "--refs", str(SKILL / "assets" / "refs"),
           "--out", str(OUT / (name + ".mp4")), "--workdir", str(WORK / name)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    ok = r.returncode == 0
    print(("OK   " if ok else "FAIL ") + name + ("" if ok else " :: " + (r.stderr or r.stdout)[-300:]), flush=True)
    return ok


if __name__ == "__main__":
    names = sys.argv[1:] or list(CLIPS)
    with ThreadPoolExecutor(max_workers=5) as ex:
        res = list(ex.map(run, names))
    print("done", sum(res), "/", len(res))
