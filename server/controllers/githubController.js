const User = require('../models/User');
const githubService = require('../services/githubService');
const openaiService = require('../services/openaiService');
const codeCheckService = require('../services/codeCheckService');
const { formatResponse, asyncHandler } = require('../utils/helpers');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;
const oauthStates = new Map();

const validRepoCoordinates = (owner, repo) => typeof owner === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(owner) && typeof repo === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(repo);

const addedDiffLines = (patch = '') => {
  const added = [];
  let newLine = 0;
  for (const line of String(patch).split('\n')) {
    const hunk = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) { newLine = Number(hunk[1]); continue; }
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('\\')) continue;
    if (line.startsWith('+')) { added.push({ line: newLine, text: line.slice(1) }); newLine += 1; }
    else if (line.startsWith(' ')) newLine += 1;
  }
  return added;
};

const getConnectedToken = async (userId) => {
  const user = await User.findById(userId).select('+githubAccessToken githubUsername');
  if (!user?.githubAccessToken) throw Object.assign(new Error('Connect GitHub before reviewing pull requests.'), { status: 400 });
  return user;
};

const listPullRequests = asyncHandler(async (req, res) => {
  const { owner, repo } = req.query;
  if (!validRepoCoordinates(owner, repo)) return res.status(400).json(formatResponse(false, null, 'Choose a valid GitHub repository.'));
  const user = await getConnectedToken(req.user._id);
  const pullRequests = await githubService.listPullRequests(user.githubAccessToken, owner, repo);
  res.json(formatResponse(true, pullRequests));
});

const listRepositoryBranches = asyncHandler(async (req, res) => {
  const { owner, repo } = req.query;
  if (!validRepoCoordinates(owner, repo)) return res.status(400).json(formatResponse(false, null, 'Choose a valid GitHub repository.'));
  const user = await getConnectedToken(req.user._id);
  const branches = await githubService.listBranches(user.githubAccessToken, owner, repo);
  res.json(formatResponse(true, branches));
});

const createPullRequest = asyncHandler(async (req, res) => {
  const { owner, repo, title, head, base, body, draft } = req.body;
  const validBranch = (value) => typeof value === 'string' && value.length <= 255 && /^[A-Za-z0-9._/-]+$/.test(value) && !value.includes('..') && !value.startsWith('/') && !value.endsWith('/');
  if (!validRepoCoordinates(owner, repo) || typeof title !== 'string' || !title.trim() || title.length > 256 || !validBranch(head) || !validBranch(base) || head === base || (body !== undefined && (typeof body !== 'string' || body.length > 10000))) {
    return res.status(400).json(formatResponse(false, null, 'Add a title and choose different, valid source and target branches.'));
  }
  const user = await getConnectedToken(req.user._id);
  const branches = await githubService.listBranches(user.githubAccessToken, owner, repo);
  const available = new Set(branches.map((branch) => branch.name));
  if (!available.has(head) || !available.has(base)) return res.status(400).json(formatResponse(false, null, 'One of those branches is no longer available. Refresh the branch list and try again.'));
  const pullRequest = await githubService.createPullRequest(user.githubAccessToken, owner, repo, { title: title.trim(), head, base, body: body || '', draft: Boolean(draft) });
  res.status(201).json(formatResponse(true, pullRequest, 'Pull request created'));
});

