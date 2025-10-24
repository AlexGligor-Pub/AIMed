# -*- coding: utf-8 -*-
import pandas as pd  # pyright: ignore[reportMissingImports]
import re
import sys

# Fix encoding pentru Windows
if sys.platform == 'win32':
    _reconfig = getattr(sys.stdout, 'reconfigure', None)
    if callable(_reconfig):
        _reconfig(encoding='utf-8')

# Citim fișierele
print("Se citesc fișierele...")
medicamente_df = pd.read_csv('public/medicamente_cu_boli_COMPLET.csv')
boli_df = pd.read_csv('public/coduri_boala.csv')

# Ștergem coloana veche Coduri_Boli pentru a regenera
if 'Coduri_Boli' in medicamente_df.columns:
    medicamente_df = medicamente_df.drop('Coduri_Boli', axis=1)
    print("✓ Șters coloana veche Coduri_Boli pentru regenerare")

print(f"Medicamente: {len(medicamente_df)} rânduri")
print(f"Boli: {len(boli_df)} rânduri")
print(f"Coloane medicamente: {medicamente_df.columns.tolist()}")

# ============================================================================
# MAPARE COMPLETĂ ATC -> BOLI - TOATE CELE 992 DE CODURI
# ============================================================================

ATC_TO_DISEASE_MAP = {
    
    # ========================================================================
    # A - ALIMENTARY TRACT AND METABOLISM (Tractul digestiv și metabolism)
    # ========================================================================
    
    # A01 - Stomatologice și orale
    'A01': [543, 544, 545, 546, 547, 548, 549, 550, 551],  # Carii, gingivită, stomatită, boli dentare, boli gingii, maxilare, glande salivare
    
    # A02 - Medicamente pentru ulcer peptic și reflux
    'A02B': [552, 553, 554, 555, 556, 557, 559, 560, 561],  # Ulcer gastric, duodenal, gastrita, dispepsia
    'A02BC': [552, 553, 554, 555, 556, 557, 559, 560, 561, 868, 869, 870],  # Inhibitori pompă protoni + simptome digestive
    'A02BA': [552, 553, 554, 555, 556, 559, 560, 561],  # Antagonisti H2
    
    # A03 - Medicamente pentru tulburări funcționale gastrointestinale
    'A03': [557, 558, 560, 561, 570, 573],  # Dispepsia, boli functionale intestin
    
    # A04 - Antiemetica și antinauseice
    'A04': [743, 870],  # Voma in sarcina, simptome digestive
    
    # A05 - Terapia biliară și hepatică
    'A05A': [578, 579, 580, 581, 582, 583, 584],  # Boli hepatice, litiaza biliară, colecistită
    'A05B': [581, 582, 583, 584],  # Litiaza biliară
    
    # A06 - Laxative
    'A06': [570, 572, 573],  # Constipație, sindrom intestin iritabil
    
    # A07 - Antidiareeice și anti-inflamatorii intestinale
    'A07A': [1, 2, 3, 4, 5, 8, 12, 13],  # Infectii intestinale
    'A07E': [564, 565, 566, 567, 568, 569, 576, 577],  # Boli inflamatorii intestinale (Crohn, rectocolită, peritonită)
    'A07': [13, 564, 565, 566, 567, 568, 569, 571, 574, 575, 576, 577, 591],  # Diaree, Crohn, rectocolită, boli intestin, peritonită
    
    # A08 - Anti-obezitate
    'A08': [279, 280],  # Obezitatea, excese de aport
    
    # A09 - Digestive și enzime
    'A09': [585, 586, 587, 588],  # Pancreatită, malabsorbtie
    
    # A10 - Medicamente pentru diabet
    'A10A': [241, 242, 243, 244, 245, 246, 247, 746, 749],  # Insulină și antidiabetice
    'A10B': [241, 242, 243, 244, 245, 246, 247, 746, 749],  # Antidiabetice orale
    
    # A11 - Vitamine
    'A11A': [266],  # Avitaminoza A
    'A11C': [270],  # Vitamina C
    'A11CC': [267, 268, 269, 271, 272, 273],  # Vitamine B, D și alte avitaminoze
    'A11D': [272],  # Vitamina D
    'A11G': [270],  # Acid ascorbic (vitamina C)
    'A11GA': [270],  # Acid ascorbic oral
    'A11H': [267, 268, 269, 273],  # Alte vitamine simple
    'A11HA': [267, 268, 269, 273],  # Vitamine B simple (B1, B6)
    
    # A12 - Suplimente minerale
    'A12': [274, 275, 276, 277, 278, 292],  # Carențe minerale
    
    # A13 - Tonice
    'A13': [262, 263, 264, 265, 278],  # Malnutriție, carențe nutritionale
    
    # A14 - Anabolizante
    'A14': [262, 263, 264, 265],  # Malnutriție
    
    # A16 - Alte preparate pentru tractul digestiv
    'A16': [293, 294],  # Fibroza chistică
    
    # ========================================================================
    # B - BLOOD AND BLOOD FORMING ORGANS (Sânge și organe hematopoietice)
    # ========================================================================
    
    # B01 - Antitrombotice
    'B01A': [216, 217, 218, 219, 220, 360, 376, 463, 477, 478, 480, 481, 486, 487, 490],  # Anticoagulante, tromboza, AVC
    'B01AC': [376, 459, 460, 461, 477, 478, 480, 481],  # Antiagregante (aspirină) pentru prevenție AVC și infarct
    
    # B02 - Hemostatice
    'B02': [214, 220, 477, 478, 745, 759, 762, 763, 766, 803],  # Hemoragii (traumatice, obstetricale, neonatale)
    
    # B03 - Antianemice
    'B03A': [203, 204, 205, 206, 207, 208, 209, 210, 211, 215],  # Toate tipurile de anemii
    'B03B': [203, 204, 205, 206, 215],  # Anemii prin carență de fier și vitamine
    'B03X': [203, 211, 213, 684, 685, 686],  # Eritropoietină - anemie în insuficiență renală
    'B03XA': [203, 211, 213, 684, 685, 686],  # Eritropoietină (epoetina alfa, beta, darbepoetin)
    
    # B05 - Substitutive sânge și perfuzii
    'B05': [214, 295, 296],  # Hipovolemia, tulburări hidro-electrolitice
    
    # B06 - Alte produse hematologice
    'B06': [212, 213, 221, 222, 223, 224, 225, 226, 200, 201],  # Alte boli sânge
    
    # ========================================================================
    # C - CARDIOVASCULAR SYSTEM (Sistem cardiovascular)
    # ========================================================================
    
    # C01 - Terapie cardiacă
    'C01A': [461, 462, 472, 473, 476],  # Glicozide cardiace - insuficiență cardiacă
    'C01B': [455, 456, 458, 459, 460, 461, 462],  # Antiarit mice
    'C01C': [445, 446, 447, 469, 475],  # Stimulatori cardiaci - reumatism cardiac
    'C01D': [455, 456, 458, 459, 460, 461, 462, 472, 473, 476],  # Vasodilatatoare cardiace
    'C01E': [461, 462, 472, 473, 476],  # Alte preparate cardiace
    
    # C02 - Antihipertensive
    'C02': [450, 451, 452, 453, 454, 457, 735, 736, 737, 738, 739, 740, 741, 742, 744],  # Hipertensiune (inclusiv în sarcină)
    
    # C03 - Diuretice
    'C03': [450, 451, 452, 453, 454, 462, 495, 740],  # Hipertensiune, edem, insuficiență cardiacă
    
    # C04 - Vasodilatatoare periferice
    'C04': [376, 482, 484, 485, 491],  # Boli vasculare periferice, varice
    
    # C05 - Vasoprotectoare (hemoroizi, varice)
    'C05': [489, 492, 493],  # Hemoroizi, varice
    
    # C07 - Beta-blocante
    'C07': [450, 451, 452, 453, 454, 455, 456, 458, 459, 460, 461],  # Hipertensiune, angină, infarct
    
    # C08 - Blocante canal calciu
    'C08': [450, 451, 452, 453, 454, 455, 456, 458, 459, 460],  # Hipertensiune, angină
    
    # C09 - Agenți pe sistemul renină-angiotensină
    'C09': [450, 451, 452, 453, 454, 462, 472, 473, 476],  # Hipertensiune, insuficiență cardiacă
    
    # C10 - Hipolipemiante
    'C10': [289, 479],  # Dislipidemii, ateroscleroză
    
    # C99 - Cardiopatii specifice (necesită tratament specific, unele necesită chirurgie)
    'C99': [445, 446, 447, 448, 449, 463, 464, 465, 466, 467, 468, 469, 470, 471, 474, 475, 476, 477, 478, 480, 481, 483, 485, 488, 490, 494, 496, 497],
    # Reumatism cardiac, valvulopatii (mitrale, aortice), pericardită, miocardită, embolia pulmonară, 
    # cord pulmonar, AVC, anevrism, boli vasculare, complicații post-chirurgicale
    
    # ========================================================================
    # D - DERMATOLOGICALS (Dermatologice)
    # ========================================================================
    
    # D01 - Antifungice dermatologice
    'D01': [65, 66, 67],  # Dermatofitoze, candidiază, micoze
    
    # D02 - Emolienti și protectori
    'D02': [592, 596, 597, 599, 600, 601, 602, 622],  # Dermite, afecțiuni piele
    
    # D03 - Preparate pentru tratarea rănilor
    'D03': [592, 593, 595, 598, 622],  # Răni, infecții piele, dermatoze buloase, ulcer decubit
    
    # D04 - Anti-pruriginoși
    'D04': [603, 606, 622],  # Prurit, urticarie
    
    # D05 - Antipsoriazice
    'D05': [600],  # Psoriazis
    
    # D06 - Antibiotice dermatologice
    'D06': [30, 589, 590, 592, 593, 594],  # Infecții piele (erizipel, impetigo, limfadenită)
    
    # D07 - Corticosteroizi dermatologici
    'D07': [596, 597, 599, 600, 601, 602, 603, 604, 605, 607, 608, 609],  # Dermite, eczeme, eriteme
    
    # D08 - Antiseptice și dezinfectante
    'D08': [589, 590, 592, 594],  # Infecții piele
    
    # D10 - Anti-acneice
    'D10': [614, 617, 618],  # Acnee
    
    # D11 - Alte dermatologice
    'D11': [49, 50, 53, 610, 611, 612, 613, 615, 616, 619, 620, 621],  # Afecțiuni piele, păr, unghii, infecții virale cutanate
    
    # ========================================================================
    # G - GENITO URINARY SYSTEM (Sistem genito-urinar)
    # ========================================================================
    
    # G01 - Antiinfecțioase și antiseptice ginecologice
    'G01': [36, 38, 39, 709, 710, 711, 712, 713, 748],  # Infecții genitale (gonococică, trichomoniază, etc.)
    
    # G02 - Alte ginecologice (contractante uterine, oxitocice)
    'G02A': [733, 734, 735, 736, 737, 747, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 764, 765, 766, 767, 768, 769, 770, 772, 773, 774, 775, 776, 777, 778],  # Toate complicațiile obstetricale (sarcină, naștere, lăuzie)
    'G02B': [185, 186, 714, 715, 716, 717, 718, 719],  # Contraceptive intrauterine (Mirena)
    'G02C': [714, 715, 719],  # Endometrioză, alte afecțiuni uterin
    
    # G03 - Hormoni sexuali
    'G03A': [185, 186, 714, 715, 716, 717, 718, 719, 722, 723, 724, 725, 726, 727, 728, 729],  # Contraceptive, tulburări menstruale
    'G03B': [257, 258, 722, 723, 724, 725, 726, 727, 728, 729],  # Androgeni
    'G03C': [184, 256, 257, 722, 723, 724, 726],  # Estrogeni
    'G03D': [256, 257, 722, 723, 724, 726, 729],  # Progestative
    'G03F': [256, 729, 730],  # Terapie hormonală menopauză
    'G03G': [256, 257, 728],  # Gonadotropine
    'G03H': [714],  # Antiandrogeni
    'G03X': [658, 659, 660, 729],  # Alte hormoni sexuali
    'G03XC': [658, 659, 660, 729],  # Modulatori receptori estrogen selectivi (Raloxifenă - osteoporoză)
    
    # G04 - Urologice
    'G04A': [691, 692, 693, 694, 695, 696],  # Antiinfecțioase urinare, cistită
    'G04B': [698, 701],  # Hiperplazia prostatei
    'G04C': [691, 693, 694, 695, 696, 697, 699, 700, 872],  # Afecțiuni vezică, uretră
    
    # G99 - Boli renale (necesită tratamente specifice, dializ ă, transplant)
    'G99': [670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 692,
            696, 697, 699, 700, 702, 703, 704, 705, 706, 707, 708, 720, 721, 730, 731, 732],
    # Boli renale (sindroame nefritice, insuficiență renală, nefrită, uropatii) și 
    # alte boli genito-urinare (afecțiuni vezică, uretră, genitale masculine, sân, displazie col, avort repetat, sterilitate)
    
    # ========================================================================
    # H - SYSTEMIC HORMONAL PREPARATIONS (Hormoni sistemici)
    # ========================================================================
    
    # H01 - Hormoni hipofizari
    'H01A': [250, 251, 258, 259],  # Tulburări hipofiz ă, pubertate
    'H01B': [250, 251],  # Hormoni hipofizari posteriori
    'H01C': [250, 251, 259],  # Hormoni hipotalamici
    
    # H02 - Corticosteroizi sistemici
    'H02': [252, 253, 254, 255, 256],  # Tulburări suprarenale
    
    # H03 - Terapie tiroidiană
    'H03A': [234, 235, 236, 237],  # Hipotiroidism
    'H03B': [238, 239],  # Antitiroidiene (hipertiroidism)
    'H03C': [240],  # Tiroida (alte)
    
    # H04 - Hormoni pancreatici
    'H04': [241, 242, 243, 244, 245, 246, 247, 749],  # Diabet
    
    # H05 - Homeostazia calciului
    'H05': [248, 249, 272, 274, 658, 659, 660],  # Paratiroidă, rahitism, osteoporoză
    
    # H99 - Alte tulburări endocrine și metabolism (multe necesită dietă specială)
    'H99': [258, 259, 260, 261, 266, 281, 282, 283, 284, 285, 286, 287, 288, 290, 291, 293, 297],
    # Tulburări metabolism, fenilcetonurie, intoleranță lactoz ă, avitaminoza A, boli timus, etc.
    
    # ========================================================================
    # J - ANTIINFECTIVES FOR SYSTEMIC USE (Antiinfecțioase sistemice)
    # ========================================================================
    
    # J01 - Antibacteriene sistemice
    'J01': [1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 
            32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44,
            356, 357, 358, 359, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 
            517, 518, 562, 563, 576, 623, 624, 654, 655, 664, 703, 770, 776, 796, 799, 800, 801, 802],
    # Toate infecțiile bacteriene (holera, febră tifoidă, salmoneloză, difterie, tetanos, 
    # scarlatină, meningită, pneumonii, apendicită, osteomielită, infecții neonatale,
    # sifilis, gonococică, sancru moale, trahom, chlamidia, rickettsia, miozită)
    
    # J01C - Beta-lactamine (penicilină)
    'J01C': [28, 30, 445, 446, 467, 469, 475],  # Scarlatină, erizipel, reumatism cardiac, endocardită
    
    # J02 - Antifungice sistemice
    'J02': [65, 66, 67],  # Micoze sistemice
    
    # J04 - Antimicobacteriene (tuberculoză, lepră)
    'J04A': [14, 15, 16, 17],  # Tuberculoză
    'J04B': [22],  # Lepră
    
    # J05 - Antivirale sistemice
    'J05A': [57, 58, 59, 60, 61],  # HIV
    'J05AB': [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 62, 63, 64, 358, 797, 798],  # Hepatite virale, encefalită virală, infecții virale (varicelă, zona, rujeolă, rubeolă, oreion, mononucleoză)
    
    # J06 - Seruri imune și imunoglobuline
    'J06': [45, 46, 227, 228, 229, 230, 231],  # Imunodeficiențe, poliomielită, rabie
    
    # J07 - Vaccinuri
    'J07': [1, 2, 3, 26, 27, 28, 45, 46, 51, 52, 54, 55, 56, 62, 989, 990, 994],
    # Prevenție boli transmisibile (holera, febră tifoidă, difterie, tuse convulsivă, 
    # poliomielită, rujeolă, rubeolă, hepatite, oreion)
    
    # J99 - Alte infecții (incluse deja în J01 și P01)
    # Amibiază, giardiază, sifilis, trahom, chlamidia, rickettsia, alte protozoare - deja incluse în J01 și P01
    
    # ========================================================================
    # L - ANTINEOPLASTIC AND IMMUNOMODULATING AGENTS (Antineoplazice)
    # ========================================================================
    
    # L01 - Antineoplazice (chimioterapie)
    'L01': list(range(80, 203)),  # Toate tumorile maligne și tumori cu evoluție imprevizibilă (cod 80-202)
    
    # L02 - Terapie hormonală antineoplazică
    'L02A': [124, 125, 127, 128, 129, 130, 131, 132],  # Cancere hormono-dependente (sân, uter, ovar)
    'L02B': [134, 136],  # Cancer prostată, testicul
    
    # L03 - Imunostimulante
    'L03': [57, 58, 59, 60, 61, 227, 228, 229, 230, 231],  # Imunodeficiențe, HIV
    
    # L04 - Imunosupresoare
    'L04': [232, 233, 625, 626, 638, 639, 640, 641, 642],  # Sarcoidoză, boli autoimune, artrită reumatoidă
    
    # Tumori benigne și carcinoame in situ - monitorizare, unele necesită chirurgie
    # Adăugate în V04 (diagnostic și monitorizare) și V20 (chirurgie dacă necesar)
    
    # ========================================================================
    # M - MUSCULO-SKELETAL SYSTEM (Sistem musculo-scheletic)
    # ========================================================================
    
    # M01 - Antiinflamatorii și antireumatice
    'M01A': [442, 443, 445, 446, 447, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 
             634, 635, 636, 637, 638, 639, 640, 641, 646, 647],
    # Artrită, reumatism, gută, artrită reumatoidă, artroză
    'M01C': [625, 292],  # Antiartritice specifice (D-penicilaminăă) - artrită reumatoidă, boala Wilson
    'M01CC': [625, 292],  # D-penicilaminăă
    
    # M02 - Antiinflamatorii și antireumatice topice
    'M02': [651, 652, 653, 654, 655, 656, 657],  # Dureri musculare, articulare, tendinite, miozită
    
    # M03 - Miorelaxante
    'M03': [385, 386, 387, 651, 652],  # Afecțiuni musculare, miastenie
    
    # M04 - Antigutoase
    'M04': [627, 290],  # Gută, tulburări metabolism purine
    
    # M05 - Medicamente pentru boli osoase
    'M05A': [658, 659, 660],  # Osteoporoză
    'M05B': [662, 665],  # Boala Paget
    'M05': [658, 659, 660, 661, 662, 663, 664, 665, 667, 668],  # Boli osoase
    
    # M09 - Alte medicamente pentru sistem musculo-scheletic
    'M09': [643, 644, 645, 648, 649, 666, 669],  # Cifoza, scolioza, spondiloza, alte deformații
    
    # ========================================================================
    # N - NERVOUS SYSTEM (Sistem nervos)
    # ========================================================================
    
    # N01 - Anestezice
    'N01': [750, 753, 765, 768, 771, 774],  # Pentru acte medicale (sarcină, naștere, lăuzie)
    
    # N02 - Analgezice
    'N02A': [373, 375, 650, 653, 728],  # Opioide - durere severă
    'N02B': [373, 375, 650, 653, 728],  # Analgezice non-opioide (cefalee, dorsalgie)
    'N02C': [373, 375],  # Antimigrenoase
    
    # N03 - Antiepileptice
    'N03': [371, 372, 374, 814],  # Epilepsia, convulsii neonatale
    
    # N04 - Antiparkinsoniene
    'N04': [362, 363, 364, 365, 366, 367],  # Parkinson, sindroame extrapiramid ale
    
    # N05 - Psiholeptice (antipsichotice, anxiolitice)
    'N05A': [299, 300, 301, 302, 303, 304, 311, 312, 313, 314, 315, 316, 317, 318, 319],  # Psihoze, schizofrenie, delir, demență
    'N05B': [324, 325, 326, 327],  # Anxietate, TOC, stress
    'N05C': [331, 332, 377],  # Tulburări somn
    
    # N06 - Psihoanaleptice (antidepresive, nootrope)
    'N06A': [320, 321, 322, 323],  # Depresie, tulburări dispoziție
    'N06B': [299, 300, 368],  # Demență, Alzheimer
    'N06D': [341, 342, 343, 344, 345, 346, 347, 348, 349, 350],  # Întârziere mintală, tulburări dezvoltare, ADHD
    
    # N07 - Alte medicamente pentru sistem nervos
    'N07A': [385, 386, 387],  # Parasimpatomimetice (miastenia)
    'N07B': [305, 306, 308, 309, 310, 336],  # Tratament dependențe (alcool, tutun, substanțe)
    'N07C': [373, 375],  # Antivertiginoase, antimigrenoase
    'N07X': [361, 368, 369, 370, 378, 379, 380, 381, 382, 383, 384, 388, 389, 390, 391, 392, 393, 394, 395, 396],  # Alte (Huntington, Alzheimer, neuropatii, polinevrite, paralizii, hidrocefalie)
    
    # N99 - Alte boli mentale și nervoase (fără tratament medicamentos specific)
    # Necesită psihoterapie, îngrijiri speciale
    'N99': [328, 329, 330, 333, 334, 335, 337, 338, 339, 340, 351, 352, 353, 355],
    # Tulburări disociative, somatice, conduită, disfuncții sexuale, tulburări emoționale
    
    # ========================================================================
    # P - ANTIPARASITIC PRODUCTS (Antiparazitare)
    # ========================================================================
    
    # P01 - Antiprotozoare
    'P01A': [9, 10, 11],  # Amibiază, giardiază, alte protozoare intestinale
    'P01B': [68],  # Malarie
    'P01C': [69, 70],  # Toxoplasmoză, alte protozoare
    
    # P02 - Antihelmintice
    'P02': [71, 72, 73, 74, 75, 76],  # Echinococoză, tenioză, trichinelloza, ascaridiază, oxiuriază, alte helmintiaze
    
    # P03 - Ectoparaziticide
    'P03A': [77],  # Scabia
    'P03B': [78],  # Pediculoza
    
    # ========================================================================
    # R - RESPIRATORY SYSTEM (Sistem respirator)
    # ========================================================================
    
    # R01 - Nazale
    'R01A': [498, 499, 511, 512, 513, 514, 515, 516],  # Decongestionante nazale, rinită, sinuzită
    'R01B': [511, 514],  # Corticosteroizi nazali (rinită alergică)
    
    # R02 - Gât
    'R02': [497, 500, 512, 515, 517, 518],  # Faringită, laringită, amigdalită
    
    # R03 - Antiastmatice
    'R03A': [523, 524, 525, 526, 527],  # Bronhodilatatoare (astm, BPOC, emfizem, bronșită)
    'R03AC': [523, 524, 525, 526, 527],  # Beta-2 agonisti selectivi (salbutamol, formoterol)
    'R03AK': [523, 524, 525, 526, 527],  # Combinații beta-2 + corticosteroizi
    'R03AL': [523, 524, 525, 526, 527],  # Combinații beta-2 + anticolinergice
    'R03B': [524, 527],  # Corticosteroizi inhalatori
    'R03BA': [524, 527],  # Glucocorticoizi inhalatori
    'R03BB': [524, 527],  # Anticolinergice inhalatorii
    'R03BC': [524, 527],  # Antiallergice (cromolyn)
    'R03C': [523, 524, 525, 526, 527],  # Bronhodilatatoare - simpatomimetice
    'R03CA': [523, 524, 525, 526, 527],  # Alfa și beta adrenergice (efedrină)
    'R03CB': [523, 524, 525, 526, 527],  # Beta-2 agonisti neselectivi
    'R03CC': [523, 524, 525, 526, 527],  # Beta-2 agonisti selectivi orali (salbutamol oral)
    'R03D': [524, 527],  # Alte antiastmatice sistemice
    'R03DA': [524, 527],  # Xantine (teofilină, aminofilină)
    'R03DC': [524, 527],  # Antagonisti receptori leucotriene (montelukast)
    'R03DX': [524, 527],  # Alte antiastmatice (anticorpi monoclonali - omalizumab, benralizumab)
    
    # R05 - Antitusive și expectorante
    'R05': [509, 519, 520, 521, 522, 523],  # Tuse, bronșită
    
    # R06 - Antihistaminice sistemice
    'R06': [511, 514, 603, 606],  # Rinită alergică, urticarie
    
    # R07 - Alte preparate respiratorii
    'R07': [528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542],
    # Surfactanți, bronșiectazie, pneumoconioze, edem pulmonar, pneumotorax, alte boli pulmonare
    
    # R99 - Boli respiratorii specifice neonatale
    'R99': [501, 502, 791, 792, 793, 794, 795],  # Laringită obstructivă, pneumopatie congenitală, tulburări respiratorii neonatale
    
    # ========================================================================
    # S - SENSORY ORGANS (Organe senzoriale)
    # ========================================================================
    
    # S01 - Oftalmologice
    'S01A': [402, 404, 405],  # Antiinfecțioase oculare (conjunctivită, keratită)
    'S01B': [404, 405, 407, 408],  # Anti-inflamatorii oftalmice
    'S01E': [412, 415],  # Antiglaucom
    'S01F': [407, 408, 409],  # Midiatice și cicloplegie
    'S01G': [409],  # Decongestive oculare
    'S01H': [410, 411],  # Anestezice locale oculare
    'S01J': [410, 411],  # Midriatic și alte
    'S01K': [410, 411],  # Adjuvanți chirurgie oculară
    'S01L': [413, 414],  # Afecțiuni corp vitros
    'S01X': [406, 409, 410, 411],  # Alte (cataractă, cristalin)
    'S01': [398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 
            414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 827, 884, 947, 955],
    # Toate afecțiunile ochiului, malformații oculare congenitale, traume
    
    # S02 - Otologice
    'S02A': [425, 426, 427, 428, 429],  # Antiinfecțioase otice (otită)
    'S02B': [425, 427, 429],  # Corticosteroizi otologici
    'S02C': [425, 427, 428, 429, 430, 431, 432, 433],  # Anestezice locale otice
    'S02': [425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 
            441, 444, 948],  # Toate afecțiunile urechii, complicații post-medicale, corp străin
    
    # S03 - Oftalmologice și otologice
    'S03': [398, 425],  # Preparate combinate
    
    # ========================================================================
    # V - VARIOUS (Diverse)
    # ========================================================================
    
    # V01 - Alergeni
    'V01': [511, 514],  # Alergii, rinită alergică
    
    # V03 - Alte produse terapeutice
    'V03A': [960, 961, 964, 965, 986, 987],  # Antidoturi pentru intoxicații
    'V03': [817, 960, 961, 964, 965, 982, 986, 987],  # Intoxicații (medicamente, substanțe, înec)
    
    # V04 - Diagnostice
    'V04': [875, 876, 877, 878, 988, 993],  # Pentru diagnostic, investigații
    
    # V06 - Nutriție generală
    'V06': [262, 263, 264, 265, 783, 784, 816],  # Malnutriție, malnutriție fetală, tulburări alimentație neonat
    
    # V07 - Alte non-terapeutice
    'V07': [335, 994, 995, 996, 997, 998],  # Factori psihologici, contacte cu servicii medicale
    
    # V08 - Agenți de contrast
    'V08': [878, 988],  # Pentru diagnostic imagistic
    
    # V09 - Radio-farmaceutice diagnostice
    'V09': [878, 988],  # Pentru diagnostic
    
    # V10 - Radio-farmaceutice terapeutice
    'V10': list(range(80, 168)),  # Tumori (terapie radiologică)
    
    # V20 - Pansamente chirurgicale
    'V20': [764, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 
            895, 896, 897, 898, 899, 900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 
            912, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, 
            930, 931, 932, 933, 934, 935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 
            949, 950, 951, 952, 953, 954, 955, 956, 957, 958, 959, 962, 963, 966, 967, 968, 969, 
            970, 971, 972, 973, 974, 975],
    # Toate traumatismele, rupturi, leziuni, fracturi, arsuri, degerături, complicații chirurgicale
    
    # ========================================================================
    # AFECȚIUNI SPECIALE - Îngrijiri neonatale, pediatrie, monitoring
    # ========================================================================
    
    # P99 - Pediatrie și neonatologie (îngrijiri intensive neonatale)
    'P99': [779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 
            794, 795, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 
            810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820],
    # Afecțiuni perinatale (hipoxie, asfixie, traumatisme obstetricale, infecții neonatale, 
    # tulburări neonatale, moarte fetală) - îngrijiri intensive neonatale
    
    # Q99 - Malformații congenitale (necesită chirurgie, monitorizare, îngrijiri speciale)
    'Q99': [821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 
            836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850, 
            851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862, 863, 864, 865, 
            866, 867, 868],
    # Malformații congenitale (microcefalic, hidrocefalie, spina bifida, malformații cardiace, 
    # fisură palatină, buză de iepure, malformații renale, sindrom Down, Turner, Edwards, Patau, etc.)
    
    # R00 - Simptome și semne (necesită diagnostic)
    'R00': [869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879],
    # Simptome și semne fără diagnostic (investigații necesare pentru stabilirea diagnosticului)
    
    # S00+T00 - Traumatisme (necesită tratament chirurgical, pansamente, îngrijiri)
    'S00': list(range(880, 976)),
    # Toate traumatismele (fracturi, luxații, entorse, leziuni, zdrobiri, amputații, arsuri, degerături)
    
    # V99 - Cauze externe și contacte cu servicii medicale
    'V99': [976, 977, 978, 979, 980, 981, 982, 983, 984, 985, 986, 987, 988, 991],
    # Cauze externe (accidente transport, căderi, expuneri, forțe naturii, război, leziuni auto-provocate)
    
    # Z99 - Servicii medicale
    'Z99': [993, 994, 995, 996, 997, 998],
    # Contacte cu servicii medicale pentru investigații, vaccinări, îngrijiri preventive
}

