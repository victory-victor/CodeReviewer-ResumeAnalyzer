import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowDown, ArrowRight, BarChart3, Bell, BookOpen, BookmarkPlus, Briefcase, Check, ChevronDown, ClipboardList, Code2, Command, ExternalLink, FileCode2, FileUp, Folder, Github, HelpCircle, LayoutDashboard, LogOut, Mail, MapPin, Menu, MessageCircle, RefreshCw, Search, Send, Settings, ShieldCheck, Sparkles, Target, Trash2, Upload, X, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { analyticsAPI, authAPI, careerAPI, githubAPI, resumeAPI, reviewsAPI } from './services/api';
import Button from './components/ui/Button';
import FileUpload from './components/ui/FileUpload';

const cx = (...items) => items.filter(Boolean).join(' ');
const fmt = (date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
gsap.registerPlugin(ScrollTrigger);

const githubHelpAnswer = (question) => {
  const text = question.toLowerCase();

  // Fork / Forking
  if (/\bfork\b|\bforking\b/.test(text)) {
    return 'A Fork is a personal copy of someone else\'s GitHub repository saved directly under your own account. It allows you to freely experiment and make changes without affecting the original project. When your changes are ready, you can submit a Pull Request to propose merging them back into the original repository.';
  }

  // Clone
  if (/\bclone\b|\bcloning\b/.test(text)) {
    return 'Cloning creates an identical local copy of a remote GitHub repository on your computer. You do this using `git clone <repo-url>`. This lets you work on code offline, test locally, and commit changes before pushing them back up to GitHub.';
  }

  // Pull Request (PR)
  if (/pull request|\bpr\b/.test(text)) {
    return 'A Pull Request (PR) is a request to merge changes from one branch into another (or from a fork into the upstream project). It opens a collaborative space for code review, discussions, automated CI testing, and approval before code is merged into main.';
  }

  // Merge / Conflict / Rebasing
  if (/\bmerge\b|\bconflict\b|\bconflicts\b|\brebase\b/.test(text)) {
    return 'Merging integrates commits from one branch into another. If two branches modified the exact same lines of code, Git cannot automatically decide which one to keep, resulting in a Merge Conflict. You resolve conflicts by opening the marked files, selecting the intended changes, and committing the resolution.';
  }

  // Branch
  if (/\bbranch\b|\bbranches\b/.test(text)) {
    return 'A Branch is an independent line of development in a Git repository. It lets you isolate work on a new feature, bug fix, or experiment without affecting the primary codebase (`main`). Once finished and reviewed, the branch can be merged back.';
  }

  // Commit / Staging
  if (/\bcommit\b|\bcommitting\b|\bstage\b|\bstaging\b|\bgit add\b/.test(text)) {
    return 'A Commit is a permanent snapshot of changes in your repository. First, you stage files using `git add <file>` to select what to include, and then create a snapshot using `git commit -m "Your message"`. Each commit has a unique SHA hash and commit message.';
  }

  // Push / Pull / Fetch
  if (/\bpush\b|\bpull\b|\bfetch\b/.test(text)) {
    return '• Git Push uploads your local commits to the remote repository on GitHub (`git push origin <branch>`).\n• Git Fetch downloads the latest commits and branches from GitHub without modifying your local working files.\n• Git Pull fetches the latest changes and immediately merges them into your current local branch (`git pull = fetch + merge`).';
  }

  // Repository / Repo
  if (/repository|repo\b/.test(text)) {
    return 'A Repository (or "repo") is the central storage place for a project. It contains all project files, directories, documentation, and the complete version history of every commit made since the project was created. Repositories can be public (open source) or private.';
  }

  // Issues
  if (/\bissue\b|\bissues\b|\bbug report\b/.test(text)) {
    return 'GitHub Issues are project tracking items used to log bugs, request new features, or organize tasks. Team members can comment on issues, assign them to contributors, label them (e.g. bug, enhancement), and reference them directly in commits and pull requests.';
  }

  // Stars / Watch / Star
  if (/\bstar\b|\bstars\b|\bwatch\b|\bfollow\b/.test(text)) {
    return 'Starring a repository is like bookmarking or liking it; it shows appreciation to the author and helps you find it later in your Starred list. Watching a repository subscribes you to notifications whenever new issues, pull requests, or releases are created.';
  }

  // Gitignore
  if (/gitignore|\.gitignore/.test(text)) {
    return 'A `.gitignore` file specifies intentionally untracked files that Git should never commit. Common examples include `node_modules/`, `.env` environment secrets, build artifacts (`dist/`), and OS files like `.DS_Store`.';
  }

  // Markdown / README
  if (/readme|markdown|\.md\b/.test(text)) {
    return 'A `README.md` is the front page of a repository. Written in Markdown, it introduces the project, explains what it does, and provides instructions for installation, testing, and contribution.';
  }

  // Release / Tag
  if (/\brelease\b|\btag\b|\btags\b|\bsemver\b/.test(text)) {
    return 'Git Tags are reference pointers to specific points in Git history, commonly used to mark release versions (e.g., `v1.0.0`). GitHub Releases build upon tags by bundling release notes, changelogs, and binary downloads.';
  }

  // CI / CD / GitHub Actions / Workflow
  if (/ci|cd|action|actions|workflow/.test(text)) {
    return 'CI/CD (Continuous Integration / Continuous Deployment) automates building, linting, testing, and deploying your code whenever changes are pushed. GitHub Actions uses YAML workflow files placed in `.github/workflows/` to run these tasks automatically.';
  }

  // Code Review / PR Review
  if (/review|finding|comment/.test(text)) {
    return 'A Code Review is a collaborative process where team members inspect pull request changes before merging. Reviewers look for logic bugs, security risks, performance flaws, and style consistency to ensure high engineering quality.';
  }

  // Connect GitHub / OAuth
  if (/connect|oauth|github account/.test(text)) {
    return 'To connect GitHub with Merge AI, visit Integrations in your workspace and click "Connect GitHub". This authorizes Merge AI to view your repositories, push improved code, or create pull requests safely.';
  }

  // Security / Secrets / Tokens
  if (/secret|token|password|credential|pat\b/.test(text)) {
    return 'Security Rule: Never commit passwords, API keys, tokens, or private certificates into Git repositories. Store them in `.env` files and add `.env` to `.gitignore`. For GitHub, use Personal Access Tokens (PAT) or OAuth rather than account passwords.';
  }

  // Git vs GitHub
  if (/git vs github|difference between git and github/.test(text)) {
    return 'Git is a free, open-source version control tool that runs locally on your computer to track code history. GitHub is a cloud-based hosting platform built around Git that enables collaboration, remote backups, pull requests, issue tracking, and CI/CD.';
  }

  // Stash
  if (/\bstash\b|\bgit stash\b/.test(text)) {
    return '`git stash` temporarily shelves (or shelves) uncommitted changes in your working directory so you can switch branches or pull updates without losing your work. You can restore them later using `git stash pop`.';
  }

  // What can you do / Help
  return 'I know all the essential GitHub concepts! You can ask me about:\n• Repositories, Forks, and Cloning\n• Commits, Staging, and Branches\n• Pull Requests, Merging, and Conflicts\n• Git Push, Pull, and Fetch\n• Issues, Stars, READMEs, and .gitignore\n• CI/CD and GitHub Actions\n• How Git and GitHub work together with Merge AI';
};

function MergeAIBot() {
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState('');
  const [messages,setMessages]=useState([]);
  const listRef=useRef(null);
  useEffect(()=>{if(open&&listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight},[open,messages]);
  const send=(event)=>{event.preventDefault();const question=draft.trim();if(!question)return;setMessages(current=>[...current,{role:'user',text:question},{role:'assistant',text:githubHelpAnswer(question)}]);setDraft('')};
  return <div className="github-guide-widget"><button type="button" className="github-guide-launcher" aria-label={open?'Close Merge AI Bot':'Ask Merge AI Bot'} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?<X size={20}/>:<MessageCircle size={20}/>}<span>{open?'Close':'Merge AI Bot'}</span></button>{open&&<section className="github-guide-panel" aria-label="Merge AI Bot"><header><span className="guide-bot-icon"><Sparkles size={17}/></span><div><strong>Merge AI Bot</strong><small>Your friendly GitHub guide</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close Merge AI Bot"><X size={17}/></button></header><div className="github-guide-messages" ref={listRef} aria-live="polite"><div className="guide-message assistant">Hi! I’m Merge AI Bot. Ask me about repositories, branches, commits, pull requests, reviews, or CI checks. I’ll explain the basics in plain language.</div>{messages.map((message,index)=><div key={index} className={`guide-message ${message.role}`}>{message.text}</div>)}</div><div className="guide-privacy"><ShieldCheck size={13}/> This quick guide stays in your browser. Never share passwords or tokens.</div><form className="github-guide-form" onSubmit={send}><input value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Ask a GitHub question…" aria-label="Ask Merge AI Bot a question" maxLength={500}/><button type="submit" disabled={!draft.trim()} aria-label="Send question"><Send size={16}/></button></form></section>}</div>;
}

function App() {
  return <BrowserRouter><AuthProvider><AuthProviderShell /></AuthProvider><Toaster position="top-right" toastOptions={{ style: { background: '#fbfcf9', color: '#303831', border: '1px solid #e7e9e3' } }} /></BrowserRouter>;
}

function AuthProviderShell() {
  const { loading } = useAuth();
  if (loading) return <WorkspaceLoader/>;
  return <Routes>
    <Route path="/" element={<Marketing/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/signup" element={<AuthPage signup/>}/><Route path="/verify-email" element={<EmailVerificationPage/>}/>
    <Route path="/app" element={<Protected><Dashboard/></Protected>}/><Route path="/app/review" element={<Protected><ReviewPage/></Protected>}/>
    <Route path="/app/insights" element={<Protected><InsightsPage/></Protected>}/><Route path="/app/career" element={<Protected><CareerPage/></Protected>}/>
    <Route path="/app/integrations" element={<Protected><IntegrationsPage/></Protected>}/><Route path="/app/settings" element={<Protected><SettingsPage/></Protected>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}

function Protected({children}) { const {isAuthenticated}=useAuth(); const location=useLocation(); return isAuthenticated ? children : <Navigate to="/login" state={{from:location}} replace/>; }

function LogoIcon({ size = 18, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* 8-pointed asterisk / starburst matching the email design ✳ */}
      <path d="M10.75 2.5a1.25 1.25 0 0 1 2.5 0v5.035l3.56-3.56a1.25 1.25 0 1 1 1.768 1.768l-3.56 3.56H20a1.25 1.25 0 0 1 0 2.5h-5.022l3.56 3.56a1.25 1.25 0 1 1-1.768 1.768l-3.56-3.56V21.5a1.25 1.25 0 0 1-2.5 0v-5.022l-3.56 3.56a1.25 1.25 0 0 1-1.768-1.768l3.56-3.56H4a1.25 1.25 0 0 1 0-2.5h5.035l-3.56-3.56a1.25 1.25 0 0 1 1.768-1.768l3.56 3.56V2.5z" />
    </svg>
  );
}

function WorkspaceLoader() {
  const loaderRef = useRef(null);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.from('.loader-content > *', { y: 14, autoAlpha: 0, duration: reduced ? 0 : 0.55, stagger: reduced ? 0 : 0.1, ease: 'power3.out' });
      if (!reduced) {
        gsap.to('.loader-orbit', { rotation: 360, duration: 5, repeat: -1, ease: 'none' });
        gsap.to('.loader-mark', { scale: 1.08, duration: 0.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.fromTo('.loading-line span', { xPercent: -110 }, { xPercent: 210, duration: 1.35, repeat: -1, ease: 'power2.inOut' });
      }
    }, loaderRef);
    return () => context.revert();
  }, []);
  return <div className="app-loading" ref={loaderRef} role="status" aria-live="polite"><div className="loader-content"><div className="loader-emblem"><span className="loader-orbit"/><span className="loader-mark"><LogoIcon size={22}/></span><i className="loader-spark">✳</i></div><strong>Merge<span>.</span>AI</strong><p>Preparing your workspace</p><div className="loading-line"><span/></div><small>Thoughtful engineering, shipped.</small></div></div>;
}

function Brand({light=false}) { return <Link className={cx('brand',light&&'brand-light')} to="/"><span className="brand-mark"><LogoIcon size={18}/></span><span>merge<span className="brand-dot">.</span>ai</span></Link>; }

