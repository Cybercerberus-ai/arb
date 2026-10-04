# Opinie Google — przygotowana sekcja

Sekcja na końcu strony jest przygotowana do integracji. Bez konfiguracji nie wysyła żądań do Google i nie pokazuje wymyślonych opinii. Filtr przepuszcza tylko oceny liczbowe 4 lub 5, a nagłówek wyraźnie oznacza wybór ocen 4–5.

Po uzyskaniu dostępu do API i identyfikatora miejsca należy zbudować endpoint serwerowy na tej samej domenie. Klucz Google musi pozostać poza public_html. Wtedy dodaj do sekcji #opinie atrybut data-reviews-endpoint z adresem endpointu. Obecnie endpoint i automatyczna synchronizacja NIE są wdrożone.

Kontrakt JSON: {"reviews":[{"rating":5,"author":"imię autora z Google","authorUrl":"https://...","text":"oryginalny tekst opinii","url":"https://..."}]}.

Przed włączeniem należy sprawdzić aktualne zasady API, oznaczenia Google Maps, atrybucję autorów, zasady przechowywania i wymagane informacje w polityce prywatności. Google Places może udostępnić tylko ograniczony wybór recenzji, nie wszystkie opinie firmy. Nie wyliczać średniej całego profilu z przefiltrowanych ocen.

Źródła: https://developers.google.com/maps/documentation/places/web-service/policies oraz https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
