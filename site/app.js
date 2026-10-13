'use strict';

const scenarios = {
  normal: { request: '读取这项工作允许使用的内部资料', task: '可以继续工作', scope: '允许读取指定内部资料', family: '分出去的工作也要检查', decision: '正常读取', destination: '指定的内部资料', note: '在允许的范围内继续做事', explanation: '先让 AI 读取指定的内部资料。保护正常工作的前提，是让它在获准范围内继续做事。', blocked: false },
  private: { request: '把读过的内部资料公开发送', task: '这项工作仍在继续', scope: '聊天与资料按私密处理', family: '分出去的工作同样受限', decision: '挡住发送', destination: '公开收件位置', note: '这项工作没有公开发送权限', explanation: '新的 OpenClaw 实例从创建时就把聊天和资料按私密处理，不能向公开位置发送。分出去的工作也不能扩大权限。', blocked: true },
  authorized: { request: '把同一份资料改发到内部', task: '可以继续工作', scope: '聊天与资料按私密处理', family: '仍要遵守同样的权限', decision: '允许发送', destination: '获准的内部收件位置', note: '内部协作可以继续', explanation: '公开发送被挡之后，仍可改发到事先允许的内部位置。是否成功，要看真正的操作和收件方记录。', blocked: false },
  bypass: { request: '把内容换成另一种编码后发送', task: '还是原来的工作', scope: '原有私密限制仍在', family: '换种方式也要检查', decision: '挡住发送', destination: '公开收件位置', note: '换一种编码不增加发送权限', explanation: '换成另一种编码，不会自动获得公开发送权限。直接联网能否绕过，也需要用实际操作检查。', blocked: true },
  reconnect: { request: '重新打开原来的任务，再公开发送', task: '继续原来的工作', scope: '原有私密限制仍在', family: '原来的限制继续保留', decision: '挡住发送', destination: '公开收件位置', note: '重新打开不会清除限制', explanation: '重新打开原来的实例，或者在里面新建聊天，原来的权限限制仍然保留。', blocked: true },
  revoked: { request: '收回权限后，再尝试内部发送', task: '管理员已收回权限', scope: '原来的权限不能再用', family: '分出去的工作同样受限', decision: '挡住发送', destination: '原本获准的内部位置', note: '下一次发送不能继续', explanation: '管理员收回权限后，这项任务和它分出去的工作，不能继续通过受控服务读取或发送资料。重新打开不会把权限还回来。', blocked: true },
};

const tabs = [...document.querySelectorAll('[data-scenario]')];
function selectScenario(key, moveFocus = false) {
  const scenario = scenarios[key];
  if (!scenario) return;
  const fields = { 'request-text': scenario.request, 'task-text': scenario.task, 'scope-text': scenario.scope, 'family-text': scenario.family, 'decision-text': scenario.decision, 'destination-text': scenario.destination, 'result-note': scenario.note, 'scenario-explanation': scenario.explanation };
  Object.entries(fields).forEach(([id, value]) => { document.getElementById(id).textContent = value; });
  document.getElementById('result-step').classList.toggle('is-blocked', scenario.blocked);
  document.getElementById('result-symbol').setAttribute('d', scenario.blocked ? 'm10 10 12 12M22 10 10 22' : 'm8 16 5 5 11-11');
  document.getElementById('scenario-panel').setAttribute('aria-labelledby', 'tab-' + key);
  tabs.forEach((tab) => {
    const selected = tab.dataset.scenario === key;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && moveFocus) tab.focus();
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectScenario(tab.dataset.scenario));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectScenario(tabs[next].dataset.scenario, true); }
  });
});

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.getElementById('main-nav');
function closeMenu() { menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', '打开导航'); navigation.classList.remove('is-open'); }
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  navigation.classList.toggle('is-open', open);
});
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') { closeMenu(); menuToggle.focus(); } });

document.getElementById('copy-repo').addEventListener('click', async () => {
  const feedback = document.getElementById('copy-feedback');
  const url = 'https://github.com/yh-l20/agentsec';
  try { await navigator.clipboard.writeText(url); feedback.textContent = '已复制公开仓库地址。'; }
  catch { feedback.textContent = url; }
});

// Research results are a separate, editable data file. Pending entries stay
// visibly pending. A result without a valid HTTPS evidence URL is not promoted.
const evidence = window.JIELING_EVIDENCE;
if (evidence && Array.isArray(evidence.checks) && document.getElementById('evidence-rows') && document.getElementById('evidence-revision')) {
  const container = document.getElementById('evidence-rows');
  const labels = { pending: '待核验', observed: '已有记录', partial: '部分记录' };
  document.getElementById('evidence-revision').textContent = evidence.revisionLabel || '结果待发布';
  if (evidence.published === true && typeof evidence.scope === 'string') document.getElementById('report-scope').textContent = evidence.scope;
  const fragment = document.createDocumentFragment();
  evidence.checks.forEach((check) => {
    let sourceUrl;
    try { const parsed = new URL(check.sourceUrl); if (parsed.protocol === 'https:' && evidence.published === true) sourceUrl = parsed.href; } catch { /* Pending evidence has no external URL. */ }
    const status = sourceUrl && Object.hasOwn(labels, check.status) ? check.status : 'pending';
    const row = document.createElement('div'); row.className = 'evidence-row'; row.setAttribute('role', 'row');
    const title = document.createElement('span'); title.setAttribute('role', 'cell'); title.textContent = check.question;
    const outcome = document.createElement('span'); outcome.setAttribute('role', 'cell');
    const badge = document.createElement('b'); badge.className = 'evidence-status ' + status; badge.textContent = status !== 'pending' && typeof check.outcome === 'string' ? check.outcome : labels[status]; outcome.append(badge);
    const source = document.createElement('span'); source.className = 'evidence-source'; source.setAttribute('role', 'cell');
    if (sourceUrl) { const link = document.createElement('a'); link.href = sourceUrl; link.textContent = check.sourceLabel || '查看记录 ↗'; link.target = '_blank'; link.rel = 'noopener noreferrer'; source.append(link); }
    else source.textContent = '尚未发布';
    row.append(title, outcome, source); fragment.append(row);
  });
  container.replaceChildren(fragment);
}
