// Fichier GÉNÉRÉ par scripts/articles/build.mjs — ne pas modifier à la main.
// Métadonnées publiques (liste) + chargement paresseux du contenu, réservé au serveur.
export type ArticleGroup = 'etat' | 'sante' | 'age' | 'mesure' | 'plan'
export interface ArticleMeta { slug: string; order: number; group: ArticleGroup; tag: string; title: string; lede: string; minutes: number; open: boolean }
export interface ArticleContent { slug: string; css: string; head: string; rest: string }

export const ARTICLES: ArticleMeta[] = [
  {
    "slug": "condition-physique-en-recul",
    "order": 0,
    "group": "etat",
    "tag": "Constat · Condition physique",
    "title": "Notre condition physique recule-t-elle vraiment ?",
    "lede": "On entend partout que les humains sont de moins en moins en forme. Cet article vérifie ce que les mesures disent réellement, étape par étape, du monde entier jusqu'à ce qui se passe dans un corps, puis répond à la seule question qui te concerne : qu'est-ce que ça change pour toi, et que faire.",
    "minutes": 24,
    "open": false
  },
  {
    "slug": "endurance-des-enfants",
    "order": 1,
    "group": "etat",
    "tag": "Enfants · Endurance",
    "title": "L'endurance des enfants a-t-elle baissé, et qu'est-ce que ça change pour leur avenir ?",
    "lede": "On entend souvent que les enfants courent moins bien que leurs parents au même âge. C'est vrai en moyenne, mais la réalité est plus nuancée que le slogan : la baisse a été nette dans les années 1980 et 1990, puis elle s'est presque arrêtée. Ce que cette baisse change pour l'avenir d'un enfant est encore plus incertain que ce que les titres de presse laissent croire. Cet article avance pas à pas, du plus général au plus précis, et finit par une réponse et par ce que tu peux faire.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "adolescents-et-mouvement",
    "order": 2,
    "group": "etat",
    "tag": "Santé · Adolescents",
    "title": "Adolescents : la génération qui ne bouge plus",
    "lede": "Entre 11 et 17 ans, l'Organisation mondiale de la santé (OMS) demande 60 minutes d'activité par jour. Sur une semaine, c'est près de trois fois ce qu'elle demande à un adulte, et la plupart des jeunes n'y arrivent pas. Cet article suit une seule question, du constat mondial jusqu'aux limites des preuves : de combien manquent-ils, depuis quand, et qu'est-ce que ça change une fois adulte ?",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "motricite-de-l-enfant",
    "order": 3,
    "group": "etat",
    "tag": "Enfants · Capacités motrices",
    "title": "Ce que l'enfance ne développe plus : force, coordination, souplesse",
    "lede": "Un enfant qui court, saute, grimpe, lance et se suspend travaille sans le savoir sa force, son équilibre et sa coordination. Sur près de 11 millions d'enfants testés dans 29 pays, le saut en longueur sans élan recule depuis l'an 2000. Mais le tableau complet est moins simple que « les enfants sont moins forts » : certaines capacités reculent, d'autres progressent, d'autres n'ont pas été mesurées. Cet article suit une question, du plus large au plus précis, jusqu'à ce qu'on peut en conclure et en faire.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "le-mouvement-des-jeunes",
    "order": 4,
    "group": "etat",
    "tag": "Enfants et adolescents · Causes du recul",
    "title": "Écrans, sommeil, sport scolaire : où est passé le mouvement",
    "lede": "Les jeunes courent moins bien qu'au début des années 1980, et chacun a son explication. Les écrans arrivent en tête, alors que c'est la cause aux chiffres les plus minces. Cet article prend les causes avancées une par une et leur applique les mêmes tests. Il dit ce qui est solide, ce qui est faible et ce qu'aucune étude lue ne permet de savoir.",
    "minutes": 29,
    "open": false
  },
  {
    "slug": "le-corps-et-la-chaise",
    "order": 5,
    "group": "etat",
    "tag": "Adultes · Activité",
    "title": "Le corps des adultes à l'ère de la chaise",
    "lede": "Tu fais peut-être du sport deux ou trois fois par semaine, et tu passes le reste de ta vie éveillée assis. Est-ce que la séance du mardi compense la chaise du lundi au vendredi ? Cet article pose la question, y répond en six étapes qui vont du plus général au plus précis, puis dit ce qu'on peut mettre en place.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "la-france-face-au-monde",
    "order": 6,
    "group": "etat",
    "tag": "Adultes · Activité physique",
    "title": "La France face au monde : où nous situons-nous vraiment ?",
    "lede": "On lit souvent des classements de pays : tel pays bouge peu, tel autre beaucoup, et la France se trouverait quelque part au milieu. Avant de te demander où tu te places, il faut savoir si ces classements tiennent. Cet article suit une seule question, du plus large au plus précis : que peut-on réellement comparer entre pays, et que dit-on de la France quand on s'en tient à ce qui est comparable ?",
    "minutes": 23,
    "open": false
  },
  {
    "slug": "inaptes-avant-d-etre-adultes",
    "order": 7,
    "group": "etat",
    "tag": "Société · Forme des jeunes adultes",
    "title": "Inaptes avant d'être adultes : quand l'armée ne trouve plus de recrues",
    "lede": "Une armée doit savoir, avant de signer un contrat, si un jeune corps tiendra. Elle mesure donc le poids, la santé, la forme et le niveau scolaire de très nombreux candidats, et publie parfois ce qu'elle trouve. C'est un indicateur qui ne vient pas du sport. Cet article le lit de près : il sépare ce qui relève de la forme physique de ce qui n'en relève pas, puis regarde ce que disent les armées américaine, suisse, française et autrichienne.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "le-prix-de-la-sedentarite",
    "order": 8,
    "group": "etat",
    "tag": "Santé · Société",
    "title": "Le prix de la sédentarité : santé et économie",
    "lede": "On présente souvent la sédentarité comme une affaire personnelle. C'est aussi une cause de maladies que les chercheurs essaient de chiffrer, et un poste de dépenses pour les systèmes de santé. Ces chiffres circulent beaucoup, rarement avec leur méthode. Cet article les reconstruit un par un, de la population entière jusqu'aux limites des modèles, pour répondre à une question : combien ça coûte vraiment, et qu'est-ce qui est évitable ?",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "force-de-poigne",
    "order": 9,
    "group": "sante",
    "tag": "Adultes · Force",
    "title": "La force de poigne, un indicateur de santé",
    "lede": "Serrer un boîtier pendant quelques secondes paraît dérisoire. Pourtant, des études l'ont fait passer à des centaines de milliers de personnes, puis ont compté qui était encore en vie, qui marchait encore sans aide, qui était tombé malade. Cet article ne suppose pas que le test est utile : il le met à l'épreuve, du plus général au plus précis, puis te dit ce que tu peux en faire.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "poids-et-forme-physique",
    "order": 10,
    "group": "sante",
    "tag": "Santé · Poids et condition physique",
    "title": "Être mince n'est pas être en forme",
    "lede": "Tu montes sur une balance, elle te donne un chiffre. Tu passes un test de forme, il t'en donne un autre. On croit souvent que le second n'est qu'une version plus fine du premier. Les études suivies sur des centaines de milliers d'adultes disent autre chose : à poids égal, la condition physique sépare des trajectoires très différentes, et un poids bas ne garantit ni une bonne forme ni une bonne santé.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "cardio-et-longevite",
    "order": 11,
    "group": "sante",
    "tag": "Santé · Cardio",
    "title": "Le cardio et la durée de vie : ce que les données montrent, et ce qu'elles ne montrent pas",
    "lede": "Ton médecin mesure ta tension, ton poids, parfois ton cholestérol. Presque jamais ton endurance. Pourtant, sur des centaines de milliers de personnes, c'est l'une des mesures qui en dit le plus sur la suite. Cet article suit une seule question, du plus large au plus précis, jusqu'à ses limites : ton endurance dit-elle quelque chose de ta durée de vie, et la travailler change-t-il quoi que ce soit ?",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "dose-de-sport",
    "order": 12,
    "group": "sante",
    "tag": "Agir · Dose",
    "title": "Quelle dose de sport pour vivre plus longtemps",
    "lede": "Entre les 150 minutes par semaine, les 10 000 pas, les marathoniens et ceux qui disent qu'un peu de marche suffit, tu as de quoi être perdu. Cet article avance pas à pas, en partant de ce que disent les très grandes études sur des populations entières, pour arriver à ce que tu peux concrètement faire de ton temps.",
    "minutes": 24,
    "open": false
  },
  {
    "slug": "force-et-sante",
    "order": 13,
    "group": "sante",
    "tag": "Santé · Force",
    "title": "La force musculaire, assurance santé oubliée",
    "lede": "Quand on parle de santé et de sport, on parle de cardio, de pas par jour, de VO2max. La force passe pour une affaire d'apparence ou de performance. Pourtant, des études qui ont suivi des centaines de milliers de personnes la relient à la durée de vie. Cet article regarde si ce lien tient quand on le sépare de l'endurance, jusqu'où on peut le croire, et ce que tu peux en faire dès cette semaine.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "se-lever-du-sol",
    "order": 14,
    "group": "sante",
    "tag": "Santé · Mobilité",
    "title": "Se lever du sol : que dit ce geste de ta santé ?",
    "lede": "S'asseoir par terre, puis se relever sans s'aider des mains. Des médecins brésiliens ont mis ce geste en test noté sur 10 et ont constaté que les scores les plus bas vont avec plus de décès dans les années suivantes. Cet article suit le raisonnement pas à pas : ce qui est établi, ce qui ne l'est pas, et ce que tu peux en faire concrètement.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "pompes-et-coeur",
    "order": 15,
    "group": "sante",
    "tag": "Santé · Force",
    "title": "Ce que les pompes disent de ton cœur",
    "lede": "Combien de pompes peux-tu enchaîner ? Un chiffre qui circule dit que dépasser 40 pompes diviserait le risque cardiaque par vingt-cinq. Cet article remonte à l'étude d'où il vient, la lit en détail, la replace parmi les autres études sur la force, et dit ce qu'on peut en retenir sans se raconter d'histoire.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "sport-et-sante-mentale",
    "order": 16,
    "group": "sante",
    "tag": "Santé · Mental",
    "title": "Sport et santé mentale : ce que l'activité physique change dans la tête",
    "lede": "Tout le monde a entendu que le sport « fait du bien au moral ». Cet article vérifie ce que les études permettent réellement d'affirmer : pour quelles difficultés, avec quelle force, à quelle dose, et à quel endroit les preuves s'arrêtent. Le sujet touche aussi au suicide, traité avec prudence. Si tu traverses une période difficile, les numéros d'aide sont dans l'encadré plus bas .",
    "minutes": 29,
    "open": false
  },
  {
    "slug": "comment-le-corps-vieillit",
    "order": 17,
    "group": "age",
    "tag": "Seniors · Vieillissement",
    "title": "Comment le corps vieillit",
    "lede": "Tout le monde sait que le corps vieillit. Peu de gens savent ce qui baisse, à quel âge, à quelle vitesse, et surtout ce qui dépend de toi. Cet article part d'une question simple, la pose clairement, puis y répond en six étapes, du constat général aux cas particuliers, avec les objections et ce qui reste incertain.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "puissance-et-force",
    "order": 18,
    "group": "age",
    "tag": "Seniors · Masters · Puissance",
    "title": "Pourquoi la puissance part avant la force",
    "lede": "À 50 ou 60 ans, beaucoup de gens disent qu'ils sont moins vifs avant de dire qu'ils sont plus faibles. Cet article vérifie si cette impression a une base : la vitesse et le saut baissent-ils avant la force maximale, à quel âge, pourquoi, et qu'est-ce que ça change ? Il le démontre en six étapes, puis répond avec le niveau de certitude réel.",
    "minutes": 28,
    "open": false
  },
  {
    "slug": "athletes-masters",
    "order": 19,
    "group": "age",
    "tag": "Seniors · Entraînement",
    "title": "Vieillir en s'entraînant : ce que montrent les athlètes masters",
    "lede": "Avec l'âge, le souffle, le muscle et la vitesse baissent. Personne n'y échappe, pas même ceux qui s'entraînent depuis trente ans. La vraie question est ailleurs : ce que tu fais change-t-il la vitesse de cette baisse, et si oui, de combien, et à partir de quand est-il encore temps d'agir ? Cet article suit la preuve pas à pas, du plus général au plus précis, avant de répondre.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "rester-autonome-apres-65-ans",
    "order": 20,
    "group": "age",
    "tag": "Seniors · Autonomie",
    "title": "Rester autonome après 65 ans : force, équilibre, chutes",
    "lede": "Après 65 ans, l'enjeu n'est plus de battre un record. C'est de continuer à te lever, à marcher, à rentrer chez toi et à porter tes courses sans aide. Cet article relie des tests simples à ces gestes, montre ce que les études prouvent et ce qu'elles ne prouvent pas, puis termine par ce que tu peux mettre en place.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "hormones-et-entrainement",
    "order": 21,
    "group": "age",
    "tag": "Santé · Hormones et vieillissement",
    "title": "Ménopause et baisse de testostérone : ce que l'entraînement compense, et ce qu'il ne compense pas",
    "lede": "Vers 50 ans, les hormones sexuelles changent, chez les femmes d'un coup, chez les hommes lentement. À peu près au même moment, l'os s'affaiblit et le muscle fond. On te dit que la musculation et le cardio « aident ». Cet article suit une seule question, du plus général au plus précis : qu'est-ce que l'entraînement empêche vraiment de perdre, et qu'est-ce qu'il laisse partir ?",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "femmes-et-force",
    "order": 22,
    "group": "age",
    "tag": "Force · Femmes",
    "title": "Les femmes et la force : en finir avec les idées reçues",
    "lede": "Les femmes sont moins fortes que les hommes, elles progressent moins, elles risquent de prendre du volume sans l'avoir voulu. Ces trois phrases circulent en salle comme si elles allaient ensemble. Les études lues pour cet article disent que la première est vraie en moyenne et que les deux autres ne tiennent pas, ou pas comme on le croit. On suit une seule question, du plus large au plus précis, jusqu'à ce qui reste incertain.",
    "minutes": 24,
    "open": false
  },
  {
    "slug": "l-os-un-capital",
    "order": 23,
    "group": "age",
    "tag": "Santé · Os et squelette",
    "title": "L'os : un capital qui se construit avant 30 ans",
    "lede": "Personne ne regarde ses os avant qu'ils cassent. Pourtant, une grande partie de ce que ton squelette sera à 70 ans se joue dans les années où tu sautes, cours et grandis. Cet article suit une seule question, du plus large au plus précis : le squelette de l'adulte dépend-il vraiment de ce qu'on construit jeune, et que reste-t-il possible plus tard ?",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "mesurer-pour-progresser",
    "order": 24,
    "group": "mesure",
    "tag": "Central · Mesure",
    "title": "Mesurer pour progresser : s'entraîner ne suffit pas",
    "lede": "Tu t'entraînes, tu te sens de mieux en mieux, et personne ne te demande jamais de chiffre. Cet article pose une question simple et la traite jusqu'au bout : à quoi sert de mesurer sa condition physique, quand on s'entraîne déjà ? On part de ce que tu ressens, on descend vers ce qui se passe réellement dans le corps, puis on regarde ce que cela change pour ta santé. À la fin, tu sauras ce qui est démontré, ce qui ne l'est pas, et quoi faire concrètement.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "l-athlete-hybride",
    "order": 25,
    "group": "mesure",
    "tag": "The Hybrid Way · Entraînement",
    "title": "L'athlète hybride : pourquoi endurance et force ensemble",
    "lede": "On te dit de choisir : coureur ou lanceur de fonte, aérobie ou muscu. THW part de l'idée inverse, que les deux se complètent. Cet article teste cette idée contre les études, en commençant par la plus large (la santé de populations entières), en descendant vers la plus précise (l'ordre de tes séances), et en cherchant ce qui est démontré, ce qui est exagéré et ce qui n'est pas connu.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "lire-un-bareme",
    "order": 26,
    "group": "mesure",
    "tag": "Tests · Lire ses résultats",
    "title": "Lire un barème : âge, sexe, percentile",
    "lede": "Tu fais un test, tu obtiens un chiffre, puis une étiquette : « moyen », « bon », « 62e percentile ». Cet article démonte l'étiquette. D'où vient-elle, à qui te compare-t-elle, que permet-elle de conclure sur ta santé, et comment savoir si tu as vraiment progressé entre deux tests ? On part d'un chiffre isolé et on arrive à ce qu'il faut en faire.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "test-standardise-ou-ressenti",
    "order": 27,
    "group": "mesure",
    "tag": "Central · Mesure",
    "title": "Pourquoi un test standardisé vaut mieux qu'un ressenti",
    "lede": "Dans l'article « Mesurer pour progresser », la question était de savoir s'il faut mesurer. Ici, on suppose que oui et on pose la suivante : comment mesurer pour que le chiffre vaille quelque chose ? Un test passé n'importe comment, un jour de forme ou de fatigue, avec ou sans échauffement, donne un nombre. Ce nombre ne dit pas forcément ce que tu crois. On va voir pourquoi les protocoles de test sont si stricts, et ce qu'il faut fixer à chaque passage.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "tester-sa-forme-chez-soi",
    "order": 28,
    "group": "mesure",
    "tag": "Méthode · Tests de terrain",
    "title": "Tester sa forme chez soi : ce que le matériel change",
    "lede": "Une chaise, un chrono, une montre au poignet, une salle de sport : chaque outil te donne un chiffre. Ils n'ont pas la même valeur. Cet article les prend un par un, du plus simple au plus équipé, pour te dire ce que chacun mesure vraiment, avec quelle précision, et lequel choisir.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "le-minimum-efficace",
    "order": 29,
    "group": "mesure",
    "tag": "Agir · Minimum efficace",
    "title": "Le minimum efficace : combien, quoi, à quelle fréquence",
    "lede": "Entre « 150 minutes par semaine », « 10 000 pas » et « quelques minutes d'effort intense suffisent », tu peux conclure qu'il faut y consacrer ses journées ou presque rien. Cet article cherche la plus petite dose que les données justifient, la façon de la reconnaître quand tu la fais, et la manière de la placer dans une semaine réelle, jusqu'à ce que tu saches quoi faire dès maintenant.",
    "minutes": 25,
    "open": false
  },
  {
    "slug": "passer-a-l-action-et-tenir",
    "order": 30,
    "group": "plan",
    "tag": "Fondation",
    "title": "Passer à l'action et tenir : la vraie difficulté",
    "lede": "Savoir quoi faire pour être en forme n'a jamais été aussi simple : les recommandations tiennent en deux lignes et sont publiques. Pourtant, une grande part des gens qui commencent s'arrêtent, et beaucoup de ceux qui veulent commencer ne commencent pas. Cet article teste une idée simple : ce qui manque, c'est moins la connaissance que la patience et la répétition. On va voir ce que la recherche confirme, ce qu'elle nuance, et ce qu'on peut en faire concrètement sur douze semaines.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "remonter-sa-forme",
    "order": 31,
    "group": "plan",
    "tag": "Tous profils",
    "title": "Remonter sa forme en 12 semaines",
    "lede": "Tu veux reprendre le sport, ou repartir plus fort après une période creuse, et tu te donnes douze semaines. Les études disent beaucoup de choses sur ce que l'entraînement change à l'endurance et à la force. Elles disent presque rien sur un programme de douze semaines précis. Cet article garde les deux niveaux séparés : d'abord ce qui est démontré, en moyenne, puis ce que nous proposons à partir de là, en disant clairement que la proposition elle-même n'a pas été testée telle quelle.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "enfant-en-manque-de-forme",
    "order": 32,
    "group": "plan",
    "tag": "Enfant, 6 à 11 ans",
    "title": "Mon enfant manque de forme : par où commencer ?",
    "lede": "Ton enfant s'essouffle vite, finit dernier aux jeux de course, préfère l'écran au parc. Tu te demandes s'il faut le « faire s'entraîner ». La recherche répond autrement : à cet âge, on ne fait pas de plan d'entraînement. On fait de la place au jeu, aux habiletés motrices, au sommeil, et on le fait ensemble, longtemps. Le plan ci-dessous est écrit pour toi, le parent, et il se lit en jeux et en habitudes, pas en séances.",
    "minutes": 29,
    "open": false
  },
  {
    "slug": "ado-et-mouvement",
    "order": 33,
    "group": "plan",
    "tag": "Adolescent",
    "title": "L'ado qui ne bouge plus : par où recommencer, et comment tenir",
    "lede": "Cet article s'adresse à l'ado et à ses parents. Il part d'un cas courant, un ou une ado qui a arrêté le sport ou n'en a jamais fait, et regarde ce que la recherche permet de dire : ce que l'âge change, ce qui motive ou bloque, ce qui est sûr, ce qui est à surveiller. Il finit sur un plan de douze semaines à trois séances. Ce plan est une proposition, pas un programme testé tel quel.",
    "minutes": 26,
    "open": false
  },
  {
    "slug": "plan-jeune-adulte",
    "order": 34,
    "group": "plan",
    "tag": "18 à 29 ans",
    "title": "Jeune adulte, 18 à 29 ans : un plan réaliste pour reprendre ou construire sa forme",
    "lede": "Être en forme n'est ni simple ni dur. Si tu as décidé de t'y mettre, ce n'est pas compliqué. Si tu n'arrives pas à passer à l'action, c'est très compliqué, et ce n'est pas un manque de connaissances : tout est accessible. Il faut de la patience et répéter le même geste. Cet article s'adresse à ceux qui ont arrêté le sport en quittant le lycée, ou n'ont jamais vraiment commencé, et qui vivent des études, un premier emploi, un budget serré. Il part de ce que la recherche dit de cette période, puis propose douze semaines avec des retests.",
    "minutes": 28,
    "open": false
  },
  {
    "slug": "plan-d-action-30-45-ans",
    "order": 35,
    "group": "plan",
    "tag": "30 à 45 ans",
    "title": "L'adulte de 30 à 45 ans en pleine vie active : un plan d'action quand le temps et l'énergie manquent",
    "lede": "Tu travailles assis, tu as des enfants, tu dors moins que tu ne le voudrais et tu n'as pas l'impression d'avoir une heure à toi. Cet article ne te donne pas un programme sur mesure : il faudrait un coach qui te connaisse. Il te donne la trajectoire que suivent, à peu de chose près, presque toutes les personnes dans ta situation : une petite dose régulière, de la force, une progression lente, des mesures, et un système pour tenir. Il dit ce que la recherche établit, ce qui est une proposition de rédaction, et quand demander un avis médical.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "reprise-apres-45-ans",
    "order": 36,
    "group": "plan",
    "tag": "45 à 64 ans",
    "title": "Reprendre le sport entre 45 et 64 ans : un plan, ce qui change à cet âge, et surtout comment tenir",
    "lede": "Une tension à surveiller, une ceinture qui serre, des genoux qui tirent : on sait en général ce qu'il faudrait faire. Le plan de fond ressemble à celui de tout le monde. Ce qui change à cet âge, c'est le point de départ, la dose, ce qu'on évite, les obstacles et le moment où demander un avis médical. Cet article suit une personne type jusqu'à un plan sur 12 semaines, en distinguant le démontré de la proposition.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "le-jeune-retraite",
    "order": 37,
    "group": "plan",
    "tag": "65 à 74 ans",
    "title": "Le jeune retraité de 65 à 74 ans : transformer le temps libre en marge d'autonomie",
    "lede": "La retraite donne du temps, ce qui manquait pour s'entraîner. Elle retire aussi, sans bruit, beaucoup de mouvements qui rythmaient la journée. Cet article regarde ce que les études disent de cette transition, ce qui protège muscle, équilibre et souffle après 65 ans, puis propose une trajectoire de 12 semaines avec ses retests. Le fond du plan est le même pour presque tout le monde ; ce qui change, c'est le point de départ, la dose et les précautions.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "bouger-apres-75-ans",
    "order": 38,
    "group": "plan",
    "tag": "75 ans et plus",
    "title": "À 75 ans et plus : se renforcer, garder l'équilibre et ne pas avoir peur de bouger",
    "lede": "Tu as 75 ans ou plus, ou tu lis cet article pour un parent, un conjoint, un ami. Cet article suit une question : à cet âge, et même avec des maladies chroniques, l'exercice change-t-il quelque chose, par où commencer sans se faire mal, et comment tenir ? Il finit par un plan en phases. C'est une proposition de rédaction, pas une prescription : elle ne remplace ni ton médecin ni un professionnel de l'activité physique adaptée.",
    "minutes": 29,
    "open": false
  },
  {
    "slug": "commencer-en-situation-d-obesite",
    "order": 39,
    "group": "plan",
    "tag": "Obésité",
    "title": "Commencer à bouger quand le poids est élevé",
    "lede": "Si tu vis avec un poids élevé, tu as sans doute déjà entendu mille conseils, dont beaucoup tournaient autour de la balance. Cet article part d'ailleurs : ce que le mouvement t'apporte même si ton poids bouge peu, ce qu'il apporte pour le poids, et comment démarrer sans te blesser, par paliers, en mesurant ta forme plutôt que ton poids. Ce n'est pas un programme personnel, c'est une trajectoire type, avec ce qui est établi et ce qui est une proposition.",
    "minutes": 27,
    "open": false
  },
  {
    "slug": "sport-et-troubles-alimentaires",
    "order": 40,
    "group": "plan",
    "tag": "Troubles alimentaires",
    "title": "Quand le sport n'est pas la première étape : anorexie et troubles du comportement alimentaire",
    "lede": "Sur ce site, presque tous les articles te disent de bouger plus. Celui-ci dit autre chose : pour certaines personnes, ce n'est pas le bon point de départ, et le premier pas est de se faire soigner. Il ne contient volontairement aucun programme, aucune dose, aucun objectif chiffré.",
    "minutes": 24,
    "open": true
  }
]

