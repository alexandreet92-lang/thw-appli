-- Matrice des conflits entre compétences (UPDATE par nom, sans ID hardcodé)
-- Chaque conflit[] est rempli avec les IDs des compétences incompatibles.

-- ===== RUNNING =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Polarisation','MAF (Maffetone)','Méthode Daniels (VDOT)']) AND is_predefined) WHERE nom = 'Méthode Norvégienne';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Méthode Norvégienne','Pyramidal','MAF (Maffetone)']) AND is_predefined) WHERE nom = 'Polarisation';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Polarisation']) AND is_predefined) WHERE nom = 'Pyramidal';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE 'running' = ANY(sports) AND nom <> 'MAF (Maffetone)' AND is_predefined) WHERE nom = 'MAF (Maffetone)';

-- ===== TRAIL =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Ultra-endurance']) AND is_predefined) WHERE nom = 'Vertical Kilometer (VK)';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Ultra-endurance']) AND is_predefined) WHERE nom = 'Skyrunning';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Vertical Kilometer (VK)','Skyrunning','Minimaliste']) AND is_predefined) WHERE nom = 'Ultra-endurance';

-- ===== CYCLISME =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Sweet Spot Training','Time-Crunched (Carmichael)']) AND 'cyclisme' = ANY(sports) AND is_predefined) WHERE nom = 'Polarisée' AND 'cyclisme' = ANY(sports);
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Polarisée']) AND 'cyclisme' = ANY(sports) AND is_predefined) WHERE nom = 'Sweet Spot Training';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Polarisée']) AND 'cyclisme' = ANY(sports) AND is_predefined) WHERE nom = 'Pyramidale' AND 'cyclisme' = ANY(sports);

-- ===== TRIATHLON =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Périodisation inversée (Trisutto)']) AND is_predefined) WHERE nom = 'Périodisation Friel';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Méthode Norvégienne triathlon','Pyramidale triathlon']) AND is_predefined) WHERE nom = 'Polarisation triathlon';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Polarisation triathlon']) AND is_predefined) WHERE nom = 'Méthode Norvégienne triathlon';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Polarisation triathlon']) AND is_predefined) WHERE nom = 'Pyramidale triathlon';

-- ===== NATATION =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['USRPT (Rushall)']) AND is_predefined) WHERE nom = 'Haut-volume traditionnel (Counsilman)';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Haut-volume traditionnel (Counsilman)','Polarisée natation (CSS + 80/20)','Zones aérobie/seuil (Maglischo)']) AND is_predefined) WHERE nom = 'USRPT (Rushall)';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['USRPT (Rushall)','Zones aérobie/seuil (Maglischo)']) AND is_predefined) WHERE nom = 'Polarisée natation (CSS + 80/20)';

-- ===== ROWING =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Race-pace specific']) AND is_predefined) WHERE nom = 'HVLIT (Haut-volume / basse intensité)';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Polarisée aviron']) AND is_predefined) WHERE nom = 'Pyramidal aviron';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Pyramidal aviron']) AND is_predefined) WHERE nom = 'Polarisée aviron';

-- ===== MUSCULATION FORCE =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Sheiko','Smolov']) AND is_predefined) WHERE nom = 'Westside Conjugate';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Westside Conjugate','Méthode bulgare']) AND is_predefined) WHERE nom = 'Sheiko';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Westside Conjugate','5/3/1 (Wendler)','RTS (Reactive Training Systems)']) AND is_predefined) WHERE nom = 'Smolov';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Sheiko','Westside Conjugate']) AND is_predefined) WHERE nom = 'Méthode bulgare';

-- ===== MUSCULATION HYPERTROPHIE =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Push/Pull/Legs (haute fréquence)','HST (Hypertrophy Specific Training)']) AND is_predefined) WHERE nom = 'Bro split';

-- ===== MUSCULATION PERFORMANCE =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['Périodisation par blocs (Verkhoshansky)']) AND is_predefined) WHERE nom = 'Linéaire vs Ondulée';

-- ===== NUTRITION =====
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['High-Carb Performance']) AND is_predefined) WHERE nom = 'Low-Carb / High-Fat';
UPDATE competences SET conflits = ARRAY(SELECT id FROM competences WHERE nom = ANY(ARRAY['High-Carb Performance']) AND is_predefined) WHERE nom = 'Jeûne intermittent 16/8';
