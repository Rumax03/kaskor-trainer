/* =============================================
   ТРЕНАЖЁР КАСКОР — script.js
   ============================================= */

'use strict';

// =============================================
// КЛЮЧИ ХРАНИЛИЩА
// =============================================

const STORAGE_KEY  = 'kaskor_questions';
const ERRORS_KEY   = 'kaskor_errors';
const STATS_KEY    = 'kaskor_stats';
const SETTINGS_KEY = 'kaskor_settings';
const QSTATS_KEY   = 'kaskor_qstats';

// =============================================
// ПРИМЕРЫ ВОПРОСОВ
// =============================================

const EXAMPLE_QUESTIONS = [
  {
    question: 'Что означает аббревиатура КАСКОР?',
    options: [
      'Комплексная автоматизированная система контроля и оценки результатов',
      'Кадровая система контроля организации работы',
      'Компьютерная автоматизация систем корпоративной отчётности'
    ],
    correct: 0,
    explanation: 'КАСКОР — Комплексная автоматизированная система контроля и оценки результатов деятельности ОАО «РЖД».'
  },
  {
    question: 'С какой целью проводится тестирование в системе КАСКОР?',
    options: [
      'Только для начисления заработной платы',
      'Для проверки знаний, аттестации и оценки квалификации работников',
      'Исключительно для составления кадровых отчётов'
    ],
    correct: 1,
    explanation: 'Тестирование в КАСКОР направлено на проверку профессиональных знаний, аттестацию и оценку квалификации работников.'
  },
  {
    question: 'Какой минимальный процент правильных ответов считается успешным прохождением теста в КАСКОР?',
    options: ['60%', '70%', '80%'],
    correct: 2,
    explanation: 'Пороговый балл для успешного прохождения теста в КАСКОР составляет 80% правильных ответов.'
  }
];

// =============================================
// ХРАНИЛИЩЕ — ВОПРОСЫ И СЕССИИ
// =============================================

function getQuestions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveQuestionsToStorage(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function getErrorIds() {
  try { return JSON.parse(localStorage.getItem(ERRORS_KEY)) || []; }
  catch { return []; }
}

function addErrorId(id) {
  const ids = getErrorIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(ERRORS_KEY, JSON.stringify(ids));
  }
}

function getStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    return s ? { sessions: 0, imported: 0, ...s } : { sessions: 0, imported: 0 };
  } catch { return { sessions: 0, imported: 0 }; }
}

function incSessions() {
  const s = getStats();
  s.sessions = (s.sessions || 0) + 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

function incImported(count) {
  const s = getStats();
  s.imported = (s.imported || 0) + count;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

// =============================================
// ХРАНИЛИЩЕ — НАСТРОЙКИ
// =============================================

function getSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return s ? { shuffleOptions: true, shuffleQuestions: true, autoCrop: true, ...s }
             : { shuffleOptions: true, shuffleQuestions: true, autoCrop: true };
  } catch { return { shuffleOptions: true, shuffleQuestions: true, autoCrop: true }; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function saveSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  saveSettings(s);
}

function initSettingsUI() {
  const s  = getSettings();
  const so = document.getElementById('settingShuffleOptions');
  const sq = document.getElementById('settingShuffleQuestions');
  const ac = document.getElementById('settingAutoCrop');
  if (so) so.checked = s.shuffleOptions;
  if (sq) sq.checked = s.shuffleQuestions;
  if (ac) ac.checked = s.autoCrop !== false;
}

// =============================================
// ХРАНИЛИЩЕ — СТАТИСТИКА ПО ВОПРОСАМ
// =============================================

function getQStats() {
  try { return JSON.parse(localStorage.getItem(QSTATS_KEY)) || {}; }
  catch { return {}; }
}

function saveQStats(obj) {
  localStorage.setItem(QSTATS_KEY, JSON.stringify(obj));
}

function recordAnswer(qId, isCorrect) {
  const stats = getQStats();
  if (!stats[qId]) stats[qId] = { correctCount: 0, wrongCount: 0 };
  if (isCorrect) stats[qId].correctCount++;
  else           stats[qId].wrongCount++;
  saveQStats(stats);
}

function getQSuccessRate(qId) {
  const s = getQStats()[qId];
  if (!s) return null;
  const total = s.correctCount + s.wrongCount;
  return total > 0 ? s.correctCount / total : null;
}

// =============================================
// ЗАЩИТА ОТ ДУБЛЕЙ
// =============================================

function normalizeText(t) {
  return (t || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isDuplicate(questionText, existingQuestions) {
  const norm = normalizeText(questionText);
  if (!norm) return false;
  return existingQuestions.some(q => normalizeText(q.question) === norm);
}

// =============================================
// НАВИГАЦИЯ
// =============================================

let currentScreen = 'screenHome';
let screenHistory = [];

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  const backBtn = document.getElementById('backBtn');

  if (id === 'screenHome') {
    backBtn.classList.remove('visible');
    setHeader('Тренажёр КАСКОР', 'Подготовка к тестированию');
    screenHistory = [];
  } else {
    backBtn.classList.add('visible');
    screenHistory.push(currentScreen);
  }

  currentScreen = id;

  if (id === 'screenList')  renderList();
  if (id === 'screenHome')  updateStats();
  if (id === 'screenStats') renderStats();
  if (id === 'screenOCR') {
    ocrReset();
    setHeader('Загрузить скриншот', 'Распознавание текста (OCR)');
  }

  window.scrollTo(0, 0);
}

function goBack() {
  const prev = screenHistory.pop() || 'screenHome';
  showScreen(prev);
}

function goHome() {
  showScreen('screenHome');
}

function setHeader(title, sub) {
  document.getElementById('headerTitle').textContent = title;
  document.getElementById('headerSub').textContent   = sub;
}

// =============================================
// СТАТИСТИКА ГЛАВНОГО ЭКРАНА
// =============================================

function updateStats() {
  const qs    = getQuestions();
  const errs  = getErrorIds();
  const stats = getStats();
  document.getElementById('statTotal').textContent    = qs.length;
  document.getElementById('statErrors').textContent   = errs.length;
  document.getElementById('statSessions').textContent = stats.sessions;
  document.getElementById('statImported').textContent = stats.imported;
}

// =============================================
// ДОБАВЛЕНИЕ ВОПРОСОВ (JSON)
// =============================================

function saveQuestions() {
  const raw   = document.getElementById('jsonInput').value.trim();
  const msgEl = document.getElementById('addMsg');

  if (!raw) { showMsg(msgEl, 'Вставьте JSON в поле выше.', 'error'); return; }

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { showMsg(msgEl, 'Ошибка парсинга JSON: ' + e.message, 'error'); return; }

  if (!Array.isArray(parsed)) {
    showMsg(msgEl, 'JSON должен быть массивом (начинаться с [).', 'error');
    return;
  }

  const valid = [];
  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i];
    if (
      !q.question ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      typeof q.correct !== 'number'
    ) {
      showMsg(
        msgEl,
        `Вопрос #${i + 1} имеет неверный формат. Проверьте поля question, options, correct.`,
        'error'
      );
      return;
    }
    valid.push({
      id:          Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2),
      question:    q.question,
      options:     q.options,
      correct:     q.correct,
      explanation: q.explanation || ''
    });
  }

  const existing = getQuestions();
  let added = 0;
  let dupes = 0;
  const merged = [...existing];

  for (const q of valid) {
    if (isDuplicate(q.question, merged)) { dupes++; }
    else { merged.push(q); added++; }
  }

  saveQuestionsToStorage(merged);
  document.getElementById('jsonInput').value = '';
  let msg = `✓ Добавлено ${added} вопросов. Итого в базе: ${merged.length}.`;
  if (dupes) msg += ` Пропущено дубликатов: ${dupes}.`;
  showMsg(msgEl, msg, 'success');
  updateStats();
}

