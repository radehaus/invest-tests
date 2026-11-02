# Anforderungen WebApp Allianz Invest (Clickdummy)

Stand: 2026-11-02
Produkte und Zahlen: `Allvest/2026-11-02-products.md` im privaten Repo `jr`, bewusst nicht in diesem öffentlichen Repo. Stack und Hosting: `docs/2026-11-02-plan.md`.

## 1. Was wir bauen

Eine mobile WebApp, die sich wie eine native Finanz-App anfühlt. Zielgruppe sind Entscheider bei der Allianz. Es ist ein Clickdummy mit echten Abläufen: Produkte entdecken, konfigurieren, abschließen, Fonds kaufen und verkaufen, Portfolio ansehen. Ein Backend gibt es nicht, alles läuft im Browser.

Die Figma-Website "Vision" ist das Schaufenster. Die App ist das, was der Kunde nach "Open Account" bekommt.

## 2. Zwei Quellen, zwei Rollen

| Quelle | Wofür | Nicht wofür |
|---|---|---|
| Figma "Vision" | **Design**: Look, Farbwelt, Typo, Komponenten | Seitenaufbau einer Website übernehmen |
| Revolut-Screens | **Funktion**: welche Bausteine ein Broker-Bereich braucht | Design, dunkles Theme, Farben |

### Design nach Vision (Pflicht)

- Helle Flächen (`#f7f7f8`-artig), weiche Verläufe in Eisblau und einem warmen Hauch Orange in den Ecken.
- Hero-Flächen: unscharfer Verlauf Dunkelblau, Graublau, Rostorange. Text darauf weiß, erste Zeile halbtransparent ("Your protection." grau, "For your dependants." weiß).
- Headlines mit Farbverlauf von Hellblau nach Dunkelblau, große runde Grotesk (Allianz Neo-artig; bis zum Branding eine ähnliche freie Schrift).
- Karten: weiß bis milchglas, große Radien, sehr weicher Schatten, dünne helle Kante. Auf dunklem Grund Glas-Karten mit heller Kante.
- Primär-CTA Orange (Open Account), Sekundär Outline. Info-Buttons Blau.
- Bausteine aus Vision wiederverwenden: Segment-Schalter (60/80/90 %, Defensive/Balanced/Dynamic), Slider mit Wertefeld, Donut-Charts (Blau Sicherheit, Orange Rendite), Szenario-Chart mit drei Linien und Wert-Badges (grün, blau, beere), Ergebnis-Block mit Verlauf (Prämie), Checklisten mit blauen Haken, KI-Eingabefeld mit Funkel-Icon, Mikro und Vorschlags-Chips.
- Alle Farben, Radien, Schatten, Verläufe als Tokens in `globals.css`. Finale Allianz-Invest-Farben und Logo kommen am Ende nur über die Tokens.
- Nur Light Mode. Das dunkle Theme aus dem Setup entfällt.

### Funktion nach Revolut (Inspiration)

Aus den Screens übernehmen wir diese Bausteine, im Vision-Design:
- Invest-Startseite mit Suche oben, Produkt-Kacheln, "Top-Mover" mit Umschalter Gewinner/Verlierer, "Meistgehandelt", "Empfohlene Käufe", Beobachtungsliste.
- Detailseite pro Wertpapier: Name und Untertitel, Tabs (Überblick, Kennzahlen, Feed), großer Kurs mit Veränderung und Zeitraum, interaktiver Chart mit Scrubbing und Zeitraum-Chips (1W, 1M, 6M, 1J, 5J), Hinweis-Banner, Feed mit Meldungen, Ereignisse, feste Leiste unten mit **Kaufen** und **Verkaufen**.
- Glocke für Kursalarm, Stern für Beobachtungsliste.
- Schwebende Bottom-Navigation.

## 3. Rahmen

- **Mobile first**, Zielbreite 390 px. Auf Desktop im Telefon-Rahmen mittig, Hintergrund im Vision-Stil.
- **Sprache Englisch**, wie Vision (entschieden 2026-11-02).
- **Passwortsperre** vor allem (siehe 7).
- **Zustand bleibt erhalten** (localStorage): Ein gekaufter Fonds steht danach im Portfolio, ein abgeschlossener Vertrag im Cockpit. Versteckter Reset (z. B. lange auf Logo drücken) für die nächste Demo.
- Übergänge wie in einer App: Seiten schieben, Bottom Sheets mit Wischgeste, Zahlen zählen hoch, Erfolgsanimation nach Kauf. Motion ist da.
- Haptik-Gefühl: große Tap-Flächen, keine Hover-Abhängigkeit, kein Zoom beim Tippen in Felder.
- Persona für Demo-Daten: aus Vision, "39, engineer, around 10,000 € a month". Fiktive Kontostände. Gesamtwert ca. 30.203,34 € wie im Vision-Mockup.

## 4. Navigation

