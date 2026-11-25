"""Convert Google Flow MP4/WebM/MOV clips in `_flow_raw/` into optimized WebP scroll sequences.

Usage:
    npm run flow:convert
    # or: python scripts/flow_to_sequence.py

Expected drop-in filenames inside `_flow_raw/`:
    - eclipse-arrive.mp4   (Hero opening: dark space -> monumental planet gliding in)
    - eclipse-shatter.mp4  (Planet magma cracks -> volcanic supernova -> 5 blazing meteors)
    - kaltim-atlas.mp4     (Nusantara Atlas East Kalimantan card visual)
    - eclipse-horizon.mp4  (Contact Finale Solar Eclipse Horizon backdrop)
"""

from __future__ import annotations

import shutil
from pathlib import Path
import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "_flow_raw"
OUT_ROOT = ROOT / "public" / "sequences"
MANIFEST_PATH = ROOT / "src" / "data" / "flowManifest.ts"

SLOT_CONFIGS = {
    "eclipse-arrive": {"max_width": 1280, "max_frames": 64, "quality": 80, "trim_end_frame": 184},
    "eclipse-shatter": {"max_width": 1280, "max_frames": 64, "quality": 80, "trim_end_frame": 124},
    "kaltim-atlas": {"max_width": 960, "max_frames": 72, "quality": 78, "trim_end_frame": None},
    "eclipse-horizon": {"max_width": 1280, "max_frames": 90, "quality": 80, "trim_end_frame": None},
}

VIDEO_EXTS = (".mp4", ".webm", ".mov", ".m4v")


def find_video_for_slot(slot: str) -> Path | None:
    if not RAW_DIR.exists():
        return None
    for ext in VIDEO_EXTS:
        cand = RAW_DIR / f"{slot}{ext}"
        if cand.exists():
            return cand
    return None


def convert_slot(
    slot: str,
    video_path: Path,
    max_width: int,
    max_frames: int,
    quality: int,
    trim_end_frame: int | None = None,
) -> dict:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    frames_rgb = []
    frame_idx = 0
    while True:
        if trim_end_frame is not None and frame_idx > trim_end_frame:
            break
        ok, frame = cap.read()
        if not ok:
            break
        frames_rgb.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        frame_idx += 1
    cap.release()

    total_frames = len(frames_rgb)
    if total_frames == 0:
        raise RuntimeError(f"No readable frames in {video_path}")
    count = min(max_frames, total_frames)
    indices = [round(i * (total_frames - 1) / max(1, count - 1)) for i in range(count)]
    sampled = [frames_rgb[idx] for idx in indices]

    out_dir = OUT_ROOT / slot
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    out_w, out_h = max_width, round(max_width * 9 / 16)
    total_bytes = 0

    for idx, rgb in enumerate(sampled, start=1):
        img = Image.fromarray(rgb)
        w, h = img.size
        if w > max_width:
            out_w = max_width
            out_h = round(h * (max_width / w))
            img = img.resize((out_w, out_h), Image.Resampling.LANCZOS)
        else:
            out_w, out_h = w, h
        dest = out_dir / f"frame_{idx:04d}.webp"
        img.save(dest, "WEBP", quality=quality, method=6)
        total_bytes += dest.stat().st_size

    mb = total_bytes / (1024 * 1024)
    print(f"[OK] {slot}: {len(sampled)} frames ({out_w}x{out_h}), total {mb:.2f} MB -> {out_dir}")
    return {
        "frameCount": len(sampled),
        "width": out_w,
        "height": out_h,
        "urlPattern": f"/sequences/{slot}/frame_{{i}}.webp",
    }