function loadExample() {
  document.getElementById('jsonInput').value = JSON.stringify(EXAMPLE_QUESTIONS, null, 2);
  document.getElementById('addMsg').innerHTML = '';
}

function showMsg(el, text, type) {
  el.innerHTML = `<div class="msg msg-${type}">${text}</div>`;
}

// =============================================
// ЭКСПОРТ / ИМПОРТ
// =============================================

function exportDB() {
  const qs = getQuestions();
  if (!qs.length) { showToast('База вопросов пуста.', 'error'); return; }
  downloadJSON(qs, 'kaskor_questions.json');
  showToast(`Экспортировано ${qs.length} вопросов.`, 'success');
}

function exportErrors() {
  const qs       = getQuestions();
  const errorIds = getErrorIds();
  const errorQs  = qs.filter(q => errorIds.includes(q.id));
  if (!errorQs.length) { showToast('Нет вопросов с ошибками.', 'error'); return; }
  downloadJSON(errorQs, 'kaskor_errors_only.json');
  showToast(`Экспортировано ${errorQs.length} вопросов с ошибками.`, 'success');
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importDB(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';

  const reader = new FileReader();
  reader.onload = e => {
    let parsed;
    try { parsed = JSON.parse(e.target.result); }
    catch { showToast('Ошибка чтения файла: неверный JSON.', 'error'); return; }

    if (!Array.isArray(parsed)) {
      showToast('Файл должен содержать JSON-массив вопросов.', 'error');
      return;
    }

    const valid = [];
    for (const q of parsed) {
      if (
        typeof q.question === 'string' && q.question.trim() &&
        Array.isArray(q.options) && q.options.length >= 2 &&
        typeof q.correct === 'number'
      ) {
        valid.push({
          id:          q.id || Date.now() + '_imp_' + Math.random().toString(36).slice(2),
          question:    q.question.trim(),
          options:     q.options,
          correct:     q.correct,
          explanation: q.explanation || ''
        });
      }
    }

    if (!valid.length) {
      showToast('Не найдено корректных вопросов в файле.', 'error');
      return;
    }

    const existing = getQuestions();
    let added = 0;
    let dupes = 0;
    const merged = [...existing];

    for (const q of valid) {
      if (isDuplicate(q.question, merged)) { dupes++; }
      else { merged.push(q); added++; }
    }

    saveQuestionsToStorage(merged);
    if (added > 0) incImported(added);
    updateStats();

    let msg = `Импортировано: ${added} вопросов.`;
    if (dupes) msg += `\nПропущено дубликатов: ${dupes}.`;
    showToast(msg, 'success', 4000);
  };

  reader.readAsText(file);
}

// =============================================
// ТОСТ-УВЕДОМЛЕНИЯ
// =============================================

let toastTimer = null;

function showToast(msg, type, duration) {
  duration = duration || 3000;
  const el = document.getElementById('toastNotif');
  el.textContent = msg;
  el.className = 'toast toast-show toast-' + (type || 'info');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('toast-show'), duration);
}

// =============================================
// СПИСОК ВОПРОСОВ
// =============================================

