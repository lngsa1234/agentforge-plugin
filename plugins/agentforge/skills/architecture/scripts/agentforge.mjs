#!/usr/bin/env node
// AgentForge's page writer for the Claude Code plugin. Claude writes the JSON; this script
// checks its structure and turns it into Markdown pages. It does not check claims against
// the code, so every page it writes is a draft.
//
//   node agentforge.mjs write-specs [--root DIR]
//     Checks the feature map's ids (present, kebab-case, used once), then writes
//     docs/specs/<id>.md for every feature with a spec, marked "Draft, not verified".
//     Reports specs that are missing parts: an objective, at least 3 criteria, a
//     given/when/then and a cited file and quote on each criterion.
//
//   node agentforge.mjs write-baseline [--root DIR]
//     Writes docs/product/baseline.md from .agentforge/product-baseline.json, and reports
//     journey steps and PRD requirements that name features the map doesn't have.
//
//   node agentforge.mjs write-architecture [--root DIR]
//     Writes the C4 container and component pages in docs/architecture/ from
//     .agentforge/architecture-map.json.
//
//   node agentforge.mjs write-workflows [--root DIR]
//     Writes docs/architecture/workflows/ (an index and one page per workflow) from
//     .agentforge/workflows.json.
//
//   node agentforge.mjs hook session-start
//     Claude Code hook (hooks/hooks.json): tells Claude what AgentForge files are missing.
//
// No network, no model, no dependencies beyond Node 18+.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { featureSpecMarkdown, normalizeFeatureSpec, MIN_CRITERIA } from './lib/featureSpec.js'
import { normalizeWorkflowMap, workflowIndexMarkdown, workflowMarkdown } from './lib/workflowMap.js'
import { c4ComponentsMarkdown, c4ContainersMarkdown, componentsDocPath, normalizeArchitectureMap } from './lib/architectureMap.js'
import { baselineMarkdown, featureKey, normalizeBaseline } from './lib/productBaseline.js'

const MAP_PATH = '.agentforge/feature-map.json'
const BASELINE_PATH = '.agentforge/product-baseline.json'
const BASELINE_DOC = 'docs/product/baseline.md'
const ARCHITECTURE_FILE = '.agentforge/architecture-map.json'
const WORKFLOWS_FILE = '.agentforge/workflows.json'
const WORKFLOW_DIR = 'docs/architecture/workflows'

const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const specPath = (feature) => `docs/specs/${slugify(featureKey(feature?.id) || feature?.name)}.md`

function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = { command, sub: '', root: process.cwd() }
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    if (arg === '--root') options.root = resolve(rest[++index] || '.')
    else if (!arg.startsWith('--') && !options.sub) options.sub = arg
  }
  return options
}

const readText = (root, path) => {
  const full = resolve(root, path)
  if (!full.startsWith(resolve(root))) return null
  try { return readFileSync(full, 'utf8') } catch { return null }
}

const readJson = (root, path) => {
  const text = readText(root, path)
  if (text === null) return { missing: true }
  try { return { value: JSON.parse(text) } } catch (error) { return { error: `${path} is not valid JSON: ${error.message}` } }
}

function loadFeatureMap(root) {
  const read = readJson(root, MAP_PATH)
  if (read.missing) return null
  if (read.error) throw new Error(read.error)
  const map = read.value
  return { ...map, features: Array.isArray(map?.features) ? map.features : [] }
}

const writeFile = (root, path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), text)
}

// ---- feature map ------------------------------------------------------------------

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const FEATURE_STATUSES = ['built', 'partial', 'deprecated', 'removed']
const isRetired = (feature) => feature?.status === 'deprecated' || feature?.status === 'removed'