const createPullRequestFromFiles = asyncHandler(async (req, res) => {
  const { owner, repo, title, branch, base, body, draft } = req.body;
  const files = Array.isArray(req.body.files) ? req.body.files : [];
  const validBranch = (value) => typeof value === 'string' && value.length <= 100 && /^[A-Za-z0-9._/-]+$/.test(value) && !value.includes('..') && !value.startsWith('/') && !value.endsWith('/') && !value.endsWith('.lock');
  if (!validRepoCoordinates(owner, repo) || typeof title !== 'string' || !title.trim() || title.length > 256 || !validBranch(branch) || !validBranch(base) || branch === base || typeof body !== 'string' || body.length > 10000 || files.length < 1 || files.length > 50) {
    return res.status(400).json(formatResponse(false, null, 'Add a title, a new branch name, a target branch, and 1–50 files.'));
  }
  let totalBytes = 0;
  const paths = new Set();
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string' || !file.path.trim() || !['base64', 'utf-8'].includes(file.encoding || 'utf-8')) return res.status(400).json(formatResponse(false, null, 'Each file needs a valid path and text or base64 content.'));
    file.path = file.path.replace(/\\/g, '/');
    if (file.path.startsWith('/') || /^[A-Za-z]:/.test(file.path) || file.path.split('/').some((part) => !part || part === '.' || part === '..') || paths.has(file.path)) return res.status(400).json(formatResponse(false, null, `Invalid or duplicate file path: ${file.path}`));
    paths.add(file.path);
    if (file.encoding === 'base64' && !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) return res.status(400).json(formatResponse(false, null, `Invalid base64 content for ${file.path}.`));
    totalBytes += file.encoding === 'base64' ? Buffer.from(file.content, 'base64').length : Buffer.byteLength(file.content, 'utf8');
  }
  if (totalBytes > 8 * 1024 * 1024) return res.status(413).json(formatResponse(false, null, 'The selected files exceed the 8 MB total upload limit.'));
  const user = await getConnectedToken(req.user._id);
  const branches = await githubService.listBranches(user.githubAccessToken, owner, repo);
  const available = new Set(branches.map((item) => item.name));
  if (!available.has(base)) return res.status(400).json(formatResponse(false, null, 'The target branch is no longer available. Refresh and try again.'));
  if (available.has(branch)) return res.status(409).json(formatResponse(false, null, 'That source branch already exists. Choose a new branch name.'));
  const pullRequest = await githubService.createPullRequestFromFiles(user.githubAccessToken, owner, repo, {
    title: title.trim(), branch, base, body, draft: Boolean(draft), files,
    message: `Changes for: ${title.trim()}`,
  });
  res.status(201).json(formatResponse(true, pullRequest, 'Branch created and pull request opened'));
});

