#!/usr/bin/env python3
"""Generate Key Pilot MVP bitmap assets without external dependencies.

The art is intentionally deterministic and replaceable: it gives Phaser real
sprite sheets and room backgrounds today, while keeping paths stable for later
hand-painted replacements.
"""

from __future__ import annotations

import math
import os
import random
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def rgba(hex_value: str | tuple[int, int, int, int], alpha: int | None = None) -> tuple[int, int, int, int]:
    if isinstance(hex_value, tuple):
        if alpha is None:
            return hex_value
        return (hex_value[0], hex_value[1], hex_value[2], alpha)
    value = hex_value.strip().lstrip("#")
    if len(value) == 6:
        r, g, b = int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)
        return (r, g, b, 255 if alpha is None else alpha)
    if len(value) == 8:
        r, g, b, a = int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), int(value[6:8], 16)
        return (r, g, b, a if alpha is None else alpha)
    raise ValueError(f"Bad color: {hex_value}")


class Canvas:
    def __init__(self, width: int, height: int, bg: tuple[int, int, int, int] = (0, 0, 0, 0)):
        self.width = width
        self.height = height
        self.pixels = bytearray(width * height * 4)
        if bg[3]:
            self.rect(0, 0, width, height, bg)

    def _blend(self, x: int, y: int, color: tuple[int, int, int, int]) -> None:
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        sr, sg, sb, sa = color
        if sa <= 0:
            return
        idx = (y * self.width + x) * 4
        if sa >= 255:
            self.pixels[idx:idx + 4] = bytes((sr, sg, sb, 255))
            return
        dr, dg, db, da = self.pixels[idx:idx + 4]
        src_a = sa / 255
        dst_a = da / 255
        out_a_f = src_a + dst_a * (1 - src_a)
        if out_a_f <= 0:
            return
        out_r = (sr * src_a + dr * dst_a * (1 - src_a)) / out_a_f
        out_g = (sg * src_a + dg * dst_a * (1 - src_a)) / out_a_f
        out_b = (sb * src_a + db * dst_a * (1 - src_a)) / out_a_f
        self.pixels[idx] = max(0, min(255, int(round(out_r))))
        self.pixels[idx + 1] = max(0, min(255, int(round(out_g))))
        self.pixels[idx + 2] = max(0, min(255, int(round(out_b))))
        self.pixels[idx + 3] = max(0, min(255, int(round(out_a_f * 255))))

    def rect(self, x: float, y: float, w: float, h: float, color: tuple[int, int, int, int]) -> None:
        x0, y0 = max(0, int(round(x))), max(0, int(round(y)))
        x1, y1 = min(self.width, int(round(x + w))), min(self.height, int(round(y + h)))
        for yy in range(y0, y1):
            row = yy * self.width * 4
            for xx in range(x0, x1):
                self._blend(xx, yy, color)

    def stroke_rect(self, x: float, y: float, w: float, h: float, color: tuple[int, int, int, int], t: int = 2) -> None:
        self.rect(x, y, w, t, color)
        self.rect(x, y + h - t, w, t, color)
        self.rect(x, y, t, h, color)
        self.rect(x + w - t, y, t, h, color)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int]) -> None:
        x0, x1 = int(cx - rx), int(cx + rx) + 1
        y0, y1 = int(cy - ry), int(cy + ry) + 1
        rr_x = max(rx * rx, 1)
        rr_y = max(ry * ry, 1)
        for yy in range(y0, y1):
            dy = (yy - cy) * (yy - cy) / rr_y
            if dy > 1:
                continue
            for xx in range(x0, x1):
                if ((xx - cx) * (xx - cx) / rr_x + dy) <= 1:
                    self._blend(xx, yy, color)

    def stroke_ellipse(self, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int], t: int = 2) -> None:
        for i in range(t):
            self._ellipse_outline(cx, cy, max(1, rx - i), max(1, ry - i), color)

    def _ellipse_outline(self, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int]) -> None:
        steps = int(max(36, (rx + ry) * 1.7))
        prev = None
        for i in range(steps + 1):
            a = math.tau * i / steps
            point = (cx + math.cos(a) * rx, cy + math.sin(a) * ry)
            if prev:
                self.line(prev[0], prev[1], point[0], point[1], color, 1)
            prev = point

    def line(self, x0: float, y0: float, x1: float, y1: float, color: tuple[int, int, int, int], t: int = 2) -> None:
        dx, dy = x1 - x0, y1 - y0
        length = max(1, int(math.hypot(dx, dy)))
        radius = max(1, t // 2)
        for i in range(length + 1):
            x = x0 + dx * i / length
            y = y0 + dy * i / length
            if t <= 2:
                self._blend(int(round(x)), int(round(y)), color)
            else:
                self.ellipse(x, y, radius, radius, color)

    def radial_glow(self, cx: float, cy: float, r: float, color: tuple[int, int, int, int], rings: int = 20) -> None:
        rr = max(1, int(r))
        for i in range(rings, 0, -1):
            alpha = int(color[3] * (i / rings) ** 2)
            self.ellipse(cx, cy, rr * i / rings, rr * i / rings, (color[0], color[1], color[2], alpha))

    def noise(self, seed: int, amount: int = 18, alpha: int = 28) -> None:
        rng = random.Random(seed)
        for _ in range(amount * 100):
            x, y = rng.randrange(self.width), rng.randrange(self.height)
            shade = rng.randrange(25, 80)
            self._blend(x, y, (shade, shade, shade, rng.randrange(4, alpha)))

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        rows = []
        stride = self.width * 4
        for y in range(self.height):
            rows.append(b"\x00" + bytes(self.pixels[y * stride:(y + 1) * stride]))
        raw = b"".join(rows)

        def chunk(tag: bytes, data: bytes) -> bytes:
            return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

        png = b"\x89PNG\r\n\x1a\n"
        png += chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 6, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress(raw, 9))
        png += chunk(b"IEND", b"")
        path.write_bytes(png)


