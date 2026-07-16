# Kalkulator FIRE 🔥

Kalkulator niezależności finansowej i wcześniejszej emerytury (FIRE) dla polskich realiów.

**Funkcje:**
- FIRE number, wiek osiągnięcia FIRE, Coast FIRE, analiza wrażliwości ±2pp
- Polskie konta emerytalne: IKE, IKZE (z ulgą PIT), PPK (z dopłatami pracodawcy i państwa) oraz OKI (od 2027)
- Podatek Belki 19% i warunek pomostu (konta emerytalne odblokowują się w wieku 60/65 lat)
- Zapisywanie scenariuszy i porównanie side-by-side (localStorage — dane tylko w Twojej przeglądarce)
- Wszystkie kalkulacje w wartościach realnych (dzisiejsza siła nabywcza), PWA działająca offline

**Stack:** vanilla JS bez bundlera i npm (moduły IIFE), Chart.js z CDN, CSS custom properties (dark/light).

**Uruchomienie:** otwórz `index.html` w przeglądarce albo `node serve.cjs` (http://localhost:8743).

Szczegóły architektury i stan projektu: [PLAN.md](PLAN.md).
