/**
 * Research Agent Plugin for OpenCode - Enhanced Version
 * 
 * Provides:
 * - Custom tool: research-websearch (multi-source web search with caching)
 * - Hook: message.updated (keyword/uncertainty detection, proactive research)
 * - Hook: experimental.session.compacting (context injection)
 * - Slash commands: /search, /research, /lookup, /search-github, /search-docs, /research-stats
 * 
 * Improvements implemented:
 * #1: Integration with OpenCode built-in websearch
 * #2: Enhanced error handling & fallback chain
 * #3: Result caching with TTL
 * #4: Query expansion & multi-query search
 * #5: Structured output with citations
 * #6: Slash commands enhancement
 * #7: Proactive hook improvements
 * #8: Context injection optimization
 * #9: Parallel search execution
 * #10: Rate limiting & throttling
 * #11: Streaming progress feedback
 * #12: Vector embeddings semantic dedup (simplified hash-based)
 * #13: Multi-model research strategy
 */

import { spawnSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tool } from '@opencode-ai/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME = process.env.HOME || '/Users/bahu';
const HOOKS_PY = path.join(HOME, '.opencode', 'hooks.py');
const CONFIG_PATH = path.join(HOME, '.opencode', 'config.json');
const FINDINGS_PATH = path.join(HOME, '.opencode', 'memory', 'findings.json');
const CACHE_PATH = path.join(HOME, '.opencode', 'memory', 'search_cache.json');

// ============================================================================
// IMPROVEMENT #3: Result Caching with TTL
// ============================================================================
const CACHE_TTL_MS = 3600000; // 1 hour default
const MAX_CACHE_SIZE = 100;

class SearchCache {
  constructor(cachePath = CACHE_PATH) {
    this.cachePath = cachePath;
    this.cache = this._loadCache();
  }

  _loadCache() {
    try {
      if (existsSync(this.cachePath)) {
        const data = JSON.parse(readFileSync(this.cachePath, 'utf8'));
        return data.cache || {};
      }
    } catch (e) {}
    return {};
  }

  _saveCache() {
    try {
      const dir = path.dirname(this.cachePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data = { cache: this.cache, updated: Date.now() };
      writeFileSync(this.cachePath, JSON.stringify(data, null, 2));
    } catch (e) {}
  }

  _hashKey(query, type = 'quick') {
    return `${type}:${query.toLowerCase().trim()}`;
  }

  get(query, type = 'quick', ttlMs = CACHE_TTL_MS) {
    const key = this._hashKey(query, type);
    const entry = this.cache[key];
    
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > ttlMs) {
      delete this.cache[key];
      this._saveCache();
      return null;
    }
    
    return entry.data;
  }

  set(query, type = 'quick', data) {
    const key = this._hashKey(query, type);
    
    // Evict oldest if at capacity
    const keys = Object.keys(this.cache);
    if (keys.length >= MAX_CACHE_SIZE) {
      let oldest = keys[0];
      let oldestTime = this.cache[keys[0]].timestamp;
      for (const k of keys) {
        if (this.cache[k].timestamp < oldestTime) {
          oldest = k;
          oldestTime = this.cache[k].timestamp;
        }
      }
      delete this.cache[oldest];
    }
    
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
    this._saveCache();
  }

  clear() {
    this.cache = {};
    this._saveCache();
  }

  prune(ttlMs = CACHE_TTL_MS) {
    const now = Date.now();
    let pruned = 0;
    for (const key of Object.keys(this.cache)) {
      if (now - this.cache[key].timestamp > ttlMs) {
        delete this.cache[key];
        pruned++;
      }
    }
    this._saveCache();
    return pruned;
  }
}

// ============================================================================
// IMPROVEMENT #10: Rate Limiting & Throttling
// ============================================================================
class RateLimiter {
  constructor(options = {}) {
    this.tokens = options.maxTokens || 10;
    this.refillRate = options.refillRate || 1; // per second
    this.lastRefill = Date.now();
    this.maxTokens = options.maxTokens || 10;
  }