def draw_floor(canvas: Canvas, palette: dict[str, tuple[int, int, int, int]], seed: int) -> None:
    w, h = canvas.width, canvas.height
    canvas.rect(0, 0, w, h, palette["void"])
    canvas.rect(w * 0.08, h * 0.08, w * 0.84, h * 0.84, palette["floor"])
    canvas.stroke_rect(w * 0.08, h * 0.08, w * 0.84, h * 0.84, palette["wall"], 16)
    canvas.stroke_rect(w * 0.12, h * 0.14, w * 0.76, h * 0.72, palette["trim"], 4)
    tile = 64
    for x in range(int(w * 0.1), int(w * 0.9), tile):
        canvas.line(x, h * 0.1, x, h * 0.9, rgba("#8ccad6", 22), 1)
    for y in range(int(h * 0.12), int(h * 0.88), tile):
        canvas.line(w * 0.09, y, w * 0.91, y, rgba("#8ccad6", 20), 1)
    rng = random.Random(seed)
    for _ in range(44):
        x = rng.randrange(int(w * 0.12), int(w * 0.88))
        y = rng.randrange(int(h * 0.15), int(h * 0.84))
        ww = rng.randrange(14, 72)
        hh = rng.randrange(5, 22)
        canvas.rect(x, y, ww, hh, rgba("#11181c", rng.randrange(34, 78)))
        canvas.stroke_rect(x, y, ww, hh, rgba("#5f7d85", rng.randrange(18, 50)), 1)
    canvas.noise(seed + 30, amount=24, alpha=38)


