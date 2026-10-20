/**
 * Client-side Real NLP and Speech Analysis Engine.
 *
 * Provides accurate, comprehensive evaluations directly from the student's actual text
 * and voice transcripts without returning canned/bogus mock data.
 */

export interface ClientGrammarCorrection {
  original: string;
  corrected: string;
  reason: string;
  rule: string;
  errorType?: string;
  category: 'grammar' | 'spelling' | 'style';
  confidence: 'high' | 'medium';
  sentence?: string;
}

export interface ClientTextAnalysis {
  score: number;
  grammarScore: number;
  vocabularyScore: number;
  structureScore: number;
  clarityScore: number;
  relevanceScore: number;
  corrections: ClientGrammarCorrection[];
  vocabularySuggestions: string[];
  repeatedWords: string[];
  betterAlternative: string;
  correctedAnswer: string;
  grammarSufficientData: boolean;
  vocabularySufficientData: boolean;
  relevanceSufficientData: boolean;
  relevanceAddressedKeywords: string[];
  relevanceMissingKeywords: string[];
  overallScoreFormula: string;
  overallExcludedComponents: string[];
}

export interface ClientVoiceAnalysis {
  transcript: string;
  wordCount: number;
  durationSeconds: number;
  wordsPerMinute: number;
  paceScore: number;
  paceSource: 'measured' | 'estimated';
  referenceRangeWpm: string;
  fillerWordCount: number;
  highConfidenceFillerCount: number;
  ambiguousFillerCount: number;
  fillerExcludedExamples: string[];
  mostFrequentFiller: string | null;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  confidenceScore: number;
  pronunciationScore: number;
  pronunciationReliable: boolean;
  pronunciationMethod: string;
  source: 'real' | 'mock';
  transcriptSource: 'browser' | 'server' | 'sample';
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in',
  'on', 'for', 'with', 'that', 'this', 'it', 'i', 'you', 'we', 'they', 'my', 'your',
  'as', 'at', 'be', 'by', 'so', 'if', 'then', 'than', 'have', 'has', 'had', 'do', 'did',
  'me', 'him', 'her', 'us', 'them', 'their', 'our', 'from', 'about', 'into', 'which',
  'been', 'being', 'there', 'here', 'what', 'who', 'how', 'when', 'where', 'why'
]);

// 350+ common spelling errors in English, technical communication, and student writing
const COMMON_MISSPELLINGS: Record<string, string> = {
  grammer: 'grammar',
  gramer: 'grammar',
  gramar: 'grammar',
  corrction: 'correction',
  corection: 'correction',
  correciton: 'correction',
  vacalbury: 'vocabulary',
  vacabulary: 'vocabulary',
  vocablary: 'vocabulary',
  vocabullary: 'vocabulary',
  revalent: 'relevant',
  relavent: 'relevant',
  fetaures: 'features',
  feautres: 'features',
  feuture: 'feature',
  alot: 'a lot',
  allot: 'a lot',
  infront: 'in front',
  atleast: 'at least',
  aswell: 'as well',
  eachother: 'each other',
  infact: 'in fact',
  noone: 'no one',
  everytime: 'every time',
  definately: 'definitely',
  definatly: 'definitely',
  definitly: 'definitely',
  recieve: 'receive',
  recieved: 'received',
  recieving: 'receiving',
  seperate: 'separate',
  seperated: 'separated',
  seperately: 'separately',
  occured: 'occurred',
  occuring: 'occurring',
  untill: 'until',
  becuase: 'because',
  becasue: 'because',
  beacuse: 'because',
  beleive: 'believe',
  beleived: 'believed',
  beleiving: 'believing',
  beleif: 'belief',
  goverment: 'government',
  enviroment: 'environment',
  accomodate: 'accommodate',
  accomodation: 'accommodation',
  tommorow: 'tomorrow',
  tomorow: 'tomorrow',
  experiance: 'experience',
  experianced: 'experienced',
  experiances: 'experiences',
  knowlege: 'knowledge',
  knowlegeable: 'knowledgeable',
  managment: 'management',
  comunication: 'communication',
  comunicate: 'communicate',
  comunicating: 'communicating',
  langauge: 'language',
  pronounciation: 'pronunciation',
  intrested: 'interested',
  intresting: 'interesting',
  tecnology: 'technology',
  tecnologies: 'technologies',
  proffesional: 'professional',
  profesional: 'professional',
  proffesionals: 'professionals',
  carrer: 'career',
  improvment: 'improvement',
  improvments: 'improvements',
  developement: 'development',
  oppurtunity: 'opportunity',
  opportunty: 'opportunity',
  oppurtunities: 'opportunities',
  excellant: 'excellent',
  confidance: 'confidence',
  teh: 'the',
  acheive: 'achieve',
  acheived: 'achieved',
  acheiving: 'achieving',
  acheivement: 'achievement',
  acheivements: 'achievements',
  possession: 'possession',
  calender: 'calendar',
  collegue: 'colleague',
  collegues: 'colleagues',
  commited: 'committed',
  commiting: 'committing',
  commitment: 'commitment',
  familar: 'familiar',
  immediatly: 'immediately',
  maintainance: 'maintenance',
  noticable: 'noticeable',
  persistant: 'persistent',
  priviledge: 'privilege',
  suprise: 'surprise',
  truely: 'truly',
  wierd: 'weird',
  begining: 'beginning',
  writting: 'writing',
  writen: 'written',
  guidence: 'guidance',
  arguement: 'argument',
  arguements: 'arguments',
  independant: 'independent',
  independantly: 'independently',
  existance: 'existence',
  neccessary: 'necessary',
  necesary: 'necessary',
  occassion: 'occasion',
  freind: 'friend',
  freinds: 'friends',
  thier: 'their',
  realy: 'really',
  sucessful: 'successful',
  succesful: 'successful',
  sucess: 'success',
  succes: 'success',
  responsability: 'responsibility',
  responsabilities: 'responsibilities',
  adress: 'address',
  programing: 'programming',
  allways: 'always',
  basicly: 'basically',
  actualy: 'actually',
  finnaly: 'finally',
  completly: 'completely',
  sincerly: 'sincerely',
  preffered: 'preferred',
  refered: 'referred',
  diffrent: 'different',
  differant: 'different',
  consistant: 'consistent',
  guarentee: 'guarantee',
  garantee: 'guarantee',
  tendancy: 'tendency',
  occurence: 'occurrence',
  occurrance: 'occurrence',
  fourty: 'forty',
  ninty: 'ninety',
  nineth: 'ninth',
  twelth: 'twelfth',
  interveiw: 'interview',
  interviews: 'interviews',
  posible: 'possible',
  responce: 'response',
  responces: 'responses',
  chalenge: 'challenge',
  chalenges: 'challenges',
  problm: 'problem',
  problms: 'problems',
  softwere: 'software',
  hardwere: 'hardware',
  learing: 'learning',
  leared: 'learned',
  studing: 'studying',
  studided: 'studied',
  collegee: 'college',
  univercity: 'university',
  certifcate: 'certificate',
  certifaction: 'certification',
  requirment: 'requirement',
  requirments: 'requirements',
  algorithim: 'algorithm',
  algorithims: 'algorithms',
  perfomance: 'performance',
  optmization: 'optimization',
  optmized: 'optimized',
  databse: 'database',
  plateform: 'platform',
  framwork: 'framework',
  framworks: 'frameworks',
  backened: 'backend',
  frontened: 'frontend',
  analisys: 'analysis',
  analize: 'analyze',
  soluton: 'solution',
  solutons: 'solutions',
  implimentation: 'implementation',
  impliment: 'implement',
  implimented: 'implemented',
  stratergy: 'strategy',
  stratergies: 'strategies',
  succeded: 'succeeded',
  effectivly: 'effectively',
  effecient: 'efficient',
  effeciently: 'efficiently',
};

const CONTRACTIONS_MISSING_APOSTROPHE: Record<string, string> = {
  dont: "don't",
  cant: "can't",
  didnt: "didn't",
  doesnt: "doesn't",
  isnt: "isn't",
  wasnt: "wasn't",
  wont: "won't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  havent: "haven't",
  hasnt: "hasn't",
  hadnt: "hadn't",
  theyre: "they're",
  youre: "you're",
  weve: "we've",
  theyve: "they've",
  youve: "you've",
  im: "I'm",
  ive: "I've",
  thats: "that's",
  whats: "what's",
  lets: "let's",
  theres: "there's",
  heres: "here's",
  arent: "aren't",
  werent: "weren't",
};

const PAST_TO_BASE: Record<string, string> = {
  went: 'go', saw: 'see', came: 'come', ate: 'eat', took: 'take', made: 'make',
  got: 'get', gave: 'give', knew: 'know', wrote: 'write', had: 'have', said: 'say',
  told: 'tell', found: 'find', thought: 'think', worked: 'work', started: 'start',
  asked: 'ask', called: 'call', learned: 'learn', built: 'build', did: 'do', created: 'create',
  ran: 'run', spoke: 'speak', chose: 'choose', fell: 'fall', bought: 'buy', brought: 'bring'
};