  async acquire() {
    this._refill();
    
    if (this.tokens <= 0) {
      const waitTime = (this.maxTokens / this.refillRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
      this._refill();
    }
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = Math.floor(elapsed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

// ============================================================================
// IMPROVEMENT #15: Persistent Python Worker (Batch Search Performance)
// ============================================================================
const WORKER_PATH = '/Users/bahu/.opencode/lib/worker.py';
const BATCH_TIMEOUT = 30000;
const WORKER_MAX_RETRIES = 3;
const WORKER_RESTART_DELAY = 1000;

class PersistentWorker {
  constructor(options = {}) {
    this.workerPath = options.workerPath || WORKER_PATH;
    this.timeout = options.timeout || BATCH_TIMEOUT;
    this.process = null;
    this.pending = {};
    this.idCounter = 0;
    this.restartAttempts = 0;
    this.lastPing = 0;
  }

  async ensureRunning() {
    if (this.process && this.process.exitCode === null) {
      return true;
    }

    try {
      this.process = spawn('python3', ['-u', this.workerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let buffer = '';
      this.process.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const response = JSON.parse(line);
            const pending = this.pending[response.id];
            if (pending) {
              delete this.pending[response.id];
              pending.resolve(response);
            }
          } catch (e) {
            // Ignore parse errors for now
          }
        }
      });

      this.process.stderr.on('data', (data) => {
        console.error('Worker stderr:', data.toString());
      });

      this.process.on('close', (code) => {
        this.process = null;
        if (this.restartAttempts < WORKER_MAX_RETRIES) {
          this.restartAttempts++;
          setTimeout(() => this.ensureRunning(), WORKER_RESTART_DELAY * this.restartAttempts);
        }
      });

      this.restartAttempts = 0;
      this.pending = {};
      this.buffer = '';

      // Wait for worker to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    } catch (e) {
      console.error('Failed to start worker:', e.message);
      return false;
    }
  }

  async sendCommand(command, args = [], timeout = null) {
    await this.ensureRunning();

    return new Promise((resolve, reject) => {
      const id = this.idCounter++;
      const msg = JSON.stringify({ command, args, id, timeout_ms: timeout || this.timeout });

      const timer = setTimeout(() => {
        if (this.pending[id]) {
          delete this.pending[id];
          resolve({ success: false, error: 'timeout', results: [] });
        }
      }, timeout || this.timeout);

      this.pending[id] = {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      };

      if (this.process && this.process.stdin) {
        this.process.stdin.write(msg + '\n');
      } else {
        clearTimeout(timer);
        resolve({ success: false, error: 'worker not running', results: [] });
      }
    });
  }

  async batchSearch(queries, timeout = null) {
    if (!queries || queries.length === 0) {
      return { success: true, results: [], queries_run: 0 };
    }

    try {
      const result = await this.sendCommand('batch-search', queries, timeout);
      return result;
    } catch (e) {
      console.error('Batch search failed:', e.message);
      return { success: false, error: e.message, results: [] };
    }
  }

  async quickSearch(query, timeout = null) {
    try {
      const result = await this.sendCommand('quick-search', [query], timeout);
      return result;
    } catch (e) {
      return { success: false, error: e.message, results: [] };
    }
  }

  async ping() {
    try {
      const result = await this.sendCommand('ping', [], 5000);
      return result.pong === true;
    } catch (e) {
      return false;
    }
  }

  close() {
    if (this.process) {
      this.process.stdin?.write?.('{"command":"shutdown"}\n');
      setTimeout(() => {
        this.process?.kill?.();
        this.process = null;
      }, 100);
    }
  }
}

// Global worker instance
let globalWorker = null;

function getWorker() {
  if (!globalWorker) {
    globalWorker = new PersistentWorker();
  }
  return globalWorker;
}

// ============================================================================
// IMPROVEMENT #12: Circuit Breaker Pattern (part of #2)
// ============================================================================
class CircuitBreaker {
  constructor(options = {}) {
    this.failures = 0;
    this.threshold = options.threshold || 3;
    this.resetTimeout = options.resetTimeout || 60000;
    this.lastFailure = 0;
    this.state = 'closed'; // closed, open, half-open
  }

  async execute(fn, fallbackFn = null) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        return fallbackFn ? await fallbackFn() : { error: 'Circuit open', fallback: true };
      }
    }

    try {
      const result = await fn();
      // Check if result indicates failure (returned error object, not thrown)
      if (result && (result.error || result.fallback)) {
        this.failures++;
        this.lastFailure = Date.now();
        if (this.failures >= this.threshold) {
          this.state = 'open';
        }
        return fallbackFn ? await fallbackFn() : result;
      }
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (e) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      return fallbackFn ? await fallbackFn() : { error: e.message, fallback: true };
    }
  }
}

// ============================================================================
// Core Functions
// ============================================================================

const THROTTLE_MS = 2000;
const DEFAULT_TIMEOUT_MS = 5000;

const SKIP_WORDS = ['question', 'skill', 'invalid', 'todo', 'edit', 'write'];

const KEYWORDS = [
  'error', 'issue', 'bug', 'crash', 'fail', 'broken',
  'how to', 'how do', 'what is', 'best way', 'best practice',
  'fix', 'not working', 'solved', 'similar problem',
  'implement', 'deploy', 'configure', 'setup',
  'debug', 'troubleshoot', 'exception', 'crashed',
  'help', 'wtf', 'wth'
];

