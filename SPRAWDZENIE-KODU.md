# Sprawdzenie kodu

## Okno danych firmy — 1 października 2026

- Naprawiono przewijanie strony za otwartym oknem danych firmy. Tło zachowuje pozycję, zawartość okna można przewijać, a zamknięcie przywraca obie osie przewijania i fokus na przycisku otwierającym.
- Naprawiono przypadkowe zamykanie okna podczas zaznaczania tekstu i przeciągania poza jego krawędź. Zamknięcie przez tło wymaga rozpoczęcia i zakończenia kliknięcia poza oknem; anulowany gest dotykowy nie zamyka okna.
- Animacje tła pozostają wstrzymane przy otwartych danych firmy. Po zamknięciu odświeżają wymiary także po obrocie urządzenia. Uwzględniono wydruk i fallback bez natywnego API dialogu.
- Oba błędy odtworzono w Chromium przed zmianą i potwierdzono ich naprawę. Sprawdzono komputer, ekran 390 × 844, obrót do 844 × 390, przewijanie wnętrza okna, zamknięcie kliknięciem w tło i powrót do polityki prywatności. Dodatkowe testy wykonują rzeczywisty kod dialogu; na wersji sprzed naprawy wykrywają błędy. Kontrola nie obejmuje fizycznych telefonów ani natywnego Safari.

Weryfikacja końcowa: 41 testów zaliczonych, składnia 9 skryptów poprawna, kontrola HTML i nagłówków HTTP bez błędów. Konsola sprawdzonej strony bez błędów i ostrzeżeń.

## Kontakt i przegląd — 30 września 2026

- Dodano numer +48 664 039 201 do sekcji kontaktowej, okna danych firmy, wizytówki vCard i danych strukturalnych. Odnośniki używają międzynarodowego formatu `tel:+48664039201`.
- Zaktualizowano hashe CSP odpowiadające danym strukturalnym oraz dokumentację danych kontaktowych.
- Składnia 9 skryptów i 34 testy zakończone bez błędów. Dodatkowa kontrola pełnego handlera vCard potwierdziła poprawny telefon, e-mail, adres, format pliku i zwalnianie tymczasowego URL. Kontrola HTML, odnośników, zasobów i lokalnych nagłówków HTTP zakończona poprawnie.
- W Chromium sprawdzono kontakt na komputerze i ekranie 320 px, menu, kartę prowadzącą do formularza, walidację, przygotowanie i czyszczenie opisu oraz zamknięcie polityki po obrocie do 844 × 390. Nie znaleziono nowych błędów w sprawdzonym zakresie. Testy nie obejmują fizycznych telefonów, połączenia telefonicznego ani natywnego Safari.

## Przegląd — 23 września 2026

- Poprawiono reguły wydruku przy otwartej polityce prywatności: blokada przewijania strony nie pozostawia na wydruku stałego pozycjonowania ani przesunięcia treści. Zmiana dotyczy wyłącznie stylów wydruku.
- Odnośnik „Polityka prywatności” pod formularzem pozostaje jednym obszarem klikania na wąskim ekranie. Wcześniej łamał się pomiędzy dwoma wierszami, przez co środek jego obwiedni mógł wypadać poza tekstem.
- Ponownie sprawdzono obsługę animacji, ograniczenie ruchu, ukrywanie karty i okna modalne; nie stwierdzono nowych błędów w tych mechanizmach.

Weryfikacja: składnia 9 skryptów i 34 testy raportowane przez Node — bez błędów. Kontrola HTML, identyfikatorów, odnośników, lokalnych zasobów i nagłówków serwera zakończona poprawnie. W Chromium sprawdzono widok 320 px, otwieranie polityki z formularza, zamykanie panelu, FAQ oraz obsługę klawiaturą okna danych firmy. Poprawkę wydruku zweryfikowano przez przegląd kaskady CSS; nie wykonywano rzeczywistego wydruku. Testy nie obejmują fizycznych urządzeń ani natywnego Safari. Formularz nadal przygotowuje lokalny plik TXT, bez wysyłania wiadomości.

## Przegląd — 18 września 2026

- Naprawiono odświeżanie animacji po zamknięciu polityki prywatności, jeśli podczas jej wyświetlania obrócono urządzenie lub zmieniono rozmiar okna. Tło pozostaje wstrzymane podczas otwartej polityki, a po zamknięciu otrzymuje aktualne wymiary przed wznowieniem przewijania.
- Dodano test współpracy polityki ze sceną dla obrotu urządzenia, starszego mechanizmu wysokości ekranu oraz zmiany rozmiaru na komputerze przy ograniczeniu ruchu.
- Sprawdzono menu mobilne, przejścia z kart, zakładki i klawiaturę, wybór obszaru projektu, walidację i czyszczenie formularza, spis treści polityki oraz zamykanie i przywracanie fokusu. Lokalne pliki, odnośniki, identyfikatory i referencje ARIA są poprawne.

Weryfikacja: składnia 9 skryptów i 34 testy raportowane przez Node — bez błędów. W Chromium sprawdzono zmianę widoku 390 × 844 na 844 × 390 z otwartą polityką: po zamknięciu płótno przyjmuje prawidłowe proporcje, znika blokada przewijania i wraca fokus. Konsola bez błędów i ostrzeżeń. Testy nie obejmują fizycznych urządzeń ani natywnego Safari. Formularz nadal przygotowuje lokalny plik TXT, bez wysyłania wiadomości.

