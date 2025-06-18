#!/usr/bin/env bun
import {
  fuzzySearch,
  codeElements,
  type CodeElement,
  fuzzySearchAI,
  type SearchResult,
} from './parse-project';
import { resolve } from 'path';
import { exec } from 'child_process';
import React from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import debounce from 'debounce';
import { readFileSync } from 'fs';

// Fonction pour ouvrir un fichier dans Cursor
function openInCursor(filePath: string, lineNumber: number) {
  const absolutePath = resolve(filePath);
  const command = `cursor -g "${absolutePath}:${lineNumber}"`;
  exec(command, error => {
    if (error) {
      console.error(
        `Erreur lors de l'ouverture: ${error.message}, command: ${command}`
      );
    }
  });
}

// Fonction pour lire le contexte du code
function getCodeContext(
  filePath: string,
  lineNumber: number
): { line: string; number: number }[] {
  try {
    const content = readFileSync(filePath, 'utf-8').split('\n');
    const start = Math.max(0, lineNumber - 3);
    const end = Math.min(content.length, lineNumber + 3);
    return content.slice(start, end).map((line, index) => ({
      line,
      number: start + index + 1, // +1 because line numbers are 1-based
    }));
  } catch (error) {
    return [];
  }
}

// Fonction utilitaire pour les icônes
function getIcon(type: string): string {
  switch (type) {
    case 'class':
      return '🧱';
    case 'interface':
      return '📐';
    case 'function':
      return '⚙️';
    case 'method':
      return '🔹';
    case 'file':
      return '📄';
    default:
      return '📄';
  }
}

const MAX_RESULTS = 10;

type SearchMode = 'normal' | 'ai';

function App() {
  const [input, setInput] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searchMode, setSearchMode] = React.useState<SearchMode>('normal');
  const [isLoading, setIsLoading] = React.useState(false);
  const { exit } = useApp();

  // Fonction de recherche sans debounce
  const performSearch = React.useCallback(
    async (query: string, mode: SearchMode) => {
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        if (mode === 'normal') {
          const results = fuzzySearch(query, MAX_RESULTS);
          // Sort by score, highest first
          results.sort((a, b) => b.score - a.score);
          setResults(results);
        } else {
          // AI search
          const results = await fuzzySearchAI(query, MAX_RESULTS);
          // results.sort((a, b) => b.score - a.score);
          setResults(results);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounce la recherche pour les changements d'input
  const debouncedSearch = React.useCallback(
    debounce(performSearch, searchMode === 'ai' ? 1000 : 500),
    [performSearch, searchMode]
  );

  // Convertir les résultats en items pour SelectInput
  const items = React.useMemo(
    () =>
      results.map((result, index) => ({
        label: `${index + 1}. ${getIcon(result.type)} ${result.name} (${result.score.toFixed(3)})`,
        key: `${index + 1}. ${getIcon(result.type)} ${result.name} ${result.filePath}:${result.lineNumber}`,
        value: result,
      })),
    [results]
  );

  // Gérer l'input
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input.toLowerCase() === 'c')) {
      exit();
      return;
    }

    if (key.tab) {
      setSearchMode(prev => (prev === 'normal' ? 'ai' : 'normal'));
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    if (input.length === 1) {
      setInput(prev => prev + input);
    }
  });

  // Références pour détecter les changements
  const prevSearchMode = React.useRef(searchMode);
  const prevInput = React.useRef(input);

  // Mettre à jour les résultats quand l'input ou le mode change
  React.useEffect(() => {
    const searchModeChanged = prevSearchMode.current !== searchMode;
    const inputChanged = prevInput.current !== input;

    if (searchModeChanged && !inputChanged) {
      // Mode changé mais pas l'input: recherche immédiate
      performSearch(input, searchMode);
    } else if (inputChanged) {
      // Input changé: recherche avec debounce
      debouncedSearch(input, searchMode);
    }

    // Mettre à jour les références
    prevSearchMode.current = searchMode;
    prevInput.current = input;
  }, [input, searchMode, debouncedSearch, performSearch]);

  // Gérer la sélection
  const handleSelect = (item: { value: SearchResult }) => {
    openInCursor(item.value.filePath, item.value.lineNumber);
  };

  return (
    <Box flexDirection="column">
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Text>📊 Index chargé: {codeElements.length} éléments</Text>
        <Text color={searchMode === 'normal' ? 'blue' : 'gray'}>
          {searchMode === 'normal' ? '🔍 Normal' : 'Normal'}
        </Text>
        <Text>|</Text>
        <Text color={searchMode === 'ai' ? 'blue' : 'gray'}>
          {searchMode === 'ai' ? '🤖 AI' : 'AI'}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {isLoading ? (
          <Box flexDirection="row">
            <Text>🔄 </Text>
            <Text color="yellow">
              {searchMode === 'ai'
                ? 'Recherche IA en cours...'
                : 'Recherche en cours...'}
            </Text>
          </Box>
        ) : results.length === 0 && input.trim() ? (
          <Text>❌ Aucun résultat trouvé</Text>
        ) : results.length > 0 ? (
          <SelectInput<SearchResult>
            items={items}
            onSelect={handleSelect}
            itemComponent={
              (({
                label,
                value,
                isSelected,
              }: {
                label: string;
                value: CodeElement;
                isSelected: boolean;
              }) => (
                <Box flexDirection="column">
                  <Text>{label}</Text>

                  {isSelected && (
                    <>
                      <Text>
                        📁 {value.filePath}:{value.lineNumber}
                      </Text>
                      {value.description && <Text>📝 {value.description}</Text>}
                      <Box
                        borderStyle="round"
                        borderColor="blue"
                        flexDirection="column"
                      >
                        {getCodeContext(value.filePath, value.lineNumber).map(
                          (context, index) => (
                            <Box key={index} flexDirection="row">
                              <Text color="gray">
                                {context.number.toString().padStart(3, ' ')}
                                :{' '}
                              </Text>
                              <Text color={index === 2 ? 'green' : 'gray'}>
                                {context.line}
                              </Text>
                            </Box>
                          )
                        )}
                      </Box>
                    </>
                  )}
                </Box>
              )) as any
            }
          />
        ) : null}
      </Box>

      <Box>
        <Text>🔍 &gt; {input}</Text>
      </Box>
    </Box>
  );
}

// Supprimer les erreurs React
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('React')) {
    return;
  }
  originalError.apply(console, args);
};

render(<App />);
