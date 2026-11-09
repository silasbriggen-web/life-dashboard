# Life dashboard

Persönliches Dashboard für Training, Tagesroutine, Plan und Ziele. Läuft als **Web-App (PWA)**:
auf dem iPhone über „Zum Home-Bildschirm“, auf Windows als installierte App aus Edge/Chrome.
Offline nutzbar, mit optionalem Cloud-Sync (Supabase) und automatischem Garmin-Import (GitHub Actions).

```
index.html, css/, js/, icons/, manifest.webmanifest, sw.js   → die App (GitHub Pages)
supabase/schema.sql                                          → Datenbank für Sync + Garmin
garmin/sync.py, .github/workflows/garmin.yml                 → holt Garmin-Werte 3× täglich
```

> **Wichtig:** Das Repo ist öffentlich (GitHub Pages ist gratis nur für öffentliche Repos).
> Kontostände und andere private Werte stehen deshalb **nicht** im Code, sondern nur in deinem
> Backup bzw. in Supabase hinter deinem Login. Trainings- und Lernplan sind im Code sichtbar.
> Die alte Datei `silas-dashboard.html` ist per `.gitignore` ausgeschlossen – lade sie nicht hoch.

---

## 0. Backup aus der alten Version holen

Öffne die bisherige Version (dort, wo du sie heute benutzt) → **More → Setup → Show backup text**
→ **Copy backup text** und speichere den Text z. B. in einer Notiz. Damit ziehst du gleich alles um.

## 1. Auf GitHub stellen

