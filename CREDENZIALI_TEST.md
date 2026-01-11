# Credenziali Account di Test

## Admin Account
**Email:** admin@motorplanet.it  
**Password:** Admin123!

Questo account ha accesso completo all'area amministratore per:
- Gestione prodotti (inserimento, modifica, attivazione/disattivazione)
- Gestione ordini (visualizzazione, modifica stato, inserimento tracking)
- Gestione utenti
- Risposta ai messaggi degli utenti

## User Account (Cliente)
**Email:** user@test.it  
**Password:** User123!

Questo account è un normale cliente che può:
- Navigare il catalogo prodotti
- Aggiungere prodotti al carrello
- Effettuare ordini
- Visualizzare ordini passati
- Lasciare recensioni per ordini consegnati
- Contattare l'admin tramite messaggistica interna

---

**Nota:** Questi account sono stati creati automaticamente durante il seeding del database.  
Per rigenerare il database con questi account, eseguire: `npm run db:seed`