// The map's own rules. Every spec page is named after its feature's id, so an id must
// exist, be a kebab-case slug, and be used once in the whole map (removed features too).
export function checkFeatureMap(features, { root = '' } = {}) {
  const errors = []
  const notes = []
  const seen = new Map()
  features.forEach((feature, index) => {
    const label = feature?.name ? `"${feature.name}"` : `feature ${index + 1}`
    const id = typeof feature?.id === 'string' ? feature.id : ''
    if (!id) { errors.push(`${label} has no id. Give it the kebab-case slug of its name.`); return }
    if (!ID_PATTERN.test(id)) errors.push(`${label} has id "${id}", which isn't a kebab-case slug (lowercase letters, digits and single hyphens).`)
    if (seen.has(id)) errors.push(`${label} uses the id "${id}", already used by ${seen.get(id)}. Ids are used once, removed features included.`)
    else seen.set(id, label)
    if (feature.status !== undefined && !FEATURE_STATUSES.includes(feature.status)) errors.push(`${label} has status "${feature.status}". Use ${FEATURE_STATUSES.join(', ')}.`)
  })
  for (const feature of features.filter(item => !isRetired(item))) {
    for (const anchor of Array.isArray(feature?.anchors) ? feature.anchors : []) {
      const id = typeof anchor === 'string' ? anchor : anchor?.id
      const split = typeof id === 'string' ? id.indexOf(':') : -1
      if (split < 1) continue
      const path = id.slice(split + 1).replace(/^\.?\/+|\/+$/g, '')
      if (root && path && id.slice(0, split) !== 'route' && !existsSync(join(root, path))) notes.push(`"${feature.name}" has anchor ${id}, but ${path} doesn't exist.`)
    }
  }
  return { errors, notes }
}

const mapErrorMessage = (errors) => `The feature map needs fixing first:\n${errors.map(item => `- ${item}`).join('\n')}`

// ---- specs ------------------------------------------------------------------------

// What a spec is missing, by shape only. Citations are not checked against the code.
export function specGaps(spec) {
  const gaps = []
  if (!spec.objective) gaps.push('The objective is empty: say in one or two sentences what the feature does for the user.')
  if (spec.acceptanceCriteria.length < MIN_CRITERIA) gaps.push(`Only ${spec.acceptanceCriteria.length} acceptance criteria; write at least ${MIN_CRITERIA}.`)
  for (const criterion of spec.acceptanceCriteria) {
    const missing = ['given', 'when', 'then'].filter(part => !criterion[part])
    const issues = []
    if (missing.length) issues.push(`is missing its ${missing.join(', ')}`)
    if (!criterion.evidence.some(item => item.path && item.quote)) issues.push('cites no file and quote')
    if (issues.length) gaps.push(`${criterion.id} ${issues.join(' and ')}.`)
  }
  for (const scenario of spec.scenarios || []) {
    if (!scenario.title || scenario.steps.length < 2) gaps.push(`Scenario ${scenario.id} needs a title and at least two steps.`)
  }
  return gaps
}

export function writeSpecs(root, { now = new Date().toISOString() } = {}) {
  const map = loadFeatureMap(root)
  if (!map) return { error: `No ${MAP_PATH} yet. Run the feature-map skill first.` }
  const mapCheck = checkFeatureMap(map.features, { root })
  if (mapCheck.errors.length) return { error: mapErrorMessage(mapCheck.errors) }
  const results = []
  for (const feature of map.features) {
    const draft = feature.spec?.document
    const path = specPath(feature)
    if (!draft) {
      const existing = existsSync(join(root, path)) ? path : ''
      feature.spec = existing ? { status: 'not_checked', existingDoc: existing } : { status: 'not_started' }
      if (!isRetired(feature)) results.push({ name: feature.name, status: feature.spec.status, gaps: existing ? [`Has a spec at ${existing} that isn't in the feature map yet. The feature-spec skill brings it in.`] : [] })
      continue
    }
    const spec = normalizeFeatureSpec(draft)
    const gaps = isRetired(feature) ? [] : specGaps(spec)
    feature.spec = { status: gaps.length ? 'in_progress' : 'draft', document: draft, gaps, writtenAt: now }
    writeFile(root, path, featureSpecMarkdown(feature.name, spec, { featureId: feature.id, writtenAt: now, featureStatus: feature.status || 'built', specStatus: feature.spec.status }))
    if (!isRetired(feature)) results.push({ name: feature.name, status: feature.spec.status, gaps, path })
  }
  writeFile(root, MAP_PATH, `${JSON.stringify(map, null, 2)}\n`)
  return { results, notes: mapCheck.notes }
}