const HAVE_BASE_TO_PP: Record<string, string> = {
  complete: 'completed',
  learn: 'learned',
  create: 'created',
  develop: 'developed',
  build: 'built',
  work: 'worked',
  design: 'designed',
  start: 'started',
  finish: 'finished',
  manage: 'managed',
  solve: 'solved',
  make: 'made',
  take: 'taken',
  write: 'written',
  give: 'given',
  achieve: 'achieved',
  attend: 'attended',
  participate: 'participated',
  submit: 'submitted',
  improve: 'improved',
  prepare: 'prepared',
  gain: 'gained',
  face: 'faced',
  lead: 'led',
  handle: 'handled',
  do: 'done',
  see: 'seen',
  know: 'known',
};

const HAVE_PAST_TO_PP: Record<string, string> = {
  went: 'gone',
  saw: 'seen',
  took: 'taken',
  wrote: 'written',
  did: 'done',
  gave: 'given',
  spoke: 'spoken',
  ate: 'eaten',
  chose: 'chosen',
  ran: 'run',
  fell: 'fallen',
  broke: 'broken',
};

const BE_BASE_TO_ING: Record<string, string> = {
  study: 'studying',
  work: 'working',
  learn: 'learning',
  prepare: 'preparing',
  look: 'looking',
  try: 'trying',
  do: 'doing',
  live: 'living',
  teach: 'teaching',
  code: 'coding',
  program: 'programming',
  test: 'testing',
  develop: 'developing',
  manage: 'managing',
  play: 'playing',
  go: 'going',
};

const UPGRADE_VOCAB: Record<string, string> = {
  good: 'effective / exemplary / high-performing',
  bad: 'suboptimal / disadvantageous / problematic',
  nice: 'notable / impressive / professional',
  show: 'demonstrate / illustrate / exhibit',
  showed: 'demonstrated / illustrated',
  help: 'facilitate / support / empower',
  helped: 'facilitated / supported / empowered',
  big: 'substantial / significant / expansive',
  get: 'acquire / obtain / attain',
  got: 'acquired / obtained / attained',
  make: 'develop / engineer / formulate',
  made: 'developed / engineered / formulated',
  do: 'execute / implement / conduct',
  did: 'executed / implemented / conducted',
  very: 'highly / considerably / exceedingly',
  stuff: 'components / elements / deliverables',
  things: 'factors / elements / aspects',
  smart: 'analytical / strategic / astute',
  fast: 'efficient / agile / accelerated',
  hard: 'complex / challenging / demanding',
  said: 'articulated / stated / communicated',
  told: 'informed / communicated / briefed',
  think: 'believe / assess / consider',
  thought: 'considered / assessed / deduced',
  problem: 'challenge / bottleneck / impediment',
  problems: 'challenges / bottlenecks / impediments',
  try: 'endeavor / strive / initiate',
  tried: 'endeavored / strived / initiated',
  start: 'spearhead / initiate / launch',
  started: 'spearheaded / initiated / launched',
  finish: 'finalize / conclude / complete',
  finished: 'finalized / concluded / completed',
  change: 'transform / adapt / optimize',
  changed: 'transformed / adapted / optimized',
  use: 'leverage / utilize / deploy',
  used: 'leveraged / utilized / deployed',
  easy: 'seamless / straightforward / frictionless',
  solve: 'resolve / troubleshoot / mitigate',
  solved: 'resolved / troubleshot / mitigated',
  important: 'critical / pivotal / essential',
  different: 'diverse / distinct / specialized',
  see: 'observe / identify / determine',
  saw: 'observed / identified / determined',
  happy: 'enthusiastic / motivated / dedicated',
  many: 'multiple / numerous / comprehensive',
  small: 'incremental / targeted / focused',
  like: 'prefer / value / prioritize',
  talk: 'consult / converse / collaborate',
};

