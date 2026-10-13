<?php
// Pokazuje publiczne IP, z którego serwer wysyła żądania (do whitelisty w Brevo).
// Tymczasowy – usunąć po dodaniu IP w Brevo.
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex');
$ip = @file_get_contents('https://api.ipify.org');
if (!$ip && function_exists('curl_init')) {
    $ch = curl_init('https://api.ipify.org');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $ip = curl_exec($ch);
    curl_close($ch);
}
echo $ip ?: 'Nie udało się pobrać IP (serwer blokuje połączenia wychodzące?)';
