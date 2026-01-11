// Configurazione dinamica dei tipi di prodotto
// Ogni tipo ha campi specifici che verranno mostrati nella maschera di inserimento

export interface ProductTypeField {
  name: string // Nome del campo (chiave)
  label: string // Etichetta da mostrare
  type: 'text' | 'number' | 'select' | 'toggle' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[] // Per type='select'
  defaultValue?: string | number | boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface ProductTypeConfig {
  id: string
  name: string // Nome visualizzato (es. "Olio Motore")
  category: string // Categoria a cui appartiene
  fields: ProductTypeField[] // Campi specifici per questo tipo
}

// Configurazione dei tipi prodotto disponibili
export const productTypesConfig: ProductTypeConfig[] = [
  {
    id: 'olio-motore',
    name: 'Olio Motore',
    category: 'Lubrificanti',
    fields: [
      {
        name: 'vehicleType',
        label: 'Tipo Veicolo',
        type: 'toggle',
        required: true,
        defaultValue: 'auto',
        options: [
          { value: 'auto', label: 'Auto' },
          { value: 'moto', label: 'Moto' },
          { value: 'entrambi', label: 'Entrambi' },
        ],
      },
      {
        name: 'viscosity',
        label: 'Viscosità (Indice W)',
        type: 'select',
        required: true,
        placeholder: 'Seleziona viscosità',
        options: [
          { value: '0W-20', label: '0W-20' },
          { value: '0W-30', label: '0W-30' },
          { value: '0W-40', label: '0W-40' },
          { value: '5W-30', label: '5W-30' },
          { value: '5W-40', label: '5W-40' },
          { value: '10W-40', label: '10W-40' },
          { value: '10W-50', label: '10W-50' },
          { value: '15W-40', label: '15W-40' },
          { value: '20W-50', label: '20W-50' },
        ],
      },
      {
        name: 'baseType',
        label: 'Tipo Base',
        type: 'select',
        required: true,
        options: [
          { value: 'minerale', label: 'Minerale' },
          { value: 'sintetico', label: 'Sintetico' },
          { value: 'semisintetico', label: 'Semi-Sintetico' },
        ],
      },
      {
        name: 'capacity',
        label: 'Capacità (litri)',
        type: 'number',
        required: true,
        validation: {
          min: 0.5,
          max: 20,
        },
      },
      {
        name: 'aceaLicense',
        label: 'Licenza ACEA',
        type: 'text',
        placeholder: 'Es. A3/B4, C3, etc.',
      },
      {
        name: 'apiStandard',
        label: 'Standard API',
        type: 'text',
        placeholder: 'Es. SN, SP, etc.',
      },
    ],
  },
  {
    id: 'batteria',
    name: 'Batteria',
    category: 'Elettrico',
    fields: [
      {
        name: 'voltage',
        label: 'Tensione (V)',
        type: 'select',
        required: true,
        options: [
          { value: '12', label: '12V' },
          { value: '24', label: '24V' },
          { value: '6', label: '6V' },
        ],
      },
      {
        name: 'capacity',
        label: 'Capacità (Ah)',
        type: 'number',
        required: true,
        validation: {
          min: 20,
          max: 200,
        },
      },
      {
        name: 'technology',
        label: 'Tecnologia',
        type: 'select',
        required: true,
        options: [
          { value: 'piombo-acido', label: 'Piombo-Acido' },
          { value: 'agm', label: 'AGM' },
          { value: 'gel', label: 'Gel' },
          { value: 'lithium', label: 'Litio' },
        ],
      },
      {
        name: 'terminalType',
        label: 'Tipo Terminali',
        type: 'select',
        options: [
          { value: 'european', label: 'Europei' },
          { value: 'asian', label: 'Asiatici' },
          { value: 'american', label: 'Americani' },
        ],
      },
      {
        name: 'dimensions',
        label: 'Dimensioni (L x W x H cm)',
        type: 'text',
        placeholder: 'Es. 23.8 x 17.5 x 19.0',
      },
    ],
  },
  {
    id: 'filtro-olio',
    name: 'Filtro Olio',
    category: 'Filtri',
    fields: [
      {
        name: 'threadType',
        label: 'Tipo Filettatura',
        type: 'text',
        placeholder: 'Es. M20x1.5',
      },
      {
        name: 'outerDiameter',
        label: 'Diametro Esterno (mm)',
        type: 'number',
        validation: {
          min: 50,
          max: 200,
        },
      },
      {
        name: 'height',
        label: 'Altezza (mm)',
        type: 'number',
        validation: {
          min: 50,
          max: 200,
        },
      },
      {
        name: 'compatibleEngines',
        label: 'Motori Compatibili',
        type: 'textarea',
        placeholder: 'Lista motori compatibili (uno per riga)',
      },
    ],
  },
  {
    id: 'filtro-aria',
    name: 'Filtro Aria',
    category: 'Filtri',
    fields: [
      {
        name: 'filterType',
        label: 'Tipo Filtro',
        type: 'select',
        required: true,
        options: [
          { value: 'cartuccia', label: 'Cartuccia' },
          { value: 'pannello', label: 'Pannello' },
          { value: 'cono', label: 'Cono' },
        ],
      },
      {
        name: 'dimensions',
        label: 'Dimensioni (L x W x H cm)',
        type: 'text',
        placeholder: 'Es. 20.5 x 17.5 x 5.0',
      },
      {
        name: 'filtrationClass',
        label: 'Classe di Filtrazione',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'performance', label: 'Performance' },
          { value: 'racing', label: 'Racing' },
        ],
      },
    ],
  },
  {
    id: 'pastiglie-freno',
    name: 'Pastiglie Freno',
    category: 'Freni',
    fields: [
      {
        name: 'position',
        label: 'Posizione',
        type: 'select',
        required: true,
        options: [
          { value: 'anteriore', label: 'Anteriore' },
          { value: 'posteriore', label: 'Posteriore' },
          { value: 'entrambe', label: 'Entrambe' },
        ],
      },
      {
        name: 'materialType',
        label: 'Tipo Materiale',
        type: 'select',
        required: true,
        options: [
          { value: 'organico', label: 'Organico' },
          { value: 'metallico', label: 'Metallico' },
          { value: 'ceramico', label: 'Ceramico' },
          { value: 'carbon', label: 'Carbonio' },
        ],
      },
      {
        name: 'dimensions',
        label: 'Dimensioni (L x W x H mm)',
        type: 'text',
        placeholder: 'Es. 125 x 60 x 15',
      },
      {
        name: 'thickness',
        label: 'Spessore (mm)',
        type: 'number',
        validation: {
          min: 5,
          max: 30,
        },
      },
    ],
  },
  {
    id: 'filtro-carburante',
    name: 'Filtro Carburante',
    category: 'Filtri',
    fields: [
      {
        name: 'fuelType',
        label: 'Tipo Carburante',
        type: 'select',
        required: true,
        options: [
          { value: 'benzina', label: 'Benzina' },
          { value: 'diesel', label: 'Diesel' },
          { value: 'universale', label: 'Universale' },
        ],
      },
      {
        name: 'connectionType',
        label: 'Tipo Connessione',
        type: 'select',
        options: [
          { value: 'innesto-rapido', label: 'Innesto Rapido' },
          { value: 'filettato', label: 'Filettato' },
          { value: 'morsetti', label: 'Morsetti' },
        ],
      },
      {
        name: 'flowRate',
        label: 'Portata (L/h)',
        type: 'number',
        validation: {
          min: 10,
          max: 500,
        },
      },
    ],
  },
]

// Funzione per ottenere la configurazione di un tipo prodotto
export function getProductTypeConfig(typeId: string): ProductTypeConfig | undefined {
  return productTypesConfig.find((config) => config.id === typeId)
}

// Funzione per ottenere tutti i tipi prodotto
export function getAllProductTypes(): ProductTypeConfig[] {
  return productTypesConfig
}

// Funzione per ottenere i tipi prodotto per categoria
export function getProductTypesByCategory(category: string): ProductTypeConfig[] {
  return productTypesConfig.filter((config) => config.category === category)
}

// Funzione per ottenere le categorie disponibili
export function getProductTypeCategories(): string[] {
  const categories = [...new Set(productTypesConfig.map((config) => config.category))]
  return categories.sort()
}

