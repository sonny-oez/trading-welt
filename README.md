# Trading-Welt

Mobil-first PWA: ein Recherche-Desk als 3D-Szene, darüber öffentliche Hyperliquid-Marktdaten
und eine virtuelle Demo (Papierhandel mit 100 virtuellen USD).
Keine echten Orders, kein echtes Wallet, keine Schlüssel, kein Schreibzugriff auf die Börse.

Öffentliche URL nach dem Deploy: <https://sonny-oez.github.io/trading-welt/>

## Lokal

```bash
npm ci
npm run dev
```

Öffnen: <http://localhost:5173/trading-welt/>

## GitHub Pages

Die Action `.github/workflows/pages.yml` baut bei einem Push auf `main` und deployed das `dist`-Verzeichnis.
Ein Push, der nur `public/demo/**` ändert, startet keinen Deploy: die App liest diese Datei zur Laufzeit von GitHub.

Einmalig im Repository einstellen:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

Ohne diese Quelle läuft der Workflow ins Leere. Nach dem ersten grünen Lauf ist die App unter der URL oben erreichbar. Auf dem iPhone: Safari → Teilen → „Zum Home-Bildschirm“.

## Desk-Status

`src/data/desk-status.json` steuert Modus, Bot-Texte und die Sicherheitsflags.
Die Datei ist öffentlich. Keine privaten Notizen, Pfade oder internen IDs hineinschreiben.

## Demo

Die Ansicht **Demo** zeigt ein virtuelles Papierkonto. Startkapital sind 100 virtuelle USD, bewertet zu öffentlichen Hyperliquid-Kursen.
Die Simulation läuft auf einem anderen Rechner und schreibt `public/demo/state.json` auf `main`.
Die App lädt zur Laufzeit

`https://raw.githubusercontent.com/sonny-oez/trading-welt/main/public/demo/state.json`

mit Cache-Busting, etwa alle 60 Sekunden. Fehlt die Datei, erscheint „Demo startet gleich / noch keine Trades“.
Ist `updated_utc` älter als 30 Minuten, erscheint „Simulation pausiert“.

## Daten

Der Browser liest nur `POST https://api.hyperliquid.xyz/info`, optional `wss://api.hyperliquid.xyz/ws`,
und die öffentliche Demo-Datei oben. Es gibt keinen Aufruf von `/exchange`.
Antworten der API werden nicht als frische Daten im Service Worker gecacht.
