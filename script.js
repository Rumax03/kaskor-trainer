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
    return s ? { shuffleOptions: true, shuffleQuestions: true, ...s }
             : { shuffleOptions: true, shuffleQuestions: true };
  } catch { return { shuffleOptions: true, shuffleQuestions: true }; }
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
  const s = getSettings();
  const so = document.getElementById('settingShuffleOptions');
  const sq = document.getElementById('settingShuffleQuestions');
  if (so) so.checked = s.shuffleOptions;
  if (sq) sq.checked = s.shuffleQuestions;
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
let ocrEditIdx       = 0;
let ocrWorker        = null;
let ocrCurrentRunIdx = 0;
let ocrInBatchMode   = false;
let ocrBatchDrafts   = [];
let ocrBatchEditIdx  = -1;

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

// ---------- Приём файлов ----------
function ocrHandleFiles(files) {
  if (!files || !files.length) return;
  const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!arr.length) { alert('Выберите файлы изображений (PNG, JPG, WEBP).'); return; }

  ocrQueue = [];
  let loaded = 0;
  arr.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = e => {
      ocrQueue[i] = { file, dataUrl: e.target.result, status: 'wait', rawText: '' };
      loaded++;
      if (loaded === arr.length) ocrShowQueue();
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Очередь ----------
function ocrShowQueue() {
  setHeader('Загрузить скриншот', ocrQueue.length + ' файл(ов)');
  ocrSetStep('queue');
  ocrRenderQueue();
}

function ocrSetStep(step) {
  const steps = ['upload', 'queue', 'progress', 'batch', 'edit'];
  steps.forEach(s => {
    const el = document.getElementById('ocrStep' + s.charAt(0).toUpperCase() + s.slice(1));
    if (el) el.style.display = s === step ? 'block' : 'none';
  });
}

function ocrShowSteps(...active) {
  const steps = ['upload', 'queue', 'progress', 'batch', 'edit'];
  steps.forEach(s => {
    const el = document.getElementById('ocrStep' + s.charAt(0).toUpperCase() + s.slice(1));
    if (el) el.style.display = active.includes(s) ? 'block' : 'none';
  });
}

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
    div.innerHTML = `
      <img src="${item.dataUrl}" alt="">
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

  if (!ocrWorker) {
    document.getElementById('ocrStatus').textContent = 'Загрузка движка OCR…';
    document.getElementById('ocrPct').textContent    = '';
    document.getElementById('ocrProgressBar').style.width = '0%';

    ocrWorker = await Tesseract.createWorker('rus+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct   = Math.round(m.progress * 100);
          const pctEl = document.getElementById('ocrPct');
          const barEl = document.getElementById('ocrProgressBar');
          if (pctEl) pctEl.textContent        = pct + '%';
          if (barEl) barEl.style.width        = pct + '%';
          const qiSt = document.getElementById('qiStatus_' + ocrCurrentRunIdx);
          if (qiSt) qiSt.textContent = '⚙️ ' + pct + '%';
        }
      }
    });
  }

  for (let i = 0; i < ocrQueue.length; i++) {
    ocrCurrentRunIdx = i;
    ocrQueue[i].status = 'run';
    ocrRenderQueue();
    document.getElementById('ocrProgressTitle').textContent =
      `Файл ${i + 1} из ${ocrQueue.length}: ${ocrQueue[i].file.name}`;
    document.getElementById('ocrImgWrap').innerHTML =
      `<img src="${ocrQueue[i].dataUrl}" alt="">`;
    document.getElementById('ocrStatus').textContent = 'Распознавание текста…';
    document.getElementById('ocrPct').textContent    = '0%';
    document.getElementById('ocrProgressBar').style.width = '0%';

    try {
      const { data: { text } } = await ocrWorker.recognize(ocrQueue[i].dataUrl);
      ocrQueue[i].rawText = text;
      ocrQueue[i].status  = 'ok';
    } catch {
      ocrQueue[i].rawText = '';
      ocrQueue[i].status  = 'err';
    }
    ocrRenderQueue();
  }

  const okCount = ocrQueue.filter(q => q.status === 'ok').length;
  if (!okCount) {
    alert('Ни один файл не удалось распознать. Попробуйте другие изображения.');
    runBtn.disabled    = false;
    runBtn.textContent = '🔍 Распознать все';
    ocrShowSteps('queue');
    return;
  }

  if (okCount === 1) {
    ocrInBatchMode = false;
    ocrEditIdx = ocrQueue.findIndex(q => q.status === 'ok');
    ocrOpenEditor(ocrEditIdx);
  } else {
    ocrShowBatch();
  }
}

// ---------- Сброс ----------
function ocrReset() {
  ocrQueue        = [];
  ocrBatchDrafts  = [];
  ocrInBatchMode  = false;
  ocrBatchEditIdx = -1;
  ocrSetStep('upload');
  document.getElementById('ocrFileInput').value = '';
  const runBtn = document.getElementById('ocrRunBtn');
  if (runBtn) { runBtn.disabled = false; runBtn.textContent = '🔍 Распознать все'; }
}

// ---------- Редактор одного вопроса ----------
function ocrOpenEditor(idx) {
  const item   = ocrQueue[idx];
  const parsed = ocrParseText(item.rawText);
  ocrShowSteps('edit');

  const totalOk     = ocrQueue.filter(q => q.status === 'ok').length;
  const remainingOk = ocrQueue.filter((q, i) => i >= idx && q.status === 'ok').length;
  document.getElementById('ocrEditCounter').textContent =
    totalOk > 1 ? `${totalOk - remainingOk + 1} / ${totalOk}` : '';

  document.getElementById('ocrQuestion').value      = parsed.question;
  document.getElementById('ocrExplanation').value   = '';
  document.getElementById('ocrRawText').textContent = item.rawText;
  document.getElementById('ocrSaveMsg').innerHTML   = '';

  const skipBtn = document.getElementById('ocrSkipBtn');
  if (skipBtn) skipBtn.style.display = '';

  ocrBuildOptions(parsed.options, parsed.correct);
  ocrSwitchTab('edit');
  window.scrollTo(0, 0);
}

// ---------- Пакетный просмотр ----------
function ocrShowBatch() {
  ocrInBatchMode = true;
  ocrBatchDrafts = ocrQueue
    .filter(q => q.status === 'ok')
    .map(q => ({ dataUrl: q.dataUrl, rawText: q.rawText, draft: ocrParseText(q.rawText), deleted: false }));
  ocrSetStep('batch');
  setHeader('Проверка OCR', ocrBatchDrafts.length + ' найдено');
  ocrRenderBatch();
}

function ocrRenderBatch() {
  const list     = document.getElementById('batchList');
  const existing = getQuestions();
  const active   = ocrBatchDrafts.filter(d => !d.deleted);
  document.getElementById('batchCount').textContent = active.length + ' вопр.';

  if (!active.length) {
    list.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Нет вопросов для сохранения.</p></div>';
    return;
  }

  list.innerHTML = '';
  ocrBatchDrafts.forEach((item, i) => {
    if (item.deleted) return;
    const isDup  = isDuplicate(item.draft.question, existing);
    const noAns  = item.draft.correct === -1;
    const div    = document.createElement('div');
    div.className = 'batch-item' + (isDup ? ' batch-dup' : '');
    const qText  = item.draft.question || '<em style="color:#999">Вопрос не распознан</em>';
    const optsCnt = item.draft.options.filter(o => o).length;
    const badges  = (isDup ? '<span class="dup-badge"> · Дубликат</span>' : '') +
                    (noAns ? '<span class="warn-badge"> · Нет правильного ответа</span>' : '');
    div.innerHTML = `
      <div class="batch-item-q">${i + 1}. ${qText}</div>
      <div class="batch-item-opts">${optsCnt} вариантов${badges}</div>
      <div class="batch-item-actions">
        <button class="btn btn-sm btn-outline" onclick="batchEditItem(${i})">✏️ Редактировать</button>
        <button class="btn btn-sm btn-danger"  onclick="batchDeleteItem(${i})">✕ Удалить</button>
      </div>`;
    list.appendChild(div);
  });
}

function batchDeleteItem(idx) {
  ocrBatchDrafts[idx].deleted = true;
  ocrRenderBatch();
}

function batchEditItem(idx) {
  ocrBatchEditIdx = idx;
  const item = ocrBatchDrafts[idx];
  ocrShowSteps('edit');
  document.getElementById('ocrQuestion').value      = item.draft.question;
  document.getElementById('ocrExplanation').value   = item.draft.explanation || '';
  document.getElementById('ocrRawText').textContent = item.rawText;
  document.getElementById('ocrSaveMsg').innerHTML   = '';
  document.getElementById('ocrEditCounter').textContent = `Вопрос ${idx + 1} из ${ocrBatchDrafts.length}`;
  const skipBtn = document.getElementById('ocrSkipBtn');
  if (skipBtn) skipBtn.style.display = 'none';
  ocrBuildOptions(item.draft.options, item.draft.correct);
  ocrSwitchTab('edit');
  window.scrollTo(0, 0);
}

function batchSaveAll() {
  const existing   = getQuestions();
  const toSave     = ocrBatchDrafts.filter(d => !d.deleted && d.draft.question);
  const noAnsCount = toSave.filter(d => d.draft.correct === -1).length;
  if (noAnsCount) {
    if (!confirm(
      `У ${noAnsCount} вопросов не выбран правильный ответ.\n` +
      `Они будут сохранены с первым вариантом как правильным.\nПродолжить?`
    )) return;
  }

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
  let msg = `Сохранено: ${added} вопросов.`;
  if (dupes) msg += `\nДубликатов пропущено: ${dupes}.`;
  showToast(msg, 'success', 4000);
  ocrReset();
  showScreen('screenHome');
}

// ---------- Варианты ответов ----------
function ocrBuildOptions(options, correctIdx) {
  const ed = document.getElementById('ocrOptionsEditor');
  ed.innerHTML = '';
  const opts = options.length ? options : ['', '', ''];
  opts.forEach((opt, i) => ocrAddOptionRow(opt, i === correctIdx));
  ocrUpdateCorrectHint();
}

function ocrAddOption() { ocrAddOptionRow('', false); }

function ocrAddOptionRow(text, checked) {
  const ed      = document.getElementById('ocrOptionsEditor');
  const idx     = ed.children.length;
  const letters = ['А', 'Б', 'В', 'Г', 'Д'];
  const label   = letters[idx] !== undefined ? letters[idx] : String(idx + 1);
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `
    <span class="opt-label">${label}.</span>
    <input type="radio" name="ocrCorrect" value="${idx}" ${checked ? 'checked' : ''}
           onchange="ocrUpdateCorrectHint()">
    <input type="text" value="${(text || '').replace(/"/g, '&quot;')}" placeholder="Вариант ответа…"
           oninput="ocrRenumberOptions()">
    <button type="button" class="btn-del-opt" title="Удалить"
            onclick="ocrRemoveOption(this)">✕</button>`;
  ed.appendChild(row);
  ocrUpdateCorrectHint();
}

function ocrRemoveOption(btn) {
  btn.closest('.option-row').remove();
  ocrRenumberOptions();
  ocrUpdateCorrectHint();
}

function ocrRenumberOptions() {
  const letters = ['А', 'Б', 'В', 'Г', 'Д'];
  document.querySelectorAll('#ocrOptionsEditor .option-row').forEach((row, i) => {
    row.querySelector('.opt-label').textContent =
      (letters[i] !== undefined ? letters[i] : String(i + 1)) + '.';
    row.querySelector('input[type="radio"]').value = i;
  });
}

function ocrUpdateCorrectHint() {
  const checked = document.querySelector('#ocrOptionsEditor input[type="radio"]:checked');
  const hint    = document.getElementById('ocrCorrectHint');
  if (!checked) {
    hint.innerHTML = 'Правильный ответ: <span>не выбран — отметьте кружком</span>';
    return;
  }
  const text = checked.closest('.option-row').querySelector('input[type="text"]').value.trim();
  hint.innerHTML = `Правильный ответ: <span>${text || '(пусто)'}</span>`;
}

// ---------- Вкладки ----------
function ocrSwitchTab(tab) {
  document.getElementById('tabContentEdit').style.display = tab === 'edit' ? 'block' : 'none';
  document.getElementById('tabContentRaw').style.display  = tab === 'raw'  ? 'block' : 'none';
  document.getElementById('tabEdit').classList.toggle('active', tab === 'edit');
  document.getElementById('tabRaw').classList.toggle('active',  tab === 'raw');
}

// ---------- Сохранение из редактора ----------
function ocrSaveQuestion() {
  const msgEl    = document.getElementById('ocrSaveMsg');
  const question = document.getElementById('ocrQuestion').value.trim();
  if (!question) { showMsg(msgEl, 'Введите текст вопроса.', 'error'); return; }

  const rows    = document.querySelectorAll('#ocrOptionsEditor .option-row');
  const options = Array.from(rows).map(r => r.querySelector('input[type="text"]').value.trim());
  if (options.length < 2)    { showMsg(msgEl, 'Нужно минимум 2 варианта ответа.', 'error'); return; }
  if (options.some(o => !o)) { showMsg(msgEl, 'Заполните все варианты ответа.', 'error'); return; }

  const checkedRadio = document.querySelector('#ocrOptionsEditor input[type="radio"]:checked');
  if (!checkedRadio) {
    showMsg(msgEl, 'Выберите правильный ответ (кружок слева от варианта).', 'error');
    return;
  }

  const correct     = parseInt(checkedRadio.value);
  const explanation = document.getElementById('ocrExplanation').value.trim();

  if (ocrInBatchMode && ocrBatchEditIdx !== -1) {
    ocrBatchDrafts[ocrBatchEditIdx].draft = { question, options, correct, explanation };
    ocrShowSteps('batch');
    ocrRenderBatch();
    showToast('Вопрос обновлён.', 'success');
    return;
  }

  const existing = getQuestions();
  if (isDuplicate(question, existing)) {
    showMsg(msgEl, '⚠ Такой вопрос уже есть в базе — дубликат не сохранён.', 'error');
    return;
  }

  const q = {
    id: Date.now() + '_ocr_' + Math.random().toString(36).slice(2),
    question, options, correct, explanation
  };
  saveQuestionsToStorage([...existing, q]);
  updateStats();
  showMsg(msgEl, '✓ Вопрос сохранён в базу!', 'success');
  setTimeout(() => ocrSkipToNext(), 900);
}

function ocrSkipToNext() {
  if (ocrInBatchMode) {
    ocrBatchEditIdx = -1;
    ocrShowSteps('batch');
    return;
  }
  const next = ocrQueue.findIndex((q, i) => i > ocrEditIdx && q.status === 'ok');
  if (next !== -1) { ocrEditIdx = next; ocrOpenEditor(next); }
  else { ocrReset(); showScreen('screenHome'); updateStats(); }
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
// ИНИЦИАЛИЗАЦИЯ
// =============================================

updateStats();
initSettingsUI();
