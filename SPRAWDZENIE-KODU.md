# Sprawdzenie kodu — 14 września 2026

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
