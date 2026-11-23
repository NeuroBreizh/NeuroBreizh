#!/usr/bin/env python3
"""Branche les jeux sur le carnet de suivi (assets/js/suivi.js).

Chaque jeu reçoit :
  - le script suivi.js ;
  - NBSuivi.start(...) au début d'une partie ;
  - NBSuivi.record(...) juste avant l'écran de résultats.
Le script est idempotent : il ne modifie pas un jeu déjà branché.
Utilisation : python3 _src/patch_games.py   (depuis la racine du dépôt)
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = '<script src="../../assets/js/suivi.js"></script>'

PATCHES = {
    "reflexes-controle": [
        ("function startGame() {\n", "function startGame() {\n  window.NBSuivi&&NBSuivi.start('reflexes-controle');\n"),
        ("  showScreen('screen-results');\n}",
         "  window.NBSuivi&&NBSuivi.record({game:'reflexes-controle',level:config.label,score:score,accuracy:overall,rt:avgRt,"
         "errors:goMisses+nogoFails,correct:goHits+nogoCorr,details:{'Réponses aux cibles (%)':goAcc,'Retenues réussies (%)':nogoAcc,"
         "'Omissions':goMisses,'Erreurs de commission':nogoFails}});\n  showScreen('screen-results');\n}"),
    ],
    "fee-jardins": [
        ("function startGame(){\n  showScreen('s-game');", "function startGame(){\n  window.NBSuivi&&NBSuivi.start('fee-jardins');\n  showScreen('s-game');"),
        ("  showScreen('s-results');\n}",
         "  window.NBSuivi&&NBSuivi.record({game:'fee-jardins',level:cfg.label,score:score,accuracy:overall,errors:errors,correct:potionsOk+intrusBlocked,"
         "details:{'Bulles bien comptées':potionsOk+' / '+potionsTried,'Intrus arrêtés':intrusBlocked+' / '+intrusTotal,'Meilleure série':bestStreak}});\n"
         "  showScreen('s-results');\n}"),
    ],
    "donjon-des-regles": [
        ("function initGame() {\n  config = LEVELS[levelKey];", "function initGame() {\n  config = LEVELS[levelKey];\n  window.NBSuivi&&NBSuivi.start('donjon-des-regles');"),
        ("  setTimeout(()=>showScreen('screen-results'), gameOver ? 800 : 500);",
         "  window.NBSuivi&&NBSuivi.record({game:'donjon-des-regles',level:config.name,score:score,errors:config.endless?wallErrors:null,"
         "details:Object.assign({'Pas':steps,'Changements de règle':rulesTriggered,'Gemmes':gemsCollected,'Temps (s)':elapsed},config.endless?{'Donjons franchis':mazesCompleted}:{})});\n"
         "  setTimeout(()=>showScreen('screen-results'), gameOver ? 800 : 500);"),
    ],
    "hermine-psy": [
        ("function launchGame(){\n  cfg=CONFIGS[currentDiff];", "function launchGame(){\n  cfg=CONFIGS[currentDiff];\n  window.NBSuivi&&NBSuivi.start('hermine-psy');"),
        ("  showScreen('s-results');\n}",
         "  window.NBSuivi&&NBSuivi.record({game:'hermine-psy',exercise:({find:'Identifier',react:'Catégoriser',sort:'Trier'})[currentMode],"
         "level:cfg.label,score:score,accuracy:acc,rt:avgRt,errors:errors,correct:correct,details:{'Meilleure série':bestStreak}});\n"
         "  showScreen('s-results');\n}"),
    ],
    "ma-journee": [
        ("function launchGame(){\n  cfg=CONFIGS[levelKey];", "function launchGame(){\n  cfg=CONFIGS[levelKey];\n  window.NBSuivi&&NBSuivi.start('ma-journee');"),
        ("  showScreen('s-results');\n}",
         "  window.NBSuivi&&NBSuivi.record({game:'ma-journee',exercise:({plan:'Planning',steps:'Étapes',conseq:'Conséquences'})[currentMode],"
         "level:cfg.label,score:score,accuracy:acc,errors:errors,correct:correct,details:{'Meilleure série':bestStreak}});\n"
         "  showScreen('s-results');\n}"),
    ],
    "oreille-musicale": [
        ("function launchGame(){\n  cfg=CONFIGS[levelKey];", "function launchGame(){\n  cfg=CONFIGS[levelKey];\n  window.NBSuivi&&NBSuivi.start('oreille-musicale');"),
        ("  showScreen('s-results');\n}",
         "  window.NBSuivi&&NBSuivi.record({game:'oreille-musicale',exercise:currentMode==='simple'?'Simple':'Divisée',"
         "level:cfg.endless?'Infini':({easy:'Facile',medium:'Moyen',hard:'Difficile'})[levelKey],score:score,accuracy:acc,errors:errors,correct:correct,"
         "details:{'Meilleure série':bestStreak}});\n  showScreen('s-results');\n}"),
    ],
    "station-mnemos": [
        ("function startGame(game,lk){", "function startGame(game,lk){ window.NBSuivi&&NBSuivi.start('station-mnemos');"),
        ("  showScreen('s-results');\n}",
         "  window.NBSuivi&&NBSuivi.record({game:'station-mnemos',exercise:GAME_META[currentGame].name,level:LEVELS[currentGame][currentLevelKey].label,"
         "score:gScore,accuracy:total?Math.round(pct*100):null,errors:gErrors,correct:gCorrect,details:{'Meilleure série':gBestStreak}});\n"
         "  showScreen('s-results');\n}"),
    ],
}


def main():
    for slug, patches in PATCHES.items():
        path = os.path.join(ROOT, "jeux", slug, "index.html")
        h = open(path, encoding="utf-8").read()
        if "NBSuivi" in h:
            print(slug, ": déjà branché")
            continue
        for old, new in patches:
            n = h.count(old)
            assert n == 1, f"{slug} : ancre trouvée {n} fois : {old[:60]!r}"
            h = h.replace(old, new)
        assert h.count("</head>") == 1
        h = h.replace("</head>", TAG + "\n</head>")
        open(path, "w", encoding="utf-8").write(h)
        print(slug, ": branché")


if __name__ == "__main__":
    main()
