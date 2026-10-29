const { Octokit } = require('@octokit/rest');

const getRepos = async (accessToken) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.repos.listForAuthenticatedUser({ sort: 'updated', direction: 'desc', per_page: 100 });
  return data.map((repo) => ({ id: repo.id, name: repo.name, full_name: repo.full_name, description: repo.description, private: repo.private, html_url: repo.html_url, language: repo.language, defaultBranch: repo.default_branch, updatedAt: repo.updated_at, stargazersCount: repo.stargazers_count }));
};

const listPullRequests = async (accessToken, owner, repo) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.pulls.list({ owner, repo, state: 'open', sort: 'updated', direction: 'desc', per_page: 50 });
  return data.map((pull) => ({ number: pull.number, title: pull.title, user: pull.user?.login || 'Unknown author', headSha: pull.head.sha, headRef: pull.head.ref, baseRef: pull.base.ref, updatedAt: pull.updated_at, htmlUrl: pull.html_url, draft: pull.draft }));
};

const listBranches = async (accessToken, owner, repo) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
  return data.map((branch) => ({ name: branch.name, sha: branch.commit.sha, protected: branch.protected }));
};

const createPullRequest = async (accessToken, owner, repo, { title, head, base, body, draft = false }) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.pulls.create({ owner, repo, title, head, base, body, draft });
  return { number: data.number, title: data.title, state: data.state, htmlUrl: data.html_url, head: data.head.ref, base: data.base.ref };
};

const pushFiles = async (accessToken, owner, repo, branch, files, message = 'Update files via Merge AI') => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const parentSha = ref.object.sha;
  const { data: parent } = await octokit.git.getCommit({ owner, repo, commit_sha: parentSha });
  const entries = await Promise.all(files.map(async (file) => {
    const encoding = file.encoding === 'base64' ? 'base64' : 'utf-8';
    const { data: blob } = await octokit.git.createBlob({ owner, repo, content: file.content, encoding });
    return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha };
  }));
  const { data: tree } = await octokit.git.createTree({ owner, repo, base_tree: parent.tree.sha, tree: entries });
  const { data: commit } = await octokit.git.createCommit({ owner, repo, message, tree: tree.sha, parents: [parentSha] });
  await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.sha, force: false });
  return { commitSha: commit.sha, commitMessage: commit.message, filesCommitted: files.length };
};

const createPullRequestFromFiles = async (accessToken, owner, repo, { title, branch, base, body, draft = false, files, message }) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: baseRef } = await octokit.git.getRef({ owner, repo, ref: `heads/${base}` });
  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseRef.object.sha });
  await pushFiles(accessToken, owner, repo, branch, files, message || `Changes for: ${title}`);
  const { data } = await octokit.pulls.create({ owner, repo, title, head: branch, base, body, draft });
  return { number: data.number, title: data.title, state: data.state, htmlUrl: data.html_url, head: data.head.ref, base: data.base.ref, commitSha: data.head.sha };
};

const getRepositoryTree = async (accessToken, owner, repo) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: repository } = await octokit.repos.get({ owner, repo });
  if (!repository.default_branch) throw Object.assign(new Error('This repository has no default branch to manage.'), { status: 400 });
  const { data: branch } = await octokit.repos.getBranch({ owner, repo, branch: repository.default_branch });
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: branch.commit.sha, recursive: 'true' });
  if (tree.truncated) throw Object.assign(new Error('This repository is too large to show its complete file list. Open it on GitHub to manage its files.'), { status: 413 });
  return { defaultBranch: repository.default_branch, commitSha: branch.commit.sha, entries: (tree.tree || []).filter((entry) => entry.path && ['blob', 'tree', 'commit'].includes(entry.type)).map((entry) => ({ path: entry.path, type: entry.type, size: entry.size || 0 })) };
};

