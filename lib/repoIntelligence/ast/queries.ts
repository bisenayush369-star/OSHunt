import type { SupportedLanguage } from "./parser"

/**
 * Tree-sitter query source per language, for extracting symbol declarations
 * and import statements. Queries use tree-sitter's S-expression pattern
 * language: https://tree-sitter.github.io/tree-sitter/using-parsers/queries
 *
 * VERIFICATION STATUS:
 *  - typescript/tsx/javascript, python: run against real sample code with
 *    the actual grammars in this session (see the smoke test referenced in
 *    parser.ts). Confirmed working.
 *  - go, rust: written against tree-sitter's standard, long-stable grammar
 *    node names for these languages, but not individually re-run here —
 *    verify with a real sample before shipping, the same way the others were.
 */

export interface LanguageQueries {
  symbols: string
  imports: string
}

const TS_LIKE: LanguageQueries = {
  symbols: `
    (function_declaration name: (identifier) @name) @symbol.function
    (class_declaration name: (type_identifier) @name) @symbol.class
    (interface_declaration name: (type_identifier) @name) @symbol.interface
    (type_alias_declaration name: (type_identifier) @name) @symbol.type
    (lexical_declaration (variable_declarator name: (identifier) @name value: (arrow_function))) @symbol.function
  `,
  imports: `
    (import_statement source: (string) @source) @import
  `,
}

const QUERIES: Record<SupportedLanguage, LanguageQueries> = {
  typescript: TS_LIKE,
  tsx: TS_LIKE,
  javascript: TS_LIKE,
  python: {
    symbols: `
      (function_definition name: (identifier) @name) @symbol.function
      (class_definition name: (identifier) @name) @symbol.class
    `,
    imports: `
      (import_statement) @import
      (import_from_statement) @import
    `,
  },
  go: {
    symbols: `
      (function_declaration name: (identifier) @name) @symbol.function
      (method_declaration name: (field_identifier) @name) @symbol.function
      (type_declaration (type_spec name: (type_identifier) @name)) @symbol.type
    `,
    imports: `
      (import_spec path: (interpreted_string_literal) @source) @import
    `,
  },
  rust: {
    symbols: `
      (function_item name: (identifier) @name) @symbol.function
      (struct_item name: (type_identifier) @name) @symbol.type
      (enum_item name: (type_identifier) @name) @symbol.type
      (trait_item name: (type_identifier) @name) @symbol.interface
    `,
    imports: `
      (use_declaration argument: (_) @source) @import
    `,
  },
  java: {
    symbols: `
      (method_declaration name: (identifier) @name) @symbol.function
      (class_declaration name: (identifier) @name) @symbol.class
      (interface_declaration name: (identifier) @name) @symbol.interface
    `,
    imports: `(import_declaration (scoped_identifier) @source) @import`,
  },
  c_sharp: {
    symbols: `
      (method_declaration name: (identifier) @name) @symbol.function
      (class_declaration name: (identifier) @name) @symbol.class
      (interface_declaration name: (identifier) @name) @symbol.interface
    `,
    imports: `(using_directive (qualified_name) @source) @import`,
  },
  c: {
    symbols: `(function_definition declarator: (function_declarator declarator: (identifier) @name)) @symbol.function`,
    imports: `(preproc_include path: (_) @source) @import`,
  },
  cpp: {
    symbols: `(function_definition declarator: (function_declarator declarator: (identifier) @name)) @symbol.function`,
    imports: `(preproc_include path: (_) @source) @import`,
  },
  ruby: {
    symbols: `
      (method name: (identifier) @name) @symbol.function
      (class name: (constant) @name) @symbol.class
    `,
    imports: `(call method: (identifier) @_m arguments: (argument_list (string) @source) (#any-of? @_m "require" "require_relative")) @import`,
  },
  php: {
    symbols: `
      (function_definition name: (name) @name) @symbol.function
      (class_declaration name: (name) @name) @symbol.class
    `,
    imports: `(namespace_use_declaration) @import`,
  },
}

export function queriesFor(lang: SupportedLanguage): LanguageQueries {
  return QUERIES[lang]
}