function printSpecs({ error, results, notes = [] }) {
  if (error) { console.log(error); return 1 }
  const drafts = results.filter(item => item.status === 'draft').length
  console.log(`# Feature specs: ${drafts} of ${results.length} written as drafts\n`)
  for (const item of results) {
    console.log(`- **${item.name}**: ${item.status.replace(/_/g, ' ')}${item.path ? ` (${item.path})` : ''}`)
    for (const gap of item.gaps) console.log(`  - ${gap}`)
  }
  if (notes.length) console.log(`\n${notes.map(item => `Note: ${item}`).join('\n')}`)
  console.log('\nDrafts are not checked against the code: each criterion\'s quote is a claim to confirm. The hosted AgentForge verifies them.')
  return 0
}

// ---- baseline ---------------------------------------------------------------------

export function writeBaseline(root, { now = new Date().toISOString() } = {}) {
  const read = readJson(root, BASELINE_PATH)
  if (read.missing) return { error: `No ${BASELINE_PATH} yet. Run the product-baseline skill first.` }
  if (read.error) return { error: read.error }
  const features = loadFeatureMap(root)?.features || []
  const mapCheck = checkFeatureMap(features)
  if (mapCheck.errors.length) return { error: mapErrorMessage(mapCheck.errors) }
  const document = read.value.document || read.value
  const baseline = normalizeBaseline(document)
  const known = new Set(features.filter(feature => !isRetired(feature)).map(feature => featureKey(feature.id)))
  const gaps = []
  if (!baseline.product.summary) gaps.push('The product summary is empty.')
  for (const journey of baseline.journeys) {
    const unknown = [...new Set(journey.steps.map(step => step.feature).filter(key => key && !known.has(key)))]
    if (unknown.length) gaps.push(`${journey.id} names features not in the feature map: ${unknown.join(', ')}.`)
  }
  for (const item of baseline.prd?.requirements || []) {
    const unknown = item.features.filter(key => !known.has(key))
    if (unknown.length) gaps.push(`${item.id} cites features not in the feature map: ${unknown.join(', ')}.`)
  }
  writeFile(root, BASELINE_PATH, `${JSON.stringify({ document, status: 'draft', gaps, writtenAt: now }, null, 2)}\n`)
  writeFile(root, BASELINE_DOC, baselineMarkdown(baseline, features, { writtenAt: now, specPath, specExists: path => existsSync(join(root, path)) }))
  return { journeys: baseline.journeys.length, gaps, path: BASELINE_DOC }
}

function printBaseline(result) {
  if (result.error) { console.log(result.error); return 1 }
  console.log(`# Product baseline: draft (${result.path})\n`)
  console.log(`- ${result.journeys} journeys`)
  if (result.gaps.length) console.log(`\nTo fix:\n${result.gaps.map(item => `- ${item}`).join('\n')}`)
  return 0
}

// ---- architecture -----------------------------------------------------------------

const liveFeatures = (root) => (loadFeatureMap(root)?.features || []).filter(feature => !isRetired(feature) && feature?.id)

// Only pages this plugin wrote (front matter "owner: Alex") are ever removed.
const writtenByAlex = (text, type) => new RegExp(`^---\\n[\\s\\S]*?type: ${type}[\\s\\S]*?owner: Alex`).test(text || '')