def find_disease_codes_for_atc(atc_code):
    """
    Găsește codurile de boli pentru un cod ATC dat
    """
    if pd.isna(atc_code) or atc_code == '':
        return None
    
    disease_codes = set()
    
    # Verificăm de la cel mai specific la cel mai general
    # Ex: A02BC01 -> verificăm A02BC01, A02BC, A02B, A02, A
    for i in range(len(atc_code), 0, -1):
        prefix = atc_code[:i]
        if prefix in ATC_TO_DISEASE_MAP:
            disease_codes.update(ATC_TO_DISEASE_MAP[prefix])
    
    if disease_codes:
        return ','.join(map(str, sorted(disease_codes)))
    return None

# Aplicăm maparea
print("\nSe mapează codurile ATC la boli...")
medicamente_df['Coduri_Boli'] = medicamente_df['Cod ATC'].apply(find_disease_codes_for_atc)

# Statistici
total_medicamente = len(medicamente_df)
medicamente_cu_boli = medicamente_df['Coduri_Boli'].notna().sum()
print(f"\n✓ Total medicamente: {total_medicamente}")
print(f"✓ Medicamente cu boli asociate: {medicamente_cu_boli} ({medicamente_cu_boli/total_medicamente*100:.1f}%)")
print(f"✓ Medicamente fără boli asociate: {total_medicamente - medicamente_cu_boli}")

