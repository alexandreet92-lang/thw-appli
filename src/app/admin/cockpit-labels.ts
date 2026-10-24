// Libellés du Cockpit (vue d'ensemble, revenus, comptes) — fr / en / es / it / de.
export type Lng = 'fr' | 'en' | 'es' | 'it' | 'de'
const IDX: Record<Lng, number> = { fr: 0, en: 1, es: 2, it: 3, de: 4 }
type Row = [string, string, string, string, string]

const L: Record<string, Row> = {
  // En-tête / navigation
  tab_accounts: ['Comptes', 'Accounts', 'Cuentas', 'Account', 'Konten'],
  tab_accounts_sub: ['Qui est inscrit', 'Who signed up', 'Quién se registró', 'Chi è iscritto', 'Wer registriert ist'],
  help: ['Explication', 'Explanation', 'Explicación', 'Spiegazione', 'Erklärung'],
  // L'essentiel
  essential: ['L’essentiel', 'The essentials', 'Lo esencial', 'L’essenziale', 'Das Wesentliche'],
  essential_lead: ['Quatre chiffres suffisent pour savoir si ça avance. Touche « ? » pour savoir d’où vient un chiffre.', 'Four numbers are enough to know if things are moving. Tap “?” to see where a number comes from.', 'Cuatro cifras bastan para saber si avanza. Toca «?» para saber de dónde viene una cifra.', 'Quattro numeri bastano per capire se si avanza. Tocca «?» per sapere da dove viene un numero.', 'Vier Zahlen genügen, um zu sehen, ob es vorangeht. Tippe auf „?“, um zu sehen, woher eine Zahl kommt.'],
  k_accounts: ['Comptes', 'Accounts', 'Cuentas', 'Account', 'Konten'],
  k_accounts_s: ['dont toi. {n} autres personnes se sont déjà connectées.', 'including you. {n} other people have already signed in.', 'incluida la tuya. {n} personas más ya han iniciado sesión.', 'compreso il tuo. {n} altre persone hanno già effettuato l’accesso.', 'darunter deins. {n} weitere Personen haben sich schon angemeldet.'],
  k_accounts_h: ['Nombre total d’inscrits, e-mails non confirmés compris.', 'Total number of sign-ups, including unconfirmed emails.', 'Número total de registros, incluidos los correos sin confirmar.', 'Numero totale di iscritti, comprese le e-mail non confermate.', 'Gesamtzahl der Registrierungen, einschließlich unbestätigter E-Mails.'],
  k_active: ['Actifs ce mois', 'Active this month', 'Activos este mes', 'Attivi questo mese', 'Aktiv diesen Monat'],
  k_active_s: ['{n} sur {t} comptes vus dans l’app ces 30 derniers jours.', '{n} of {t} accounts seen in the app over the last 30 days.', '{n} de {t} cuentas vistas en la app en los últimos 30 días.', '{n} su {t} account visti nell’app negli ultimi 30 giorni.', '{n} von {t} Konten in den letzten 30 Tagen in der App gesehen.'],
  k_active_h: ['Personnes vues dans l’app sur les 30 derniers jours (MAU).', 'People seen in the app over the last 30 days (MAU).', 'Personas vistas en la app en los últimos 30 días (MAU).', 'Persone viste nell’app negli ultimi 30 giorni (MAU).', 'In den letzten 30 Tagen in der App gesehene Personen (MAU).'],
  k_mrr: ['Revenu mensuel', 'Monthly revenue', 'Ingresos mensuales', 'Ricavi mensili', 'Monatsumsatz'],
  k_mrr_s0: ['Personne ne paie encore.', 'Nobody is paying yet.', 'Nadie paga todavía.', 'Nessuno paga ancora.', 'Noch zahlt niemand.'],
  k_mrr_s: ['{n} abonnés payants.', '{n} paying subscribers.', '{n} suscriptores de pago.', '{n} abbonati paganti.', '{n} zahlende Abonnenten.'],
  k_mrr_h: ['Somme des abonnements réellement payés, par mois (MRR). Les accès offerts et le compte propriétaire sont exclus.', 'Sum of subscriptions actually paid, per month (MRR). Gifted access and the owner account are excluded.', 'Suma de las suscripciones realmente pagadas, por mes (MRR). Se excluyen los accesos regalados y la cuenta propietaria.', 'Somma degli abbonamenti realmente pagati, al mese (MRR). Esclusi gli accessi regalati e l’account proprietario.', 'Summe der tatsächlich bezahlten Abos pro Monat (MRR). Geschenkte Zugänge und das Inhaberkonto sind ausgenommen.'],
  k_trials: ['Essais en cours', 'Trials running', 'Pruebas en curso', 'Prove in corso', 'Laufende Tests'],
  k_trials_s0: ['Aucun essai en cours : les 14 jours des derniers comptes sont terminés.', 'No trial running: the 14 days of the latest accounts are over.', 'Ninguna prueba en curso: los 14 días de las últimas cuentas han terminado.', 'Nessuna prova in corso: i 14 giorni degli ultimi account sono terminati.', 'Kein Test läuft: Die 14 Tage der letzten Konten sind vorbei.'],
  k_trials_s: ['{n} comptes dans leurs 14 premiers jours.', '{n} accounts in their first 14 days.', '{n} cuentas en sus primeros 14 días.', '{n} account nei primi 14 giorni.', '{n} Konten in den ersten 14 Tagen.'],
  k_trials_h: ['Comptes créés depuis moins de 14 jours. Au 15e jour, un compte passe tout seul en gratuit.', 'Accounts created less than 14 days ago. On day 15 an account switches to free by itself.', 'Cuentas creadas hace menos de 14 días. El día 15 una cuenta pasa sola a gratuita.', 'Account creati da meno di 14 giorni. Al 15° giorno un account passa da solo al gratuito.', 'Konten, die vor weniger als 14 Tagen erstellt wurden. Am 15. Tag wechselt ein Konto automatisch auf kostenlos.'],
  // Inscriptions
  su_title: ['Les inscriptions, mois par mois', 'Sign-ups, month by month', 'Registros, mes a mes', 'Iscrizioni, mese per mese', 'Registrierungen, Monat für Monat'],
  su_lead: ['Chaque barre est un mois. Passe la souris ou touche une barre pour le détail.', 'Each bar is a month. Hover or tap a bar for details.', 'Cada barra es un mes. Pasa el ratón o toca una barra para ver el detalle.', 'Ogni barra è un mese. Passa il mouse o tocca una barra per il dettaglio.', 'Jeder Balken ist ein Monat. Fahre darüber oder tippe darauf für Details.'],
  su_tip1: ['{m} : 1 compte', '{m}: 1 account', '{m}: 1 cuenta', '{m}: 1 account', '{m}: 1 Konto'],
  su_tipn: ['{m} : {n} comptes', '{m}: {n} accounts', '{m}: {n} cuentas', '{m}: {n} account', '{m}: {n} Konten'],
  su_says: ['Ce que ça dit', 'What it says', 'Lo que dice', 'Cosa dice', 'Was das aussagt'],
  su_peak: ['Meilleur mois : {m} ({n}).', 'Best month: {m} ({n}).', 'Mejor mes: {m} ({n}).', 'Mese migliore: {m} ({n}).', 'Bester Monat: {m} ({n}).'],
  su_last: ['Dernier compte créé le {d}.', 'Last account created on {d}.', 'Última cuenta creada el {d}.', 'Ultimo account creato il {d}.', 'Letztes Konto erstellt am {d}.'],
  su_none: ['Aucune inscription pour l’instant.', 'No sign-ups yet.', 'Aún no hay registros.', 'Ancora nessuna iscrizione.', 'Noch keine Registrierungen.'],
  // Parcours
  fu_title: ['Où les gens décrochent', 'Where people drop off', 'Dónde se pierde la gente', 'Dove la gente abbandona', 'Wo die Leute abspringen'],
  fu_lead: ['Du compte créé jusqu’au paiement. Plus la barre rétrécit, plus l’étape perd de monde.', 'From account creation to payment. The shorter the bar, the more people the step loses.', 'Desde la creación de la cuenta hasta el pago. Cuanto más corta la barra, más gente pierde el paso.', 'Dalla creazione dell’account al pagamento. Più la barra si accorcia, più gente perde il passaggio.', 'Von der Kontoerstellung bis zur Zahlung. Je kürzer der Balken, desto mehr Leute verliert der Schritt.'],
  f_created: ['Comptes créés', 'Accounts created', 'Cuentas creadas', 'Account creati', 'Erstellte Konten'],
  f_confirmed: ['E-mail confirmé', 'Email confirmed', 'Correo confirmado', 'E-mail confermata', 'E-Mail bestätigt'],
  f_signed: ['Connectés au moins une fois', 'Signed in at least once', 'Con sesión iniciada al menos una vez', 'Accesso effettuato almeno una volta', 'Mindestens einmal angemeldet'],
  f_active: ['Actifs ce mois', 'Active this month', 'Activos este mes', 'Attivi questo mese', 'Aktiv diesen Monat'],
  f_paid: ['Abonnés payants', 'Paying subscribers', 'Suscriptores de pago', 'Abbonati paganti', 'Zahlende Abonnenten'],
  // Revenus
  r_lead: ['Calculés uniquement sur de vrais abonnements payés. Les accès offerts et ton propre compte sont exclus.', 'Calculated only on real paid subscriptions. Gifted access and your own account are excluded.', 'Calculado solo sobre suscripciones realmente pagadas. Se excluyen los accesos regalados y tu propia cuenta.', 'Calcolato solo su abbonamenti realmente pagati. Esclusi gli accessi regalati e il tuo account.', 'Nur auf echte bezahlte Abos berechnet. Geschenkte Zugänge und dein eigenes Konto sind ausgenommen.'],
  r_mrr_h: ['MRR : ce que tu encaisses chaque mois.', 'MRR: what you collect every month.', 'MRR: lo que cobras cada mes.', 'MRR: quanto incassi ogni mese.', 'MRR: was du jeden Monat einnimmst.'],
  r_arr: ['Revenu annuel', 'Annual revenue', 'Ingresos anuales', 'Ricavi annuali', 'Jahresumsatz'],
  r_arr_s: ['Le revenu mensuel multiplié par 12.', 'Monthly revenue times 12.', 'Los ingresos mensuales por 12.', 'I ricavi mensili per 12.', 'Monatsumsatz mal 12.'],
  r_arr_h: ['ARR : projection sur 12 mois, si rien ne change.', 'ARR: a 12-month projection if nothing changes.', 'ARR: proyección a 12 meses si nada cambia.', 'ARR: proiezione a 12 mesi se nulla cambia.', 'ARR: Hochrechnung auf 12 Monate, wenn sich nichts ändert.'],
  r_paying: ['Abonnés payants', 'Paying subscribers', 'Suscriptores de pago', 'Abbonati paganti', 'Zahlende Abonnenten'],
  r_paying_s: ['Abonnements Stripe ou store uniquement.', 'Stripe or store subscriptions only.', 'Solo suscripciones de Stripe o de tienda.', 'Solo abbonamenti Stripe o dello store.', 'Nur Stripe- oder Store-Abos.'],
  r_paying_h: ['Comptes avec un vrai abonnement payé.', 'Accounts with a real paid subscription.', 'Cuentas con una suscripción realmente pagada.', 'Account con un vero abbonamento pagato.', 'Konten mit einem echten bezahlten Abo.'],
  r_conv: ['Essai vers payant', 'Trial to paid', 'Prueba a pago', 'Prova a pagamento', 'Test zu bezahlt'],
  r_conv_s: ['Part des essais terminés qui ont payé.', 'Share of finished trials that paid.', 'Parte de las pruebas terminadas que pagaron.', 'Quota delle prove concluse che hanno pagato.', 'Anteil der beendeten Tests, die bezahlt haben.'],
  r_conv_h: ['Comptes payants divisés par les comptes dont l’essai de 14 jours est fini.', 'Paying accounts divided by accounts whose 14-day trial is over.', 'Cuentas de pago divididas por las cuentas cuya prueba de 14 días ha terminado.', 'Account paganti divisi per gli account la cui prova di 14 giorni è finita.', 'Zahlende Konten geteilt durch Konten, deren 14-Tage-Test vorbei ist.'],
  // Comptes
  a_title: ['Les comptes', 'The accounts', 'Las cuentas', 'Gli account', 'Die Konten'],
  a_lead: ['Chaque inscrit, ce qu’il a vraiment (et non ce que dit la base), et quand il est venu pour la dernière fois.', 'Each sign-up, what they really have (not what the database says), and when they last came.', 'Cada registro, lo que tiene de verdad (y no lo que dice la base) y cuándo vino por última vez.', 'Ogni iscritto, cosa ha davvero (e non ciò che dice il database) e quando è venuto l’ultima volta.', 'Jede Registrierung, was sie wirklich hat (nicht, was die Datenbank sagt) und wann sie zuletzt da war.'],
  a_account: ['Compte', 'Account', 'Cuenta', 'Account', 'Konto'],
  a_created: ['Créé le', 'Created', 'Creada el', 'Creato il', 'Erstellt am'],
  a_last: ['Dernière connexion', 'Last sign-in', 'Último acceso', 'Ultimo accesso', 'Letzte Anmeldung'],
  a_offer: ['Offre réelle', 'Actual plan', 'Plan real', 'Piano reale', 'Tatsächlicher Tarif'],
  a_never: ['jamais', 'never', 'nunca', 'mai', 'nie'],
  a_today: ['aujourd’hui', 'today', 'hoy', 'oggi', 'heute'],
  o_owner: ['Propriétaire', 'Owner', 'Propietario', 'Proprietario', 'Inhaber'],
  o_paid: ['Payant', 'Paid', 'De pago', 'A pagamento', 'Bezahlt'],
  o_comp: ['Accès offert', 'Gifted access', 'Acceso regalado', 'Accesso regalato', 'Geschenkter Zugang'],
  o_trial: ['Essai : {n} j restants', 'Trial: {n} days left', 'Prueba: {n} días restantes', 'Prova: {n} giorni rimasti', 'Test: noch {n} Tage'],
  o_free: ['Gratuit (essai terminé)', 'Free (trial over)', 'Gratis (prueba terminada)', 'Gratuito (prova terminata)', 'Kostenlos (Test vorbei)'],
  t_unconf: ['E-mail non confirmé', 'Email not confirmed', 'Correo sin confirmar', 'E-mail non confermata', 'E-Mail nicht bestätigt'],
  t_abandon: ['Paiement non finalisé', 'Payment not completed', 'Pago no finalizado', 'Pagamento non completato', 'Zahlung nicht abgeschlossen'],
  a_note: ['« Propriétaire » : ton compte. « Gratuit » : les 14 jours sont passés. « Paiement non finalisé » : un achat commencé mais jamais payé, sans effet sur l’accès.', '“Owner”: your account. “Free”: the 14 days are over. “Payment not completed”: a purchase started but never paid, with no effect on access.', '«Propietario»: tu cuenta. «Gratis»: han pasado los 14 días. «Pago no finalizado»: una compra iniciada pero nunca pagada, sin efecto en el acceso.', '«Proprietario»: il tuo account. «Gratuito»: i 14 giorni sono passati. «Pagamento non completato»: un acquisto iniziato ma mai pagato, senza effetto sull’accesso.', '„Inhaber“: dein Konto. „Kostenlos“: die 14 Tage sind vorbei. „Zahlung nicht abgeschlossen“: ein begonnener, nie bezahlter Kauf, ohne Auswirkung auf den Zugang.'],
  // Répartition
  tier_title: ['Répartition des comptes par offre', 'Accounts by plan', 'Cuentas por plan', 'Account per piano', 'Konten nach Tarif'],
  tier_owner: ['Propriétaire', 'Owner', 'Propietario', 'Proprietario', 'Inhaber'],
  tier_free: ['Gratuit', 'Free', 'Gratis', 'Gratuito', 'Kostenlos'],
  tier_trial: ['En essai', 'In trial', 'En prueba', 'In prova', 'Im Test'],
  tier_comp: ['Offert', 'Gifted', 'Regalado', 'Regalato', 'Geschenkt'],
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

export function localeOf(l: Lng): string {
  return { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE' }[l]
}
