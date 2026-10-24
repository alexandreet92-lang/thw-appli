// Libellés de la page Prospection — fr / en / es / it / de.
export type Lng = 'fr' | 'en' | 'es' | 'it' | 'de'
const IDX: Record<Lng, number> = { fr: 0, en: 1, es: 2, it: 3, de: 4 }
type Row = [string, string, string, string, string]

const L: Record<string, Row> = {
  crumb: ['Cockpit / Prospection', 'Cockpit / Outreach', 'Cockpit / Prospección', 'Cockpit / Prospezione', 'Cockpit / Outreach'],
  title: ['Prospection', 'Outreach', 'Prospección', 'Prospezione', 'Outreach'],
  note: ['Écran visible uniquement par le compte administrateur. L’envoi part chaque jour vers des contacts qui ont donné leur accord.', 'Visible only to the administrator account. Messages go out every day to contacts who gave their consent.', 'Visible solo para la cuenta de administrador. El envío sale cada día a contactos que dieron su consentimiento.', 'Visibile solo all’account amministratore. L’invio parte ogni giorno verso contatti che hanno dato il consenso.', 'Nur für das Administratorkonto sichtbar. Der Versand geht täglich an Kontakte, die zugestimmt haben.'],
  loading: ['Chargement…', 'Loading…', 'Cargando…', 'Caricamento…', 'Wird geladen…'],
  error: ['Données indisponibles. Réessaie dans un instant.', 'Data unavailable. Try again shortly.', 'Datos no disponibles. Inténtalo de nuevo en un momento.', 'Dati non disponibili. Riprova tra poco.', 'Daten nicht verfügbar. Versuche es gleich noch einmal.'],
  forbidden: ['Accès réservé à l’administrateur.', 'Access reserved for the administrator.', 'Acceso reservado al administrador.', 'Accesso riservato all’amministratore.', 'Zugriff nur für den Administrator.'],
  mailOff: ['L’envoi n’est pas configuré : la clé d’API Brevo manque côté serveur, aucun message ne partira.', 'Sending is not configured: the Brevo API key is missing on the server, no message will go out.', 'El envío no está configurado: falta la clave de API de Brevo en el servidor, no saldrá ningún mensaje.', 'L’invio non è configurato: manca la chiave API di Brevo sul server, nessun messaggio partirà.', 'Der Versand ist nicht konfiguriert: Auf dem Server fehlt der Brevo-API-Schlüssel, es wird keine Nachricht verschickt.'],
  // KPI
  k_sent: ['Envoyés aujourd’hui', 'Sent today', 'Enviados hoy', 'Inviati oggi', 'Heute gesendet'],
  k_errors: ['Erreurs et rebonds', 'Errors and bounces', 'Errores y rebotes', 'Errori e rimbalzi', 'Fehler und Bounces'],
  k_clicks: ['Clics sur le lien', 'Link clicks', 'Clics en el enlace', 'Clic sul link', 'Klicks auf den Link'],
  k_unsub: ['Désinscriptions', 'Unsubscribes', 'Bajas', 'Disiscrizioni', 'Abmeldungen'],
  k_opens: ['Ouvertures (indicatif)', 'Opens (indicative)', 'Aperturas (orientativo)', 'Aperture (indicativo)', 'Öffnungen (Richtwert)'],
  k_opens_h: ['Peu fiable (Apple Mail)', 'Unreliable (Apple Mail)', 'Poco fiable (Apple Mail)', 'Poco affidabile (Apple Mail)', 'Unzuverlässig (Apple Mail)'],
  // Réglages
  s_title: ['Réglage de l’envoi', 'Sending settings', 'Ajuste del envío', 'Impostazioni di invio', 'Versandeinstellungen'],
  s_target: ['Objectif par jour', 'Daily target', 'Objetivo por día', 'Obiettivo giornaliero', 'Tagesziel'],
  s_target_h: ['Nombre maximum d’e-mails envoyés par jour. Tu fixes la valeur que tu veux.', 'Maximum number of emails sent per day. Set any value you like.', 'Número máximo de correos enviados por día. Fija el valor que quieras.', 'Numero massimo di e-mail inviate al giorno. Imposta il valore che vuoi.', 'Maximale Anzahl E-Mails pro Tag. Du legst den Wert frei fest.'],
  s_ramp: ['Recommandé pour un domaine neuf : semaine {w} sur {n}', 'Recommended for a new domain: week {w} of {n}', 'Recomendado para un dominio nuevo: semana {w} de {n}', 'Consigliato per un dominio nuovo: settimana {w} di {n}', 'Empfohlen für eine neue Domain: Woche {w} von {n}'],
  s_today: ['Aujourd’hui : {n} conseillés', 'Today: {n} advised', 'Hoy: {n} aconsejados', 'Oggi: {n} consigliati', 'Heute: {n} empfohlen'],
  s_warn: ['Ton objectif dépasse la recommandation : envoyer beaucoup d’un coup depuis un domaine neuf augmente le risque d’arriver en spam.', 'Your target is above the recommendation: sending a lot at once from a new domain raises the risk of landing in spam.', 'Tu objetivo supera la recomendación: enviar mucho de golpe desde un dominio nuevo aumenta el riesgo de acabar en spam.', 'Il tuo obiettivo supera il consigliato: inviare molto in una volta da un dominio nuovo aumenta il rischio di finire in spam.', 'Dein Ziel liegt über der Empfehlung: viele Mails auf einmal von einer neuen Domain erhöhen das Spam-Risiko.'],
  s_target_set: ['Enregistrer l’objectif', 'Save target', 'Guardar objetivo', 'Salva obiettivo', 'Ziel speichern'],
  m_test_busy: ['Envoi du test en cours…', 'Sending the test…', 'Enviando la prueba…', 'Invio del test in corso…', 'Test wird gesendet…'],
  s_auto: ['Envoi automatique chaque jour', 'Automatic daily sending', 'Envío automático cada día', 'Invio automatico ogni giorno', 'Täglicher automatischer Versand'],
  s_on: ['Actif', 'On', 'Activo', 'Attivo', 'Aktiv'], s_off: ['En pause', 'Paused', 'En pausa', 'In pausa', 'Pausiert'],
  p_title: ['Aperçu du message', 'Message preview', 'Vista previa del mensaje', 'Anteprima del messaggio', 'Nachrichtenvorschau'],
  p_hint: ['Tel qu’il arrive dans la boîte mail, avec le logo. Prénom d’exemple : Léa.', 'As it arrives in the inbox, with the logo. Example first name: Léa.', 'Tal como llega a la bandeja de entrada, con el logo. Nombre de ejemplo: Léa.', 'Così come arriva nella casella, con il logo. Nome di esempio: Léa.', 'So kommt sie im Posteingang an, mit Logo. Beispielname: Léa.'],
  p_from: ['De', 'From', 'De', 'Da', 'Von'], p_subject: ['Objet', 'Subject', 'Asunto', 'Oggetto', 'Betreff'],
  s_hour_fmt: ['{h} h', '{h}:00', '{h}:00', '{h}:00', '{h} Uhr'],
  s_hour_h: ['Heure de Paris. Le message part dans l’heure choisie.', 'Paris time. The message goes out within the chosen hour.', 'Hora de París. El mensaje sale dentro de la hora elegida.', 'Ora di Parigi. Il messaggio parte entro l’ora scelta.', 'Pariser Zeit. Die Nachricht geht innerhalb der gewählten Stunde raus.'],
  s_hour: ['Heure d’envoi', 'Sending time', 'Hora de envío', 'Ora di invio', 'Versandzeit'], s_hour_v: ['Vers 10 h (Paris)', 'Around 10:00 (Paris)', 'Hacia las 10:00 (París)', 'Verso le 10:00 (Parigi)', 'Gegen 10 Uhr (Paris)'],
  s_queue: ['Contacts en attente', 'Contacts waiting', 'Contactos en espera', 'Contatti in attesa', 'Wartende Kontakte'],
  s_total: ['Contacts au total', 'Total contacts', 'Contactos en total', 'Contatti totali', 'Kontakte insgesamt'],
  q_title: ['QR codes', 'QR codes', 'Códigos QR', 'Codici QR', 'QR-Codes'],
  q_hint: ['Pour les flyers, affiches et cartes. Chaque code porte un repère pour savoir d’où viennent les visites.', 'For flyers, posters and cards. Each code carries a tag so you can tell where visits come from.', 'Para folletos, carteles y tarjetas. Cada código lleva una marca para saber de dónde vienen las visitas.', 'Per volantini, poster e biglietti. Ogni codice porta un contrassegno per sapere da dove arrivano le visite.', 'Für Flyer, Plakate und Karten. Jeder Code trägt eine Markierung, damit du siehst, woher die Besuche kommen.'],
  q_site: ['Site THW', 'THW website', 'Sitio THW', 'Sito THW', 'THW-Website'],
  q_tests: ['Page des tests', 'Tests page', 'Página de pruebas', 'Pagina dei test', 'Testseite'],
  q_png: ['Télécharger en PNG', 'Download PNG', 'Descargar PNG', 'Scarica PNG', 'Als PNG laden'],
  q_svg: ['Télécharger en SVG (impression)', 'Download SVG (print)', 'Descargar SVG (impresión)', 'Scarica SVG (stampa)', 'Als SVG laden (Druck)'],
  save: ['Enregistrer', 'Save', 'Guardar', 'Salva', 'Speichern'], saved: ['Enregistré', 'Saved', 'Guardado', 'Salvato', 'Gespeichert'],
  save_err: ['Enregistrement impossible', 'Could not save', 'No se pudo guardar', 'Salvataggio non riuscito', 'Speichern nicht möglich'],
  // Graphique
  c_title: ['7 derniers jours', 'Last 7 days', 'Últimos 7 días', 'Ultimi 7 giorni', 'Letzte 7 Tage'],
  c_hint: ['Envoyés et clics', 'Sent and clicks', 'Enviados y clics', 'Inviati e clic', 'Gesendet und Klicks'],
  c_sent: ['Envoyés', 'Sent', 'Enviados', 'Inviati', 'Gesendet'], c_clicks: ['Clics', 'Clicks', 'Clics', 'Clic', 'Klicks'],
  // Tableau
  t_title: ['Envois du jour', 'Today’s sends', 'Envíos de hoy', 'Invii di oggi', 'Heutige Sendungen'],
  t_hint: ['Plus récent en haut', 'Most recent first', 'Más reciente arriba', 'Più recente in alto', 'Neueste oben'],
  t_to: ['Destinataire', 'Recipient', 'Destinatario', 'Destinatario', 'Empfänger'], t_time: ['Heure', 'Time', 'Hora', 'Ora', 'Zeit'],
  t_status: ['Statut', 'Status', 'Estado', 'Stato', 'Status'], t_click: ['Clic', 'Click', 'Clic', 'Clic', 'Klick'],
  t_empty: ['Aucun envoi aujourd’hui pour l’instant.', 'Nothing sent today yet.', 'Aún no se ha enviado nada hoy.', 'Ancora nessun invio oggi.', 'Heute noch nichts gesendet.'],
  st_sent: ['Envoyé', 'Sent', 'Enviado', 'Inviato', 'Gesendet'], st_delivered: ['Livré', 'Delivered', 'Entregado', 'Consegnato', 'Zugestellt'],
  st_bounced: ['Rebond : adresse inconnue', 'Bounced: unknown address', 'Rebotado: dirección desconocida', 'Rimbalzato: indirizzo sconosciuto', 'Bounce: Adresse unbekannt'],
  st_complained: ['Signalé comme spam', 'Marked as spam', 'Marcado como spam', 'Segnalato come spam', 'Als Spam gemeldet'],
  st_failed: ['Erreur d’envoi', 'Send error', 'Error de envío', 'Errore di invio', 'Sendefehler'],
  yes: ['Oui', 'Yes', 'Sí', 'Sì', 'Ja'], no: ['Non', 'No', 'No', 'No', 'Nein'],
  // Import
  i_title: ['Importer des contacts', 'Import contacts', 'Importar contactos', 'Importa contatti', 'Kontakte importieren'],
  i_hint: ['Un contact par ligne : email, ou email, prénom. Seuls des contacts qui ont donné leur accord.', 'One contact per line: email, or email, first name. Only contacts who gave their consent.', 'Un contacto por línea: email, o email, nombre. Solo contactos que dieron su consentimiento.', 'Un contatto per riga: email, oppure email, nome. Solo contatti che hanno dato il consenso.', 'Ein Kontakt pro Zeile: E-Mail oder E-Mail, Vorname. Nur Kontakte, die zugestimmt haben.'],
  i_list: ['Liste', 'List', 'Lista', 'Elenco', 'Liste'],
  i_source: ['Source (ex. Test de forme, formulaire du site)', 'Source (e.g. Fitness test, site form)', 'Fuente (p. ej. Test de forma, formulario del sitio)', 'Fonte (es. Test di forma, modulo del sito)', 'Quelle (z. B. Fitnesstest, Website-Formular)'],
  i_consent: ['Preuve d’accord (ex. case cochée à l’inscription)', 'Proof of consent (e.g. box ticked at sign-up)', 'Prueba de consentimiento (p. ej. casilla marcada al inscribirse)', 'Prova del consenso (es. casella spuntata all’iscrizione)', 'Einwilligungsnachweis (z. B. Häkchen bei der Anmeldung)'],
  i_go: ['Importer', 'Import', 'Importar', 'Importa', 'Importieren'],
  i_done: ['{a} ajoutés, {d} déjà présents, {i} lignes ignorées', '{a} added, {d} already present, {i} lines skipped', '{a} añadidos, {d} ya existentes, {i} líneas ignoradas', '{a} aggiunti, {d} già presenti, {i} righe ignorate', '{a} hinzugefügt, {d} bereits vorhanden, {i} Zeilen übersprungen'],
  i_err: ['Import impossible', 'Import failed', 'No se pudo importar', 'Importazione non riuscita', 'Import nicht möglich'],
  // Message
  m_title: ['Message envoyé', 'Message sent', 'Mensaje enviado', 'Messaggio inviato', 'Gesendete Nachricht'],
  m_hint: ['Variables : {prenom}, {lien} (lien suivi vers le site), {desinscription}.', 'Variables: {prenom}, {lien} (tracked link to the site), {desinscription}.', 'Variables: {prenom}, {lien} (enlace con seguimiento al sitio), {desinscription}.', 'Variabili: {prenom}, {lien} (link tracciato verso il sito), {desinscription}.', 'Variablen: {prenom}, {lien} (verfolgter Link zur Website), {desinscription}.'],
  m_subject: ['Objet', 'Subject', 'Asunto', 'Oggetto', 'Betreff'], m_body: ['Message', 'Message', 'Mensaje', 'Messaggio', 'Nachricht'],
  m_name: ['Nom de l’expéditeur', 'Sender name', 'Nombre del remitente', 'Nome del mittente', 'Absendername'],
  m_from: ['Adresse expéditeur (validée dans Brevo)', 'Sender address (validated in Brevo)', 'Dirección del remitente (validada en Brevo)', 'Indirizzo del mittente (convalidato in Brevo)', 'Absenderadresse (in Brevo bestätigt)'],
  m_addr: ['Adresse postale (affichée en pied de message)', 'Postal address (shown in the footer)', 'Dirección postal (se muestra al pie)', 'Indirizzo postale (mostrato a piè di messaggio)', 'Postanschrift (in der Fußzeile angezeigt)'],
  m_test: ['M’envoyer un test', 'Send me a test', 'Enviarme una prueba', 'Inviami un test', 'Test an mich senden'],
  m_test_ok: ['Test envoyé à {to}', 'Test sent to {to}', 'Prueba enviada a {to}', 'Test inviato a {to}', 'Test an {to} gesendet'],
}

export function lng(appLang: string): Lng {
  try {
    const s = window.localStorage.getItem('thw-lang')
    if (s && s in IDX) return s as Lng
  } catch { /* ignore */ }
  return (appLang in IDX ? appLang : 'fr') as Lng
}

export function makeT(l: Lng): (key: string, vars?: Record<string, string | number>) => string {
  return (key, vars) => {
    let s = L[key]?.[IDX[l]] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
    return s
  }
}