Bottom-Nav mit fünf Punkten:
1. **Home** (Cockpit)
2. **Products** (alle Produkte entdecken und abschließen)
3. **Broker** (Fondsauswahl, das neue Produkt)
4. **Chat** (KI-Assistent)
5. **Profile** (Persona, Dokumente, Einstellungen, Logout, Demo-Reset)

## 5. Screens und Flows

Priorität: **P1** muss für die erste Demo stehen, **P2** danach, **P3** zuletzt.

### 5.1 Einstieg (P1)
- Passwort-Screen im Vision-Look.
- Kurzer Splash mit Logo, dann Login-Screen (Face-ID-Animation andeuten, ein Tap genügt).

### 5.2 Home / Cockpit (P1)
- "Value of your contracts" groß, Veränderung, Chart mit Zeitraum-Chips.
- Liste der Verträge als Karten mit Wert und Pfeil (Life, Wealth, Pension Depot, Broker, später Kids und Protection).
- Schnellaktionen: Einzahlen, Auszahlen, Sparplan.
- KI-Feld "Ask me anything…" mit Chips.
- Hinweis-Karten im Revolut-Stil (z. B. "Your government top-up for 2026 has arrived").

### 5.3 Vertragsdetail (P1 für Life, sonst P2)
- Wert, Chart, Aufteilung als Donut (Life: Sicherungsteil und Renditeteil; Wealth: Anleihen und Aktien).
- Aktionen: Einzahlen, Auszahlen, Strategie wechseln (passiv/aktiv), Garantie oder Profil anpassen.
- Jede Aktion als Bottom Sheet mit Betrag, Prüfen, Bestätigen, Erfolg.

### 5.4 Products: entdecken und abschließen
Kachel-Übersicht aller Produkte (wie Revolut "Produkte"), je Produkt eine Detailseite mit Konfigurator aus Vision und am Ende ein Abschluss-Flow (Zusammenfassung, Bestätigen, Erfolg, Vertrag erscheint im Cockpit).

- **Life (P1):** Garantieniveau 60/80/90 % → Garantiedatum per Slider → Donut zeigt Aufteilung live → Strategie passiv/aktiv → Simulator (Einmalbeitrag, Monatsbeitrag, Szenarien) → Abschluss.
- **Wealth (P2):** Strategie passiv/aktiv → Profil Defensive/Balanced/Dynamic mit Donut → "Personalise with AI" (Freitext oder Chips wie "No fossil fuels", "More Asia", das Portfolio passt sich sichtbar an) → Private Markets als Zusatzmodul mit "Talk to our team" → Simulator → Abschluss.
- **Pension Depot (P2):** Zulagenrechner (10/30/150 €/eigener Betrag, Kinder hinzufügen, Balken mit Zulage) → Fondsmix-Slider zwischen Allianz Euro Bond Active UCITS ETF und Allianz World Equity Active UCITS ETF → Erklärung Aufbau- und Auszahlphase → Abschluss.
- **Protection (P3):** Prämienrechner (Alter, Summe, Laufzeit, Raucher) mit Ergebnis-Block → kurze Gesundheitsfragen → Abschluss.
- **Kids (P3):** Zwei Wege (mit Garantie über Life, oder voll investiert) → Kind anlegen → Betrag ab 1 € → "Invite family" (Großeltern zahlen ein, Teilen-Link angedeutet). **Änderungen am Produkt folgen von Jörg, erst danach bauen.**

### 5.5 Broker (P1, das neue Produkt)
Ein Fondsbroker mit einer kuratierten Fondsauswahl von Allianz Global Investors und PIMCO. Anzahl und Zahlen nur in den verschlüsselten Daten.

**Broker-Startseite**
- Suche oben.
- Vertrauens-Karte mit dem Auswahltrichter, animiert, tippbar für die Erklärung der zwei Filter. Zahlen kommen aus den verschlüsselten Daten.
- Filter-Chips: Alle, PIMCO, Allianz GI, Anleihen, Aktien, Multi Asset, Emerging Markets, ESG.
- "Top outperformers" als Liste nach Δ 5J zur Benchmark (statt Revolut "Top-Mover"). Umschalter z. B. Equity/Bonds.
- "Most bought" und "Recommended for you" (fiktiv, zur Persona passend).
- Beobachtungsliste.
- Eigenes Broker-Portfolio mit Positionen, Wert und Veränderung.

**Fonds-Detailseite**
- Kopf: Fondsname, Anbieter (PIMCO oder Allianz GI), Assetklasse, Morningstar-Sterne.
- Tabs: Overview, Key figures, Feed.
- Overview: Kurs, Veränderung, Chart mit Zeitraum-Chips und Scrubbing. Benchmark als zweite Linie zuschaltbar. Δ zur Benchmark über 5 Jahre groß als Badge.
- Key figures: Kosten, Risikoklasse, Fondsvolumen, Auflagedatum, ISIN, Top-Positionen, Länder und Sektoren als Balken.
- Feed: Meldungen und Ereignisse wie bei Revolut.
- Glocke (Kursalarm), Stern (Beobachtungsliste).
- Fest unten: **Buy** und **Sell** (Sell nur aktiv, wenn im Portfolio).