const deleteRepositoryPath = async (accessToken, owner, repo, path, expectedCommitSha) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: repository } = await octokit.repos.get({ owner, repo });
  if (!repository.default_branch) throw Object.assign(new Error('This repository has no default branch to update.'), { status: 400 });
  const { data: branch } = await octokit.repos.getBranch({ owner, repo, branch: repository.default_branch });
  if (branch.commit.sha !== expectedCommitSha) throw Object.assign(new Error('The repository changed since you opened the file list. Refresh it and try again.'), { status: 409 });
  const { data: current } = await octokit.git.getCommit({ owner, repo, commit_sha: branch.commit.sha });
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: current.tree.sha, recursive: 'true' });
  if (tree.truncated) throw Object.assign(new Error('This repository is too large to safely delete from. No files were changed.'), { status: 413 });
  const affected = (tree.tree || []).filter((entry) => entry.type !== 'tree' && (entry.path === path || entry.path.startsWith(`${path}/`)));
  if (!affected.length) throw Object.assign(new Error('The selected file or folder no longer exists. Refresh the list.'), { status: 404 });
  if (affected.length > 1000) throw Object.assign(new Error('This folder contains more than 1,000 files. Delete smaller folders separately.'), { status: 413 });
  const deletions = affected.map((entry) => ({ path: entry.path, mode: entry.mode, type: entry.type, sha: null }));
  const { data: nextTree } = await octokit.git.createTree({ owner, repo, base_tree: current.tree.sha, tree: deletions });
  const { data: commit } = await octokit.git.createCommit({ owner, repo, message: `Delete ${path}`, tree: nextTree.sha, parents: [branch.commit.sha] });
  await octokit.git.updateRef({ owner, repo, ref: `heads/${repository.default_branch}`, sha: commit.sha, force: false });
  return { path, defaultBranch: repository.default_branch, commitSha: commit.sha, filesDeleted: affected.length };
};

const pushFile = async (accessToken, owner, repo, path, content, message) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: repository } = await octokit.repos.get({ owner, repo });
  let sha;
  try {
    const { data: current } = await octokit.repos.getContent({ owner, repo, path, ref: repository.default_branch });
    if (!Array.isArray(current)) sha = current.sha;
  } catch (error) { if (error.status !== 404) throw error; }
  const { data } = await octokit.repos.createOrUpdateFileContents({ owner, repo, path, message: message || `Update ${path}`, content: Buffer.from(content, 'utf8').toString('base64'), branch: repository.default_branch, ...(sha ? { sha } : {}) });
  return { commitSha: data.commit.sha, commitMessage: data.commit.message, path };
};

const createRepo = async (accessToken, name, description = '', isPrivate = false) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.repos.createForAuthenticatedUser({ name, description, private: isPrivate, auto_init: true });
  return { id: data.id, name: data.name, full_name: data.full_name, html_url: data.html_url, private: data.private, defaultBranch: data.default_branch };
};

const getFileAtRef = async (accessToken, owner, repo, path, ref) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== 'file' || data.encoding !== 'base64') throw new Error('The selected path is not a readable text file.');
  return Buffer.from(data.content, 'base64').toString('utf8');
};

const getRelatedRepositoryFiles = async (octokit, owner, repo, ref, changedFiles) => {
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: ref, recursive: 'true' });
  if (tree.truncated) return [];
  const changed = new Set(changedFiles.map((file) => file.filename));
  const directories = new Set(changedFiles.map((file) => file.filename.includes('/') ? file.filename.slice(0, file.filename.lastIndexOf('/')) : ''));
  const candidates = (tree.tree || []).filter((entry) => entry.type === 'blob' && !changed.has(entry.path) && /\.(?:[cm]?[jt]sx?|py|go|rs|java|cs|rb|php|vue|svelte)$/i.test(entry.path) && directories.has(entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '')).slice(0, 18);
  const related = await Promise.all(candidates.map(async (entry) => {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: entry.path, ref });
      if (Array.isArray(data) || data.type !== 'file' || data.encoding !== 'base64') return null;
      return { filename: entry.path, content: Buffer.from(data.content, 'base64').toString('utf8') };
    }
    catch { return null; }
  }));
  return related.filter(Boolean);
};

