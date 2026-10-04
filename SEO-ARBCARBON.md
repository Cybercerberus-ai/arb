# SEO dla arbcarbon.pl

Aktualizacja: 3 października 2026 r. Właściciel wskazał domenę `https://arbcarbon.pl` i hosting dPanel. Nie potwierdzono publikacji ani dostępu do Search Console.

## Zmiany

- Tytuł zaczyna się od ARB Carbon Technologies; widoczne treści wyjaśniają skróty ARB Carbon i ARB.
- Opis materiału i FAQ wyjaśniają określenia carbon, karbon i włókno węglowe.
- Obie strony mają canonical, absolutne adresy udostępniania i JSON-LD dla arbcarbon.pl.
- robots.txt wskazuje sitemap.xml. Mapa zawiera dwa rzeczywiste dokumenty HTML.
- Hashe danych JSON-LD zaktualizowano w meta CSP, _headers i .htaccess.

## Wdrożenie na dPanel

Wgraj pliki publiczne przygotowane przez `node tools/prepare-site.cjs https://arbcarbon.pl` do katalogu obsługującego domenę. Uwzględnij ukryty plik .htaccess, jeżeli serwer obsługuje Apache. Generator nie wysyła plików na hosting. Dane dotyczące hostingu w polityce prywatności trzeba uzupełnić według faktycznej konfiguracji.

W panelu hostingu ustaw certyfikat HTTPS i trwałe przekierowania HTTP oraz www na https://arbcarbon.pl. Przekierowanie /index.html na / jest również zalecane. Sposób konfiguracji zależy od serwera i proxy; nie dodano reguł, które mogłyby powodować pętlę przekierowań.

Po publikacji sprawdź kody 200 dla strony, polityki, robots.txt i sitemap.xml oraz prawdziwe 404 dla nieistniejącego adresu. Sprawdź dostępność zasobów i brak blokady robotów w konfiguracji hostingu.

## Google Search Console

1. Dodaj usługę domenową arbcarbon.pl i zweryfikuj ją rekordem TXT otrzymanym od Google, w panelu właściwego dostawcy DNS.
2. Zgłoś https://arbcarbon.pl/sitemap.xml.
3. W inspekcji adresu https://arbcarbon.pl/ wykonaj test opublikowanego URL i poproś o indeksowanie.
4. Sprawdzaj raport indeksowania i skuteczność dla ARB, ARB Carbon, ARB Carbon Technologies, carbon i karbon.

Pierwsza pozycja nie jest gwarantowana. Frazy carbon i karbon mają szersze znaczenie niż oferta firmy. Rozwijaj stronę o prawdziwe realizacje, zdjęcia i konkretne opisy produkcji zatwierdzone przez ARB; nie dodawaj fikcyjnych ocen, realizacji ani sztucznego powtarzania fraz.

Źródło: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). Efekty zmian mogą wymagać ponownego pobrania strony i czasu na przetworzenie przez Google.