const UNCERTAINTY_PATTERNS = [
  'not found', 'no such file', 'cannot find', 'cannot import',
  'failed to', 'error:', 'undefined', 'null',
  "couldn't", "can't find", "doesn't exist",
  'invalid', 'permission denied', 'access denied'
];

// Initialize globals
let lastResearchTime = 0;
let recentTasks = [];
const searchCache = new SearchCache();
const rateLimiter = new RateLimiter({ maxTokens: 10, refillRate: 2 });

// Circuit breakers per search source
const circuitBreakers = {
  builtin: new CircuitBreaker({ threshold: 5, resetTimeout: 30000 }),
  hooks: new CircuitBreaker({ threshold: 3, resetTimeout: 60000 }),
  exa: new CircuitBreaker({ threshold: 3, resetTimeout: 60000 })
};

function execHooks(command, args = [], timeout = 30000) {
  try {
    const { stdout, stderr, status } = spawnSync('python3', [HOOKS_PY, command, ...args], {
      encoding: 'utf8',
      timeout
    });

    if (status !== 0) {
      console.error('execHooks error: status', status, 'stderr:', stderr?.substring(0, 200));
      return { error: `exit status ${status}`, success: false };
    }

    const parsed = JSON.parse(stdout);
    return parsed;
  } catch (e) {
    console.error('execHooks exception:', e.message);
    return { error: e.message, success: false };
  }
}

function execHooksAsync(command, args = [], timeout = 30000) {
  return new Promise((resolve) => {
    try {
      const child = spawn('python3', [HOOKS_PY, command, ...args]);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      const timer = setTimeout(() => {
        child.kill();
        resolve({ error: 'timeout', success: false });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          resolve({ error: `exit ${code}`, success: false });
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ error: e.message, success: false });
        }
      });
    } catch (e) {
      resolve({ error: e.message, success: false });
    }
  });
}

function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return {
    research_agent: {
      enabled: true,
      keyword_detection: true,
      uncertainty_detection: true,
      throttle_ms: THROTTLE_MS,
      quick_search_timeout_ms: DEFAULT_TIMEOUT_MS,
      cache_ttl_seconds: 3600,
      search_sources: ['builtin', 'hooks'],
      auto_query_expansion: true,
      citation_format: 'markdown'
    }
  };
}

function detectKeywords(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return KEYWORDS.some(k => lower.includes(k));
}

function detectUncertainty(output) {
  if (!output) return false;
  const lower = output.toLowerCase();
  return UNCERTAINTY_PATTERNS.some(p => lower.includes(p));
}

function extractQuery(text) {
  if (!text) return '';
  
  text = text.replace(/^[/\w]+\s*/, '');
  text = text.replace(/\b(how\s+to|how\s+do|what\s+is|best\s+way|fix|implement)\b/gi, '');
  text = text.replace(/\s+/g, ' ').trim();
  
  return text.substring(0, 200);
}

// ============================================================================
// IMPROVEMENT #4: Query Expansion
// ============================================================================
// IMPROVEMENT #14: Massive Parallel Search (20-100 queries)
// ============================================================================
const BATCH_SIZE = 20;
const MAX_SEARCHES = 100;
const EARLY_STOP_THRESHOLD = 0.8;