def draw_door(canvas: Canvas, side: str, palette: dict[str, tuple[int, int, int, int]], locked: bool = True) -> None:
    w, h = canvas.width, canvas.height
    accent = palette["accent"] if not locked else palette["danger"]
    if side in ("top", "bottom"):
        y = h * 0.075 if side == "top" else h * 0.875
        canvas.rect(w * 0.42, y, w * 0.16, h * 0.055, rgba("#090c0e", 220))
        canvas.stroke_rect(w * 0.42, y, w * 0.16, h * 0.055, accent, 4)
        canvas.rect(w * 0.488, y + h * 0.012, w * 0.024, h * 0.03, accent)
    else:
        x = w * 0.07 if side == "left" else w * 0.88
        canvas.rect(x, h * 0.43, w * 0.055, h * 0.16, rgba("#090c0e", 220))
        canvas.stroke_rect(x, h * 0.43, w * 0.055, h * 0.16, accent, 4)
        canvas.rect(x + w * 0.014, h * 0.49, w * 0.028, h * 0.024, accent)


def draw_room_background(room_id: str, path: Path) -> None:
    palettes = {
        "gate": {"void": rgba("#02070a"), "floor": rgba("#1b292d"), "wall": rgba("#243c45"), "trim": rgba("#43f2e1", 60), "accent": rgba("#45f7e4", 220), "danger": rgba("#ff625c", 210)},
        "pipe": {"void": rgba("#020805"), "floor": rgba("#18281d"), "wall": rgba("#214236"), "trim": rgba("#62ff9d", 54), "accent": rgba("#62ff9d", 220), "danger": rgba("#d9f06f", 210)},
        "nest": {"void": rgba("#0c0306"), "floor": rgba("#2a1d1a"), "wall": rgba("#4a2424"), "trim": rgba("#ff9d45", 54), "accent": rgba("#ff9d45", 220), "danger": rgba("#ff625c", 215)},
        "blackout": {"void": rgba("#010204"), "floor": rgba("#111a22"), "wall": rgba("#1a2436"), "trim": rgba("#8ea7ff", 42), "accent": rgba("#8ea7ff", 210), "danger": rgba("#ff625c", 220)},
        "core": {"void": rgba("#060208"), "floor": rgba("#211724"), "wall": rgba("#3b2144"), "trim": rgba("#ff625c", 64), "accent": rgba("#ffd66e", 230), "danger": rgba("#ff625c", 230)},
    }
    p = palettes[room_id]
    c = Canvas(1280, 720, p["void"])
    draw_floor(c, p, seed=len(room_id) * 57)
    for side in ("top", "bottom", "left", "right"):
        draw_door(c, side, p, locked=True)

    if room_id == "gate":
        for x in (190, 1090):
            c.rect(x - 28, 175, 56, 370, rgba("#12242a", 210))
            c.stroke_rect(x - 28, 175, 56, 370, rgba("#45f7e4", 55), 3)
        c.line(220, 580, 1060, 580, rgba("#ffd66e", 72), 5)
        c.line(220, 140, 1060, 130, rgba("#45f7e4", 42), 4)
    elif room_id == "pipe":
        for y in (148, 574):
            c.line(135, y, 1145, y + 18, rgba("#62ff9d", 68), 14)
            c.line(135, y + 28, 1145, y + 46, rgba("#0e1610", 190), 8)
        for x in (265, 490, 820, 1045):
            c.ellipse(x, 350, 34, 140, rgba("#285f42", 155))
            c.stroke_ellipse(x, 350, 34, 140, rgba("#9bffd1", 58), 3)
        for i in range(9):
            c.radial_glow(180 + i * 110, 410 + (i % 2) * 42, 56, rgba("#62ff9d", 24), 11)
    elif room_id == "nest":
        for i in range(8):
            x = 110 + i * 150
            y = 150 if i % 2 else 540
            c.ellipse(x, y, 80, 48, rgba("#55242b", 135))
            c.stroke_ellipse(x, y, 80, 48, rgba("#ff9d45", 80), 4)
            c.line(x - 45, y, x + 50, y + (34 if i % 2 else -34), rgba("#ff625c", 70), 5)
    elif room_id == "blackout":
        for i in range(16):
            x = 120 + i * 74
            c.line(x, 122, x + 42, 620, rgba("#8ea7ff", 26 if i % 2 else 12), 2)
        for x in (250, 640, 1030):
            c.rect(x - 62, 252, 124, 92, rgba("#05070a", 210))
            c.stroke_rect(x - 62, 252, 124, 92, rgba("#ff625c", 70), 3)
            c.rect(x - 36, 282, 18, 20, rgba("#ff625c", 180))
            c.rect(x - 4, 282, 18, 20, rgba("#ff625c", 110))
            c.rect(x + 28, 282, 18, 20, rgba("#ff625c", 170))
        c.radial_glow(640, 360, 410, rgba("#000000", 100), 24)
    elif room_id == "core":
        c.radial_glow(640, 360, 260, rgba("#ff625c", 72), 28)
        for r in (70, 125, 185):
            c.stroke_ellipse(640, 360, r, r, rgba("#ffd66e", 70), 3)
        c.rect(560, 280, 160, 160, rgba("#100711", 220))
        c.stroke_rect(560, 280, 160, 160, rgba("#ff625c", 170), 6)
        for i in range(10):
            a = math.tau * i / 10
            c.line(640, 360, 640 + math.cos(a) * 360, 360 + math.sin(a) * 240, rgba("#ff625c", 32), 3)

    c.rect(0, 0, 1280, 80, rgba("#000000", 96))
    c.rect(0, 640, 1280, 80, rgba("#000000", 100))
    c.save(path)