function Marketing() {
  const {isAuthenticated}=useAuth();
  const pageRef = useRef(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const cardListeners = [];
      const context = gsap.context(() => {
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro.from('.marketing-nav', { y: -18, autoAlpha: 0, duration: 0.65 })
          .from('.hero-copy > *', { y: 27, autoAlpha: 0, duration: 0.72, stagger: 0.11 }, '-=0.28')
          .from('.hero-image', { scale: 1.08, autoAlpha: 0, duration: 1.05 }, '-=0.75')
          .from('.editor-window', { y: 34, rotateY: -7, transformPerspective: 900, autoAlpha: 0, duration: 0.9 }, '-=0.78')
          .from('.issue-tooltip, .score-float, .float-pill', { y: 20, scale: 0.96, autoAlpha: 0, duration: 0.62, stagger: 0.1 }, '-=0.48');

        gsap.to('.float-top', { y: -8, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.float-bottom', { y: 7, duration: 3.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.score-float', { y: -6, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.4 });
        gsap.to('.hero-orb', { rotation: 360, scale: 1.12, duration: 18, repeat: -1, yoyo: true, ease: 'sine.inOut' });

        gsap.utils.toArray('.trusted, .section-heading, .feature-card, .workflow-copy > *, .workflow-preview, .career-copy > *, .career-card, .final-cta > *').forEach((element) => {
          gsap.fromTo(element, { y: 28, autoAlpha: 0 }, {
            y: 0, autoAlpha: 1, duration: 0.75, ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true }
          });
        });
        gsap.utils.toArray('.feature-card').forEach((card) => {
          const move = (event) => {
            const bounds = card.getBoundingClientRect();
            const rx = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2;
            const ry = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
            gsap.to(card, { rotateX: rx, rotateY: ry, transformPerspective: 900, duration: 0.35, ease: 'power2.out' });
          };
          const leave = () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.55, ease: 'power3.out' });
          card.addEventListener('pointermove', move);
          card.addEventListener('pointerleave', leave);
          cardListeners.push([card, move, leave]);
        });
      }, pageRef);
      return () => {
        cardListeners.forEach(([card, move, leave]) => {
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
        });
        context.revert();
      };
    });
    return () => media.revert();
  }, []);
  return <main className="marketing" ref={pageRef}>
    <header className="marketing-nav"><Brand/><nav><a href="#platform">Platform</a><a href="#workflow">How it works</a><a href="#careers">Career tools</a></nav><div className="nav-actions">{isAuthenticated?<Link to="/app" className="text-link">Open workspace <ArrowRight size={15}/></Link>:<><Link to="/login" className="text-link">Sign in</Link><Link to="/signup" className="button button-dark">Get started <ArrowRight size={15}/></Link></>}</div></header>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR NEXT RELEASE, WITH CONFIDENCE</div><h1>Good code ships.<br/><span>Great code</span> goes further.</h1><p className="hero-desc">An AI engineering partner for the work before the merge. Find the issues, understand the risk, and move every project closer to production.</p><div className="hero-cta"><Link to={isAuthenticated?'/app':'/signup'} className="button button-dark button-lg">Start reviewing free <ArrowRight size={17}/></Link><a href="#workflow" className="watch-link"><span className="play-button">▸</span> See how it works</a></div><div className="hero-proof"><div className="avatar-stack"><span>JD</span><span>MK</span><span>AL</span><span>+</span></div><div><strong>Built for thoughtful engineers</strong><small>Ship with fewer surprises.</small></div><div className="hero-divider"/><div className="hero-stat"><strong>24/7</strong><small>AI review partner</small></div></div></div>
      <div className="hero-visual"><div className="hero-image"/><div className="editor-window"><div className="editor-top"><div className="window-dots"><i/><i/><i/></div><span>src / services / auth.ts</span><span className="editor-branch"><GitBranchIcon/> feature/auth</span></div><div className="editor-body"><div className="line-numbers">01<br/>02<br/>03<br/>04<br/>05<br/>06<br/>07<br/>08<br/>09<br/>10<br/>11</div><div className="code-lines"><div><em>export async function</em> <b>signIn</b>(email, password) {'{'}</div><div> &nbsp; <em>const</em> user = <b>await</b> db.users.find(email);</div><div> &nbsp; <em>if</em> (!user) <b>throw</b> <em>new</em> AuthError();</div><div className="code-highlight"> &nbsp; <em>const</em> valid = <b>await</b> verify(password, user.hash);</div><div> &nbsp; <em>if</em> (!valid) <b>throw</b> <em>new</em> AuthError();</div><div> &nbsp; <b>return</b> createSession(user.id);</div><div>{'}'}</div><div className="code-muted">// session expiry handled downstream</div><div className="code-empty"> </div><div className="code-empty"> </div><div className="code-empty"> </div></div></div><div className="issue-tooltip"><span className="issue-icon"><ShieldCheck size={15}/></span><div><strong>Security · line 4</strong><p>Consider timing-safe comparison<br/>to prevent timing attacks.</p></div><span className="issue-severity">MEDIUM</span></div><div className="score-float"><div className="score-ring"><span>86</span></div><div><small>CODE HEALTH</small><strong>Looking good</strong></div><ArrowUpRight/></div></div><div className="float-pill float-top"><span className="pill-icon"><Sparkles size={15}/></span> Context-aware review <span className="pill-live"/></div><div className="float-pill float-bottom"><span className="check-mark"><Check size={14}/></span> Ready for review</div><div className="hero-orb"/></div></section>
    <section className="trusted"><span>YOUR ENGINEERING WORKFLOW, IN ONE PLACE</span><div><span><Github size={16}/> GitHub</span><span><Code2 size={17}/> JavaScript</span><span><FileCode2 size={16}/> TypeScript</span><span><Command size={16}/> Python</span><span><Zap size={16}/> OpenAI</span></div></section>
    <section className="feature-section" id="platform"><div className="section-heading"><div className="eyebrow">A BETTER WAY TO SHIP</div><h2>Less guesswork.<br/><span>More great work.</span></h2><p>From first pass to final push, the details that matter are right where you need them.</p></div><div className="feature-grid"><article className="feature-card feature-large"><div className="feature-label"><span>01</span> CODE INTELLIGENCE</div><h3>See the signal<br/>in every line.</h3><p>Get a thoughtful review that catches security risks, logic bugs, and performance concerns before they become production problems.</p><div className="mini-code"><div><span>12</span> <b>const</b> result = <em>await</em> fetchData();</div><div className="mini-warning"><span>13</span> <i>// Is this response validated?</i><small><ShieldCheck size={12}/> unchecked response</small></div><div><span>14</span> <b>return</b> result.json();</div></div><Link to={isAuthenticated?'/app/review':'/signup'} className="feature-link">Explore code review <ArrowRight size={15}/></Link></article><article className="feature-card"><div className="feature-label"><span>02</span> PROJECT HEALTH</div><div className="feature-chart"><div className="chart-head"><span>Health score</span><b>+12.4%</b></div><strong>86<span>/100</span></strong><div className="chart-lines"><i/><i/><i/><i/></div><svg viewBox="0 0 280 75" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#547c68" stopOpacity=".26"/><stop offset="1" stopColor="#547c68" stopOpacity="0"/></linearGradient></defs><path d="M0 58 C23 54 28 43 49 48 S80 54 97 34 S127 45 145 25 S178 42 196 22 S224 29 241 12 S264 20 280 5 V75 H0Z" fill="url(#chartFill)"/><path d="M0 58 C23 54 28 43 49 48 S80 54 97 34 S127 45 145 25 S178 42 196 22 S224 29 241 12 S264 20 280 5" fill="none" stroke="#82ab92" strokeWidth="2"/></svg></div><p>Understand quality trends and track meaningful progress across your reviews.</p><Link to={isAuthenticated?'/app/insights':'/signup'} className="feature-link">Explore insights <ArrowRight size={15}/></Link></article><article className="feature-card"><div className="feature-label"><span>03</span> CAREER MOMENTUM</div><div className="career-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="career-center"><Briefcase size={22}/></div><span className="skill-tag skill-one">React</span><span className="skill-tag skill-two">Node.js</span><span className="skill-tag skill-three">Systems</span><span className="skill-tag skill-four">+ 8</span></div><p>Turn your resume into a clearer picture of your strengths and next opportunities.</p><Link to={isAuthenticated?'/app/career':'/signup'} className="feature-link">Explore career tools <ArrowRight size={15}/></Link></article><article className="feature-card feature-integration"><div className="feature-label"><span>04</span> YOUR WORKFLOW</div><h3>From insight<br/>to impact.</h3><p>Connect your repository, review with context, and push improvements when you’re ready.</p><div className="integration-icons"><span><Github size={19}/></span><ArrowRight size={15}/><span className="integration-spark"><Sparkles size={18}/></span><ArrowRight size={15}/><span className="integration-check"><Check size={19}/></span></div><Link to={isAuthenticated?'/app/integrations':'/signup'} className="feature-link">Connect your tools <ArrowRight size={15}/></Link></article></div></section>
    <section className="workflow-section" id="workflow"><div className="workflow-copy"><div className="eyebrow">A FLOW THAT FEELS NATURAL</div><h2>Keep your focus.<br/><span>Lose the friction.</span></h2><p>Bring a file or paste a snippet. Merge AI builds a focused review around the code you’re working on, then makes the next step yours.</p><div className="steps"><div><span>01</span><p><strong>Bring your code</strong><small>Paste a snippet, upload a file, or connect GitHub.</small></p></div><div><span>02</span><p><strong>Get the full picture</strong><small>See scores, issues, and suggestions in context.</small></p></div><div><span>03</span><p><strong>Ship with confidence</strong><small>Improve your code and send it back to your repo.</small></p></div></div><Link to={isAuthenticated?'/app':'/signup'} className="button button-dark">Try it for yourself <ArrowRight size={15}/></Link></div><div className="workflow-preview"><div className="preview-window"><div className="preview-sidebar"><div className="preview-logo"><span className="brand-mark"><LogoIcon size={13}/></span> merge.ai</div><div className="preview-nav active"><LayoutDashboard size={14}/> Overview</div><div className="preview-nav"><FileCode2 size={14}/> Code review</div><div className="preview-nav"><BarChart3 size={14}/> Insights</div><div className="preview-nav"><Briefcase size={14}/> Career</div><div className="preview-profile"><span>JD</span><div>Jordan Davis<small>Pro workspace</small></div><ChevronDown size={12}/></div></div><div className="preview-main"><div className="preview-top"><span>Overview <small>/ Last 30 days</small></span><span className="preview-search"><Search size={13}/> Search</span></div><div className="preview-greeting">Good morning, Jordan <span>✳</span><small>Here’s your codebase at a glance.</small></div><div className="preview-stat-grid"><div><small>REVIEWS</small><strong>24</strong><em>+18% this month</em></div><div><small>AVG. HEALTH SCORE</small><strong>86<span>/100</span></strong><em>+6 pts this month</em></div><div><small>ISSUES RESOLVED</small><strong>38</strong><em>Across 12 reviews</em></div></div><div className="preview-chart-card"><div><b>Code health over time</b><small>Steady progress across your reviews</small></div><div className="preview-chart"><svg viewBox="0 0 420 80" preserveAspectRatio="none"><path d="M0 68 C35 59 48 55 72 60 S112 54 136 38 S178 50 197 36 S232 44 253 27 S284 39 309 22 S346 29 365 12 S400 20 420 3" fill="none" stroke="#789a81" strokeWidth="2.3"/></svg></div><div className="preview-dates"><span>Oct 01</span><span>Oct 08</span><span>Oct 15</span><span>Oct 22</span><span>Oct 27</span></div></div></div></div><div className="preview-note"><span><Sparkles size={15}/></span><p><b>A useful nudge</b><small>Your average health score is up 6 points this month.</small></p></div></div></section>
    <section className="career-section" id="careers"><div className="career-block"><div className="career-copy"><div className="eyebrow">BUILT AROUND YOUR GROWTH</div><h2>Your next chapter<br/>starts with <span>clarity.</span></h2><p>Get more from the skills you’ve built. Merge AI can help surface your strongest experience, suggest where to grow, and find roles that fit your direction.</p><ul><li><Check size={16}/> Understand your skills and strengths</li><li><Check size={16}/> Get practical resume suggestions</li><li><Check size={16}/> Explore roles matched to your profile</li></ul><Link to={isAuthenticated?'/app/career':'/signup'} className="button button-dark">Explore career tools <ArrowRight size={15}/></Link></div><div className="career-card"><div className="resume-sheet"><div className="resume-head"><div className="resume-avatar">JD</div><div><b>Jordan Davis</b><small>Full-stack engineer</small></div><span>PROFILE</span></div><div className="resume-line wide"/><div className="resume-line"/><div className="resume-subtitle">SKILLS & EXPERIENCE</div><div className="resume-tags"><i>React</i><i>Node.js</i><i>TypeScript</i><i>PostgreSQL</i></div><div className="resume-line wide"/><div className="resume-line"/></div><div className="match-card"><div><span className="match-icon"><Sparkles size={15}/></span><b>Roles to explore</b><small>Matched to your experience</small></div><div className="match-row"><span>01</span><p><b>Senior Frontend Engineer</b><small>Product & technology</small></p><strong>92%</strong></div><div className="match-row"><span>02</span><p><b>Full-stack Developer</b><small>Growth stage teams</small></p><strong>87%</strong></div></div></div></div></section>
    <section className="final-cta"><div className="eyebrow">YOUR NEXT GOOD DECISION</div><h2>Make room for<br/><span>better engineering.</span></h2><p>Start with a review. See what changes when the details come together.</p><Link to={isAuthenticated?'/app':'/signup'} className="button button-cream button-lg">Build your workspace <ArrowRight size={16}/></Link><small>Free to get started · No credit card required</small><div className="cta-decoration cta-left"/><div className="cta-decoration cta-right"/></section>
    <footer className="marketing-footer"><Brand/><span>Thoughtful engineering, shipped.</span><div><a href="#platform">Platform</a><a href="#workflow">How it works</a><Link to="/login">Sign in</Link></div><small>© 2026 Merge AI</small></footer>
  </main>;
}

function GitBranchIcon(){return <Activity size={12}/>}; function ArrowUpRight(){return <ArrowRight className="rotate-arrow" size={15}/>}