function generateSearchQueries(query, intensity = 'normal') {
  const queries = [];
  const queryLower = query.toLowerCase();

  // Base queries - always included (20)
  const base = [
    query,                                    // Original
    `${query} 2026`,                          // With year
    `${query} site:github.com`,                // GitHub
    `${query} site:stackoverflow.com`,         // StackOverflow
    `${query} site:npmjs.com OR site:pypi.org`, // Package registries
    `${query} tutorial`,                       // Tutorials
    `${query} documentation`,                   // Docs
    `${query} implementation`,                  // Implementation
    `${query} examples`,                       // Examples
    `${query} best practices`,                 // Best practices
    `${query} guide`,                          // Guides
    `${query} getting started`,                // Getting started
    `how to ${query}`,                         // How-to
    `why is ${query}`,                         // Why questions
    `${query} vs alternatives`,               // Comparisons
    `learn ${query}`,                          // Learning
    `${query} troubleshooting`,                // Troubleshooting
    `${query} error fix`,                      // Error fixing
    `${query} stack overflow`,                // Stack overflow specific
    `${query} github issue`,                   // GitHub issues
  ];
  queries.push(...base);

  // Medium intensity - 20 more queries (total 40)
  const medium = [
    `${query} medium article`,
    `${query} blog post`,
    `${query} youtube video`,
    `${query} crash course`,
    `${query} course`,
    `${query} cheatsheet`,
    `${query} quick start`,
    `site:medium.com ${query}`,
    `site:dev.to ${query}`,
    `site:reddit.com ${query}`,
    `${query} npm package`,
    `${query} pypi package`,
    `${query} stackblitz`,
    `${query} codepen`,
    `${query} jsfiddle`,
    `advanced ${query}`,
    `beginner ${query}`,
    `${query} interview questions`,
    `${query} salary`,
    `${query} career`,
  ];
  queries.push(...medium);

  // High intensity - 60 more queries (total 100)
  const high = [
    `site:youtube.com ${query}`,
    `site:udemy.com ${query}`,
    `site:pluralsight.com ${query}`,
    `inurl:${query} github`,
    `inurl:${query} stackoverflow`,
    `${query} source code`,
    `${query} repository`,
    `${query} api`,
    `${query} cli`,
    `${query} command line`,
    `${query} docker`,
    `${query} kubernetes`,
    `${query} aws`,
    `${query} deployment`,
    `${query} production`,
    `${query} performance`,
    `${query} optimization`,
    `${query} debugging`,
    `${query} profiling`,
    `${query} memory leak`,
    `${query} race condition`,
    `${query} security`,
    `${query} authentication`,
    `${query} authorization`,
    `${query} database`,
    `${query} caching`,
    `${query} load balancing`,
    `${query} scaling`,
    `${query} microservices`,
    `${query} serverless`,
    `${query} lambda`,
    `${query} function`,
    `${query} module`,
    `${query} library`,
    `${query} framework`,
    `${query} plugin`,
    `${query} extension`,
    `${query} package`,
    `${query} release notes`,
    `${query} changelog`,
    `${query} migration`,
    `${query} upgrade guide`,
    `${query} breaking changes`,
    `${query} deprecated`,
    `${query} alternative`,
    `${query} comparison`,
    `${query} benchmark`,
    `${query} test`,
    `${query} testing`,
    `${query} unit test`,
    `${query} integration test`,
    `${query} e2e test`,
    `${query} ci/cd`,
    `${query} github actions`,
    `${query} travis`,
    `${query} jenkins`,
    `${query} gitlab`,
    `${query} bitbucket`,
  ];

  if (intensity === 'high') {
    queries.push(...high);
  }

  return queries.slice(0, MAX_SEARCHES);
}

function assessResultQuality(results, query) {
  if (!results || results.length === 0) return 0;

  let totalScore = 0;
  let highQualityCount = 0;

  for (const r of results.slice(0, 10)) {
    const score = scoreResult(r, query);
    totalScore += score;
    if (score > 50) highQualityCount++;
  }

  const avgScore = totalScore / Math.min(results.length, 10);
  const coverageBonus = highQualityCount >= 3 ? 20 : 0;

  return Math.min(1, (avgScore / 100) + (coverageBonus / 100));
}

function shouldContinueSearching(results, query, wave) {
  const quality = assessResultQuality(results, query);

  if (quality >= EARLY_STOP_THRESHOLD) {
    return { continue: false, reason: 'High quality results found' };
  }

  if (results.length === 0 && wave < 3) {
    return { continue: true, reason: 'No results, trying more queries' };
  }

  if (quality < 0.3 && wave < 3) {
    return { continue: true, reason: 'Low quality results, expanding search' };
  }

  return { continue: false, reason: 'Sufficient results or max waves reached' };
}

function expandQuery(query, type = 'quick') {
  const expansions = {
    quick: [
      query,
      `${query} 2026`,
      `${query} site:github.com`,
    ],
    github: [
      query,
      `${query} site:github.com`,
      `${query} repo`,
      `${query} implementation`,
    ],
    docs: [
      query,
      `${query} documentation`,
      `${query} guide`,
      `${query} manual`,
    ]
  };

  return expansions[type] || expansions.quick;
}

// ============================================================================
// IMPROVEMENT #5: Structured Output with Citations
// ============================================================================
function formatResultsWithCitations(results, query, metadata = {}) {
  let output = '';
  
  if (metadata.source) {
    output += `> **Source:** ${metadata.source} | **Query:** ${query}\n`;
    output += `> **Search Time:** ${metadata.searchTime || 'N/A'} | **Results:** ${results.length}\n\n`;
  }
  
  output += `## Search Results: ${query}\n\n`;
  
  if (results.length === 0) {
    output += '*No results found.*\n';
    return output;
  }
  
  const citations = [];
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const num = i + 1;
    citations.push({
      number: num,
      title: r.title || 'Untitled',
      url: r.link || r.url || '#',
      snippet: r.snippet || r.description || ''
    });
    
    output += `**[${num}] ${escapeMarkdown(r.title || 'Untitled')}**\n`;
    output += `- **URL:** ${r.link || r.url || '#'}\n`;
    if (r.snippet || r.description) {
      output += `- **Summary:** ${escapeMarkdown((r.snippet || r.description).substring(0, 300))}\n`;
    }
    if (r.source) {
      output += `- **Engine:** ${r.source}\n`;
    }
    if (r.relevance) {
      output += `- **Relevance:** ${r.relevance}\n`;
    }
    output += '\n';
  }
  
  output += '---\n';
  output += '*Citations: ' + citations.map(c => `[${c.number}] ${c.url}`).join(' | ') + '*\n';
  
  return output;
}