def draw_k01_frame(c: Canvas, ox: int, oy: int, frame: int, state: int) -> None:
    cx, cy = ox + 64, oy + 64
    colors = [rgba("#45f7e4"), rgba("#62ff9d"), rgba("#ffd66e"), rgba("#79e8ff"), rgba("#ff625c"), rgba("#fff1a8"), rgba("#53606a")]
    accent = colors[state]
    bob = math.sin(frame * math.tau / 4) * 3
    if state == 6:
        accent = rgba("#53606a", 200)
    if state == 4:
        cx += (-1 if frame % 2 else 1) * 3
    c.ellipse(cx, cy + 36, 42, 13, rgba("#000000", 82))
    c.rect(cx - 23, cy - 46 + bob, 46, 26, rgba("#10252c", 245))
    c.stroke_rect(cx - 23, cy - 46 + bob, 46, 26, accent, 3)
    c.rect(cx - 33, cy - 18 + bob, 66, 47, rgba("#324449", 244))
    c.stroke_rect(cx - 33, cy - 18 + bob, 66, 47, rgba("#ffd66e", 210), 3)
    c.line(cx - 42, cy - 2 + bob, cx - 60, cy + 24 + bob, accent, 8)
    c.line(cx + 42, cy - 2 + bob, cx + 60, cy + 24 + bob, accent, 8)
    c.rect(cx - 20, cy + 30 + bob, 14, 30, rgba("#79e8ff", 180))
    c.rect(cx + 6, cy + 30 + bob, 14, 30, rgba("#79e8ff", 180))
    c.ellipse(cx, cy + 4 + bob, 14 + state * 0.8, 14 + state * 0.8, rgba("#07100f", 180))
    c.stroke_ellipse(cx, cy + 4 + bob, 14 + state * 0.8, 14 + state * 0.8, accent, 3)
    c.rect(cx - 14, cy - 38 + bob, 10, 5, accent)
    c.rect(cx + 5, cy - 38 + bob, 10, 5, accent)
    if state in (2, 5):
        reach = 22 + frame * 7
        c.line(cx + 35, cy + 6, cx + 35 + reach, cy - 10, rgba("#ffd66e", 210), 5)
    if state == 3:
        c.line(cx + 55, cy - 7, cx + 26, cy + 3, rgba("#62ff9d", 210), 5)
    if state == 4:
        c.line(cx - 44, cy - 30, cx - 56, cy - 45, rgba("#ff625c", 190), 4)


