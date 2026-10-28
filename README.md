# DayZ Gate — CMD

Bot et tableau de bord DayZ Gate. Le code exécutable reste volontairement à la racine pour préserver les chemins de démarrage et le déploiement Railway.

## Organisation

| Chemin | Contenu |
|---|---|
| `index.js`, `bot.js`, `dashboard.js` et autres `*.js` racine | Services de production et dépendances |
| `public/` | Interface, ressources et manifestes PWA |
| `test/` | Tests |
| `tools/` | Préparation des mises à jour par manifestes SHA-256 |
| `.github/workflows/` | Contrôles GitHub Actions |
| `archives/` | Archive historique de distribution, **jamais exécutée automatiquement** |
| `DATABASE.md` | Informations de stockage |

Le dossier `archives/` ne sert pas au déploiement. Les anciennes archives ne doivent pas être supprimées sans vérifier si un lien extérieur y renvoie.

Les fichiers de travail, clés privées, bases locales et résultats générés sont exclus par `.gitignore`. Les fichiers déjà suivis restent intacts.
