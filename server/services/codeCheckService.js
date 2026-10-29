const vm = require('node:vm');

const secretPatterns = [
  { name: 'Private key', severity: 'critical', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { name: 'AWS access key', severity: 'critical', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub access token', severity: 'critical', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: 'OpenRouter/OpenAI key', severity: 'critical', pattern: /\bsk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{24,}\b/ },
  { name: 'JWT-like token', severity: 'warning', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/ },
  { name: 'Hard-coded credential', severity: 'warning', pattern: /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*(['"])(?!xxx|changeme|example|placeholder)[^'"\r\n]{16,}\1/i },
];

const scanSecrets = (code) => {
  const lines = String(code || '').split(/\r?\n/);
  const findings = [];
  for (let index = 0; index < lines.length && findings.length < 20; index += 1) {
    for (const detector of secretPatterns) {
      if (detector.pattern.test(lines[index])) {
        findings.push({
          line: index + 1,
          name: detector.name,
          severity: detector.severity,
          message: `Possible ${detector.name.toLowerCase()} found. Remove it from source and rotate it if it is real.`,
        });
        break;
      }
    }
  }

  return findings;
};

const runCodeChecks = (code, language = '') => {
  const findings = scanSecrets(code);
  const secretScan = { status: findings.length ? 'issues_found' : 'passed', findings };
  let syntax = { status: 'not_applicable', findings: [], detail: 'JavaScript syntax parsing is available for plain JavaScript only.' };
  if (['javascript', 'js', 'node'].includes(String(language).toLowerCase()) && !/^\s*(?:import|export)\b/m.test(code)) {
    try {
      // Compilation parses source without executing it.
      new vm.Script(String(code || ''), { filename: 'uploaded-review.js' });
      syntax = { status: 'passed', findings: [], detail: 'JavaScript parsed successfully. The code was not executed.' };
    } catch (error) {
      syntax = { status: 'failed', findings: [{ line: Number(error.lineNumber) || null, message: error.message }], detail: 'JavaScript syntax parsing failed. The code was not executed.' };
    }
  }

  return {
    secretScan,
    syntax,
    ciNote: 'Pasted snippets are never executed. Run lint, tests, and dependency audits in a configured GitHub Actions workflow from the pull request review panel.',
  };
};

module.exports = { runCodeChecks, scanSecrets };