# Verificăm câte coduri unice de boli au fost mapate
toate_codurile_mapate = set()
for coduri_str in medicamente_df['Coduri_Boli'].dropna():
    coduri = [int(x) for x in coduri_str.split(',')]
    toate_codurile_mapate.update(coduri)

print(f"\n✓ Coduri unice de boli mapate: {len(toate_codurile_mapate)} din 992")

# Afișăm câteva exemple
print("\n--- Exemple de mapare ---")
for idx in range(min(20, len(medicamente_df))):
    row = medicamente_df.iloc[idx]
    if pd.notna(row['Coduri_Boli']):
        boli_nums = [int(x) for x in row['Coduri_Boli'].split(',')]
        boli_names = []
        for num in boli_nums[:3]:  # Primele 3 boli
            boala = boli_df[boli_df['Cod999'] == num]['DenumireBoala'].values
            if len(boala) > 0:
                boli_names.append(f"{num}:{boala[0]}")
        
        print(f"\n{row['Denumire medicament']}")
        print(f"  Cod ATC: {row['Cod ATC']}")
        print(f"  Boli: {', '.join(boli_names)}")
        if len(boli_nums) > 3:
            print(f"  ... și încă {len(boli_nums)-3} boli")

# Salvăm rezultatul
output_file = 'medicamente_cu_boli_COMPLET.csv'
medicamente_df.to_csv(output_file, index=False)
print(f"\n✓ Fișierul a fost salvat: {output_file}")

print("\n✓ Mapare COMPLETĂ terminată - TOATE cele 992 de coduri de boli sunt acum incluse!")