**Kauf-Flow** (Bottom Sheet, ein Daumen-Flow)
1. Einmalkauf oder Sparplan.
2. Betrag mit großem Ziffernblock, Schnellbeträge.
3. Sparplan: Rhythmus und Startdatum.
4. Prüfen: Kosten, geschätzte Anteile, Hinweis auf Basisinformationsblatt.
5. Wischen oder Halten zum Bestätigen.
6. Erfolg mit Animation, Position erscheint im Portfolio.

**Verkaufs-Flow** analog: Anteile oder Betrag, Prüfen, Bestätigen, Erfolg.

### 5.6 Chat (P2)
- KI-Assistent im Vollbild, Vision-Look.
- Kein echtes LLM (statischer Export). Vorbereitete Antworten auf die Chips aus Vision, Antworten mit Tipp-Animation, gern mit eingebetteten Karten (z. B. Mini-Simulator oder Fonds-Karte mit Buy-Button).
- Freitext bekommt eine passende Standardantwort.

### 5.7 Profile (P3)
- Persona, Dokumente (fiktive PDFs als Liste), Steuerbescheinigung, Einstellungen, Logout, Demo-Reset.

## 6. Daten

- Alle Daten als JSON im Repo, eine Datei pro Thema (`funds.json`, `contracts.json`, `persona.json`).
- **Fonds: echte Namen und echte Δ 5J zur Benchmark.** Klartext nur lokal in `data/private/source.json` (gitignored), Quelle `Allvest/2026-11-02-products.md` im privaten Repo `jr`. Anbieter und Assetklasse ergeben sich aus dem Namen.
- Kurse, Kursverlauf, ISIN, Kosten, Sterne pro Fonds gibt es nicht (Stand 2026-11-02): als plausible Platzhalter erzeugen und in der JSON mit `"placeholder": true` markieren. Später möglich: echte Werte beim Build aus einer öffentlichen Quelle ziehen, vorher Nutzungsrechte der Quelle prüfen.
- Kursverläufe deterministisch erzeugen (fester Seed), damit jede Demo gleich aussieht.

## 7. Passwortsperre und echte Daten

Entschieden 2026-11-02, Verschlüsselung von Jörg bestätigt: Wir arbeiten mit echten Allianz-Daten und setzen eine einfache Passwortsperre davor. Sollte die Allianz weitermachen, ziehen wir auf privates, bezahltes Hosting um.

**Wichtig:** Das Repo `radehaus/invest-tests` ist öffentlich. Eine reine Hash-Sperre im Browser schützt die Seite, aber nicht den Quellcode: Die JSON-Dateien mit den Fondsdaten wären im Repo und im ausgelieferten JavaScript für jeden lesbar.

Anforderung:
- Die Daten mit echten Allianz-Inhalten werden **lokal mit dem Passwort verschlüsselt** (`npm run vault`, AES-GCM, Schlüssel per PBKDF2 aus dem Passwort, Passwort aus `.env.local`). Committet wird nur der verschlüsselte Block. Die App entschlüsselt nach Eingabe des Passworts im Browser.
- Klartext-Daten und Passwort liegen nur lokal (`.gitignore`). Kein GitHub-Secret nötig, das Passwort verlässt Jörgs Rechner nicht. Nach jeder Datenänderung `npm run vault` erneut ausführen.
- Keine echten Zahlen in Doku, Code oder Commit-Texten dieses Repos.
- Performance: entschlüsselt wird **einmal** nach der Passworteingabe (PBKDF2 so einstellen, dass das auf einem Mittelklasse-Handy unter etwa 300 ms dauert). Danach liegen die Daten im Speicher und für die Sitzung in `sessionStorage`. Seitenwechsel, Charts und Kauf-Flows dürfen dadurch nicht langsamer werden. Der verschlüsselte Block wird geladen, während der Passwort-Screen sichtbar ist.
- `noindex` bleibt.
- Die alte Sperre aus `teaser-accordion` (`gate.js`) als Vorlage für Look und Ablauf nutzen.

## 8. Reihenfolge

1. Tokens auf Vision-Look umstellen, App-Rahmen, Bottom-Nav, Seitenübergänge, Passwortsperre.
2. Broker komplett (Startseite, Detail, Kauf, Verkauf, Portfolio).
3. Home/Cockpit mit Verträgen.
4. Life: Konfigurator und Abschluss, Vertragsdetail.
5. Wealth, Pension Depot.
6. Chat.
7. Protection, Kids (nach Jörgs Änderungen), Profile.
8. Branding mit Allianz-Invest-Farben und Logo.

Nach jedem Schritt deployen und Jörg den Link schicken.

## 9. Offen

- Änderungen am Kids-Produkt (kommen von Jörg, noch nicht da).
- Echte Kurse später aus einer öffentlichen Quelle ziehen? Erst nach der ersten Demo.
- Finale Farben, Logo und Schrift von Allianz Invest.
