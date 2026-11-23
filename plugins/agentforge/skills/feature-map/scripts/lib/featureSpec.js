// Feature specs for features that already exist. Maya (the Product Manager) reads a
// feature's code and writes its spec into .agentforge/feature-map.json; this module
// normalizes it and formats docs/specs/<feature>.md. It does not check the citations
// against the code: every page it writes is a draft.

// A spec must have at least this many acceptance criteria to count as complete.
export const MIN_CRITERIA = 3
export const MAX_CRITERIA = 15

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function strings(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : []
}

function lineNumber(value) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) && number > 0 ? number : null
}

// The paths a catalog feature owns, from its anchors ("module:public/js/agent",
// "route:/api/goals", "doc:docs/GOALS.md"): where the Product Manager starts reading.
export function anchorPaths(anchors) {
  return [...new Set((Array.isArray(anchors) ? anchors : [])
    .map(anchor => (typeof anchor === 'string' ? anchor : anchor?.id || ''))
    .map(anchor => {
      const [kind, ...rest] = anchor.split(':')
      const value = rest.join(':')
      return ['module', 'doc', 'route'].includes(kind) && value ? `${kind === 'route' ? 'route ' : ''}${value}` : ''
    })
    .filter(Boolean))]
}

function normalizeEvidence(item) {
  const startLine = lineNumber(item?.startLine)
  const endLine = lineNumber(item?.endLine)
  return {
    path: text(item?.path).replace(/^\.\//, ''),
    startLine,
    endLine: startLine && endLine && endLine >= startLine ? endLine : startLine,
    quote: typeof item?.quote === 'string' ? item.quote : '',
  }
}

// A scenario is one flow through the feature, step by step: the main flow, an
// alternative, or a failure and how it recovers. Each step names who acts — the user,
// the agent or the system — and, for an agent step, whether it needs the user's approval
// first. Scenarios carry the order and the approval points that one-line criteria lose.
export const SCENARIO_KINDS = Object.freeze(['main', 'alternative', 'failure'])
const ACTORS = ['user', 'agent', 'system']

function normalizeScenario(item, index) {
  const kind = SCENARIO_KINDS.includes(item?.kind) ? item.kind : 'main'
  const steps = (Array.isArray(item?.steps) ? item.steps : [])
    .map(step => ({ actor: ACTORS.includes(step?.actor) ? step.actor : 'system', action: text(step?.action), approval: step?.approval === true }))
    .filter(step => step.action)
  return { id: `SC${index + 1}`, title: text(item?.title), kind, steps }
}

// Coerce the model's spec. Criteria and requirements get stable ids (AC1…, FS-R01…).
export function normalizeFeatureSpec(result) {
  const criteria = (Array.isArray(result?.acceptanceCriteria) ? result.acceptanceCriteria : [])
    .map(item => ({
      given: text(item?.given),
      when: text(item?.when),
      then: text(item?.then),
      surface: text(item?.surface),
      evidence: (Array.isArray(item?.evidence) ? item.evidence : []).map(normalizeEvidence).filter(evidence => evidence.path),
      // The tests that check this criterion ({ path, name }), and what QA found
      // when it ran them: pass | fail | missing (a linked test wasn't found) | untested.
      tests: (Array.isArray(item?.tests) ? item.tests : []).map(test => ({ path: text(test?.path).replace(/^\.?\//, ''), name: text(test?.name) })).filter(test => test.path && test.name).slice(0, 6),
      ...(['pass', 'fail', 'missing', 'untested'].includes(item?.qa) ? { qa: item.qa } : {}),
    }))
    .filter(item => item.given || item.when || item.then)
    .slice(0, MAX_CRITERIA)
    .map((item, index) => ({ id: `AC${index + 1}`, ...item }))
  return {
    objective: text(result?.objective),
    summary: text(result?.summary),
    howItWorks: text(result?.howItWorks),
    inScope: strings(result?.inScope),
    outOfScope: strings(result?.outOfScope),
    userStories: strings(result?.userStories),
    functionalRequirements: strings(result?.functionalRequirements).map((requirement, index) => ({ id: `FS-R${String(index + 1).padStart(2, '0')}`, requirement })),
    acceptanceCriteria: criteria,
    scenarios: (Array.isArray(result?.scenarios) ? result.scenarios : []).map(normalizeScenario).filter(item => item.title || item.steps.length),
    risks: strings(result?.risks),
    openQuestions: strings(result?.openQuestions),
    limitations: strings(result?.limitations),
  }
}

// One criterion as the single line the delivery pipeline reads (featureSpec.acceptanceCriteria).
export function criterionLine(criterion) {
  return `${criterion.id}: Given ${criterion.given}, when ${criterion.when}, then ${criterion.then}${criterion.surface ? ` (${criterion.surface})` : ''}`
}

const list = (items) => items.map(item => `- ${item}`)

// The spec as Markdown in the team's feature-spec template shape.
// The feature's state at a glance, for the top of its spec page: the feature's own
// lifecycle (built, partial, deprecated, removed), its spec, and its QA.
const FEATURE_STATUS_LABEL = { built: 'Built', partial: 'Partly built', deprecated: 'Deprecated', removed: 'Removed' }
const SPEC_STATUS_LABEL = { draft: 'Draft, not verified', complete: 'Complete', in_progress: 'In progress', not_started: 'Not started', not_checked: 'Not checked' }
export function featureStatusLine({ featureStatus = '', specStatus = '', qa = null } = {}) {
  const parts = []
  if (featureStatus) parts.push(`**Feature:** ${FEATURE_STATUS_LABEL[featureStatus] || featureStatus}`)
  if (specStatus) parts.push(`**Spec:** ${SPEC_STATUS_LABEL[specStatus] || specStatus.replace(/_/g, ' ')}`)
  const counts = qa?.counts
  if (counts?.criteria) {
    const failing = counts.failing ? `, ${counts.failing} failing` : ''
    parts.push(`**QA:** ${counts.passing} of ${counts.criteria} criteria pass${failing}`)
  }
  return parts.join(' · ')
}

export function featureSpecMarkdown(name, spec, { featureId = '', writtenAt = '', featureStatus = '', specStatus = '', qa = null } = {}) {
  const cell = (value) => String(value || '').replace(/\|/g, '\\|').replace(/\n+/g, ' ')
  // "The user presses Enter." reads as "the user presses Enter" inside a sentence; an
  // acronym (API, UI) keeps its capital.
  const clause = (value) => {
    const textValue = String(value || '').trim().replace(/[.]+$/, '')
    // Only an opening common word is lowercased; a name (Muse, Gmail, Settings) keeps its capital.
    return /^(?:A|An|The|This|That|These|Those|It|Its|They|Their|Each|Every|No|Nothing|Only|Some|Any|All|Several|One|Another|Both|Either|Neither|There|When|If|Once)\b/.test(textValue) ? textValue[0].toLowerCase() + textValue.slice(1) : textValue
  }
  const criteria = spec.acceptanceCriteria || []
  const verified = criteria.filter(criterion => criterion.verified).length
  const out = ['---', `title: ${name}`, 'type: Feature spec', featureId ? `featureId: ${featureId}` : null, featureStatus ? `featureStatus: ${featureStatus}` : null, `status: ${specStatus === 'draft' ? 'Draft, not verified' : 'Written from code'}`, 'owner: Product Manager (Maya)', '---', '', `# ${name}`, ''].filter(line => line !== null)
  const statusLine = featureStatusLine({ featureStatus, specStatus, qa })
  if (statusLine) out.push(statusLine, '')
  if (featureStatus === 'deprecated') out.push('> **Deprecated.** This feature is no longer used. Its code is still in the repository; this spec is kept as a record of what it did.', '')
  if (featureStatus === 'removed') out.push('> **Removed.** This feature and its code are gone; this spec is kept as a record of what it did.', '')
  const glance = []
  if (criteria.length) glance.push(criteria.some(criterion => criterion.verified !== undefined) ? `**${verified} of ${criteria.length}** acceptance criteria checked against the code` : `**${criteria.length}** acceptance criteria`)
  if (spec.risks.length) glance.push(`${spec.risks.length} risk${spec.risks.length === 1 ? '' : 's'}`)
  if (spec.openQuestions.length) glance.push(`${spec.openQuestions.length} open question${spec.openQuestions.length === 1 ? '' : 's'}`)
  if (glance.length) out.push(glance.join(' · '), '')
  out.push(`_Written by Maya from the code${writtenAt ? ` on ${writtenAt.slice(0, 10)}` : ''}. It describes the feature as built, not as planned._`, '')
  if (specStatus === 'draft') out.push('> **Draft.** The citations below have not been checked against the code. Treat each criterion as a claim to confirm.', '')
  if (spec.objective || spec.summary) {
    out.push('## Summary', '')
    if (spec.objective) out.push(`**${spec.objective}**`, '')
    if (spec.summary) out.push(spec.summary, '')
  }
  if (spec.userStories.length) out.push('## User stories', '', ...list(spec.userStories), '')
  if (spec.inScope.length || spec.outOfScope.length) {
    out.push('## Scope', '')
    if (spec.inScope.length) out.push('**In scope**', '', ...list(spec.inScope), '')
    if (spec.outOfScope.length) out.push('**Out of scope**', '', ...list(spec.outOfScope), '')
  }
  if (spec.functionalRequirements.length) {
    out.push('## Requirements', '', '| ID | Requirement |', '|---|---|', ...spec.functionalRequirements.map(item => `| ${item.id} | ${cell(item.requirement)} |`), '')
  }
  if (criteria.length) {
    const showSurface = criteria.some(criterion => criterion.surface)
    const showCheck = criteria.some(criterion => criterion.verified !== undefined)
    // Once QA has run: did the criterion's tests pass?
    const showQa = criteria.some(criterion => criterion.qa)
    const QA_CELL = { pass: '✓ passes', fail: '✗ fails', missing: '? test not found', untested: '— no test' }
    const head = ['#', 'Given', 'When', 'Then', ...(showSurface ? ['Where'] : []), ...(showCheck ? ['In code'] : []), ...(showQa ? ['Tested'] : [])]
    out.push('## Acceptance criteria', '', `| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`)
    for (const criterion of criteria) {
      const row = [criterion.id, cell(clause(criterion.given)), cell(clause(criterion.when)), cell(clause(criterion.then)), ...(showSurface ? [cell(criterion.surface)] : []), ...(showCheck ? [criterion.verified ? '✓' : '✗ not found'] : []), ...(showQa ? [QA_CELL[criterion.qa] || '— no test'] : [])]
      out.push(`| ${row.join(' | ')} |`)
    }
    out.push('', '_The code each criterion rests on is under Evidence, at the end._', '')
  }
  if (spec.scenarios?.length) {
    out.push('## Scenarios', '')
    for (const scenario of spec.scenarios) {
      out.push(`### ${scenario.id} ${scenario.title}${scenario.kind === 'main' ? '' : ` (${scenario.kind})`}`, '')
      scenario.steps.forEach((step, index) => out.push(`${index + 1}. **${step.actor[0].toUpperCase()}${step.actor.slice(1)}**${step.approval ? ' _(after the user approves)_' : ''}: ${step.action}`))
      out.push('')
    }
  }
  if (spec.risks.length) out.push('## Risks', '', ...list(spec.risks), '')
  if (spec.openQuestions.length) out.push('## Open questions', '', ...list(spec.openQuestions), '')
  if (spec.howItWorks) out.push('## How it works', '', '_For engineers: where the behavior above lives in the code._', '', spec.howItWorks, '')
  const cited = criteria.filter(criterion => criterion.evidence.length)
  if (cited.length) {
    out.push('## Evidence', '', '| # | Code | Quote |', '|---|---|---|')
    for (const criterion of cited) {
      criterion.evidence.forEach((item, index) => {
        const quote = item.quote ? `\`${cell(item.quote.replace(/`/g, "'").trim().slice(0, 120))}\`` : ''
        out.push(`| ${index === 0 ? criterion.id : ''} | \`${item.path}${item.startLine ? `:${item.startLine}` : ''}\` | ${quote} |`)
      })
    }
    out.push('')
  }
  const tested = criteria.filter(criterion => criterion.tests?.length)
  if (tested.length) {
    out.push('## Tests', '', '| # | Test | File |', '|---|---|---|')
    for (const criterion of tested) criterion.tests.forEach((test, index) => out.push(`| ${index === 0 ? criterion.id : ''} | ${cell(test.name)} | \`${test.path}\` |`))
    out.push('')
  }
  if (spec.limitations.length) out.push('## Not confirmed from the code', '', ...list(spec.limitations), '')
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
