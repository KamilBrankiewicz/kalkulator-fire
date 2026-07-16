# Kalkulator FIRE — plan i stan projektu

## Stan realizacji

**Zrobione (Faza 1 — MVP):**
- Kalkulator FIRE: FIRE number, wiek osiągnięcia niezależności finansowej, Coast FIRE, analiza wrażliwości (±2pp stopy zwrotu)
- Symulacja rok po rok z interpolacją miesięczną wieku FIRE
- Wykres wzrostu majątku vs cel (Chart.js z CDN)
- Zapisywanie/wczytywanie/usuwanie scenariuszy (localStorage)
- Porównanie wielu scenariuszy side-by-side (tabela + wykres wielu serii)
- Domyślne założenia edytowalne w Ustawieniach
- Dark/light mode przez CSS custom properties + `prefers-color-scheme`
- PWA: manifest.json + service worker (offline po pierwszym załadowaniu)

**Zrobione (Faza 2 — polskie konta emerytalne i podatki):**
- Model kubełkowy majątku: opodatkowane/OKI, IKE, IKZE, PPK — każdy kubełek symulowany osobno ze swoim traktowaniem podatkowym
- Podatek Belki 19% od zysków portfela opodatkowanego (śledzenie bazy kosztowej wpłat)
- OKI (Osobiste Konto Inwestycyjne, od 1.01.2027): zwolnienie z Belki zysków przypadających na aktywa do 100 tys. zł; uproszczenie — nadwyżka ponad limit liczona z Belką 19% (pomijamy alternatywny podatek od aktywów ~0,85%)
- IKZE: limit roczny (11 304 zł / 16 956 zł JDG, limity 2026 w stałej `LIMITS` w calc.js — aktualizować raz w roku), ulga PIT (12/32/19%) reinwestowana w portfel opodatkowany, ryczałt 10% przy wypłacie, dostępne od 65 lat
- IKE: limit 28 260 zł, bez podatku przy wypłacie, dostępne od 60 lat
- PPK: wpłata pracownika + pracodawcy (% pensji brutto) + dopłata państwa 240 zł/rok, dostępne od 60 lat (zakładamy wypłatę zgodną z ustawą = bez podatku; wcześniejszy zwrot nie jest modelowany)
- **Warunek pomostu**: FIRE wymaga nie tylko majątek netto ≥ cel, ale też żeby środki dostępne przed 60/65 (portfel opodatkowany/OKI) pokryły wydatki do odblokowania kont emerytalnych; gdy pomost jest wiążący, UI pokazuje żółte ostrzeżenie
- Kafelek "Struktura majątku netto w momencie FIRE" z podziałem na kubełki

**Świadomie odłożone (Faza 3):**
- Emerytura z ZUS / świadczenie państwowe — dochód od wieku emerytalnego obniżający potrzebny kapitał (symulacja dwufazowa)
- Barista FIRE jako osobny tryb (częściowa praca + częściowe pokrycie z portfela)
- Wcześniejszy zwrot z IKE/IKZE/PPK przed wiekiem ustawowym (Belka od zysków, utrata dopłat PPK) — obecnie konta traktowane jako zablokowane do 60/65
- Dokładny podatek od aktywów OKI (~0,85% od nadwyżki ponad 100 tys.) zamiast uproszczenia z Belką
- OIPE (europejska emerytura) — niszowe, pominięte
- Cloud sync między urządzeniami (ewentualny `firebase-sync.js` jako niezależny moduł, analogicznie do wzorca z poprzednich projektów) — brak potrzeby dla narzędzia jednoosobowego offline-first, dopóki nie pojawi się realna potrzeba wielu urządzeń

## Architektura

Zero bundlera, zero npm — zgodnie ze sprawdzonym wzorcem z poprzedniego projektu. Każdy plik JS to IIFE z prywatnym stanem i publicznym API (`const X = (() => {...})()`), ładowane w kolejności zależności przez `<script>` w `index.html`.

```
index.html          # struktura SPA — 4 widoki (.view) + dolna nawigacja
css/styles.css       # CSS custom properties, mobile-first, max-width 480px
js/storage.js        # jedyne miejsce dotykające localStorage — CRUD scenariuszy + ustawień
js/calc.js           # czysta logika domenowa FIRE — bez DOM, bez storage
js/chart.js          # wrapper wokół Chart.js (CDN) — wykresy pobierają kolory z CSS variables
js/ui.js             # renderowanie widoków, mapowanie kodów błędów na komunikaty PL
js/app.js            # bootstrap: event listenery, start aplikacji
manifest.json, sw.js # PWA (offline, instalowalna)
```

Warstwa danych (`storage.js`) używa wzorca encja z `id` + `createdAt`/`updatedAt` + soft-delete (`deleted: true`) — nawet bez syncu teraz, ten kształt jest gotowy pod ewentualny sync w przyszłości bez przepisywania.

Logika domenowa (`calc.js`) zwraca kody błędów (`INVALID_AGE`, `EXPENSES_EXCEED_INCOME`, `UNREACHABLE`, ...), które `ui.js` mapuje na komunikaty po polsku — rozdzielenie "co się stało" od "jak to powiedzieć użytkownikowi".

## Design

Wygląd aplikacji pochodzi z projektu w Claude Design (claude.ai/design), zaimportowanego przez narzędzie
DesignSync (projekt „Interactive FIRE app prototype”, plik `design_handoff_fire_redesign/Kalkulator FIRE.dc.html`).
Mockup zawierał gotową logikę identyczną z `js/calc.js` — więc wdrożenie było czysto wizualne: ciemny motyw
z gradientem limonka (#baff3d) → turkus (#00e08a), kolorowe akcenty per typ konta (IKZE fiolet #7c5cff,
IKE turkus, PPK bursztyn #ffb648, OKI róż #ff5c8a), szklane karty z `backdrop-filter: blur()`, hero card
z gradientową liczbą wieku FIRE i poświatą, segmentowy pasek struktury majątku. Tryb jasny to autorska
adaptacja tej samej palety (nie było w mockupie) — ciemniejsze odcienie tych samych barw dla kontrastu na białym tle.

Przy kolejnych redesignach: sprawdź `DesignSync method:list_projects` / `list_files`, żeby zobaczyć czy
w projekcie pojawił się nowy plik `.dc.html` do zaimportowania.

## Hosting

Repozytorium: https://github.com/KamilBrankiewicz/kalkulator-fire
Aplikacja live (GitHub Pages, gałąź `main`, katalog `/`): https://kamilbrankiewicz.github.io/kalkulator-fire/
Deploy = push do `main` (Pages przebudowuje się automatycznie, ~1 min). Pamiętaj o bumpie `CACHE_NAME` w `sw.js` przy zmianach.

## Jak uruchomić

Brak build stepu. Otworzyć `index.html` bezpośrednio w przeglądarce lub serwować statycznie: `node serve.cjs` (port 8743) — serwis worker wymaga `http(s)://` lub `localhost`, nie zarejestruje się z `file://` (błąd jest wyciszony, reszta aplikacji działa normalnie).

Uwaga przy pracy nad kodem: service worker cache'uje JS/CSS (stale-while-revalidate) — po zmianach w plikach podbij `CACHE_NAME` w `sw.js` (np. `fire-calc-v2` → `v3`), inaczej przeglądarka może serwować starą wersję.