function OtpInput({ value = '', onChange, length = 6, disabled = false }) {
  const inputsRef = useRef([]);

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleChange = (e, index) => {
    const char = e.target.value.slice(-1);
    if (char && !/^\d$/.test(char)) return; // Only allow digits

    const chars = value.padEnd(length, ' ').split('');
    chars[index] = char || ' ';
    const nextVal = chars.join('').trimEnd();
    onChange(nextVal);

    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const targetIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[targetIdx]?.focus();
  };

  return (
    <div className="otp-container" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value[i] || ''}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className="otp-box"
          autoFocus={i === 0 && !value}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function AuthPage({signup=false}) {
  const {login,signup:createAccount,isAuthenticated,logout}=useAuth();
  const navigate=useNavigate();
  const [busy,setBusy]=useState(false);
  const [confirmation,setConfirmation]=useState(null);
  const [resending,setResending]=useState(false);

  // Forgot password flow states on login page: 'login' | 'forgot_email' | 'forgot_otp'
  const [authMode, setAuthMode] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if(isAuthenticated&&!signup) return <Navigate to="/app" replace/>;

  const submit=async(event)=>{
    event.preventDefault();
    setBusy(true);
    const form=new FormData(event.currentTarget);
    const email=String(form.get('email')||'').trim();
    try{
      if(signup){
        if(isAuthenticated)logout();
        const response=await createAccount(form.get('name'),email,form.get('password'));
        setConfirmation({email,emailSent:Boolean(response.data.data.emailSent)});
      }else{
        await login(email,form.get('password'));
        toast.success('Welcome back');
        navigate('/app');
      }
    }catch(error){toast.error(error.response?.data?.message||'Something went wrong. Please try again.')}
    finally{setBusy(false)}
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const email = resetEmail.trim().toLowerCase();
    if (!email) return toast.error('Please enter your email address');
    setBusy(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success('6-digit verification code sent to your email');
      setResetOtp('');
      setAuthMode('forgot_otp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send verification code');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetOtp.trim().length !== 6) return toast.error('Please enter the full 6-digit OTP code');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters long');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setBusy(true);
    try {
      await authAPI.resetPassword({ email: resetEmail.trim().toLowerCase(), otp: resetOtp.trim(), password: newPassword });
      toast.success('Password reset successfully! Please sign in with your new password.');
      setAuthMode('login');
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password reset failed');
    } finally {
      setBusy(false);
    }
  };

  const resendOtpCode = async () => {
    if (!resetEmail) return;
    setResending(true);
    try {
      await authAPI.forgotPassword({ email: resetEmail.trim().toLowerCase() });
      toast.success('New 6-digit verification code sent to your email');
      setResetOtp('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not resend verification code');
    } finally {
      setResending(false);
    }
  };

  const resend=async()=>{
    if(!confirmation?.email)return;
    setResending(true);
    try{await authAPI.resendVerification({email:confirmation.email});toast.success('If your account needs verification, a new email is on its way.')}
    catch(error){toast.error(error.response?.data?.message||'Could not request another verification email.')}
    finally{setResending(false)}
  };

  return <div className="auth-layout"><div className="auth-side"><Brand light/><div className="auth-side-copy"><div className="eyebrow">THOUGHTFUL ENGINEERING, SHIPPED</div><h1>Make every<br/>merge <span>mean more.</span></h1><p>Your AI engineering partner for confident code reviews, clearer insights, and your next big opportunity.</p><div className="auth-side-quote"><Sparkles size={16}/><span>“The best code review is the one that helps you see what you missed.”</span></div></div><small>© 2026 Merge AI · Made for people who build</small><div className="auth-graphic"><div/></div></div><div className="auth-main"><Link to="/" className="auth-back">← Back to home</Link>{confirmation?<section className="signup-confirmation" aria-live="polite"><span className="signup-confirmation-icon"><Mail size={22}/></span><span className="email-verification-eyebrow">VERIFY YOUR ACCOUNT</span><h2>Check your inbox.</h2><p>We sent a welcome email and a secure verification link to <strong>{confirmation.email}</strong>. Open that email and verify your address before signing in.</p><div className={`verification-inbox-note ${confirmation.emailSent?'':'verification-warning'}`}><ShieldCheck size={17}/><span>{confirmation.emailSent?'Your verification link expires in 24 hours. Check your spam folder if it doesn’t arrive.':'Your account was created, but email delivery is not configured yet. Add your Brevo settings, then resend the verification email.'}</span></div><Button type="button" variant="secondary" loading={resending} onClick={resend}><Mail size={15}/> Resend verification email</Button><div className="auth-switch">Already verified? <Link to="/login">Sign in</Link></div></section>:signup?<form className="auth-form" onSubmit={submit}><div className="auth-icon"><LogoIcon size={20}/></div><h2>Create your workspace</h2><p>Your best work starts here.</p><label>Your name<input name="name" placeholder="Jordan Davis" autoComplete="name" required minLength="2" maxLength="50"/></label><label>Email address<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required/></label><label>Password<input name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" required minLength={8}/></label><Button type="submit" loading={busy} className="auth-submit">Create account <ArrowRight size={16}/></Button><div className="auth-terms">By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</div><div className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></div></form>:authMode==='forgot_email'?<form className="auth-form" onSubmit={handleSendOtp}><div className="auth-icon"><Mail size={20}/></div><h2>Reset password</h2><p>Enter your account email to receive a 6-digit verification code.</p><label>Email address<input name="email" type="email" value={resetEmail} onChange={(e)=>setResetEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required/></label><Button type="submit" loading={busy} className="auth-submit">Send verification code <ArrowRight size={16}/></Button><div className="auth-switch">Remember your password? <button type="button" onClick={()=>setAuthMode('login')} className="auth-link-button">Sign in</button></div></form>:authMode==='forgot_otp'?<form className="auth-form" onSubmit={handleResetPassword}><div className="auth-icon"><ShieldCheck size={20}/></div><h2>Enter verification code</h2><p>We sent a 6-digit code to <strong>{resetEmail}</strong></p><div className="otp-wrapper"><label className="otp-label">6-DIGIT VERIFICATION CODE</label><OtpInput value={resetOtp} onChange={setResetOtp} length={6} disabled={busy}/></div><label>New password<input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} autoComplete="new-password"/></label><label>Confirm new password<input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required minLength={8} autoComplete="new-password"/></label><Button type="submit" loading={busy} disabled={resetOtp.length!==6} className="auth-submit">Reset password <ArrowRight size={16}/></Button><div className="otp-resend-bar"><span>Didn't receive code?</span><button type="button" onClick={resendOtpCode} disabled={resending} className="auth-link-button">{resending?'Sending…':'Resend code'}</button></div><div className="auth-switch">Back to <button type="button" onClick={()=>setAuthMode('login')} className="auth-link-button">Sign in</button></div></form>:<form className="auth-form" onSubmit={submit}><div className="auth-icon"><LogoIcon size={20}/></div><h2>Welcome back</h2><p>Pick up right where you left off.</p><label>Email address<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required/></label><label>Password<input name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required/></label><div className="auth-options"><label className="checkbox-label"><input type="checkbox"/> Keep me signed in</label><button type="button" onClick={()=>{setResetEmail('');setAuthMode('forgot_email')}} className="forgot-password-link">Forgot password?</button></div><Button type="submit" loading={busy} className="auth-submit">Sign in <ArrowRight size={16}/></Button><div className="auth-terms">By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</div><div className="auth-switch">New to Merge AI? <Link to="/signup">Create an account</Link></div></form>}<div className="auth-security"><ShieldCheck size={14}/> Your code and data stay private to your workspace</div></div></div>;
}
function EmailVerificationPage({sent=false}){
  const location=useLocation();
  const [status,setStatus]=useState(sent?'sent':'verifying');
  const [message,setMessage]=useState('Checking your secure verification link…');
  const [resending,setResending]=useState(false);
  const [resendEmail,setResendEmail]=useState('');
  const started=useRef(false);
  const params=new URLSearchParams(location.search);
  const email=params.get('email')||'';
  useEffect(()=>{
    if(sent)return;
    if(started.current)return;
    started.current=true;
    const token=new URLSearchParams(location.search).get('token');
    if(!token){setStatus('error');setMessage('This verification link is missing its secure token. Request a new email and try again.');return}
    authAPI.verifyEmail({token}).then(response=>{setStatus('verified');setMessage(response.data.message||'Your email is verified. You can now sign in.')}).catch(error=>{setStatus('error');setMessage(error.response?.data?.message||'We could not verify this link. Request a new email to continue.')});
  },[sent,location.search]);
  const resend=async()=>{if(!email)return;setResending(true);try{await authAPI.resendVerification({email});toast.success('If your account needs verification, a new email is on its way.')}catch(error){toast.error(error.response?.data?.message||'Could not request another verification email.')}finally{setResending(false)}};
  const resendTypedEmail=async()=>{if(!resendEmail)return;setResending(true);try{await authAPI.resendVerification({email:resendEmail});toast.success('If your account needs verification, a new email is on its way.')}catch(error){toast.error(error.response?.data?.message||'Could not request another verification email.')}finally{setResending(false)}};
  const sentMail=params.get('sent')!=='0';
  const icon=status==='verified'?<Check size={26}/>:status==='error'?<X size={25}/>:<Mail size={25}/>;
  return <main className="email-verification-page"><Link to="/" className="email-brand"><span>✳</span> MERGE AI</Link><section className={`email-verification-card ${status==='error'?'verification-error':''}`}><div className="email-verification-orbit"><i/><i/><i/><span>{icon}</span></div>{sent?<><span className="email-verification-eyebrow">ONE QUICK STEP LEFT</span><h1>Check your inbox.</h1><p>We sent a welcome note and a secure email verification link{email?<> to <strong>{email}</strong></>:''}. Confirm it’s you to unlock your Merge AI workspace.</p><div className={`verification-inbox-note ${sentMail?'':'verification-warning'}`}><ShieldCheck size={17}/><span>{sentMail?'The link expires in 24 hours. Check your spam folder if it doesn’t arrive.':'Your account was created, but email delivery is not configured yet. You can resend after Brevo is set up.'}</span></div>{email&&<Button variant="secondary" loading={resending} onClick={resend}><Mail size={15}/> Resend verification email</Button>}<Link to="/login" className="verification-text-link">Back to sign in</Link></>:<><span className="email-verification-eyebrow">{status==='verifying'?'SECURE EMAIL CHECK':status==='verified'?'YOU’RE ALL SET':'LINK NEEDS ATTENTION'}</span><h1>{status==='verifying'?'Verifying you…':status==='verified'?'Email confirmed.':'Couldn’t verify email.'}</h1><p>{message}</p>{status==='verified'?<Link to="/login" className="button button-dark verification-main-action">Continue to sign in <ArrowRight size={15}/></Link>:status==='error'?<div className="verification-retry"><label>Email address<input type="email" value={resendEmail} onChange={event=>setResendEmail(event.target.value)} placeholder="you@company.com"/></label><Button variant="secondary" loading={resending} disabled={!resendEmail.includes('@')} onClick={resendTypedEmail}><Mail size={15}/> Resend verification email</Button><Link to="/signup" className="verification-text-link">Back to sign up</Link></div>:<span className="verification-loading-line"><i/> Securely confirming your email</span>}</>}</section><small className="email-verification-footer">Thoughtful engineering, shipped. · Your account details stay private.</small></main>;
}

function Shell({children,title,subtitle,active}) {
  const {user,logout}=useAuth(); const [menu,setMenu]=useState(false); const nav=[['/app',LayoutDashboard,'Overview'],['/app/review',FileCode2,'Code review'],['/app/insights',BarChart3,'Insights'],['/app/career',Briefcase,'Career studio'],['/app/integrations',Github,'Integrations']];
  return <div className="workspace"><aside className={cx('sidebar',menu&&'sidebar-open')}><div className="sidebar-top"><Brand/><button className="mobile-close" onClick={()=>setMenu(false)}><X size={18}/></button></div><div className="workspace-picker"><span className="workspace-avatar">{(user?.name||'W').slice(0,1).toUpperCase()}</span><div><strong>{user?.name||'My workspace'}</strong><small>Personal workspace</small></div><ChevronDown size={14}/></div><small className="nav-label">WORKSPACE</small><nav>{nav.map(([to,Icon,label])=><Link key={to} to={to} onClick={()=>setMenu(false)} className={cx('side-link',active===to&&'active')}><Icon size={17}/>{label}{to==='/app/review'&&<span className="side-shortcut">⌘ K</span>}</Link>)}</nav><small className="nav-label tools-label">PREFERENCES</small><nav><Link to="/app/settings" className={cx('side-link',active==='/app/settings'&&'active')}><Settings size={17}/>Settings</Link><a href="mailto:hello@merge.ai" className="side-link"><HelpCircle size={17}/>Help center</a></nav><div className="sidebar-bottom"><div className="plan-card"><span><Sparkles size={15}/> YOUR WORKSPACE</span><strong>Make more of every review.</strong><small>Build a stronger picture of your code quality over time.</small><Link to="/app/insights">View insights <ArrowRight size={12}/></Link></div><div className="user-menu"><span className="user-avatar">{(user?.name||'U').slice(0,1).toUpperCase()}</span><span className="user-details"><b>{user?.name||'Developer'}</b><small>{user?.email||''}</small></span><button className="signout-button" onClick={logout} aria-label="Sign out"><LogOut size={14}/><span>Sign out</span></button></div></div></aside><div className="workspace-main"><header className="workspace-header"><button className="mobile-menu" onClick={()=>setMenu(true)}><Menu size={19}/></button><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{title}</strong></div><div className="header-actions"><span className="system-status"><i/> All systems normal</span><button className="icon-button" aria-label="Notifications"><Bell size={17}/><i/></button><button className="header-avatar">{(user?.name||'U').slice(0,1).toUpperCase()}</button></div></header><main className="workspace-content"><div className="page-heading"><div><div className="eyebrow">{active==='/app'?'YOUR ENGINEERING AT A GLANCE':'MERGE AI WORKSPACE'}</div><h1>{title}</h1><p>{subtitle}</p></div>{active==='/app'&&<Link to="/app/review" className="button button-dark"><Sparkles size={15}/> New code review</Link>}</div>{children}</main></div><MergeAIBot/></div>;
}

function Dashboard() {
  const {user}=useAuth(); const [stats,setStats]=useState(null);const [trends,setTrends]=useState([]);const [reviews,setReviews]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([analyticsAPI.getDashboardStats(),analyticsAPI.getReviewTrends({period:'day'}),reviewsAPI.getReviews({limit:6})]).then(([s,t,r])=>{setStats(s.data.data);setTrends(t.data.data||[]);setReviews(r.data.data?.reviews||[])}).catch(e=>toast.error(e.response?.data?.message||'Could not load your dashboard')).finally(()=>setLoading(false))},[]);
  const chart=trends.map(x=>({date:x.date,count:x.count,score:x.avgScore||0}));
  return <Shell title="Overview" subtitle={`A clear view of the work you’ve been doing${user?.name?`, ${user.name.split(' ')[0]}`:''}.`} active="/app"><section className="welcome-banner"><div><span><Sparkles size={14}/> YOUR WORK, IN FOCUS</span><h2>Good engineering starts<br/>with the <em>right questions.</em></h2><p>Review code, follow the signals, and decide what deserves your attention next.</p><Link to="/app/review" className="button button-cream">Start a code review <ArrowRight size={15}/></Link></div><div className="welcome-art"><div className="welcome-art-grid"/><div className="welcome-orbit welcome-orbit-a"/><div className="welcome-orbit welcome-orbit-b"/><span className="welcome-symbol"><Code2 size={48}/></span><span className="welcome-sparkle"><Sparkles size={22}/></span><span className="welcome-asterisk">✳</span></div></section><div className="stats-grid"><StatCard label="TOTAL REVIEWS" value={stats?.totalReviews??'—'} detail="Code, considered carefully" icon={FileCode2}/><StatCard label="AVERAGE CODE HEALTH" value={stats?`${stats.averageScore||0}`:'—'} unit={stats?'/ 100':''} detail="Across completed reviews" icon={Activity}/><StatCard label="PRODUCTION READY" value={stats?.productionReady??'—'} detail="Ready to move forward" icon={ShieldCheck}/><StatCard label="RECENT MOMENTUM" value={stats?.recentActivityCount??'—'} detail="Reviews in the last 7 days" icon={Zap}/></div><div className="dashboard-columns"><section className="panel trend-panel"><div className="panel-heading"><div><h3>Review activity</h3><p>Keep an eye on your practice over time</p></div><span className="panel-period">Last 30 days <ChevronDown size={13}/></span></div><div className="trend-chart">{chart.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:14,right:8,left:-22,bottom:0}}><defs><linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#678672" stopOpacity={0.3}/><stop offset="100%" stopColor="#678672" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#eceee9" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickFormatter={fmt} tickLine={false} axisLine={false} tick={{fill:'#898d88',fontSize:11}}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fill:'#898d88',fontSize:11}}/><Tooltip contentStyle={{border:'1px solid #e8e9e5',borderRadius:10,fontSize:12}}/><Area type="monotone" dataKey="count" name="Reviews" stroke="#597b64" strokeWidth={2.3} fill="url(#activityGradient)"/></AreaChart></ResponsiveContainer>:<div className="empty-chart"><BarChart3 size={24}/><b>Your trend line starts with your first review.</b><span>Review some code and your activity will show up here.</span></div>}</div></section><section className="panel score-panel"><div className="panel-heading"><div><h3>Code health</h3><p>Your average review score</p></div><span className="score-icon"><Activity size={16}/></span></div><div className="health-gauge"><div className="gauge-ring" style={{'--score':`${stats?.averageScore||0}%`}}><span>{stats?.averageScore??'—'}<small>/ 100</small></span></div></div><div className="score-note"><span><Sparkles size={14}/></span><p><b>A thoughtful next step</b><small>Each review adds a little more context.</small></p></div><Link to="/app/insights" className="panel-link">View all insights <ArrowRight size={14}/></Link></section></div><section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent reviews</h3><p>Your latest code health check-ins</p></div><Link to="/app/insights" className="panel-link">View all <ArrowRight size={14}/></Link></div>{loading?<SkeletonRows/>:reviews.length?<div className="review-table"><div className="review-row review-table-head"><span>FILE</span><span>LANGUAGE</span><span>REVIEWED</span><span>HEALTH</span><span>STATUS</span><span/></div>{reviews.map(r=><Link to={`/app/insights?review=${r._id}`} className="review-row" key={r._id}><span className="file-cell"><span className="file-icon"><FileCode2 size={15}/></span><b>{r.fileName||'Untitled review'}</b></span><span><span className="language-tag">{r.language}</span></span><span>{fmt(r.createdAt)}</span><span className="review-score">{r.review?.score??'—'} <small>/100</small></span><span><span className={cx('status-tag',r.status)}><i/>{r.status}</span></span><ArrowRight size={15}/></Link>)}</div>:<div className="empty-state"><div><FileCode2 size={20}/></div><b>No reviews just yet</b><span>Start with a snippet you’re curious about.</span><Link to="/app/review" className="button button-dark button-sm">Start a review <ArrowRight size={14}/></Link></div>}</section></Shell>;
}
function StatCard({label,value,unit,detail,icon:Icon}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><i><Icon size={15}/></i></div><strong>{value}<small>{unit}</small></strong><p>{detail}</p></div>}
function SkeletonRows(){return <div className="skeleton-rows"><i/><i/><i/></div>}

