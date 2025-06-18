# 🔍 Fuzzy AI - Système de recherche floue pour IA

Un outil puissant pour indexer et rechercher dans un projet TypeScript avec une configuration très permissive, optimisé pour préparer des données à envoyer à une IA.

## 🚀 Installation

```bash
bun install
```

## 📋 Fonctionnalités

- 🔍 **Recherche floue** : Configuration très permissive pour capturer le maximum de résultats
- 🤖 **Recherche IA** : Utilise OpenAI pour des recherches sémantiques avancées
- 📊 **Interface CLI** : Recherche interactive en ligne de commande
- 🎯 **Interface Live** : Interface temps réel avec sélection et ouverture dans Cursor
- 📤 **Export IA** : Formate les résultats pour alimenter une IA
- 🏗️ **Index complet** : Classes, interfaces, fonctions, méthodes et fichiers

## 🛠️ Usage

### Interface Live (recommandée)

```bash
bun start
```

- Recherche en temps réel avec `Tab` pour basculer entre mode normal/IA
- Sélection et ouverture directe dans Cursor
- Navigation avec les flèches

### Parser seul

```bash
bun run parse
```

## ⚙️ Configuration

Le projet parse automatiquement les dossiers définis dans `parse-project.ts` :

- Classes et méthodes
- Interfaces et leurs méthodes
- Fonctions exportées
- Fichiers du projet

Pour la recherche IA, définir `CHATGPTKEY` dans les variables d'environnement.

## TODO

- Add cursor in input
- Support pasting
- Split server and UI
- Support args in search (search class, fonctions etc)
