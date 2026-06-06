// ══════════════════════════════════════════════════════════════════
// Catalogue de plats — source de vérité (curé, orienté sportif).
// « Sain + quotidien » : majorité de plats équilibrés type prépa
// sportive (protéine + féculent + légumes), plus quelques repas
// simples du quotidien. Macros par 100 g (plat cuit/composé).
//
// `q` = terme de recherche (anglais) servant uniquement à récupérer
// UNE photo représentative via Spoonacular lors de l'import.
// Le nom affiché, les macros, la portion restent ceux définis ici.
// ══════════════════════════════════════════════════════════════════

export type DishCategory =
  | 'breakfast' | 'main' | 'salad' | 'soup' | 'side' | 'snack' | 'dessert'

export interface CatalogueDish {
  name:     string
  category: DishCategory
  kcal:     number   // par 100 g
  prot:     number
  gluc:     number
  lip:      number
  portion:  number   // portion par défaut (g)
  q:        string   // terme photo (anglais)
}

export const DISH_CATALOGUE: CatalogueDish[] = [
  // ── Petit-déjeuner ───────────────────────────────────────────────
  { name: 'Porridge avoine & lait',           category: 'breakfast', kcal: 90,  prot: 3.5, gluc: 15, lip: 2,    portion: 300, q: 'oatmeal porridge' },
  { name: "Flocons d'avoine & banane",        category: 'breakfast', kcal: 110, prot: 4,   gluc: 20, lip: 2.5,  portion: 300, q: 'oatmeal banana' },
  { name: 'Œufs brouillés',                   category: 'breakfast', kcal: 150, prot: 11,  gluc: 1,  lip: 11,   portion: 150, q: 'scrambled eggs' },
  { name: 'Omelette aux légumes',             category: 'breakfast', kcal: 130, prot: 10,  gluc: 3,  lip: 9,    portion: 180, q: 'vegetable omelette' },
  { name: 'Skyr & fruits rouges',             category: 'breakfast', kcal: 70,  prot: 9,   gluc: 8,  lip: 0.3,  portion: 200, q: 'skyr berries bowl' },
  { name: 'Fromage blanc & miel',             category: 'breakfast', kcal: 90,  prot: 8,   gluc: 9,  lip: 2,    portion: 200, q: 'cottage cheese honey' },
  { name: 'Pancakes protéinés',               category: 'breakfast', kcal: 170, prot: 12,  gluc: 18, lip: 4,    portion: 150, q: 'protein pancakes' },
  { name: 'Pain complet & œuf',               category: 'breakfast', kcal: 200, prot: 11,  gluc: 22, lip: 7,    portion: 150, q: 'wholegrain toast egg' },
  { name: 'Bowl avoine, fruits & noix',       category: 'breakfast', kcal: 180, prot: 6,   gluc: 24, lip: 6,    portion: 300, q: 'oatmeal bowl nuts fruit' },
  { name: 'Smoothie banane & avoine',         category: 'breakfast', kcal: 80,  prot: 3,   gluc: 15, lip: 1.5,  portion: 300, q: 'banana oat smoothie' },

  // ── Plats principaux ─────────────────────────────────────────────
  { name: 'Poulet, riz & brocoli',            category: 'main', kcal: 150, prot: 13, gluc: 16, lip: 3,   portion: 350, q: 'grilled chicken rice broccoli' },
  { name: 'Poulet, patate douce & légumes',   category: 'main', kcal: 140, prot: 13, gluc: 14, lip: 3,   portion: 350, q: 'chicken sweet potato vegetables' },
  { name: 'Saumon, quinoa & légumes',         category: 'main', kcal: 170, prot: 14, gluc: 14, lip: 7,   portion: 320, q: 'salmon quinoa vegetables' },
  { name: 'Cabillaud, riz & courgettes',      category: 'main', kcal: 110, prot: 11, gluc: 13, lip: 2,   portion: 320, q: 'cod rice zucchini' },
  { name: 'Bœuf maigre, riz & haricots',      category: 'main', kcal: 150, prot: 14, gluc: 14, lip: 4,   portion: 350, q: 'lean beef rice beans' },
  { name: 'Dinde, pâtes complètes & légumes', category: 'main', kcal: 150, prot: 13, gluc: 17, lip: 3,   portion: 350, q: 'turkey whole wheat pasta' },
  { name: 'Œufs, riz & avocat',               category: 'main', kcal: 160, prot: 9,  gluc: 16, lip: 7,   portion: 300, q: 'eggs rice avocado bowl' },
  { name: 'Bowl poulet, quinoa & avocat',     category: 'main', kcal: 160, prot: 12, gluc: 14, lip: 6,   portion: 350, q: 'chicken quinoa avocado bowl' },
  { name: 'Poke bowl saumon',                 category: 'main', kcal: 150, prot: 12, gluc: 16, lip: 5,   portion: 350, q: 'salmon poke bowl' },
  { name: 'Buddha bowl & pois chiches',       category: 'main', kcal: 130, prot: 6,  gluc: 16, lip: 4,   portion: 350, q: 'buddha bowl chickpeas' },
  { name: 'Chili con carne & riz',            category: 'main', kcal: 120, prot: 9,  gluc: 13, lip: 4,   portion: 350, q: 'chili con carne rice' },
  { name: 'Curry de poulet & riz',            category: 'main', kcal: 140, prot: 11, gluc: 15, lip: 4,   portion: 350, q: 'chicken curry rice' },
  { name: 'Pâtes, poulet & sauce tomate',     category: 'main', kcal: 150, prot: 10, gluc: 19, lip: 3,   portion: 350, q: 'chicken pasta tomato' },
  { name: 'Pâtes bolognaise (maigre)',        category: 'main', kcal: 140, prot: 9,  gluc: 19, lip: 3,   portion: 350, q: 'spaghetti bolognese' },
  { name: 'Riz sauté poulet & légumes',       category: 'main', kcal: 150, prot: 10, gluc: 18, lip: 4,   portion: 350, q: 'chicken fried rice vegetables' },
  { name: 'Wok de bœuf & légumes',            category: 'main', kcal: 150, prot: 12, gluc: 12, lip: 5,   portion: 350, q: 'beef stir fry vegetables' },
  { name: 'Wok de poulet & nouilles',         category: 'main', kcal: 150, prot: 11, gluc: 17, lip: 4,   portion: 350, q: 'chicken noodle stir fry' },
  { name: 'Lentilles, riz & légumes',         category: 'main', kcal: 130, prot: 7,  gluc: 18, lip: 2,   portion: 350, q: 'lentils rice vegetables' },
  { name: 'Dahl de lentilles & riz',          category: 'main', kcal: 120, prot: 6,  gluc: 17, lip: 3,   portion: 350, q: 'lentil dahl rice' },
  { name: 'Tofu sauté & riz',                 category: 'main', kcal: 130, prot: 8,  gluc: 15, lip: 4,   portion: 320, q: 'tofu stir fry rice' },
  { name: 'Steak haché 5%, purée & légumes',  category: 'main', kcal: 140, prot: 13, gluc: 12, lip: 4,   portion: 320, q: 'lean beef patty mashed potato' },
  { name: 'Blanc de poulet & pâtes',          category: 'main', kcal: 160, prot: 14, gluc: 18, lip: 2,   portion: 350, q: 'chicken breast pasta' },
  { name: 'Saumon, pommes de terre & épinards', category: 'main', kcal: 150, prot: 13, gluc: 13, lip: 5, portion: 320, q: 'salmon potato spinach' },
  { name: 'Crevettes, riz & légumes',         category: 'main', kcal: 120, prot: 11, gluc: 15, lip: 2,   portion: 320, q: 'shrimp rice vegetables' },
  { name: 'Quinoa, poulet & légumes',         category: 'main', kcal: 150, prot: 12, gluc: 15, lip: 4,   portion: 350, q: 'quinoa chicken vegetables' },
  { name: 'Galette sarrasin, œuf & jambon',   category: 'main', kcal: 150, prot: 9,  gluc: 16, lip: 5,   portion: 220, q: 'buckwheat galette ham egg' },
  { name: 'Pizza maison jambon & légumes',    category: 'main', kcal: 200, prot: 11, gluc: 24, lip: 6,   portion: 300, q: 'homemade pizza' },
  { name: 'Burger maison & frites au four',   category: 'main', kcal: 200, prot: 13, gluc: 20, lip: 8,   portion: 280, q: 'homemade burger oven fries' },
  { name: 'Croque-monsieur (pain complet)',   category: 'main', kcal: 230, prot: 14, gluc: 22, lip: 9,   portion: 200, q: 'croque monsieur' },

  // ── Salades ──────────────────────────────────────────────────────
  { name: 'Salade poulet, quinoa & avocat',   category: 'salad', kcal: 150, prot: 11, gluc: 12, lip: 6,  portion: 320, q: 'chicken quinoa avocado salad' },
  { name: 'Salade thon, œuf & haricots',      category: 'salad', kcal: 120, prot: 11, gluc: 7,  lip: 5,  portion: 300, q: 'tuna egg bean salad' },
  { name: 'Salade poulet & crudités',         category: 'salad', kcal: 110, prot: 12, gluc: 5,  lip: 4,  portion: 300, q: 'grilled chicken salad' },
  { name: 'Salade de lentilles & feta',       category: 'salad', kcal: 140, prot: 8,  gluc: 16, lip: 5,  portion: 280, q: 'lentil feta salad' },
  { name: 'Salade de quinoa & légumes',       category: 'salad', kcal: 150, prot: 5,  gluc: 20, lip: 5,  portion: 280, q: 'quinoa vegetable salad' },
  { name: 'Taboulé maison',                   category: 'salad', kcal: 130, prot: 3,  gluc: 22, lip: 3,  portion: 280, q: 'tabbouleh' },
  { name: 'Salade de pâtes, thon & légumes',  category: 'salad', kcal: 160, prot: 8,  gluc: 20, lip: 5,  portion: 300, q: 'tuna pasta salad' },
  { name: 'Salade César (light)',             category: 'salad', kcal: 140, prot: 11, gluc: 6,  lip: 8,  portion: 300, q: 'chicken caesar salad' },

  // ── Soupes ───────────────────────────────────────────────────────
  { name: 'Soupe de légumes',                 category: 'soup', kcal: 45, prot: 1.5, gluc: 8,  lip: 1,   portion: 300, q: 'vegetable soup' },
  { name: 'Velouté de potiron',               category: 'soup', kcal: 55, prot: 1.5, gluc: 9,  lip: 1.5, portion: 300, q: 'pumpkin soup' },
  { name: 'Soupe de lentilles corail',        category: 'soup', kcal: 80, prot: 5,   gluc: 12, lip: 1.5, portion: 350, q: 'red lentil soup' },
  { name: 'Minestrone',                       category: 'soup', kcal: 55, prot: 2.5, gluc: 9,  lip: 1,   portion: 350, q: 'minestrone soup' },
  { name: 'Soupe poulet & nouilles',          category: 'soup', kcal: 60, prot: 5,   gluc: 7,  lip: 1.5, portion: 350, q: 'chicken noodle soup' },
  { name: 'Velouté de brocoli',               category: 'soup', kcal: 50, prot: 3,   gluc: 6,  lip: 2,   portion: 300, q: 'broccoli soup' },

  // ── Accompagnements ──────────────────────────────────────────────
  { name: 'Riz blanc',                        category: 'side', kcal: 130, prot: 2.7, gluc: 28, lip: 0.3, portion: 150, q: 'white rice' },
  { name: 'Riz complet',                      category: 'side', kcal: 120, prot: 2.6, gluc: 25, lip: 1,   portion: 150, q: 'brown rice' },
  { name: 'Pâtes complètes',                  category: 'side', kcal: 150, prot: 6,   gluc: 30, lip: 1.5, portion: 150, q: 'whole wheat pasta' },
  { name: 'Quinoa',                           category: 'side', kcal: 120, prot: 4.4, gluc: 21, lip: 1.9, portion: 150, q: 'cooked quinoa' },
  { name: 'Patate douce',                     category: 'side', kcal: 90,  prot: 1.6, gluc: 21, lip: 0.1, portion: 200, q: 'roasted sweet potato' },
  { name: 'Pommes de terre vapeur',           category: 'side', kcal: 87,  prot: 1.9, gluc: 20, lip: 0.1, portion: 200, q: 'boiled potatoes' },
  { name: 'Légumes vapeur',                   category: 'side', kcal: 40,  prot: 2,   gluc: 7,  lip: 0.4, portion: 200, q: 'steamed vegetables' },
  { name: 'Brocoli vapeur',                   category: 'side', kcal: 35,  prot: 2.4, gluc: 5,  lip: 0.4, portion: 200, q: 'steamed broccoli' },
  { name: 'Haricots verts',                   category: 'side', kcal: 35,  prot: 2,   gluc: 7,  lip: 0.2, portion: 200, q: 'green beans' },
  { name: 'Lentilles',                        category: 'side', kcal: 116, prot: 9,   gluc: 20, lip: 0.4, portion: 200, q: 'cooked lentils' },

  // ── Snacks ───────────────────────────────────────────────────────
  { name: 'Skyr nature',                      category: 'snack', kcal: 63,  prot: 11,  gluc: 4,  lip: 0.2, portion: 150, q: 'skyr yogurt' },
  { name: 'Fromage blanc 0%',                 category: 'snack', kcal: 45,  prot: 7.5, gluc: 4,  lip: 0.1, portion: 150, q: 'fromage blanc' },
  { name: 'Yaourt grec',                      category: 'snack', kcal: 59,  prot: 10,  gluc: 3.6,lip: 0.4, portion: 150, q: 'greek yogurt' },
  { name: 'Banane',                           category: 'snack', kcal: 89,  prot: 1.1, gluc: 23, lip: 0.3, portion: 120, q: 'banana' },
  { name: 'Pomme',                            category: 'snack', kcal: 52,  prot: 0.3, gluc: 14, lip: 0.2, portion: 150, q: 'apple' },
  { name: "Poignée d'amandes",                category: 'snack', kcal: 579, prot: 21,  gluc: 22, lip: 49,  portion: 30,  q: 'almonds' },
  { name: 'Mélange de fruits secs',           category: 'snack', kcal: 480, prot: 13,  gluc: 45, lip: 28,  portion: 30,  q: 'trail mix nuts' },
  { name: 'Œuf dur',                          category: 'snack', kcal: 155, prot: 13,  gluc: 1,  lip: 11,  portion: 50,  q: 'boiled egg' },
  { name: 'Galettes de riz & beurre de cacahuète', category: 'snack', kcal: 400, prot: 12, gluc: 55, lip: 14, portion: 40, q: 'rice cakes peanut butter' },
  { name: 'Barre protéinée',                  category: 'snack', kcal: 350, prot: 30,  gluc: 35, lip: 9,   portion: 60,  q: 'protein bar' },
  { name: 'Shaker de protéine',               category: 'snack', kcal: 50,  prot: 10,  gluc: 2,  lip: 0.8, portion: 300, q: 'protein shake' },
  { name: 'Houmous & bâtonnets de légumes',   category: 'snack', kcal: 130, prot: 5,   gluc: 12, lip: 7,   portion: 150, q: 'hummus vegetable sticks' },

  // ── Desserts (légers) ────────────────────────────────────────────
  { name: 'Fromage blanc & fruits rouges',    category: 'dessert', kcal: 70,  prot: 8,   gluc: 8,  lip: 1,   portion: 150, q: 'fromage blanc berries' },
  { name: 'Yaourt & compote',                 category: 'dessert', kcal: 75,  prot: 3,   gluc: 14, lip: 1.5, portion: 150, q: 'yogurt applesauce' },
  { name: 'Salade de fruits',                 category: 'dessert', kcal: 60,  prot: 0.8, gluc: 14, lip: 0.2, portion: 200, q: 'fruit salad' },
  { name: 'Riz au lait',                      category: 'dessert', kcal: 120, prot: 3.5, gluc: 20, lip: 2.5, portion: 150, q: 'rice pudding' },
  { name: 'Compote de pomme',                 category: 'dessert', kcal: 60,  prot: 0.3, gluc: 14, lip: 0.1, portion: 100, q: 'applesauce' },
  { name: 'Banane & beurre de cacahuète',     category: 'dessert', kcal: 180, prot: 5,   gluc: 20, lip: 9,   portion: 130, q: 'banana peanut butter' },
]