function ReviewPage(){
  const [code,setCode]=useState('');
  const [language,setLanguage]=useState('javascript');
  const [fileName,setFileName]=useState('');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState(null);
  const [production,setProduction]=useState(null);
  const [pendingPRFile,setPendingPRFile]=useState(null);
  const [pushOpen,setPushOpen]=useState(false);
  const [reviewOutdated,setReviewOutdated]=useState(false);
  const runReview=async(event)=>{
    event?.preventDefault?.();
    if(!code.trim())return toast.error('Add some code to review first');
    setBusy(true);setResult(null);setProduction(null);setReviewOutdated(false);
    try{const response=await reviewsAPI.createReview({code,language,fileName});setResult(response.data.data);toast.success('Your code review is ready')}
    catch(error){toast.error(error.response?.data?.message||'The review could not be completed')}
    finally{setBusy(false)}
  };
  const selectFile=(event)=>{
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>300000){toast.error('Choose a file smaller than 300 KB');return}
    const reader=new FileReader();reader.onload=()=>{setCode(String(reader.result||''));setReviewOutdated(Boolean(result));setFileName(file.name);const ext=file.name.split('.').pop().toLowerCase();setLanguage(({js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',py:'python',go:'go',java:'java',rb:'ruby',rs:'rust',php:'php'})[ext]||'javascript')};reader.readAsText(file);
  };
  const makeReady=async()=>{if(reviewOutdated)return toast.error('Review the updated code before generating a production rewrite');setBusy(true);try{const response=await reviewsAPI.makeProductionReady(result._id);setProduction(response.data.data);toast.success('Improved code is ready to review')}catch(error){toast.error(error.response?.data?.message||'Could not generate improved code')}finally{setBusy(false)}};
  const applyPatch=(issue)=>{
    const lines=code.split(/\r?\n/);const start=Number(issue.patchStartLine);const end=Number(issue.patchEndLine);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>lines.length)return toast.error('This patch no longer matches the current code. Run a fresh review.');
    const replacement=String(issue.patchReplacement||'').split('\n');
    const updated=[...lines.slice(0,start-1),...(issue.patchReplacement?replacement:[]),...lines.slice(end)].join('\n');
    setCode(updated);setProduction(null);setReviewOutdated(true);toast.success('Patch applied to the editor. Review the updated code before pushing.');
  };
  const prepareImprovedFileForPR=()=>{
    if(!production?.improvedCode)return toast.error('Generate the improved code first');
    const original=String(fileName||'reviewed-code.js').split(/[\\/]/).pop();const dot=original.lastIndexOf('.');const improvedName=dot>0?`${original.slice(0,dot)}.improved${original.slice(dot)}`:`${original}.improved`;
    setPendingPRFile(new File([production.improvedCode],improvedName,{type:'text/plain'}));
    document.getElementById('pull-request-review')?.scrollIntoView({behavior:'smooth',block:'start'});
    toast.success(`Prepared ${improvedName} as a new file. Add a title and create its pull request below.`);
  };
  return <Shell title="Code review" subtitle="Prioritize risk, inspect focused fixes, and verify changes before they ship." active="/app/review">
    <ReviewRulesPanel/>
    <div className="review-layout"><form className="panel editor-panel" onSubmit={runReview}>
      <div className="editor-controls"><div className="field-label">YOUR CODE <span>Paste a snippet or upload a file</span></div><label className="upload-code"><Upload size={14}/> Upload file<input type="file" accept=".js,.jsx,.ts,.tsx,.py,.go,.java,.rb,.rs,.php,.css,.html,.json,.sql,.c,.cpp,.cs" onChange={selectFile}/></label></div>
      <div className="editor-options"><label>Language <select value={language} onChange={event=>{setLanguage(event.target.value);setReviewOutdated(Boolean(result))}}>{['javascript','typescript','python','java','go','rust','ruby','php','csharp','cpp','sql','html','css'].map(item=><option key={item}>{item}</option>)}</select></label><label>File name <input value={fileName} onChange={event=>setFileName(event.target.value)} placeholder="e.g. auth-service.js"/></label></div>
      <div className="code-input-wrap"><div className="code-gutter">{Array.from({length:Math.max(12,code.split('\n').length)},(_,index)=><span key={index}>{String(index+1).padStart(2,'0')}</span>)}</div><textarea className="code-input" spellCheck="false" value={code} onChange={event=>{setCode(event.target.value);setReviewOutdated(Boolean(result))}} placeholder={'// Paste the code you want a second opinion on\n\nfunction getUser(id) {\n  return database.find(id);\n}'} aria-label="Code to review"/></div>
      <div className="editor-footer"><span><ShieldCheck size={14}/> Snippets are scanned, never executed</span><Button type="submit" loading={busy} icon={Sparkles}>Review this code <ArrowRight size={15}/></Button></div>
    </form><aside className="review-side"><div className="review-side-intro"><span className="side-sparkle"><Sparkles size={17}/></span><h3>A second set of eyes.</h3><p>Find high-risk problems first, then inspect safe, focused patches before you push.</p><div className="review-lens"><span><Check size={13}/> Risk and confidence ranking</span><span><Check size={13}/> Secret scan and syntax check</span><span><Check size={13}/> Selective patch suggestions</span><span><Check size={13}/> Production readiness</span></div></div><div className="privacy-note"><ShieldCheck size={16}/><p><b>Private by default</b><small>Linting, tests, and dependency audits run through workflows you configure in GitHub Actions.</small></p></div></aside></div>
    {result&&<CodeReviewResults result={result} outdated={reviewOutdated} onApply={applyPatch} onReReview={()=>runReview()} onMakeReady={makeReady} onPush={()=>setPushOpen(true)} busy={busy}/>}
    {production&&<section className="panel production-result"><div className="panel-heading"><div><h3>Suggested improvements</h3><p>Review the AI generated changes before applying or pushing them.</p></div><button type="button" className="button button-outline" onClick={()=>{navigator.clipboard.writeText(production.improvedCode||'');toast.success('Copied code to clipboard')}}>Copy code</button></div><div className="improved-code"><pre>{production.improvedCode}</pre></div>{production.changes?.length>0&&<ul className="change-list">{production.changes.map((item,index)=><li key={index}><Check size={13}/>{item}</li>)}</ul>}<div className="production-result-actions"><Button type="button" onClick={prepareImprovedFileForPR}><GitBranchIcon/> Use as a new file in a pull request</Button><Button variant="outline" onClick={()=>setPushOpen(true)} className="red-action-button"><Github size={15}/> Push reviewed file</Button></div></section>}
    <PullRequestReview pendingFile={pendingPRFile} onPendingFileUsed={()=>setPendingPRFile(null)}/>
    <PushModal open={pushOpen} onClose={()=>setPushOpen(false)} review={result} content={production?.improvedCode||code}/>
  </Shell>;
}

function ReviewRulesPanel(){
  const [rules,setRules]=useState({securityFocus:'strict',styleGuide:'balanced',framework:'',productionReadiness:true,customInstructions:''});
  const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);
  useEffect(()=>{reviewsAPI.getRules().then(response=>setRules(current=>({...current,...response.data.data}))).catch(()=>{})},[]);
  const save=async(event)=>{event.preventDefault();setSaving(true);try{const response=await reviewsAPI.saveRules(rules);setRules(current=>({...current,...response.data.data}));toast.success('Workspace review rules saved')}catch(error){toast.error(error.response?.data?.message||'Could not save review rules')}finally{setSaving(false)}};
  return <section className="panel review-rules-panel"><div className="review-rules-header"><div><span className="review-rules-icon"><ShieldCheck size={16}/></span><div><h3>Workspace review standards</h3><p>Set the standards applied to your code and pull request reviews.</p></div></div><Button type="button" variant="outline" className={open?'rules-close-button':'red-action-button'} onClick={()=>setOpen(value=>!value)}>{open?'Close rules':'Configure rules'}</Button></div>{open&&<form className="review-rules-form" onSubmit={save}><label>Security focus<select value={rules.securityFocus||'strict'} onChange={event=>setRules({...rules,securityFocus:event.target.value})}><option value="strict">Strict security review</option><option value="balanced">Balanced security review</option></select></label><label>Style guide<select value={rules.styleGuide||'balanced'} onChange={event=>setRules({...rules,styleGuide:event.target.value})}><option value="balanced">Balanced</option><option value="airbnb">Airbnb</option><option value="standard">StandardJS</option><option value="google">Google</option></select></label><label>Framework or platform<input maxLength={80} value={rules.framework||''} onChange={event=>setRules({...rules,framework:event.target.value})} placeholder="e.g. React, Express, Django"/></label><label className="review-rules-toggle"><input type="checkbox" checked={rules.productionReadiness!==false} onChange={event=>setRules({...rules,productionReadiness:event.target.checked})}/> Include production readiness criteria</label><label className="review-rule-custom">Additional standards<textarea maxLength={2000} rows={3} value={rules.customInstructions||''} onChange={event=>setRules({...rules,customInstructions:event.target.value})} placeholder="For example: require parameterized database queries and avoid logging personal data."/></label><Button type="submit" loading={saving}>Save review standards</Button></form>}</section>;
}

function CodeReviewResults({result,outdated,onApply,onReReview,onMakeReady,onPush,busy}){
  const issues=[...(result.review?.issues||[])].sort((a,b)=>(b.riskScore||0)-(a.riskScore||0));
  return <section className="panel result-panel"><div className="result-heading"><div><div className="eyebrow">YOUR REVIEW IS READY</div><h2>{result.fileName||'Code review results'}</h2><p>{result.review?.summary}</p></div><div className="result-score"><span>{result.review?.score??0}</span><small>CODE HEALTH</small></div></div>
    <CodeCheckSummary checks={result.checks}/>
    <div className="result-chips"><span><i className="critical"/>{issues.filter(issue=>issue.severity==='critical').length} critical</span><span><i className="warning"/>{issues.filter(issue=>issue.severity==='warning').length} warnings</span><span><Target size={12}/>{issues.length} observations · ranked by risk</span></div>
    {outdated&&<div className="review-stale-banner"><span><Target size={15}/><b>Code changed after this review.</b> Run the review again to validate the current editor contents before pushing.</span><Button type="button" onClick={onReReview} loading={busy}>Review updated code</Button></div>}
    <div className="result-columns"><div><h3>Highest-risk findings first</h3>{issues.length?issues.map((issue,index)=><article className="issue-card risk-issue-card" key={`${issue.line}-${index}`}><div><span className={cx('issue-dot',issue.severity)}/><b>{issue.message}</b><small>{issue.line?`Line ${issue.line} · `:''}{issue.priority||'P2'} · {issue.impact||issue.severity} impact{issue.confidence!==null&&issue.confidence!==undefined?` · ${issue.confidence}% confidence`:''}</small></div><p>{issue.suggestion}</p>{issue.patchReplacement!==undefined&&issue.patchStartLine&&issue.patchEndLine&&<PatchSuggestion issue={issue} source={result.code||''} onApply={()=>onApply(issue)}/>}</article>):<div className="success-note"><Check size={16}/> No issues surfaced in this pass.</div>}</div><div className="readiness-card"><span className="readiness-icon"><ShieldCheck size={18}/></span><h3>Production readiness</h3><strong>{result.review?.productionReadiness?.score??0}<small>/100</small></strong><p>{result.review?.productionReadiness?.isReady?'This code looks ready for its next step.':'There are a few improvements to consider before shipping.'}</p><ul>{(result.review?.productionReadiness?.checklist||[]).slice(0,5).map((item,index)=><li key={index}><Check size={13}/>{item}</li>)}</ul><Button onClick={onMakeReady} loading={busy} disabled={outdated} className="production-button"><Sparkles size={14}/> Help me improve it</Button></div></div>
    <div className="result-actions"><Button variant="outline" onClick={onPush} disabled={outdated} className="red-action-button"><Github size={15}/> Push to GitHub</Button></div>
  </section>;
}

function CodeCheckSummary({checks}){
  if(!checks)return null;
  const statusLabel=(status)=>status==='passed'?'Passed':status==='failed'?'Failed':status==='issues_found'?'Findings':status==='not_applicable'?'Not applicable':'Not run';
  return <div className="code-check-summary"><div className="code-check-heading"><span><ShieldCheck size={15}/></span><div><b>Fast safety checks</b><small>Static checks only. Uploaded code is never executed.</small></div></div><div className="code-check-items"><span className={cx('check-state',checks.secretScan?.status)}><b>Secret scan</b>{statusLabel(checks.secretScan?.status)}{checks.secretScan?.findings?.length?` · ${checks.secretScan.findings.length}`:''}</span><span className={cx('check-state',checks.syntax?.status)}><b>JavaScript syntax</b>{statusLabel(checks.syntax?.status)}</span></div><p>{checks.ciNote}</p></div>;
}

function PatchSuggestion({issue,source,onApply}){
  const lines=String(source||'').split(/\r?\n/);const removed=lines.slice(issue.patchStartLine-1,issue.patchEndLine);const added=String(issue.patchReplacement||'').split('\n');
  return <details className="patch-suggestion"><summary><span><Code2 size={13}/> Inspect proposed patch</span><small>Lines {issue.patchStartLine}–{issue.patchEndLine}</small></summary><div className="patch-preview"><div><b>Before</b><pre>{removed.map(line=>`− ${line}`).join('\n')||'− (remove selected lines)'}</pre></div><div><b>After</b><pre>{added.filter((line,index)=>issue.patchReplacement||index===0).map(line=>`+ ${line}`).join('\n')||'+ (remove selected lines)'}</pre></div></div><button type="button" className="apply-patch-button" onClick={onApply}>Apply this patch to the editor</button></details>;
}

function PRPatchSuggestion({issue,onApply,loading}){
  const added=String(issue.patchReplacement||'').split('\n');
  return <details className="patch-suggestion pr-patch-suggestion"><summary><span><Code2 size={13}/> Preview suggested fix</span><small>Lines {issue.patchStartLine}–{issue.patchEndLine}</small></summary><div className="patch-preview"><div><b>Current PR code</b><pre>{(issue.patchOriginalLines||[]).map(line=>`− ${line}`).join('\n')}</pre></div><div><b>Suggested code</b><pre>{issue.patchReplacement?added.map(line=>`+ ${line}`).join('\n'):'+ (remove selected lines)'}</pre></div></div><button type="button" className="apply-patch-button" onClick={onApply} disabled={loading}>{loading?'Applying fix…':'Apply this fix to the pull request'}</button></details>;
}

function CreatePullRequestForm({owner,repo,defaultBranch,onCreated,queuedFile,onQueuedFileUsed}){
  const [branches,setBranches]=useState([]);const [base,setBase]=useState('');const [branch,setBranch]=useState('');const [title,setTitle]=useState('');const [body,setBody]=useState('');const [files,setFiles]=useState([]);const [formOpen,setFormOpen]=useState(false);const [loadingBranches,setLoadingBranches]=useState(false);const [creating,setCreating]=useState(false);const [branchError,setBranchError]=useState('');
  useEffect(()=>{if(!owner||!repo)return;let active=true;setLoadingBranches(true);setBranchError('');setBranches([]);setBranch('');setTitle('');setBody('');setFiles([]);githubAPI.getBranches(owner,repo).then(response=>{if(!active)return;const next=response.data.data||[];setBranches(next);const defaultName=next.some(item=>item.name===defaultBranch)?defaultBranch:next[0]?.name||'';setBase(defaultName)}).catch(error=>{if(active)setBranchError(error.response?.data?.message||'Could not load branches for this repository')}).finally(()=>{if(active)setLoadingBranches(false)});return()=>{active=false}},[owner,repo,defaultBranch]);
  useEffect(()=>{if(!queuedFile)return;setFiles(current=>[...current.filter(item=>item.path!==queuedFile.name),{file:queuedFile,path:queuedFile.name}]);setFormOpen(true);onQueuedFileUsed?.()},[queuedFile]);
  const chooseFiles=(event)=>{const selected=Array.from(event.target.files||[]);if(!selected.length)return;const incoming=selected.map(file=>({file,path:file.webkitRelativePath||file.name}));const combined=[...files,...incoming].filter((entry,index,array)=>array.findIndex(item=>item.path===entry.path)===index);const total=combined.reduce((sum,item)=>sum+item.file.size,0);if(combined.length>50){toast.error('Choose up to 50 files for a pull request.');event.target.value='';return}if(total>8*1024*1024){toast.error('Keep the combined upload under 8 MB.');event.target.value='';return}setFiles(combined);event.target.value=''};
  const submit=async(event)=>{event.preventDefault();if(!files.length)return toast.error('Choose the files you want to include in the pull request');if(!base)return toast.error('Choose a target branch');setCreating(true);try{const uploaded=await Promise.all(files.map(async({file,path})=>{const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let index=0;index<bytes.length;index+=0x8000)binary+=String.fromCharCode(...bytes.subarray(index,index+0x8000));return{path,content:btoa(binary),encoding:'base64'}}));const response=await githubAPI.createPullRequestFromFiles({owner,repo,title,branch,base,body,draft:false,files:uploaded});setFiles([]);setTitle('');setBody('');setBranch('');await onCreated(response.data.data)}catch(error){toast.error(error.response?.data?.message||'Could not create the pull request. Check the branch name and repository permissions.')}finally{setCreating(false)}};
  const totalSize=files.reduce((sum,item)=>sum+item.file.size,0);
  return <details className="create-pr-card" open={formOpen} onToggle={event=>setFormOpen(event.currentTarget.open)}><summary><span><GitBranchIcon/> Create a pull request in this app</span><small>Upload changes, create a branch, and open the request</small></summary><form onSubmit={submit}><p className="create-pr-explainer">Choose the files you changed. Merge AI will put them on a new branch based on your target branch, then open the pull request for review.</p>{branchError&&<div className="pr-list-message pr-list-empty" role="alert">{branchError}</div>}<div className="create-pr-grid"><label>Target branch<select value={base} onChange={event=>setBase(event.target.value)} disabled={loadingBranches||!branches.length}><option value="">{loadingBranches?'Loading branches…':'Choose target branch'}</option>{branches.map(item=><option key={item.name} value={item.name}>{item.name}{item.name===defaultBranch?' · default':''}</option>)}</select></label><label>New branch name<input required maxLength={100} value={branch} onChange={event=>setBranch(event.target.value)} placeholder="feature/my-change"/></label><label className="create-pr-wide">Pull request title<input required maxLength={256} value={title} onChange={event=>setTitle(event.target.value)} placeholder="Describe the change"/></label><label className="create-pr-wide">Description<textarea rows={3} maxLength={10000} value={body} onChange={event=>setBody(event.target.value)} placeholder="What changed, and why?"/></label></div><div className="create-pr-upload"><label className="repo-file-picker"><Upload size={15}/><span>Choose changed files<small>Select multiple files</small></span><input type="file" multiple onChange={chooseFiles}/></label><label className="repo-file-picker folder-picker"><FileUp size={15}/><span>Choose a folder<small>Include nested folders</small></span><input type="file" multiple webkitdirectory="" directory="" onChange={chooseFiles}/></label></div>{files.length>0&&<div className="staged-files create-pr-staged"><div><b>{files.length} files selected</b><span>{(totalSize/1024/1024).toFixed(2)} MB of 8 MB</span><button type="button" onClick={()=>setFiles([])}>Clear all</button></div><ul>{files.slice(0,6).map(entry=><li key={entry.path}><FileCode2 size={13}/><span>{entry.path}</span><button type="button" aria-label={`Remove ${entry.path}`} onClick={()=>setFiles(current=>current.filter(item=>item.path!==entry.path))}><X size={13}/></button></li>)}{files.length>6&&<li className="more-files">and {files.length-6} more files</li>}</ul></div>}<div className="create-pr-footer"><small>Up to 50 files · 8 MB total · Existing paths in the target branch will be replaced by the uploaded versions.</small><Button type="submit" loading={creating} disabled={loadingBranches||!base||!branch||!title||!files.length}><GitBranchIcon/> Create branch and pull request</Button></div></form></details>;
}

