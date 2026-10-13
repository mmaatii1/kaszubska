<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://kaszubskaosada.com.pl');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

// Klucze API trzymamy poza repo: kontakt.config.php (wzór: kontakt.config.example.php).
// Bez pliku albo z pustymi kluczami autoodpowiedź i SMS-y są po prostu pomijane.
$configFile = __DIR__ . '/kontakt.config.php';
$config = is_file($configFile) ? (array)require $configFile : [];
$cfg = fn(string $key, mixed $default = '') => $config[$key] ?? $default;

function clean(mixed $v): string {
    return htmlspecialchars(trim((string)($v ?? '')), ENT_QUOTES, 'UTF-8');
}

function plain(string $v): string {
    return html_entity_decode($v, ENT_QUOTES, 'UTF-8');
}

function postJson(string $url, array $payload, array $headers = []): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $res  = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($res === false || $code >= 400) {
        error_log("kontakt.php: {$url} -> HTTP {$code} " . (is_string($res) ? $res : ''));
        return null;
    }
    return json_decode((string)$res, true) ?? [];
}

// 9 cyfr -> polski numer; zwraca format 48XXXXXXXXX albo '' gdy numer wygląda na błędny.
function normalizePhone(string $phone): string {
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (str_starts_with($digits, '00')) $digits = substr($digits, 2);
    if (strlen($digits) === 9) $digits = '48' . $digits;
    return (strlen($digits) >= 11 && strlen($digits) <= 15) ? $digits : '';
}

