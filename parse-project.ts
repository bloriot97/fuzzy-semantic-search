import { Project } from 'ts-morph';
import path from 'path';
import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
import { OpenAI } from 'openai';

const elementTypes = [
  'class',
  'interface',
  'function',
  'method',
  'file',
] as const;
type ElementType = (typeof elementTypes)[number];

// Types pour la structure de données indexée
export interface CodeElement {
  id: string;
  type: ElementType;
  name: string;
  parentName?: string;
  parentType?: ElementType;
  filePath: string;
  lineNumber: number;
  description: string;
  searchableText: string;
  context: {
    fileContent: string;
  };
}

export interface SearchResult extends CodeElement {
  score: number;
}

const openai = new OpenAI({
  apiKey: process.env.CHATGPTKEY,
});

const AI_CACHE = new Map<string, SearchResult[]>();

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
      weight: 0.4,
    },
    {
      name: 'searchableText',
      weight: 0.3,
    },
    {
      name: 'description',
      weight: 0.2,
    },
    {
      name: 'parentName',
      weight: 0.1,
    },
  ],
};

// Chemin vers le projet à parser
const targetPaths = [path.resolve('../product/apps/api'), path.resolve('../product/apps/client')];

const parseProject = (targetPath: string) => {
  // Instanciation du projet
  const project = new Project({
    tsConfigFilePath: path.join(targetPath, 'tsconfig.json'),
  });

  // Collecte de tous les éléments de code
  const codeElements: CodeElement[] = [];
  let elementCounter = 0;

  // Fonction utilitaire pour obtenir le numéro de ligne
  function getLineNumber(node: any): number {
    return node.getStartLineNumber();
  }

  for (const file of project.getSourceFiles()) {
    const filePath = file.getFilePath();
    const classes = file.getClasses();
    const functions = file.getFunctions();
    const interfaces = file.getInterfaces();
    const fileContent = file.getFullText();
    const context = {
      fileContent,
    };

    codeElements.push({
      id: `file-${elementCounter++}`,
      type: 'file',
      name: path.basename(filePath),
      filePath,
      lineNumber: 0,
      description: `File ${path.basename(filePath)}`,
      searchableText: `file ${path.basename(filePath)} ${filePath}`,
      context,
    });

    if (classes.length || functions.length || interfaces.length) {
      for (const cls of classes) {
        const className = cls.getName() || `AnonymousClass${elementCounter++}`;

        // Ajouter la classe à l'index
        codeElements.push({
          id: `class-${elementCounter++}`,
          type: 'class',
          name: className,
          filePath,
          lineNumber: getLineNumber(cls),
          description: `Class ${className} in ${path.basename(filePath)}`,
          searchableText: `class ${className} ${path.basename(filePath)} ${filePath}`,
          context,
        });

        for (const method of cls.getMethods()) {
          const methodName = method.getName();

          // check if this is a react fonctionnal component
          



          // Ajouter la méthode à l'index
          codeElements.push({
            id: `method-${elementCounter++}`,
            type: 'method',
            name: methodName,
            parentName: className,
            parentType: 'class',
            filePath,
            lineNumber: getLineNumber(method),
            description: `Method ${methodName} in class ${className}`,
            searchableText: `method ${methodName} ${className} class ${path.basename(filePath)} ${filePath}`,
            context,
          });
        }
      }

      for (const intf of interfaces) {
        const interfaceName = intf.getName();

        // Ajouter l'interface à l'index
        codeElements.push({
          id: `interface-${elementCounter++}`,
          type: 'interface',
          name: interfaceName,
          filePath,
          lineNumber: getLineNumber(intf),
          parentName: filePath.split('/').pop() || '',
          parentType: 'file',
          description: `Interface ${interfaceName} in ${path.basename(filePath)}`,
          searchableText: `interface ${interfaceName} ${path.basename(filePath)} ${filePath}`,
          context,
        });

        for (const method of intf.getMethods()) {
          const methodName = method.getName();

          // Ajouter la méthode d'interface à l'index
          codeElements.push({
            id: `interface-method-${elementCounter++}`,
            type: 'method',
            name: methodName,
            parentName: interfaceName,
            parentType: 'interface',
            filePath,
            lineNumber: getLineNumber(method),
            description: `Method ${methodName} in interface ${interfaceName}`,
            searchableText: `method ${methodName} ${interfaceName} interface ${path.basename(filePath)} ${filePath}`,
            context,
          });
        }
      }

      for (const fn of functions) {
        const functionName =
          fn.getName() || `AnonymousFunction${elementCounter++}`;

        // Ajouter la fonction à l'index
        codeElements.push({
          id: `function-${elementCounter++}`,
          type: 'function',
          name: functionName,
          filePath,
          parentName: filePath.split('/').pop() || '',
          parentType: 'file',
          lineNumber: getLineNumber(fn),
          description: `Function ${functionName} in ${path.basename(filePath)}`,
          searchableText: `function ${functionName} ${path.basename(filePath)} ${filePath}`,
          context,
        });
      }
    }
  }
  return codeElements;
};

const codeElements = targetPaths.map(parseProject).flat();

// Initialiser Fuse avec les données collectées
const fuse = new Fuse(codeElements, fuseOptions);

// Fonction de recherche fuzzy
function fuzzySearch(query: string, maxResults: number = 20): SearchResult[] {
  if (!query.trim()) {
    return codeElements
      .slice(0, maxResults)
      .map(element => ({ ...element, score: 1 }));
  }

  const results = fuse.search(query, { limit: maxResults });

  return results.map(result => {
    const element = result.item;

    return { ...element, score: result.score || 0 };
  });
}

async function fuzzySearchAI(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  const cacheKey = `${query}-${maxResults}`;
  if (AI_CACHE.has(cacheKey)) {
    return AI_CACHE.get(cacheKey) || [];
  }

  const results = await fuzzySearch(query, 30);

  const aiContext = exportForAI(results);

  const jsonSchema = {
    name: 'code_elements',
    schema: {
      type: 'object',
      properties: {
        code_elements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that ranks code elements based on a query. You will be given a list of code elements and a query. You will need to rank the code elements based on the query. You will need to return the top ${maxResults} code elements in a JSON format.`,
      },
      { role: 'user', content: `Query: ${query}` },
      { role: 'user', content: `Context: ${aiContext}` },
      {
        role: 'user',
        content: `Return the top ${maxResults} code elements in a JSON format.`,
      },
    ],
    temperature: 0.1,
    response_format: {
      type: 'json_schema',
      json_schema: jsonSchema,
    },
  });
  const json = JSON.parse(response.choices[0]?.message.content || '{}') as {
    code_elements: { id: string }[];
  };

  const finalResults = json.code_elements.map(
    (element: { id: string }) =>
      results.find(result => result.id === element.id) as SearchResult
  );
  AI_CACHE.set(cacheKey, finalResults);
  return finalResults;
}

// Fonction pour exporter les résultats au format optimisé pour demander a une IA de ranker les meilleurs resultats
function exportForAI(elements: CodeElement[]): string {
  return JSON.stringify(
    elements.map(element => ({
      id: element.id,
      name: element.name,
      type: element.type,
      parentName: element.parentName,
      parentType: element.parentType,
      filePath: element.filePath,
      lineNumber: element.lineNumber,
      // 5 lines before and 5 lines after the line number
      context: element.context.fileContent
        .split('\n')
        .slice(element.lineNumber - 6, element.lineNumber + 6)
        .join('\n'),
    }))
  );
}

// Exporter l'objet fuse et les fonctions pour utilisation externe
export { fuse, fuzzySearch, exportForAI, codeElements, fuzzySearchAI };