function renderList() {
  const qs        = getQuestions();
  const container = document.getElementById('questionListContainer');
  document.getElementById('listCount').textContent = qs.length + ' вопр.';
  setHeader('База вопросов', qs.length + ' вопросов');

  if (!qs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>База пуста.<br>Добавьте вопросы через меню.</p>
      </div>`;
    return;
  }

  const errorIds = getErrorIds();
  const qstats   = getQStats();
  const ul = document.createElement('ul');
  ul.className = 'q-list';

  qs.forEach((q, i) => {
    const li    = document.createElement('li');
    li.className = 'q-item';
    const flag  = errorIds.includes(q.id) ? ' ⚠️' : '';
    const s     = qstats[q.id];
    const rate  = s && (s.correctCount + s.wrongCount) > 0
      ? ` <span class="q-rate">${Math.round(s.correctCount / (s.correctCount + s.wrongCount) * 100)}%</span>`
      : '';
    li.innerHTML = `<span class="q-num">${i + 1}.</span><span>${q.question}${flag}${rate}</span>`;
    ul.appendChild(li);
  });

  container.innerHTML = '';
  container.appendChild(ul);
}

// =============================================
// ЭКРАН СТАТИСТИКИ
// =============================================

function renderStats() {
  setHeader('Статистика', 'По всем вопросам');

  const qs     = getQuestions();
  const qstats = getQStats();

  let totalCorrect = 0;
  let totalWrong   = 0;

  qs.forEach(q => {
    const s = qstats[q.id];
    if (s) {
      totalCorrect += s.correctCount || 0;
      totalWrong   += s.wrongCount   || 0;
    }
  });

  const totalAnswers = totalCorrect + totalWrong;
  const overallPct   = totalAnswers > 0
    ? Math.round(totalCorrect / totalAnswers * 100)
    : null;

  document.getElementById('statsQTotal').textContent   = qs.length;
  document.getElementById('statsCorrect').textContent  = totalCorrect;
  document.getElementById('statsWrong').textContent    = totalWrong;
  document.getElementById('statsOverall').textContent  = overallPct !== null ? overallPct + '%' : '—';

  const attempted = qs
    .filter(q => qstats[q.id] && (qstats[q.id].correctCount + qstats[q.id].wrongCount) > 0)
    .map(q => {
      const s     = qstats[q.id];
      const total = s.correctCount + s.wrongCount;
      return { q, correct: s.correctCount, wrong: s.wrongCount, rate: s.correctCount / total };
    })
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 20);

  const container = document.getElementById('hardQuestionsTable');

  if (!attempted.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:20px 0">
        <div class="icon">📊</div>
        <p>Нет данных. Пройдите хотя бы один тест.</p>
      </div>`;
    return;
  }

  let html = `<div class="stats-table-wrap"><table class="stats-table">
    <thead><tr>
      <th>Вопрос</th>
      <th class="stats-num-head">✓</th>
      <th class="stats-num-head">✗</th>
      <th class="stats-num-head">%</th>
    </tr></thead><tbody>`;

  attempted.forEach((item, i) => {
    const pct      = Math.round(item.rate * 100);
    const pctClass = pct < 50 ? 'val-red' : pct < 75 ? 'val-orange' : 'val-green';
    html += `<tr>
      <td class="stats-q-text">${i + 1}. ${item.q.question}</td>
      <td class="stats-num val-green">${item.correct}</td>
      <td class="stats-num val-red">${item.wrong}</td>
      <td class="stats-num ${pctClass}">${pct}%</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// =============================================
// ОЧИСТКА БАЗЫ
// =============================================

function clearDatabase() {
  if (!confirm('Удалить ВСЮ базу вопросов и историю ошибок? Это действие нельзя отменить.')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ERRORS_KEY);
  localStorage.removeItem(STATS_KEY);
  localStorage.removeItem(QSTATS_KEY);
  updateStats();
  showToast('База очищена.', 'info');
}

// =============================================
// ТРЕНИРОВКА
// =============================================

let training = {
  questions:              [],
  current:                0,
  correct:                0,
  wrong:                  0,
  answered:               false,
  wrongItems:             [],
  mode:                   'all',
  currentShuffledOptions: [],      // [{text, originalIdx}]
  correctShuffledIdx:     -1
};

function startTraining(mode) {
  const all      = getQuestions();
  const settings = getSettings();
  let   pool     = [];

  if (mode === 'all') {
    if (!all.length) { alert('База вопросов пуста. Сначала добавьте вопросы.'); return; }
    pool = settings.shuffleQuestions ? shuffle([...all]) : [...all];

  } else if (mode === 'random45') {
    if (!all.length) { alert('База вопросов пуста. Сначала добавьте вопросы.'); return; }
    pool = shuffle([...all]).slice(0, 45);

  } else if (mode === 'errors') {
    const errorIds = getErrorIds();
    if (!errorIds.length) {
      alert('Список ошибок пуст. Пройдите тест, чтобы в нём появились вопросы.');
      return;
    }
    const filtered = all.filter(q => errorIds.includes(q.id));
    if (!filtered.length) { alert('Ошибки не найдены в текущей базе.'); return; }
    pool = settings.shuffleQuestions ? shuffle(filtered) : filtered;

  } else if (mode === 'weak') {
    if (!all.length) { alert('База вопросов пуста. Сначала добавьте вопросы.'); return; }
    const qstats = getQStats();

    const withStats    = all.filter(q => qstats[q.id] && (qstats[q.id].correctCount + qstats[q.id].wrongCount) > 0);
    const withoutStats = all.filter(q => !qstats[q.id] || (qstats[q.id].correctCount + qstats[q.id].wrongCount) === 0);

    withStats.sort((a, b) => {
      const sa = qstats[a.id];
      const sb = qstats[b.id];
      return (sa.correctCount / (sa.correctCount + sa.wrongCount)) -
             (sb.correctCount / (sb.correctCount + sb.wrongCount));
    });

    pool = [...withStats, ...shuffle(withoutStats)];
  }

  if (!pool.length) { alert('Нет вопросов для этого режима.'); return; }

  training = {
    questions:              pool,
    current:                0,
    correct:                0,
    wrong:                  0,
    answered:               false,
    wrongItems:             [],
    mode,
    currentShuffledOptions: [],
    correctShuffledIdx:     -1
  };

  const labels = {
    all:      'Все вопросы',
    random45: 'Случайные 45',
    errors:   'Работа над ошибками',
    weak:     'Слабые места'
  };
  setHeader(labels[mode] || 'Тренажёр', pool.length + ' вопросов');
  showScreen('screenTraining');
  renderQuestion();
}

function renderQuestion() {
  const q       = training.questions[training.current];
  const total   = training.questions.length;
  const cur     = training.current + 1;
  const settings = getSettings();

  document.getElementById('qCurrent').textContent      = cur;
  document.getElementById('qTotal').textContent        = total;
  document.getElementById('qCorrectCount').textContent = training.correct;
  document.getElementById('qWrongCount').textContent   = training.wrong;
  document.getElementById('progressBar').style.width   = ((cur - 1) / total * 100) + '%';
  document.getElementById('questionText').textContent  = q.question;

  // Build (optionally shuffled) option list, tracking original indices
  let indexed = q.options.map((text, i) => ({ text, originalIdx: i }));
  if (settings.shuffleOptions) shuffle(indexed);

  training.currentShuffledOptions = indexed;
  training.correctShuffledIdx     = indexed.findIndex(o => o.originalIdx === q.correct);

  const optList = document.getElementById('optionsList');
  optList.innerHTML = '';

  indexed.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.textContent = opt.text;
    btn.onclick     = () => selectAnswer(i);
    optList.appendChild(btn);
  });

  document.getElementById('resultBlock').style.display = 'none';
  training.answered = false;
}

function selectAnswer(displayIdx) {
  if (training.answered) return;
  training.answered = true;

  const q             = training.questions[training.current];
  const correctIdx    = training.correctShuffledIdx;
  const isCorrect     = displayIdx === correctIdx;
  const buttons       = document.querySelectorAll('.option-btn');

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIdx)                  btn.classList.add('correct');
    if (i === displayIdx && !isCorrect)    btn.classList.add('wrong');
  });

  recordAnswer(q.id, isCorrect);

  if (isCorrect) {
    training.correct++;
    document.getElementById('resultBadge').innerHTML =
      '<div class="result-badge badge-correct">✓ Верно!</div>';
  } else {
    training.wrong++;
    addErrorId(q.id);
    training.wrongItems.push({
      question:      q.question,
      yourAnswer:    training.currentShuffledOptions[displayIdx].text,
      correctAnswer: q.options[q.correct]
    });
    document.getElementById('resultBadge').innerHTML =
      '<div class="result-badge badge-wrong">✗ Неверно</div>';
  }

  document.getElementById('qCorrectCount').textContent = training.correct;
  document.getElementById('qWrongCount').textContent   = training.wrong;

  const expText = q.explanation
    ? `<strong>Пояснение:</strong> ${q.explanation}`
    : `<strong>Правильный ответ:</strong> ${q.options[q.correct]}`;
  document.getElementById('explanationText').innerHTML = expText;

  const isLast = training.current >= training.questions.length - 1;
  document.getElementById('nextBtn').textContent =
    isLast ? 'Завершить тест' : 'Следующий вопрос →';

  document.getElementById('resultBlock').style.display = 'block';
}

function nextQuestion() {
  training.current++;
  if (training.current >= training.questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function restartSame() {
  startTraining(training.mode);
}

// =============================================
// РЕЗУЛЬТАТЫ
// =============================================

function showResults() {
  incSessions();
  updateStats();

  const total   = training.questions.length;
  const correct = training.correct;
  const wrong   = training.wrong;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;

  document.getElementById('percentVal').textContent = pct + '%';
  document.getElementById('percentSub').textContent =
    pct >= 80 ? '✓ Тест пройден!' : '✗ Недостаточный результат (нужно ≥80%)';
  document.getElementById('percentBlock').style.background =
    pct >= 80 ? 'var(--green)' : 'var(--red)';

  document.getElementById('resCTotal').textContent   = total;
  document.getElementById('resCCorrect').textContent = correct;
  document.getElementById('resCWrong').textContent   = wrong;
  document.getElementById('resCSkipped').textContent = 0;

  const errSec = document.getElementById('errorsSection');
  if (training.wrongItems.length > 0) {
    let html = `<h3>⚠ Вопросы с ошибками (${training.wrongItems.length})</h3>`;
    training.wrongItems.forEach((item, i) => {
      html += `
        <div class="error-item">
          <strong>${i + 1}. ${item.question}</strong>
          <div class="your-ans">✗ Ваш ответ: ${item.yourAnswer}</div>
          <div class="right-ans">✓ Правильно: ${item.correctAnswer}</div>
        </div>`;
    });
    errSec.innerHTML = html;
  } else {
    errSec.innerHTML =
      '<div style="text-align:center;padding:12px;color:var(--green);font-weight:600">🎉 Все ответы правильные!</div>';
  }

  setHeader('Результаты', '');
  showScreen('screenResults');
}

// =============================================
// УТИЛИТЫ
// =============================================

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =============================================
// OCR — TESSERACT.JS
// =============================================

let ocrQueue         = [];
let ocrWorker        = null;
let ocrCurrentRunIdx = 0;
let ocrBatchDrafts   = [];
let ocrBatchNavIdx   = 0;

// ---------- Хелперы File/Blob → DataURL ----------
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- Drag & drop ----------
(function initDragDrop() {
  const dz = document.getElementById('dropZone');
  ['dragenter', 'dragover'].forEach(evt =>
    dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add('drag-over'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove('drag-over'); })
  );
  dz.addEventListener('drop', e => ocrHandleFiles(e.dataTransfer.files));
})();

// ---------- Приём файлов (async, HEIC/HEIF support) ----------
async function ocrHandleFiles(files) {
  if (!files || !files.length) return;

  const isAllowed = f => {
    const type = (f.type || '').toLowerCase();
    const name = f.name.toLowerCase();
    return type.startsWith('image/') || /\.(jpg|jpeg|png|heic|heif|webp)$/.test(name);
  };

  const arr = Array.from(files).filter(isAllowed);
  if (!arr.length) { alert('Выберите файлы изображений (JPG, PNG, HEIC, WEBP).'); return; }

  if (arr.length > 200) {
    if (!confirm(`Выбрано ${arr.length} файлов. Обработка займёт значительное время. Продолжить?`)) return;
  }

  ocrQueue = [];
  ocrSetStep('queue');
  document.getElementById('ocrQueue').innerHTML = '';

  const runBtn   = document.getElementById('ocrRunBtn');
  const loadInfo = document.getElementById('ocrLoadingInfo');
  runBtn.disabled    = true;
  runBtn.textContent = 'Загрузка файлов…';
  if (loadInfo) { loadInfo.style.display = ''; loadInfo.textContent = `Загрузка 0 из ${arr.length}…`; }

  for (let i = 0; i < arr.length; i++) {
    const file   = arr[i];
    const isHeic = /\.(heic|heif)$/i.test(file.name) ||
                   file.type === 'image/heic' ||
                   file.type === 'image/heif';

    if (loadInfo) loadInfo.textContent = `Загрузка ${i + 1} из ${arr.length}…`;

    try {
      let dataUrl;
      if (isHeic && typeof heic2any !== 'undefined') {
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        dataUrl = await blobToDataUrl(blob);
      } else {
        dataUrl = await fileToDataUrl(file);
      }
      ocrQueue.push({ file, dataUrl, status: 'wait', rawText: '' });
    } catch (e) {
      console.warn('Ошибка загрузки:', file.name, e);
      ocrQueue.push({ file, dataUrl: '', status: 'err', rawText: '', loadError: true });
    }
  }

  if (loadInfo) loadInfo.style.display = 'none';
  runBtn.disabled    = false;
  runBtn.textContent = '🔍 Распознать все';

  setHeader('Загрузить скриншоты', ocrQueue.length + ' файл(ов)');
  ocrRenderQueue();
}

// ---------- Шаги OCR ----------
function ocrSetStep(step) {
  const steps = ['upload', 'queue', 'progress', 'batch'];
  steps.forEach(s => {
    const el = document.getElementById('ocrStep' + s.charAt(0).toUpperCase() + s.slice(1));
    if (el) el.style.display = s === step ? 'block' : 'none';
  });
}

function ocrShowSteps(...active) {
  const steps = ['upload', 'queue', 'progress', 'batch'];
  steps.forEach(s => {
    const el = document.getElementById('ocrStep' + s.charAt(0).toUpperCase() + s.slice(1));
    if (el) el.style.display = active.includes(s) ? 'block' : 'none';
  });
}

// ---------- Очередь ----------
function ocrRenderQueue() {
  const el = document.getElementById('ocrQueue');
  el.innerHTML = '';
  const statusMap = {
    wait: ['qi-wait', '⏳ Ожидание'],
    run:  ['qi-run',  '⚙️ Обработка…'],
    ok:   ['qi-ok',   '✓ Готово'],
    err:  ['qi-err',  '✗ Ошибка']
  };
  ocrQueue.forEach((item, i) => {
    const [cls, label] = statusMap[item.status] || statusMap.wait;
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.id = 'qi_' + i;
    const imgHtml = item.dataUrl
      ? `<img src="${item.dataUrl}" alt="">`
      : '<span class="qi-no-img"></span>';
    div.innerHTML = `
      ${imgHtml}
      <span class="qi-name">${item.file.name}</span>
      <span class="qi-status ${cls}" id="qiStatus_${i}">${label}</span>`;
    el.appendChild(div);
  });
}

// ---------- Распознавание ----------
async function ocrRunAll() {
  const runBtn = document.getElementById('ocrRunBtn');
  runBtn.disabled    = true;
  runBtn.textContent = '⚙️ Идёт распознавание…';
  ocrShowSteps('queue', 'progress');

  const total = ocrQueue.filter(q => !q.loadError).length;
  document.getElementById('ocrBatchCounter').textContent = `Обработано 0 из ${total}`;
  document.getElementById('ocrStatus').textContent = 'Загрузка движка OCR…';
  document.getElementById('ocrPct').textContent    = '';
  document.getElementById('ocrProgressBar').style.width = '0%';

  if (!ocrWorker) {
    ocrWorker = await Tesseract.createWorker('rus+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct   = Math.round(m.progress * 100);
          const pctEl = document.getElementById('ocrPct');
          const barEl = document.getElementById('ocrProgressBar');
          if (pctEl) pctEl.textContent = pct + '%';
          if (barEl) barEl.style.width = pct + '%';
          const qiSt = document.getElementById('qiStatus_' + ocrCurrentRunIdx);
          if (qiSt) qiSt.textContent = '⚙️ ' + pct + '%';
        }
      }
    });
  }

  const settings = getSettings();
  let doneCount = 0;
  for (let i = 0; i < ocrQueue.length; i++) {
    if (ocrQueue[i].loadError) continue;
    ocrCurrentRunIdx   = i;
    ocrQueue[i].status = 'run';
    ocrRenderQueue();

    document.getElementById('ocrProgressTitle').textContent =
      `Файл ${i + 1} из ${ocrQueue.length}: ${ocrQueue[i].file.name}`;
    document.getElementById('ocrImgWrap').innerHTML = ocrQueue[i].dataUrl
      ? `<img src="${ocrQueue[i].dataUrl}" alt="">` : '';
    document.getElementById('ocrPct').textContent    = '';
    document.getElementById('ocrProgressBar').style.width = '0%';

    // ——— Предобработка: обрезка + коррекция ———
    let imgUrl = ocrQueue[i].dataUrl;
    if (settings.autoCrop && imgUrl) {
      document.getElementById('ocrStatus').textContent = 'Обрезка и коррекция изображения…';
      try {
        imgUrl = await preprocessImageForOCR(imgUrl);
        ocrQueue[i].preprocessedUrl = imgUrl;
        document.getElementById('ocrImgWrap').innerHTML = `<img src="${imgUrl}" alt="">`;
      } catch (e) {
        console.warn('preprocess error:', e);
      }
    }

    document.getElementById('ocrStatus').textContent = 'Распознавание текста…';
    document.getElementById('ocrPct').textContent    = '0%';
    document.getElementById('ocrProgressBar').style.width = '0%';

    try {
      const { data: { text } } = await ocrWorker.recognize(imgUrl);
      ocrQueue[i].rawText = text;
      ocrQueue[i].status  = 'ok';
    } catch {
      ocrQueue[i].rawText = '';
      ocrQueue[i].status  = 'err';
    }
    doneCount++;
    ocrRenderQueue();
    document.getElementById('ocrBatchCounter').textContent =
      `Обработано ${doneCount} из ${total}`;
  }

  const okCount = ocrQueue.filter(q => q.status === 'ok').length;
  if (!okCount) {
    alert('Ни один файл не удалось распознать. Попробуйте другие изображения.');
    runBtn.disabled    = false;
    runBtn.textContent = '🔍 Распознать все';
    ocrShowSteps('queue');
    return;
  }

  ocrShowBatch();
}

// ---------- Сброс ----------
function ocrReset() {
  ocrQueue       = [];
  ocrBatchDrafts = [];
  ocrBatchNavIdx = 0;
  ocrSetStep('upload');
  document.getElementById('ocrFileInput').value = '';
  const runBtn   = document.getElementById('ocrRunBtn');
  const loadInfo = document.getElementById('ocrLoadingInfo');
  if (runBtn)   { runBtn.disabled = false; runBtn.textContent = '🔍 Распознать все'; }
  if (loadInfo)   loadInfo.style.display = 'none';
}

// ---------- Открытие пакетного просмотра ----------
function ocrShowBatch() {
  ocrBatchDrafts = ocrQueue
    .filter(q => q.status === 'ok')
    .map(q => ({
      dataUrl: q.preprocessedUrl || q.dataUrl,
      rawText: q.rawText,
      draft:   ocrParseText(q.rawText),
      deleted: false,
      saved:   false
    }));
  ocrBatchNavIdx = 0;
  ocrSetStep('batch');
  setHeader('Проверка OCR', ocrBatchDrafts.length + ' вопросов найдено');
  batchUpdateCount();
  batchSwitchView('one');
}

function batchUpdateCount() {
  const active = ocrBatchDrafts.filter(d => !d.deleted).length;
  document.getElementById('batchCount').textContent = active + ' вопр.';
}

// ---------- Переключение вида ----------
function batchSwitchView(view) {
  document.getElementById('batchViewOne').style.display = view === 'one' ? '' : 'none';
  document.getElementById('batchViewAll').style.display = view === 'all' ? '' : 'none';
  document.getElementById('tabBatchOne').classList.toggle('active', view === 'one');
  document.getElementById('tabBatchAll').classList.toggle('active', view === 'all');
  if (view === 'all') ocrRenderBatch();
  if (view === 'one') batchNavRender();
}

// ---------- Навигатор (по одному) ----------
function batchNavActiveItems() {
  return ocrBatchDrafts.map((d, i) => ({ ...d, idx: i })).filter(d => !d.deleted);
}

function batchNavRender() {
  const active   = batchNavActiveItems();
  const posEl    = document.getElementById('batchNavPos');
  const statusEl = document.getElementById('batchNavStatus');
  const imgPane  = document.getElementById('batchNavImgPane');

  if (ocrBatchNavIdx >= active.length && active.length > 0) ocrBatchNavIdx = active.length - 1;
  if (ocrBatchNavIdx < 0) ocrBatchNavIdx = 0;

  batchUpdateCount();

  if (!active.length) {
    if (posEl)    posEl.textContent = '0 / 0';
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--text-muted)">Все вопросы обработаны.</span>';
    if (imgPane)  imgPane.innerHTML = '';
    document.getElementById('batchNavQuestion').value    = '';
    document.getElementById('batchNavExplanation').value = '';
    document.getElementById('batchNavOptionsEditor').innerHTML = '';
    return;
  }

  const item = active[ocrBatchNavIdx];
  if (posEl) posEl.textContent = `${ocrBatchNavIdx + 1} / ${active.length}`;

  if (imgPane) {
    imgPane.innerHTML = item.dataUrl
      ? `<img src="${item.dataUrl}" alt="Скриншот ${ocrBatchNavIdx + 1}">`
      : '<div class="no-img-placeholder">Нет изображения</div>';
  }

  const rawEl = document.getElementById('batchNavRawText');
  if (rawEl) rawEl.textContent = item.rawText || '(нет текста)';

  document.getElementById('batchNavQuestion').value    = item.draft.question    || '';
  document.getElementById('batchNavExplanation').value = item.draft.explanation || '';
  batchNavBuildOptions(item.draft.options, item.draft.correct);

  if (statusEl) {
    if (item.saved) {
      statusEl.innerHTML = '<span class="bnav-badge bnav-saved">✓ Сохранён в базу</span>';
    } else if (isDuplicate(item.draft.question, getQuestions())) {
      statusEl.innerHTML = '<span class="bnav-badge bnav-dup">⚠ Дубликат</span>';
    } else {
      statusEl.innerHTML = '';
    }
  }

  batchNavSwitchTab('edit');
}

function batchNavSwitchTab(tab) {
  const editEl  = document.getElementById('batchTabEdit');
  const rawEl   = document.getElementById('batchTabRaw');
  const btnEdit = document.getElementById('tabBatchEdit');
  const btnRaw  = document.getElementById('tabBatchRaw');
  if (editEl)  editEl.style.display  = tab === 'edit' ? '' : 'none';
  if (rawEl)   rawEl.style.display   = tab === 'raw'  ? '' : 'none';
  if (btnEdit) btnEdit.classList.toggle('active', tab === 'edit');
  if (btnRaw)  btnRaw.classList.toggle('active',  tab === 'raw');
}

function batchNavGo(delta) {
  batchNavFlushToDraft();
  const active = batchNavActiveItems();
  if (!active.length) return;
  ocrBatchNavIdx = Math.max(0, Math.min(ocrBatchNavIdx + delta, active.length - 1));
  batchNavRender();
}

function batchNavFlushToDraft() {
  const active = batchNavActiveItems();
  if (!active.length || ocrBatchNavIdx >= active.length) return;
  const item = active[ocrBatchNavIdx];
  if (!item.saved) ocrBatchDrafts[item.idx].draft = batchNavReadForm();
}

function batchNavReadForm() {
  const question    = document.getElementById('batchNavQuestion').value.trim();
  const explanation = document.getElementById('batchNavExplanation').value.trim();
  const rows        = document.querySelectorAll('#batchNavOptionsEditor .option-row');
  const options     = Array.from(rows).map(r => r.querySelector('input[type="text"]').value.trim());
  const checked     = document.querySelector('#batchNavOptionsEditor input[type="radio"]:checked');
  const correct     = checked ? parseInt(checked.value) : -1;
  return { question, options, correct, explanation };
}

function batchNavSaveCurrent() {
  const active = batchNavActiveItems();
  if (!active.length) return;
  const item  = active[ocrBatchNavIdx];
  const draft = batchNavReadForm();
  ocrBatchDrafts[item.idx].draft = draft;

  if (!draft.question) { showToast('Введите текст вопроса.', 'error'); return; }
  if (draft.options.length < 2 || draft.options.some(o => !o)) {
    showToast('Заполните минимум 2 варианта ответа.', 'error'); return;
  }
  if (draft.correct === -1) { showToast('Выберите правильный ответ.', 'error'); return; }

  const existing = getQuestions();
  if (isDuplicate(draft.question, existing)) {
    showToast('⚠ Дубликат — такой вопрос уже есть в базе.', 'error'); return;
  }

  saveQuestionsToStorage([...existing, {
    id:          Date.now() + '_ocr_' + Math.random().toString(36).slice(2),
    question:    draft.question,
    options:     draft.options.filter(o => o),
    correct:     draft.correct,
    explanation: draft.explanation
  }]);
  updateStats();
  ocrBatchDrafts[item.idx].saved = true;
  showToast('✓ Сохранён в базу!', 'success');

  // Переходим к следующему несохранённому
  const newActive = batchNavActiveItems();
  const nextUnsaved = newActive.findIndex((d, i) => i > ocrBatchNavIdx && !d.saved);
  if (nextUnsaved !== -1) ocrBatchNavIdx = nextUnsaved;
  else if (ocrBatchNavIdx < newActive.length - 1) ocrBatchNavIdx++;
  batchNavRender();
}

function batchNavSkip() {
  batchNavFlushToDraft();
  const active = batchNavActiveItems();
  if (!active.length) return;
  if (ocrBatchNavIdx < active.length - 1) {
    ocrBatchNavIdx++;
    batchNavRender();
  } else {
    showToast('Это последний вопрос.', 'info');
  }
}

function batchNavDelete() {
  const active = batchNavActiveItems();
  if (!active.length) return;
  ocrBatchDrafts[active[ocrBatchNavIdx].idx].deleted = true;
  const newActive = batchNavActiveItems();
  if (ocrBatchNavIdx >= newActive.length) ocrBatchNavIdx = Math.max(0, newActive.length - 1);
  batchNavRender();
}

// ---------- Варианты ответов навигатора ----------
function batchNavBuildOptions(options, correctIdx) {
  const ed = document.getElementById('batchNavOptionsEditor');
  ed.innerHTML = '';
  const opts = options && options.length ? options : ['', '', ''];
  opts.forEach((opt, i) => batchNavAddOptionRow(opt, i === correctIdx));
  batchNavUpdateCorrectHint();
}

function batchNavAddOption() { batchNavAddOptionRow('', false); }

function batchNavAddOptionRow(text, checked) {
  const ed      = document.getElementById('batchNavOptionsEditor');
  const idx     = ed.children.length;
  const letters = ['А', 'Б', 'В', 'Г', 'Д'];
  const label   = letters[idx] !== undefined ? letters[idx] : String(idx + 1);
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `
    <span class="opt-label">${label}.</span>
    <input type="radio" name="batchNavCorrect" value="${idx}" ${checked ? 'checked' : ''}
           onchange="batchNavUpdateCorrectHint()">
    <input type="text" value="${(text || '').replace(/"/g, '&quot;')}" placeholder="Вариант ответа…"
           oninput="batchNavRenumberOptions()">
    <button type="button" class="btn-del-opt" title="Удалить"
            onclick="batchNavRemoveOption(this)">✕</button>`;
  ed.appendChild(row);
  batchNavUpdateCorrectHint();
}

function batchNavRemoveOption(btn) {
  btn.closest('.option-row').remove();
  batchNavRenumberOptions();
  batchNavUpdateCorrectHint();
}

function batchNavRenumberOptions() {
  const letters = ['А', 'Б', 'В', 'Г', 'Д'];
  document.querySelectorAll('#batchNavOptionsEditor .option-row').forEach((row, i) => {
    row.querySelector('.opt-label').textContent =
      (letters[i] !== undefined ? letters[i] : String(i + 1)) + '.';
    row.querySelector('input[type="radio"]').value = i;
  });
}

function batchNavUpdateCorrectHint() {
  const checked = document.querySelector('#batchNavOptionsEditor input[type="radio"]:checked');
  const hint    = document.getElementById('batchNavCorrectHint');
  if (!checked) {
    hint.innerHTML = 'Правильный ответ: <span>не выбран — отметьте кружком</span>';
    return;
  }
  const text = checked.closest('.option-row').querySelector('input[type="text"]').value.trim();
  hint.innerHTML = `Правильный ответ: <span>${text || '(пусто)'}</span>`;
}

// ---------- Список всех (вкладка «Список») ----------
function ocrRenderBatch() {
  const list     = document.getElementById('batchList');
  const existing = getQuestions();

  if (!ocrBatchDrafts.filter(d => !d.deleted).length) {
    list.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Нет вопросов для сохранения.</p></div>';
    return;
  }

  list.innerHTML = '';
  ocrBatchDrafts.forEach((item, i) => {
    if (item.deleted) return;
    const isDup   = isDuplicate(item.draft.question, existing);
    const noAns   = item.draft.correct === -1;
    const isSaved = item.saved;
    const div     = document.createElement('div');
    div.className = 'batch-item' +
                    (isSaved ? ' batch-saved' : isDup ? ' batch-dup' : '');
    const qText   = item.draft.question || '<em style="color:#999">Вопрос не распознан</em>';
    const optsCnt = item.draft.options.filter(o => o).length;
    const badges  = (isSaved  ? '<span class="saved-badge"> · Сохранён</span>' : '') +
                    (isDup && !isSaved ? '<span class="dup-badge"> · Дубликат</span>' : '') +
                    (noAns && !isSaved ? '<span class="warn-badge"> · Нет правильного ответа</span>' : '');
    div.innerHTML = `
      <div class="batch-item-q">${i + 1}. ${qText}</div>
      <div class="batch-item-opts">${optsCnt} вариантов${badges}</div>
      <div class="batch-item-actions">
        <button type="button" class="btn btn-sm btn-outline" onclick="batchListEdit(${i})">✏️ Ред.</button>
        <button type="button" class="btn btn-sm btn-danger"  onclick="batchDeleteItem(${i})">✕</button>
      </div>`;
    list.appendChild(div);
  });
}

function batchDeleteItem(idx) {
  ocrBatchDrafts[idx].deleted = true;
  ocrRenderBatch();
  batchUpdateCount();
}

function batchListEdit(idx) {
  const active = batchNavActiveItems();
  const navIdx = active.findIndex(d => d.idx === idx);
  if (navIdx !== -1) ocrBatchNavIdx = navIdx;
  batchSwitchView('one');
}

// ---------- Сохранить все ----------
function batchSaveAll() {
  const alreadySaved = ocrBatchDrafts.filter(d => d.saved).length;
  const toSave       = ocrBatchDrafts.filter(d => !d.deleted && !d.saved && d.draft.question);

  if (!toSave.length && alreadySaved > 0) {
    showToast(`Все вопросы уже сохранены (${alreadySaved}).`, 'success', 4000);
    ocrReset();
    showScreen('screenHome');
    return;
  }
  if (!toSave.length) { showToast('Нет вопросов для сохранения.', 'error'); return; }

  const noAnsCount = toSave.filter(d => d.draft.correct === -1).length;
  if (noAnsCount) {
    if (!confirm(
      `У ${noAnsCount} вопросов не выбран правильный ответ.\n` +
      `Они будут сохранены с первым вариантом как правильным.\nПродолжить?`
    )) return;
  }

  const existing = getQuestions();
  let added = 0;
  let dupes = 0;
  const merged = [...existing];
  for (const item of toSave) {
    if (isDuplicate(item.draft.question, merged)) { dupes++; continue; }
    merged.push({
      id:          Date.now() + '_ocr_' + Math.random().toString(36).slice(2) + '_' + added,
      question:    item.draft.question,
      options:     item.draft.options.filter(o => o),
      correct:     item.draft.correct === -1 ? 0 : item.draft.correct,
      explanation: item.draft.explanation || ''
    });
    added++;
  }
  saveQuestionsToStorage(merged);
  updateStats();

  let msg = `Сохранено: ${added + alreadySaved} вопросов.`;
  if (dupes) msg += `\nДубликатов пропущено: ${dupes}.`;
  showToast(msg, 'success', 4000);
  ocrReset();
  showScreen('screenHome');
}

// ---------- Парсер ----------
function ocrParseText(raw) {
  if (!raw || !raw.trim()) {
    return { question: '', options: ['', '', ''], correct: -1, explanation: '' };
  }
  const optionRe    = /^(?:[1-9АБВГДабвгдABCDE][\.\)]\s*|[•\-—]\s+)/i;
  const lines       = raw.split('\n').map(l => l.trim()).filter(l => l.length > 1);
  let questionLines = [];
  let optionLines   = [];
  let inOptions     = false;

  for (const line of lines) {
    if (!inOptions && optionRe.test(line)) inOptions = true;
    if (inOptions) optionLines.push(line);
    else           questionLines.push(line);
  }

  let question = questionLines.join(' ').replace(/^(вопрос\s*)?\d+[\.\)]\s*/i, '').trim();
  const options = optionLines.filter(l => optionRe.test(l))
    .map(l => l.replace(optionRe, '').trim()).filter(l => l.length > 0);

  if (options.length < 2) {
    const longLines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    if (longLines.length >= 3) {
      return { question: question || longLines[0], options: longLines.slice(1, 5), correct: -1, explanation: '' };
    }
  }
  return { question, options: options.length >= 2 ? options : ['', '', ''], correct: -1, explanation: '' };
}

// =============================================
// ПРЕДОБРАБОТКА ИЗОБРАЖЕНИЙ (Canvas API)
// =============================================

const IMG_DETECT_SIZE = 800;   // px для поиска углов (быстро)
const IMG_OUTPUT_SIZE = 1400;  // px для выходного изображения

async function preprocessImageForOCR(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try { resolve(processDocumentImage(img)); }
      catch (e) { console.warn('preprocess:', e); resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function processDocumentImage(img) {
  const origW = img.naturalWidth  || img.width;
  const origH = img.naturalHeight || img.height;

  // ——— Масштаб для детектирования углов ———
  const detS  = Math.min(1, IMG_DETECT_SIZE / Math.max(origW, origH));
  const dw = Math.round(origW * detS);
  const dh = Math.round(origH * detS);
  const detCanvas = document.createElement('canvas');
  detCanvas.width = dw; detCanvas.height = dh;
  detCanvas.getContext('2d').drawImage(img, 0, 0, dw, dh);
  const detData = detCanvas.getContext('2d').getImageData(0, 0, dw, dh);

  // ——— Масштаб для выходного изображения ———
  const outS  = Math.min(1, IMG_OUTPUT_SIZE / Math.max(origW, origH));
  const ow = Math.round(origW * outS);
  const oh = Math.round(origH * outS);
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = ow; srcCanvas.height = oh;
  srcCanvas.getContext('2d').drawImage(img, 0, 0, ow, oh);

  // ——— Поиск углов документа ———
  const detCorners = findDocumentCorners(detData.data, dw, dh);

  let resultCanvas;
  if (detCorners) {
    // Масштабируем углы с detection-размера на output-размер
    const ratio = outS / detS;
    const corners = detCorners.map(([x, y]) => [x * ratio, y * ratio]);

    // Определяем размер результата из длин сторон quad
    const wT = Math.hypot(corners[1][0]-corners[0][0], corners[1][1]-corners[0][1]);
    const wB = Math.hypot(corners[2][0]-corners[3][0], corners[2][1]-corners[3][1]);
    const hL = Math.hypot(corners[3][0]-corners[0][0], corners[3][1]-corners[0][1]);
    const hR = Math.hypot(corners[2][0]-corners[1][0], corners[2][1]-corners[1][1]);
    const rW = Math.min(Math.round(Math.max(wT, wB)), IMG_OUTPUT_SIZE);
    const rH = Math.min(Math.round(Math.max(hL, hR)), IMG_OUTPUT_SIZE);

    if (isPerspectiveDistorted(corners, ow, oh)) {
      resultCanvas = warpPerspective(srcCanvas, corners, rW, rH);
    } else {
      // Просто прямоугольная обрезка (быстро)
      resultCanvas = simpleCrop(srcCanvas, corners, rW, rH);
    }
  } else {
    resultCanvas = srcCanvas;
  }

  // ——— Усиление контраста ———
  return enhanceTextContrast(resultCanvas).toDataURL('image/jpeg', 0.92);
}

// ——— Поиск углов документа (сканирование краёв) ———
function findDocumentCorners(pixels, w, h) {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (pixels[i*4]*77 + pixels[i*4+1]*150 + pixels[i*4+2]*29) >> 8;
  }

  const thresh = otsuThreshold(gray);
  const STEPS  = 50;
  const topPts = [], botPts = [], leftPts = [], rightPts = [];

  for (let s = 0; s < STEPS; s++) {
    const x = Math.round((s + 0.5) * w / STEPS);
    for (let y = 0;     y < h;  y++) { if (gray[y*w+x] > thresh) { topPts.push([x,y]);  break; } }
    for (let y = h-1;   y >= 0; y--) { if (gray[y*w+x] > thresh) { botPts.push([x,y]);  break; } }
    const y2 = Math.round((s + 0.5) * h / STEPS);
    for (let x2 = 0;   x2 < w;  x2++) { if (gray[y2*w+x2] > thresh) { leftPts.push([x2,y2]);  break; } }
    for (let x2 = w-1; x2 >= 0; x2--) { if (gray[y2*w+x2] > thresh) { rightPts.push([x2,y2]); break; } }
  }

  if (topPts.length < 4 || botPts.length < 4 || leftPts.length < 4 || rightPts.length < 4) return null;

  const topL   = fitLine(topPts),   botL  = fitLine(botPts);
  const leftL  = fitLineV(leftPts), rightL = fitLineV(rightPts);
  if (!topL || !botL || !leftL || !rightL) return null;

  const tl = intersectLines(topL, leftL);
  const tr = intersectLines(topL, rightL);
  const br = intersectLines(botL, rightL);
  const bl = intersectLines(botL, leftL);
  if (!tl || !tr || !br || !bl) return null;

  // Площадь должна быть > 15% изображения
  const area = Math.abs((tr[0]-tl[0])*(bl[1]-tl[1]) - (bl[0]-tl[0])*(tr[1]-tl[1]));
  if (area < w * h * 0.15) return null;

  // Углы не должны быть практически на краях изображения (= нет документа на фоне)
  const pad = w * 0.03;
  if (tl[0]<pad && tr[0]>w-pad && bl[0]<pad && br[0]>w-pad &&
      tl[1]<pad && tr[1]<pad   && bl[1]>h-pad && br[1]>h-pad) return null;

  // Все углы должны быть в пределах изображения (с небольшим запасом)
  const margin = 30;
  const inBounds = ([x,y]) => x>=-margin && x<=w+margin && y>=-margin && y<=h+margin;
  if (!inBounds(tl)||!inBounds(tr)||!inBounds(br)||!inBounds(bl)) return null;

  return [tl, tr, br, bl];
}

// ——— Порог Оцу ———
function otsuThreshold(gray) {
  const hist = new Int32Array(256);
  for (const v of gray) hist[v]++;
  const n = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, max = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; thr = t; }
  }
  return thr;
}

// ——— Линейная регрессия y=ax+b (горизонтальные линии) ———
function fitLine(pts) {
  const n = pts.length;
  let sx=0, sy=0, sxx=0, sxy=0;
  for (const [x,y] of pts) { sx+=x; sy+=y; sxx+=x*x; sxy+=x*y; }
  const d = n*sxx - sx*sx;
  if (Math.abs(d) < 1e-6) return { h: true, a: 0, b: sy/n };
  return { h: true, a: (n*sxy-sx*sy)/d, b: (sy-(n*sxy-sx*sy)/d*sx)/n };
}

// ——— Линейная регрессия x=ay+b (вертикальные линии) ———
function fitLineV(pts) {
  const n = pts.length;
  let sx=0, sy=0, syy=0, sxy=0;
  for (const [x,y] of pts) { sx+=x; sy+=y; syy+=y*y; sxy+=x*y; }
  const d = n*syy - sy*sy;
  if (Math.abs(d) < 1e-6) return { h: false, a: 0, b: sx/n };
  return { h: false, a: (n*sxy-sx*sy)/d, b: (sx-(n*sxy-sx*sy)/d*sy)/n };
}

// ——— Пересечение двух линий (одна горизонтальная y=ax+b, одна вертикальная x=ay+b) ———
function intersectLines(hLine, vLine) {
  if (!hLine || !vLine) return null;
  // hLine: y = aH*x + bH  →  aH*x - y + bH = 0
  // vLine: x = aV*y + bV  →  x - aV*y - bV = 0
  // y = aH*(aV*y + bV) + bH  →  y(1 - aH*aV) = aH*bV + bH
  const denom = 1 - hLine.a * vLine.a;
  if (Math.abs(denom) < 1e-6) return null;
  const y = (hLine.a * vLine.b + hLine.b) / denom;
  const x = vLine.a * y + vLine.b;
  return [x, y];
}

// ——— Проверка: нужна ли перспективная коррекция ———
function isPerspectiveDistorted(corners, w, h) {
  const [tl, tr, br, bl] = corners;
  const topSkew   = Math.abs(tr[1] - tl[1]) / h;
  const botSkew   = Math.abs(br[1] - bl[1]) / h;
  const leftSkew  = Math.abs(bl[0] - tl[0]) / w;
  const rightSkew = Math.abs(br[0] - tr[0]) / w;
  return Math.max(topSkew, botSkew, leftSkew, rightSkew) > 0.04;
}

// ——— Простая прямоугольная обрезка (для ровных документов) ———
function simpleCrop(srcCanvas, corners, rW, rH) {
  const xs = corners.map(p => p[0]);
  const ys = corners.map(p => p[1]);
  const x0 = Math.max(0, Math.min(...xs));
  const y0 = Math.max(0, Math.min(...ys));
  const x1 = Math.min(srcCanvas.width,  Math.max(...xs));
  const y1 = Math.min(srcCanvas.height, Math.max(...ys));
  const out = document.createElement('canvas');
  out.width = rW; out.height = rH;
  out.getContext('2d').drawImage(srcCanvas, x0, y0, x1-x0, y1-y0, 0, 0, rW, rH);
  return out;
}

// ——— Перспективное преобразование (pixel-by-pixel с билинейной интерполяцией) ———
function warpPerspective(srcCanvas, corners, outW, outH) {
  const dst = [[0,0],[outW,0],[outW,outH],[0,outH]];
  // Вычисляем обратную гомографию: dst → src
  const H = computeHomography(dst, corners);
  const [h0,h1,h2, h3,h4,h5, h6,h7,h8] = H;

  const sw = srcCanvas.width, sh = srcCanvas.height;
  const srcCtx  = srcCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, sw, sh).data;

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = outW; dstCanvas.height = outH;
  const dstCtx  = dstCanvas.getContext('2d');
  const dstImg  = dstCtx.createImageData(outW, outH);
  const d = dstImg.data;

  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      const ww = h6*dx + h7*dy + h8;
      const sx = (h0*dx + h1*dy + h2) / ww;
      const sy = (h3*dx + h4*dy + h5) / ww;
      const pi = (dy*outW + dx) * 4;

      if (sx < 0 || sy < 0 || sx >= sw-1 || sy >= sh-1) {
        d[pi]=d[pi+1]=d[pi+2]=255; d[pi+3]=255; continue;
      }
      const x0=sx|0, y0=sy|0, fx=sx-x0, fy=sy-y0;
      const i00=(y0*sw+x0)*4, i10=(y0*sw+x0+1)*4;
      const i01=((y0+1)*sw+x0)*4, i11=((y0+1)*sw+x0+1)*4;
      const w00=(1-fx)*(1-fy), w10=fx*(1-fy), w01=(1-fx)*fy, w11=fx*fy;
      for (let c=0; c<3; c++) {
        d[pi+c] = (srcData[i00+c]*w00 + srcData[i10+c]*w10 +
                   srcData[i01+c]*w01 + srcData[i11+c]*w11 + 0.5) | 0;
      }
      d[pi+3] = 255;
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return dstCanvas;
}

// ——— Вычисление гомографии (DLT, 4 соответствия точек, h8=1) ———
function computeHomography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [sx,sy] = src[i], [dx,dy] = dst[i];
    A.push([-sx,-sy,-1, 0, 0, 0, dx*sx,dx*sy]); b.push(-dx);
    A.push([ 0,  0, 0,-sx,-sy,-1, dy*sx,dy*sy]); b.push(-dy);
  }
  const h = solveLinear8(A, b);
  return [...h, 1];
}

function solveLinear8(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 8; col++) {
    let maxRow = col;
    for (let row = col+1; row < 8; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const piv = M[col][col];
    if (Math.abs(piv) < 1e-10) continue;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const f = M[row][col] / piv;
      for (let j = col; j <= 8; j++) M[row][j] -= f * M[col][j];
    }
  }
  return M.map((row, i) => row[8] / row[i]);
}

// ——— Усиление контраста: перцентильное растяжение гистограммы + grayscale ———
function enhanceTextContrast(canvas) {
  const ctx  = canvas.getContext('2d');
  const iData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = iData.data;
  const n = canvas.width * canvas.height;

  // Вычисляем яркость каждого пикселя
  const lum = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    lum[i] = (d[i*4]*77 + d[i*4+1]*150 + d[i*4+2]*29) >> 8;
  }

  // Перцентильное растяжение: lo=5%, hi=95%
  const sorted = new Uint8Array(lum).sort();
  const lo  = sorted[Math.floor(n * 0.05)];
  const hi  = sorted[Math.floor(n * 0.95)];
  const rng = (hi - lo) || 1;

  for (let i = 0; i < n; i++) {
    const v = ((lum[i] - lo) / rng * 255 + 0.5) | 0;
    const c = Math.max(0, Math.min(255, v));
    d[i*4] = d[i*4+1] = d[i*4+2] = c;
    d[i*4+3] = 255;
  }
  ctx.putImageData(iData, 0, 0);
  return canvas;
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================

updateStats();
initSettingsUI();