export function writeArchitecture(root, { now = new Date().toISOString() } = {}) {
  const read = readJson(root, ARCHITECTURE_FILE)
  if (read.missing) return { error: `No ${ARCHITECTURE_FILE} yet. Run the architecture skill first.` }
  if (read.error) return { error: read.error }
  const document = read.value.document || read.value
  const features = liveFeatures(root)
  const map = normalizeArchitectureMap(document, null, { knownFeatures: features.length ? features.map(feature => feature.name) : null })
  const gaps = []
  if (map.components.length < 2) gaps.push('Map at least two containers: the deployable parts and the data stores, plus the outside services they call.')
  const container = document?.componentView?.container
  if (container && !map.components.some(component => component.id === container)) gaps.push(`The component view zooms into "${container}", which is not one of the containers.`)
  writeFile(root, ARCHITECTURE_FILE, `${JSON.stringify({ document, status: 'draft', gaps, writtenAt: now }, null, 2)}\n`)
  const written = ['docs/architecture/c4-containers.md']
  writeFile(root, written[0], `${c4ContainersMarkdown(map, { builtAt: now })}\n`)
  if (map.componentView?.components?.length) {
    written.push(componentsDocPath(map))
    writeFile(root, written[1], `${c4ComponentsMarkdown(map, { builtAt: now })}\n`)
  }
  const removed = []
  for (const file of readdirSync(join(root, 'docs/architecture'))) {
    const path = `docs/architecture/${file}`
    if (!/^c4-components-.+\.md$/.test(file) || written.includes(path)) continue
    if (writtenByAlex(readText(root, path), 'Architecture')) { rmSync(join(root, path)); removed.push(path) }
  }
  return { containers: map.components.length, components: map.componentView?.components?.length || 0, gaps, written, removed }
}

function printArchitecture(result) {
  if (result.error) { console.log(result.error); return 1 }
  console.log('# Architecture map: draft\n')
  console.log(`- ${result.containers} containers, ${result.components} components`)
  console.log(`- Wrote ${result.written.join(', ')}${result.removed.length ? `; removed ${result.removed.join(', ')}` : ''}`)
  if (result.gaps.length) console.log(`\nTo fix:\n${result.gaps.map(item => `- ${item}`).join('\n')}`)
  return 0
}

export function writeWorkflows(root, { now = new Date().toISOString() } = {}) {
  const read = readJson(root, WORKFLOWS_FILE)
  if (read.missing) return { error: `No ${WORKFLOWS_FILE} yet. Run the architecture skill first.` }
  if (read.error) return { error: read.error }
  const document = read.value.document || read.value
  const features = liveFeatures(root).map(feature => ({ id: feature.id, name: feature.name || feature.id }))
  const map = normalizeWorkflowMap(document, { knownFeatures: features })
  const gaps = []
  const raw = Array.isArray(document?.workflows) ? document.workflows : []
  const kept = new Set(map.workflows.map(workflow => workflow.name))
  for (const item of raw) {
    const name = String(item?.name || '').trim()
    if (!name) gaps.push('A workflow has no name.')
    else if (!kept.has(name)) gaps.push(`"${name}" was dropped: a workflow needs at least two steps.`)
    const unknown = (Array.isArray(item?.features) ? item.features : []).filter(id => !features.some(feature => feature.id === id))
    if (name && unknown.length) gaps.push(`"${name}" names features not in the feature map: ${unknown.join(', ')}.`)
  }
  writeFile(root, WORKFLOWS_FILE, `${JSON.stringify({ document, status: 'draft', gaps, writtenAt: now }, null, 2)}\n`)
  const featureNames = Object.fromEntries(features.map(feature => [feature.id, feature.name]))
  const written = new Set(['README.md'])
  writeFile(root, `${WORKFLOW_DIR}/README.md`, `${workflowIndexMarkdown(map, { builtAt: now })}\n`)
  for (const workflow of map.workflows) {
    writeFile(root, `${WORKFLOW_DIR}/${workflow.id}.md`, `${workflowMarkdown(workflow, { featureNames, builtAt: now })}\n`)
    written.add(`${workflow.id}.md`)
  }
  const removed = []
  for (const file of readdirSync(join(root, WORKFLOW_DIR))) {
    if (written.has(file) || !file.endsWith('.md')) continue
    if (writtenByAlex(readText(root, `${WORKFLOW_DIR}/${file}`), 'Workflow')) { rmSync(join(root, WORKFLOW_DIR, file)); removed.push(file) }
  }
  return { workflows: map.workflows.map(workflow => ({ name: workflow.name, steps: workflow.steps.length })), gaps, removed, path: WORKFLOW_DIR }
}

