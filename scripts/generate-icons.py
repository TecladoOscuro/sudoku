#!/usr/bin/env python3
"""Genera los iconos PNG (192, 512, apple-touch 180) para la PWA de Sudoku."""
from PIL import Image, ImageDraw, ImageFont
import os
import sys

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(OUT_DIR, exist_ok=True)


def draw_icon(size: int) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fondo con esquinas redondeadas
    radius = int(size * 0.18)
    # Degradado simulado con dos rectángulos
    for i in range(size):
        t = i / size
        r = int(33 + (13 - 33) * t)
        g = int(150 + (71 - 150) * t)
        b = int(243 + (161 - 243) * t)
        d.line([(0, i), (size, i)], fill=(r, g, b, 255))

    # máscara de esquinas redondeadas
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg.paste(img, (0, 0), mask)

    d = ImageDraw.Draw(bg)

    # Líneas de cuadrícula decorativas
    line_color = (255, 255, 255, 80)
    lw = max(1, size // 100)
    margin = int(size * 0.13)
    inner = size - 2 * margin
    for k in (1, 2):
        offset = int(inner * k / 3)
        d.line([(margin + offset, margin), (margin + offset, size - margin)],
               fill=line_color, width=lw)
        d.line([(margin, margin + offset), (size - margin, margin + offset)],
               fill=line_color, width=lw)

    # Número 9
    try:
        font_paths = [
            '/System/Library/Fonts/Supplemental/Arial Black.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
            '/Library/Fonts/Arial.ttf',
            '/System/Library/Fonts/SFNS.ttf',
        ]
        font = None
        for fp in font_paths:
            if os.path.exists(fp):
                font = ImageFont.truetype(fp, int(size * 0.7))
                break
        if font is None:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    text = '9'
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1] - int(size * 0.05)
    d.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))

    return bg


def save(size: int, name: str):
    img = draw_icon(size)
    path = os.path.join(OUT_DIR, name)
    img.save(path, 'PNG')
    print(f'  ✓ {name} ({size}x{size})')


if __name__ == '__main__':
    print('Generando iconos en', OUT_DIR)
    save(192, 'icon-192.png')
    save(512, 'icon-512.png')
    save(180, 'apple-touch-icon.png')
    print('Listo.')
