# 🔍 Fuzzy AI - Système de recherche floue pour IA

Un outil puissant pour indexer et rechercher dans un projet TypeScript avec une configuration très permissive, optimisé pour préparer des données à envoyer à une IA.

## 🚀 Installation

```bash
bun install
```

## 📋 Fonctionnalités

- **Indexation complète** : Parse tous les fichiers TypeScript et extrait classes, interfaces, fonctions et méthodes
- **Recherche fuzzy très permissive** : Configuration optimisée pour trouver des résultats même avec des termes approximatifs
- **Export pour IA** : Formate les résultats dans un format optimisé pour les modèles d'IA
- **Interface CLI interactive** : Outil en ligne de commande facile à utiliser
- **Statistiques détaillées** : Analyse complète de votre codebase

## 🎯 Utilisation

### Interface CLI Interactive

```bash
# Démarrer l'interface interactive
bun run search
# ou
bun start
```

### Commandes disponibles

| Commande | Description | Exemple |
|----------|-------------|---------|
| `search <terme>` | Recherche fuzzy | `search user` |
| `s <terme>` | Raccourci pour search | `s auth` |
| `export` | Exporter tous les derniers résultats | `export` |
| `export <N>` | Exporter les N premiers résultats | `export 5` |
| `stats` | Afficher les statistiques | `stats` |
| `config` | Afficher la configuration | `config` |
| `help` | Afficher l'aide | `help` |
| `quit` | Quitter | `quit` |

### Parse direct

```bash
# Analyser le projet et afficher tous les résultats
bun run parse
```

## ⚙️ Configuration

### Recherche très permissive

- **Threshold**: 0.8 (très permissif, 0.0 = exact, 1.0 = tout accepter)
- **Distance max**: 1000 caractères
- **Longueur min**: 1 caractère
- **Champs recherchés** (par poids):
  - `name` (0.4) - Nom de l'élément
  - `searchableText` (0.3) - Texte de recherche enrichi
  - `description` (0.2) - Description de l'élément
  - `parentName` (0.1) - Nom du parent (classe/interface)

### Chemin du projet cible

Le projet à analyser est configuré dans `parse-project.ts` :

```typescript
const targetPath = path.resolve("../product/apps/api");
```

## 📊 Types d'éléments indexés

- 🧱 **Classes** - Toutes les classes TypeScript
- 📐 **Interfaces** - Toutes les interfaces TypeScript  
- ⚙️ **Fonctions** - Fonctions standalone
- 🔹 **Méthodes** - Méthodes de classes et interfaces

## 💡 Exemples d'utilisation

### Recherche simple
```
🔎 > search user
```

### Export pour IA
```
🔎 > search authentication
🔎 > export 10
```

### Recherche directe (sans commande)
```
🔎 > UserService
```

## 🧠 Optimisé pour l'IA

Les exports sont formatés pour être facilement compréhensibles par les modèles d'IA :

```markdown
# Code Structure Analysis

## user.service.ts
*Path: /path/to/user.service.ts*

- **class**: UserService
- **method**: UserService.authenticate
- **method**: UserService.validateToken
```

## 🔧 Développement

### Structure des fichiers

- `parse-project.ts` - Script principal d'analyse et indexation
- `fuzzy-search-cli.ts` - Interface CLI interactive
- `package.json` - Configuration et scripts

### Personnalisation

Pour modifier la configuration de recherche, éditez les options dans `parse-project.ts` :

```typescript
const fuseOptions: IFuseOptions<CodeElement> = {
  threshold: 0.8, // Modifier ici pour plus/moins de permissivité
  // ... autres options
};
```

## 📈 Statistiques

L'outil fournit des statistiques détaillées :
- Nombre total d'éléments indexés
- Répartition par type (classe, interface, fonction, méthode)
- Répartition par extension de fichier
- Analyse de la structure du projet

---

*Développé avec ❤️ pour optimiser les interactions avec l'IA*
# fuzzy-semantic-search