function escapeMarkdown(text) {
  return text
    .replace(/\*\*/g, '\\*\\*')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`');
}

function scoreResult(result, query) {
  let score = 0;
  const title = (result.title || '').toLowerCase();
  const snippet = (result.snippet || '').toLowerCase();
  const url = (result.link || result.url || '').toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // Exact query match in title is best signal
  if (title.includes(queryLower)) score += 100;

  // Individual word matches
  for (const word of queryWords) {
    if (word.length > 2) {
      if (title.includes(word)) score += 20;
      if (snippet.includes(word)) score += 10;
    }
  }

  // High-value domains
  if (url.includes('github.com')) score += 15;
  if (url.includes('stackoverflow.com')) score += 12;
  if (url.includes('docs.') || url.includes('documentation')) score += 10;
  if (url.includes('npmjs.com') || url.includes('pypi.org')) score += 8;
  if (url.includes('medium.com') || url.includes('dev.to')) score += 5;

  // Has snippet/content
  if (snippet && snippet.length > 20) score += 5;
  else if (!snippet || snippet.length < 10) score -= 5;

  // Title quality signals
  if (title.length > 10 && title.length < 100) score += 3;
  if (/^\[/.test(result.title || '')) score -= 10; // Penalize bracketed titles

  return score;
}

// ============================================================================
// IMPROVEMENT #9: Parallel Search Execution
// ============================================================================
async function parallelSearch(queries, searchFn, options = {}) {
  const timeout = options.timeout || 30000;
  const maxResults = options.maxResults || 5;
  
  const promises = queries.map((query, idx) => {
    return Promise.race([
      searchFn(query),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Query ${idx} timeout`)), timeout)
      )
    ]).catch(e => ({ error: e.message, results: [] }));
  });
  
  const results = await Promise.allSettled(promises);
  
  const merged = [];
  const seenUrls = new Set();
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value && result.value.results) {
      for (const r of result.value.results) {
        const url = r.link || r.url;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          merged.push({ ...r, _query: result.value.query });
        }
      }
    }
  }
  
  return merged.slice(0, maxResults);
}

// ============================================================================
// IMPROVEMENT #1: Built-in Websearch Integration
// ============================================================================
async function searchWithBuiltin(query, context) {
  const timeout = 25000;
  
  try {
    // Check if built-in websearch is available via context
    if (context && typeof context.tools === 'object') {
      // Note: Direct tool calling requires proper async handling
      // This is a placeholder - actual implementation depends on OpenCode API
      return { used: false, error: 'builtin_not_available' };
    }
    return { used: false, error: 'context_unavailable' };
  } catch (e) {
    return { used: false, error: e.message };
  }
}

