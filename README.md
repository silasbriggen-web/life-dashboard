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
3. **Authentication → Sign In / Providers → Email**: aktiviert lassen, aber **„Confirm email“ ausschalten** → Save.
   (Die App meldet sich mit E-Mail + Passwort an, einmal pro Gerät. Ohne diese Einstellung müsste man
   zuerst einen Mail-Link bestätigen, und der eingebaute Mailversand von Supabase ist stark begrenzt.)
4. **Authentication → URL Configuration → Site URL**: deine GitHub-Pages-Adresse eintragen.
5. *Nachdem* du in der App dein Konto erstellt hast (Schritt 3): **Authentication → Sign In / Providers →
   „Allow new users to sign up“ ausschalten**. Dann kann niemand sonst ein Konto in deinem Projekt anlegen.
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
2. Danach oben in **Sync between devices** E-Mail und ein neues Passwort (mind. 8 Zeichen) eingeben →
   **Create account**. Die Daten dieses Geräts werden zur Cloud-Kopie.
3. Auf dem zweiten Gerät dieselbe E-Mail und dasselbe Passwort → **Sign in** – die Daten kommen aus der Cloud.

Passwort vergessen? Supabase → **SQL Editor** →
`update auth.users set encrypted_password = crypt('NEUES-PASSWORT', gen_salt('bf')) where email = 'DEINE-MAIL';` → Run.

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
3. E-Mail, Passwort und ggf. 2FA-Code selbst eintippen. Ist die GitHub-CLI (`gh`) angemeldet, speichert
   das Script den Token direkt als Secret `GARMIN_TOKENS`. Sonst (oder mit `--print`) gibt es ihn als lange
   Zeile aus, die du in 4b einträgst. Wie ein Passwort behandeln.

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

## 5. Waage (Zepp Life) über Apple Health

Zepp Life hat keine offene Schnittstelle, schreibt aber jedes Gewicht in Apple Health. Ein iPhone-Kurzbefehl
schickt das neueste Gewicht an Supabase (Funktion `add_weight`), die App übernimmt es wie die Garmin-Werte.
Von Hand eingetippte Gewichte gewinnen immer, die Waage gewinnt gegen Garmin.

1. **Supabase → SQL Editor → New query** → Inhalt von `supabase/scale.sql` → **Run**.
2. **Zepp Life** → *Profil* → *Apple Health* (bzw. *Konten hinzufügen → Apple Health*) → einschalten und Gewicht erlauben.
3. In der App **More → Setup → Scale (Zepp Life) → Create Shortcut key**.
4. iPhone → App **Kurzbefehle** → **Automation** → **+** → **App** → *Zepp Life*, **Ist geschlossen**, **Sofort ausführen** → Weiter → **Neue leere Automation**:
   1. Aktion **„Health-Messwerte suchen“** (*Find Health Samples*): Typ **Gewicht**, Sortieren nach **Startdatum**,
      Reihenfolge **Neueste zuerst**, **Begrenzen** an, **1** Messwert.
   2. Aktion **„Inhalte von URL abrufen“** (*Get Contents of URL*): URL = in der App **Copy** bei *1. URL* und einfügen.
      Aufklappen: Methode **POST**, Anfragetext **JSON**, drei Felder hinzufügen:
      - `p_token` (Text) = in der App **Copy** bei *2. Key*, einfügen
      - `p_kg` (Text) = Variable **Health-Messwerte** antippen → **Wert**
      - `p_when` (Text) = Variable **Health-Messwerte** antippen → **Startdatum**, Datumsformat **ISO 8601**
5. Testen: Kurzbefehl einmal mit ▶ ausführen. Antwort `Saved 72.4 kg for 2026-…` heisst: es klappt.

Ab dann: auf die Waage, Zepp Life kurz öffnen (synchronisiert die Messung), schliessen – das Gewicht steht
nach dem nächsten Öffnen in der App. Neuer Key unter More → Setup macht den alten ungültig.

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
