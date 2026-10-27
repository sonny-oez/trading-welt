# Trading-Welt

Mobil-first PWA: ein Recherche-Desk als 3D-Szene, darüber öffentliche Hyperliquid-Marktdaten.
Es wird nicht gehandelt. Kein Wallet, keine Schlüssel, kein Schreibzugriff.

Öffentliche URL nach dem Deploy: <https://sonny-oez.github.io/trading-welt/>

## Lokal

```bash
npm ci
npm run dev
```

Öffnen: <http://localhost:5173/trading-welt/>

## GitHub Pages

Die Action `.github/workflows/pages.yml` baut bei jedem Push auf `main` und deployed das `dist`-Verzeichnis.

Einmalig im Repository einstellen:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

Ohne diese Quelle läuft der Workflow ins Leere. Nach dem ersten grünen Lauf ist die App unter der URL oben erreichbar. Auf dem iPhone: Safari → Teilen → „Zum Home-Bildschirm“.

## Desk-Status

`src/data/desk-status.json` steuert Modus, Bot-Texte und die Sicherheitsflags.
Die Datei ist öffentlich. Keine privaten Notizen, Pfade oder internen IDs hineinschreiben.

## Daten

Der Browser liest nur `POST https://api.hyperliquid.xyz/info` und optional `wss://api.hyperliquid.xyz/ws`.
Antworten der API werden nicht als frische Daten im Service Worker gecacht.