function printWorkflows(result) {
  if (result.error) { console.log(result.error); return 1 }
  console.log(`# Workflows: draft (${result.path})\n`)
  for (const workflow of result.workflows) console.log(`- **${workflow.name}** — ${workflow.steps} steps`)
  if (result.removed.length) console.log(`- Removed: ${result.removed.join(', ')}`)
  if (result.gaps.length) console.log(`\nTo fix:\n${result.gaps.map(item => `- ${item}`).join('\n')}`)
  return 0
}

// ---- hooks ------------------------------------------------------------------------

function readConfig(root) {
  try { return JSON.parse(readText(root, '.agentforge/config.json') || '{}') } catch { return {} }
}

function repoRoot(cwd) {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' }
}

// What Claude should know at the start of a session: which AgentForge files are missing.
export function sessionStartContext(root) {
  if (!root || readConfig(root)?.hooks?.sessionStart === false) return ''
  const missing = []
  let map = null
  try { map = loadFeatureMap(root) } catch {}
  if (!map) missing.push('no feature map (the `feature-map` skill builds one from the code)')
  else {
    const unspecced = map.features.filter(feature => !isRetired(feature) && !feature.spec?.document).map(feature => feature.name)
    if (unspecced.length) missing.push(`${unspecced.length} feature${unspecced.length === 1 ? '' : 's'} without a spec (${unspecced.slice(0, 5).join(', ')}${unspecced.length > 5 ? ', …' : ''}; the \`feature-spec\` skill writes them)`)
  }
  if (!existsSync(join(root, 'docs/architecture/README.md'))) missing.push('no architecture overview (the `architecture` skill writes one)')
  if (!missing.length) return ''
  return `AgentForge: this repository has ${missing.join('; ')}. Mention this once if it's relevant to what the user asks; don't start the work unasked.`
}

async function readStdin() {
  if (process.stdin.isTTY) return ''
  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data
}

async function runHook(name) {
  if (process.env.AGENTFORGE_HOOKS === 'off') return 0
  try {
    let input = {}
    try { input = JSON.parse(await readStdin() || '{}') } catch {}
    if (name === 'session-start') {
      const context = sessionStartContext(repoRoot(input.cwd || process.cwd()))
      if (context) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }))
    }
  } catch {
    // A hook must never break the session.
  }
  return 0
}

// ---- main -------------------------------------------------------------------------

const USAGE = 'Usage: node agentforge.mjs write-specs | write-baseline | write-architecture | write-workflows | hook session-start [--root DIR]'

async function main() {
  const options = parseArgs(process.argv.slice(2))
  try {
    switch (options.command) {
      case 'write-specs': return printSpecs(writeSpecs(options.root))
      case 'write-baseline': return printBaseline(writeBaseline(options.root))
      case 'write-architecture': return printArchitecture(writeArchitecture(options.root))
      case 'write-workflows': return printWorkflows(writeWorkflows(options.root))
      case 'hook': return runHook(options.sub)
      default: console.log(USAGE); return options.command ? 1 : 0
    }
  } catch (error) {
    console.log(error.message)
    return 1
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('agentforge.mjs')) {
  main().then(code => { process.exitCode = code })
}
