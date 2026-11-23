// The product baseline (.agentforge/product-baseline.json): one document, in
// one shape, that says what the product is today. Maya writes it from the feature map
// and the code, and from the customer's PRD when there is one — whatever shape that PRD
// is in. It holds what no single feature spec can: who the product is for, the journeys
// that run across several features, and, with a PRD, what the PRD asks for against what
// is built. The model writes; this module formats it.

export const PRIORITIES = Object.freeze(['P1', 'P2', 'P3'])
export const ALIGNMENT = Object.freeze(['built', 'partial', 'not_built'])
export const MAX_JOURNEYS = 8
const ACTORS = ['user', 'agent', 'system']

const text = (value) => (typeof value === 'string' ? value.trim() : '')
const strings = (value) => (Array.isArray(value) ? value.map(text).filter(Boolean) : [])
const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

// A feature's short id: "owner/repo::goals" and "goals" are both "goals".
export const featureKey = (id) => String(id || '').split('::').pop().trim()

// Coerce the model's baseline. Journeys and PRD requirements get stable ids (J1…, PRD-01…).
export function normalizeBaseline(result) {
  const journeys = (Array.isArray(result?.journeys) ? result.journeys : [])
    .map(item => ({
      title: text(item?.title),
      user: text(item?.user),
      goal: text(item?.goal),
      trigger: text(item?.trigger),
      priority: PRIORITIES.includes(item?.priority) ? item.priority : 'P2',
      steps: (Array.isArray(item?.steps) ? item.steps : [])
        .map(step => ({ actor: ACTORS.includes(step?.actor) ? step.actor : 'system', action: text(step?.action), ...(text(step?.short) ? { short: text(step.short) } : {}), feature: featureKey(step?.feature), approval: step?.approval === true }))
        .filter(step => step.action),
      outcome: text(item?.outcome),
      failures: strings(item?.failures),
    }))
    .filter(item => item.title || item.steps.length)
    .slice(0, MAX_JOURNEYS)
    .map((item, index) => ({ id: `J${index + 1}`, ...item }))
  const prdRequirements = (Array.isArray(result?.prd?.requirements) ? result.prd.requirements : [])
    .map(item => ({ requirement: text(item?.requirement), source: text(item?.source), status: ALIGNMENT.includes(item?.status) ? item.status : 'not_built', features: [...new Set((Array.isArray(item?.features) ? item.features : []).map(featureKey).filter(Boolean))], note: text(item?.note) }))
    .filter(item => item.requirement)
    .map((item, index) => ({ id: `PRD-${String(index + 1).padStart(2, '0')}`, ...item }))
  return {
    product: {
      name: text(result?.product?.name),
      summary: text(result?.product?.summary),
      users: (Array.isArray(result?.product?.users) ? result.product.users : []).map(user => ({ name: text(user?.name), needs: text(user?.needs) })).filter(user => user.name),
    },
    prd: result?.prd && (text(result.prd.path) || prdRequirements.length) ? { path: text(result.prd.path), requirements: prdRequirements } : null,
    journeys,
    openQuestions: strings(result?.openQuestions),
  }
}

