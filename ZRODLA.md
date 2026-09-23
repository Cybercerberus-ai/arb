# Źródła i pochodzenie materiałów

Stan rozeznania: **7 września 2026 r.** Dokument opisuje podstawę treści przygotowanej strony.

## Dane firmy

Poniższe dane porównano w publicznych bazach prezentujących informacje z KRS: [Rejestr.io — ARB Carbon Technologies](https://rejestr.io/krs/1253607/arb-carbon-technologies) oraz [MonitorFirm — dane prawne spółki](https://monitorfirm.pb.pl/firma/arb-carbon-technologies/osoba-prawna/).

| Pole | Wartość użyta na stronie |
| --- | --- |
| Pełna nazwa | ARB CARBON TECHNOLOGIES SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ |
| KRS | 0001253607 |
| NIP | 8762522563 |
| REGON | 545228505 |
| Siedziba | Rogóźno 16 C, 86-318 Rogóźno, Polska |
| Data rejestracji | 10 lipca 2026 r. |
| Kapitał zakładowy | 5 000 zł |

Rejestr.io podaje REGON w postaci dziewięciocyfrowej. MonitorFirm prezentuje także rozszerzony zapis `54522850500000`; na stronie zastosowano dziewięciocyfrowy numer podmiotu.

Przeważający przedmiot działalności wskazany w [MonitorFirm — profil firmy](https://monitorfirm.pb.pl/firma/arb-carbon-technologies/) to PKD **30.31.Z — produkcja cywilnych statków powietrznych, statków kosmicznych i podobnych maszyn**. Kod opisuje wpis rejestrowy; nie posłużył do przedstawienia katalogu produktów ani certyfikowanych możliwości produkcyjnych. Dodatkowych kodów PKD nie potwierdzono.

Oficjalnym punktem odniesienia dla późniejszej aktualizacji jest [API Krajowego Rejestru Sądowego — odpis aktualny](https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/0001253607?rejestr=P&format=json). Podczas przygotowania strony nie udało się odczytać tego odpisu w dostępnych narzędziach. Dane opisane powyżej potwierdzono zatem w wymienionych publicznych bazach, a nie bezpośrednio w API ministerstwa.

## Ustalenia przekazane przez użytkownika

- Główny profil strony: **produkcja elementów z karbonu na zamówienie**.
- Publiczny kontakt obejmuje adres pocztowy firmy oraz e-mail **kontakt@arbcarbon.pl**, przekazany przez użytkownika 23 września 2026 r. Nie publikujemy numeru telefonu.
- Logo marki pochodzi z dostarczonego przez użytkownika pliku `ARB.png`; kopia użyta w stronie to `assets/arb-logo.png`.

Teksty o przygotowaniu projektu i rozmowie o wymaganiach opracowano do tego profilu działalności. Przemysł, motoryzacja, lotnictwo i projekty indywidualne przedstawiono jako przykładowe kierunki zastosowania materiału, z indywidualnym ustalaniem możliwości realizacji. Nie dodawano niezweryfikowanych parametrów technicznych, certyfikatów, nazw klientów, zrealizowanych projektów ani deklaracji wieloletniego doświadczenia ARB.

Narzędzie opisu projektu zapisuje lokalny plik TXT. Nie jest kanałem wysyłki do firmy. Wizytówka vCard zawiera dane adresowe, KRS i e-mail, bez telefonu.

## Rozróżnienie od Gyro-Tech

[Oficjalna strona kontaktowa Gyro-Tech](https://gyrotech.eu/contact/) wskazuje spółkę Gyro-Tech Innovation in Aviation sp. z o.o., o innym NIP **8762461790** i KRS **0000559399**. Wspólny adres i występowanie tych samych osób nie stanowią potwierdzenia, że oferta lub osiągnięcia tej spółki należą do ARB. Nie przeniesiono na stronę ARB jej danych kontaktowych, katalogu łopat i wirników, historii ani osiągnięć.

## Grafika koncepcyjna

Plik `assets/carbon-hero.png` został wygenerowany 7 września 2026 r. wbudowanym narzędziem `image_gen` jako oryginalna wizualizacja materiału na potrzeby tej strony. Nie pochodzi z banku zdjęć. Przed użyciem został obejrzany; plik PNG skopiowano bez zmian. Ta sama grafika jest wykorzystywana również jako detal w sekcji materiałowej.

8 września 2026 r. dodano dekoracyjną scenę czterech płaszczyzn w CSS 3D, korzystających z tej samej grafiki jako tekstury. Nie jest to model gotowego produktu ani dokumentacja układu warstw laminatu. Nowe efekty ruchu i światła powstają w kodzie strony; nie dodano zewnętrznych bibliotek, zdjęć ani źródeł danych.

Prezentację rozwinięto w jedną jasną przestrzeń. Trzy zakrzywione płaty widoczne w tle są geometrią generowaną proceduralnie w WebGL. Ich splot, kierunkowe refleksy, cienkie krawędzie oraz mgła powstają w kodzie sceny. Nie są to fotografie produktów ARB. Kamera i położenie grafik są powiązane z przewijaniem dokumentu; przejścia nie zmieniają tekstów ani danych firmy. 9 września 2026 r. dopracowano materiał i dodano wyłanianie treści z białego rozmycia.

Wizualizacja nie przedstawia rzeczywistego produktu, zakładu ani zrealizowanego zamówienia ARB. Zostało to oznaczone również na stronie. Poniżej pełny końcowy prompt użyty do wygenerowania obrazu:

```text
Use case: ads-marketing
Asset type: premium website hero background for a Polish carbon composite engineering brand.
Primary request: A stunning photorealistic abstract macro sculpture formed from one broad sweeping curved sheet of black carbon fiber composite, rising in an elegant aerodynamic arch. This is a conceptual material visualization, not a real named company's product.
Scene/backdrop: seamless nearly-black charcoal studio, refined and minimal.
Subject: flowing sculptural satin-gloss carbon composite with beautifully resolved tight 2x2 twill woven pattern, precise thin edges, physically realistic material.
Composition/framing: wide cinematic landscape image, approximately 1792x1024. Sculpture occupies the RIGHT 65 percent, diagonally sweeping from lower middle toward upper right. The LEFT 35 percent must remain almost empty very dark charcoal negative space for live website text. Focus on generous readable shape and exquisite woven material, close-up but recognizably a broad curved sheet.
Lighting/mood: sophisticated industrial aerospace editorial photography, soft cool silver highlights tracing the curvature and restrained deep crimson rim light along one edge. Rich shadows with visible material detail, controlled reflections.
Color palette: carbon black, charcoal, silver and very restrained crimson.
Constraints: image only, no text, no lettering, no logos, no watermark, no labels, no UI.
Avoid: neon light strips, cubes, rings, busy sci-fi props, cars, identifiable commercial products, oversaturated red, flames, charts, split-screen.
```
