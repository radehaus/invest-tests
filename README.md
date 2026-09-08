# Allianz Invest — Prototypen

Drei Varianten desselben Teaser-Akkordeons unter einer Adresse, umschaltbar
über die Leiste am oberen Rand. Passwort einmalig `allianz` (merkt sich der
Browser über `localStorage`, gilt für alle drei).

    python3 -m http.server 8082     # → http://localhost:8082

| | Variante | Bedienung |
|---|---|---|
| `?v=scroll`  | 1 · Scroll             | Die Scrollposition wählt den offenen Teaser |
| `?v=hover`   | 2 · Mouseover          | Der Mauszeiger wählt ihn |
| `?v=preview` | 3 · Mouseover + Klick  | Mouseover zeigt einen Kurztext, Klick öffnet den Teaser |

## Eine Seite, drei Varianten

Es gibt **ein** Markup, **ein** Stylesheet und **eine** Engine. Die Variante
steht als `data-variant` am `<html>`-Element, gesetzt aus `?v=` noch vor dem
ersten Frame. Das ist Absicht: drei Kopien der Seite würden nach dem zweiten
Änderungswunsch auseinanderlaufen.

Alle drei schreiben dieselben zwei Eigenschaften pro Zeile:

    --open   0 → 1    wie weit der volle Teaser draußen ist
    --peek   0 → 1    wie weit der Kurztext draußen ist (nur Variante 3)

und teilen sich **eine** Federfunktion. Was die Varianten unterscheidet, ist
nur, was das Ziel vorgibt — nie, wie die Bewegung entsteht.

Nachbarn teilen sich immer die Strecke, `open(i) + open(i+1)` ist während
einer Übergabe konstant 1: zu jedem Zeitpunkt genau eine Teaserhöhe im
Layout, also nie ein Sprung.

## Das Gefühl pro Variante

In `assets/js/accordion.js`, Objekt `FEEL`:

| Variante | Federhärte | Masse | ≈ bis zur Ruhe |
|----------|-----------|-------|----------------|
| scroll   | 32        | 1.35  | ~1,0 s — schwer, mit Nachlauf |
| hover    | 210       | 0.7   | ~0,3 s |
| preview  | 230 / 260 | 0.65  | ~0,3 s |

Alle kritisch gedämpft: sie kommen zur Ruhe, ohne nachzuwackeln. `--vel`
(vorzeichenbehaftet) lässt Bild, Text und Bubbles unterschiedlich weit
nachhängen, `--speed` legt eine leichte Bewegungsunschärfe aufs Foto.

## Zwei Details, die den Unterschied machen

**Kein Flackern.** Ein aufgehendes Panel schiebt die Zeilen darunter weg. Unter
einem stillstehenden Zeiger kommt das als `mouseover` auf einer *anderen* Zeile
an, die aufgeht, die Zeilen erneut verschiebt — ein Akkordeon, das klappert.
Deshalb hängen Zustandswechsel nur an `mousemove`, also an echter
Zeigerbewegung. Layout, das unter einem ruhenden Cursor wandert, löst kein
`mousemove` aus.

**Gepinnt in Variante 3.** Ein Klick öffnet den Teaser und friert den Zustand
ein, damit er beim Lesen nicht unter der Maus wegklappt. Nochmal klicken,
Escape oder den Block verlassen gibt ihn wieder frei.

## Geometrie

In `:root` in `assets/css/style.css`:

| Variable        | jetzt  | Wirkung |
|-----------------|--------|---------|
| `--panel-fill`  | `.92`  | wie viel vom freien Raum der Teaser nimmt, `1` = randvoll |
| `--row-h-idle`  | ~72px  | Zeilenhöhe solange alles zu ist |
| `--row-h`       | ~50px  | Zeilenhöhe sobald ein Teaser offen ist |
| `--peek-h`      | ~88px  | Höhe des Kurztexts in Variante 3 |
| `--testbar`     | 42px   | Höhe der Umschaltleiste; alle Vollhöhen rechnen mit `--vh` |

## Barrierefreiheit

Klick und Tap bedienen alles auch ohne Maus, Tab-Fokus öffnet, Escape schließt.
Bei `prefers-reduced-motion: reduce` stehen alle Teaser offen im normalen Fluss.

## Assets

Fotos als JPEG in `assets/img/`, Logo und Icons als Inline-SVG-Sprite.
**Offen:** „Term life protection" hat noch kein Foto und zeigt einen Verlauf.

## Passwortschutz

Frontend-Gate: hält zufällige Besucher ab, mehr nicht. GitHub Pages liefert
statische Dateien aus, es gibt keinen Server, der etwas prüfen könnte — Quelltext
und Fotos bleiben per Direkt-URL abrufbar, und das Repo ist öffentlich.
Passwort ändern: `printf 'neu' | shasum -a 256`, Hash in `assets/js/gate.js`
bei `DIGEST` eintragen.