def write_manifest(entries: dict[str, dict]) -> None:
    lines = [
        "export type FlowSlotId =",
        '  | "eclipse-arrive"',
        '  | "eclipse-shatter"',
        '  | "kaltim-atlas"',
        '  | "eclipse-horizon";',
        "",
        "export type FlowSequenceSpec = {",
        "  /** Number of extracted WebP frames (0 means procedural fallback renders until converted) */",
        "  frameCount: number;",
        "  width: number;",
        "  height: number;",
        "  /** Public URL template with `{i}` replaced by 4-digit zero-padded 1-based frame index */",
        "  urlPattern: string;",
        "};",
        "",
        "/** Exact calibrated resting planet circle on 1280x720 Google Flow frames (normalized to video dimensions) */",
        "export const FLOW_PLANET_ANCHOR = {",
        "  cx: 0.7893,",
        "  cy: 0.5778,",
        "  rOfHeight: 0.4938,",
        "} as const;",
        "",
        "/** Exact calibrated blazing meteor head positions on the final pure-meteor shatter frame (normalized 1280x720) */",
        "export const FLOW_METEOR_ANCHORS: readonly { x: number; y: number }[] = [",
        "  { x: 0.37, y: 0.37 },",
        "  { x: 0.64, y: 0.43 },",
        "  { x: 0.16, y: 0.43 },",
        "  { x: 0.34, y: 0.69 },",
        "  { x: 0.66, y: 0.56 },",
        "] as const;",
        "",
        "export function computeFlowVideoRect(vw: number, vh: number, vidW = 1280, vidH = 720) {",
        "  const isCompact = vw < 900;",
        "  const scale = isCompact ? Math.min(vw / vidW, vh / vidH) : Math.max(vw / vidW, vh / vidH);",
        "  const dw = vidW * scale;",
        "  const dh = vidH * scale;",
        "  const dx = (vw - dw) * 0.5;",
        "  const dy = (vh - dh) * 0.5;",
        "  return { dx, dy, dw, dh, scale, isCompact };",
        "}",
        "",
        "export const FLOW_MANIFEST: Record<FlowSlotId, FlowSequenceSpec> = {",
    ]
    for slot, spec in entries.items():
        lines.extend(
            [
                f'  "{slot}": {{',
                f'    frameCount: {spec["frameCount"]},',
                f'    width: {spec["width"]},',
                f'    height: {spec["height"]},',
                f'    urlPattern: "{spec["urlPattern"]}",',
                "  },",
            ]
        )
    lines.append("};")
    lines.append("")
    MANIFEST_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"[MANIFEST] Updated {MANIFEST_PATH}")


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    entries: dict[str, dict] = {}
    found_any = False

    for slot, cfg in SLOT_CONFIGS.items():
        video = find_video_for_slot(slot)
        if video:
            found_any = True
            entries[slot] = convert_slot(
                slot,
                video,
                max_width=cfg["max_width"],
                max_frames=cfg["max_frames"],
                quality=cfg["quality"],
                trim_end_frame=cfg.get("trim_end_frame"),
            )
        else:
            existing_dir = OUT_ROOT / slot
            existing_frames = sorted(existing_dir.glob("frame_*.webp")) if existing_dir.exists() else []
            if existing_frames:
                with Image.open(existing_frames[0]) as sample_img:
                    w, h = sample_img.size
                entries[slot] = {
                    "frameCount": len(existing_frames),
                    "width": w,
                    "height": h,
                    "urlPattern": f"/sequences/{slot}/frame_{{i}}.webp",
                }
                print(f"[KEEP] {slot}: {len(existing_frames)} existing frames preserved")
            else:
                entries[slot] = {
                    "frameCount": 0,
                    "width": cfg["max_width"],
                    "height": round(cfg["max_width"] * 9 / 16),
                    "urlPattern": f"/sequences/{slot}/frame_{{i}}.webp",
                }
                print(f"[SKIP] {slot}: place _flow_raw/{slot}.mp4 to convert")

    write_manifest(entries)
    if not found_any:
        print("\nTip: Export MP4 clips from https://labs.google/flow into _flow_raw/ then run `npm run flow:convert`.")


if __name__ == "__main__":
    main()
