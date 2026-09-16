# ARB Carbon Technologies — strona informacyjna

Statyczna strona produkcji elementów z karbonu na zamówienie. Zawiera jasną scenę WebGL, płynne wyłanianie sekcji z rozmycia, całe klikalne karty, zakładki zastosowań, FAQ, kontakt pocztowy i lokalne przygotowanie opisu projektu. Nie wymaga zewnętrznych bibliotek ani bazy danych.

## Podgląd i publikacja

Strona działa z serwera plików statycznych. Otwieranie pliku index.html bez serwera może ograniczać JavaScript przez polityki bezpieczeństwa przeglądarki; podstawowa treść i osobna polityka prywatności pozostają zwykłymi dokumentami HTML.

## Telefony, tablety i weryfikacja

Warstwa `mobile.css` dopasowuje typografię, bezpieczne marginesy ekranu i przyciski dotykowe. Menu przechodzi w wersję rozwijaną do 1024 px, a formularz w jedną kolumnę do 600 px. Pola mają 16 px na urządzeniach dotykowych. Odnośnik „Opisz projekt” w zakładkach zastosowań ustawia właściwy obszar formularza. Animacje uwzględniają rodzaj wskaźnika, ograniczenie ruchu i dostępny budżet renderowania; brak WebGL pozostawia treść i grafikę zastępczą.

Testy nie wymagają instalowania pakietów. Z katalogu repozytorium, z Node.js 18 lub nowszym, uruchom:

    node tools/check.cjs

Polecenie sprawdza składnię i uruchamia testy formularza, menu, prywatności, sceny i generatora publikacji. Testy VM oraz emulacja szerokości nie zastępują sprawdzenia na fizycznym iPhonie/iPadzie i telefonie z Androidem. Zakres wykonanej weryfikacji jest w `SPRAWDZENIE-KODU.md`.

## Przygotowanie dla domeny

Domena i hosting nie zostały jeszcze wybrane. Nie wpisano fikcyjnych adresów canonical, sitemap ani firmy. Po wybraniu rzeczywistej domeny HTTPS uruchom z tego folderu:

    node tools/prepare-site.cjs --help
    node tools/prepare-site.cjs ADRES_HTTPS_WŁASNEJ_DOMENY

Narzędzie tworzy sąsiedni folder arb-carbon-technologies-public zawierający wyłącznie publiczne zasoby. Ustawia canonical, adresy Open Graph, dane strukturalne, sitemap.xml i robots.txt oraz aktualizuje hashe CSP. Nie nadpisuje istniejącego folderu i nie publikuje strony. Po aktualizacjach zachowaj wcześniejszy folder wynikowy pod inną nazwą lub w kopii roboczej.

Przed publikacją dopasuj informacje o logach, ich retencji, dostawcach i podstawach przetwarzania do rzeczywistego hostingu. Plik _headers jest przeznaczony dla obsługujących go hostingów statycznych, a .htaccess dla odpowiednio skonfigurowanego Apache. Inny serwer wymaga przeniesienia tych reguł do jego konfiguracji. Sam plik w folderze nie potwierdza aktywacji nagłówków. HTTPS, przekierowania wariantów domeny, kompresję, 404 i indeksację należy sprawdzić pod publicznym adresem.

Pełny zakres zmian, aktualne oficjalne źródła i kolejne czynności opisuje [SEO-I-WDROZENIE.md](SEO-I-WDROZENIE.md).

## Formularz i prywatność

Generator przygotowuje wyłącznie plik TXT. Nie wysyła wiadomości, nie składa zamówienia i nie zapisuje projektu na serwerze. Wymaga JavaScript; przy braku walidatora pola pozostają wyłączone. Kontroluje długość danych, dozwolone sektory i liczbę sztuk. Po pobraniu obowiązuje 3-sekundowa przerwa. „Wyczyść opis” usuwa pola, nie usuwa pobranego pliku.

Nie istnieje endpoint do wysyłki, więc zabezpieczenia przeglądarkowe nie są przedstawiane jako ochrona przyszłego backendu przed spamem. Dodanie prawdziwego kontaktu wymaga odbiorcy, serwera, walidacji i limitów żądań po jego stronie oraz uaktualnienia CSP i informacji o danych. Klucze tajne nie mogą trafić do publicznego JavaScript.

Kod nie korzysta z cookies, analityki, pikseli ani zewnętrznej CAPTCHA. Mapy i rejestry są zwykłymi linkami. Systemowe ograniczenie ruchu jest respektowane, animacje zatrzymują się po zakończeniu ruchu, a treść sekcji i zakładek jest dostępna w HTML.

## Edycja

- Treści, cztery panele zastosowań, dane rejestrowe, FAQ i metadane: index.html.
- Dane firmy do pobieranej wizytówki: atrybuty data-company-* w HTML. Przy zmianie adresu zaktualizuj także JSON-LD i link mapy. Nie ma telefonu ani e-maila.
- Polityka prywatności: polityka-prywatnosci.html. Panel na stronie głównej otwiera privacy.js, a wygląd określa privacy.css. Narzędzie publikacyjne synchronizuje treść panelu z osobną polityką; lokalny podgląd korzysta z kopii zawartej w index.html.
- Formularz: app.js i brief-guard.js. Nawigacja i zakładki: app.js.
- Styl podstawowy: styles.css; efekty i tło: motion.css/js, space.css, space-flow.js i space-scene.js; rozmycie sekcji: mist.css/js; poprawki dostępności: enhancements.css.
- Układ telefonów i tabletów, cele dotykowe i bezpieczne marginesy: mobile.css. Reguły są ładowane po pozostałych stylach; narzędzie publikacyjne również kopiuje ten plik.
- Pliki używane w stronie: assets/arb-logo.webp i assets/carbon-hero.webp. Oryginały PNG zachowano jako materiały źródłowe; publikacja kopiuje lżejsze wersje WebP.

Ilustracje kompozytu są koncepcyjne i nie przedstawiają wykonanych produktów ARB. Źródła materiałów i danych firmy zapisano w ZRODLA.md.
