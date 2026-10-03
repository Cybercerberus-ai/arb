<?php
require __DIR__.'/../inquiry.php';
function check($ok,$label) { if (!$ok) throw new RuntimeException($label); echo "PASS $label\n"; }
$valid=['contactName'=>'Jan Testowy','email'=>'test@example.com','phone'=>'+48 600 000 000','company'=>'Firma','name'=>'Osłona','quantity'=>10,'sector'=>'Przemysł','message'=>'Proszę o wykonanie osłony urządzenia.','website'=>'','requestId'=>'12345678-1234-1234-1234-123456789012'];
$v=inquiryValidate($valid);check($v['quantity']===10,'valid contact data');
foreach ([['email',"a@example.com\r\nBcc: x@example.com"],['phone','abc'],['contactName',''],['message','krótki'],['quantity',[]],['quantity',100001],['sector','__proto__'],['website','spam'],['requestId','x'],['email',[]]] as [$field,$bad]) {
    try { inquiryValidate(array_replace($valid,[$field=>$bad])); throw new RuntimeException('Accepted '.$field); }
    catch (InvalidArgumentException $e) { echo "PASS rejected $field\n"; }
}
$mail=inquiryMail($v);check($mail['to']==='kontakt@arbcarbon.pl','fixed recipient');check($mail['headers']['Reply-To']==='test@example.com','reply to visitor');
$body=base64_decode($mail['body']);foreach (['Jan Testowy','test@example.com','+48 600 000 000','Osłona'] as $value) check(str_contains($body,$value),'body includes '.$value);
