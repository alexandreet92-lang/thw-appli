export interface FoodItem {
  code: string
  product_name: string
  image_url?: string
  nutriments: {
    'energy-kcal_100g': number
    proteins_100g: number
    carbohydrates_100g: number
    fat_100g: number
  }
}

export const COMMON_FOODS: FoodItem[] = [
  // Proteines
  { code: 'custom_1',  product_name: 'Blanc de poulet (cuit)',    nutriments: { 'energy-kcal_100g': 165, proteins_100g: 31,   carbohydrates_100g: 0,    fat_100g: 3.6  } },
  { code: 'custom_2',  product_name: 'Oeuf entier',               nutriments: { 'energy-kcal_100g': 155, proteins_100g: 13,   carbohydrates_100g: 1.1,  fat_100g: 11   } },
  { code: 'custom_3',  product_name: 'Thon en boite (au naturel)',nutriments: { 'energy-kcal_100g': 116, proteins_100g: 26,   carbohydrates_100g: 0,    fat_100g: 1    } },
  { code: 'custom_4',  product_name: 'Saumon (cuit)',             nutriments: { 'energy-kcal_100g': 208, proteins_100g: 20,   carbohydrates_100g: 0,    fat_100g: 13   } },
  { code: 'custom_5',  product_name: 'Boeuf hache 5% MG',        nutriments: { 'energy-kcal_100g': 152, proteins_100g: 21,   carbohydrates_100g: 0,    fat_100g: 7.5  } },
  // Feculents
  { code: 'custom_6',  product_name: 'Riz blanc (cuit)',          nutriments: { 'energy-kcal_100g': 130, proteins_100g: 2.7,  carbohydrates_100g: 28,   fat_100g: 0.3  } },
  { code: 'custom_7',  product_name: 'Pates cuites',              nutriments: { 'energy-kcal_100g': 158, proteins_100g: 5.8,  carbohydrates_100g: 31,   fat_100g: 0.9  } },
  { code: 'custom_8',  product_name: 'Pomme de terre (cuite)',    nutriments: { 'energy-kcal_100g': 87,  proteins_100g: 1.9,  carbohydrates_100g: 20,   fat_100g: 0.1  } },
  { code: 'custom_9',  product_name: 'Pain complet',              nutriments: { 'energy-kcal_100g': 247, proteins_100g: 9,    carbohydrates_100g: 41,   fat_100g: 3.5  } },
  { code: 'custom_10', product_name: "Flocons d'avoine",          nutriments: { 'energy-kcal_100g': 368, proteins_100g: 13,   carbohydrates_100g: 58,   fat_100g: 7    } },
  // Legumes
  { code: 'custom_11', product_name: 'Brocoli (cuit)',            nutriments: { 'energy-kcal_100g': 35,  proteins_100g: 2.4,  carbohydrates_100g: 5.1,  fat_100g: 0.4  } },
  { code: 'custom_12', product_name: 'Epinards (cuits)',          nutriments: { 'energy-kcal_100g': 23,  proteins_100g: 2.9,  carbohydrates_100g: 1.4,  fat_100g: 0.4  } },
  { code: 'custom_13', product_name: 'Tomate',                    nutriments: { 'energy-kcal_100g': 18,  proteins_100g: 0.9,  carbohydrates_100g: 3.5,  fat_100g: 0.2  } },
  // Laitiers
  { code: 'custom_14', product_name: 'Yaourt grec 0%',            nutriments: { 'energy-kcal_100g': 59,  proteins_100g: 10,   carbohydrates_100g: 3.6,  fat_100g: 0.4  } },
  { code: 'custom_15', product_name: 'Fromage blanc 0%',          nutriments: { 'energy-kcal_100g': 45,  proteins_100g: 7.5,  carbohydrates_100g: 3.6,  fat_100g: 0.1  } },
  { code: 'custom_16', product_name: 'Lait demi-ecreme',          nutriments: { 'energy-kcal_100g': 46,  proteins_100g: 3.2,  carbohydrates_100g: 4.7,  fat_100g: 1.6  } },
  // Fruits
  { code: 'custom_17', product_name: 'Banane',                    nutriments: { 'energy-kcal_100g': 89,  proteins_100g: 1.1,  carbohydrates_100g: 23,   fat_100g: 0.3  } },
  { code: 'custom_18', product_name: 'Pomme',                     nutriments: { 'energy-kcal_100g': 52,  proteins_100g: 0.3,  carbohydrates_100g: 14,   fat_100g: 0.2  } },
  // Graisses / divers
  { code: 'custom_19', product_name: "Huile d'olive",             nutriments: { 'energy-kcal_100g': 884, proteins_100g: 0,    carbohydrates_100g: 0,    fat_100g: 100  } },
  { code: 'custom_20', product_name: 'Amandes',                   nutriments: { 'energy-kcal_100g': 579, proteins_100g: 21,   carbohydrates_100g: 22,   fat_100g: 49   } },
]
