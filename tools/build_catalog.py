#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scans your saree photo folder, picks every file whose name starts with
A / B / C / D + number (A28.jpg, B23 (2).png, C7-front.jpeg ...), optimises
the photos for the web, rebuilds products.json and (optionally) pushes to GitHub.

Usage (from the repo folder):
    python tools/build_catalog.py            # build only
    python tools/build_catalog.py --push     # build + git commit + git push
    python tools/build_catalog.py --src "D:\\Other Folder"
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is missing. Run:  python -m pip install pillow")

try:  # optional: iPhone .heic support
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass

DEFAULT_SRC = r"D:\For website\D1 জামদানি"
REPO = Path(__file__).resolve().parent.parent
IMG_FULL = REPO / "images" / "full"
IMG_THUMB = REPO / "images" / "thumb"
PRODUCTS = REPO / "products.json"
CACHE = REPO / "tools" / "cache.json"

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".heic"}
CODE_RE = re.compile(r"^\s*([A-Da-d])[\s_-]*(\d{1,4})(?!\d)")
FULL_MAX, THUMB_MAX = 1400, 600

DEFAULT_CATEGORIES = {"A": "A সিরিজ", "B": "B সিরিজ", "C": "C সিরিজ", "D": "D সিরিজ"}


def natural_key(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def scan(src):
    groups = {}
    for f in sorted(src.rglob("*"), key=lambda p: natural_key(p.stem)):
        if not f.is_file() or f.suffix.lower() not in EXTS:
            continue
        m = CODE_RE.match(f.stem)
        if not m:
            continue
        code = m.group(1).upper() + m.group(2)
        groups.setdefault(code, []).append(f)
    return groups


def sort_code(code):
    return (code[0], int(code[1:]))


def save_webp(im, path, max_side, quality):
    c = im.copy()
    c.thumbnail((max_side, max_side), Image.LANCZOS)
    c.save(path, "WEBP", quality=quality, method=6)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC, help="folder with A..D photos")
    ap.add_argument("--push", action="store_true", help="git add/commit/push after building")
    args = ap.parse_args()

    src = Path(args.src)
    if not src.is_dir():
        sys.exit(f"Source folder not found: {src}\nUse  --src \"<folder>\"")

    IMG_FULL.mkdir(parents=True, exist_ok=True)
    IMG_THUMB.mkdir(parents=True, exist_ok=True)

    groups = scan(src)
    if not groups:
        sys.exit("No files starting with A-D + number found (example: A28.jpg).")

    old = {}
    categories = dict(DEFAULT_CATEGORIES)
    if PRODUCTS.exists():
        data = json.loads(PRODUCTS.read_text(encoding="utf-8"))
        categories.update(data.get("categories", {}))
        old = {p["code"]: p for p in data.get("products", [])}
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    products, keep, done, skipped = [], set(), 0, 0
    for code in sorted(groups, key=sort_code):
        names = []
        for n, f in enumerate(groups[code], 1):
            out = f"{code}-{n}.webp"
            keep.add(out)
            st = f.stat()
            sig = f"{f.name}|{st.st_size}|{int(st.st_mtime)}"
            if cache.get(out) == sig and (IMG_FULL / out).exists() and (IMG_THUMB / out).exists():
                skipped += 1
            else:
                try:
                    with Image.open(f) as im:
                        im = ImageOps.exif_transpose(im).convert("RGB")
                        save_webp(im, IMG_FULL / out, FULL_MAX, 82)
                        save_webp(im, IMG_THUMB / out, THUMB_MAX, 78)
                    cache[out] = sig
                    done += 1
                    print(f"  converted {f.name} -> {out}")
                except Exception as e:
                    print(f"  SKIPPED {f.name}: {e}")
                    continue
            names.append(out)
        if not names:
            continue
        prev = old.get(code, {})
        products.append({
            "code": code,
            "category": code[0],
            "name": prev.get("name", "জামদানি শাড়ি"),
            "tagline": prev.get("tagline", "প্রিমিয়াম কোয়ালিটি"),
            "price": prev.get("price", ""),
            "soldOut": prev.get("soldOut", False),
            "images": names,
        })

    # remove images that no longer have a source file
    for d in (IMG_FULL, IMG_THUMB):
        for f in d.glob("*.webp"):
            if f.name not in keep:
                f.unlink()
    cache = {k: v for k, v in cache.items() if k in keep}

    PRODUCTS.write_text(json.dumps({"categories": categories, "products": products},
                                   ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CACHE.write_text(json.dumps(cache, indent=1) + "\n", encoding="utf-8")
    print(f"\nDone: {len(products)} sarees, {done} photos converted, {skipped} unchanged.")

    if args.push:
        def git(*a, check=True):
            return subprocess.run(["git", *a], cwd=REPO, check=check)
        git("add", "-A")
        if subprocess.run(["git", "status", "--porcelain"], cwd=REPO, capture_output=True, text=True).stdout.strip():
            git("commit", "-m", "Update saree catalog")
            git("pull", "--rebase", check=False)
            git("push")
            print("Pushed. Site updates in ~1 minute: https://hmhashemali16.github.io/TatiBari/")
        else:
            print("Nothing new to push.")


if __name__ == "__main__":
    main()