// The doc viewer's heading anchors (repoDocs.headingSlug), so the journey table links land.
const anchor = (text) => String(text).toLowerCase().replace(/[`*_~[\]()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const cell = (value) => String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

// Mermaid diagrams for the journeys. Labels lose the characters Mermaid would read as
// syntax; long actions are cut so a node stays readable on a phone.
const label = (value, max = 60) => {
  const clean = String(value || '').replace(/;/g, ',').replace(/["`<>{}\[\]|#]/g, '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max).replace(/[\s,(]+$/, '')}…`
}
// One journey as swimlanes: a lane per actor (the journey's user, the product's agent,
// the system), steps numbered in order and flowing between lanes. An agent step that
// waits for approval gets the user's ✋ approval as its own step in the user's lane, just
// before it. Each step shows its feature underneath; the flow ends in the outcome.
export function journeyDiagram(journey, nameOf = (key) => key, { userLane = '', agentLane = '' } = {}) {
  const lanes = { user: label(userLane || journey.user || 'User', 30), agent: label(agentLane || 'Agent', 30), system: 'System' }
  // The step's short label (2–5 words) when it has one; otherwise its action without tool
  // names, kept whole rather than cut mid-sentence.
  const short = (step) => (step.short ? label(step.short, 40) : label(String(step.action || '').replace(/\s*\([a-z_]+(?:,\s*[a-z_]+)*\)/g, ''), 90))
  const nodes = []
  for (const step of journey.steps) {
    if (step.approval && step.actor === 'agent') nodes.push({ actor: 'user', text: '✋ Approves', approval: true })
    nodes.push({ actor: step.actor, text: short(step), feature: step.feature })
  }
  const lines = ['flowchart LR']
  for (const actor of ['user', 'agent', 'system']) {
    const inLane = nodes.map((node, index) => ({ ...node, id: `s${index + 1}`, n: index + 1 })).filter(node => node.actor === actor)
    if (!inLane.length) continue
    lines.push(`  subgraph ${actor}_lane["${lanes[actor]}"]`, '    direction LR')
    for (const node of inLane) {
      const text = `${node.n}. ${node.text}${node.feature ? `<br/><i>${label(nameOf(node.feature), 30)}</i>` : ''}`
      lines.push(node.approval ? `    ${node.id}(["${text}"])` : `    ${node.id}["${text}"]`)
    }
    lines.push('  end')
  }
  nodes.forEach((node, index) => { if (index > 0) lines.push(`  s${index} --> s${index + 1}`) })
  if (journey.outcome && nodes.length) lines.push(`  done(["✅ ${label(journey.outcome, 90)}"])`, `  s${nodes.length} --> done`)
  lines.push(
    '  classDef approval fill:#fff4e0,stroke:#d18a1f,color:#5c3a00',
    '  classDef outcome fill:#e6f6ea,stroke:#2f9e4f,color:#14401f',
  )
  // Style only the lanes drawn: styling a missing one makes Mermaid draw it as a node.
  const LANE_STYLE = { user: 'fill:#fdf2fb,stroke:#d58ad0', agent: 'fill:#effaf7,stroke:#6cc9b4', system: 'fill:#f5f5f5,stroke:#aaa' }
  for (const actor of Object.keys(LANE_STYLE)) if (nodes.some(node => node.actor === actor)) lines.push(`  style ${actor}_lane ${LANE_STYLE[actor]}`)
  const approvals = nodes.map((node, index) => (node.approval ? `s${index + 1}` : '')).filter(Boolean)
  if (approvals.length) lines.push(`  class ${approvals.join(',')} approval`)
  if (journey.outcome && nodes.length) lines.push('  class done outcome')
  return lines.join('\n')
}


// The baseline as Markdown (docs/product/baseline.md). Feature names link to their specs
// when the spec exists (`specExists(path)`).
export function baselineMarkdown(baseline, features, { checked = null, writtenAt = '', specPath = (feature) => `docs/specs/${slugify(featureKey(feature.id) || feature.name)}.md`, specExists = () => true } = {}) {
  const byKey = new Map((Array.isArray(features) ? features : []).map(feature => [featureKey(feature.id) || slugify(feature.name), feature]))
  const link = (key) => {
    const feature = byKey.get(key)
    // Link a feature only to a spec that exists; otherwise name it.
    if (!feature) return key
    return specExists(specPath(feature)) ? `[${feature.name}](../${specPath(feature).replace(/^docs\//, '')})` : feature.name
  }
  const name = baseline.product.name || 'Product'
  const nameOf = (key) => byKey.get(key)?.name || key
  const live = [...byKey.values()].filter(feature => feature.status !== 'removed' && feature.status !== 'deprecated')
  const actorName = (journey, actor) => (actor === 'user' ? journey.user || 'User' : actor === 'agent' ? name : 'System')
  const SPEC_WORDS = { complete: '✓ Checked against the code', draft: 'Draft', in_progress: 'In progress', not_checked: 'Written, not checked yet', not_started: 'Not written yet' }
  const specWords = (feature) => SPEC_WORDS[feature.spec?.status] || SPEC_WORDS.not_started
  const out = ['---', `title: ${name} — product baseline`, 'type: Product baseline', 'owner: Product Manager (Maya)', `status: ${checked ? (checked.passed ? 'Checked' : 'Needs review') : 'Draft'}`, '---', '', `# ${name}: product baseline`, '']
  out.push(`_What the product is today, written by Maya from the code${baseline.prd ? ` and the PRD (\`${baseline.prd.path || 'provided'}\`)` : ''}${writtenAt ? ` on ${writtenAt.slice(0, 10)}` : ''}. Each feature's detail is in its spec._`, '')

  // At a glance: the counts a reader wants before anything else.
  const specCount = (status) => live.filter(feature => (feature.spec?.status || 'not_started') === status).length
  const byPriority = (priority) => baseline.journeys.filter(journey => journey.priority === priority).length
  const glance = [
    `**${baseline.product.users.length}** user${baseline.product.users.length === 1 ? '' : 's'}`,
    `**${baseline.journeys.length}** journeys${baseline.journeys.length ? ` (${['P1', 'P2', 'P3'].map(priority => byPriority(priority) && `${byPriority(priority)} ${priority}`).filter(Boolean).join(', ')})` : ''}`,
    `**${live.length}** features`,
    `specs: **${specCount('draft') + specCount('complete') + specCount('in_progress') + specCount('not_checked')}** written, ${specCount('not_started')} not written`,
  ]
  if (baseline.prd?.requirements.length) glance.push(`PRD: **${baseline.prd.requirements.filter(item => item.status === 'built').length}** of ${baseline.prd.requirements.length} requirements built`)
  out.push(`**At a glance:** ${glance.join(' · ')}`, '')

  if (baseline.product.summary) out.push('## Summary', '', baseline.product.summary, '')
  if (baseline.product.users.length) out.push('## Users', '', ...baseline.product.users.map(user => `- **${user.name}**${user.needs ? ` — ${user.needs}` : ''}`), '')

  if (baseline.journeys.length) {
    out.push('## Journeys', '', 'What users set out to do, end to end. Each journey runs through several features; tap a diagram to zoom in.', '')
    out.push('| Journey | Priority | Features it runs through |', '|---|---|---|')
    for (const journey of baseline.journeys) out.push(`| [${journey.id} ${cell(journey.title)}](#${anchor(`${journey.id} ${journey.title}`)}) | ${journey.priority} | ${[...new Set(journey.steps.map(step => step.feature).filter(Boolean))].map(link).join(', ')} |`)
    out.push('')
    for (const journey of baseline.journeys) {
      out.push(`### ${journey.id} ${journey.title}`, '')
      out.push(...[
        `- **Priority:** ${journey.priority}`,
        journey.user && `- **Who:** ${journey.user}`,
        journey.goal && `- **Goal:** ${journey.goal}`,
        journey.trigger && `- **Starts when:** ${journey.trigger}`,
      ].filter(Boolean), '')
      if (journey.steps.length) out.push('```mermaid', journeyDiagram(journey, nameOf, { agentLane: name }), '```', '')
      if (journey.steps.length) {
        // The steps in full, as a table: the diagram shows the shape, this the detail.
        out.push('| # | Who | Step | Feature |', '|---|---|---|---|')
        // Numbered as in the diagram: the user's approval is its own step before the
        // agent step it unlocks.
        let number = 0
        for (const step of journey.steps) {
          const action = step.approval ? step.action.replace(/\s*,?\s*(?:after|once) the user approves\.?$/i, '') : step.action
          if (step.approval && step.actor === 'agent') out.push(`| ${++number} | ${actorName(journey, 'user')} | ✋ Approves: ${cell(action.charAt(0).toLowerCase() + action.slice(1))} | ${step.feature ? link(step.feature) : ''} |`)
          out.push(`| ${++number} | ${actorName(journey, step.actor)} | ${cell(action)} | ${step.feature ? link(step.feature) : ''} |`)
        }
        out.push('')
      }
      if (journey.outcome) out.push(`**Done when:** ${journey.outcome}`, '')
      if (journey.failures.length) out.push('**When it goes wrong:**', '', ...journey.failures.map(item => `- ${item}`), '')
    }
  }

  if (live.length) {
    const showBuilt = live.some(feature => feature.status && feature.status !== 'built')
    // With areas (the feature map's optional grouping), an Area column in area order —
    // first appearance, features with no area last; without, the flat table as before.
    const areaOf = (feature) => (typeof feature.area === 'string' ? feature.area.trim() : '')
    const areas = [...new Set(live.map(areaOf))]
    const grouped = areas.some(Boolean)
    const ordered = grouped ? [...areas.filter(Boolean), ''].flatMap(area => live.filter(feature => areaOf(feature) === area)) : live
    const head = [...(grouped ? ['Area'] : []), 'Feature', ...(showBuilt ? ['Built'] : []), 'Spec']
    out.push('## Features', '', `| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`)
    let lastArea = null
    for (const feature of ordered) {
      const key = featureKey(feature.id) || slugify(feature.name)
      const area = areaOf(feature)
      // Name each area once, on its first row.
      const areaCell = area === lastArea ? '' : area ? `**${cell(area)}**` : '_No area_'
      lastArea = area
      const row = [...(grouped ? [areaCell] : []), link(key), ...(showBuilt ? [cell(feature.status === 'partial' ? 'Partly' : 'Yes')] : []), specWords(feature)]
      out.push(`| ${row.join(' | ')} |`)
    }
    out.push('')
  }

  if (baseline.prd?.requirements.length) {
    const words = { built: 'Built', partial: 'Partly built', not_built: 'Not built' }
    out.push('## PRD against the code', '', '| ID | PRD asks for | Where in the PRD | Status | Features |', '|---|---|---|---|---|')
    for (const item of baseline.prd.requirements) out.push(`| ${item.id} | ${cell(item.requirement)}${item.note ? ` _(${cell(item.note)})_` : ''} | ${cell(item.source)} | ${words[item.status]} | ${item.features.map(link).join(', ')} |`)
    out.push('')
    if (checked?.coverage.notInPrd.length) out.push('**Built but not in the PRD:** ' + checked.coverage.notInPrd.join(', '), '')
  }

  // Gaps in one place: features no journey uses, and what still needs a decision.
  const notOnJourney = checked?.coverage.notOnJourney || []
  if (notOnJourney.length || baseline.openQuestions.length) {
    out.push('## Gaps and open questions', '')
    if (notOnJourney.length) out.push(`**Features on no journey:** ${notOnJourney.join(', ')}. Supporting features, or journeys still to write.`, '')
    if (baseline.openQuestions.length) out.push(...baseline.openQuestions.map(item => `- ${item}`), '')
  }
  if (checked && !checked.passed) out.push('## Needs review', '', ...checked.problems.map(item => `- ${item}`), '')
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