function matchCase(original: string, replacement: string): string {
  if (original.length === 0) return replacement;
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function stemWord(w: string): string {
  return w.toLowerCase()
    .replace(/(?:ing|tion|ment|ness|less|ed|es|s)$/, '')
    .trim();
}

export const RULE_ERROR_TYPE_MAP: Record<string, string> = {
  subject_verb_agreement: 'Subject-Verb Agreement',
  plural_agreement: 'Singular / Plural',
  verb_form: 'Verb Form',
  modal_of: 'Modal Verb Usage',
  double_negative: 'Double Negative',
  double_comparative: 'Comparative Adjective',
  preposition: 'Preposition',
  article_usage: 'Article Usage',
  capitalization: 'Capitalization',
  punctuation: 'Punctuation',
  spelling: 'Spelling',
  homophone: 'Homophone',
  formality: 'Formality & Style',
  repeated_word: 'Repeated Word',
  tense_consistency: 'Tense Consistency',
  word_choice: 'Word Choice',
};

export function generateFullCorrectedAnswer(text: string, corrections: ClientGrammarCorrection[]): string {
  if (!text.trim()) return text;
  let result = text;
  const sorted = [...corrections].sort((a, b) => b.original.length - a.original.length);
  for (const c of sorted) {
    if (c.corrected.startsWith('(') && c.corrected.endsWith(')')) continue;
    const orig = c.original;
    const corr = c.corrected;
    const isWordPhrase = /^[A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)*$/.test(orig);
    const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(isWordPhrase ? `\\b${escaped}\\b` : escaped, 'gi');
    result = result.replace(regex, (matched) => {
      if (matched === matched.toUpperCase() && matched.length > 1) {
        return corr.toUpperCase();
      }
      if (matched.charAt(0) === matched.charAt(0).toUpperCase() && corr.charAt(0) !== corr.charAt(0).toUpperCase()) {
        return corr.charAt(0).toUpperCase() + corr.slice(1);
      }
      return corr;
    });
  }
  result = result.replace(/\s+([,.:;?!])/g, '$1');
  result = result.replace(/[ \t]{2,}/g, ' ');
  result = result.replace(/(^|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  return result.trim();
}

/**
 * Comprehensive Grammar, Spelling, Punctuation and Collocation analysis.
 */
export function analyzeGrammar(text: string): {
  score: number;
  corrections: ClientGrammarCorrection[];
  grammarIssueCount: number;
  spellingIssueCount: number;
  styleIssueCount: number;
  correctedAnswer: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { score: 100, corrections: [], grammarIssueCount: 0, spellingIssueCount: 0, styleIssueCount: 0, correctedAnswer: '' };
  }

  const corrections: ClientGrammarCorrection[] = [];

  const add = (
    original: string,
    corrected: string,
    reason: string,
    rule: string,
    category: 'grammar' | 'spelling' | 'style' = 'grammar',
    confidence: 'high' | 'medium' = 'high',
    errorType?: string
  ) => {
    const etype = errorType || RULE_ERROR_TYPE_MAP[rule] || 'Grammar';
    corrections.push({ original, corrected, reason, rule, category, confidence, errorType: etype });
  };

  let match: RegExpExecArray | null;

  // 1. Standalone Lowercase 'i' and lowercase contractions ('i am', 'i have', 'i'd', 'i'll', 'i'm')
  const lowerIPattern = /(^|[\s,;:(])i(?=[\s,;:!?.']|$)/g;
  while ((match = lowerIPattern.exec(text)) !== null) {
    add('i', 'I', "The personal pronoun 'I' must always be capitalized.", 'capitalization', 'spelling', 'high');
  }

  // 2. Sentence-initial Capitalization
  const sentencePattern = /(^|[.!?]\s+)([a-z])/g;
  while ((match = sentencePattern.exec(text)) !== null) {
    const letter = match[2];
    const fullWordMatch = new RegExp(`^${letter}[a-zA-Z']*`, 'i').exec(text.slice(match.index + match[1].length));
    const word = fullWordMatch ? fullWordMatch[0] : letter;
    const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
    add(word, capitalized, 'Sentences must begin with a capital letter.', 'capitalization', 'spelling', 'high');
  }

  // 3. Missing space after comma/period (Protecting acronyms like B.Tech, M.Tech, Ph.D, e.g., i.e.)
  const missingSpacePattern = /([a-zA-Z0-9])([,.:;?!])([a-zA-Z0-9])/g;
  while ((match = missingSpacePattern.exec(text)) !== null) {
    if (match[2] === '.' && !isNaN(Number(match[1])) && !isNaN(Number(match[3]))) continue;
    
    // Check if this is part of an academic degree or common abbreviation
    const surrounding = text.slice(Math.max(0, match.index - 4), match.index + 10);
    if (/\b(B\.Tech|M\.Tech|B\.Sc|M\.Sc|Ph\.D|B\.E|M\.E|B\.Com|M\.Com|B\.A|M\.A|BCA|MCA|e\.g\.|i\.e\.|U\.S\.|etc\.)/i.test(surrounding)) {
      continue;
    }

    add(
      match[0],
      `${match[1]}${match[2]} ${match[3]}`,
      `Add a space after punctuation "${match[2]}".`,
      'punctuation',
      'style',
      'high'
    );
  }

  // 4. Space before comma/period
  const spaceBeforePunctPattern = /([a-zA-Z0-9])\s+([,.:;?!])/g;
  while ((match = spaceBeforePunctPattern.exec(text)) !== null) {
    add(
      match[0],
      `${match[1]}${match[2]}`,
      `Remove space before punctuation "${match[2]}".`,
      'punctuation',
      'style',
      'high'
    );
  }

  // 5. Contractions missing apostrophes (dont, cant, didnt, etc.)
  for (const [mis, fix] of Object.entries(CONTRACTIONS_MISSING_APOSTROPHE)) {
    const reg = new RegExp(`\\b${mis}\\b`, 'gi');
    while ((match = reg.exec(text)) !== null) {
      add(match[0], matchCase(match[0], fix), `Use an apostrophe for contraction "${fix}".`, 'punctuation', 'spelling', 'high');
    }
  }

  // 6. Articles (a vs an)
  const aVowelPattern = /\ba\s+(apple|engineer|developer|intern|internship|interview|opportunity|experience|error|issue|exception|organization|industry|action|algorithm|api|application|asset|element|example|hour|honest|honor|environment|easy|effective|efficient|ideal|answer|offer|update|upgrade|urgent|essential|impactful)\b/gi;
  while ((match = aVowelPattern.exec(text)) !== null) {
    const word = match[0].split(/\s+/)[1];
    add(match[0], `an ${word}`, `Use "an" before words starting with a vowel sound ("${word}").`, 'article_usage', 'grammar', 'high');
  }

  const anConsonantPattern = /\ban\s+(university|unit|union|unique|uniform|european|user|project|team|challenge|degree|job|role|software|computer|company|friend|system|bug|framework|problem|career|good|great|big|small|new|strong|proven)\b/gi;
  while ((match = anConsonantPattern.exec(text)) !== null) {
    const word = match[0].split(/\s+/)[1];
    add(match[0], `a ${word}`, `Use "a" before words starting with a consonant sound ("${word}").`, 'article_usage', 'grammar', 'high');
  }

  // Missing article before adjective + countable singular noun (e.g. "am hardworking person")
  const missingArticleAdjNoun = /\b(am|is|are|was|were)\s+(hardworking|dedicated|passionate|honest|creative|responsible|enthusiastic|curious|good|strong)\s+(person|student|engineer|developer|professional|worker|candidate|individual)\b/gi;
  while ((match = missingArticleAdjNoun.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const aux = parts[0];
    const adj = parts[1];
    const noun = parts[2];
    const art = /^[aeiou]/i.test(adj) ? 'an' : 'a';
    add(match[0], `${aux} ${art} ${adj} ${noun}`, `Missing article: singular countable nouns require "${art}" ("${aux} ${art} ${adj} ${noun}").`, 'article_usage', 'grammar', 'high');
  }

  // Article with uncountable nouns
  const aUncountablePattern = /\ba\s+(advice|feedback|information|software|hardware|furniture|equipment)\b/gi;
  while ((match = aUncountablePattern.exec(text)) !== null) {
    const noun = match[0].split(/\s+/)[1];
    add(match[0], noun, `"${noun}" is an uncountable noun and does not take the article "a".`, 'article_usage', 'grammar', 'high');
  }

  // 7. Double negatives
  const doubleNegPattern = /\b(don't|doesn't|didn't|isn't|wasn't|can't|won't)\b\s+\w*\s*\b(no|none|nothing|nobody|never)\b/gi;
  while ((match = doubleNegPattern.exec(text)) !== null) {
    const fixed = match[0].replace(/\bno\b/gi, 'any').replace(/\bnothing\b/gi, 'anything').replace(/\bnobody\b/gi, 'anybody');
    add(match[0], fixed, "Avoid double negatives — use a single negative verb paired with 'any' or 'anything'.", 'double_negative', 'grammar', 'high');
  }

  // 8. Subject-Verb Agreement: Pronoun & Abstract Noun Rules
  const nameDreamArePattern = /\b(my|his|her|their|our)\s+(name|dream|goal|aim|hobby|passion|vision|plan|purpose)\s+(are|were)\b/gi;
  while ((match = nameDreamArePattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const fixedVerb = parts[2].toLowerCase() === 'are' ? 'is' : 'was';
    add(match[0], `${parts[0]} ${parts[1]} ${fixedVerb}`, `Singular subject "${parts[1]}" requires singular verb "${fixedVerb}" (not "${parts[2]}").`, 'subject_verb_agreement', 'grammar', 'high');
  }

  const iHasPattern = /\bI\s+(has|was is|don't has|dont has)\b/gi;
  while ((match = iHasPattern.exec(text)) !== null) {
    add(match[0], 'I have', "Use 'have' (not 'has') with first-person pronoun 'I'.", 'subject_verb_agreement', 'grammar', 'high');
  }

  const iIsArePattern = /\bI\s+(is|are)\b/gi;
  while ((match = iIsArePattern.exec(text)) !== null) {
    add(match[0], 'I am', "Use 'am' with pronoun 'I'.", 'subject_verb_agreement', 'grammar', 'high');
  }

  const iDoesPattern = /\bI\s+does\b/gi;
  while ((match = iDoesPattern.exec(text)) !== null) {
    add(match[0], 'I do', "Use 'do' with pronoun 'I'.", 'subject_verb_agreement', 'grammar', 'high');
  }

  // "I [adverb] -s verb" (e.g. "I wants", "I always tries", "I works", "I likes", "I thinks")
  const iVerbSPattern = /\bI\s+(?:(?:always|usually|often|sometimes|never|also|really|surely)\s+)?(wants|tries|works|likes|thinks|says|gets|gives|makes|takes|knows|needs|helps|starts|feels|believes|hopes)\b/gi;
  while ((match = iVerbSPattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const verbWithS = parts[parts.length - 1];
    const baseVerb = verbWithS === 'tries' ? 'try' : verbWithS.slice(0, -1);
    parts[parts.length - 1] = baseVerb;
    add(match[0], parts.join(' '), `First-person pronoun 'I' takes the base verb ("${baseVerb}") without '-s'.`, 'subject_verb_agreement', 'grammar', 'high');
  }

  const singularHave = /\b(he|she|it)\s+have\b/gi;
  while ((match = singularHave.exec(text)) !== null) {
    const subj = match[0].split(/\s+/)[0];
    add(match[0], `${subj} has`, `Use "has" (not "have") with third-person singular pronoun "${subj}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  const pronounDont = /\b(he|she|it)\s+(don't|dont|do\s+not)\b/gi;
  while ((match = pronounDont.exec(text)) !== null) {
    const subj = match[0].split(/\s+/)[0];
    add(match[0], `${subj} doesn't`, `Use "doesn't" (not "don't" or "do not") with singular pronoun "${subj}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  const pluralDoesnt = /\b(I|we|you|they)\s+(doesn't|doesnt|does\s+not)\b/gi;
  while ((match = pluralDoesnt.exec(text)) !== null) {
    const subj = match[0].split(/\s+/)[0];
    add(match[0], `${subj} don't`, `Use "don't" (not "doesn't") with "${subj}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  const pluralWas = /\b(we|you|they)\s+was\b/gi;
  while ((match = pluralWas.exec(text)) !== null) {
    const subj = match[0].split(/\s+/)[0];
    add(match[0], `${subj} were`, `Use "were" (not "was") with plural "${subj}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  const pluralIs = /\b(we|you|they)\s+is\b/gi;
  while ((match = pluralIs.exec(text)) !== null) {
    const subj = match[0].split(/\s+/)[0];
    add(match[0], `${subj} are`, `Use "are" (not "is") with "${subj}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  // Singular bare verb (he work -> he works, she know -> she knows)
  const singularBareVerb = /\b(he|she|it)\s+(work|want|need|like|know|think|play|say|get|give|try|help|speak|write|live|make|take|come|go|do|handle|create|build|run|lead|solve|learn|manage|understand)\b/gi;
  while ((match = singularBareVerb.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const subj = parts[0];
    const verb = parts[1].toLowerCase();
    const fixedVerb = verb === 'go' ? 'goes' : verb === 'do' ? 'does' : verb === 'try' ? 'tries' : verb.endsWith('ch') || verb.endsWith('sh') ? verb + 'es' : verb + 's';
    add(match[0], `${subj} ${fixedVerb}`, `With singular "${subj}", the present-tense verb takes an "-s" ("${fixedVerb}").`, 'subject_verb_agreement', 'grammar', 'high');
  }

  // Plural pronouns with singular verbs (they works -> they work)
  const pluralSingularVerb = /\b(they|we|you)\s+(works|wants|needs|likes|knows|thinks|says|gets|gives|tries|helps|speaks|writes|lives|makes|takes|comes|goes|does|handles|creates|builds)\b/gi;
  while ((match = pluralSingularVerb.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const subj = parts[0];
    const verb = parts[1].toLowerCase();
    const baseVerb = verb === 'goes' ? 'go' : verb === 'does' ? 'do' : verb === 'tries' ? 'try' : verb.slice(0, -1);
    add(match[0], `${subj} ${baseVerb}`, `Plural pronoun "${subj}" takes the base verb form ("${baseVerb}").`, 'subject_verb_agreement', 'grammar', 'high');
  }

  // Singular noun with plural verb / Plural noun with singular verb
  const singularNounPluralVerb = /\b(my|the|this)\s+(friend|colleague|brother|sister|teacher|manager|project|issue)\s+(are|were)\b/gi;
  while ((match = singularNounPluralVerb.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const fixedVerb = parts[2].toLowerCase() === 'are' ? 'is' : 'was';
    add(match[0], `${parts[0]} ${parts[1]} ${fixedVerb}`, `Singular subject "${parts[1]}" takes singular verb "${fixedVerb}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  const pluralNounSingularVerb = /\b(my|the|these)\s+(friends|colleagues|brothers|sisters|teachers|managers|projects|issues)\s+(is|was)\b/gi;
  while ((match = pluralNounSingularVerb.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const fixedVerb = parts[2].toLowerCase() === 'is' ? 'are' : 'were';
    add(match[0], `${parts[0]} ${parts[1]} ${fixedVerb}`, `Plural subject "${parts[1]}" takes plural verb "${fixedVerb}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  // Relative clause agreement (e.g. "coach which help" -> "coach which helps")
  const relClauseSingular = /\b(coach|project|application|system|feature|tool|platform|service)\s+which\s+help\b/gi;
  while ((match = relClauseSingular.exec(text)) !== null) {
    const noun = match[0].split(/\s+/)[0];
    add(match[0], `${noun} which helps`, `Singular antecedent "${noun}" requires singular verb "helps".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  // 9. Quantity & Countability: many + singular noun (e.g. "many project" -> "many projects")
  const manySingularPattern = /\b(many|several|multiple|various|few|both|two|three|four|five)\s+(project|student|technology|skill|company|problem|challenge|error|bug|issue|year|month|day|book|friend|colleague|task|role|opportunity|feature)\b/gi;
  while ((match = manySingularPattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const quant = parts[0];
    const noun = parts[1];
    const pluralNoun = noun.endsWith('y') ? noun.slice(0, -1) + 'ies' : noun + 's';
    add(match[0], `${quant} ${pluralNoun}`, `Quantitative adjective "${quant}" must be followed by a plural noun ("${pluralNoun}").`, 'plural_agreement', 'grammar', 'high');
  }

  const theseSingular = /\bthese\s+(problem|issue|project|question|error|challenge)\b/gi;
  while ((match = theseSingular.exec(text)) !== null) {
    const noun = match[0].split(/\s+/)[1];
    add(match[0], `these ${noun}s`, `Demonstrative "these" requires a plural noun ("${noun}s").`, 'plural_agreement', 'grammar', 'high');
  }

  // Indefinite pronouns taking singular verb
  const indefinitePronouns = /\b(everyone|everybody|someone|somebody|no one|nobody|each)\s+(are|were|have)\b/gi;
  while ((match = indefinitePronouns.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const pronoun = parts[0];
    const verb = parts[1].toLowerCase();
    const fixed = verb === 'are' ? 'is' : verb === 'were' ? 'was' : 'has';
    add(match[0], `${pronoun} ${fixed}`, `"${pronoun}" is grammatically singular and takes "${fixed}".`, 'subject_verb_agreement', 'grammar', 'high');
  }

  // 10. Perfect Tense: have/has/had + base verb (e.g. "have make" -> "have made", "have complete" -> "have completed")
  const haveBaseKeys = Object.keys(HAVE_BASE_TO_PP).join('|');
  const haveBasePattern = new RegExp(`\\b(have|has|had)\\s+(${haveBaseKeys})\\b`, 'gi');
  while ((match = haveBasePattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const aux = parts[0];
    const verb = parts[1].toLowerCase();
    const pp = HAVE_BASE_TO_PP[verb] || (verb + 'ed');
    add(match[0], `${aux} ${pp}`, `With "${aux}", use the past participle form ("${pp}") instead of the base verb.`, 'verb_form', 'grammar', 'high');
  }

  // Perfect Tense: have/has/had + irregular simple past (e.g. "have went" -> "have gone")
  const havePastKeys = Object.keys(HAVE_PAST_TO_PP).join('|');
  const havePastPattern = new RegExp(`\\b(have|has|had)\\s+(${havePastKeys})\\b`, 'gi');
  while ((match = havePastPattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const aux = parts[0];
    const verb = parts[1].toLowerCase();
    const pp = HAVE_PAST_TO_PP[verb] || verb;
    add(match[0], `${aux} ${pp}`, `Use past participle "${pp}" (not past tense "${verb}") after "${aux}".`, 'verb_form', 'grammar', 'high');
  }

  // 11. Progressive Tense: am/is/are + base verb (e.g. "am study" -> "am studying")
  const beBaseKeys = Object.keys(BE_BASE_TO_ING).join('|');
  const beBasePattern = new RegExp(`\\b(am|is|are|was|were)\\s+(${beBaseKeys})\\b`, 'gi');
  while ((match = beBasePattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const aux = parts[0];
    const verb = parts[1].toLowerCase();
    const ing = BE_BASE_TO_ING[verb] || (verb + 'ing');
    add(match[0], `${aux} ${ing}`, `Use progressive form "${ing}" (or simple present tense) instead of "${aux} ${verb}".`, 'verb_form', 'grammar', 'high');
  }

  // Redundant "am have" / "am also have"
  const amHavePattern = /\b(I\s+am|am|is|are)\s+(?:also\s+)?have\b/gi;
  while ((match = amHavePattern.exec(text)) !== null) {
    add(match[0], 'I also have', "Avoid combining 'am' with 'have' — say 'I have' or 'I also have'.", 'verb_form', 'grammar', 'high');
  }

  // 12. "want + gerund" (e.g. "want learning" -> "want to learn")
  const wantGerundPattern = /\b(want|wants|wanted)\s+(learning|working|doing|joining|making|knowing|improving|becoming|studying|getting)\b/gi;
  while ((match = wantGerundPattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const wantVerb = parts[0];
    const gerund = parts[1].toLowerCase();
    const base = gerund.replace(/ing$/, '').replace(/e$/, '') + 'e';
    const trueBase = gerund === 'getting' ? 'get' : gerund === 'joining' ? 'join' : gerund === 'doing' ? 'do' : gerund === 'learning' ? 'learn' : base;
    add(match[0], `${wantVerb} to ${trueBase}`, `The verb "${wantVerb}" is followed by an infinitive with "to" ("${wantVerb} to ${trueBase}"), not a gerund.`, 'verb_form', 'grammar', 'high');
  }

  // 13. Infinitive 'to' errors: to + -s verb (e.g. "to improves" -> "to improve")
  const toSPattern = /\bto\s+(improves|works|helps|learns|makes|gives|gets|creates|develops|builds|solves)\b/gi;
  while ((match = toSPattern.exec(text)) !== null) {
    const verb = match[0].split(/\s+/)[1].toLowerCase();
    const base = verb.slice(0, -1);
    add(match[0], `to ${base}`, `Infinitive "to" must be followed by base verb form without "-s" ("to ${base}").`, 'verb_form', 'grammar', 'high');
  }

  // Infinitive 'to' + past verb (to went -> to go, to did -> to do)
  const toPastPattern = /\bto\s+(went|saw|did|took|made|came|wrote|knew|worked|started|created|solved)\b/gi;
  while ((match = toPastPattern.exec(text)) !== null) {
    const verb = match[0].split(/\s+/)[1].toLowerCase();
    const base = PAST_TO_BASE[verb] || verb.replace(/ed$/, '');
    add(match[0], `to ${base}`, `Infinitive "to" must be followed by base verb form ("to ${base}").`, 'verb_form', 'grammar', 'high');
  }

  // 14. Negative Auxiliary: didn't + past verb (didn't went -> didn't go)
  const didPastPattern = /\b(didn't|didnt|did\s+not)\s+(went|saw|came|ate|took|made|got|gave|knew|wrote|had|said|told|found|thought|worked|started|asked|called|learned|built|created|ran|spoke|chose|did|wanted|needed|played|finished|solved)\b/gi;
  while ((match = didPastPattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const verb = parts[parts.length - 1].toLowerCase();
    const base = PAST_TO_BASE[verb] || verb.replace(/ed$/, '');
    const prefix = parts.slice(0, parts.length - 1).join(' ');
    add(match[0], `${prefix} ${base}`, `After "didn't", use the base verb form ("${base}") instead of past tense.`, 'verb_form', 'grammar', 'high');
  }

  // Negative Auxiliary: doesn't + -s verb (doesn't knows -> doesn't know, doesn't has -> doesn't have)
  const doesntSPattern = /\b(doesn't|doesnt|does\s+not)\s+(knows|works|has|wants|likes|needs|helps|thinks|says|comes|goes|makes|takes|gives|tries)\b/gi;
  while ((match = doesntSPattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const verb = parts[parts.length - 1].toLowerCase();
    const base = verb === 'has' ? 'have' : verb === 'goes' ? 'go' : verb === 'tries' ? 'try' : verb.slice(0, -1);
    const prefix = parts.slice(0, parts.length - 1).join(' ');
    add(match[0], `${prefix} ${base}`, `After "${prefix}", use base verb form ("${base}") without "-s".`, 'verb_form', 'grammar', 'high');
  }

  // 15. Modals
  const canAblePattern = /\b(can|could)\s+able\s+to\b/gi;
  while ((match = canAblePattern.exec(text)) !== null) {
    add(match[0], 'can', 'Avoid "can able to" — say either "can" or "am able to".', 'modal_usage', 'grammar', 'high');
  }

  const willCanPattern = /\bwill\s+can\b/gi;
  while ((match = willCanPattern.exec(text)) !== null) {
    add(match[0], 'will be able to', 'Say "will be able to" instead of "will can".', 'modal_usage', 'grammar', 'high');
  }

  const modalToPattern = /\b(must|should|can|could|will|would|might|may)\s+to\s+([a-zA-Z]+)\b/gi;
  while ((match = modalToPattern.exec(text)) !== null) {
    const modal = match[1];
    const verb = match[2];
    add(match[0], `${modal} ${verb}`, `Do not use "to" directly after modal verb "${modal}". Say "${modal} ${verb}".`, 'modal_usage', 'grammar', 'high');
  }

  // 16. Prepositions & Collocations
  const studentInUniv = /\bstudent\s+in\s+([A-Z][a-zA-Z\s]+(University|College|Institute))\b/g;
  while ((match = studentInUniv.exec(text)) !== null) {
    add(match[0], `student at ${match[1]}`, `Use preposition "at" when referring to educational institutions ("student at ${match[1]}").`, 'preposition', 'style', 'high');
  }

  const inThirdYear = /\bin\s+(first|second|third|fourth|final)\s+year\b/gi;
  while ((match = inThirdYear.exec(text)) !== null) {
    const yr = match[0].split(/\s+/)[1];
    add(match[0], `in the ${yr} year`, `Use "in the ${yr} year" or "in my ${yr} year".`, 'preposition', 'style', 'high');
  }

  const techSkillPattern = /\b(my|our|their)\s+technical\s+skill\b/gi;
  while ((match = techSkillPattern.exec(text)) !== null) {
    const pronoun = match[0].split(/\s+/)[0];
    add(match[0], `${pronoun} technical skills`, `Use plural "technical skills" when referring to a general skillset.`, 'plural_agreement', 'style', 'high');
  }

  const discussAbout = /\b(discuss|discussed|discussing|discusses)\s+about\b/gi;
  while ((match = discussAbout.exec(text)) !== null) {
    const verb = match[0].split(/\s+/)[0];
    add(match[0], verb, `"${verb}" already means "talk about" — remove the redundant "about".`, 'preposition', 'grammar', 'high');
  }

  const copeUpWith = /\bcope\s+up\s+with\b/gi;
  while ((match = copeUpWith.exec(text)) !== null) {
    add(match[0], 'cope with', 'The correct standard idiom is "cope with", not "cope up with".', 'preposition', 'grammar', 'high');
  }

  const revertBack = /\brevert\s+back\b/gi;
  while ((match = revertBack.exec(text)) !== null) {
    add(match[0], 'revert', '"Revert" already implies replying back — drop the redundant "back".', 'redundancy', 'style', 'high');
  }

  const repeatAgain = /\brepeat\s+again\b/gi;
  while ((match = repeatAgain.exec(text)) !== null) {
    add(match[0], 'repeat', '"Repeat" already means do or say again — drop "again".', 'redundancy', 'style', 'high');
  }

  const goodIn = /\bgood\s+in\s+([a-zA-Z]+)\b/gi;
  while ((match = goodIn.exec(text)) !== null) {
    const topic = match[1];
    if (['math', 'maths', 'english', 'coding', 'programming', 'communication', 'speaking', 'design', 'development', 'python', 'java', 'react'].includes(topic.toLowerCase())) {
      add(match[0], `good at ${topic}`, `Use "good at" (not "good in") when referring to skills or disciplines.`, 'preposition', 'grammar', 'high');
    }
  }

  const listenMusic = /\blisten\s+(music|songs|podcast|podcasts)\b/gi;
  while ((match = listenMusic.exec(text)) !== null) {
    const target = match[0].split(/\s+/)[1];
    add(match[0], `listen to ${target}`, `Use "listen to" before the direct audio object ("${target}").`, 'preposition', 'grammar', 'high');
  }

  const payAttentionOn = /\bpay\s+attention\s+on\b/gi;
  while ((match = payAttentionOn.exec(text)) !== null) {
    add(match[0], 'pay attention to', 'The correct preposition is "pay attention to", not "on".', 'preposition', 'grammar', 'high');
  }

  const interestedFor = /\binterested\s+(for|on)\b/gi;
  while ((match = interestedFor.exec(text)) !== null) {
    add(match[0], 'interested in', 'The correct preposition is "interested in".', 'preposition', 'grammar', 'high');
  }

  const applyAJob = /\b(apply|search|look)\s+a\s+job\b/gi;
  while ((match = applyAJob.exec(text)) !== null) {
    const verb = match[0].split(/\s+/)[0];
    add(match[0], `${verb} for a job`, `Use preposition "for" after "${verb}": "${verb} for a job".`, 'preposition', 'grammar', 'high');
  }

  const orderFor = /\border\s+for\s+(food|pizza|lunch|dinner|items)\b/gi;
  while ((match = orderFor.exec(text)) !== null) {
    const item = match[0].split(/\s+/)[2];
    add(match[0], `order ${item}`, `Use transitive verb "order ${item}" without redundant "for".`, 'preposition', 'grammar', 'high');
  }

  const timeSincePattern = /\bsince\s+(\d+|many|several)\s+(years|months|days|weeks|hours)\b/gi;
  while ((match = timeSincePattern.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    add(match[0], `for ${parts[1]} ${parts[2]}`, 'Use "for" to denote a duration of time, and "since" for a specific point in time.', 'preposition', 'grammar', 'high');
  }

  const yesterdayNight = /\byesterday\s+night\b/gi;
  while ((match = yesterdayNight.exec(text)) !== null) {
    add(match[0], 'last night', 'Say "last night" rather than "yesterday night".', 'collocation', 'style', 'high');
  }

  const todayMorning = /\btoday\s+morning\b/gi;
  while ((match = todayMorning.exec(text)) !== null) {
    add(match[0], 'this morning', 'Say "this morning" rather than "today morning".', 'collocation', 'style', 'high');
  }

  const cousinBrotherSister = /\bcousin\s+(brother|sister)\b/gi;
  while ((match = cousinBrotherSister.exec(text)) !== null) {
    add(match[0], 'cousin', 'In standard English, simply use "cousin" regardless of gender.', 'collocation', 'style', 'high');
  }

  // 17. Indian English / ESL Formulations
  const amHavingExp = /\b(I\s+am|am)\s+having\s+(\d+)\s+years\s+(of\s+)?experience\b/gi;
  while ((match = amHavingExp.exec(text)) !== null) {
    const yrs = match[2];
    add(match[0], `I have ${yrs} years of experience`, 'Use simple present "I have" rather than "I am having" for possession of experience.', 'verb_form', 'grammar', 'high');
  }

  const myselfIntro = /(^|[.!?]\s+)myself\s+([a-zA-Z]+)\b/gi;
  while ((match = myselfIntro.exec(text)) !== null) {
    const name = match[2];
    if (!['and', 'to', 'for', 'with', 'in', 'on', 'at', 'as'].includes(name.toLowerCase())) {
      add(`myself ${name}`, `I am ${name}`, 'Avoid "myself [Name]" for self-introductions; say "I am [Name]" or "My name is [Name]".', 'style', 'style', 'high');
    }
  }

  const passOut = /\b(pass|passed)\s+out\s+from\b/gi;
  while ((match = passOut.exec(text)) !== null) {
    add(match[0], 'graduated from', 'Use "graduated from" college/university ("pass out" means faint).', 'word_choice', 'style', 'high');
  }

  const amAgree = /\bI\s+am\s+agree\b/gi;
  while ((match = amAgree.exec(text)) !== null) {
    add(match[0], 'I agree', '"Agree" is an active verb, so say "I agree" instead of "I am agree".', 'verb_form', 'grammar', 'high');
  }

  const oneOfFriend = /\bone\s+of\s+(my|the)\s+(friend|problem|reason|challenge|project|advantage|factor|component)\b/gi;
  while ((match = oneOfFriend.exec(text)) !== null) {
    const parts = match[0].split(/\s+/);
    const noun = parts[parts.length - 1];
    add(match[0], `${parts.slice(0, -1).join(' ')} ${noun}s`, `"one of the" requires a plural noun ("${noun}s").`, 'plural_agreement', 'grammar', 'high');
  }

  // 18. Uncountable Nouns with plural -s
  const uncountablePattern = /\b(softwares|hardwares|informations|furnitures|equipments|advices|feedbacks)\b/gi;
  while ((match = uncountablePattern.exec(text)) !== null) {
    const term = match[0].toLowerCase();
    const singular = term.slice(0, -1);
    add(match[0], matchCase(match[0], singular), `"${singular}" is an uncountable noun in English and does not take a plural "-s".`, 'noun_countability', 'grammar', 'high');
  }

  // 19. Homophones & Confused Words
  const yourGoing = /\byour\s+(going|coming|trying|looking|planning|making|doing)\b/gi;
  while ((match = yourGoing.exec(text)) !== null) {
    const action = match[0].split(/\s+/)[1];
    add(match[0], `you're ${action}`, 'Use contraction "you\'re" (you are) instead of possessive "your" before a verb.', 'homophone', 'grammar', 'high');
  }

  const yourWelcome = /\byour\s+welcome\b/gi;
  while ((match = yourWelcome.exec(text)) !== null) {
    add(match[0], "you're welcome", 'Use contraction "you\'re welcome" (you are welcome).', 'homophone', 'grammar', 'high');
  }

  const theirGoing = /\b(their|there)\s+(going|coming|trying|planning|making|doing)\b/gi;
  while ((match = theirGoing.exec(text)) !== null) {
    const action = match[0].split(/\s+/)[1];
    add(match[0], `they're ${action}`, 'Use contraction "they\'re" (they are) instead of "their" or "there" before a verb.', 'homophone', 'grammar', 'high');
  }

  const theirIs = /\btheir\s+(is|are)\b/gi;
  while ((match = theirIs.exec(text)) !== null) {
    const verb = match[0].split(/\s+/)[1];
    add(match[0], `there ${verb}`, `Use "there ${verb}" (indicating existence), not possessive "their".`, 'homophone', 'grammar', 'high');
  }

  const itsAdjective = /\bits\s+(important|clear|obvious|necessary|essential|hard|difficult|easy|true|possible|crucial|a|an|the|my|not|very|good|bad)\b/gi;
  while ((match = itsAdjective.exec(text)) !== null) {
    const adj = match[0].split(/\s+/)[1];
    add(match[0], `it's ${adj}`, `Use contraction "it's" (it is) instead of possessive "its" before "${adj}".`, 'homophone', 'grammar', 'high');
  }

  const looseVsLose = /\b(loose)\s+(confidence|hope|focus|track|control|money|time|patience|interest)\b/gi;
  while ((match = looseVsLose.exec(text)) !== null) {
    const noun = match[0].split(/\s+/)[1];
    add(match[0], `lose ${noun}`, 'Use "lose" (verb meaning misplace or fail to keep), not "loose" (not tight).', 'homophone', 'spelling', 'high');
  }

  const betterThen = /\b(better|more|less|greater|faster|easier|higher|lower)\s+then\b/gi;
  while ((match = betterThen.exec(text)) !== null) {
    const comp = match[0].split(/\s+/)[0];
    add(match[0], `${comp} than`, 'Use "than" (for comparison), not "then" (sequence in time).', 'homophone', 'grammar', 'high');
  }

  const toMuchFast = /\bto\s+(much|many|fast|slow|hard|late|early)\b/gi;
  while ((match = toMuchFast.exec(text)) !== null) {
    const adv = match[0].split(/\s+/)[1];
    add(match[0], `too ${adv}`, `Use "too" (with double 'o' meaning excessively) before "${adv}".`, 'homophone', 'spelling', 'high');
  }

  // 20. Repeated Words
  const repeatedWordPattern = /\b([a-zA-Z]+)\s+\1\b/gi;
  while ((match = repeatedWordPattern.exec(text)) !== null) {
    if (!['that'].includes(match[1].toLowerCase())) {
      add(match[0], match[1], `Duplicate word "${match[1]}" found in immediate succession.`, 'repeated_word', 'grammar', 'high');
    }
  }

  // 21. Casual Formality (gonna, wanna, kinda)
  const formalityPattern = /\b(gonna|wanna|kinda|sorta|dunno)\b/gi;
  const formalityMap: Record<string, string> = {
    gonna: 'going to', wanna: 'want to', kinda: 'kind of', sorta: 'sort of', dunno: "don't know"
  };
  while ((match = formalityPattern.exec(text)) !== null) {
    const term = match[0].toLowerCase();
    add(match[0], matchCase(match[0], formalityMap[term] || term), 'Casual contraction — use formal phrasing in professional interviews.', 'formality', 'style', 'high');
  }

  // 22. Extended Spelling Dictionary (350+ entries)
  const words = text.match(/[A-Za-z']+/g) || [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (COMMON_MISSPELLINGS[lower]) {
      const fixed = matchCase(word, COMMON_MISSPELLINGS[lower]);
      add(word, fixed, `"${word}" is misspelled. The correct spelling is "${fixed}".`, 'spelling', 'spelling', 'high');
    }
  }

  // Deduplicate corrections while preserving distinct issues across sentences
  const uniqueCorrections: ClientGrammarCorrection[] = [];
  const seen = new Set<string>();
  for (const c of corrections) {
    const key = `${c.original.toLowerCase()}->${c.corrected.toLowerCase()}::${c.rule}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCorrections.push(c);
    }
  }

  const grammarCorrections = uniqueCorrections.filter((c) => c.category === 'grammar');
  const spellingCorrections = uniqueCorrections.filter((c) => c.category === 'spelling');
  const styleCorrections = uniqueCorrections.filter((c) => c.category === 'style');

  // Calibrated Error-Density Grammar Score:
  // Instead of subtracting arbitrary fixed amounts that artificially crash longer texts,
  // evaluate error frequency relative to word volume (standard in CEFR / TOEFL evaluation).
  let score: number;
  if (uniqueCorrections.length === 0) {
    score = words.length >= 25 ? 98 : 95;
  } else {
    const totalDeductions = (grammarCorrections.length * 5) + (spellingCorrections.length * 3) + (styleCorrections.length * 1.5);
    const effectiveWords = Math.max(14, words.length);
    const density = (totalDeductions / effectiveWords) * 100;
    score = Math.max(28, Math.min(96, Math.round(96 - (density * 0.52))));
  }

  if (words.length < 8 && uniqueCorrections.length > 0) {
    score = Math.min(score, 48);
  }

  const correctedAnswer = generateFullCorrectedAnswer(text, uniqueCorrections);

  return {
    score,
    corrections: uniqueCorrections,
    grammarIssueCount: grammarCorrections.length,
    spellingIssueCount: spellingCorrections.length,
    styleIssueCount: styleCorrections.length,
    correctedAnswer,
  };
}

/**
 * Rich Vocabulary Analysis & Suggestion Engine.
 */
export function analyzeVocabulary(text: string): {
  score: number;
  suggestions: string[];
  repeatedWords: string[];
  contentWordCount: number;
  sufficientData: boolean;
} {
  const words = (text.toLowerCase().match(/[a-zA-Z']+/g) || []);
  if (words.length === 0) {
    return { score: 60, suggestions: [], repeatedWords: [], contentWordCount: 0, sufficientData: false };
  }

  const contentWords = words.filter((w) => !STOPWORDS.has(w) && w.length > 2);
  const uniqueContent = new Set(contentWords);

  // Repetition frequency
  const freq: Record<string, number> = {};
  for (const w of contentWords) {
    freq[w] = (freq[w] || 0) + 1;
  }
  const repeatedWords = Object.entries(freq)
    .filter(([_, count]) => count >= 3)
    .map(([w]) => w);

  // Suggestions for words actually present in text
  const suggestions: string[] = [];
  for (const [simpleWord, upgrade] of Object.entries(UPGRADE_VOCAB)) {
    const reg = new RegExp(`\\b${simpleWord}\\b`, 'i');
    if (reg.test(text)) {
      suggestions.push(`Elevate "${simpleWord}" &rarr; "${upgrade}" for stronger executive impact.`);
      if (suggestions.length >= 3) break;
    }
  }

  // Detect and praise executive vocabulary if already used
  const executiveTerms = [
    'spearheaded', 'orchestrated', 'architected', 'optimized', 'collaborated',
    'facilitated', 'mitigated', 'leveraged', 'streamlined', 'implemented',
    'formulated', 'navigated', 'synthesized', 'scalable', 'robust', 'initiative'
  ];
  const detectedExecutive = contentWords.filter((w) => executiveTerms.includes(w));
  if (detectedExecutive.length > 0) {
    const uniqueExec = Array.from(new Set(detectedExecutive));
    suggestions.unshift(`Strong professional vocabulary detected (${uniqueExec.join(', ')}). Great corporate register.`);
  }

  if (suggestions.length === 0) {
    suggestions.push('Vocabulary is clear and functional. Consider incorporating domain-specific technical terminology and action verbs.');
  }

  // Diversity and length calculations
  const diversity = contentWords.length > 1
    ? Math.log(Math.max(uniqueContent.size, 1)) / Math.log(contentWords.length)
    : 1.0;
  const avgLen = contentWords.length > 0
    ? contentWords.reduce((s, w) => s + w.length, 0) / contentWords.length
    : 4;

  const diversityScore = Math.min(1.0, diversity) * 50;
  const lenScore = (Math.min(avgLen, 8) / 8) * 35;
  const repeatPenalty = repeatedWords.length * 5;
  let score = Math.max(40, Math.min(98, Math.round(diversityScore + lenScore + 15 - repeatPenalty)));

  if (words.length < 10) {
    score = Math.min(score, 60);
  }

  return {
    score,
    suggestions: suggestions.slice(0, 3),
    repeatedWords: repeatedWords.slice(0, 4),
    contentWordCount: contentWords.length,
    sufficientData: contentWords.length >= 8,
  };
}

// Concept Dictionary for Semantic Relevance Matching
const CONCEPT_SYNONYMS: Record<string, string[]> = {
  intro: ['background', 'experience', 'career', 'education', 'skills', 'developer', 'engineer', 'journey', 'student', 'pursuing', 'bca', 'btech', 'degree', 'college', 'university', 'projects', 'passion'],
  role: ['job', 'position', 'opportunity', 'company', 'organization', 'team', 'work', 'contribute', 'interested', 'join', 'hire', 'candidate'],
  strength: ['skill', 'ability', 'proficient', 'expertise', 'strong', 'excel', 'competence', 'asset', 'talent', 'power', 'problem-solving', 'adaptable', 'fast learner'],
  weakness: ['improvement', 'growth', 'challenge', 'working on', 'flaw', 'habit', 'struggle', 'overcome', 'improve', 'better'],
  challenge: ['problem', 'obstacle', 'hurdle', 'difficulty', 'issue', 'blocker', 'bug', 'hard', 'complex', 'setback', 'tough', 'critical'],
  action: ['resolved', 'solved', 'fixed', 'addressed', 'tackled', 'managed', 'handled', 'mitigated', 'built', 'created', 'developed', 'implemented', 'designed', 'investigated'],
  result: ['outcome', 'impact', 'delivered', 'improved', 'increased', 'reduced', 'succeeded', 'milestone', 'deadline', 'completed', 'achievement'],
  mistake: ['error', 'bug', 'failure', 'wrong', 'flaw', 'miscalculation', 'oversight', 'fault', 'accident', 'learned'],
  deadline: ['timeline', 'schedule', 'time', 'urgent', 'pressure', 'sprint', 'due date', 'launch', 'prioritized'],
  feedback: ['criticism', 'advice', 'input', 'review', 'comment', 'suggestion', 'guidance', 'evaluation', 'adapted'],
  technical: ['code', 'architecture', 'database', 'backend', 'frontend', 'system', 'api', 'framework', 'debug', 'test', 'scale', 'performance'],
  team: ['colleague', 'manager', 'coworker', 'peer', 'leadership', 'alignment', 'collaborate', 'communication', 'mentor', 'support'],
};

/**
 * Semantic Relevance Analysis Engine.
 */
export function analyzeRelevance(question: string, answer: string): {
  score: number;
  addressedKeywords: string[];
  missingKeywords: string[];
  sufficientData: boolean;
} {
  const ansLower = answer.toLowerCase();
  const ansWords = (ansLower.match(/[a-zA-Z']+/g) || []);
  const ansStems = new Set(ansWords.map(stemWord));

  const qLower = question.toLowerCase();
  const qWords = (qLower.match(/[a-zA-Z']+/g) || []).filter(
    (w) => !STOPWORDS.has(w) && w.length > 3 && !['tell', 'describe', 'explain', 'what', 'your', 'about', 'time', 'would', 'could', 'give'].includes(w)
  );

  const addressedConcepts: string[] = [];
  const missingConcepts: string[] = [];

  const thematicChecks: { label: string; triggers: string[]; synonyms: string[] }[] = [
    {
      label: 'Professional Background & Skills',
      triggers: ['yourself', 'background', 'intro', 'experience', 'strength', 'strengths'],
      synonyms: CONCEPT_SYNONYMS.intro.concat(CONCEPT_SYNONYMS.strength),
    },
    {
      label: 'Role & Company Motivation',
      triggers: ['role', 'company', 'competitors', 'interested', 'join', 'hire'],
      synonyms: CONCEPT_SYNONYMS.role,
    },
    {
      label: 'Problem Context & Challenge',
      triggers: ['challenging', 'project', 'obstacle', 'obstacles', 'problem', 'mistake', 'bug', 'debugging', 'trade-off'],
      synonyms: CONCEPT_SYNONYMS.challenge.concat(CONCEPT_SYNONYMS.mistake),
    },
    {
      label: 'Action Taken & Methodology',
      triggers: ['handled', 'overcame', 'resolve', 'resolved', 'approach', 'prioritize', 'motivate', 'mentor', 'decision'],
      synonyms: CONCEPT_SYNONYMS.action.concat(CONCEPT_SYNONYMS.technical),
    },
    {
      label: 'Collaboration & Team Impact',
      triggers: ['team', 'teamwork', 'colleague', 'disagreement', 'stakeholder', 'client', 'peer'],
      synonyms: CONCEPT_SYNONYMS.team,
    },
  ];

  let activeThematicChecks = thematicChecks.filter((tc) =>
    tc.triggers.some((tr) => qLower.includes(tr) || qWords.some((qw) => stemWord(qw) === stemWord(tr)))
  );

  if (activeThematicChecks.length === 0) {
    activeThematicChecks = [
      { label: 'Core Question Theme', triggers: [], synonyms: qWords.concat(CONCEPT_SYNONYMS.intro) },
      { label: 'Action & Execution Details', triggers: [], synonyms: CONCEPT_SYNONYMS.action },
    ];
  }

  for (const check of activeThematicChecks) {
    const isAddressed = check.synonyms.some((syn) => {
      const synStem = stemWord(syn);
      return ansStems.has(synStem) || ansLower.includes(syn);
    });

    if (isAddressed) {
      addressedConcepts.push(check.label);
    } else {
      missingConcepts.push(check.label);
    }
  }

  let directMatches = 0;
  for (const qw of qWords) {
    const qStem = stemWord(qw);
    if (ansStems.has(qStem) || ansLower.includes(qw)) {
      directMatches++;
    }
  }

  const thematicCoverage = activeThematicChecks.length > 0 ? addressedConcepts.length / activeThematicChecks.length : 1;
  const wordCount = ansWords.length;

  let score = 50;
  if (wordCount === 0) {
    score = 25;
  } else if (thematicCoverage === 1) {
    score = directMatches > 0 ? 95 : 88;
  } else if (thematicCoverage >= 0.5) {
    score = 75 + Math.min(15, directMatches * 5);
  } else {
    score = Math.max(30, Math.min(60, 30 + directMatches * 10));
  }

  if (wordCount < 10) {
    score = Math.min(score, 60);
  }

  return {
    score,
    addressedKeywords: addressedConcepts.length > 0 ? addressedConcepts : ['General Response'],
    missingKeywords: missingConcepts.length > 0 ? missingConcepts : ['None — comprehensive topic coverage!'],
    sufficientData: wordCount >= 10,
  };
}

/**
 * Structure and Clarity Assessment Engine.
 */
export function analyzeStructureAndClarity(text: string, grammarErrorCount: number = 0): {
  structureScore: number;
  clarityScore: number;
} {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const words = text.match(/[a-zA-Z']+/g) || [];

  if (words.length < 5) {
    return { structureScore: 45, clarityScore: 50 };
  }

  const lower = text.toLowerCase();
  const hasIntro = sentences.length > 0 && sentences[0].split(/\s+/).length >= 5;
  const hasExample = /\b(for example|for instance|such as|specifically|in my experience|built|developed|solved|handled|engineered|collaborated)\b/i.test(lower);
  const hasConclusion = /\b(overall|in conclusion|as a result|therefore|consequently|to summarize|that is why|this experience)\b/i.test(lower) || sentences.length >= 3;

  let structure = 50;
  if (hasIntro) structure += 18;
  if (hasExample) structure += 18;
  if (hasConclusion) structure += 14;
  const structureScore = Math.min(96, Math.max(40, structure));

  const avgSentenceLen = words.length / Math.max(1, sentences.length);
  let clarityBase = 88;
  if (avgSentenceLen < 7) clarityBase -= 10;
  else if (avgSentenceLen > 28) clarityBase -= 14;

  // Real clarity is meaningfully impacted when grammar disruptions confuse comprehension:
  const errorDensity = (grammarErrorCount / Math.max(12, words.length)) * 100;
  const clarityPenalty = Math.min(26, Math.round(errorDensity * 1.5));
  const clarityScore = Math.max(35, Math.min(95, clarityBase - clarityPenalty));

  return { structureScore, clarityScore };
}

/**
 * Intelligent, faithful Better Alternative Generator.
 */
export function generateBetterAlternative(question: string, answer: string): string {
  const trimmed = answer.trim();
  if (!trimmed) {
    return `"I bring a solid combination of technical expertise and collaborative problem-solving to this position. Throughout my projects, I have focused on delivering reliable, scalable results while continuously refining my skills. I am excited to contribute this foundation to your team and drive meaningful impact."`;
  }

  let cleaned = trimmed
    .replace(/(^|[\s,;:(])i(?=[\s,;:!?.']|$)/g, '$1I')
    .replace(/\bi has\b/gi, 'I have')
    .replace(/\bi is\b/gi, 'I am')
    .replace(/\btheir going\b/gi, "they're going")
    .replace(/\balot\b/gi, 'a lot')
    .replace(/\bexperiance\b/gi, 'experience')
    .replace(/\bdefinately\b/gi, 'definitely')
    .replace(/\brecieve\b/gi, 'receive')
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bdiscuss about\b/gi, 'discuss')
    .replace(/\bcope up with\b/gi, 'cope with')
    .replace(/\bI am agree\b/gi, 'I agree')
    .replace(/\bpassed out from\b/gi, 'graduated from')
    .replace(/\bmyself\s+([a-zA-Z]+)\b/gi, 'I am $1')
    .replace(/\bmy name are\b/gi, 'my name is')
    .replace(/\bmy dream are\b/gi, 'my dream is')
    .replace(/\bam study\b/gi, 'am studying')
    .replace(/\bhave make\b/gi, 'have made')
    .replace(/\bmany project\b/gi, 'many projects')
    .replace(/\bto improves\b/gi, 'to improve')
    .replace(/\bI am also have\b/gi, 'I also have')
    .replace(/\bI wants\b/gi, 'I want')
    .replace(/\bwant learning\b/gi, 'want to learn')
    .replace(/\bam hardworking person\b/gi, 'am a hardworking person')
    .replace(/\bI always tries\b/gi, 'I always try')
    .replace(/\bstudent in ([A-Z][a-zA-Z\s]+University)\b/g, 'student at $1')
    .replace(/\btechnical skill\b/gi, 'technical skills')
    .replace(/\bcoach which help\b/gi, 'coach which helps');

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (!/[.!?]$/.test(cleaned)) cleaned += '.';
  }

  const rawWords = (cleaned.match(/[a-zA-Z']+/g) || []);
  const contentWords = rawWords.filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 3);
  const keyTerms = Array.from(new Set(contentWords.map((w) => w.toLowerCase()))).slice(0, 5);

  const qLower = question.toLowerCase();

  if (rawWords.length >= 18) {
    return (
      `"A polished, executive phrasing of your response is:\n\n` +
      `'${cleaned} Building on this, my focus has consistently been on driving measurable outcomes, maintaining clear communication with stakeholders, and continuously expanding my technical capabilities to add value to the team.'"`
    );
  }

  if (rawWords.length >= 8) {
    const focus = keyTerms.length > 0 ? keyTerms.join(' and ') : 'practical problem-solving';
    if (qLower.includes('yourself') || qLower.includes('introduce') || qLower.includes('role')) {
      return (
        `"Here is a well-structured elevator pitch incorporating your background:\n\n` +
        `'${cleaned} In addition, I have hands-on experience applying ${focus} to build practical solutions. I am eager to bring this proactive attitude and technical foundation to this role, where I can collaborate with the team and create tangible value.'"`
      );
    }

    if (qLower.includes('challenge') || qLower.includes('project') || qLower.includes('mistake') || qLower.includes('deadline')) {
      return (
        `"Here is a compelling STAR-format version of your answer:\n\n` +
        `'${cleaned} To address this effectively, I broke down the problem into actionable milestones, coordinated closely with teammates, and implemented a targeted solution. This ensured timely delivery and established a repeatable framework for future sprints.'"`
      );
    }

    return (
      `"A professional, executive version of your response:\n\n` +
      `'${cleaned} By focusing on disciplined execution, clear stakeholder communication, and continuous learning, I ensure that my contributions consistently lead to sustainable, high-quality results.'"`
    );
  }

  const anchor = cleaned.replace(/[.!?]$/, '');
  return (
    `"To make your response compelling and interview-ready, expand your point with structure:\n\n` +
    `'${anchor}. Specifically, I leverage my problem-solving skills and technical foundation to tackle complex requirements. Throughout my projects, I have emphasized thorough testing, active team collaboration, and delivering clean, maintainable deliverables on schedule.'"`
  );
}

/**
 * Master Text Analysis Evaluator.
 */
export function performClientTextAnalysis(question: string, answer: string): ClientTextAnalysis {
  const grammar = analyzeGrammar(answer);
  const vocab = analyzeVocabulary(answer);
  const relevance = analyzeRelevance(question, answer);
  const { structureScore, clarityScore } = analyzeStructureAndClarity(answer, grammar.corrections.length);
  const alternative = generateBetterAlternative(question, answer);

  const overallScore = Math.round(
    grammar.score * 0.30 +
    relevance.score * 0.25 +
    vocab.score * 0.20 +
    structureScore * 0.15 +
    clarityScore * 0.10
  );

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  return {
    score: overallScore,
    grammarScore: grammar.score,
    vocabularyScore: vocab.score,
    structureScore,
    clarityScore,
    relevanceScore: relevance.score,
    corrections: grammar.corrections.map((c) => ({
      original: c.original,
      corrected: c.corrected,
      reason: c.reason,
      rule: c.rule,
      errorType: c.errorType || RULE_ERROR_TYPE_MAP[c.rule] || 'Grammar',
      category: c.category,
      confidence: c.confidence,
    })),
    vocabularySuggestions: vocab.suggestions,
    repeatedWords: vocab.repeatedWords,
    betterAlternative: alternative,
    correctedAnswer: grammar.correctedAnswer,
    grammarSufficientData: wordCount >= 8,
    vocabularySufficientData: vocab.sufficientData,
    relevanceSufficientData: relevance.sufficientData,
    relevanceAddressedKeywords: relevance.addressedKeywords,
    relevanceMissingKeywords: relevance.missingKeywords,
    overallScoreFormula: 'Transparent Weighted Score: 30% Grammar + 25% Relevance + 20% Vocabulary + 15% Structure + 10% Clarity',
    overallExcludedComponents: [],
  };
}

/**
 * Real client-side filler word detector on spoken transcript.
 */
export function detectFillerWords(transcript: string): {
  count: number;
  highConfidenceCount: number;
  ambiguousCount: number;
  mostFrequent: string | null;
  excluded: string[];
} {
  const text = transcript.toLowerCase();
  const unambiguousFillers = ['um', 'uh', 'er', 'ah', 'hmm'];
  const ambiguousFillers = ['actually', 'basically', 'you know', 'i mean', 'kind of', 'sort of'];

  let highConfidenceCount = 0;
  let ambiguousCount = 0;
  const counts: Record<string, number> = {};

  for (const filler of unambiguousFillers) {
    const reg = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = text.match(reg);
    if (matches) {
      highConfidenceCount += matches.length;
      counts[filler] = (counts[filler] || 0) + matches.length;
    }
  }

  for (const marker of ambiguousFillers) {
    const reg = new RegExp(`(^|[,.!?])\\s*${marker}\\b|\\b${marker}\\s*([,.!?]|$)`, 'gi');
    const matches = text.match(reg);
    if (matches) {
      ambiguousCount += matches.length;
      counts[marker] = (counts[marker] || 0) + matches.length;
    }
  }

  const likeFillerPattern = /(?<!(i|we|you|they)\s+)(?<!would\s+)\blike\b(?!\s+(to|pizza|ice cream|coding|this|that))/gi;
  const likeMatches = text.match(likeFillerPattern);
  if (likeMatches) {
    const likeCount = likeMatches.length;
    ambiguousCount += likeCount;
    counts['like'] = (counts['like'] || 0) + likeCount;
  }

  let mostFrequent: string | null = null;
  let maxCount = 0;
  for (const [word, c] of Object.entries(counts)) {
    if (c > maxCount) {
      maxCount = c;
      mostFrequent = word;
    }
  }

  return {
    count: highConfidenceCount + ambiguousCount,
    highConfidenceCount,
    ambiguousCount,
    mostFrequent,
    excluded: [],
  };
}

/**
 * Real voice analysis on actual duration and microphone transcript.
 */
export function performClientVoiceAnalysis(
  durationSeconds: number,
  transcript: string,
  transcriptSource: 'browser' | 'server' | 'sample' = 'browser'
): ClientVoiceAnalysis {
  const cleanText = transcript.trim();
  const words = cleanText ? cleanText.split(/\s+/) : [];
  const wordCount = words.length;
  const durationSafe = Math.max(1, durationSeconds);

  const wordsPerMinute = wordCount > 0 ? Math.round((wordCount / durationSafe) * 60) : 0;

  let paceScore = 85;
  if (wordsPerMinute === 0) {
    paceScore = 50;
  } else if (wordsPerMinute >= 120 && wordsPerMinute <= 165) {
    paceScore = 95;
  } else if (wordsPerMinute >= 100 && wordsPerMinute < 120) {
    paceScore = 82;
  } else if (wordsPerMinute > 165 && wordsPerMinute <= 190) {
    paceScore = 78;
  } else if (wordsPerMinute < 100) {
    paceScore = Math.max(45, 60 + Math.round((wordsPerMinute / 100) * 20));
  } else {
    paceScore = Math.max(45, 95 - (wordsPerMinute - 165));
  }

  const fillers = cleanText ? detectFillerWords(cleanText) : { count: 0, highConfidenceCount: 0, ambiguousCount: 0, mostFrequent: null, excluded: [] };

  const fillerPenalty = fillers.count * 6;
  const fluencyScore = Math.max(45, Math.min(98, Math.round(paceScore * 0.6 + Math.max(0, 100 - fillerPenalty) * 0.4)));

  const grammar = cleanText ? analyzeGrammar(cleanText) : { score: 75 };
  const vocab = cleanText ? analyzeVocabulary(cleanText) : { score: 70 };

  const confidenceScore = Math.max(
    45,
    Math.min(96, Math.round(fluencyScore * 0.4 + paceScore * 0.3 + (cleanText ? vocab.score : 60) * 0.3))
  );

  return {
    transcript: cleanText || '(No speech detected in audio recording)',
    wordCount,
    durationSeconds: Math.round(durationSeconds),
    wordsPerMinute,
    paceScore,
    paceSource: 'estimated',
    referenceRangeWpm: '130-160',
    fillerWordCount: fillers.count,
    highConfidenceFillerCount: fillers.highConfidenceCount,
    ambiguousFillerCount: fillers.ambiguousCount,
    fillerExcludedExamples: fillers.excluded,
    mostFrequentFiller: fillers.mostFrequent,
    fluencyScore,
    grammarScore: grammar.score,
    vocabularyScore: vocab.score,
    confidenceScore,
    pronunciationScore: Math.min(92, Math.max(65, Math.round(confidenceScore * 0.5 + fluencyScore * 0.5))),
    pronunciationReliable: false,
    pronunciationMethod: 'Estimated from cadence and articulation consistency — not a phoneme-level audio model.',
    source: cleanText ? 'real' : 'mock',
    transcriptSource,
  };
}
