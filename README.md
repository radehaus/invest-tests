# Invest Prototype

Mobiler UX-Showcase für Fondsanlage und Lebensversicherung. Plan und Entscheidungen: `docs/2026-11-02-plan.md`.

## Lokal starten

```bash
npm install
npm run dev      # http://localhost:3000, verschlüsselt vorher die Daten (npm run vault)
npm run build    # statischer Export nach out/
npm run preview  # wie auf GitHub Pages: http://localhost:4321/invest-tests/
```

**Vor jedem Push:** `npm run preview` starten und auf http://localhost:4321/invest-tests/ durchklicken. Die Vorschau baut wie GitHub Pages, mit Unterpfad `/invest-tests/`. Pfadfehler fallen so vorher auf.

## Daten und Passwort

Echte Allianz-Daten liegen nie im Klartext im Repo (Anforderungen Abschnitt 7).

| Datei | Inhalt | Im Repo? |
|---|---|---|
| `data/private/source.json` | Echte Fondsnamen und Δ 5J, Auswahl | nein |
| `data/private/broker.json` | daraus erzeugt, plus Platzhalter-Kennzahlen (`npm run data`) | nein |
| `.env.local` | `VAULT_PASSWORD=…` | nein |
| `public/vault.json` | verschlüsselter Block (PBKDF2 150.000 + AES-256-GCM) | ja |
| `src/data/*.json` | fiktive Persona und Verträge | ja |

Passwort ändern: Wert in `.env.local` setzen, `npm run vault`, dann `public/vault.json` committen. Der CI-Build braucht kein Passwort.

## Regeln

- Farben, Radien, Schatten nur über die Tokens in `src/app/globals.css`. So bleibt das spätere Branding ein Tausch an einer Stelle.
- Keine echten Zahlen in Code, Doku oder Commit-Texten. Sie gehören nur nach `data/private/`.
- Kein Server: keine Server Actions, keine API-Routen, keine Cookies (statischer Export).

## Deployment

GitHub Pages über `.github/workflows/deploy.yml`. Einmalig in den Repo-Einstellungen unter Pages die Quelle "GitHub Actions" wählen.
