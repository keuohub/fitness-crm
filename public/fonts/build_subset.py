#!/usr/bin/env python3
"""
徕舞小程序字体子集生成脚本
- laiwu-serif-sc.{woff2,ttf}  ← Noto Serif SC SemiBold（= 思源宋体 SC SemiBold，SIL OFL 1.1）
- laiwu-numeral.{woff2,ttf}   ← Cormorant Garamond Medium 500（SIL OFL 1.1）

用法（在 fonts 目录或任意目录）：
  python3 build_subset.py
依赖：
  pip install fonttools brotli
源字体默认从 /tmp/laiwu-fonts 读取；也可通过环境变量覆盖：
  LAIWU_SERIF_SRC=/path/to/NotoSerifSC-SemiBold.otf
  LAIWU_NUM_SRC=/path/to/CormorantGaramond-500.ttf
"""
from __future__ import annotations

import os
import re
import sys
import pathlib
from collections import OrderedDict

from fontTools.subset import main as subset_main

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE
MP_ROOT = HERE.parent.parent / "miniprogram"
# 源字体：优先环境变量，其次本目录 source/，再次 /tmp/laiwu-fonts
SERIF_CANDIDATES = [
    os.environ.get("LAIWU_SERIF_SRC"),
    str(HERE / "source" / "NotoSerifSC-SemiBold.otf"),
    "/tmp/laiwu-fonts/NotoSerifSC-SemiBold.ttf",
]
NUM_CANDIDATES = [
    os.environ.get("LAIWU_NUM_SRC"),
    str(HERE / "source" / "CormorantGaramond-500.ttf"),
    "/tmp/laiwu-fonts/CormorantGaramond-500.ttf",
]

COMMON_500 = (
    "啊阿埃挨哎唉哀皑癌蔼矮艾碍爱隘鞍氨安俺按暗岸胺案肮昂盎凹敖熬翱袄傲奥懊澳芭捌扒叭吧笆八疤巴拔跋靶把耙"
    "坝霸罢爸白柏百摆佰败拜稗斑班搬扳般颁板版扮拌伴瓣半办绊邦帮梆榜膀绑棒磅蚌镑傍谤苞胞包褒剥薄雹保堡饱宝"
    "抱报暴豹鲍爆杯碑悲卑北辈背贝钡倍狈备惫焙被奔苯本笨崩绷甭泵蹦迸逼鼻比鄙笔彼碧蓖蔽毕毙毖币庇痹闭敝弊必"
    "辟壁臂避陛鞭边编贬扁便变卞辨辩辫遍标彪膘表鳖憋别瘪彬斌濒滨宾摈兵冰柄丙秉饼炳病并玻菠播拨钵波博勃搏铂"
    "箔伯帛舶脖膊渤泊驳捕卜哺补埠不布步簿部怖擦猜裁材才财睬踩采彩菜蔡餐参蚕残惭惨灿苍舱仓沧藏操糙槽曹草厕"
    "策侧册测层蹭插叉茬茶查碴搽察岔差诧拆柴豺搀掺蝉馋谗缠铲产阐颤昌猖场尝常长偿肠厂敞畅唱倡超抄钞朝嘲潮巢"
    "吵炒车扯撤掣彻澈郴臣辰尘晨忱沉陈趁衬撑称城橙成呈乘程惩澄诚承逞骋秤吃痴持匙池迟弛驰耻齿侈尺赤翅斥炽充"
    "冲虫崇宠抽酬畴踌稠愁筹仇绸瞅丑臭初出橱厨躇锄雏滁除楚础储矗搐触处揣川穿椽传船喘串疮窗幢床闯创吹炊捶锤"
    "垂春椿醇唇淳纯蠢戳绰疵茨磁雌辞慈瓷词此刺赐次聪葱囱匆从丛凑粗醋簇促蹿篡窜摧崔催脆瘁粹淬翠村存寸磋撮搓"
    "措挫错搭达答瘩打大呆歹傣戴带殆代贷袋待逮怠耽担丹单郸掸胆旦氮但惮淡诞弹蛋当挡党荡档刀捣蹈倒岛祷导到稻"
)

