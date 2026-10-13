// Google Apps Script podpięty pod arkusz z leadami (wdrożony jako aplikacja internetowa).
// Wywoływany z kontakt.php. Po zmianie: Wdróż → Zarządzaj wdrożeniami → edytuj → Nowa wersja
// (inaczej URL dalej uruchamia starą wersję).
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Glowny');

  const d = JSON.parse(e.postData.contents);

  // Tekst zaczynający się od = + - @ arkusz potraktowałby jak formułę (np. telefon "+48…").
  const safe = v => {
    const s = String(v ?? '');
    return /^[=+\-@]/.test(s) ? "'" + s : s;
  };

  sheet.appendRow([
    safe(d.id),
    safe(d.created_time),
    '',                      // ad_id
    '',                      // ad_name
    '',                      // adset_id
    '',                      // adset_name
    '',                      // campaign_id
    '',                      // campaign_name
    '',                      // form_id
    safe(d.form_name),
    d.is_organic ?? true,
    safe(d.platform),
    safe(d.full_name),
    safe(d.email),
    safe(d.phone_number),
    '',                      // lead_status — wypełniane ręcznie
    d.marketing_consent === true ? 'TAK' : 'NIE',  // zgoda_marketingowa
    safe(d.message),         // wiadomosc
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
