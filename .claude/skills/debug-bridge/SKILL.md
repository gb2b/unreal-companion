---
name: debug-bridge
description: Diagnostic de la communication TCP entre le serveur Python MCP et le plugin C++ Unreal
---

# Debug Bridge TCP

Guide de diagnostic pour les problèmes de communication entre le serveur Python MCP et le plugin C++ dans Unreal Engine.

## Symptômes courants

| Symptôme | Cause probable | Section |
|----------|---------------|---------|
| "Connection refused" | Plugin UE pas lancé | Étape 1 |
| "Unknown command" | Route manquante dans Bridge.cpp | Étape 3 |
| Timeout | GameThread bloqué | Étape 4 |
| Réponse JSON invalide | Erreur dans le handler C++ | Étape 5 |
| "Connection reset" | Plugin crashé | Étape 6 |

## Étape 1 : Vérifier que le plugin UE tourne

Le plugin écoute sur le port TCP 55557.

```bash
# Vérifier si quelque chose écoute sur 55557
lsof -i :55557
# ou
netstat -an | grep 55557
```

Si rien n'écoute :
- Ouvrir Unreal Editor
- Vérifier que le plugin UnrealCompanion est activé (Edit → Plugins)
- Chercher "LogMCPBridge" dans Output Log pour les erreurs de démarrage

## Étape 2 : Vérifier les logs Python

```bash
tail -f ~/.unreal_mcp/unreal_mcp.log
```

Chercher :
- `Connection refused` → plugin pas lancé
- `Timeout` → commande prend trop de temps
- `Error parsing response` → réponse C++ malformée

## Étape 3 : Vérifier la route (cause n.1 des "Unknown command")

```bash
# Chercher la commande dans Bridge.cpp
grep -n "category_action" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
```

Si pas trouvé → la route manque dans `ExecuteCommand()`. C'est le piège le plus fréquent.

Vérifier aussi que le `Command.StartsWith()` est correct et que le bon handler est appelé.

## Étape 4 : Diagnostiquer un timeout

Le timeout signifie que la commande C++ prend trop de temps :
- La commande s'exécute sur le GameThread via FTickableGameObject
- Si le GameThread est bloqué (breakpoint, modal dialog, loading), tout timeout

Vérifier dans UE Output Log (filtre `LogMCPBridge`) :
- La commande est-elle reçue ? ("Received command: ...")
- Le handler est-il appelé ? (ajouter des UE_LOG si nécessaire)
- Y a-t-il un crash/exception ?

## Étape 5 : Diagnostiquer une réponse invalide

Si le JSON retourné par C++ est malformé :
1. Ajouter un `UE_LOG` avant le return du handler pour voir la réponse
2. Vérifier que `FJsonSerializer::Serialize` est utilisé correctement
3. Vérifier qu'il n'y a pas de caractères non-UTF8 dans la réponse

## Étape 6 : Plugin crashé

Si la connexion est reset :
1. Vérifier le crash log UE (Saved/Crashes/)
2. Vérifier Output Log pour les derniers messages avant le crash
3. Causes fréquentes :
   - Accès à un UObject détruit (dangling pointer)
   - Opération non-GameThread sur un UObject
   - Out of memory sur une opération trop large

## Arbre de décision

```
Problème de communication
├── Connexion impossible ?
│   ├── Port 55557 pas ouvert → Lancer UE + activer plugin
│   └── Port ouvert mais refuse → Redémarrer le plugin
├── "Unknown command" ?
│   └── Route manquante dans Bridge.cpp → Ajouter la route
├── Timeout ?
│   ├── GameThread bloqué → Vérifier UE pas en mode modal
│   └── Handler trop lent → Optimiser ou rendre async
├── Réponse invalide ?
│   └── JSON malformé → Vérifier FJsonSerializer usage
└── Connexion coupée ?
    └── Plugin crashé → Vérifier crash logs
```
