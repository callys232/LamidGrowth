import ts from 'typescript';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const path = 'C:/Users/TechBuddy/Desktop/LamidOne/src/lib/intentRouter.ts';
const source = readFileSync(path, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox);
const cases = [
  ['How much does it cost?', 'assistant'],
  ['I have a problem with billing', 'pricing'],
  ['error problem billing pricing', 'pricing'],
  ['pricing', 'assistant'],
  ['Help me create a goal and assign an expert', 'assistant'],
  ['I want courses and certification', 'assistant'],
];
console.log(JSON.stringify(cases.map(([message, current]) => ({ message, current, routed: sandbox.exports.routeIntent(message, current) })), null, 2));