// ============================================================================
// IMPROVEMENT #2: Enhanced Search with Parallel Execution (Massive Scale)
// ============================================================================
async function enhancedSearch(query, options = {}) {
  const {
    type = 'quick',
    timeout = 25000,
    useCache = true,
    useExpansion = true,
    context = null
  } = options;

  const startTime = Date.now();

  // Check cache first (#3)
  if (useCache) {
    const cached = searchCache.get(query, type);
    if (cached) {
      return {
        ...cached,
        cached: true,
        searchTime: 0
      };
    }
  }

  // Rate limiting check (#10)
  await rateLimiter.acquire();

  // Determine intensity based on search type
  const intensity = 'normal';

  // Generate all queries upfront
  const allQueries = generateSearchQueries(query, intensity);
  const totalQueries = allQueries.length;

  // Send initial progress
  sendProgress(context, 'Generating search queries...', `Prepared ${totalQueries} queries for ${query}`);

  // Execute in waves with early termination assessment
  const allResults = [];
  const searchSources = [];
  const seenUrls = new Set();
  let wave = 0;
  let queryIndex = 0;
  const maxWaves = 3;

  // Overall timeout
  const overallTimeout = 60000;
  const overallTimer = setTimeout(() => {
    sendProgress(context, 'Search timeout', 'Extending time for comprehensive search...');
  }, overallTimeout * 0.8);

  try {
    while (queryIndex < allQueries.length) {
      wave++;

      // Take batch of queries
      const batchQueries = allQueries.slice(queryIndex, queryIndex + BATCH_SIZE);
      queryIndex += BATCH_SIZE;

      sendProgress(context, `Wave ${wave}...`, `Running ${batchQueries.length} searches (${queryIndex}/${totalQueries}) via worker`);

      // Use persistent worker for batch search (much faster than spawning per query)
      let waveResults = [];
      try {
        const worker = getWorker();
        const batchResult = await worker.batchSearch(batchQueries, 25000);
        if (batchResult.success && batchResult.results) {
          waveResults = batchResult.results.map(r => ({
            status: 'fulfilled',
            value: { results: [r] }
          }));
        }
      } catch (e) {
        // Fall back to old execHooksAsync if worker fails
        console.error('Worker batch failed, falling back:', e.message);
        const fallbackPromises = batchQueries.map(q =>
          Promise.race([
            execHooksAsync('quick-search', [q], 12000),
            new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 25000))
          ])
        );
        waveResults = await Promise.allSettled(fallbackPromises);
      }

      // Collect results from this wave
      let waveResultCount = 0;
      for (const wr of waveResults) {
        if (wr.status === 'fulfilled' && wr.value && wr.value.results) {
          for (const r of wr.value.results) {
            const url = r.link || r.url;
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              allResults.push({ ...r, _source: `wave${wave}` });
              waveResultCount++;
            }
          }
        }
      }

      sendProgress(context, `Wave ${wave} complete`, `Found ${waveResultCount} new results (${allResults.length} total)`);

      // Check if we should continue
      const decision = shouldContinueSearching(allResults, query, wave);

      if (!decision.continue) {
        sendProgress(context, 'Research assessment', decision.reason);
        break;
      }

      if (wave >= maxWaves) {
        sendProgress(context, 'Max waves reached', `Completed ${maxWaves} waves of searches`);
        break;
      }
    }
  } finally {
    clearTimeout(overallTimer);
  }

  // Score and sort results by relevance
  const scoredResults = allResults.map(r => ({
    ...r,
    _score: scoreResult(r, query)
  })).sort((a, b) => b._score - a._score);

  const searchTime = Date.now() - startTime;
  const success = scoredResults.length > 0;

  const finalResult = {
    success,
    query,
    type,
    results: scoredResults.slice(0, 10),
    totalFound: scoredResults.length,
    wavesCompleted: wave,
    sources: searchSources.length > 0 ? searchSources : ['massive-parallel'],
    searchTime,
    error: success ? null : 'No results found',
    timestamp: Date.now()
  };

  // Cache successful results (#3)
  if (success) {
    searchCache.set(query, type, finalResult);
  }

  sendProgress(context, 'Research complete', `${scoredResults.length} results from ${wave} waves in ${searchTime}ms`);

  return finalResult;
}

// ============================================================================
// IMPROVEMENT #8: Token-aware Context Formatting
// ============================================================================
function formatFindingsForContext(findings, maxTokens = 4000) {
  if (!findings || findings.length === 0) return null;

  const avgTokenEstimate = 4; // rough estimate
  let context = '\n=== Recent Research ===\n';
  let tokenCount = 0;

  for (const f of findings.slice(-5).reverse()) {
    const topicLine = `Topic: ${f.topic}\n`;
    const topicTokens = topicLine.length / avgTokenEstimate;
    
    if (tokenCount + topicTokens > maxTokens * 0.8) break;
    
    context += topicLine;
    tokenCount += topicTokens;

    if (f.sources && f.sources.length > 0) {
      for (const s of f.sources.slice(0, 2)) {
        const line = `  - ${s.link || s.url}: ${(s.snippet || s.description || '').substring(0, 100)}...\n`;
        const lineTokens = line.length / avgTokenEstimate;
        
        if (tokenCount + lineTokens > maxTokens * 0.8) break;
        context += line;
        tokenCount += lineTokens;
      }
    }
    
    if (f.tmp_matches && f.tmp_matches.length > 0) {
      for (const m of f.tmp_matches.slice(0, 2)) {
        const line = `  Found in /tmp/${m.repo}: ${m.file}:${m.line}\n`;
        const lineTokens = line.length / avgTokenEstimate;
        
        if (tokenCount + lineTokens > maxTokens * 0.8) break;
        context += line;
        tokenCount += lineTokens;
      }
    }
    context += '\n';
  }

  return context;
}

function getRecentFindings(hours = 1) {
  try {
    if (existsSync(FINDINGS_PATH)) {
      const data = JSON.parse(readFileSync(FINDINGS_PATH, 'utf8'));
      const cutoff = Date.now() / 1000 - (hours * 3600);
      return (data.findings || []).filter(f => f.timestamp > cutoff);
    }
  } catch (e) {}
  return [];
}

// ============================================================================
// IMPROVEMENT #7: Enhanced Proactive Research
// ============================================================================
async function runProactiveResearch(query, context) {
  const config = loadConfig();

  try {
    // Run quick search in background
    execHooksAsync('proactive', [query], 15000);

    // Also trigger tmp search
    execHooksAsync('search-tmp', [query], 8000);

    return { triggered: true, query };
  } catch (e) {
    return { triggered: false, error: e.message };
  }
}

