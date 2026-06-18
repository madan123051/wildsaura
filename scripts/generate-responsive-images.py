from pathlib import Path
from typing import Dict, List
from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "public" / "photos"
OUT_DIR = PHOTOS_DIR / "optimized"
EXTRA_OUT_DIR = ROOT / "public" / "images" / "optimized"
MANIFEST = ROOT / "src" / "utils" / "localImageManifest.ts"
WIDTHS = (320, 480, 640, 960, 1280, 1600)
EXTRA_IMAGES = {
    ROOT / "public" / "madan-about.png": (280,),
}
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def variant_stem(source: Path) -> str:
    return source.name.lower().replace(".", "-")


def to_webp(source: Path, out_dir: Path = OUT_DIR, widths: tuple = WIDTHS) -> List[int]:
    generated: List[int] = []
    try:
        with Image.open(source) as image:
            image.load()
            original_width, original_height = image.size
            if original_width <= 0 or original_height <= 0:
                return []

            for width in widths:
                target_width = min(width, original_width)
                if generated and generated[-1] == target_width:
                    continue

                ratio = target_width / original_width
                target_height = max(1, round(original_height * ratio))
                resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
                output = out_dir / f"{variant_stem(source)}-{target_width}.webp"
                save_options = {"format": "WEBP", "quality": 72, "method": 6}

                if resized.mode not in ("RGB", "RGBA"):
                    resized = resized.convert("RGBA" if "A" in resized.getbands() else "RGB")

                resized.save(output, **save_options)
                generated.append(target_width)
    except (OSError, UnidentifiedImageError) as exc:
        print(f"Skipped {source.name}: {exc}")
    return generated


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    EXTRA_OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: Dict[str, List[int]] = {}

    for source in sorted(PHOTOS_DIR.iterdir()):
        if not source.is_file() or source.suffix.lower() not in EXTENSIONS:
            continue
        widths = to_webp(source)
        if widths:
            manifest[f"/photos/{source.name}"] = widths

    extra_count = 0
    for source, widths in EXTRA_IMAGES.items():
        if source.exists():
            extra_count += len(to_webp(source, EXTRA_OUT_DIR, widths))

    lines = [
        "export const LOCAL_IMAGE_VARIANTS: Record<string, number[]> = {",
        *[
            f"  '{path}': [{', '.join(str(width) for width in widths)}],"
            for path, widths in sorted(manifest.items())
        ],
        "};",
        "",
    ]
    MANIFEST.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"Generated {sum(len(widths) for widths in manifest.values())} photo WebP variants "
        f"for {len(manifest)} images and {extra_count} extra variants."
    )


if __name__ == "__main__":
    main()
