#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Studio Female Neural Audio Generator (en-US-AvaNeural) for VSTEP Reading Mock Tests
Matches the Studio Female Voice (Voice B - Ava Neural) from vstepspeakingpart1b2level.
Generates MP3 files in audio/ and writes audio/manifest.json + audio/manifest.js.
"""

import os
import re
import json
import hashlib
import asyncio
import edge_tts
from curated_pretest_vocab import PRETEST_VOCAB_BY_TEST

VOICE = "en-US-AvaNeural"
RATE = "-4%"
PITCH = "+0Hz"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)


def prepare_speech_text(txt: str) -> str:
    if not txt:
        return ""
    t = str(txt)
    t = re.sub(r"<[^>]*>", " ", t)
    t = (
        t.replace("&amp;", " and ")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    t = re.sub(r"^[→\-\*\•\s]+", "", t)
    t = re.sub(r"([a-zA-Z0-9])\s*/\s*([a-zA-Z0-9])", r"\1, or \2", t)
    t = re.sub(r"\s*\(([^\)]+)\)", r", \1", t)
    t = re.sub(r"\.{2,}", ".", t)
    t = t.replace("\\'", "'").replace('\\"', '"').replace("\\", "")
    t = re.sub(r"\s+", " ", t).strip()
    return t


def collect_texts():
    items = {}
    # Sample preview sentence from vstepspeakingpart1b2level
    sample = "Sure. I often play sports in the afternoon whenever I have free time. It allows me to relax after a busy day and stay healthy."
    items[sample] = prepare_speech_text(sample)

    for test_num, passages in PRETEST_VOCAB_BY_TEST.items():
        for p_num, vocab_list in passages.items():
            for v in vocab_list:
                raw_w = v["word"].strip()
                spoken_w = prepare_speech_text(raw_w)
                items[raw_w] = spoken_w

                raw_ex = v.get("ex", "").strip()
                if raw_ex:
                    spoken_ex = prepare_speech_text(raw_ex)
                    items[raw_ex] = spoken_ex
    return items


async def synthesize_one(sem, raw_key, spoken_text, manifest):
    h = hashlib.md5(spoken_text.lower().encode("utf-8")).hexdigest()[:12]
    rel_path = f"audio/speech_{h}.mp3"
    full_path = os.path.join(BASE_DIR, rel_path)

    manifest[raw_key] = rel_path
    manifest[raw_key.lower()] = rel_path
    manifest[spoken_text] = rel_path
    manifest[spoken_text.lower()] = rel_path

    if os.path.exists(full_path) and os.path.getsize(full_path) > 500:
        return True

    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(spoken_text, VOICE, rate=RATE, pitch=PITCH)
                await communicate.save(full_path)
                if os.path.exists(full_path) and os.path.getsize(full_path) > 500:
                    return True
            except Exception as e:
                await asyncio.sleep(0.5 * (attempt + 1))
        print(f"Failed to synthesize: {spoken_text}")
        return False


async def main():
    items = collect_texts()
    print(f"Total unique texts to synthesize with {VOICE}: {len(items)}")

    manifest = {}
    sem = asyncio.Semaphore(25)
    tasks = []
    # Deduplicate by spoken_text so we only synthesize each unique audio file once
    unique_spoken = {}
    for raw_key, spoken_text in items.items():
        h = hashlib.md5(spoken_text.lower().encode("utf-8")).hexdigest()[:12]
        rel_path = f"audio/speech_{h}.mp3"
        manifest[raw_key] = rel_path
        manifest[raw_key.lower()] = rel_path
        manifest[spoken_text] = rel_path
        manifest[spoken_text.lower()] = rel_path
        unique_spoken[spoken_text] = raw_key

    for spoken_text, raw_key in unique_spoken.items():
        tasks.append(synthesize_one(sem, raw_key, spoken_text, manifest))

    results = await asyncio.gather(*tasks)
    success_count = sum(1 for r in results if r)
    print(f"Synthesized {success_count}/{len(unique_spoken)} Studio Neural MP3 files.")

    manifest_json_path = os.path.join(AUDIO_DIR, "manifest.json")
    manifest_js_path = os.path.join(AUDIO_DIR, "manifest.js")

    with open(manifest_json_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)

    with open(manifest_js_path, "w", encoding="utf-8") as f:
        f.write("window.studioAudioManifest = ")
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write(";\n")

    print(f"Saved {manifest_json_path} and {manifest_js_path} ({len(manifest)} keys).")


if __name__ == "__main__":
    asyncio.run(main())
