import { Project } from "ts-morph";
import path from "path";
import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

// Types pour la structure de données indexée
interface CodeElement {
  id: string;
  type: 'class' | 'interface' | 'function' | 'method';
  name: string;
  parentName?: string;
  filePath: string;
  description: string;
  searchableText: string;
}

// Configuration Fuse.js très permissive pour un mode "très large"
const fuseOptions: IFuseOptions<CodeElement> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.8, // Très permissif (0.0 = exact, 1.0 = tout accepter)
  location: 0,
  distance: 1000, // Distance maximum pour trouver un match
  minMatchCharLength: 1, // Accepter même 1 caractère
  keys: [
    {
      name: 'name',
      weight: 0.4
    },
    {
      name: 'searchableText',
      weight: 0.3
    },
    {
      name: 'description',
      weight: 0.2
    },
    {
      name: 'parentName',
      weight: 0.1
    }
  ]
};

// Chemin vers le projet à parser
const targetPath = path.resolve("../product/apps/api");

// Instanciation du projet
const project = new Project({
  tsConfigFilePath: path.join(targetPath, "tsconfig.json"),
});

// Collecte de tous les éléments de code
const codeElements: CodeElement[] = [];
let elementCounter = 0;

for (const file of project.getSourceFiles()) {
  const filePath = file.getFilePath();
  const classes = file.getClasses();
  const functions = file.getFunctions();
  const interfaces = file.getInterfaces();

  if (classes.length || functions.length || interfaces.length) {
    console.log(`\n📄 ${filePath}`);

    for (const cls of classes) {
      const className = cls.getName() || `AnonymousClass${elementCounter++}`;
      console.log(`  🧱 class ${className}`);

      // Ajouter la classe à l'index
      codeElements.push({
        id: `class-${elementCounter++}`,
        type: 'class',
        name: className,
        filePath,
        description: `Class ${className} in ${path.basename(filePath)}`,
        searchableText: `class ${className} ${path.basename(filePath)} ${filePath}`
      });

      for (const method of cls.getMethods()) {
        const methodName = method.getName();
        console.log(`    🔹 method ${methodName}`);

        // Ajouter la méthode à l'index
        codeElements.push({
          id: `method-${elementCounter++}`,
          type: 'method',
          name: methodName,
          parentName: className,
          filePath,
          description: `Method ${methodName} in class ${className}`,
          searchableText: `method ${methodName} ${className} class ${path.basename(filePath)} ${filePath}`
        });
      }
    }

    for (const intf of interfaces) {
      const interfaceName = intf.getName();
      console.log(`  📐 interface ${interfaceName}`);

      // Ajouter l'interface à l'index
      codeElements.push({
        id: `interface-${elementCounter++}`,
        type: 'interface',
        name: interfaceName,
        filePath,
        description: `Interface ${interfaceName} in ${path.basename(filePath)}`,
        searchableText: `interface ${interfaceName} ${path.basename(filePath)} ${filePath}`
      });

      for (const method of intf.getMethods()) {
        const methodName = method.getName();
        console.log(`    🔸 method ${methodName}`);

        // Ajouter la méthode d'interface à l'index
        codeElements.push({
          id: `interface-method-${elementCounter++}`,
          type: 'method',
          name: methodName,
          parentName: interfaceName,
          filePath,
          description: `Method ${methodName} in interface ${interfaceName}`,
          searchableText: `method ${methodName} ${interfaceName} interface ${path.basename(filePath)} ${filePath}`
        });
      }
    }

    for (const fn of functions) {
      const functionName = fn.getName() || `AnonymousFunction${elementCounter++}`;
      console.log(`  ⚙️ function ${functionName}`);

      // Ajouter la fonction à l'index
      codeElements.push({
        id: `function-${elementCounter++}`,
        type: 'function',
        name: functionName,
        filePath,
        description: `Function ${functionName} in ${path.basename(filePath)}`,
        searchableText: `function ${functionName} ${path.basename(filePath)} ${filePath}`
      });
    }
  }
}

// Initialiser Fuse avec les données collectées
const fuse = new Fuse(codeElements, fuseOptions);

console.log(`\n🔍 Index créé avec ${codeElements.length} éléments`);
console.log(`📋 Configuration fuzzy search (très permissive): threshold=${fuseOptions.threshold}`);

// Fonction de recherche fuzzy
function fuzzySearch(query: string, maxResults: number = 20): CodeElement[] {
  if (!query.trim()) {
    return codeElements.slice(0, maxResults);
  }

  const results = fuse.search(query, { limit: maxResults });
  console.log(`\n🔎 Recherche "${query}" - ${results.length} résultats trouvés`);

  return results.map(result => {
    const element = result.item;
    const score = result.score || 0;
    console.log(`  ${getIcon(element.type)} ${element.name} (score: ${score.toFixed(3)}) - ${element.description}`);
    return element;
  });
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

// Fonction pour exporter les résultats au format optimisé pour l'IA
function exportForAI(elements: CodeElement[]): string {
  const grouped = elements.reduce((acc, element) => {
    const key = element.filePath;
    if (!acc[key]) acc[key] = [];
    acc[key].push(element);
    return acc;
  }, {} as Record<string, CodeElement[]>);

  let output = "# Code Structure Analysis\n\n";

  for (const [filePath, fileElements] of Object.entries(grouped)) {
    output += `## ${path.basename(filePath)}\n`;
    output += `*Path: ${filePath}*\n\n`;

    for (const element of fileElements) {
      const prefix = element.parentName ? `${element.parentName}.` : '';
      output += `- **${element.type}**: ${prefix}${element.name}\n`;
    }
    output += '\n';
  }

  return output;
}

// Exemple d'utilisation
console.log('\n' + '='.repeat(50));
console.log('🤖 EXEMPLE DE RECHERCHE FUZZY');
console.log('='.repeat(50));

// Test avec quelques termes de recherche
const searchTerms = ['create amendment'];
for (const term of searchTerms) {
  const results = fuzzySearch(term, 5);
  if (results.length > 0) {
    console.log(`\n📊 Export pour IA (${term}):`);
    console.log(exportForAI(results));
  }
}

// Exporter l'objet fuse et les fonctions pour utilisation externe
export { fuse, fuzzySearch, exportForAI, codeElements };