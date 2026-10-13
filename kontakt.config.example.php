<?php
// Skopiuj jako kontakt.config.php (obok kontakt.php) i uzupełnij. Plik z kluczami nie trafia do repo.
// Puste wartości = dana funkcja wyłączona.
return [
    // Brevo (app.brevo.com → SMTP & API → API Keys). Nadawca musi być zweryfikowany w Brevo
    // (najlepiej uwierzytelniona cała domena: Senders, Domains & Dedicated IPs → Domains).
    'BREVO_API_KEY'           => '',
    'BREVO_SENDER'            => 'kontakt@kaszubskaosada.com.pl',
    // ID listy w Brevo (Contacts → Lists), na którą trafiają leady ze zgodą marketingową. 0 = wyłączone.
    'BREVO_MARKETING_LIST_ID' => 0,

    // SMSAPI (ssl.smsapi.pl → Ustawienia API → Tokeny OAuth, uprawnienie SMS).
    'SMSAPI_TOKEN'            => '',
    // Zarejestrowana nazwa nadawcy (np. 'KaszOsada'); puste = domyślny nadawca SMSAPI.
    'SMSAPI_SENDER'           => '',
    // Numery, na które przychodzi SMS o każdym nowym leadzie.
    'NOTIFY_SMS_TO'           => ['500299775'],
    // SMS z potwierdzeniem do leada.
    'LEAD_SMS_ENABLED'        => false,
];
