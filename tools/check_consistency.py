"""Check that every place that states availability or the starting price agrees with the cards.

    python3 tools/check_consistency.py [path/to/index.html]   (stdlib only; exit 1 on any FAIL)

Source of truth: the `article.ko-card` elements in #aptGrid (`data-status`, `data-price`).
Checked against it:
- every "N z M" count in index.html (hero, menu note, popup …) and every [data-avail-text],
- JSON-LD AggregateOffer offerCount / lowPrice / highPrice and RealEstateAgent priceRange,
- every "od X zł" / "od X tys. zł" price (title, OG/Twitter, meta description, hero, FAQ, popup …),
- the lot-selector SOLD map in the script vs. the sold cards,
- marketing/google-ads.md counts.
Promo claims that the cards cannot back ("do −N%", "do N zł" savings) are reported as WARN:
they are the owner's call, but they should be re-checked after every sale.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "index.html").read_text(encoding="utf-8")
ADS = ROOT / "marketing" / "google-ads.md"

fails, warns = [], []


def fail(msg):
    fails.append(msg)


def warn(msg):
    warns.append(msg)


def text_of(fragment):
    """Visible-ish text: tags dropped, entities for spaces normalised."""
    t = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", fragment, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", t.replace("&nbsp;", " ").replace(" ", " "))


def digits(s):
    return int(re.sub(r"\D", "", s))


def fmt(n):
    return f"{n:,}".replace(",", " ")


# ── cards ────────────────────────────────────────────────────────────────
grid = HTML[HTML.index('id="aptGrid"'):]
grid = grid[:grid.index("</section>")]
cards = re.findall(r'<article class="ko-card[^"]*"([^>]*)>(.*?)</article>', grid, flags=re.S)
if not cards:
    sys.exit("no cards found in #aptGrid")
units = []
for attrs, body in cards:
    status = re.search(r'data-status="(\w+)"', attrs).group(1)
    price = int(re.search(r'data-price="(\d+)"', attrs).group(1))
    title = re.search(r'class="ko-title">([^<]+)<', body).group(1).strip()
    pct = re.search(r'class="ko-pct">\D*(\d+)%', body)
    save = re.search(r'Oszczędzasz ([\d\s ]+) zł', body)
    units.append({"title": title, "status": status, "price": price,
                  "pct": int(pct.group(1)) if pct else 0,
                  "save": digits(save.group(1)) if save else 0})
total = len(units)
avail = [u for u in units if u["status"] == "avail"]
sold = [u for u in units if u["status"] == "sold"]
n_avail = len(avail)
low, high = min(u["price"] for u in avail), max(u["price"] for u in avail)
print(f"cards: {total}, available: {n_avail}, sold: {', '.join(u['title'] for u in sold) or '-'}; "
      f"price {fmt(low)} – {fmt(high)} zł")
for u in avail:
    if u["price"] <= 0:
        fail(f"{u['title']}: available but data-price is {u['price']}")

# ── counts "N z M" everywhere in the page ────────────────────────────────
page_text = text_of(HTML[HTML.index("<body"):])
head = HTML[:HTML.index("</head>")]
meta_text = " ".join(a or b for a, b in re.findall(r'<title>([^<]*)</title>|content="([^"]*)"', head)).replace("&nbsp;", " ")
for m in re.finditer(r"\b(\d+) z (\d+)\b(?= dom| \w)", page_text + " | " + meta_text):
    a, b = int(m.group(1)), int(m.group(2))
    if b == total and a != n_avail:
        ctx = (page_text + " | " + meta_text)[max(0, m.start() - 40):m.end() + 30]
        fail(f'"{a} z {b}" but {n_avail} of {total} are available: …{ctx}…')
for m in re.finditer(r"data-avail-text[^>]*>([^<]*)<", HTML):
    found = re.findall(r"\d+", m.group(1))
    if not found or int(found[0]) != n_avail:
        fail(f'[data-avail-text] "{m.group(1).strip()}" does not start with {n_avail}')

# ── JSON-LD ─────────────────────────────────────────────────────────────
ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', HTML, flags=re.S).group(1))
for node in ld.get("@graph", []):
    offers = node.get("offers")
    if isinstance(offers, dict) and offers.get("@type") == "AggregateOffer":
        if offers.get("offerCount") != n_avail:
            fail(f"JSON-LD offerCount {offers.get('offerCount')} != {n_avail}")
        if offers.get("lowPrice") != low:
            fail(f"JSON-LD lowPrice {offers.get('lowPrice')} != {low}")
        if offers.get("highPrice") != high:
            fail(f"JSON-LD highPrice {offers.get('highPrice')} != {high}")
    if "priceRange" in node:
        nums = [digits(x) for x in re.findall(r"\d{3}[\s ]\d{3}", node["priceRange"])]
        if nums != [low, high]:
            fail(f'JSON-LD priceRange "{node["priceRange"]}" != {fmt(low)} – {fmt(high)} zł')
    for q in node.get("mainEntity", []):
        for m in re.finditer(r"od (\d{3}[\s ]\d{3}) zł", q.get("acceptedAnswer", {}).get("text", "")):
            if digits(m.group(1)) != low:
                fail(f'JSON-LD FAQ price "od {m.group(1)} zł" != {fmt(low)}')

# ── "od X zł" prices: head meta + body ──────────────────────────────────
for where, txt in (("head (title/meta/OG/Twitter)", meta_text), ("body", page_text)):
    for m in re.finditer(r"\bod (\d{3}[\s ]\d{3}) zł", txt):
        if digits(m.group(1)) != low:
            fail(f'{where}: "od {m.group(1)} zł" but the cheapest available house is {fmt(low)} zł')
    for m in re.finditer(r"\bod (\d{3}) tys\.? zł", txt):
        if int(m.group(1)) * 1000 != low:
            fail(f'{where}: "od {m.group(1)} tys. zł" but the cheapest available house is {fmt(low)} zł')
if not re.search(rf"od {fmt(low)} zł", meta_text):
    fail(f"title/description do not mention the starting price od {fmt(low)} zł")

# ── lot selector SOLD map in the script ─────────────────────────────────
sold_map = re.search(r"const SOLD = (\{[^;]*\});", HTML)
if sold_map:
    js_sold = set()
    for bld, pair in re.findall(r"(\d+)\s*:\s*\[([^\]]*)\]", sold_map.group(1)):
        left, right = [p.strip() == "true" for p in pair.split(",")]
        if left:
            js_sold.add(f"Domek {bld}")
        if right:
            js_sold.add(f"Domek {bld}a")
    card_sold = {u["title"] for u in sold}
    if js_sold != card_sold:
        fail(f"lot selector SOLD map {sorted(js_sold)} != sold cards {sorted(card_sold)}")
else:
    fail("lot selector SOLD map not found")

# ── promo claims the cards cannot back (owner decision → warning) ───────
max_pct = max(u["pct"] for u in avail)
max_save = max(u["save"] for u in avail)
for m in set(re.findall(r"do\s*[−-]\s*(\d+)\s*%", page_text)):
    if int(m) > max_pct:
        warn(f'promo "do −{m}%" but the highest discount on an available card is −{max_pct}%')
for m in set(re.findall(r"[Rr]abat do ([\d\s]+) zł", page_text)):
    if digits(m) > max_save:
        warn(f'"Rabat do {m.strip()} zł" but the highest saving on an available card is {fmt(max_save)} zł')

# ── marketing copy ──────────────────────────────────────────────────────
if ADS.exists():
    ads = ADS.read_text(encoding="utf-8")
    for m in re.finditer(r"\b(\d+) z (\d+)\b", ads):
        if int(m.group(2)) == total and int(m.group(1)) != n_avail:
            fail(f'marketing/google-ads.md: "{m.group(0)}" but {n_avail} of {total} are available')
    for m in re.finditer(r"\((\d+) dostępnych\)|(\d+) domów od", ads):
        n = int(m.group(1) or m.group(2))
        if n != n_avail:
            fail(f'marketing/google-ads.md: "{m.group(0)}" but {n_avail} are available')

for w in warns:
    print("WARN", w)
for f in fails:
    print("FAIL", f)
print("OK" if not fails else f"{len(fails)} problem(s)")
sys.exit(1 if fails else 0)
