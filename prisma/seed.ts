import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Creo admin user di test
  // CREDENZIALI TEST ADMIN:
  // Email: admin@motorplanet.it
  // Password: Admin123!
  const adminPassword = await bcrypt.hash('Admin123!', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@motorplanet.it' },
    update: {
      passwordHash: adminPassword, // Aggiorna password se esiste già
    },
    create: {
      email: 'admin@motorplanet.it',
      passwordHash: adminPassword,
      name: 'Admin MotorPlanet',
      role: 'ADMIN',
      phone: '+39 02 1234567',
    },
  })
  console.log('✅ Admin user creato')
  console.log('   📧 Email: admin@motorplanet.it')
  console.log('   🔑 Password: Admin123!')

  // Creo customer user di test
  // CREDENZIALI TEST USER:
  // Email: user@test.it
  // Password: User123!
  const customerPassword = await bcrypt.hash('User123!', 10)
  const customer = await prisma.user.upsert({
    where: { email: 'user@test.it' },
    update: {
      passwordHash: customerPassword, // Aggiorna password se esiste già
    },
    create: {
      email: 'user@test.it',
      passwordHash: customerPassword,
      name: 'Mario Rossi',
      role: 'CUSTOMER',
      phone: '+39 333 1234567',
    },
  })
  console.log('✅ Customer user creato')
  console.log('   📧 Email: user@test.it')
  console.log('   🔑 Password: User123!')

  // Creo indirizzo di spedizione per customer
  const shippingAddress = await prisma.address.create({
    data: {
      userId: customer.id,
      type: 'SHIPPING',
      firstName: 'Mario',
      lastName: 'Rossi',
      email: customer.email,
      phone: customer.phone || '+39 333 1234567',
      address: 'Via Roma 123',
      city: 'Roma',
      postalCode: '00100',
      province: 'RM',
      country: 'Italia',
      isDefault: true,
    },
  })
  console.log('✅ Indirizzo di spedizione creato per customer')

  // Creo indirizzo di fatturazione per customer (stesso indirizzo)
  const billingAddress = await prisma.address.create({
    data: {
      userId: customer.id,
      type: 'BILLING',
      firstName: 'Mario',
      lastName: 'Rossi',
      email: customer.email,
      phone: customer.phone || '+39 333 1234567',
      address: 'Via Roma 123',
      city: 'Roma',
      postalCode: '00100',
      province: 'RM',
      country: 'Italia',
      isDefault: true,
    },
  })
  console.log('✅ Indirizzo di fatturazione creato per customer')

  // Creo categorie
  const categorie = [
    { name: 'Filtri', slug: 'filtri', description: 'Filtri per auto' },
    { name: 'Freni', slug: 'freni', description: 'Sistema frenante' },
    { name: 'Elettrico', slug: 'elettrico', description: 'Componenti elettrici' },
    { name: 'Lubrificanti', slug: 'lubrificanti', description: 'Oli e lubrificanti' },
    { name: 'Sospensioni', slug: 'sospensioni', description: 'Sistema sospensione' },
    { name: 'Accensione', slug: 'accensione', description: 'Sistema accensione' },
    { name: 'Motore', slug: 'motore', description: 'Componenti motore' },
  ]

  for (const cat of categorie) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log('✅ Categorie create')

  // Recupero tutte le categorie
  const categoriaFiltri = await prisma.category.findUnique({ where: { slug: 'filtri' } })
  const categoriaLubrificanti = await prisma.category.findUnique({ where: { slug: 'lubrificanti' } })
  const categoriaElettrico = await prisma.category.findUnique({ where: { slug: 'elettrico' } })
  const categoriaFreni = await prisma.category.findUnique({ where: { slug: 'freni' } })
  const categoriaSospensioni = await prisma.category.findUnique({ where: { slug: 'sospensioni' } })
  const categoriaAccensione = await prisma.category.findUnique({ where: { slug: 'accensione' } })
  const categoriaMotore = await prisma.category.findUnique({ where: { slug: 'motore' } })

  // Array di 30 prodotti demo
  const prodottiDemo = [
    // FILTRI (7 prodotti)
    {
      name: 'Filtro Olio Motore Bosch OF123',
      slug: 'filtro-olio-motore-bosch-of123',
      description: 'Filtro olio motore di alta qualità Bosch, compatibile con varie marche auto. Efficienza filtrante 99%',
      price: 24.99,
      image: '/images/products/filtro-olio-bosch.jpg',
      categoryId: categoriaFiltri?.id || '',
      brand: 'Bosch',
      partNumber: 'OF123',
      sku: 'FILT-OF123-001',
      stockQuantity: 50,
      customFields: JSON.stringify({ threadType: 'M20x1.5', outerDiameter: 75, height: 85 }),
    },
    {
      name: 'Filtro Aria Motore Mann Filter CU 28001',
      slug: 'filtro-aria-motore-mann-cu28001',
      description: 'Filtro aria motore Mann Filter, rimozione polvere e particolato. Adatto per motori diesel e benzina',
      price: 18.50,
      image: '/images/products/filtro-aria-mann.jpg',
      categoryId: categoriaFiltri?.id || '',
      brand: 'Mann Filter',
      partNumber: 'CU28001',
      sku: 'FILT-ARIA-MANN-001',
      stockQuantity: 45,
      customFields: JSON.stringify({ type: 'aria', dimensions: '20x25x5cm' }),
    },
    {
      name: 'Filtro Carburante Diesel Bosch 0450927080',
      slug: 'filtro-carburante-diesel-bosch-0450927080',
      description: 'Filtro carburante diesel ad alta efficienza, separazione acqua e particolato',
      price: 32.90,
      image: '/images/products/filtro-carburante-bosch.jpg',
      categoryId: categoriaFiltri?.id || '',
      brand: 'Bosch',
      partNumber: '0450927080',
      sku: 'FILT-CARB-BOSCH-001',
      stockQuantity: 30,
      customFields: JSON.stringify({ fuelType: 'diesel', connectionType: 'rapido' }),
    },
    {
      name: 'Filtro Olio Motore Fram PH3516',
      slug: 'filtro-olio-motore-fram-ph3516',
      description: 'Filtro olio motore Fram premium, protezione ottimale del motore',
      price: 22.99,
      image: '/images/products/filtro-olio-fram.jpg',
      categoryId: categoriaFiltri?.id || '',
      brand: 'Fram',
      partNumber: 'PH3516',
      sku: 'FILT-OF-FRAM-001',
      stockQuantity: 40,
      customFields: JSON.stringify({ threadType: 'M18x1.5', outerDiameter: 70, height: 80 }),
    },
    {
      name: 'Filtro Abitacolo K&N VF2010',
      slug: 'filtro-abitacolo-kn-vf2010',
      description: 'Filtro abitacolo K&N lavabile e riutilizzabile. Rimozione allergeni e odori',
      price: 45.00,
      image: '/images/products/filtro-abitacolo-kn.jpg',
      categoryId: categoriaFiltri?.id || '',
      brand: 'K&N',
      partNumber: 'VF2010',
      sku: 'FILT-ABIT-KN-001',
      stockQuantity: 25,
      customFields: JSON.stringify({ type: 'abitacolo', washable: true }),
    },
    {
      name: 'Filtro Olio Motore Mahle OC306',
      slug: 'filtro-olio-motore-mahle-oc306',
      description: 'Filtro olio motore Mahle, qualità OEM. Compatibile con veicoli VW, Audi, Seat, Skoda',
      price: 19.90,
      image: '/images/products/filtro-olio-mahle.jpg',
      categoryId: categoriaFiltri?.id || '',
      brand: 'Mahle',
      partNumber: 'OC306',
      sku: 'FILT-OF-MAHLE-001',
      stockQuantity: 55,
      customFields: JSON.stringify({ threadType: 'M20x1.5', compatible: 'VW Group' }),
    },
    {
      name: 'Filtro Aria Sport K&N 33-2458',
      slug: 'filtro-aria-sport-kn-332458',
      description: 'Filtro aria sportivo K&N lavabile, aumento potenza e consumi ridotti',
      price: 65.00,
      image: '/images/products/filtro-aria-sport-kn.jpg',
      categoryId: categoriaFiltri?.id || '',
      brand: 'K&N',
      partNumber: '33-2458',
      sku: 'FILT-ARIA-SPORT-KN-001',
      stockQuantity: 15,
      customFields: JSON.stringify({ type: 'sport', washable: true, powerIncrease: '+3%' }),
    },
    // LUBRIFICANTI (5 prodotti)
    {
      name: 'Olio Motore 10W-40 Sintetico Castrol Edge 5L',
      slug: 'olio-motore-10w40-sintetico-castrol-edge-5l',
      description: 'Olio motore sintetico Castrol Edge ad alte prestazioni, 10W-40. Protezione avanzata per motori moderni',
      price: 42.90,
      image: '/images/products/olio-castrol-10w40.jpg',
      categoryId: categoriaLubrificanti?.id || '',
      brand: 'Castrol',
      partNumber: 'OL10W40-5L',
      sku: 'OLIO-CASTROL-10W40-5L',
      stockQuantity: 35,
      customFields: JSON.stringify({ vehicleType: 'auto', viscosity: '10W-40', baseType: 'sintetico', capacity: 5, aceaLicense: 'A3/B4', apiStandard: 'SN' }),
    },
    {
      name: 'Olio Motore 5W-30 Sintetico Mobil 1 5L',
      slug: 'olio-motore-5w30-sintetico-mobil1-5l',
      description: 'Olio motore sintetico Mobil 1 5W-30, ideale per motori turbo e ad alte prestazioni',
      price: 48.50,
      image: '/images/products/olio-mobil-5w30.jpg',
      categoryId: categoriaLubrificanti?.id || '',
      brand: 'Mobil',
      partNumber: 'MOB5W30-5L',
      sku: 'OLIO-MOBIL-5W30-5L',
      stockQuantity: 28,
      customFields: JSON.stringify({ vehicleType: 'auto', viscosity: '5W-30', baseType: 'sintetico', capacity: 5, aceaLicense: 'A5/B5', apiStandard: 'SP' }),
    },
    {
      name: 'Olio Motore 15W-50 Semi-Sintetico Agip 4L',
      slug: 'olio-motore-15w50-semisintetico-agip-4l',
      description: 'Olio motore semi-sintetico Agip 15W-50, ottimo rapporto qualità-prezzo per veicoli vecchi',
      price: 28.90,
      image: '/images/products/olio-agip-15w50.jpg',
      categoryId: categoriaLubrificanti?.id || '',
      brand: 'Agip',
      partNumber: 'AG15W50-4L',
      sku: 'OLIO-AGIP-15W50-4L',
      stockQuantity: 42,
      customFields: JSON.stringify({ vehicleType: 'auto', viscosity: '15W-50', baseType: 'semi-sintetico', capacity: 4 }),
    },
    {
      name: 'Olio Trasmissione 75W-90 GL-4 Motul 1L',
      slug: 'olio-trasmissione-75w90-gl4-motul-1l',
      description: 'Olio trasmissione manuale Motul 75W-90 GL-4, protezione sincronizzatori e ingranaggi',
      price: 18.90,
      image: '/images/products/olio-trasmissione-motul.jpg',
      categoryId: categoriaLubrificanti?.id || '',
      brand: 'Motul',
      partNumber: 'MOT75W90-1L',
      sku: 'OLIO-TRASM-MOTUL-1L',
      stockQuantity: 38,
      customFields: JSON.stringify({ type: 'trasmissione', viscosity: '75W-90', glRating: 'GL-4', capacity: 1 }),
    },
    {
      name: 'Olio Moto 10W-40 Sintetico Repsol Moto Racing 4L',
      slug: 'olio-moto-10w40-sintetico-repsol-4l',
      description: 'Olio motore moto Repsol Racing 10W-40 sintetico, ideale per motocicli sportivi',
      price: 39.90,
      image: '/images/products/olio-moto-repsol.jpg',
      categoryId: categoriaLubrificanti?.id || '',
      brand: 'Repsol',
      partNumber: 'REP10W40-4L',
      sku: 'OLIO-MOTO-REPSOL-4L',
      stockQuantity: 20,
      customFields: JSON.stringify({ vehicleType: 'moto', viscosity: '10W-40', baseType: 'sintetico', capacity: 4, jaso: 'MA2' }),
    },
    // ELETTRICO (6 prodotti)
    {
      name: 'Batteria Auto 12V 60Ah Varta Blue Dynamic',
      slug: 'batteria-auto-12v-60ah-varta-blue',
      description: 'Batteria auto 12V 60Ah Varta Blue Dynamic, avviamento rapido e affidabilità garantita',
      price: 89.99,
      image: '/images/products/batteria-varta-60ah.jpg',
      categoryId: categoriaElettrico?.id || '',
      brand: 'Varta',
      partNumber: 'BAT6012',
      sku: 'BATT-VARTA-60AH',
      stockQuantity: 22,
      customFields: JSON.stringify({ voltage: '12', capacity: 60, technology: 'agm', terminalType: 'european', dimensions: '23.8x17.5x19.0cm' }),
    },
    {
      name: 'Batteria Auto 12V 74Ah Bosch S5 Silver Plus',
      slug: 'batteria-auto-12v-74ah-bosch-s5',
      description: 'Batteria auto Bosch S5 Silver Plus 12V 74Ah, tecnologia Silver Calcium per maggiore durata',
      price: 125.00,
      image: '/images/products/batteria-bosch-74ah.jpg',
      categoryId: categoriaElettrico?.id || '',
      brand: 'Bosch',
      partNumber: 'BAT7412',
      sku: 'BATT-BOSCH-74AH',
      stockQuantity: 18,
      customFields: JSON.stringify({ voltage: '12', capacity: 74, technology: 'silver-calcium', terminalType: 'european' }),
    },
    {
      name: 'Alternatore Bosch AL0082N 12V 120A',
      slug: 'alternatore-bosch-al0082n-12v-120a',
      description: 'Alternatore Bosch 12V 120A, ricostruito OEM. Compatibile con molti modelli VW, Audi, Seat',
      price: 245.00,
      image: '/images/products/alternatore-bosch.jpg',
      categoryId: categoriaElettrico?.id || '',
      brand: 'Bosch',
      partNumber: 'AL0082N',
      sku: 'ALT-BOSCH-120A',
      stockQuantity: 8,
      customFields: JSON.stringify({ voltage: '12', amperage: 120, type: 'ricostruito' }),
    },
    {
      name: 'Motorino Avviamento Bosch SR0413X',
      slug: 'motorino-avviamento-bosch-sr0413x',
      description: 'Motorino di avviamento Bosch SR0413X, compatibile con modelli VW Golf, Passat, Touran',
      price: 185.00,
      image: '/images/products/motorino-avviamento-bosch.jpg',
      categoryId: categoriaElettrico?.id || '',
      brand: 'Bosch',
      partNumber: 'SR0413X',
      sku: 'MOT-AVVI-BOSCH-001',
      stockQuantity: 12,
      customFields: JSON.stringify({ voltage: '12', power: '1.4kW', compatible: 'VW Group' }),
    },
    {
      name: 'Candela Accensione NGK BKR6E',
      slug: 'candela-accensione-ngk-bkr6e',
      description: 'Candela accensione NGK BKR6E, standard. Confezione da 4 pezzi',
      price: 15.90,
      image: '/images/products/candela-ngk.jpg',
      categoryId: categoriaElettrico?.id || '',
      brand: 'NGK',
      partNumber: 'BKR6E-4',
      sku: 'CAND-NGK-BKR6E-4',
      stockQuantity: 60,
      customFields: JSON.stringify({ type: 'standard', thread: 'M14x1.25', gap: '0.7-0.8mm', quantity: 4 }),
    },
    {
      name: 'Fusibile Kit Universale 100 Pezzi',
      slug: 'fusibile-kit-universale-100-pezzi',
      description: 'Kit fusibili universale 100 pezzi, varie amperaggi. Scatola portafusibili inclusa',
      price: 12.50,
      image: '/images/products/kit-fusibili.jpg',
      categoryId: categoriaElettrico?.id || '',
      brand: 'Universal',
      partNumber: 'FUS-KIT-100',
      sku: 'FUS-KIT-UNIV-100',
      stockQuantity: 45,
      customFields: JSON.stringify({ type: 'universale', quantity: 100, amperages: '5A-30A' }),
    },
    // FRENI (5 prodotti)
    {
      name: 'Pastiglie Freno Anteriori Brembo P23077',
      slug: 'pastiglie-freno-anteriori-brembo-p23077',
      description: 'Pastiglie freno anteriori Brembo, alta qualità e resistenza all\'usura. Set completo per asse anteriore',
      price: 45.90,
      image: '/images/products/pastiglie-freno-brembo.jpg',
      categoryId: categoriaFreni?.id || '',
      brand: 'Brembo',
      partNumber: 'P23077',
      sku: 'PAST-FR-BREMBO-F',
      stockQuantity: 30,
      customFields: JSON.stringify({ position: 'anteriore', type: 'ceramico', compatibility: 'multi-marca' }),
    },
    {
      name: 'Dischi Freno Anteriori Brembo OB01 312mm',
      slug: 'dischi-freno-anteriori-brembo-ob01-312mm',
      description: 'Dischi freno anteriori Brembo OB01, diametro 312mm. Ventilati per migliore dissipazione calore',
      price: 85.00,
      image: '/images/products/dischi-freno-brembo.jpg',
      categoryId: categoriaFreni?.id || '',
      brand: 'Brembo',
      partNumber: 'OB01-312',
      sku: 'DISC-FR-BREMBO-312',
      stockQuantity: 18,
      customFields: JSON.stringify({ position: 'anteriore', diameter: 312, type: 'ventilato', thickness: '28mm' }),
    },
    {
      name: 'Pastiglie Freno Posteriori Ferodo FDB418',
      slug: 'pastiglie-freno-posteriori-ferodo-fdb418',
      description: 'Pastiglie freno posteriori Ferodo FDB418, set completo. Bassa produzione polveri',
      price: 32.50,
      image: '/images/products/pastiglie-freno-ferodo.jpg',
      categoryId: categoriaFreni?.id || '',
      brand: 'Ferodo',
      partNumber: 'FDB418',
      sku: 'PAST-FR-FERODO-R',
      stockQuantity: 35,
      customFields: JSON.stringify({ position: 'posteriore', type: 'low-dust' }),
    },
    {
      name: 'Liquido Freno DOT 4 Brembo 500ml',
      slug: 'liquido-freno-dot4-brembo-500ml',
      description: 'Liquido freno Brembo DOT 4, 500ml. Alto punto di ebollizione, ideale per uso sportivo',
      price: 12.90,
      image: '/images/products/liquido-freno-brembo.jpg',
      categoryId: categoriaFreni?.id || '',
      brand: 'Brembo',
      partNumber: 'LFDOT4-500',
      sku: 'LIQ-FR-BREMBO-500',
      stockQuantity: 50,
      customFields: JSON.stringify({ type: 'DOT 4', capacity: 500, boilingPoint: '250°C' }),
    },
    {
      name: 'Dischi Freno Posteriori Textar 285mm',
      slug: 'dischi-freno-posteriori-textar-285mm',
      description: 'Dischi freno posteriori Textar, diametro 285mm. Pieni per uso normale',
      price: 65.00,
      image: '/images/products/dischi-freno-textar.jpg',
      categoryId: categoriaFreni?.id || '',
      brand: 'Textar',
      partNumber: 'TEX-285-R',
      sku: 'DISC-FR-TEXTAR-285',
      stockQuantity: 20,
      customFields: JSON.stringify({ position: 'posteriore', diameter: 285, type: 'pieno' }),
    },
    // SOSPENSIONI (3 prodotti)
    {
      name: 'Ammortizzatore Anteriore Sachs 312-708',
      slug: 'ammortizzatore-anteriore-sachs-312708',
      description: 'Ammortizzatore anteriore Sachs 312-708, sinistro. Qualità OEM, garanzia 2 anni',
      price: 68.00,
      image: '/images/products/ammortizzatore-sachs.jpg',
      categoryId: categoriaSospensioni?.id || '',
      brand: 'Sachs',
      partNumber: '312-708',
      sku: 'AMM-SACHS-312-708',
      stockQuantity: 15,
      customFields: JSON.stringify({ position: 'anteriore', side: 'sinistro', type: 'twin-tube' }),
    },
    {
      name: 'Molle Sospensione Eibach Pro-Kit',
      slug: 'molle-sospensione-eibach-prokit',
      description: 'Molle sospensione Eibach Pro-Kit, abbassamento 30-35mm. Set completo anteriore e posteriore',
      price: 285.00,
      image: '/images/products/molle-eibach.jpg',
      categoryId: categoriaSospensioni?.id || '',
      brand: 'Eibach',
      partNumber: 'EIB-PRO-001',
      sku: 'MOLLE-EIBACH-PRO',
      stockQuantity: 10,
      customFields: JSON.stringify({ type: 'lowering', drop: '30-35mm', position: 'completo' }),
    },
    {
      name: 'Spalla Ammortizzatore Lemforder 37906 01',
      slug: 'spalla-ammortizzatore-lemforder-37906',
      description: 'Spalla ammortizzatore Lemforder 37906 01, anteriore sinistra. Qualità OEM',
      price: 42.50,
      image: '/images/products/spalla-ammortizzatore.jpg',
      categoryId: categoriaSospensioni?.id || '',
      brand: 'Lemforder',
      partNumber: '37906-01',
      sku: 'SPALLA-LEMF-37906',
      stockQuantity: 22,
      customFields: JSON.stringify({ position: 'anteriore', side: 'sinistro' }),
    },
    // ACCENSIONE (2 prodotti)
    {
      name: 'Bobina Accensione Bosch 0221604023',
      slug: 'bobina-accensione-bosch-0221604023',
      description: 'Bobina accensione Bosch 0221604023, compatibile con molti modelli VW, Audi, Skoda, Seat',
      price: 65.00,
      image: '/images/products/bobina-accensione-bosch.jpg',
      categoryId: categoriaAccensione?.id || '',
      brand: 'Bosch',
      partNumber: '0221604023',
      sku: 'BOB-BOSCH-0221604023',
      stockQuantity: 25,
      customFields: JSON.stringify({ type: 'singola', compatible: 'VW Group' }),
    },
    {
      name: 'Cavi Accensione NGK BKR6EIX 4 Pezzi',
      slug: 'cavi-accensione-ngk-bkr6eix-4',
      description: 'Cavi accensione NGK, set da 4 pezzi. Resistenza ohmica ottimizzata per prestazioni migliori',
      price: 55.00,
      image: '/images/products/cavi-accensione-ngk.jpg',
      categoryId: categoriaAccensione?.id || '',
      brand: 'NGK',
      partNumber: 'NGK-CAV-4',
      sku: 'CAVI-NGK-4',
      stockQuantity: 20,
      customFields: JSON.stringify({ type: 'high-performance', quantity: 4, resistance: 'low' }),
    },
    // MOTORE (2 prodotti)
    {
      name: 'Pompa Acqua Saleri 5548400',
      slug: 'pompa-acqua-saleri-5548400',
      description: 'Pompa acqua Saleri 5548400, con cuscinetto sigillato. Compatibile con molti motori Fiat',
      price: 48.50,
      image: '/images/products/pompa-acqua-saleri.jpg',
      categoryId: categoriaMotore?.id || '',
      brand: 'Saleri',
      partNumber: '5548400',
      sku: 'POMPA-ACQUA-SALERI',
      stockQuantity: 16,
      customFields: JSON.stringify({ type: 'meccanica', compatible: 'Fiat' }),
    },
    {
      name: 'Filtro Gasolio Mann Filter WK842/7',
      slug: 'filtro-gasolio-mann-wk842',
      description: 'Filtro gasolio Mann Filter WK842/7, con preriscaldatore. Alta efficienza di filtraggio',
      price: 38.90,
      image: '/images/products/filtro-gasolio-mann.jpg',
      categoryId: categoriaMotore?.id || '',
      brand: 'Mann Filter',
      partNumber: 'WK842/7',
      sku: 'FILT-GAS-MANN-842',
      stockQuantity: 28,
      customFields: JSON.stringify({ fuelType: 'diesel', withHeater: true }),
    },
  ]

  // Creo i 30 prodotti
  for (const prodotto of prodottiDemo) {
    try {
      await prisma.product.upsert({
        where: { sku: prodotto.sku },
        update: {
          // Aggiorna solo se il prodotto esiste già
          stockQuantity: prodotto.stockQuantity,
          inStock: prodotto.stockQuantity > 0,
        },
        create: {
          ...prodotto,
          inStock: prodotto.stockQuantity > 0,
          active: true,
        },
      })
      console.log(`✅ Prodotto creato: ${prodotto.name}`)
    } catch (error: any) {
      console.error(`❌ Errore creazione prodotto ${prodotto.name}:`, error.message)
    }
  }

  console.log(`✅ Creati ${prodottiDemo.length} prodotti demo`)

  console.log('✅ Seeding completato!')
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