PUNCT = (
    # 中文标点
    "，。！？、；：""''『』「」（）【】《》〈〉…—～·•"
    # 英文/通用
    ",.!?;:'\"()[]{}<>/\\|-_+*=#%&@^`~ "
    # 设计规范常用
    "·:/－—–‐"
)
LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
DIGITS = "0123456789"


def find_src(cands):
    for c in cands:
        if c and pathlib.Path(c).is_file():
            return pathlib.Path(c)
    return None


def extract_mp_cjk(root: pathlib.Path) -> set[str]:
    chars: set[str] = set()
    if not root.is_dir():
        print(f"[warn] miniprogram not found at {root}", file=sys.stderr)
        return chars
    for p in root.rglob("*"):
        if p.suffix.lower() in {".wxml", ".js", ".json"} and p.is_file():
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            for ch in text:
                if "\u4e00" <= ch <= "\u9fff" or "\u3400" <= ch <= "\u4dbf":
                    chars.add(ch)
    return chars


def build_serif_charset() -> str:
    mp = extract_mp_cjk(MP_ROOT)
    freq = list(OrderedDict.fromkeys(COMMON_500))[:500]
    # 若 COMMON_500 不足 500，用字频扩充占位——实际会再扫 mp
    punct_cjk = [c for c in PUNCT if ord(c) > 127]
    all_chars = OrderedDict()
    for ch in list(mp) + freq + list(DIGITS) + list(LATIN) + list(PUNCT):
        if ch and not ch.isspace():
            all_chars[ch] = True
        elif ch == " ":
            all_chars[ch] = True
    # 强制包含空格与常用不可见需求以外的字符
    text = "".join(all_chars.keys())
    return text


def build_numeral_charset() -> str:
    # 拉丁 + 数字 + 常用标点与 · : / -
    s = LATIN + DIGITS + ".,:;!?/\\-_+%·:–—‐'\"()[] "
    return "".join(OrderedDict.fromkeys(s).keys())


def run_subset(src: pathlib.Path, text: str, out_stem: pathlib.Path, flavors):
    text_file = out_stem.parent / (out_stem.name + ".chars.txt")
    text_file.write_text(text, encoding="utf-8")
    for flavor, ext in flavors:
        out = out_stem.with_suffix(ext)
        args = [
            str(src),
            f"--text-file={text_file}",
            f"--output-file={out}",
            "--layout-features=*",
            "--glyph-names",
            "--symbol-cmap",
            "--legacy-cmap",
            "--notdef-glyph",
            "--notdef-outline",
            "--recommended-glyphs",
            "--name-IDs=*",
            "--name-legacy",
            "--name-languages=*",
        ]
        if flavor:
            args.append(f"--flavor={flavor}")
            if flavor == "woff2":
                args.append("--with-zopfli")  # may fall back if no zopfli
        print(f"→ subset {src.name} → {out.name} ({len(text)} chars, flavor={flavor or 'ttf'})")
        try:
            subset_main(args)
        except SystemExit as e:
            if e.code not in (0, None):
                # retry without zopfli
                args = [a for a in args if a != "--with-zopfli"]
                subset_main(args)
        size = out.stat().st_size if out.exists() else 0
        print(f"  size: {size} bytes ({size/1024:.1f} KB)")


def main():
    serif = find_src(SERIF_CANDIDATES)
    num = find_src(NUM_CANDIDATES)
    if not serif:
        sys.exit("找不到思源/Noto Serif SC SemiBold 源文件，请设置 LAIWU_SERIF_SRC")
    if not num:
        sys.exit("找不到 Cormorant Garamond 源文件，请设置 LAIWU_NUM_SRC")

    serif_text = build_serif_charset()
    num_text = build_numeral_charset()
    print(f"serif charset unique chars: {len(serif_text)}")
    print(f"numeral charset unique chars: {len(num_text)}")
    (OUT / "charset-serif.txt").write_text(serif_text, encoding="utf-8")
    (OUT / "charset-numeral.txt").write_text(num_text, encoding="utf-8")

    run_subset(
        serif,
        serif_text,
        OUT / "laiwu-serif-sc",
        flavors=[("woff2", ".woff2"), (None, ".ttf")],
    )
    run_subset(
        num,
        num_text,
        OUT / "laiwu-numeral",
        flavors=[("woff2", ".woff2"), (None, ".ttf")],
    )
    print("done.")


if __name__ == "__main__":
    main()