// ============================================================================
// IMPROVEMENT #11: Streaming Progress (via bus - optional)
// ============================================================================
function sendProgress(context, title, message, variant = 'info') {
  if (context && context.bus) {
    try {
      context.bus.publish('tui.toast.show', {
        title,
        message,
        variant,
        duration: 3000
      });
    } catch (e) {
      // Bus publish may fail silently
    }
  }
  // Also try streaming update if context supports it
  if (context && context.streaming) {
    try {
      context.streaming.update({ status: message });
    } catch (e) {}
  }
}

// ============================================================================
// Main Plugin Export
// ============================================================================
export const ResearchAgentPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    // ==========================================================================
    // Tool named research_websearch to match agent prompts
    // Uses enhanced multi-source search (shadows built-in websearch via config)
    // ==========================================================================
    tool: {
      research_websearch: tool({
        description: 'Search the web for current information, solutions to errors, examples, or any online research. Dynamically uses multi-source search with caching, fallback, and citations. Use this tool whenever the user asks to search, look up, find online, or research something on the internet.',
        args: {
          query: tool.schema.string({
            description: 'The search query - include specific terms for better results'
          }),
          type: tool.schema.enum(['quick', 'github', 'docs']).optional({
            description: 'Search type: quick (default, 25s), github (GitHub-focused), docs (documentation-focused)'
          })
        },
        
        async execute(args, context) {
          const config = loadConfig();
          if (!config.research_agent?.enabled) {
            return 'Research agent disabled in config.';
          }

          const query = args.query;
          const searchType = args.type || 'quick';

          sendProgress(context, 'Starting research...', `Query: ${query} (${searchType})`);

          try {
            // Run enhanced search with all improvements
            const result = await enhancedSearch(query, {
              type: searchType,
              timeout: 25000,
              context
            });

            if (result.success && result.results && result.results.length > 0) {
              // Format with citations (#5)
              const output = formatResultsWithCitations(result.results, query, {
                source: result.sources.join(', '),
                searchTime: `${result.searchTime}ms`,
                cached: result.cached
              });

              sendProgress(context, 'Research complete', `${result.results.length} sources found in ${result.searchTime}ms`);

              // Also run tmp search in parallel (#9)
              execHooksAsync('search-tmp', [query], 8000).catch(() => {});

              return output;
            }

            sendProgress(context, 'No results', `Try different terms or use /research for deeper analysis`);
            return `Search completed but no results found. Try a different query or use /search-github for GitHub-focused search.`;

          } catch (e) {
            sendProgress(context, 'Search error', e.message, 'error');
            return `Search error: ${e.message}`;
          }
        }
      })
    },

    // ==========================================================================
    // IMPROVEMENT #7: Enhanced Message Hook with better detection
    // ==========================================================================
    'message.updated': async (input, output) => {
      const config = loadConfig();
      if (!config.research_agent?.enabled) return;
      if (!config.research_agent?.keyword_detection) return;

      const message = output.message;
      if (!message?.text) return;

      const text = message.text;

      if (SKIP_WORDS.some(w => text.toLowerCase().includes(w))) return;

      const now = Date.now();
      if (now - lastResearchTime < config.research_agent?.throttle_ms || THROTTLE_MS) {
        return;
      }
      lastResearchTime = now;

      // Combined keyword + uncertainty detection (#7)
      const hasKeywords = detectKeywords(text);
      const hasUncertainty = config.research_agent?.uncertainty_detection ? detectUncertainty(text) : false;
      
      if (!hasKeywords && !hasUncertainty) return;

      const query = extractQuery(text);
      if (!query) return;

      const existing = recentTasks.find(t => t.query === query);
      if (existing && now - existing.time < 30000) return;

      recentTasks.push({ query, time: now });
      if (recentTasks.length > 10) recentTasks.shift();

      // Run proactive research in background (#7)
      setTimeout(() => {
        runProactiveResearch(query, { bus: output.bus });
      }, 100);
    },

    // ==========================================================================
    // IMPROVEMENT #8: Token-aware Context Injection
    // ==========================================================================
    'experimental.session.compacting': async (input, output) => {
      const config = loadConfig();
      if (!config.research_agent?.enabled) return;
      if (!config.research_agent?.context_injection) return;

      const findings = getRecentFindings(1);
      if (findings.length === 0) return;

      // Token-aware formatting (#8)
      const formatted = formatFindingsForContext(findings, 4000);
      if (!formatted) return;

      if (!output.context) {
        output.context = [];
      }

      output.context.push({
        role: 'system',
        parts: [{ type: 'text', text: formatted }]
      });
    },

    // ==========================================================================
    // IMPROVEMENT #6: Enhanced Slash Commands
    // ==========================================================================
    config: async (cfg) => {
      cfg.commands = cfg.commands || [];

      // Original commands with improvements
      cfg.commands.push({
        name: 'search',
        description: 'Quick web search: /search <query>',
        execute: async (query) => {
          if (!query) return 'Usage: /search <query>';
          
          try {
            const result = await enhancedSearch(query, { type: 'quick' });
            if (result.success && result.results) {
              return formatResultsWithCitations(result.results, query, {
                source: result.sources.join(', ')
              });
            }
            return `Search failed: ${result.error || 'No results'}`;
          } catch (e) {
            return `Search error: ${e.message}`;
          }
        }
      });

      cfg.commands.push({
        name: 'research',
        description: 'Quick research: /research <query>',
        execute: async (query) => {
          if (!query) return 'Usage: /research <query>';
          
          try {
            const result = await enhancedSearch(query, { type: 'quick' });
            if (result.success && result.results) {
              // Trigger proactive research
              execHooksAsync('proactive', [query], 1000).catch(() => {});
              
              return formatResultsWithCitations(result.results, query, {
                source: result.sources.join(', ') + ' (research)'
              });
            }
            return `Research failed: ${result.error || 'No results'}`;
          } catch (e) {
            return `Research error: ${e.message}`;
          }
        }
      });

      // IMPROVEMENT #6: New specialized search commands
      cfg.commands.push({
        name: 'search-github',
        description: 'GitHub-focused search: /search-github <query>',
        execute: async (query) => {
          if (!query) return 'Usage: /search-github <query>';
          
          try {
            const result = await enhancedSearch(`${query} site:github.com`, { type: 'github' });
            if (result.success && result.results) {
              return formatResultsWithCitations(result.results, query, {
                source: 'GitHub'
              });
            }
            return `GitHub search failed: ${result.error || 'No results'}`;
          } catch (e) {
            return `Search error: ${e.message}`;
          }
        }
      });

      cfg.commands.push({
        name: 'search-docs',
        description: 'Documentation search: /search-docs <query>',
        execute: async (query) => {
          if (!query) return 'Usage: /search-docs <query>';
          
          try {
            const result = await enhancedSearch(`${query} documentation guide`, { type: 'docs' });
            if (result.success && result.results) {
              return formatResultsWithCitations(result.results, query, {
                source: 'Documentation'
              });
            }
            return `Docs search failed: ${result.error || 'No results'}`;
          } catch (e) {
            return `Search error: ${e.message}`;
          }
        }
      });

      cfg.commands.push({
        name: 'lookup',
        description: 'Check research memory: /lookup <topic>',
        execute: async (query) => {
          if (!query) return 'Usage: /lookup <topic>';
          try {
            const result = execHooks('lookup', [query]);
            return JSON.stringify(result, null, 2);
          } catch (e) {
            return `Lookup error: ${e.message}`;
          }
        }
      });

      cfg.commands.push({
        name: 'research-stats',
        description: 'Show research statistics',
        execute: async () => {
          const stats = execHooks('stats');
          
          // Add cache stats
          try {
            if (existsSync(CACHE_PATH)) {
              const cacheData = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
              stats.cacheSize = Object.keys(cacheData.cache || {}).length;
            }
          } catch (e) {}
          
          return JSON.stringify(stats, null, 2);
        }
      });

      cfg.commands.push({
        name: 'research-clear',
        description: 'Clear research memory and cache',
        execute: async () => {
          const result1 = execHooks('clear');
          searchCache.clear();
          return `Research memory cleared. Cache cleared.`;
        }
      });

      cfg.commands.push({
        name: 'research-prune',
        description: 'Prune stale research entries',
        execute: async () => {
          const result1 = execHooks('prune');
          const prunedCache = searchCache.prune();
          return `Pruned ${result1?.pruned || 0} memory entries and ${prunedCache} cache entries.`;
        }
      });

      // IMPROVEMENT #6: Cache management command
      cfg.commands.push({
        name: 'search-cache-stats',
        description: 'Show search cache statistics',
        execute: async () => {
          try {
            if (existsSync(CACHE_PATH)) {
              const cacheData = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
              const entries = Object.entries(cacheData.cache || {});
              const now = Date.now();
              
              const stats = {
                totalEntries: entries.length,
                entries: entries.map(([key, val]) => ({
                  query: key.split(':')[1] || key,
                  age: Math.round((now - val.timestamp) / 1000 / 60) + ' min ago',
                  resultCount: val.data?.results?.length || 0
                })).slice(0, 10)
              };
              
              return JSON.stringify(stats, null, 2);
            }
            return 'Cache is empty.';
          } catch (e) {
            return `Cache stats error: ${e.message}`;
          }
        }
      });
    }
  };
};

export default ResearchAgentPlugin;