const LOADERS: Record<string, () => Promise<{ default: ArticleContent }>> = {
  'condition-physique-en-recul': () => import('./condition-physique-en-recul.json'),
  'endurance-des-enfants': () => import('./endurance-des-enfants.json'),
  'adolescents-et-mouvement': () => import('./adolescents-et-mouvement.json'),
  'motricite-de-l-enfant': () => import('./motricite-de-l-enfant.json'),
  'le-mouvement-des-jeunes': () => import('./le-mouvement-des-jeunes.json'),
  'le-corps-et-la-chaise': () => import('./le-corps-et-la-chaise.json'),
  'la-france-face-au-monde': () => import('./la-france-face-au-monde.json'),
  'inaptes-avant-d-etre-adultes': () => import('./inaptes-avant-d-etre-adultes.json'),
  'le-prix-de-la-sedentarite': () => import('./le-prix-de-la-sedentarite.json'),
  'force-de-poigne': () => import('./force-de-poigne.json'),
  'poids-et-forme-physique': () => import('./poids-et-forme-physique.json'),
  'cardio-et-longevite': () => import('./cardio-et-longevite.json'),
  'dose-de-sport': () => import('./dose-de-sport.json'),
  'force-et-sante': () => import('./force-et-sante.json'),
  'se-lever-du-sol': () => import('./se-lever-du-sol.json'),
  'pompes-et-coeur': () => import('./pompes-et-coeur.json'),
  'sport-et-sante-mentale': () => import('./sport-et-sante-mentale.json'),
  'comment-le-corps-vieillit': () => import('./comment-le-corps-vieillit.json'),
  'puissance-et-force': () => import('./puissance-et-force.json'),
  'athletes-masters': () => import('./athletes-masters.json'),
  'rester-autonome-apres-65-ans': () => import('./rester-autonome-apres-65-ans.json'),
  'hormones-et-entrainement': () => import('./hormones-et-entrainement.json'),
  'femmes-et-force': () => import('./femmes-et-force.json'),
  'l-os-un-capital': () => import('./l-os-un-capital.json'),
  'mesurer-pour-progresser': () => import('./mesurer-pour-progresser.json'),
  'l-athlete-hybride': () => import('./l-athlete-hybride.json'),
  'lire-un-bareme': () => import('./lire-un-bareme.json'),
  'test-standardise-ou-ressenti': () => import('./test-standardise-ou-ressenti.json'),
  'tester-sa-forme-chez-soi': () => import('./tester-sa-forme-chez-soi.json'),
  'le-minimum-efficace': () => import('./le-minimum-efficace.json'),
  'passer-a-l-action-et-tenir': () => import('./passer-a-l-action-et-tenir.json'),
  'remonter-sa-forme': () => import('./remonter-sa-forme.json'),
  'enfant-en-manque-de-forme': () => import('./enfant-en-manque-de-forme.json'),
  'ado-et-mouvement': () => import('./ado-et-mouvement.json'),
  'plan-jeune-adulte': () => import('./plan-jeune-adulte.json'),
  'plan-d-action-30-45-ans': () => import('./plan-d-action-30-45-ans.json'),
  'reprise-apres-45-ans': () => import('./reprise-apres-45-ans.json'),
  'le-jeune-retraite': () => import('./le-jeune-retraite.json'),
  'bouger-apres-75-ans': () => import('./bouger-apres-75-ans.json'),
  'commencer-en-situation-d-obesite': () => import('./commencer-en-situation-d-obesite.json'),
  'sport-et-troubles-alimentaires': () => import('./sport-et-troubles-alimentaires.json'),
}

export async function loadArticle(slug: string): Promise<ArticleContent | null> {
  const load = LOADERS[slug]
  if (!load) return null
  return (await load()).default
}
