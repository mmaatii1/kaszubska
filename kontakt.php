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

function clean(mixed $v): string {
    return htmlspecialchars(trim((string)($v ?? '')), ENT_QUOTES, 'UTF-8');
}

$type = clean($data['type'] ?? 'contact'); // 'contact' | 'callback'

if ($type === 'callback') {
    $name  = clean($data['name'] ?? '');
    $phone = clean($data['phone'] ?? '');

    if ($name === '' || $phone === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Brakuje imienia lub telefonu']);
        exit;
    }

    $subject = "Prośba o oddzwonienie – {$name}";
    $body = <<<TEXT
        Nowe zgłoszenie z formularza popup (oddzwonienie):

        Imię:    {$name}
        Telefon: {$phone}
        TEXT;
} else {
    $name    = clean($data['name'] ?? '');
    $phone   = clean($data['phone'] ?? '');
    $email   = filter_var(trim((string)($data['email'] ?? '')), FILTER_VALIDATE_EMAIL);
    $message = clean($data['message'] ?? '');

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
        Wiadomość:
        {$message}
        TEXT;
}

$recipients = ['kontakt@kaszubskaosada.com.pl', 'mmaatii122@gmail.com'];
$headers = implode("\r\n", [
    'From: Kaszubska Osada <noreply@kaszubskaosada.com.pl>',
    'Reply-To: ' . ($email ?? $recipients[0]),
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
]);

$sent = true;
foreach ($recipients as $to) {
    if (!mail($to, $subject, $body, $headers)) {
        $sent = false;
    }
}

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Błąd serwera – spróbuj ponownie']);
    exit;
}

echo json_encode(['ok' => true]);
