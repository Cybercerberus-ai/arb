# SEO, prywatność i wdrożenie ARB

Stan prac i źródeł: **10 września 2026 r.** Strona jest przygotowana lokalnie. Nie została opublikowana pod domeną firmy.

## Co poprawiono

- Tytuł, opis strony i metadane opisują rzeczywistą ofertę: elementy z karbonu na zamówienie, ARB i Rogóźno. Dane strukturalne łączą `Organization`, `WebSite`, `WebPage` i `Service`, bez wymyślonych ocen, cen ani realizacji.
- Wszystkie cztery opisy zastosowań są w HTML. JavaScript zmienia aktywną zakładkę, a bez niego pozostaje dostępna pełna treść. Zachowano nagłówki, opisy grafik, linki i obsługę klawiaturą.
- Logo i ilustrację zastąpiono w stronie wersjami WebP: razem **143 900 B zamiast 2 164 724 B**, czyli o **93,35% mniej danych dla tych dwóch obrazów**. To porównanie plików, nie pomiar przyspieszenia całej strony. Oryginalne PNG pozostają w pakiecie.
- Polityka prywatności ma własny adres `polityka-prywatnosci.html`. Na stronie głównej jest prezentowana jako jasny panel nad rozmytą treścią; zwykły odnośnik zapewnia dostęp także bez JavaScript.
- Generator TXT otrzymał walidację, przycisk czyszczenia i ograniczenie częstotliwości pobierania. Nadal działa lokalnie i nie wysyła zapytania.

## Aktualne zalecenia Google zastosowane do tej strony

Podstawą pozostają użyteczna treść, jednoznaczna oferta, zrozumiała struktura i dostęp do zasobów. Dalszą wartość przyniosą prawdziwe zdjęcia realizacji, opis materiałów i zakresu produkcji oraz odpowiedzi wynikające z pytań klientów — po potwierdzeniu ich przez firmę. Nie zastępują ich powtarzane frazy ani fikcyjne portfolio. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

