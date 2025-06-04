#!/usr/bin/env bun
import { fuzzySearch, exportForAI, codeElements, fuse } from './parse-project.js';
import { createInterface } from 'readline';

// Interface readline pour l'interactivité
const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

// Configuration des commandes disponibles
const commands = {
    search: 'Recherche fuzzy dans le code',
    export: 'Exporter les résultats pour l\'IA',
    stats: 'Afficher les statistiques de l\'index',
    config: 'Afficher la configuration de recherche',
    help: 'Afficher cette aide',
    quit: 'Quitter'
};

console.log('🔍 Fuzzy Search CLI - Système de recherche pour IA');
console.log('='.repeat(50));
console.log(`📊 Index chargé: ${codeElements.length} éléments`);
console.log('\nCommandes disponibles:');
Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(8)} - ${desc}`);
});
console.log('\nTapez "help" pour afficher cette aide à nouveau.');
console.log('Utilisez "search <terme>" pour rechercher dans le code.\n');

// Variables globales pour la session
let lastResults: ReturnType<typeof fuzzySearch> = [];

// Fonction principale d'interface
function prompt() {
    rl.question('🔎 > ', (input) => {
        handleCommand(input.trim());
    });
}

// Gestionnaire de commandes
function handleCommand(input: string) {
    const [command, ...args] = input.split(' ');
    const query = args.join(' ');

    if (!command) {
        prompt();
        return;
    }

    switch (command.toLowerCase()) {
        case 'search':
        case 's':
            if (!query) {
                console.log('❌ Usage: search <terme de recherche>');
                break;
            }
            handleSearch(query);
            break;

        case 'export':
        case 'e':
            handleExport(query);
            break;

        case 'stats':
            handleStats();
            break;

        case 'config':
            handleConfig();
            break;

        case 'help':
        case 'h':
            showHelp();
            break;

        case 'quit':
        case 'q':
        case 'exit':
            console.log('👋 Au revoir !');
            rl.close();
            return;

        default:
            if (input.length > 0) {
                // Si ce n'est pas une commande reconnue, traiter comme une recherche
                handleSearch(input);
            }
            break;
    }

    prompt();
}

// Fonction de recherche
function handleSearch(query: string) {
    console.log(`\n🔍 Recherche: "${query}"`);
    console.log('-'.repeat(40));

    const maxResults = 20;
    lastResults = fuzzySearch(query, maxResults);

    if (lastResults.length === 0) {
        console.log('❌ Aucun résultat trouvé');
        return;
    }

    console.log(`\n✅ ${lastResults.length} résultat(s) trouvé(s)`);
    console.log('\n💡 Tapez "export" pour formater ces résultats pour l\'IA');
    console.log('💡 Tapez "export <nombre>" pour limiter les résultats exportés');

    // Afficher un résumé des types trouvés
    const typeStats = lastResults.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Répartition par type:');
    Object.entries(typeStats).forEach(([type, count]) => {
        const icon = getIcon(type);
        console.log(`  ${icon} ${type}: ${count}`);
    });
}

// Fonction d'export
function handleExport(limitStr?: string) {
    if (lastResults.length === 0) {
        console.log('❌ Aucun résultat à exporter. Effectuez d\'abord une recherche.');
        return;
    }

    const limit = limitStr ? parseInt(limitStr) : lastResults.length;
    const resultsToExport = lastResults.slice(0, limit);

    console.log(`\n📋 Export de ${resultsToExport.length} élément(s) pour l'IA:`);
    console.log('='.repeat(50));

    const exported = exportForAI(resultsToExport);
    console.log(exported);

    console.log('='.repeat(50));
    console.log(`✅ Export terminé (${resultsToExport.length} éléments)`);
}

// Afficher les statistiques
function handleStats() {
    const typeStats = codeElements.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const fileStats = codeElements.reduce((acc, item) => {
        const ext = item.filePath.split('.').pop() || 'unknown';
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 STATISTIQUES DE L\'INDEX');
    console.log('='.repeat(30));
    console.log(`Total d'éléments: ${codeElements.length}`);

    console.log('\n🏷️ Par type:');
    Object.entries(typeStats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
            const icon = getIcon(type);
            console.log(`  ${icon} ${type.padEnd(12)} ${count.toString().padStart(4)}`);
        });

    console.log('\n📁 Par extension:');
    Object.entries(fileStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([ext, count]) => {
            console.log(`  .${ext.padEnd(12)} ${count.toString().padStart(4)}`);
        });
}

// Afficher la configuration
function handleConfig() {
    console.log('\n⚙️ CONFIGURATION FUZZY SEARCH');
    console.log('='.repeat(30));
    console.log('Mode: Très permissif');
    console.log('Threshold: 0.8 (0.0 = exact, 1.0 = tout accepter)');
    console.log('Distance max: 1000');
    console.log('Longueur min: 1 caractère');
    console.log('\n🔍 Champs recherchés (par poids):');
    console.log('  • name (0.4)');
    console.log('  • searchableText (0.3)');
    console.log('  • description (0.2)');
    console.log('  • parentName (0.1)');
}

// Afficher l'aide
function showHelp() {
    console.log('\n📚 AIDE - COMMANDES DISPONIBLES');
    console.log('='.repeat(30));
    Object.entries(commands).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(8)} - ${desc}`);
    });

    console.log('\n💡 EXEMPLES:');
    console.log('  search user          - Rechercher "user"');
    console.log('  s auth               - Rechercher "auth" (raccourci)');
    console.log('  export               - Exporter tous les derniers résultats');
    console.log('  export 5             - Exporter les 5 premiers résultats');
    console.log('  stats                - Voir les statistiques');
    console.log('  UserService          - Recherche directe (sans "search")');
}

// Fonction utilitaire pour les icônes
function getIcon(type: string): string {
    switch (type) {
        case 'class': return '🧱';
        case 'interface': return '📐';
        case 'function': return '⚙️';
        case 'method': return '🔹';
        default: return '📄';
    }
}

// Démarrer l'interface
prompt(); 