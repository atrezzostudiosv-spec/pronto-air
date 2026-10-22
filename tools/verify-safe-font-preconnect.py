#!/usr/bin/env python3
"""Visual and structural regression test: approved main versus safe preconnect branch."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from PIL import Image, ImageChops
import subprocess, tempfile, threading, shutil, re

root=Path(__file__).resolve().parents[1]
baseline=root/".font-qa"/"baseline"
pages=["index.html","residential-cooling.html","residential-heating.html",
       "mobile-homes.html","light-commercial.html","contact-us.html",
       "service-agreement-faqs.html","privacy-policy.html"]
widths=(375,768,1024,1440)
needle='<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>'
chrome=next((p for p in ["google-chrome","google-chrome-stable","chromium","chromium-browser"] if shutil.which(p)),None)
if not chrome: raise SystemExit("Chromium not found. Visual QA cannot run.")
for name in pages:
    a=(baseline/name).read_text()
    b=(root/name).read_text()
    assert needle not in a
    assert b.replace("    "+needle+"\n","")==a or b.replace("\n    "+needle,"")==a, f"More than a preconnect change: {name}"
    assert '<meta name="robots" content="noindex, nofollow">' in b
    assert 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' in b
    assert 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap' in b
    assert b.count("<h1")==a.count("<h1")

def start(folder):
    handler=partial(SimpleHTTPRequestHandler,directory=str(folder))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    server.daemon_threads=True
    threading.Thread(target=server.serve_forever,daemon=True).start()
    return server

def capture(port,name,width,dest):
    command=[
        chrome,"--headless=new","--no-sandbox","--disable-gpu","--disable-extensions",
        "--hide-scrollbars","--disable-dev-shm-usage","--force-device-scale-factor=1",
        "--force-prefers-reduced-motion","--window-size="+str(width)+",900",
        "--virtual-time-budget=4000","--screenshot="+str(dest),
        f"http://127.0.0.1:{port}/{name}"
    ]
    p=subprocess.run(command,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=45)
    if p.returncode or not dest.exists():
        raise RuntimeError(f"Chrome capture failed: {name} {width} {p.stderr.decode(errors='replace')[-300:]}")

before=start(baseline)
after=start(root)
try:
    with tempfile.TemporaryDirectory() as d:
        for name in pages:
            for width in widths:
                a=Path(d)/"before.png"; b=Path(d)/"after.png"
                capture(before.server_port,name,width,a)
                capture(after.server_port,name,width,b)
                with Image.open(a) as ia,Image.open(b) as ib:
                    x=ia.convert("RGB");y=ib.convert("RGB")
                    if x.size!=y.size:raise RuntimeError(f"Screenshot resolution mismatch: {name} {width}")
                    diff=ImageChops.difference(x,y).resize((min(x.width,300),min(x.height,350)))
                    changed=sum(1 for pix in diff.getdata() if max(pix)>45)
                    fraction=changed/(diff.width*diff.height)
                    print(f"{name} {width}px visual difference: {fraction*100:.3f}%",flush=True)
                    if fraction>0.025:raise RuntimeError(f"STOP visual difference: {name} {width}px {fraction*100:.3f}%")
    print("PASS all 32 comparisons; icon/font CSS URLs and content unchanged.",flush=True)
finally:
    before.shutdown();after.shutdown()