function PRChangeSummary({summary}){
  if(!summary)return null;
  const groups=[['Changed areas',summary.changedAreas],['Potentially affected',summary.affectedAreas],['What to test',summary.reviewerTests]];
  return <section className="pr-change-summary"><div className="pr-change-summary-heading"><span><ClipboardList size={16}/></span><div><h3>PR change summary</h3><p>AI-generated reviewer guide based on this pull request’s diff</p></div></div><p className="pr-change-overview">{summary.overview}</p><div className="pr-change-grid">{groups.map(([title,items])=><div className="pr-change-group" key={title}><h4>{title}</h4>{items?.length?<ul>{items.map((item,index)=><li key={`${title}-${index}`}>{item}</li>)}</ul>:<p>Nothing specific was identified from the supplied changes.</p>}</div>)}</div></section>;
}

function PullRequestReview({pendingFile,onPendingFileUsed}){
  const [repositories,setRepositories]=useState([]);const [repoFullName,setRepoFullName]=useState('');const [pullRequests,setPullRequests]=useState([]);const [pullNumber,setPullNumber]=useState('');const [pullError,setPullError]=useState('');const [result,setResult]=useState(null);const [context,setContext]=useState(null);const [selectedIssues,setSelectedIssues]=useState([]);const [workflowId,setWorkflowId]=useState('');const [loading,setLoading]=useState(false);const [publishing,setPublishing]=useState(false);const [applyingFix,setApplyingFix]=useState('');const [repoBusy,setRepoBusy]=useState(false);const [closingPull,setClosingPull]=useState(false);const [deletingBranch,setDeletingBranch]=useState(false);
  const pullLoadId=useRef(0);
  useEffect(()=>{githubAPI.getRepos().then(response=>{const repos=response.data.data||[];setRepositories(repos);if(repos[0])setRepoFullName(repos[0].full_name)}).catch(()=>{})},[]);
  const [owner,repo]=repoFullName.split('/');
  const loadPullRequests=async()=>{if(!owner||!repo)return;const requestId=++pullLoadId.current;setRepoBusy(true);setPullError('');setPullRequests([]);setPullNumber('');setResult(null);setContext(null);try{const response=await githubAPI.getPullRequests(owner,repo);if(requestId!==pullLoadId.current)return;const pulls=response.data.data||[];setPullRequests(pulls);if(pulls[0])setPullNumber(String(pulls[0].number));else setPullError('No open pull requests were found in this repository. Open a pull request on GitHub, then refresh this list.')}catch(error){if(requestId===pullLoadId.current)setPullError(error.response?.data?.message||'Could not load pull requests. Check the GitHub connection and repository access, then try again.')}finally{if(requestId===pullLoadId.current)setRepoBusy(false)}};
  useEffect(()=>{loadPullRequests()},[owner,repo]);
  const loadContext=async()=>{if(!owner||!repo||!pullNumber)return;try{const response=await githubAPI.getPullRequestContext(owner,repo,pullNumber);setContext(response.data.data);return response.data.data}catch(error){toast.error(error.response?.data?.message||'Could not refresh CI checks')}};
  const runReview=async(targetPullNumber)=>{const selectedPullNumber=(typeof targetPullNumber==='string'||typeof targetPullNumber==='number')?targetPullNumber:pullNumber;if(!owner||!repo||!selectedPullNumber)return toast.error('Choose a repository and open pull request first');setLoading(true);setResult(null);try{const response=await githubAPI.reviewPullRequest({owner,repo,pullNumber:Number(selectedPullNumber)});const review=response.data.data;setResult(review);setContext(review);setSelectedIssues(review.issues.map((_,index)=>index));toast.success(`Reviewed ${review.filesReviewed} changed files`)}catch(error){toast.error(error.response?.data?.message||'Pull request review failed')}finally{setLoading(false)}};
  const applyFix=async(issue)=>{if(!result||issue.patchReplacement===null||!issue.patchStartLine||!issue.patchEndLine)return;const fixKey=`${issue.path}:${issue.patchStartLine}`;setApplyingFix(fixKey);try{await githubAPI.applyPullRequestFix({owner,repo,pullNumber:Number(pullNumber),headSha:result.pull.headSha,fix:{path:issue.path,startLine:issue.patchStartLine,endLine:issue.patchEndLine,replacement:issue.patchReplacement}});toast.success('Fix committed to the pull request branch. Reviewing the updated PR…');await runReview(String(pullNumber))}catch(error){toast.error(error.response?.data?.message||'Could not apply this fix to the pull request')}finally{setApplyingFix('')}};
  const runWorkflow=async()=>{if(!workflowId)return toast.error('Select a workflow to run');setLoading(true);try{await githubAPI.runPullRequestWorkflow({owner,repo,pullNumber:Number(pullNumber),workflowId});toast.success('GitHub Actions workflow started');await loadContext()}catch(error){toast.error(error.response?.data?.message||'Could not start this workflow. It must support workflow_dispatch.')}finally{setLoading(false)}};
  const publish=async()=>{if(!result)return;setPublishing(true);try{const comments=selectedIssues.map(index=>result.issues[index]).filter(Boolean).map(issue=>({path:issue.path,line:issue.line,body:`**${issue.priority} · ${issue.confidence}% confidence · ${issue.impact} impact**\n\n${issue.message}\n\n**Suggestion:** ${issue.suggestion}`}));await githubAPI.publishPullRequestReview({owner,repo,pullNumber:Number(pullNumber),headSha:result.pull.headSha,body:`Merge AI reviewed ${result.filesReviewed} files. ${result.summary}`,comments});toast.success('Selected findings were published as pull request comments. You can stay here and continue reviewing.')}catch(error){toast.error(error.response?.data?.message||'Could not publish this review. Refresh and review the latest pull request revision.')}finally{setPublishing(false)}};
  const confirmDeleteBranch=(closed)=>{const remove=async()=>{setDeletingBranch(true);try{await githubAPI.deletePullRequestBranch({owner,repo,pullNumber:closed.number,headSha:closed.headSha});toast.success(`Deleted branch ${closed.headRef}`)}catch(error){toast.error(error.response?.data?.message||'Could not delete the source branch')}finally{setDeletingBranch(false)}};toast((item)=><div className="pr-close-confirm"><div><strong>Delete source branch?</strong><p>This removes <code>{closed.headRepo||repo}:{closed.headRef}</code> from GitHub. The pull request is already closed.</p></div><div className="pr-close-confirm-actions"><button type="button" onClick={()=>toast.dismiss(item.id)}>Keep branch</button><button type="button" className="pr-close-confirm-action" disabled={deletingBranch} onClick={()=>{toast.dismiss(item.id);void remove()}}>Delete branch</button></div></div>,{duration:Infinity,position:'top-center',style:{maxWidth:'min(460px, calc(100vw - 32px))',width:'100%',padding:'0',border:'1px solid #e6e9e3',borderRadius:'12px',background:'#fff',color:'#273129',boxShadow:'0 14px 40px #15221924'}})};
  const performClosePull=async(headSha)=>{setClosingPull(true);try{const response=await githubAPI.closePullRequest({owner,repo,pullNumber:Number(pullNumber),headSha});const closed=response.data.data;toast.success(`Pull request #${pullNumber} closed`);toast((item)=><div className="pr-close-confirm"><div><strong>Pull request closed</strong><p>Its source branch <code>{closed.headRepo||repo}:{closed.headRef}</code> is still available.</p></div><div className="pr-close-confirm-actions"><button type="button" onClick={()=>toast.dismiss(item.id)}>Keep branch</button><button type="button" className="pr-close-confirm-action" onClick={()=>{toast.dismiss(item.id);confirmDeleteBranch(closed)}}>Delete source branch</button></div></div>,{duration:Infinity,position:'top-center',style:{maxWidth:'min(460px, calc(100vw - 32px))',width:'100%',padding:'0',border:'1px solid #e6e9e3',borderRadius:'12px',background:'#fff',color:'#273129',boxShadow:'0 14px 40px #15221924'}});setPullRequests(current=>current.filter(pull=>String(pull.number)!==String(pullNumber)));setPullNumber('');setResult(null);setContext(null);setPullError('No open pull requests were found in this repository.')}catch(error){toast.error(error.response?.data?.message||'Could not close this pull request')}finally{setClosingPull(false)}};
  const closePull=()=>{const selected=pullRequests.find(pull=>String(pull.number)===String(pullNumber));const headSha=result?.pull?.headSha||selected?.headSha;if(!headSha)return toast.error('Refresh the pull request list before closing this pull request');toast((item)=><div className="pr-close-confirm"><div><strong>Close pull request #{pullNumber}?</strong><p>This closes it on GitHub. You can reopen it later.</p></div><div className="pr-close-confirm-actions"><button type="button" onClick={()=>toast.dismiss(item.id)}>Keep open</button><button type="button" className="pr-close-confirm-action" onClick={()=>{toast.dismiss(item.id);void performClosePull(headSha)}}>Close pull request</button></div></div>,{duration:Infinity,position:'top-center',style:{maxWidth:'min(440px, calc(100vw - 32px))',width:'100%',padding:'0',border:'1px solid #e6e9e3',borderRadius:'12px',background:'#fff',color:'#273129',boxShadow:'0 14px 40px #15221924'}})};
  const toggleIssue=(index)=>setSelectedIssues(current=>current.includes(index)?current.filter(item=>item!==index):[...current,index]);
  const statusText=(check)=>check.status==='completed'?(check.conclusion||'completed').replaceAll('_',' '):check.status;
  const checkCategory=(name)=>/lint/i.test(name)?'Lint':/test/i.test(name)?'Tests':/audit|dependab/i.test(name)?'Dependency audit':/secret|codeql|security|scan/i.test(name)?'Security scan':'CI';
  return <section className="panel pr-review-panel" id="pull-request-review"><div className="pr-review-title"><span><Github size={17}/></span><div><h2>Pull request review</h2><p>Review changed lines, inspect existing CI and security results, then publish selected findings as inline comments.</p></div></div>{repositories.length?<><div className="pr-selectors"><label>Repository<select value={repoFullName} onChange={event=>setRepoFullName(event.target.value)}>{repositories.map(item=><option key={item.id} value={item.full_name}>{item.full_name}</option>)}</select></label><label>Open pull request<select value={pullNumber} onChange={event=>{setPullNumber(event.target.value);setResult(null);setContext(null)}} disabled={repoBusy||!pullRequests.length}><option value="">{repoBusy?'Loading pull requests…':'Choose a pull request'}</option>{pullRequests.map(pull=><option key={pull.number} value={pull.number}>#{pull.number} · {pull.title}</option>)}</select></label><Button type="button" variant="outline" className="pr-refresh-button" onClick={loadPullRequests} loading={repoBusy} disabled={!repoFullName}><RefreshCw size={14}/> Refresh PRs</Button><Button type="button" onClick={()=>runReview()} loading={loading} disabled={!pullNumber}><Sparkles size={14}/> Review pull request</Button><Button type="button" variant="danger" className="red-action-button pr-close-button" onClick={closePull} loading={closingPull} disabled={!pullNumber||loading||repoBusy}><X size={14}/> Close pull request</Button></div><CreatePullRequestForm owner={owner} repo={repo} defaultBranch={repositories.find(item=>item.full_name===repoFullName)?.defaultBranch} queuedFile={pendingFile} onQueuedFileUsed={onPendingFileUsed} onCreated={async pull=>{await loadPullRequests();setPullNumber(String(pull.number));setResult(null);setContext(null);await runReview(String(pull.number))}}/>{pullError&&<div className={cx('pr-list-message',pullRequests.length?'':'pr-list-empty')} role="status">{pullRequests.length>0?<span>{pullError}</span>:<><span>{pullError}</span><a href={`https://github.com/${repoFullName}/pulls`} target="_blank" rel="noreferrer">Open pull requests on GitHub <ExternalLink size={12}/></a></>}</div>}</>:<div className="pr-connect-note"><Github size={17}/><span>Connect GitHub from <Link to="/app/integrations">Integrations</Link> to review pull requests.</span></div>}
    {context&&<details className="pr-ci-panel"><summary className="pr-ci-summary"><span><Zap size={15}/> CI and security status</span><small>{context.checks?.length||0} CI checks · {(context.security?.dependencyAlerts?.available?1:0)+(context.security?.codeScanningAlerts?.available?1:0)+(context.security?.secretScanningAlerts?.available?1:0)} security sources available</small><ChevronDown size={14}/></summary><div className="pr-ci-content"><div className="pr-ci-header"><div><h3>Signals for commit <code>{context.pull.headSha.slice(0,8)}</code></h3><p>These repository checks are separate from the AI review and do not prevent it from running.</p></div><button type="button" onClick={loadContext}>Refresh checks</button></div><div className="security-alert-grid">{[['Dependency alerts',context.security?.dependencyAlerts],['Code scanning',context.security?.codeScanningAlerts],['Secret scanning',context.security?.secretScanningAlerts]].map(([label,data])=><div key={label}><b>{label}</b><strong>{data?.available?data.count:'Unavailable'}</strong><small>{data?.available?'Open alerts':'Not enabled or not accessible for this repository'}</small></div>)}</div>{context.checks?.length?<div className="pr-check-list">{context.checks.map((check,index)=><a key={`${check.name}-${index}`} href={check.htmlUrl||undefined} target="_blank" rel="noreferrer"><span>{check.name}<small>{checkCategory(check.name)}</small></span><b className={cx('check-conclusion',check.conclusion||check.status)}>{statusText(check)}</b></a>)}</div>:<p className="no-pr-checks">No check runs have reported for this commit. The AI review still works; repository checks appear here after a CI workflow runs.</p>}{context.workflows?.length>0?<div className="workflow-run-controls"><label>Run a repository workflow<select value={workflowId} onChange={event=>setWorkflowId(event.target.value)}><option value="">Choose a workflow</option>{context.workflows.map(workflow=><option key={workflow.id} value={workflow.id}>{workflow.name} · {workflow.path.split('/').pop()}</option>)}</select></label><Button onClick={runWorkflow} loading={loading} disabled={!workflowId}><Zap size={14}/> Run workflow</Button></div>:<p className="no-pr-checks">No active GitHub Actions workflows were found for this repository.</p>}<small className="workflow-disclaimer">Unavailable security alerts usually mean the GitHub feature is off or this connection cannot read it. Secret scanning shows 0 because there are no open alerts the app can see.</small></div></details>}
    {result&&<div className="pr-review-results"><PRChangeSummary summary={result.changeSummary}/><div className="pr-result-heading"><div><span className="eyebrow">AI REVIEW · {result.filesReviewed} CHANGED FILES · {result.relatedFilesReviewed||0} CONTEXT FILES</span><h3>Risk-ranked findings</h3><p>{result.summary||'No summary was returned.'}</p>{result.filesSkipped>0&&<small>{result.filesSkipped} file(s) had no readable diff or were outside the review limit.</small>}</div><a href={result.pull.htmlUrl} target="_blank" rel="noreferrer">Open pull request <ExternalLink size={13}/></a></div>{result.issues.length?<><div className="pr-finding-list">{result.issues.map((issue,index)=><article className="pr-finding" key={`${issue.path}-${issue.line}-${index}`}><label><input type="checkbox" checked={selectedIssues.includes(index)} onChange={()=>toggleIssue(index)}/></label><div><span className="pr-finding-meta"><b>{issue.priority}</b><span>{issue.path}:{issue.line}</span><span>{issue.confidence}% confidence</span>{issue.source&&<em>{issue.source}</em>}</span><h4>{issue.message}</h4><p>{issue.suggestion}</p>{issue.patchStartLine&&issue.patchEndLine&&<PRPatchSuggestion issue={issue} onApply={()=>applyFix(issue)} loading={applyingFix===`${issue.path}:${issue.patchStartLine}`}/>}</div></article>)}</div><div className="pr-publish-row"><small>Selected {selectedIssues.length} of {result.issues.length} findings for inline comments.</small><Button onClick={publish} loading={publishing} disabled={!selectedIssues.length}><Github size={14}/> Publish selected review</Button></div></>:<div className="success-note"><Check size={15}/> No review findings on changed lines. Check CI and repository security alerts above.</div>}</div>}
  </section>;
}
function PushModal({open,onClose,review,content}){const [repos,setRepos]=useState([]);const [selected,setSelected]=useState('');const [busy,setBusy]=useState(false);useEffect(()=>{if(open)githubAPI.getRepos().then(r=>{const data=r.data.data||[];setRepos(data);if(data[0])setSelected(data[0].full_name)}).catch(e=>toast.error(e.response?.data?.message||'Connect GitHub first'))},[open]);if(!open)return null;const push=async()=>{if(!review||!selected)return;const [owner,repo]=selected.split('/');setBusy(true);try{await githubAPI.pushToRepo({owner,repo,path:review.fileName||'reviewed-code.txt',content:content||review.code,message:'Reviewed with Merge AI'});toast.success('Code pushed to GitHub');onClose()}catch(e){toast.error(e.response?.data?.message||'Push failed')}finally{setBusy(false)}};return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><span className="modal-icon"><Github size={20}/></span><h2>Push to GitHub</h2><p>Send this reviewed file to one of your repositories.</p>{repos.length?<><label className="modal-label">Repository<select value={selected} onChange={e=>setSelected(e.target.value)}>{repos.map(r=><option value={r.full_name} key={r.id}>{r.full_name}</option>)}</select></label><Button loading={busy} onClick={push} className="modal-action red-action-button">Push reviewed code <ArrowRight size={15}/></Button></>:<Link to="/app/integrations" className="button button-dark modal-action">Connect GitHub <ArrowRight size={15}/></Link>}</div></div>}

function InsightsPage(){
  const [section,setSection]=useState('code');
  const [data,setData]=useState({stats:null,trends:[],languages:[],scores:[]});
  const [resume,setResume]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.allSettled([
      analyticsAPI.getDashboardStats(),analyticsAPI.getReviewTrends({period:'week'}),
      analyticsAPI.getLanguageDistribution(),analyticsAPI.getScoreDistribution(),analyticsAPI.getResumeInsights(),
    ]).then(([stats,trends,languages,scores,resumes])=>{
      setData({stats:stats.status==='fulfilled'?stats.value.data.data:null,trends:trends.status==='fulfilled'?trends.value.data.data:[],languages:languages.status==='fulfilled'?languages.value.data.data:[],scores:scores.status==='fulfilled'?scores.value.data.data:[]});
      setResume(resumes.status==='fulfilled'?resumes.value.data.data:null);
    }).finally(()=>setLoading(false));
  },[]);
  const resumeMax=Math.max(1,...(resume?.topSkills||[]).map(item=>item.count));
  return <Shell title="Insights" subtitle="Separate views for your code quality and career progress." active="/app/insights">
    <div className="insight-tabs" role="tablist" aria-label="Insight categories">
      <button type="button" role="tab" aria-selected={section==='code'} className={section==='code'?'active':''} onClick={()=>setSection('code')}><Code2 size={16}/><span><b>Code review</b><small>Quality, scores & languages</small></span></button>
      <button type="button" role="tab" aria-selected={section==='resume'} className={section==='resume'?'active':''} onClick={()=>setSection('resume')}><Briefcase size={16}/><span><b>Resume</b><small>Profile strength & role matches</small></span></button>
    </div>
    {section==='code'?<div className="insight-section" role="tabpanel">
      <div className="insights-section-heading"><div><span className="eyebrow">ENGINEERING QUALITY</span><h2>Your code review progress</h2><p>Track quality signals across the code you’ve reviewed.</p></div><Link to="/app/review" className="button button-dark"><Sparkles size={14}/> Start a review</Link></div>
      <div className="insights-summary"><div><span>AVERAGE CODE HEALTH</span><strong>{loading?'—':data.stats?.averageScore??'—'}<small>/ 100</small></strong><p>Across your completed reviews</p></div><div><span>REVIEWS COMPLETED</span><strong>{loading?'—':data.stats?.completedReviews??'—'}</strong><p>Reviews with results ready</p></div><div><span>PRODUCTION READY</span><strong>{loading?'—':data.stats?.productionReadyPercentage??'—'}<small>%</small></strong><p>Meeting readiness criteria</p></div></div>
      <div className="insights-grid"><section className="panel insight-panel"><div className="panel-heading"><div><h3>Review quality over time</h3><p>Average health score by week</p></div><span className="insight-icon"><Activity size={15}/></span></div><div className="insight-chart">{loading?<div className="empty-chart">Loading code review history…</div>:data.trends.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trends} margin={{top:15,right:10,left:-20,bottom:0}}><defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#688674" stopOpacity={0.26}/><stop offset="100%" stopColor="#688674" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#eceee9" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill:'#898d88',fontSize:11}}/><YAxis domain={[0,100]} tickLine={false} axisLine={false} tick={{fill:'#898d88',fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="avgScore" name="Average score" stroke="#587a63" strokeWidth={2.2} fill="url(#scoreGradient)"/></AreaChart></ResponsiveContainer>:<div className="empty-chart"><Activity size={20}/><b>Your score history will appear here</b><span>Complete a few reviews to see patterns.</span></div>}</div></section>
      <section className="panel insight-panel language-panel"><div className="panel-heading"><div><h3>Languages in focus</h3><p>What you’ve been reviewing</p></div><span className="insight-icon"><Code2 size={15}/></span></div>{data.languages.length?<div className="language-list">{data.languages.map((item,index)=><div className="language-row" key={item.language}><span className={`language-color color-${index%5}`}/><span>{item.language}</span><strong>{item.count}</strong><small>avg. {item.avgScore}</small></div>)}</div>:<div className="empty-small">Complete a review to see your language mix.</div>}</section>
      <section className="panel insight-panel score-distribution"><div className="panel-heading"><div><h3>Score distribution</h3><p>Code health score ranges</p></div><span className="insight-icon"><BarChart3 size={15}/></span></div><div className="score-bars">{data.scores?.map(item=><div className="score-bar" key={item.range}><span>{item.range}</span><i style={{height:`${Math.max(7,Math.min(100,item.count*18))}%`}}/><b>{item.count}</b></div>)}</div></section>
      <section className="panel insight-panel insight-callout"><span><Sparkles size={17}/></span><div><h3>Make your next review count.</h3><p>Review a code snippet to spot risks, understand quality, and get practical next steps.</p><Link to="/app/review" className="panel-link">Review code <ArrowRight size={14}/></Link></div></section></div>
    </div>:<div className="insight-section resume-insight-section" role="tabpanel">
      <div className="insights-section-heading"><div><span className="eyebrow">CAREER MOMENTUM</span><h2>Your resume insights</h2><p>See how your profile is shaping up and where to focus next.</p></div><Link to="/app/career" className="button button-dark"><Briefcase size={14}/> Open career studio</Link></div>
      <div className="insights-summary resume-insight-summary"><div><span>RESUMES ANALYZED</span><strong>{loading?'—':resume?.analyzedCount??0}<small> / {resume?.resumeCount??0}</small></strong><p>Profiles with an AI analysis</p></div><div><span>AVERAGE PROFILE SCORE</span><strong>{loading?'—':resume?.averageScore??0}<small>/ 100</small></strong><p>Based on resume feedback</p></div><div><span>AVERAGE ROLE MATCH</span><strong>{loading?'—':resume?.averageMatchScore??0}<small>%</small></strong><p>Across recommended roles</p></div></div>
      <div className="insights-grid resume-insights-grid"><section className="panel insight-panel resume-trend-panel"><div className="panel-heading"><div><h3>Resume activity</h3><p>Uploads and profile score by month</p></div><span className="insight-icon resume-insight-icon"><Activity size={15}/></span></div><div className="insight-chart">{loading?<div className="empty-chart">Loading resume insights…</div>:resume?.trend?.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={resume.trend} margin={{top:15,right:10,left:-20,bottom:0}}><defs><linearGradient id="resumeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bb8965" stopOpacity={0.25}/><stop offset="100%" stopColor="#bb8965" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#f0ebe6" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fill:'#898d88',fontSize:11}}/><YAxis yAxisId="score" domain={[0,100]} tickLine={false} axisLine={false} tick={{fill:'#898d88',fontSize:11}}/><YAxis yAxisId="uploads" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} tick={{fill:'#898d88',fontSize:11}}/><Tooltip/><Area yAxisId="score" type="monotone" dataKey="avgScore" name="Average profile score" stroke="#b47c54" strokeWidth={2.2} fill="url(#resumeGradient)"/><Area yAxisId="uploads" type="monotone" dataKey="count" name="Resumes uploaded" stroke="#839985" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer>:<div className="empty-chart"><Briefcase size={20}/><b>Your resume activity will appear here</b><span>Upload a resume in Career studio to start tracking progress.</span></div>}</div></section>
      <section className="panel insight-panel resume-skills-panel"><div className="panel-heading"><div><h3>Your strongest skills</h3><p>Most frequently found in your resumes</p></div><span className="insight-icon resume-insight-icon"><Target size={15}/></span></div>{resume?.topSkills?.length?<div className="resume-skill-list">{resume.topSkills.map(item=><div className="resume-skill-row" key={item.skill}><div><span>{item.skill}</span><small>{item.count} mention{item.count===1?'':'s'}</small></div><i><b style={{width:`${Math.max(8,item.count/resumeMax*100)}%`}}/></i></div>)}</div>:<div className="empty-small">Upload a resume to uncover your most represented skills.</div>}</section>
      <section className="panel insight-panel resume-recommendation-card"><span className="resume-recommendation-icon"><Sparkles size={17}/></span><div><span className="eyebrow">NEXT CAREER STEP</span><h3>{resume?.recommendationCount?`${resume.recommendationCount} role recommendations ready`:'Find roles that fit your profile'}</h3><p>{resume?.recommendationCount?'Compare your skills with relevant roles, then save the ones you want to pursue.':'Upload your resume to get AI-powered role recommendations and profile feedback.'}</p><Link to="/app/career" className="panel-link">Go to Career studio <ArrowRight size={14}/></Link></div></section></div>
    </div>}
  </Shell>;
}
function CareerPage(){
  const [resumes,setResumes]=useState([]);
  const [selected,setSelected]=useState(null);
  const [jobs,setJobs]=useState([]);
  const [applications,setApplications]=useState([]);
  const [preferences,setPreferences]=useState({location:'',remotePreference:'any',seniority:'any',salaryMin:'',salaryMax:'',currency:'USD'});
  const [jobDescription,setJobDescription]=useState('');
  const [gap,setGap]=useState(null);
  const [busy,setBusy]=useState(false);
  const [gapBusy,setGapBusy]=useState(false);
  const [savingPreferences,setSavingPreferences]=useState(false);
  const [loading,setLoading]=useState(true);
  const [preferenceSaved,setPreferenceSaved]=useState(false);

  useEffect(()=>{
    let active=true;
    Promise.allSettled([resumeAPI.getResumes(),careerAPI.getPreferences(),careerAPI.getApplications()]).then(([resumeResult,prefResult,applicationResult])=>{
      if(!active)return;
      if(resumeResult.status==='fulfilled'){
        const items=resumeResult.value.data.data||[];
        setResumes(items);
        if(items.length){setSelected(items[0]);setJobs(items[0].jobRecommendations||[])}
      } else toast.error(resumeResult.reason.response?.data?.message||'Could not load resumes');
      if(prefResult.status==='fulfilled')setPreferences(current=>({...current,...prefResult.value.data.data,salaryMin:prefResult.value.data.data.salaryMin??'',salaryMax:prefResult.value.data.data.salaryMax??''}));
      if(applicationResult.status==='fulfilled')setApplications(applicationResult.value.data.data||[]);
      else toast.error(applicationResult.reason.response?.data?.message||'Could not load your application tracker');
    }).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  const upload=async(file)=>{
    const fd=new FormData();fd.append('resume',file);
    try{const response=await resumeAPI.uploadResume(fd);const resume=response.data.data;setSelected(resume);setJobs(resume.jobRecommendations||[]);setGap(null);setResumes(current=>[resume,...current]);toast.success('Resume analyzed')}
    catch(error){toast.error(error.response?.data?.message||'Resume analysis failed');throw error}
  };
  const selectResume=(resume)=>{setSelected(resume);setJobs(resume.jobRecommendations||[]);setGap(null)};
  const savePreferences=async(event)=>{
    event.preventDefault();setSavingPreferences(true);setPreferenceSaved(false);
    try{const response=await careerAPI.savePreferences(preferences);setPreferences(current=>({...current,...response.data.data,salaryMin:response.data.data.salaryMin??'',salaryMax:response.data.data.salaryMax??''}));setPreferenceSaved(true);toast.success('Job matching preferences saved')}
    catch(error){toast.error(error.response?.data?.message||'Could not save preferences')}
    finally{setSavingPreferences(false)}
  };
  const getJobs=async()=>{
    if(!selected)return;setBusy(true);
    try{const response=await resumeAPI.getJobRecommendations(selected._id);const recommendations=response.data.data||[];setJobs(recommendations);setSelected(current=>current?({...current,jobRecommendations:recommendations}):current);setResumes(current=>current.map(resume=>resume._id===selected._id?({...resume,jobRecommendations:recommendations}):resume));toast.success('Role ideas matched to your preferences')}
    catch(error){toast.error(error.response?.data?.message||'Could not get recommendations')}
    finally{setBusy(false)}
  };
  const analyzeGap=async(event)=>{
    event.preventDefault();if(!selected)return;setGapBusy(true);setGap(null);
    try{const response=await resumeAPI.analyzeRoleFit(selected._id,jobDescription);setGap(response.data.data);toast.success('Role fit analysis is ready')}
    catch(error){toast.error(error.response?.data?.message||'Could not compare this role')}
    finally{setGapBusy(false)}
  };
  const saveJob=async(job)=>{
    const duplicate=applications.some(application=>application.title.toLowerCase()===String(job.title||'').toLowerCase()&&application.company.toLowerCase()===String(job.company||'').toLowerCase());
    if(duplicate){toast('This role is already in your tracker');return}
    try{const response=await careerAPI.saveApplication({resume:selected?._id,title:job.title,company:job.company||'Company not specified',url:job.url||'',location:job.location||preferences.location,workMode:job.workMode||'flexible',matchScore:job.matchScore});setApplications(current=>[response.data.data,...current]);toast.success('Role saved to your application tracker')}
    catch(error){toast.error(error.response?.data?.message||'Could not save this role')}
  };
  const updateApplication=async(id,changes)=>{
    try{const response=await careerAPI.updateApplication(id,changes);setApplications(current=>current.map(item=>item._id===id?response.data.data:item));return true}
    catch(error){toast.error(error.response?.data?.message||'Could not update this application');return false}
  };
  const removeApplication=async(id)=>{
    try{await careerAPI.deleteApplication(id);setApplications(current=>current.filter(item=>item._id!==id));toast.success('Role removed from your tracker')}
    catch(error){toast.error(error.response?.data?.message||'Could not remove this role')}
  };
  const addApplication=async(formData)=>{
    try{const response=await careerAPI.saveApplication(formData);setApplications(current=>[response.data.data,...current]);toast.success('Role added to your tracker');return true}
    catch(error){toast.error(error.response?.data?.message||'Could not add this role');return false}
  };

  return <Shell title="Career studio" subtitle="Match roles to your goals, understand your fit, and keep every application moving." active="/app/career">
    <div className="career-layout career-studio-layout">
      <section className="career-main">
        <div className="panel career-upload-panel"><div className="career-panel-heading"><span className="career-panel-icon"><FileUp size={18}/></span><div><h3>Your resume, with a fresh perspective.</h3><p>Upload a text-based PDF to explore your strengths and roles that fit.</p></div></div><FileUpload accept={{'application/pdf':['.pdf']}} maxSize={8*1024*1024} label="Drop a resume PDF here, or browse files" onUpload={upload}/><small className="upload-privacy"><ShieldCheck size={13}/> Only text-based PDFs · Max 8 MB · Private to your workspace</small></div>
        <div className="panel resume-list-panel"><div className="panel-heading"><div><h3>Resume history</h3><p>Your recent resume analyses</p></div></div>{loading?<SkeletonRows/>:resumes.length?<div className="resume-list">{resumes.map(resume=><button className={cx('resume-item',selected?._id===resume._id&&'selected')} key={resume._id} onClick={()=>selectResume(resume)}><span className="resume-file-icon"><FileCode2 size={16}/></span><span><b>{resume.fileName}</b><small>{new Date(resume.createdAt).toLocaleDateString()} · {resume.skills?.length||0} skills found</small></span><strong>{resume.analysis?.overallScore??0}<small>/100</small></strong><ArrowRight size={14}/></button>)}</div>:<div className="empty-small">Upload a resume to start building your career profile.</div>}</div>
        {selected&&<div className="panel resume-analysis"><div className="panel-heading"><div><h3>Resume insights</h3><p>{selected.fileName}</p></div><span className="resume-score">{selected.analysis?.overallScore??0}<small>/100</small></span></div><div className="analysis-columns"><div><h4>Strengths</h4>{(selected.analysis?.strengths||[]).map((item,index)=><p className="analysis-point" key={index}><Check size={13}/>{item}</p>)}</div><div><h4>Ideas to explore</h4>{(selected.analysis?.suggestions||[]).map((item,index)=><p className="analysis-point" key={index}><Sparkles size={13}/>{item}</p>)}</div></div><div className="skill-cloud">{selected.skills?.map(skill=><span key={skill}>{skill}</span>)}</div></div>}
        <section className="panel role-fit-panel"><div className="career-feature-heading"><span><Target size={17}/></span><div><h3>Resume-to-role fit</h3><p>Compare your selected resume with a job description. Get evidence-based strengths, gaps, and next steps.</p></div></div><form onSubmit={analyzeGap}><label className="career-field-label">JOB DESCRIPTION<textarea value={jobDescription} onChange={event=>setJobDescription(event.target.value)} rows={7} maxLength={12000} placeholder="Paste the job description here. Include responsibilities and requirements for a more useful comparison."/></label><div className="career-form-footer"><small>{jobDescription.length.toLocaleString()} / 12,000 characters · Minimum 80</small><Button type="submit" loading={gapBusy} disabled={!selected||jobDescription.trim().length<80}><Sparkles size={14}/> Analyze role fit</Button></div></form>{gap&&<RoleFitResults result={gap}/>}</section>
        <ApplicationTracker applications={applications} onUpdate={updateApplication} onDelete={removeApplication} onAdd={addApplication}/>
      </section>
      <aside className="career-aside">
        <form className="panel preference-panel" onSubmit={savePreferences}><div className="career-feature-heading"><span><Search size={17}/></span><div><h3>Job matching controls</h3><p>Tell us what a good next role looks like.</p></div></div><label className="career-field-label">LOCATION<div className="career-input-icon"><MapPin size={14}/><input value={preferences.location||''} maxLength={100} placeholder="City, region, or anywhere" onChange={event=>setPreferences({...preferences,location:event.target.value})}/></div></label><label className="career-field-label">WORK STYLE<select value={preferences.remotePreference||'any'} onChange={event=>setPreferences({...preferences,remotePreference:event.target.value})}><option value="any">Any work style</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label><label className="career-field-label">SENIORITY<select value={preferences.seniority||'any'} onChange={event=>setPreferences({...preferences,seniority:event.target.value})}><option value="any">Any level</option><option value="intern">Internship</option><option value="junior">Junior</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="lead">Lead / Principal</option></select></label><div className="career-field-label">ANNUAL SALARY RANGE<div className="salary-controls"><select aria-label="Salary currency" value={preferences.currency||'USD'} onChange={event=>setPreferences({...preferences,currency:event.target.value})}><option>USD</option><option>INR</option><option>EUR</option><option>GBP</option></select><input type="number" min="0" value={preferences.salaryMin??''} placeholder="Minimum" onChange={event=>setPreferences({...preferences,salaryMin:event.target.value})}/><span>to</span><input type="number" min="0" value={preferences.salaryMax??''} placeholder="Maximum" onChange={event=>setPreferences({...preferences,salaryMax:event.target.value})}/></div></div><div className="preference-submit"><Button type="submit" loading={savingPreferences}>Save preferences</Button>{preferenceSaved&&<span><Check size={13}/> Saved</span>}</div></form>
        <div className="jobs-card"><span className="jobs-spark"><Briefcase size={17}/></span><h3>Explore matching roles.</h3><p>Get role ideas based on your resume, location, work style, seniority, and salary range.</p><Button onClick={getJobs} loading={busy} disabled={!selected} className="jobs-button">Find matching roles <ArrowRight size={14}/></Button><small>AI role suggestions, not live vacancies. Add a real listing link when you save a role.</small></div>
        {jobs.length>0&&<div className="panel job-list"><div className="panel-heading"><div><h3>Role ideas</h3><p>{jobs.length} suggestions based on {selected?.fileName}</p></div></div>{jobs.map((job,index)=>{const alreadySaved=applications.some(application=>application.title.toLowerCase()===String(job.title||'').toLowerCase()&&application.company.toLowerCase()===String(job.company||'').toLowerCase());return <article className="job-row career-job-row" key={`${job.title}-${index}`}><div><b>{job.title}</b><small>{job.company||'Company type not specified'}</small><p>{job.description}</p><div className="job-skills">{job.requiredSkills?.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div><div className="job-meta"><span><MapPin size={12}/>{job.location||preferences.location||'Flexible location'}</span><span>{job.workMode||'Flexible'}</span></div><small className="job-salary">{job.seniority||'Experience varies'} · {job.salaryRange||'Salary not specified'}</small></div><div className="job-score-actions"><strong>{job.matchScore}%<small>match</small></strong><button type="button" className={cx('career-save-job',alreadySaved&&'saved')} disabled={alreadySaved} onClick={()=>saveJob(job)} aria-label={alreadySaved?'Already saved':'Save role to application tracker'}>{alreadySaved?<Check size={15}/>:<BookmarkPlus size={15}/>}<span>{alreadySaved?'Saved':'Save'}</span></button></div></article>})}</div>}
        <div className="career-disclaimer"><ShieldCheck size={14}/><span>Recommendations and fit scores are informational. Verify job details and use your judgment before applying.</span></div>
      </aside>
    </div>
  </Shell>;
}

function RoleFitResults({result}){
  const groups=[['What already matches',result.matchedSkills,Check],['Skills to address',result.missingSkills,Target],['Resume improvements',result.resumeImprovements,Sparkles],['Interview preparation',result.interviewFocus,Briefcase]];
  return <div className="role-fit-results"><div className="role-fit-score"><div><span>ROLE MATCH</span><strong>{result.matchScore}<small>/100</small></strong></div><p>{result.summary}</p></div><div className="role-fit-strengths"><h4>Evidence from your resume</h4>{(result.strengths||[]).map((item,index)=><p className="analysis-point" key={index}><Check size={13}/>{item}</p>)}{(result.gaps||[]).map((item,index)=><p className="analysis-point gap-point" key={`gap-${index}`}><Target size={13}/>{item}</p>)}</div><div className="role-fit-groups">{groups.map(([title,items,Icon])=><section key={title}><h4><Icon size={14}/>{title}</h4>{items?.length?<ul>{items.map((item,index)=><li key={index}>{item}</li>)}</ul>:<p>No specific items surfaced.</p>}</section>)}</div></div>;
}

function ApplicationTracker({applications,onUpdate,onDelete,onAdd}){
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({title:'',company:'',url:'',location:''});
  const submit=async(event)=>{event.preventDefault();setSaving(true);const added=await onAdd(form);setSaving(false);if(added){setForm({title:'',company:'',url:'',location:''});setShowForm(false)}};
  const stages=['saved','applied','interview','offer','rejected'];
  return <section className="panel application-tracker"><div className="panel-heading"><div><h3><ClipboardList size={16}/> Application tracker</h3><p>Keep your saved roles, application stages, and notes together.</p></div><Button type="button" variant="outline" className="tracker-add-button red-action-button" onClick={()=>setShowForm(value=>!value)}>{showForm?'Close':'Add a role'}</Button></div>{showForm&&<form className="manual-role-form" onSubmit={submit}><label>Job title<input required maxLength={160} value={form.title} onChange={event=>setForm({...form,title:event.target.value})} placeholder="e.g. Software Engineer"/></label><label>Company<input required maxLength={160} value={form.company} onChange={event=>setForm({...form,company:event.target.value})} placeholder="Company name"/></label><label>Job link<input type="url" value={form.url} onChange={event=>setForm({...form,url:event.target.value})} placeholder="https://…"/></label><label>Location<input value={form.location} onChange={event=>setForm({...form,location:event.target.value})} placeholder="Remote, city, or region"/></label><Button type="submit" loading={saving}>Save role</Button></form>}{applications.length?<div className="application-list">{applications.map(application=><ApplicationTrackerRow key={application._id} application={application} onUpdate={onUpdate} onDelete={onDelete} stages={stages}/>)}</div>:<div className="application-empty"><span><Briefcase size={18}/></span><b>Your next opportunity starts here.</b><p>Save a suggested role or add one manually to start tracking your search.</p></div>}</section>;
}

function ApplicationTrackerRow({application,onUpdate,onDelete,stages}){
  const [notes,setNotes]=useState(application.notes||'');
  const [saving,setSaving]=useState(false);
  useEffect(()=>setNotes(application.notes||''),[application.notes]);
  const saveNotes=async()=>{setSaving(true);await onUpdate(application._id,{notes});setSaving(false)};
  return <article className="application-card"><div className="application-card-top"><div><h4>{application.title}</h4><span>{application.company}</span><p>{application.location||'Location flexible'}{application.workMode&&application.workMode!=='flexible'?` · ${application.workMode}`:''}{application.matchScore!==null&&application.matchScore!==undefined?` · ${application.matchScore}% match`:''}</p></div><div className="application-card-actions">{application.url&&<a href={application.url} target="_blank" rel="noreferrer" aria-label="Open job listing"><ExternalLink size={15}/></a>}<button type="button" onClick={()=>onDelete(application._id)} aria-label={`Remove ${application.title}`}><Trash2 size={15}/></button></div></div><div className="application-card-controls"><label>STAGE<select value={application.stage} onChange={event=>onUpdate(application._id,{stage:event.target.value})}>{stages.map(stage=><option key={stage} value={stage}>{stage.charAt(0).toUpperCase()+stage.slice(1)}</option>)}</select></label><label className="application-notes">NOTES<textarea rows={2} maxLength={4000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Add a contact, follow-up date, or interview note"/></label></div>{notes!==(application.notes||'')&&<button type="button" className="save-notes-button" disabled={saving} onClick={saveNotes}>{saving?'Saving…':'Save notes'}</button>}</article>;
}
function CreateRepositoryForm({onCreated}) {
  const [busy,setBusy]=useState(false);const [files,setFiles]=useState([]);
  const chooseFiles=(e)=>{const selected=Array.from(e.target.files||[]);if(!selected.length)return;const incoming=selected.map(file=>({file,path:file.webkitRelativePath||file.name}));const combined=[...files,...incoming].filter((entry,index,array)=>array.findIndex(x=>x.path===entry.path)===index);const total=combined.reduce((sum,item)=>sum+item.file.size,0);if(combined.length>50){toast.error('Choose up to 50 files per repository upload.');e.target.value='';return}if(total>8*1024*1024){toast.error('Keep the combined upload under 8 MB.');e.target.value='';return}setFiles(combined);e.target.value=''};
  const submit=async(e)=>{e.preventDefault();const formElement=e.currentTarget;const form=new FormData(formElement);const name=String(form.get('name')||'').trim();if(!/^[A-Za-z0-9._-]{1,100}$/.test(name)||name==='.'||name==='..'){toast.error('Use 1–100 letters, numbers, dots, hyphens, or underscores for the repository name.');return}setBusy(true);try{const uploadFiles=await Promise.all(files.map(async({file,path})=>{const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return{path,content:btoa(binary),encoding:'base64'}}));await githubAPI.createRepo({name,description:String(form.get('description')||''),isPrivate:form.get('isPrivate')==='on',...(uploadFiles.length?{files:uploadFiles}:{})});toast.success(uploadFiles.length?`Repository created with ${uploadFiles.length} uploaded files`:'Repository created');formElement.reset();setFiles([]);onCreated()}catch(err){toast.error(err.response?.data?.message||'Could not create the repository')}finally{setBusy(false)}};
  const totalSize=files.reduce((sum,item)=>sum+item.file.size,0);
  return <form className="repo-create-card" onSubmit={submit}><div className="repo-create-heading"><span className="repo-create-icon"><Upload size={17}/></span><div><h3>Create a repository in your workspace</h3><p>Choose multiple files or a whole folder. Nested folders and assets are preserved.</p></div></div><div className="repo-create-grid"><label>Repository name<input name="name" placeholder="my-first-project" maxLength="100" required/></label><label>Description <span className="optional-label">Optional</span><input name="description" placeholder="What are you building?" maxLength="350"/></label></div><div className="repo-upload-choices"><label className="repo-file-picker"><Upload size={15}/><span>Choose files<small>Pick multiple source files</small></span><input type="file" multiple accept=".js,.jsx,.ts,.tsx,.py,.go,.java,.rb,.rs,.php,.css,.html,.json,.sql,.c,.cpp,.cs,.md,.yml,.yaml,.sh,.xml,.toml,.txt,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2" onChange={chooseFiles}/></label><label className="repo-file-picker folder-picker"><FileUp size={15}/><span>Choose a folder<small>Upload its files and subfolders</small></span><input type="file" multiple webkitdirectory="" directory="" onChange={chooseFiles}/></label></div>{files.length>0&&<div className="staged-files"><div><b>{files.length} files selected</b><span>{(totalSize/1024/1024).toFixed(2)} MB of 8 MB</span><button type="button" onClick={()=>setFiles([])}>Clear all</button></div><ul>{files.slice(0,8).map((entry,i)=><li key={`${entry.path}-${i}`}><FileCode2 size={13}/><span>{entry.path}</span><button type="button" aria-label={`Remove ${entry.path}`} onClick={()=>setFiles(current=>current.filter(x=>x.path!==entry.path))}><X size={13}/></button></li>)}{files.length>8&&<li className="more-files">and {files.length-8} more files</li>}</ul></div>}<label className="repo-privacy"><input name="isPrivate" type="checkbox" defaultChecked/><span><b>Private repository</b><small>Only people you grant access can see it.</small></span></label><div className="repo-create-footer"><span><ShieldCheck size={14}/> Up to 50 files · 8 MB total</span><Button type="submit" loading={busy}><Github size={15}/>{files.length?`Create and upload ${files.length} files`:'Create repository'}<ArrowRight size={14}/></Button></div></form>;
}

function TerminalGuide({repo,onClose}) {
  const [copied,setCopied]=useState(false);if(!repo)return null;const branch=repo.defaultBranch||'main';const commands=`# Run these commands from your local project folder\ngh auth login\ngit init -b ${branch}\ngit add .\ngit commit -m "Initial project upload"\ngit remote add origin https://github.com/${repo.full_name}.git\ngit pull origin ${branch} --allow-unrelated-histories\ngit push -u origin ${branch}`;
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card terminal-guide-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18}/></button><span className="modal-icon"><Command size={19}/></span><h2>Upload from your terminal</h2><p>For an existing local project, run these commands from its folder. GitHub CLI must be installed; sign in with <code>gh auth login</code> first if needed.</p><pre>{commands}</pre><Button className="modal-action" onClick={()=>{navigator.clipboard.writeText(commands);setCopied(true);toast.success('Commands copied')}}>{copied?'Copied':'Copy terminal commands'}</Button><small>This provides commands for your own terminal. The app does not run shell commands on your computer.</small></div></div>;
}

function RepositoryFileManager({repo,onClose}){
  const [tree,setTree]=useState(null);const [loading,setLoading]=useState(false);const [deleting,setDeleting]=useState(false);const [pendingDelete,setPendingDelete]=useState(null);
  const load=async()=>{if(!repo)return;setLoading(true);try{const response=await githubAPI.getRepositoryTree(...repo.full_name.split('/'));setTree(response.data.data);setPendingDelete(null)}catch(error){toast.error(error.response?.data?.message||'Could not load repository files')}finally{setLoading(false)}};
  useEffect(()=>{load()},[repo?.full_name]);
  if(!repo)return null;
  const entries=[...(tree?.entries||[])].sort((a,b)=>a.type===b.type?a.path.localeCompare(b.path):a.type==='tree'?-1:1);
  const affectedCount=(path)=>entries.filter(entry=>entry.type!=='tree'&&(entry.path===path||entry.path.startsWith(`${path}/`))).length;
  const remove=async()=>{if(!pendingDelete||!tree?.commitSha)return;setDeleting(true);try{const response=await githubAPI.deleteRepositoryPath({owner:repo.full_name.split('/')[0],repo:repo.full_name.split('/')[1],path:pendingDelete.path,commitSha:tree.commitSha});toast.success(`Deleted ${response.data.data.filesDeleted} file${response.data.data.filesDeleted===1?'':'s'} from ${pendingDelete.path}`);await load()}catch(error){toast.error(error.response?.data?.message||'Could not delete this repository path')}finally{setDeleting(false)}};
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal-card repo-file-manager" role="dialog" aria-modal="true" aria-labelledby="repo-file-manager-title" onMouseDown={event=>event.stopPropagation()}><button type="button" className="modal-close" onClick={onClose} aria-label="Close file manager"><X size={18}/></button><span className="modal-icon"><Folder size={20}/></span><h2 id="repo-file-manager-title">Manage repository files</h2><p>{repo.full_name} · default branch <b>{tree?.defaultBranch||repo.defaultBranch||'loading'}</b></p><div className="repo-file-manager-toolbar"><span>{entries.length} tracked paths</span><button type="button" onClick={load} disabled={loading}><RefreshCw size={13}/>{loading?'Refreshing':'Refresh files'}</button></div>{loading&&!tree?<div className="repo-file-manager-empty">Loading files from GitHub…</div>:entries.length?<div className="repo-file-list">{entries.map(entry=><div className="repo-file-item" key={entry.path}><span className="repo-file-path" style={{paddingLeft:`${Math.max(0,entry.path.split('/').length-1)*12}px`}}><i>{entry.type==='tree'?<Folder size={14}/>:<FileCode2 size={14}/>}</i><span title={entry.path}>{entry.path}</span>{entry.type==='blob'&&<small>{entry.size>=1024?`${(entry.size/1024).toFixed(1)} KB`:`${entry.size} B`}</small>}</span><button type="button" className="repo-delete-trigger" onClick={()=>setPendingDelete(entry)} aria-label={`Delete ${entry.type==='tree'?'folder':'file'} ${entry.path}`}><Trash2 size={14}/><span>Delete</span></button></div>)}</div>:<div className="repo-file-manager-empty">This repository has no tracked files on its default branch.</div>}{pendingDelete&&<div className="repo-delete-confirm" role="alertdialog" aria-label="Confirm repository path deletion"><div><b>Delete this {pendingDelete.type==='tree'?'folder':'file'}?</b><code>{pendingDelete.path}</code><p>{pendingDelete.type==='tree'?`${affectedCount(pendingDelete.path)} tracked file(s) inside this folder will be removed.`:'This file will be removed.'} A commit will be added to <strong>{tree?.defaultBranch}</strong>. You can restore it later with another commit.</p></div><div><button type="button" onClick={()=>setPendingDelete(null)} disabled={deleting}>Cancel</button><Button type="button" variant="danger" className="red-action-button" onClick={remove} loading={deleting}><Trash2 size={14}/> Delete {pendingDelete.type==='tree'?'folder':'file'}</Button></div></div>}</section></div>;
}

function IntegrationsPage(){
  const [repos,setRepos]=useState([]);const [busy,setBusy]=useState(false);const [connected,setConnected]=useState(false);const [terminalTarget,setTerminalTarget]=useState(null);const [fileTarget,setFileTarget]=useState(null);
  const load=()=>githubAPI.getRepos().then(r=>{setRepos(r.data.data||[]);setConnected(true)}).catch(()=>setConnected(false));
  useEffect(()=>{const params=new URLSearchParams(window.location.search);const code=params.get('code');const state=params.get('state');if(code&&state){githubAPI.connectCallback({code,state}).then(()=>{window.history.replaceState({},'',window.location.pathname);toast.success('GitHub connected');load()}).catch(e=>{toast.error(e.response?.data?.message||'GitHub connection failed');window.history.replaceState({},'',window.location.pathname)});return}if(params.has('error')){toast.error(params.get('error_description')||'GitHub authorization was cancelled');window.history.replaceState({},'',window.location.pathname);return}load()},[]);
  const connect=async()=>{try{const r=await githubAPI.getAuthUrl();window.location.assign(r.data.data.url)}catch(e){toast.error(e.response?.data?.message||'GitHub OAuth is not configured yet')}};
  const disconnect=async()=>{setBusy(true);try{await githubAPI.disconnect();setConnected(false);setRepos([]);toast.success('GitHub disconnected')}catch(e){toast.error('Could not disconnect GitHub')}finally{setBusy(false)}};
  return <Shell title="Integrations" subtitle="Create repositories, upload code, and manage files in your GitHub repositories." active="/app/integrations"><div className="integration-layout"><section className="panel integration-main"><div className="integration-heading"><span className="github-large"><Github size={23}/></span><div><h2>GitHub</h2><p>Connect once, then create repositories and upload code right here in Merge AI.</p></div><span className={cx('connection-badge',connected?'connected':'')}><i/>{connected?'Connected':'Not connected'}</span></div>{connected?<><CreateRepositoryForm onCreated={load}/><div className="integration-actions"><h3>Your repositories <small>{repos.length}</small></h3><div><Button variant="secondary" onClick={connect}>Reconnect permissions</Button><Button variant="secondary" onClick={()=>load()}>Refresh</Button><Button variant="outline" loading={busy} onClick={disconnect} className="red-action-button">Disconnect</Button></div></div><div className="connected-repos">{repos.length?repos.slice(0,100).map(r=><div className="repo-row" key={r.id}><Github size={15}/><b>{r.full_name}</b><span>{r.private?'Private':'Public'}</span><button className="terminal-guide-button" onClick={()=>setTerminalTarget(r)}><Command size={13}/> Terminal</button><button type="button" className="repo-files-button" onClick={()=>setFileTarget(r)}><Folder size={13}/> Manage files</button><a href={r.html_url} target="_blank" rel="noreferrer">Open <ArrowRight size={12}/></a></div>):<div className="empty-small">No repositories yet. Create one above and upload your files or folder.</div>}</div></>:<div className="connect-github-panel"><div className="connect-steps"><span><b>1</b> Connect your GitHub account once</span><span><b>2</b> Create repositories from this page</span><span><b>3</b> Upload code and manage it here</span></div><p>GitHub authorization is needed to create repositories on your account. After connecting, you can do the repository and file steps inside this app.</p><Button onClick={connect}><Github size={16}/> Connect GitHub <ArrowRight size={15}/></Button></div>}</section><aside className="integration-aside"><div><Sparkles size={18}/><h3>Keep the last step yours.</h3><p>Upload, review, and send code when you choose. We’ll show you which repository and files will be updated.</p></div><div className="integration-flow"><span><Code2 size={16}/> Your code</span><ArrowRight size={13}/><span className="flow-ai"><Sparkles size={16}/> Review</span><ArrowRight size={13}/><span><Github size={16}/> GitHub</span></div><div className="privacy-note"><ShieldCheck size={15}/><p><b>Permission-aware access</b><small>Merge AI can create repositories, upload code, and remove selected file paths after your confirmation.</small></p></div></aside></div><RepositoryFileManager repo={fileTarget} onClose={()=>setFileTarget(null)}/><TerminalGuide repo={terminalTarget} onClose={()=>setTerminalTarget(null)}/></Shell>;
}

function SettingsPage(){
  const {user,updateUser,logout}=useAuth();
  const [busy,setBusy]=useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [deletePhrase,setDeletePhrase]=useState('');
  const [deleting,setDeleting]=useState(false);
  const save=async(e)=>{e.preventDefault();setBusy(true);const f=new FormData(e.currentTarget);try{const r=await authAPI.updateProfile({name:f.get('name')});updateUser(r.data.data);toast.success('Profile updated')}catch(e){toast.error(e.response?.data?.message||'Could not update profile')}finally{setBusy(false)}};
  const removeAccount=async()=>{if(deletePhrase!=='DELETE')return;setDeleting(true);try{await authAPI.deleteAccount();logout();window.location.assign('/');}catch(e){toast.error(e.response?.data?.message||'Could not delete account');setDeleting(false)}};
  return <Shell title="Settings" subtitle="Your account and workspace preferences." active="/app/settings"><div className="settings-layout">
    <form className="panel settings-panel" onSubmit={save}><div className="panel-heading"><div><h3>Profile</h3><p>Manage the details attached to your account.</p></div></div><label>Full name<input name="name" defaultValue={user?.name||''} required minLength="2" maxLength="50"/></label><label>Email address<input name="email" type="email" value={user?.email||''} readOnly disabled className="input-disabled" title="Email address cannot be changed"/><small style={{color:'#888',fontSize:'11px',marginTop:'4px',display:'block'}}>Email address is verified and cannot be edited.</small></label><div className="settings-footer"><span><ShieldCheck size={14}/> Your profile is private</span><Button type="submit" loading={busy}>Save changes</Button></div></form>
    <section className="panel settings-panel"><div className="panel-heading"><div><h3>Sign out</h3><p>End your session on this device.</p></div></div><p className="settings-copy">You can sign back in at any time with your email and password.</p><Button variant="outline" onClick={logout} className="red-action-button"><LogOut size={15}/> Sign out</Button></section>
    <section className="panel settings-panel danger-zone"><div className="panel-heading"><div><h3>Delete account</h3><p>Permanently remove your Merge AI account.</p></div></div><p className="settings-copy">Your profile, code reviews, resumes, and saved applications will be deleted. This does not delete your GitHub account or repositories.</p><Button variant="outline" onClick={()=>{setDeletePhrase('');setDeleteOpen(true)}} className="red-action-button"><Trash2 size={15}/> Delete account</Button></section>
  </div>{deleteOpen&&<div className="modal-backdrop" onMouseDown={()=>!deleting&&setDeleteOpen(false)}><section className="modal-card account-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" onMouseDown={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setDeleteOpen(false)} disabled={deleting} aria-label="Close confirmation"><X size={18}/></button><span className="modal-icon account-delete-icon"><Trash2 size={19}/></span><h2 id="delete-account-title">Delete your account?</h2><p>This permanently removes your profile, reviews, resumes, and saved job applications. Your GitHub account and repositories are not affected.</p><label className="modal-label">Type <strong>DELETE</strong> to confirm<input autoFocus value={deletePhrase} onChange={e=>setDeletePhrase(e.target.value)} placeholder="DELETE" autoComplete="off"/></label><div className="account-delete-actions"><Button variant="secondary" onClick={()=>setDeleteOpen(false)} disabled={deleting}>Keep my account</Button><Button variant="outline" className="red-action-button" onClick={removeAccount} loading={deleting} disabled={deletePhrase!=='DELETE'}><Trash2 size={14}/> Delete permanently</Button></div></section></div>}</Shell>
}

export default App;