1. Auf github.com ein neues **öffentliches** Repository anlegen, z. B. `life-dashboard`.
2. Dateien hochladen: **Add file → Upload files** und den ganzen Ordnerinhalt hineinziehen
   (inkl. `.github`, `.nojekyll`, `.gitignore`; **ohne** `silas-dashboard.html`).
   Bequemer für spätere Updates: [GitHub Desktop](https://desktop.github.com/) installieren.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, Branch `main`, Ordner `/ (root)` → Save.
4. Nach 1–2 Minuten läuft die App unter `https://<dein-github-name>.github.io/life-dashboard/`.

## 2. Supabase (Sync zwischen iPhone und PC)

1. Auf supabase.com kostenlos registrieren → **New project** (Region z. B. *Central EU (Zurich)*), Datenbank-Passwort sicher ablegen.
2. **SQL Editor → New query** → Inhalt von `supabase/schema.sql` einfügen → **Run**.
3. **Authentication → Sign In / Providers → Email**: aktiviert lassen.
4. **Authentication → Emails → Templates → Magic Link**: in den Text zusätzlich den Code einfügen, z. B.
   `<p>Dein Code: <b>{{ .Token }}</b></p>`
   (Die App meldet sich per Code an, weil Links auf dem iPhone im Safari statt in der Home-Bildschirm-App aufgehen.)
5. **Authentication → URL Configuration → Site URL**: deine GitHub-Pages-Adresse eintragen.
6. **Project Settings → API Keys**: die `Project URL` (unter *Data API*) und den Key `anon` / `public`
   (Reiter *Legacy API Keys*, beginnt mit `eyJ…`) kopieren und in `js/config.js` eintragen.
   Der anon-Key darf öffentlich sein, die Datenbank-Regeln (Row Level Security) schützen deine Daten.
7. In `sw.js` die Zeile `const VERSION = …` hochzählen (z. B. `-2` statt `-1`) und beide Dateien neu hochladen.

> Gratis-Projekte pausieren nach 7 Tagen ohne Aktivität. Der Garmin-Import (Schritt 4) greift täglich zu und hält das Projekt wach.

## 3. Installieren und Daten umziehen

**iPhone:** Safari → deine Adresse öffnen → Teilen-Symbol → **Zum Home-Bildschirm**. Ab jetzt immer über das Icon öffnen.

**Windows:** Edge (oder Chrome) → Adresse öffnen → in der Adressleiste das Symbol **App installieren** (oder Menü ⋯ → Apps → *Diese Website als App installieren*). Die App erscheint im Startmenü, lässt sich an die Taskleiste heften und das Fenster frei vergrössern – ab 900 px Breite zeigt sie Seitenleiste und Spalten.

**Daten umziehen (einmalig, auf dem ersten Gerät):**
1. In der neuen App **More → Setup → Restore** den Backup-Text aus Schritt 0 einfügen → *Restore from text*.
2. Danach oben in **Sync between devices** deine E-Mail eingeben → Code aus der Mail eintippen.
   Die Daten dieses Geräts werden zur Cloud-Kopie.
3. Auf dem zweiten Gerät nur anmelden – die Daten kommen aus der Cloud.

Ab dann synchronisiert die App automatisch (ein paar Sekunden nach jeder Änderung und beim Öffnen).
Offline geht alles weiter und wird später nachgeholt. Haben beide Geräte offline etwas geändert,
gewinnt die neuere Änderung; die andere Version liegt als *Spare copy* unter More → Setup und lässt sich zurückholen.

## 4. Garmin-Import

Garmin bietet Privatpersonen keine offizielle Schnittstelle. Das Script nutzt die inoffizielle
Bibliothek [`garminconnect`](https://pypi.org/project/garminconnect/) – also dieselbe Anmeldung wie
connect.garmin.com. Es kann ausfallen, wenn Garmin etwas ändert; die App zeigt dann
„Garmin data missing since …“.

Übernommen werden: Gewicht, Schlaf, Ruhepuls (Wochenmittel als Benchmark), VO₂max, Cardio-Einheiten
(Lauf, Rad/Zwift, Schwimmen, Fussball, lange Wanderungen). Auf der Today-Seite erscheinen zusätzlich
HRV, Body Battery und Schritte. **Werte, die du selbst eintippst, werden nie überschrieben.**

### 4a. Garmin-Token erzeugen (empfohlen, funktioniert auch mit 2-Faktor-Login)

1. Python installieren (einmalig): in PowerShell `winget install Python.Python.3.12`, Terminal neu öffnen.
2. Im Projektordner:
   ```bash
   pip install -r garmin/requirements.txt
   ```
   ```bash
   python garmin/get_token.py
   ```
3. E-Mail, Passwort und ggf. 2FA-Code selbst eintippen. Die ausgegebene lange Zeile ist dein Token
   (ca. 1 Jahr gültig). Wie ein Passwort behandeln.

*Alternative ohne Python:* statt `GARMIN_TOKENS` die Secrets `GARMIN_EMAIL` und `GARMIN_PASSWORD` setzen
(geht nur ohne 2-Faktor-Anmeldung; dann liegt dein Passwort verschlüsselt in GitHub).

### 4b. Secrets in GitHub eintragen

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Wert |
|---|---|
| `GARMIN_TOKENS` | Token aus 4a |
| `SUPABASE_URL` | Project URL aus Schritt 2 |
| `SUPABASE_SERVICE_KEY` | Project Settings → API Keys → `service_role` (Legacy) oder ein `sb_secret_…` Key (**geheim**, nie in die App!) |
| `SUPABASE_USER_ID` | Authentication → Users → deine User-ID (gibt es nach der ersten Anmeldung in der App) |

### 4c. Starten

**Actions → Garmin import → Run workflow** (beim ersten Mal z. B. `30` Tage eintragen).
Danach läuft er automatisch um ca. 06:30, 13:00 und 21:00. In der App: **More → Setup → Load Garmin data**
oder einfach die App neu öffnen.

Lokal testen ohne Upload: Umgebungsvariable `GARMIN_TOKENS` setzen und `python garmin/sync.py --dry-run`.

## 8. Push-Erinnerungen (auch bei geschlossener App)

Die App berechnet laufend, was wann fällig wird (dieselbe Logik wie die Karte „To do now“), und legt
diesen Plan in Supabase ab. Eine Supabase Edge Function schaut alle 5 Minuten nach und schickt fällige
Erinnerungen an alle Geräte, auf denen du sie eingeschaltet hast. Gebündelt auf höchstens ca. 7 Zeitpunkte
pro Tag (Aufstehen, 07:45, 12:00, 16:00, 19:00, 21:00 Abend-Check, 22:00). Abgehaktes wird nicht erinnert.

1. **Schlüssel erzeugen** – in PowerShell im Projektordner:
   ```bash
   powershell -ExecutionPolicy Bypass -File push\make-vapid-keys.ps1
   ```
   Den `VAPID_PUBLIC_KEY` in `js/config.js` bei `vapidPublicKey` eintragen. Den `VAPID_PRIVATE_KEY` nur in Supabase (Punkt 3) verwenden.
2. **Edge Function anlegen** – Supabase → **Edge Functions → Deploy a new function → Via Editor**,
   Name `push-reminders`, Inhalt von `supabase/functions/push-reminders/index.ts` einfügen → **Deploy**.
3. **Secrets** – Supabase → **Edge Functions → Secrets** → drei Einträge:
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (= `mailto:` + deine E-Mail).
4. **Tabellen und 5-Minuten-Takt** – `supabase/push.sql` öffnen, unten `YOUR-PROJECT-REF` (der Teil vor
   `.supabase.co` in deiner Project URL) und `YOUR-ANON-KEY` ersetzen → im **SQL Editor** ausführen.
5. `js/config.js` und `sw.js` (VERSION hochzählen) hochladen.
6. **Pro Gerät einschalten**: App öffnen (iPhone: über das Home-Bildschirm-Icon!) → **More → Setup → Reminders →
   Turn on reminders** → Benachrichtigungen erlauben → **Send a test**. Nach 1–6 Minuten kommt die Test-Nachricht.

Gut zu wissen: Der Plan reicht drei Tage voraus und wird bei jedem Öffnen und jeder Änderung erneuert.
Wenn du die App länger als drei Tage nicht öffnest, kommen keine Erinnerungen mehr. Unter Windows kommen
Nachrichten nur, solange Edge im Hintergrund läuft (Standard). Läuft die Funktion nicht, findest du die
Logs unter Supabase → Edge Functions → push-reminders → Logs.

## Updates einspielen

1. Dateien ändern.
2. In `sw.js` die `VERSION` hochzählen – sonst zeigen installierte Apps weiter die alte Version.
3. Hochladen. Beim nächsten Öffnen erscheint in der App **New version ready → Reload now**.

Lokal entwickeln: einen beliebigen statischen Server im Ordner starten und `http://localhost:…` öffnen.
Der Offline-Cache ist auf localhost aus (mit `?sw=1` an der Adresse einschaltbar).

## Später: echte iOS-App?

Eine Store- oder TestFlight-Version braucht einen Apple-Developer-Account (99 USD/Jahr) und einen
Mac bzw. Cloud-Build. Gratis geht nur Xcode auf einem Mac mit Ablauf nach 7 Tagen. Die PWA deckt
„nur für mich“ vollständig ab. Falls später nötig, lässt sich dieselbe App mit Capacitor verpacken
(dann wäre auch Apple Health als zweite Garmin-Quelle möglich).