const reviewPullRequest = asyncHandler(async (req, res) => {
  const { owner, repo } = req.body;
  const pullNumber = Number(req.body.pullNumber);
  if (!validRepoCoordinates(owner, repo) || !Number.isInteger(pullNumber) || pullNumber < 1) return res.status(400).json(formatResponse(false, null, 'Choose a valid repository and pull request.'));
  const user = await getConnectedToken(req.user._id);
  const context = await githubService.getPullRequestReviewContext(user.githubAccessToken, owner, repo, pullNumber, { includeRelatedFiles: true });
  const reviewRules = req.user.reviewRules?.toObject?.() || req.user.reviewRules || {};
  const reviewableFiles = context.files.filter((file) => file.patch).slice(0, 35);
  const aiResult = reviewableFiles.length ? await openaiService.reviewPullRequestDiff(reviewableFiles, reviewRules, context.relatedFiles) : { summary: 'GitHub did not provide text diffs for these changes.', changeSummary: { overview: 'GitHub did not provide readable text diffs for these changes.', changedAreas: [], affectedAreas: [], reviewerTests: ['Open the changed files in GitHub and verify the changes manually.'] }, issues: [] };
  const addedByFile = new Map(context.files.map((file) => [file.filename, new Map(addedDiffLines(file.patch).map((item) => [item.line, item.text]))]));
  const changedLines = new Map([...addedByFile].map(([path, lines]) => [path, new Set(lines.keys())]));
  const issues = (Array.isArray(aiResult.issues) ? aiResult.issues : []).slice(0, 40).map((issue) => ({
    path: String(issue.path || ''),
    line: Number(issue.line),
    message: String(issue.message || '').slice(0, 800),
    suggestion: String(issue.suggestion || '').slice(0, 1200),
    severity: ['critical', 'warning', 'info', 'suggestion'].includes(issue.severity) ? issue.severity : 'info',
    confidence: Math.max(0, Math.min(100, Number(issue.confidence) || 0)),
    impact: ['critical', 'high', 'medium', 'low'].includes(issue.impact) ? issue.impact : 'medium',
    priority: ['P0', 'P1', 'P2', 'P3'].includes(issue.priority) ? issue.priority : 'P2',
    riskScore: Math.max(0, Math.min(100, Number(issue.riskScore) || 0)),
    patchStartLine: Number.isInteger(Number(issue.patchStartLine)) ? Number(issue.patchStartLine) : null,
    patchEndLine: Number.isInteger(Number(issue.patchEndLine)) ? Number(issue.patchEndLine) : null,
    patchReplacement: typeof issue.patchReplacement === 'string' ? issue.patchReplacement.slice(0, 8000) : null,
  })).filter((issue) => issue.message && changedLines.get(issue.path)?.has(issue.line)).sort((a, b) => b.riskScore - a.riskScore);
  for (const issue of issues) {
    const fileLines = addedByFile.get(issue.path);
    const hasPatch = issue.patchReplacement !== null && issue.patchStartLine >= 1 && issue.patchEndLine >= issue.patchStartLine && issue.patchEndLine - issue.patchStartLine < 30 && issue.line >= issue.patchStartLine && issue.line <= issue.patchEndLine && Array.from({ length: issue.patchEndLine - issue.patchStartLine + 1 }, (_, index) => issue.patchStartLine + index).every((line) => fileLines?.has(line));
    if (hasPatch) issue.patchOriginalLines = Array.from({ length: issue.patchEndLine - issue.patchStartLine + 1 }, (_, index) => fileLines.get(issue.patchStartLine + index));
    else { issue.patchStartLine = null; issue.patchEndLine = null; issue.patchReplacement = null; }
  }

  const secretFindings = [];
  for (const file of context.files) {
    const added = addedDiffLines(file.patch);
    for (const finding of codeCheckService.scanSecrets(added.map((item) => item.text).join('\n'))) {
      const addedLine = added[finding.line - 1];
      if (!addedLine) continue;
      secretFindings.push({
        path: file.filename,
        line: addedLine.line,
        message: finding.message,
        suggestion: 'Remove the credential, rotate it if real, and load it from a secret manager or environment variable.',
        severity: finding.severity === 'critical' ? 'critical' : 'warning',
        confidence: 98,
        impact: finding.severity,
        priority: finding.severity === 'critical' ? 'P0' : 'P1',
        riskScore: finding.severity === 'critical' ? 99 : 78,
        source: 'Secret scan',
      });
    }
  }
  const allIssues = [...secretFindings, ...issues].filter((issue, index, list) => list.findIndex((candidate) => candidate.path === issue.path && candidate.line === issue.line && candidate.message === issue.message) === index).sort((a, b) => b.riskScore - a.riskScore);
  res.json(formatResponse(true, {
    owner, repo, pullNumber,
    pull: context.pull,
    summary: String(aiResult.summary || '').slice(0, 2000),
    changeSummary: {
      overview: String(aiResult.changeSummary?.overview || aiResult.summary || 'Review the changed files and their impact.').slice(0, 1200),
      changedAreas: (Array.isArray(aiResult.changeSummary?.changedAreas) ? aiResult.changeSummary.changedAreas : []).slice(0, 8).map((item) => String(item).slice(0, 400)),
      affectedAreas: (Array.isArray(aiResult.changeSummary?.affectedAreas) ? aiResult.changeSummary.affectedAreas : []).slice(0, 8).map((item) => String(item).slice(0, 400)),
      reviewerTests: (Array.isArray(aiResult.changeSummary?.reviewerTests) ? aiResult.changeSummary.reviewerTests : []).slice(0, 10).map((item) => String(item).slice(0, 400)),
    },
    issues: allIssues,
    checks: context.checks,
    workflows: context.workflows,
    security: context.security,
    filesReviewed: reviewableFiles.length,
    filesSkipped: context.files.length - reviewableFiles.length,
    relatedFilesReviewed: context.relatedFiles.length,
    changedLines: Object.fromEntries([...changedLines].map(([path, lines]) => [path, [...lines]])),
  }, 'Pull request reviewed'));
});

