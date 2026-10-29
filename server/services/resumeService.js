const pdf = require('pdf-parse');

/**
 * Parse a PDF resume buffer and extract plain text.
 * @param {Buffer} buffer - The PDF file buffer.
 * @returns {object} { text, numPages, info }
 */
const parseResume = async (buffer) => {
  const data = await pdf(buffer);

  return {
    text: data.text,
    numPages: data.numpages,
    info: data.info,
  };
};

/**
 * Extract a list of technical skills from raw resume text using keyword matching.
 * This serves as a quick client-side extraction; the OpenAI service performs
 * a more thorough NLP-based extraction.
 * @param {string} text - Plain text extracted from the resume.
 * @returns {string[]} Array of identified skills.
 */
const extractSkills = (text) => {
  const skillKeywords = [
    // Languages
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
    'dart', 'elixir', 'haskell', 'lua', 'objective-c', 'shell', 'bash',
    // Frontend
    'react', 'angular', 'vue', 'vue.js', 'next.js', 'nuxt.js', 'svelte',
    'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'jquery',
    'redux', 'mobx', 'webpack', 'vite', 'gatsby',
    // Backend
    'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
    'asp.net', 'rails', 'ruby on rails', 'laravel', 'nestjs', 'graphql',
    'rest', 'restful', 'grpc', 'microservices',
    // Databases
    'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch',
    'cassandra', 'dynamodb', 'firebase', 'supabase', 'oracle', 'sql server',
    'neo4j', 'couchdb',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
    'terraform', 'ansible', 'jenkins', 'ci/cd', 'github actions', 'gitlab ci',
    'circleci', 'travis ci', 'nginx', 'apache', 'linux', 'serverless',
    // Data & ML
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras',
    'scikit-learn', 'pandas', 'numpy', 'data science', 'nlp',
    'computer vision', 'ai', 'artificial intelligence', 'llm',
    // Tools
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'figma',
    'postman', 'swagger', 'agile', 'scrum', 'kanban',
    // Testing
    'jest', 'mocha', 'cypress', 'selenium', 'pytest', 'junit',
    'unit testing', 'integration testing', 'tdd', 'bdd',
    // Mobile
    'react native', 'flutter', 'android', 'ios', 'xamarin', 'ionic',
    // Other
    'blockchain', 'web3', 'solidity', 'ethereum',
    'rabbitmq', 'kafka', 'websocket', 'socket.io',
  ];

  const normalizedText = text.toLowerCase();
  const foundSkills = [];

  for (const skill of skillKeywords) {
    // Use word-boundary matching to avoid false positives
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalizedText)) {
      // Capitalize nicely
      foundSkills.push(
        skill
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      );
    }
  }

  // Deduplicate
  return [...new Set(foundSkills)];
};

/**
 * Clean and normalize extracted resume text.
 * @param {string} text - Raw extracted text.
 * @returns {string} Cleaned text.
 */
const cleanResumeText = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
};

module.exports = {
  parseResume,
  extractSkills,
  cleanResumeText,
};
