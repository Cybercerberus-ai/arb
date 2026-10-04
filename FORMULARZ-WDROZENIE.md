# Formularz zapytań ARB

Formularz wysyła dane projektu, imię i nazwisko, adres e-mail i telefon na `kontakt@arbcarbon.pl`. Pole firmy jest opcjonalne. Przycisk Odpowiedz w programie pocztowym kieruje odpowiedź na adres pytającego.

## Wdrożenie

1. Wykonaj kopię aktualnego katalogu `arbcarbon.pl/public_html`.
2. Wgraj komplet plików z paczki publikacyjnej do tego katalogu, włącznie z `inquiry.php` i `.htaccess`. Wymagane PHP 8.1 lub nowsze (w dPanel ustawione 8.4).
3. PHP musi mieć prawo tworzenia folderu `arbcarbon.pl/.arb-inquiry` poza public_html. Folder służy ograniczeniu spamu; nie udostępniaj go przez WWW. Przy ograniczeniu open_basedir uwzględnij ten katalog albo utwórz go wcześniej z odpowiednimi uprawnieniami.
4. Wykonaj rzeczywiste zapytanie testowe i potwierdź odbiór na `kontakt@arbcarbon.pl`, także w folderze spam. Sprawdź Odpowiedz oraz telefon. Przy braku wiadomości sprawdź logi `.logs/mail/` w katalogu konta dhosting.

Wysyłka korzysta z funkcji PHP mail() na hostingu dhosting. `true` z mail() oznacza przyjęcie przez serwer, a nie gwarancję dostarczenia; komunikat formularza zachowuje to rozróżnienie. Nie ma hasła pocztowego w kodzie ani automatycznej kopii na dowolny adres odwiedzającego.

## Ochrona i ograniczenia

Serwer kontroluje typy danych, długości pól, e-mail, telefon, liczbę sztuk, dozwolone sektory, rozmiar żądania, Origin i JSON Content-Type. Nagłówki poczty mają stałego nadawcę i odbiorcę. Ukryte pole ogranicza proste boty. Limity: minimum minuta między nowymi zgłoszeniami z jednego IP, maksymalnie 5 prób na 15 minut z IP i 60 na godzinę łącznie. To podstawowe zabezpieczenia, nie pełna ochrona przed rozproszonym spamem.

Powtórzenie identycznego zapytania z tym samym identyfikatorem przez 24 godziny nie wysyła kolejnej wiadomości. Identyfikator jest przechowywany w pamięci bieżącej strony; po odświeżeniu lub wyczyszczeniu formularza powstaje nowy. Treść i dane kontaktowe nie trafiają do pliku limitów. Nie usuwaj go podczas normalnej pracy, bo wyzeruje to ochronę przed powtórzeniami.

## Testy

`node tools/check.cjs` sprawdza kod JS, formularz (sukces i awarie), walidację i publikację. `php -l inquiry.php` sprawdza składnię, a `php tests/inquiry.test.php` — walidację serwera i budowę wiadomości. Lokalnie sprawdzono też HTTP z atrapą SMTP bez wysyłania rzeczywistych wiadomości: 405, 403, 415, 422, sukces, powtórzenie, konflikt identyfikatora oraz 429.

Wdrożono na arbcarbon.pl 3 października 2026. Osiem zmienionych plików porównano bajt po bajcie przez FTPS. Test z przeglądarki zakończył się przyjęciem wiadomości przez serwer. Odbiór w skrzynce wymaga potwierdzenia właściciela. Zachowano produkcyjne przekierowania HTTPS i informacje o logach hostingu. Kopię poprzedniej wersji wykonano przed publikacją.

Źródła: [PHP mail](https://www.php.net/manual/en/function.mail.php), [dhosting — poczta i mail()](https://dhosting.pl/pomoc/baza-wiedzy/poczta-e-mail/), [logi mail()](https://dhosting.pl/pomoc/baza-wiedzy/gdzie-znajde-logi-z-funkcji-php-mail/).
