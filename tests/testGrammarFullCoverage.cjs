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

// 2. Technical question response
const techText = 'In my last project, one of my biggest problem were database latency. I have did several optimizations and I am good in coding. There is many solutions we evaluated to worked on scalability.';
const techResult = performClientTextAnalysis('Describe a technical project', techText);
const techFlagged = techResult.corrections.map(c => c.original.toLowerCase());
console.log('Tech corrections detected:', techResult.corrections.length);
if (!techFlagged.some(f => f.includes('one of my biggest problem'))) {
  throw new Error('Missing tech one of problem: ' + JSON.stringify(techFlagged));
}
if (!techFlagged.some(f => f.includes('were'))) {
  throw new Error('Missing tech were: ' + JSON.stringify(techFlagged));
}
if (!techFlagged.some(f => f.includes('have did'))) {
  throw new Error('Missing tech have did: ' + JSON.stringify(techFlagged));
}
if (!techFlagged.some(f => f.includes('good in coding'))) {
  throw new Error('Missing tech good in coding: ' + JSON.stringify(techFlagged));
}
if (!techFlagged.some(f => f.includes('there is many'))) {
  throw new Error('Missing tech there is many: ' + JSON.stringify(techFlagged));
}
if (!techFlagged.some(f => f.includes('to worked'))) {
  throw new Error('Missing tech to worked: ' + JSON.stringify(techFlagged));
}
if (!techResult.correctedAnswer.includes('one of my biggest problems')) {
  throw new Error('Missing corrected problems: ' + techResult.correctedAnswer);
}
if (!techResult.correctedAnswer.includes('have done')) {
  throw new Error('Missing corrected have done: ' + techResult.correctedAnswer);
}

// 3. HR / Strengths response
const hrText = 'My strengths is dedication and communication. I try to cope up with tight deadlines under pressure. In my team, everyone are encouraged to share feedback.';
const hrResult = performClientTextAnalysis('What are your strengths?', hrText);
const hrFlagged = hrResult.corrections.map(c => c.original.toLowerCase());
console.log('HR corrections detected:', hrResult.corrections.length);
if (!hrFlagged.some(f => f.includes('strengths is'))) {
  throw new Error('Missing hr strengths is: ' + JSON.stringify(hrFlagged));
}
if (!hrFlagged.some(f => f.includes('cope up with'))) {
  throw new Error('Missing hr cope up with: ' + JSON.stringify(hrFlagged));
}
if (!hrFlagged.some(f => f.includes('everyone are'))) {
  throw new Error('Missing hr everyone are: ' + JSON.stringify(hrFlagged));
}

// 4. Intro & Behavioral response
const introText = 'Myself Rahul and I am software engineer. I passed out from college and I am having 2 years of experience. Me and my team worked hard to solved client issues. Please revert back with your feedbacks.';
const introResult = performClientTextAnalysis('Tell me about yourself', introText);
const introFlagged = introResult.corrections.map(c => c.original.toLowerCase());
console.log('Intro corrections detected:', introResult.corrections.length);
if (!introFlagged.some(f => f.includes('myself rahul'))) {
  throw new Error('Missing intro myself rahul: ' + JSON.stringify(introFlagged));
}
if (!introFlagged.some(f => f.includes('am software engineer'))) {
  throw new Error('Missing intro am software engineer: ' + JSON.stringify(introFlagged));
}
if (!introFlagged.some(f => f.includes('am having 2 years'))) {
  throw new Error('Missing intro am having: ' + JSON.stringify(introFlagged));
}
if (!introFlagged.some(f => f.includes('passed out'))) {
  throw new Error('Missing intro passed out: ' + JSON.stringify(introFlagged));
}
if (!introFlagged.some(f => f.includes('me and my team'))) {
  throw new Error('Missing intro me and my team: ' + JSON.stringify(introFlagged));
}
if (!introFlagged.some(f => f.includes('to solved'))) {
  throw new Error('Missing intro to solved: ' + JSON.stringify(introFlagged));
}
if (!introFlagged.some(f => f.includes('revert back'))) {
  throw new Error('Missing intro revert back: ' + JSON.stringify(introFlagged));
}
if (!introFlagged.some(f => f.includes('feedbacks'))) {
  throw new Error('Missing intro feedbacks: ' + JSON.stringify(introFlagged));
}

console.log('SUCCESS: All checks across diverse question answers passed!');
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