$type      = clean($data['type'] ?? 'contact') === 'callback' ? 'callback' : 'contact';
$name      = clean($data['name'] ?? '');
$phone     = clean($data['phone'] ?? '');
$email     = filter_var(trim((string)($data['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$message   = clean($data['message'] ?? '');
$marketing = ($data['marketing'] ?? false) === true;
$consent   = $marketing ? 'TAK' : 'NIE';

if ($type === 'callback') {
    if ($name === '' || $phone === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Brakuje imienia lub telefonu']);
        exit;
    }

    $subject   = "Prośba o oddzwonienie – {$name}";
    $emailLine = $email !== false ? "\n        E-mail:  {$email}" : '';
    $msgLine   = $message !== '' ? "\n        Wiadomość:\n        {$message}" : '';
    $body = <<<TEXT
        Nowe zgłoszenie z formularza popup (oddzwonienie):

        Imię:    {$name}
        Telefon: {$phone}{$emailLine}{$msgLine}
        TEXT;
} else {
    if ($name === '' || $email === false) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Brakuje imienia lub poprawnego e-maila']);
        exit;
    }

    $subject = "Zapytanie z landing page – {$name}";
    $body = <<<TEXT
        Nowe zapytanie z formularza kontaktowego:

        Imię i nazwisko: {$name}
        Telefon:         {$phone}
        E-mail:          {$email}
        Zgoda marketingowa: {$consent}
        Wiadomość:
        {$message}
        TEXT;
}

// 1. Lead do arkusza – zawsze, niezależnie od tego czy maile wyjdą.
$sheetOk = postJson('https://script.google.com/macros/s/AKfycbzthHk3Ef454ee72Ye6FTTZJ4RfM0jaWEt5UMNRX5ABotKDgrB43fltA3swTXfF7eGo/exec', [
    'id'                => uniqid('web_', true),
    'created_time'      => date('Y-m-d H:i:s'),
    'form_name'         => $type,
    'is_organic'        => true,
    'platform'          => 'website',
    'full_name'         => plain($name),
    'email'             => $email !== false ? $email : '',
    'phone_number'      => plain($phone),
    'marketing_consent' => $marketing,
]) !== null;

// 2. Powiadomienie do nas.
$recipients = ['kontakt@kaszubskaosada.com.pl', 'mmaatii122@gmail.com'];
$headers = implode("\r\n", [
    'From: Kaszubska Osada <noreply@kaszubskaosada.com.pl>',
    'Reply-To: ' . ($email !== false ? $email : $recipients[0]),
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
]);

$sent = true;
foreach ($recipients as $to) {
    if (!mail($to, $subject, $body, $headers)) {
        $sent = false;
    }
}

// 3. SMS do nas o nowym leadzie (SMSAPI).
$smsToken = (string)$cfg('SMSAPI_TOKEN');
$sendSms = function (string $to, string $text) use ($smsToken, $cfg): void {
    if ($smsToken === '' || $to === '') return;
    $ch = curl_init('https://api.smsapi.pl/sms.do');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query(array_filter([
            'to'       => $to,
            'from'     => (string)$cfg('SMSAPI_SENDER'),
            'message'  => $text,
            'encoding' => 'utf-8',
            'format'   => 'json',
        ])),
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $smsToken],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    if ($res === false || str_contains((string)$res, '"error"')) {
        error_log('kontakt.php: SMSAPI ' . (is_string($res) ? $res : 'curl error'));
    }
};

foreach ((array)$cfg('NOTIFY_SMS_TO', []) as $notifyTo) {
    $kind = $type === 'callback' ? 'Oddzwonienie' : 'Zapytanie';
    $sendSms(normalizePhone((string)$notifyTo), "Nowy lead ({$kind}): " . plain($name) . ', tel. ' . (plain($phone) ?: '-'));
}

// 4. SMS z potwierdzeniem do leada – bez treści reklamowych.
if ($cfg('LEAD_SMS_ENABLED', false)) {
    $sendSms(normalizePhone(plain($phone)),
        'Dziekujemy za kontakt z Kaszubska Osada. Odezwiemy sie wkrotce. W razie pytan: 500 299 775.');
}

// 5. Mail z potwierdzeniem do leada (Brevo) – odpowiedzi i kopia trafiają na kontakt@.
$brevoKey = (string)$cfg('BREVO_API_KEY');
if ($brevoKey !== '' && $email !== false) {
    $intro = $type === 'callback'
        ? 'dziękujemy za prośbę o kontakt. Oddzwonimy najszybciej, jak to możliwe.'
        : 'dziękujemy za wiadomość. Odpowiemy najszybciej, jak to możliwe.';
    $html = <<<HTML
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2b2b2b;max-width:560px">
          <p>Dzień dobry {$name},</p>
          <p>{$intro}</p>
          <p>Jeśli wolą Państwo porozmawiać od razu, prosimy o telefon: <a href="tel:+48500299775">500&nbsp;299&nbsp;775</a>.
             Na tego maila można też po prostu odpowiedzieć.</p>
          <p>Pozdrawiamy,<br>Zespół Kaszubska Osada<br>
             <a href="https://kaszubskaosada.com.pl">kaszubskaosada.com.pl</a></p>
        </div>
        HTML;
    $text = 'Dzień dobry ' . plain($name) . ",\n\n" . $intro
        . "\n\nJeśli wolą Państwo porozmawiać od razu, prosimy o telefon: 500 299 775. Na tego maila można też po prostu odpowiedzieć."
        . "\n\nPozdrawiamy,\nZespół Kaszubska Osada\nkaszubskaosada.com.pl";

    postJson('https://api.brevo.com/v3/smtp/email', [
        'sender'      => ['name' => 'Kaszubska Osada', 'email' => (string)$cfg('BREVO_SENDER', 'kontakt@kaszubskaosada.com.pl')],
        'to'          => [['email' => $email, 'name' => plain($name)]],
        'replyTo'     => ['email' => 'kontakt@kaszubskaosada.com.pl', 'name' => 'Kaszubska Osada'],
        // Kopia wysłanej autoodpowiedzi ląduje w skrzynce kontakt@.
        'bcc'         => [['email' => 'kontakt@kaszubskaosada.com.pl']],
        'subject'     => 'Dziękujemy za kontakt – Kaszubska Osada',
        'htmlContent' => $html,
        'textContent' => $text,
    ], ['api-key: ' . $brevoKey]);

    // Kontakt ze zgodą marketingową trafia na listę w Brevo (pod przyszłe kampanie / serie maili).
    $listId = (int)$cfg('BREVO_MARKETING_LIST_ID', 0);
    if ($marketing && $listId > 0) {
        postJson('https://api.brevo.com/v3/contacts', [
            'email'         => $email,
            'attributes'    => ['FIRSTNAME' => plain($name)],
            'listIds'       => [$listId],
            'updateEnabled' => true,
        ], ['api-key: ' . $brevoKey]);
    }
}

if (!$sent && !$sheetOk) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Błąd serwera – spróbuj ponownie']);
    exit;
}

echo json_encode(['ok' => true]);
