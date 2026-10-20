// End-to-end test script verifying Client-side Real NLP Engine in clientAnalysis.ts
const fs = require('fs');
const path = require('path');

// We can compile/run via node or import transpiled files from dist or evaluate logic
// Let's test the dist or compile a small bundle, or read clientAnalysis.ts directly using tsx/node
const { execSync } = require('child_process');

console.log('Testing clientAnalysis with intentional multi-error answer...');

const sampleParagraph = 
  "Hello, my name are Anu and I am a B.Tech student in Lovely Professional University. " +
  "I am study in third year and I has a strong interest in web development and artificial intelligence. " +
  "I have make many project like AI interview coach which help students to improves their speaking skills. " +
  "I am also have knowledge of HTML, CSS, JavaScript and React. " +
  "I wants to join this role because I want learning new technologies and improve my technical skill. " +
  "I am hardworking person and I always tries to complete my work on time. " +
  "My dream are to become a successful AI engineer in a big company.";

// Run a quick tsx / node script importing performClientTextAnalysis
const testScript = `
import { performClientTextAnalysis } from '../src/lib/clientAnalysis.ts';

const text = ${JSON.stringify(sampleParagraph)};
const result = performClientTextAnalysis('Tell me about yourself', text);

console.log('Total corrections detected:', result.corrections.length);
console.log('Grammar Score:', result.grammarScore);
console.log('Relevance Score:', result.relevanceScore);
console.log('Vocabulary Score:', result.vocabularyScore);
console.log('Structure Score:', result.structureScore);
console.log('Clarity Score:', result.clarityScore);
console.log('Overall Score:', result.score);
console.log('Corrected Answer:', result.correctedAnswer);

if (result.corrections.length < 15) {
  throw new Error('Expected at least 15 corrections, got ' + result.corrections.length);
}

for (const c of result.corrections) {
  if (!c.original || !c.corrected || !c.reason || !c.errorType) {
    throw new Error('Incomplete correction item: ' + JSON.stringify(c));
  }
}

if (!result.correctedAnswer.includes('my name is Anu')) {
  throw new Error('Missing corrected name: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('I have a strong interest')) {
  throw new Error('Missing corrected have: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('I am studying')) {
  throw new Error('Missing corrected studying: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('have made many projects')) {
  throw new Error('Missing corrected made projects: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('to improve')) {
  throw new Error('Missing corrected to improve: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('I want to join')) {
  throw new Error('Missing corrected want to join: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('want to learn')) {
  throw new Error('Missing corrected want to learn: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('a hardworking person')) {
  throw new Error('Missing corrected a hardworking person: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('always try')) {
  throw new Error('Missing corrected always try: ' + result.correctedAnswer);
}
if (!result.correctedAnswer.includes('My dream is')) {
  throw new Error('Missing corrected My dream is: ' + result.correctedAnswer);
}

console.log('SUCCESS: All checks passed!');
`;

fs.writeFileSync(path.join(__dirname, 'runner.tmp.ts'), testScript);
try {
  const output = execSync('npx tsx tests/runner.tmp.ts', { stdio: 'pipe' }).toString();
  console.log(output);
} finally {
  if (fs.existsSync(path.join(__dirname, 'runner.tmp.ts'))) {
    fs.unlinkSync(path.join(__dirname, 'runner.tmp.ts'));
  }
}
