<?php
declare(strict_types=1);

// PHP 8.1+. Only the fixed ARB mailbox receives mail; visitor input is Reply-To.
function inquiryValidate(array $input): array {
    $limits = ['name'=>100, 'contactName'=>120, 'email'=>254, 'phone'=>32, 'company'=>120, 'sector'=>40, 'message'=>2500, 'website'=>200, 'requestId'=>80];
    $values = [];
    foreach ($limits as $key=>$limit) {
        $raw = $input[$key] ?? '';
        if (!is_string($raw) || !preg_match('//u', $raw) || strlen($raw) > $limit * 4) throw new InvalidArgumentException('Nieprawidłowe pole: '.$key);
        if ($key !== 'message' && preg_match('/[\r\n\x00-\x1f\x7f]/', $raw)) throw new InvalidArgumentException('Nieprawidłowe znaki w polu: '.$key);
        $value = trim($raw);
        if (preg_match_all('/./us', $value) > $limit) throw new InvalidArgumentException('Zbyt długie pole: '.$key);
        $values[$key] = $value;
    }
    foreach (['name','contactName','email','phone'] as $key) if ($values[$key] === '') throw new InvalidArgumentException('Uzupełnij dane projektu i dane kontaktowe.');
    if (!filter_var($values['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Podaj poprawny adres e-mail.');
    $digits = preg_replace('/\D/', '', $values['phone']);
    if (!preg_match('/^\+?[0-9 ()-]+$/D', $values['phone']) || strlen($digits)<7 || strlen($digits)>15) throw new InvalidArgumentException('Podaj poprawny numer telefonu.');
    if (!in_array($values['sector'], ['Projekt indywidualny','Przemysł','Motoryzacja','Lotnictwo','Inne zastosowanie'], true)) throw new InvalidArgumentException('Wybierz obszar projektu.');
    $quantity = $input['quantity'] ?? '';
    if (is_int($quantity)) $quantity = (string)$quantity;
    if (!is_string($quantity) || !preg_match('/^[0-9]{1,6}$/D', $quantity) || (int)$quantity<1 || (int)$quantity>100000) throw new InvalidArgumentException('Podaj liczbę sztuk od 1 do 100 000.');
    $values['quantity'] = (int)$quantity;
    if (preg_match_all('/./us', $values['message'])<20 || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $values['message'])) throw new InvalidArgumentException('Opis musi zawierać od 20 do 2500 znaków.');
    if ($values['website'] !== '' || !preg_match('/^[a-zA-Z0-9-]{20,80}$/D', $values['requestId'])) throw new InvalidArgumentException('Nie można przyjąć formularza. Odśwież stronę.');
    return $values;
}

function inquiryMail(array $v): array {
    $body = "NOWE ZAPYTANIE ZE STRONY ARBCARBON.PL\n\n";
    foreach (['contactName'=>'Imię i nazwisko','email'=>'E-mail','phone'=>'Telefon','company'=>'Firma','name'=>'Nazwa projektu','quantity'=>'Liczba sztuk','sector'=>'Obszar projektu'] as $key=>$label) $body .= $label.': '.$v[$key]."\n";
    $body .= "\nOpis projektu:\n".$v['message']."\n";
    return ['to'=>'kontakt@arbcarbon.pl', 'subject'=>'=?UTF-8?B?'.base64_encode('Zapytanie ze strony ARB: '.$v['name']).'?=',
        'body'=>chunk_split(base64_encode($body), 76, "\r\n"),
        'headers'=>['From'=>'ARB Carbon Technologies <kontakt@arbcarbon.pl>', 'Reply-To'=>$v['email'], 'MIME-Version'=>'1.0', 'Content-Type'=>'text/plain; charset=UTF-8', 'Content-Transfer-Encoding'=>'base64']];
}

function inquiryReply(int $status, array $data): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function inquiryRun(): never {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); inquiryReply(405, ['ok'=>false,'message'=>'Użyj formularza na stronie ARB.']); }
    if (!in_array($_SERVER['HTTP_ORIGIN'] ?? '', ['https://arbcarbon.pl','https://www.arbcarbon.pl'], true)) inquiryReply(403, ['ok'=>false,'message'=>'Wyślij zapytanie z formularza na arbcarbon.pl.']);
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') inquiryReply(415, ['ok'=>false,'message'=>'Nieprawidłowy format zapytania.']);
    $body = file_get_contents('php://input', false, null, 0, 20001);
    if ($body === false || strlen($body)>20000) inquiryReply(413, ['ok'=>false,'message'=>'Zapytanie jest zbyt duże.']);
    try {
        $input = json_decode($body, true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($input)) throw new InvalidArgumentException('Nieprawidłowy formularz.');
        $v = inquiryValidate($input);
    } catch (JsonException | InvalidArgumentException $e) { inquiryReply(422, ['ok'=>false,'message'=>$e instanceof JsonException ? 'Nieprawidłowy formularz.' : $e->getMessage()]); }

    // Outside public_html. Contains only hashes, timestamps and a random salt, no message/contact text.
    $directory = dirname(__DIR__).'/.arb-inquiry';
    if ((!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) || is_link($directory)) inquiryReply(503, ['ok'=>false,'message'=>'Formularz chwilowo niedostępny. Napisz na kontakt@arbcarbon.pl.']);
    $file = @fopen($directory.'/rate-limit.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) inquiryReply(503, ['ok'=>false,'message'=>'Spróbuj ponownie za chwilę.']);
    try {
        $raw = stream_get_contents($file);
        $state = $raw === '' ? ['salt'=>bin2hex(random_bytes(32)), 'attempts'=>[], 'sent'=>[]] : json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($state) || !isset($state['salt'], $state['attempts'], $state['sent'])) throw new RuntimeException('Invalid limiter state');
        $now = time();
        $state['attempts'] = array_values(array_filter($state['attempts'], fn($x)=>$x['at']>$now-3600));
        $state['sent'] = array_filter($state['sent'], fn($x)=>$x['at']>$now-86400);
        $ip = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $state['salt']);
        $id = hash_hmac('sha256', $v['requestId'], $state['salt']);
        $digest = hash_hmac('sha256', json_encode($v), $state['salt']);
        $status = 200;
        $response = ['ok'=>true,'message'=>'Serwer przyjął zapytanie do wysyłki na kontakt@arbcarbon.pl. Dziękujemy!'];
        if (isset($state['sent'][$id])) {
            if (!hash_equals($state['sent'][$id]['digest'], $digest)) { $status=409; $response=['ok'=>false,'message'=>'Dane zapytania zmieniły się. Odśwież stronę przed ponowną wysyłką.']; }
        } else {
            $recent = array_filter($state['attempts'], fn($x)=>$x['ip']===$ip && $x['at']>$now-900);
            $last = $recent ? max(array_column($recent,'at')) : 0;
            if (count($recent)>=5 || $last>$now-60 || count($state['attempts'])>=60) {
                $status=429; header('Retry-After: 900'); $response=['ok'=>false,'message'=>'Zbyt wiele prób. Odczekaj 15 minut lub napisz na kontakt@arbcarbon.pl.'];
            } else {
                $state['attempts'][]=['ip'=>$ip,'at'=>$now];
                // Persist the attempt before sending so process failure cannot bypass throttling.
                rewind($file); ftruncate($file,0);
                if (fwrite($file,json_encode($state))===false || !fflush($file)) throw new RuntimeException('Cannot save limiter');
                $mail = inquiryMail($v);
                if (!@mail($mail['to'],$mail['subject'],$mail['body'],$mail['headers'])) {
                    $status=503; $response=['ok'=>false,'message'=>'Serwer nie przyjął wiadomości. Dane pozostają w formularzu. Napisz na kontakt@arbcarbon.pl lub spróbuj później.'];
                } else $state['sent'][$id]=['digest'=>$digest,'at'=>$now];
            }
        }
        rewind($file); ftruncate($file,0);
        if (fwrite($file,json_encode($state))===false || !fflush($file)) throw new RuntimeException('Cannot save limiter');
    } catch (Throwable $e) { $status=503; $response=['ok'=>false,'message'=>'Nie udało się potwierdzić wysyłki. Zachowaj treść i skontaktuj się z kontakt@arbcarbon.pl.']; }
    finally { flock($file, LOCK_UN); fclose($file); }
    inquiryReply($status,$response);
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) inquiryRun();