const getPullRequestReviewContext = async (accessToken, owner, repo, pullNumber, { includeRelatedFiles = false } = {}) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: pull } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });
  const headSha = pull.head.sha;
  const [filesResult, workflowsResult, checksResult, dependabotResult, codeScanningResult, secretScanningResult] = await Promise.all([
    octokit.paginate(octokit.pulls.listFiles, { owner, repo, pull_number: pullNumber, per_page: 100 }).then((data) => ({ data })),
    octokit.actions.listRepoWorkflows({ owner, repo, per_page: 100 }).catch(() => ({ data: { workflows: [] } })),
    octokit.checks.listForRef({ owner, repo, ref: headSha, per_page: 100 }).catch(() => ({ data: { check_runs: [] } })),
    octokit.request('GET /repos/{owner}/{repo}/dependabot/alerts', { owner, repo, state: 'open', per_page: 30 }).catch(() => ({ data: [], unavailable: true })),
    octokit.request('GET /repos/{owner}/{repo}/code-scanning/alerts', { owner, repo, state: 'open', per_page: 30 }).catch(() => ({ data: [], unavailable: true })),
    octokit.request('GET /repos/{owner}/{repo}/secret-scanning/alerts', { owner, repo, state: 'open', per_page: 30 }).catch(() => ({ data: [], unavailable: true })),
  ]);
  let relatedFiles = [];
  if (includeRelatedFiles) {
    const headCoordinates = pull.head.repo?.full_name?.split('/') || [owner, repo];
    relatedFiles = await getRelatedRepositoryFiles(octokit, headCoordinates[0], headCoordinates[1], headSha, filesResult.data);
  }
  return {
    pull: { number: pull.number, title: pull.title, headSha, headRef: pull.head.ref, headRepo: pull.head.repo?.full_name || null, baseRef: pull.base.ref, htmlUrl: pull.html_url },
    files: filesResult.data.map((file) => ({ filename: file.filename, status: file.status, additions: file.additions, deletions: file.deletions, patch: file.patch || '' })),
    relatedFiles,
    workflows: (workflowsResult.data.workflows || []).filter((workflow) => workflow.state === 'active').map((workflow) => ({ id: workflow.id, name: workflow.name, path: workflow.path, state: workflow.state })),
    checks: (checksResult.data.check_runs || []).map((check) => ({ name: check.name, status: check.status, conclusion: check.conclusion, htmlUrl: check.html_url, startedAt: check.started_at, completedAt: check.completed_at })),
    security: {
      dependencyAlerts: { available: !dependabotResult.unavailable, count: (dependabotResult.data || []).length },
      codeScanningAlerts: { available: !codeScanningResult.unavailable, count: (codeScanningResult.data || []).length },
      secretScanningAlerts: { available: !secretScanningResult.unavailable, count: (secretScanningResult.data || []).length },
    },
  };
};

const dispatchWorkflow = async (accessToken, owner, repo, workflowId, ref) => {
  const octokit = new Octokit({ auth: accessToken });
  await octokit.actions.createWorkflowDispatch({ owner, repo, workflow_id: workflowId, ref });
};

const publishPullRequestReview = async (accessToken, owner, repo, pullNumber, body, comments) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.pulls.createReview({ owner, repo, pull_number: pullNumber, event: 'COMMENT', body, comments });
  return { htmlUrl: data.html_url, state: data.state, submittedAt: data.submitted_at };
};

const closePullRequest = async (accessToken, owner, repo, pullNumber, expectedHeadSha) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: current } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });
  if (current.head.sha !== expectedHeadSha) throw Object.assign(new Error('This pull request changed. Refresh the list before closing it.'), { status: 409 });
  const { data } = await octokit.pulls.update({ owner, repo, pull_number: pullNumber, state: 'closed' });
  return { number: data.number, title: data.title, state: data.state, htmlUrl: data.html_url, headSha: data.head.sha, headRef: data.head.ref, headRepo: data.head.repo?.full_name || null };
};

const deleteClosedPullRequestBranch = async (accessToken, owner, repo, pullNumber, expectedHeadSha) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: pull } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });
  if (pull.state !== 'closed') throw Object.assign(new Error('Close the pull request before deleting its source branch.'), { status: 409 });
  if (pull.head.sha !== expectedHeadSha) throw Object.assign(new Error('The source branch changed. Refresh the pull request before deleting it.'), { status: 409 });
  if (!pull.head.repo) throw Object.assign(new Error('The source repository is no longer available.'), { status: 404 });
  const [branchOwner, branchRepo] = pull.head.repo.full_name.split('/');
  const { data: sourceRepository } = await octokit.repos.get({ owner: branchOwner, repo: branchRepo });
  if (pull.head.ref === sourceRepository.default_branch) throw Object.assign(new Error('The source branch is the repository default branch and cannot be deleted here.'), { status: 400 });
  await octokit.git.deleteRef({ owner: branchOwner, repo: branchRepo, ref: `heads/${pull.head.ref}` });
  return { branch: pull.head.ref, repository: pull.head.repo.full_name, pullNumber: pull.number };
};

module.exports = {
  getRepos, pushFile, pushFiles, createRepo, getRepositoryTree, deleteRepositoryPath,
  listPullRequests, listBranches, createPullRequest, createPullRequestFromFiles,
  getRelatedRepositoryFiles, getPullRequestReviewContext, dispatchWorkflow, getFileAtRef,
  publishPullRequestReview, closePullRequest, deleteClosedPullRequestBranch,
};