## Przegląd — 16 września 2026

### Telefony i tablety

- Poprawiono wielkość nagłówków, tekstów i pól dotykowych; menu kompaktowe działa do 1024 px, a formularz na telefonie ma jedną kolumnę. Pola na ekranach dotykowych mają 16 px; zachowano możliwość powiększania strony.
- Menu zamyka się po wybraniu sekcji, kliknięciu poza nim, Escape, wyjściu fokusu i zmianie układu. Fokus trafia do wybranej sekcji.
- Odnośniki w zakładkach zastosowań są dostępne także na telefonie i przenoszą wybrany obszar do formularza.
- Usunięto poziome przepełnienie pochodzące z dekoracyjnych warstw karbonu na małych ekranach. Uzupełniono odstępy tekstów po ukrytych łamaniach wierszy.
- Polityka ma stabilną blokadę przewijania, przywraca pozycję obu osi i fokus; wysokość panelu oraz marginesy uwzględniają paski przeglądarki i bezpieczny obszar ekranu. Dodano fallback jednostek vh/svh/dvh.
- Na urządzeniach z głównym wskaźnikiem dotykowym ograniczono gęstość renderowania WebGL i liczbę wierzchołków. Zmiana wysokości od klawiatury/pasków nie realokuje stale płótna. Scena odtwarza się po utracie kontekstu GPU; przy braku WebGL pozostaje obraz zastępczy. Wyłanianie z rozmycia zachowano.
- Do repozytorium dołączono powtarzalne testy oraz `node tools/check.cjs`; generator publikacyjny kopiuje nowe style mobilne.

Weryfikacja: składnia 9 skryptów, 33 testy raportowane przez Node (w tym zestawy z 17 kontrolami walidatora i 13 kontrolami publikacji) — bez błędów. W przeglądarce sprawdzono układy 320, 390, 600, 768, 834 i 1024 px oraz poziomy 844 × 390. Nie stwierdzono poziomego przepełnienia dla testowanych widoków mobilnych. Zweryfikowano menu, karty, zakładki, wybór obszaru formularza, niepoprawne dane oraz politykę z powrotem do poprzedniej pozycji. Konsola sprawdzanej strony bez błędów i ostrzeżeń. Sprawdzono również układ desktop przy 1440 px.

Testy przeglądarkowe wykonano w Chromium przy emulowanych rozmiarach. Nie wykonywano testów na fizycznym iPhonie/iPadzie ani w natywnym Safari. Zachowanie utraty WebGL, klawiatury i ustawień ruchu sprawdzają testy VM; nie jest to pomiar wydajności konkretnego telefonu.

Odniesienia implementacyjne: [jednostki viewport i dialog w WebKit](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/), [bezpieczne marginesy env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env).

## Wcześniejszy przegląd — 14 września 2026

Naprawione błędy:

- Oddzielono animację panelu prywatności od animacji pozostałych okien. Dwa wcześniejsze moduły nadpisywały lub anulowały jej płynne otwieranie.
- Spis treści polityki przenosi także fokus do wybranej sekcji; zamknięcie przywraca fokus i pozycję strony głównej.
- Wyłanianie odnośników i przycisków nie zmienia ich położenia między naciśnięciem a puszczeniem myszy. Rozmycie pozostaje aktywne.
- Menu usuwa poprzednie wskazanie aktywnej sekcji po powrocie na początek strony.
- Tekst danych firmy na wydruku ma czytelny, ciemny kolor.
- Pakiet publikacyjny zawiera style i skrypt polityki, a generator synchronizuje treść panelu z osobną stroną polityki.

Weryfikacja:

- Sprawdzenie składni JavaScript: bez błędów.
- Walidacja danych: 17 scenariuszy zaliczonych.
- Rzeczywisty kod obsługi formularza w środowisku testowym: walidacja, treść pliku TXT, limit powtórzeń, czyszczenie pól i brak walidatora — poprawne wyniki.
- Panel prywatności: 7 testów zaliczonych, w tym ograniczenie animacji i obsługa klawiaturą.
- Przygotowanie publikacji: 13 testów zaliczonych, w tym synchronizacja polityki, metadane, CSP oraz ochrona przed nadpisaniem folderu.
- HTML, odnośniki, pliki i nagłówki lokalnego serwera: poprawne wyniki.
- Podgląd w przeglądarce: zakładki i strzałki klawiatury, całe karty, błędne dane formularza, powrót na początek, okna danych i polityki, pierwsze kliknięcie w wyłaniający się odnośnik — sprawdzone. Brak zgłoszonych błędów i ostrzeżeń konsoli, brak niezaładowanych obrazów i poziomego przepełnienia w używanym rozmiarze okna.

Formularz nadal przygotowuje lokalny plik TXT. Wysyłka wiadomości nie jest podłączona. Domena i hosting wymagają późniejszej konfiguracji opisanej w SEO-I-WDROZENIE.md; nie wykonano publicznego wdrożenia ani pomiarów ruchu produkcyjnego.