def draw_monster_frame(c: Canvas, ox: int, oy: int, frame: int, row: int, kind: str) -> None:
    cx, cy = ox + 64, oy + 64
    specs = {
        "drift": (rgba("#91313a", 238), rgba("#ff625c"), 0),
        "iron": (rgba("#5d6467", 242), rgba("#ffd66e"), 1),
        "split": (rgba("#5a275e", 232), rgba("#ff9d45"), 2),
        "rush": (rgba("#374637", 238), rgba("#62ff9d"), 3),
    }
    body, accent, variant = specs[kind]
    move = math.sin(frame * math.tau / 4) * (5 if row == 1 else 2)
    scale = 1 + (0.08 if row == 2 else 0) - (0.18 * frame / 3 if row == 3 else 0)
    alpha = max(40, 235 - (frame * 44 if row == 3 else 0))
    body = (body[0], body[1], body[2], min(body[3], alpha))
    c.ellipse(cx, cy + 34, 36 * scale, 10, rgba("#000000", 88))
    if variant == 1:
        c.rect(cx - 31 * scale, cy - 31 * scale + move, 62 * scale, 62 * scale, body)
        c.stroke_rect(cx - 31 * scale, cy - 31 * scale + move, 62 * scale, 62 * scale, accent, 4)
    elif variant == 2:
        c.ellipse(cx - 14, cy + move, 32 * scale, 40 * scale, body)
        c.ellipse(cx + 18, cy + move, 27 * scale, 36 * scale, rgba("#3c163f", alpha))
        c.stroke_ellipse(cx, cy + move, 45 * scale, 42 * scale, accent, 3)
    elif variant == 3:
        c.ellipse(cx, cy + move, 48 * scale, 27 * scale, body)
        c.line(cx - 36, cy + move, cx - 56, cy + 28 + move, accent, 5)
        c.line(cx + 36, cy + move, cx + 56, cy + 28 + move, accent, 5)
        c.line(cx - 20, cy + move, cx - 35, cy - 27 + move, accent, 4)
        c.line(cx + 20, cy + move, cx + 35, cy - 27 + move, accent, 4)
    else:
        c.ellipse(cx, cy + move, 40 * scale, 46 * scale, body)
        c.stroke_ellipse(cx, cy + move, 40 * scale, 46 * scale, accent, 4)
        c.line(cx - 28, cy - 8 + move, cx - 46, cy - 18 + move, rgba("#ffd66e", 150), 5)
        c.line(cx + 28, cy - 8 + move, cx + 46, cy - 18 + move, rgba("#ffd66e", 150), 5)
    if row == 2:
        c.line(cx - 24, cy - 18, cx + 28, cy + 24, rgba("#fff1a8", 220), 4)
        c.line(cx + 20, cy - 21, cx - 18, cy + 22, rgba("#fff1a8", 170), 3)
    if row == 3:
        for i in range(6):
            a = math.tau * i / 6 + frame
            c.line(cx, cy, cx + math.cos(a) * (36 + frame * 10), cy + math.sin(a) * (30 + frame * 9), accent, 2)
    else:
        c.rect(cx - 14, cy - 9 + move, 8, 8, rgba("#ffd66e", alpha))
        c.rect(cx + 7, cy - 9 + move, 8, 8, rgba("#ffd66e", alpha))
        c.rect(cx - 17, cy + 20 + move, 34, 6, rgba("#ff625c", alpha))