const getPullRequestContext = asyncHandler(async (req, res) => {
  const { owner, repo } = req.query;
  const pullNumber = Number(req.query.pullNumber);
  if (!validRepoCoordinates(owner, repo) || !Number.isInteger(pullNumber) || pullNumber < 1) return res.status(400).json(formatResponse(false, null, 'Choose a valid repository and pull request.'));
  const user = await getConnectedToken(req.user._id);
  const context = await githubService.getPullRequestReviewContext(user.githubAccessToken, owner, repo, pullNumber);
  res.json(formatResponse(true, { pull: context.pull, checks: context.checks, workflows: context.workflows, security: context.security }));
});

const runPullRequestWorkflow = asyncHandler(async (req, res) => {
  const { owner, repo } = req.body;
  const workflowId = String(req.body.workflowId || '');
  const pullNumber = Number(req.body.pullNumber);
  if (!validRepoCoordinates(owner, repo) || !/^\d+$/.test(workflowId) || !Number.isInteger(pullNumber) || pullNumber < 1) return res.status(400).json(formatResponse(false, null, 'Choose a valid workflow and pull request.'));
  const user = await getConnectedToken(req.user._id);
  const context = await githubService.getPullRequestReviewContext(user.githubAccessToken, owner, repo, pullNumber);
  const workflow = context.workflows.find((item) => item.id === Number(workflowId));
  if (!workflow) return res.status(404).json(formatResponse(false, null, 'That active workflow was not found in this repository.'));
  if (context.pull.headRepo !== `${owner}/${repo}`) return res.status(400).json(formatResponse(false, null, 'GitHub Actions can only be dispatched here for pull requests from a branch in this repository.'));
  await githubService.dispatchWorkflow(user.githubAccessToken, owner, repo, workflow.id, context.pull.headRef);
  res.json(formatResponse(true, { workflow: workflow.name, ref: context.pull.headRef }, 'Workflow dispatch requested'));
});

const applyPullRequestFix = asyncHandler(async (req, res) => {
  const { owner, repo, headSha, fix } = req.body;
  const pullNumber = Number(req.body.pullNumber);
  if (!validRepoCoordinates(owner, repo) || !Number.isInteger(pullNumber) || pullNumber < 1 || !/^[a-f0-9]{40}$/i.test(headSha || '') || !fix || typeof fix.path !== 'string' || !Number.isInteger(fix.startLine) || !Number.isInteger(fix.endLine) || typeof fix.replacement !== 'string' || fix.replacement.length > 8000 || fix.replacement.includes('\0')) {
    return res.status(400).json(formatResponse(false, null, 'This fix is incomplete. Run the pull request review again and inspect the suggested patch.'));
  }
  const user = await getConnectedToken(req.user._id);
  const context = await githubService.getPullRequestReviewContext(user.githubAccessToken, owner, repo, pullNumber);
  if (context.pull.headSha !== headSha) return res.status(409).json(formatResponse(false, null, 'The pull request changed since this suggestion. Review the latest version before applying a fix.'));
  if (context.pull.headRepo !== `${owner}/${repo}`) return res.status(400).json(formatResponse(false, null, 'Applying fixes is currently supported for branches in this repository, not fork branches.'));
  const file = context.files.find((item) => item.filename === fix.path);
  if (!file?.patch || fix.startLine < 1 || fix.endLine < fix.startLine || fix.endLine - fix.startLine >= 30) return res.status(400).json(formatResponse(false, null, 'The suggested lines are not part of this pull request. Review it again and retry.'));
  const added = new Map(addedDiffLines(file.patch).map((item) => [item.line, item.text]));
  const range = Array.from({ length: fix.endLine - fix.startLine + 1 }, (_, index) => fix.startLine + index);
  if (!range.every((line) => added.has(line))) return res.status(400).json(formatResponse(false, null, 'The fix includes lines that were not added by this pull request.'));
  const source = await githubService.getFileAtRef(user.githubAccessToken, owner, repo, fix.path, headSha);
  const lines = source.split(/\r?\n/);
  if (fix.endLine > lines.length || !range.every((line) => lines[line - 1] === added.get(line))) return res.status(409).json(formatResponse(false, null, 'The suggested code no longer matches this file. Review the latest pull request before applying it.'));
  const replacement = fix.replacement ? fix.replacement.split('\n') : [];
  lines.splice(fix.startLine - 1, fix.endLine - fix.startLine + 1, ...replacement);
  const commit = await githubService.pushFiles(user.githubAccessToken, owner, repo, context.pull.headRef, [{ path: fix.path, content: lines.join('\n'), encoding: 'utf-8' }], `Apply AI review suggestion to ${fix.path}`);
  res.json(formatResponse(true, { path: fix.path, commitSha: commit.commitSha, filesCommitted: commit.filesCommitted }, 'Fix committed to the pull request branch'));
});

