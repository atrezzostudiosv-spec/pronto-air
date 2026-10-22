#!/usr/bin/env python3
"""Compare initial Home viewport in a real headless browser at 4 widths."""
import shutil
import subprocess
import tempfile
import time
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
from PIL import Image, ImageChops
import math

root=Path(__file__).resolve().parents[1]
before=root/".image-compare"/"before"
browser=shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium") or shutil.which("chromium-browser")
if not browser:
    raise SystemExit("Chrome/Chromium is unavailable: cannot complete browser verification.")

def serve(directory):
    handler=partial(SimpleHTTPRequestHandler,directory=str(directory))
    srv=ThreadingHTTPServer(("127.0.0.1",0),handler)
    srv.daemon_threads=True
    threading.Thread(target=srv.serve_forever,daemon=True).start()
    return srv

def screenshot(url,width,filename):
    cmd=[browser,"--headless=new","--no-sandbox","--disable-gpu",
         "--disable-extensions","--hide-scrollbars","--disable-dev-shm-usage",
         "--force-device-scale-factor=1",
         "--window-size="+str(width)+",900",
         "--virtual-time-budget=2500","--screenshot="+str(filename),url]
    p=subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=40)
    if p.returncode!=0 or not filename.exists():
        raise RuntimeError("Chrome failed: "+p.stderr.decode(errors="replace")[-600:])

a=serve(before)
b=serve(root)
try:
    with tempfile.TemporaryDirectory() as temp:
        for width in (375,768,1024,1440):
            old=Path(temp)/f"old-{width}.png"
            new=Path(temp)/f"new-{width}.png"
            screenshot(f"http://127.0.0.1:{a.server_port}/index.html",width,old)
            screenshot(f"http://127.0.0.1:{b.server_port}/index.html",width,new)
            with Image.open(old) as im1,Image.open(new) as im2:
                x=im1.convert("RGB");y=im2.convert("RGB")
                if x.size!=y.size:raise RuntimeError(f"{width} screenshot bounds changed")
                diff=ImageChops.difference(x,y)
                pixels=list(diff.resize((min(x.width,300),min(x.height,400))).getdata())
                fraction=sum(1 for v in pixels if max(v)>48)/len(pixels)
                print(f"{width}px: visually changed pixels >48 RGB delta: {fraction*100:.2f}%",flush=True)
                if fraction>0.18:
                    raise RuntimeError(f"{width}px: Visual appearance significantly changed ({fraction*100:.1f}%)")
    print("PASS: real Chromium viewport screenshot check at 375/768/1024/1440px",flush=True)
finally:
    a.shutdown();b.shutdown()