Google w poradniku dotyczącym funkcji generatywnej AI nadal opiera widoczność na dobrym SEO i wartościowej, oryginalnej informacji. Nie ma specjalnego znacznika gwarantującego cytowanie przez AI. Nie dodano `llms.txt` jako obietnicy poprawy pozycji. [Google — optymalizacja dla funkcji AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Sprawdzono dziennik zmian Google: 15 czerwca 2026 r. doprecyzowano, że `llms.txt` nie wpływa dodatnio ani ujemnie na widoczność w Google; usunięto też dokumentację rozszerzonych wyników FAQ, niewyświetlanych od 7 maja 2026 r. Zwykłe pytania i odpowiedzi pozostają przydatne dla klientów, ale nie obiecujemy dodatkowego wyniku FAQ. Aktualizacja faviconów z 28 sierpnia wyjaśnia formaty, nie wprowadza nowego obowiązku. [Google — aktualizacje dokumentacji](https://developers.google.com/search/updates).

Aktualne cele Core Web Vitals to **LCP ≤ 2,5 s, INP ≤ 200 ms i CLS ≤ 0,1**, oceniane na 75. percentylu wizyt, osobno dla urządzeń mobilnych i komputerów. To cele do sprawdzenia po publikacji. Nie przedstawiamy nieprzeprowadzonego audytu Lighthouse ani danych prawdziwych użytkowników jako wyniku tej strony. [Google — Web Vitals](https://web.dev/articles/vitals).

Optymalizacja techniczna ułatwia indeksowanie i korzystanie ze strony, ale nie gwarantuje pierwszego miejsca, indeksacji ani obecności w odpowiedziach AI.

## Przygotowanie domeny i uruchomienie

1. Ustalić docelową domenę HTTPS i jej jedną główną wersję, np. z `www` albo bez. Nie wpisywać zastępczej domeny do plików produkcyjnych.
2. W katalogu strony uruchomić `node tools/prepare-site.cjs --help`, a następnie przekazać narzędziu rzeczywisty adres HTTPS własnej domeny. Powstanie sąsiedni folder `arb-carbon-technologies-public` z plikami publicznymi, adresami canonical, `robots.txt`, `sitemap.xml`, absolutnymi metadanymi udostępniania i aktualnymi hashami CSP. Skrypt nie nadpisuje istniejącego folderu wynikowego. Sam nie kupuje domeny, nie publikuje strony ani nie zgłasza jej do Google.
3. Na wybranym hostingu skonfigurować HTTPS, przekierowania pozostałych wersji adresu, poprawny kod 404, kompresję i pamięć podręczną zasobów. Przenieść reguły bezpieczeństwa do rzeczywistych nagłówków odpowiedzi zgodnie z możliwościami hostingu.
4. Sprawdzić oba publiczne adresy HTML, metadane, dostępność CSS/JS/obrazów, politykę CSP i działanie generatora. Ochrona antybotowa hostingu nie może przypadkowo blokować prawidłowego indeksowania.
5. Zweryfikować własność domeny w Google Search Console, zgłosić mapę witryny i sprawdzić inspekcję URL. Następnie analizować rzeczywiste zapytania, indeksowanie i jakość wizyt. Pomiar laboratoryjny PageSpeed Insights służy diagnozie; dane terenowe mogą początkowo być niedostępne przy małym ruchu.

## Ochrona generatora i jej zakres

Generator przyjmuje nazwę projektu do 100 znaków, opcjonalną firmę do 120 znaków, opis od 20 do 2500 znaków i pełną liczbę sztuk od 1 do 100 000. Wartość sektora musi należeć do dozwolonej listy. Po pobraniu działa 3-sekundowa przerwa przed kolejnym pobraniem. Dane stają się zwykłym tekstem w pliku TXT.

Polityka CSP zawiera m.in. `form-action 'none'` i `connect-src 'none'`, ograniczając wysyłkę formularzy i połączenia inicjowane przez skrypty. Obrazy i lokalne zasoby strony nadal się ładują. CSP jest dodatkową warstwą ochrony; nie zastępuje poprawnego kodu ani zabezpieczeń serwera. Dyrektywa `frame-ancestors` wymaga nagłówka HTTP — wpisanie jej wyłącznie do metatagu nie chroni przed osadzaniem. [OWASP — Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

Obecnie **nie ma endpointu ani skrzynki odbierającej ten formularz**, więc nie ma kanału, którym generator wysyłałby spam do firmy. Walidacja i przerwa w JavaScript ograniczają błędy i wielokrotne pobrania lokalne; nie są zabezpieczeniem przyszłego serwera. Dla prawdziwej wysyłki potrzebne będą ponowna walidacja po stronie serwera, limity wielkości żądań i częstotliwości oraz bezpieczna obsługa treści. [OWASP — Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).

Jeśli po uruchomieniu backendu potrzebny będzie Turnstile, token musi być weryfikowany na serwerze, z kontrolą wyniku i kontekstu żądania. Sam widżet nie chroni formularza. Klucz tajny nie może znaleźć się w HTML ani publicznym JavaScript. Włączenie dostawcy wymaga także aktualizacji CSP i opisu prywatności. [Cloudflare — walidacja Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Prywatność przed publikacją

Obecny kod nie korzysta z cookies, analityki ani reklamowego śledzenia, a projekt nie jest przekazywany ARB. Dlatego nie dodano pozornego banera zgód ani CAPTCHA zbierającej dodatkowe dane. To ocena tej wersji kodu; hosting może zmienić faktyczne zachowanie strony.

Przed publicznym uruchomieniem trzeba ustalić dostawców i role hostingu/CDN, rzeczywisty zakres logów, cele i podstawy ich przetwarzania, okresy przechowywania, odbiorców oraz ewentualne transfery poza EOG. Te informacje należy dopisać do polityki. Nie przyjęto fikcyjnej retencji ani nie zadeklarowano braku transferów bez danych dostawcy. [RODO — art. 5, 6 i 13](https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=celex:32016R0679), [UODO — okres przechowywania](https://uodo.gov.pl/pl/676/4260).

Zasady zapisu i dostępu do informacji na urządzeniu wynikają obecnie z art. 399 Prawa komunikacji elektronicznej, także dla technologii innych niż cookies. Przepis przewiduje wyjątki dla działań koniecznych do transmisji lub realizacji usługi żądanej przez użytkownika. Przy dodaniu opcjonalnej analityki lub marketingu należy ponownie ocenić zgodę i wdrożyć ją przed uruchomieniem takich funkcji. [PKE — aktualny tekst ujednolicony, art. 399](https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20240001221/U/D20241221Lj.pdf).

Polityka podaje pocztowy kontakt do firmy i informuje o prawach, których zakres zależy od faktycznego przetwarzania. [UODO — prawa osób i skarga](https://uodo.gov.pl/pl/493/155).