const publishPullRequestReview = asyncHandler(async (req, res) => {
  const { owner, repo } = req.body;
  const pullNumber = Number(req.body.pullNumber);
  const headSha = String(req.body.headSha || '');
  const body = String(req.body.body || '').slice(0, 5000);
  if (!validRepoCoordinates(owner, repo) || !Number.isInteger(pullNumber) || pullNumber < 1 || !/^[a-f0-9]{40}$/i.test(headSha)) return res.status(400).json(formatResponse(false, null, 'Review context is incomplete. Review the pull request again.'));
  const user = await getConnectedToken(req.user._id);
  const context = await githubService.getPullRequestReviewContext(user.githubAccessToken, owner, repo, pullNumber);
  if (context.pull.headSha !== headSha) return res.status(409).json(formatResponse(false, null, 'The pull request changed after this review. Run the review again before publishing.'));

  const changedLines = new Map(context.files.map((file) => [file.filename, new Set(addedDiffLines(file.patch).map((item) => item.line))]));
  const comments = (Array.isArray(req.body.comments) ? req.body.comments : []).slice(0, 20).filter((comment) => {
    const line = Number(comment.line);
    return typeof comment.path === 'string' && changedLines.get(comment.path)?.has(line) && typeof comment.body === 'string' && comment.body.trim();
  }).map((comment) => ({ path: comment.path.slice(0, 500), line: Number(comment.line), side: 'RIGHT', body: String(comment.body).trim().slice(0, 1200) }));
  const result = await githubService.publishPullRequestReview(user.githubAccessToken, owner, repo, pullNumber, body || 'Merge AI review findings', comments);
  res.json(formatResponse(true, result, 'Review published to GitHub'));
});

const closePullRequest = asyncHandler(async (req, res) => {
  const { owner, repo } = req.body;
  const pullNumber = Number(req.body.pullNumber);
  const headSha = String(req.body.headSha || '');
  if (!validRepoCoordinates(owner, repo) || !Number.isInteger(pullNumber) || pullNumber < 1 || !/^[a-f0-9]{40}$/i.test(headSha)) {
    return res.status(400).json(formatResponse(false, null, 'Choose a pull request and refresh it before closing.'));
  }
  const user = await getConnectedToken(req.user._id);
  const current = await githubService.getPullRequestReviewContext(user.githubAccessToken, owner, repo, pullNumber);
  if (current.pull.headSha !== headSha) return res.status(409).json(formatResponse(false, null, 'This pull request changed. Refresh the list before closing it.'));
  const result = await githubService.closePullRequest(user.githubAccessToken, owner, repo, pullNumber, headSha);
  res.json(formatResponse(true, result, 'Pull request closed'));
});

const deletePullRequestBranch = asyncHandler(async (req, res) => {
  const { owner, repo } = req.body;
  const pullNumber = Number(req.body.pullNumber);
  const headSha = String(req.body.headSha || '');
  if (!validRepoCoordinates(owner, repo) || !Number.isInteger(pullNumber) || pullNumber < 1 || !/^[a-f0-9]{40}$/i.test(headSha)) {
    return res.status(400).json(formatResponse(false, null, 'Refresh a closed pull request before deleting its source branch.'));
  }
  const user = await getConnectedToken(req.user._id);
  const result = await githubService.deleteClosedPullRequestBranch(user.githubAccessToken, owner, repo, pullNumber, headSha);
  res.json(formatResponse(true, result, `Deleted branch ${result.branch}`));
});

/**
 * @desc    Get GitHub OAuth authorization URL
 * @route   GET /api/github/auth-url
 * @access  Private
 */