def draw_boss_frame(c: Canvas, ox: int, oy: int, row: int, col: int) -> None:
    cx, cy = ox + 64, oy + 64
    accent = [rgba("#ffd66e"), rgba("#ff9d45"), rgba("#ff625c"), rgba("#fff1a8"), rgba("#62ff9d")][col]
    crack = col
    fade = max(40, 245 - row * 42 if col == 4 else 245)
    c.ellipse(cx, cy + 36, 48, 13, rgba("#000000", 92))
    c.ellipse(cx, cy, 46, 42, rgba("#1e1025", fade))
    c.stroke_ellipse(cx, cy, 46, 42, accent, 5)
    c.rect(cx - 30, cy - 28, 60, 56, rgba("#07080b", 170))
    c.stroke_rect(cx - 30, cy - 28, 60, 56, accent, 3)
    for i in range(3):
        c.rect(cx - 18 + i * 18, cy - 10, 9, 9, rgba("#ff625c" if i == 1 else "#ffd66e", fade))
    for i in range(crack):
        c.line(cx - 24 + i * 13, cy - 31, cx - 8 + i * 16, cy + 29, rgba("#fff1a8", 190), 3)
    if col == 4:
        for i in range(10):
            a = math.tau * i / 10 + row * 0.4
            c.line(cx, cy, cx + math.cos(a) * (50 + row * 12), cy + math.sin(a) * (45 + row * 12), rgba("#62ff9d", 120), 3)


def generate_sheets() -> None:
    frame = 128
    k = Canvas(frame * 7, frame * 4)
    for row in range(4):
        for state in range(7):
            draw_k01_frame(k, state * frame, row * frame, row, state)
    k.save(ROOT / "assets/characters/k01/k01_sheet_v01.png")

    monsters = {
        "drift_zombie_sheet_v01.png": "drift",
        "iron_walker_sheet_v01.png": "iron",
        "split_phantom_sheet_v01.png": "split",
        "rush_crawler_sheet_v01.png": "rush",
    }
    for filename, kind in monsters.items():
        sheet = Canvas(frame * 4, frame * 4)
        for row in range(4):
            for col in range(4):
                draw_monster_frame(sheet, col * frame, row * frame, col, row, kind)
        sheet.save(ROOT / f"assets/monsters/{filename}")

    boss = Canvas(frame * 5, frame * 4)
    for row in range(4):
        for col in range(5):
            draw_boss_frame(boss, col * frame, row * frame, row, col)
    boss.save(ROOT / "assets/monsters/old_coordinate_core_sheet_v01.png")

    vfx = Canvas(96 * 4, 96 * 4)
    for row in range(4):
        for col in range(4):
            ox, oy = col * 96, row * 96
            cx, cy = ox + 48, oy + 48
            color = [rgba("#ffd66e"), rgba("#79e8ff"), rgba("#62ff9d"), rgba("#ff625c")][row]
            for i in range(10):
                a = math.tau * i / 10 + col * 0.25
                length = 18 + col * 7 + row * 3
                vfx.line(cx, cy, cx + math.cos(a) * length, cy + math.sin(a) * length, color, 3)
            vfx.stroke_ellipse(cx, cy, 16 + col * 4, 16 + col * 4, color, 3)
    vfx.save(ROOT / "assets/vfx/vfx_combat_sheet_v01.png")

    ui = Canvas(512, 192)
    ui.rect(10, 18, 492, 140, rgba("#061117", 226))
    ui.stroke_rect(10, 18, 492, 140, rgba("#45f7e4", 210), 6)
    ui.ellipse(256, 88, 78, 78, rgba("#45f7e4", 25))
    ui.rect(72, 150, 368, 8, rgba("#ffd66e", 190))
    ui.save(ROOT / "assets/ui/target_hud_v01.png")


def main() -> None:
    rooms = {
        "gate": ROOT / "assets/rooms/gate/room_gate_v01.png",
        "pipe": ROOT / "assets/rooms/pipe/room_pipe_v01.png",
        "nest": ROOT / "assets/rooms/nest/room_nest_v01.png",
        "blackout": ROOT / "assets/rooms/blackout/room_blackout_v01.png",
        "core": ROOT / "assets/rooms/core/room_core_v01.png",
    }
    for room_id, path in rooms.items():
        draw_room_background(room_id, path)
    generate_sheets()
    print("Generated Key Pilot v01 assets")


if __name__ == "__main__":
    main()