const getAuthUrl = asyncHandler(async (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CALLBACK_URL) return res.status(503).json(formatResponse(false, null, 'GitHub OAuth is not configured on the server.'));
  const scope = encodeURIComponent('repo user');
  const state = require('crypto').randomBytes(24).toString('hex');
  oauthStates.set(state, { userId: req.user._id.toString(), expiresAt: Date.now() + 10 * 60 * 1000 });

  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}&scope=${scope}&state=${state}`;

  res.json(formatResponse(true, { url }, 'GitHub OAuth URL generated'));
});

/**
 * @desc    Handle GitHub OAuth callback – exchange code for access token
 * @route   POST /api/github/callback
 * @access  Private
 */
const handleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.body;

  if (!code) {
    return res.status(400).json(formatResponse(false, null, 'Authorization code is required'));
  }
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_CALLBACK_URL) return res.status(503).json(formatResponse(false, null, 'GitHub OAuth is not configured on the server.'));

  const pendingState = state && oauthStates.get(state);
  if (!pendingState || pendingState.userId !== req.user._id.toString() || pendingState.expiresAt < Date.now()) {
    return res.status(400).json(formatResponse(false, null, 'GitHub authorization state is invalid. Please reconnect your account.'));
  }
  oauthStates.delete(state);

  // Exchange authorization code for an access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_CALLBACK_URL,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return res.status(400).json(formatResponse(false, null, `GitHub OAuth error: ${tokenData.error_description || tokenData.error}`));
  }

  const accessToken = tokenData.access_token;
  const grantedScopes = (tokenData.scope || '').split(/[ ,]+/).filter(Boolean);

  // Fetch GitHub user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const githubUser = await userResponse.json();

  // Save GitHub info to the user record
  await User.findByIdAndUpdate(req.user._id, {
    githubId: githubUser.id.toString(),
    githubAccessToken: accessToken,
    githubUsername: githubUser.login,
  }, { runValidators: true });

  res.json(
    formatResponse(true, {
      githubUsername: githubUser.login,
      grantedScopes,
      avatarUrl: githubUser.avatar_url,
    }, 'GitHub connected successfully')
  );
});

/**
 * @desc    List authenticated user's GitHub repositories
 * @route   GET /api/github/repos
 * @access  Private
 */
const getRepos = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+githubAccessToken');

  if (!user.githubAccessToken) {
    return res.status(400).json(formatResponse(false, null, 'GitHub is not connected. Please connect your GitHub account first.'));
  }

  const repos = await githubService.getRepos(user.githubAccessToken);

  res.json(formatResponse(true, repos));
});

const getRepositoryTree = asyncHandler(async (req, res) => {
  const { owner, repo } = req.query;
  if (!validRepoCoordinates(owner, repo)) return res.status(400).json(formatResponse(false, null, 'Choose a valid GitHub repository.'));
  const user = await getConnectedToken(req.user._id);
  const result = await githubService.getRepositoryTree(user.githubAccessToken, owner, repo);
  res.json(formatResponse(true, result));
});

const deleteRepositoryPath = asyncHandler(async (req, res) => {
  const { owner, repo } = req.body;
  const path = typeof req.body.path === 'string' ? req.body.path.replace(/\\/g, '/') : '';
  const commitSha = String(req.body.commitSha || '');
  const safePath = path && path.length <= 1000 && !path.startsWith('/') && !path.split('/').some((part) => !part || part === '.' || part === '..');
  if (!validRepoCoordinates(owner, repo) || !safePath || !/^[a-f0-9]{40}$/i.test(commitSha)) return res.status(400).json(formatResponse(false, null, 'Choose a valid repository path and refresh the file list before deleting.'));
  const user = await getConnectedToken(req.user._id);
  const result = await githubService.deleteRepositoryPath(user.githubAccessToken, owner, repo, path, commitSha);
  res.json(formatResponse(true, result, `Deleted ${result.filesDeleted} file${result.filesDeleted === 1 ? '' : 's'} from ${path}`));
});

/**
 * @desc    Push code to a specific repository
 * @route   POST /api/github/push
 * @access  Private
 */
const pushToRepo = asyncHandler(async (req, res) => {
  const { owner, repo, path, content, message } = req.body;

  if (!owner || !repo || !path || !content) {
    return res.status(400).json(formatResponse(false, null, 'owner, repo, path, and content are required'));
  }

  const user = await User.findById(req.user._id).select('+githubAccessToken');

  if (!user.githubAccessToken) {
    return res.status(400).json(formatResponse(false, null, 'GitHub is not connected'));
  }

  const result = await githubService.pushFile(
    user.githubAccessToken,
    owner,
    repo,
    path,
    content,
    message || `Update ${path} via Code Reviewer`
  );

  res.json(formatResponse(true, result, 'Code pushed to GitHub successfully'));
});

/**
 * @desc    Create a new GitHub repository and optionally push code
 * @route   POST /api/github/create-repo
 * @access  Private
 */
const createRepo = asyncHandler(async (req, res) => {
  const { name, description, isPrivate, code, fileName } = req.body;
  const files = Array.isArray(req.body.files) ? req.body.files : (code && fileName ? [{ path: fileName, content: code }] : []);

  if (!name) {
    return res.status(400).json(formatResponse(false, null, 'Repository name is required'));
  }

  if (files.length > 50) return res.status(400).json(formatResponse(false, null, 'Upload at most 50 files at a time.'));
  let totalBytes = 0;
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string' || !file.path.trim() || !['base64', 'utf-8'].includes(file.encoding || 'utf-8')) {
      return res.status(400).json(formatResponse(false, null, 'Each upload must include a file path and text content.'));
    }
    const normalizedPath = file.path.replace(/\\/g, '/');
    if (normalizedPath.startsWith('/') || /^[A-Za-z]:/.test(normalizedPath) || normalizedPath.split('/').some((part) => !part || part === '.' || part === '..')) {
      return res.status(400).json(formatResponse(false, null, `Invalid repository file path: ${file.path}`));
    }
    file.path = normalizedPath;
    if (file.encoding === 'base64' && !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) {
      return res.status(400).json(formatResponse(false, null, `Invalid base64 content for ${file.path}.`));
    }
    totalBytes += file.encoding === 'base64' ? Buffer.from(file.content, 'base64').length : Buffer.byteLength(file.content, 'utf8');
  }
  if (totalBytes > 8 * 1024 * 1024) return res.status(413).json(formatResponse(false, null, 'The selected files exceed the 8 MB total upload limit.'));

  const user = await User.findById(req.user._id).select('+githubAccessToken');

  if (!user.githubAccessToken) {
    return res.status(400).json(formatResponse(false, null, 'GitHub is not connected'));
  }

  const repo = await githubService.createRepo(
    user.githubAccessToken,
    name,
    description || '',
    isPrivate || false
  );

  let pushResult = null;
  if (files.length) {
    // Small delay to let GitHub finish initializing the repo
    await new Promise((resolve) => setTimeout(resolve, 2000));
    pushResult = await githubService.pushFiles(
      user.githubAccessToken,
      user.githubUsername,
      name,
      repo.defaultBranch || 'main',
      files,
      `Initial upload of ${files.length} file${files.length === 1 ? '' : 's'} via Merge AI`
    );
  }

  res.status(201).json(
    formatResponse(true, { repo, pushResult }, 'Repository created successfully')
  );
});

/**
 * @desc    Disconnect GitHub from the user account
 * @route   DELETE /api/github/disconnect
 * @access  Private
 */
const disconnectGithub = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    githubId: null,
    githubAccessToken: null,
    githubUsername: null,
  });

  res.json(formatResponse(true, null, 'GitHub disconnected successfully'));
});

module.exports = {
  getAuthUrl,
  handleCallback,
  getRepos,
  getRepositoryTree,
  deleteRepositoryPath,
  pushToRepo,
  createRepo,
  listPullRequests,
  listRepositoryBranches,
  createPullRequest,
  createPullRequestFromFiles,
  reviewPullRequest,
  getPullRequestContext,
  runPullRequestWorkflow,
  applyPullRequestFix,
  publishPullRequestReview,
  closePullRequest,
  deletePullRequestBranch,
  disconnectGithub,
};
