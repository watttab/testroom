import Swal from 'sweetalert2';
import { questionsData } from './questions.js';

// GAS Endpoint
const GAS_URL = "https://script.google.com/macros/s/AKfycbzJxM5rs1joZEpkrVxiPlkSzavwVhkNfGPUIVN7urvBNdagBUFiWczlC3dfzJ8hBSIu/exec";

// DOM Elements
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');
const preStartBtn = document.getElementById('start-pre-test');
const preTestContainer = document.getElementById('pre-test-container');
const preQuestionsContainer = document.getElementById('pre-questions');
const preTimerDisplay = document.getElementById('pre-timer');
const preTestForm = document.getElementById('pre-test-form');

const postStartBtn = document.getElementById('start-post-test');
const postTestContainer = document.getElementById('post-test-container');
const postQuestionsContainer = document.getElementById('post-questions');
const postTestForm = document.getElementById('post-test-form');
const postNameSelect = document.getElementById('post-name');

// State
let isPreTestActive = false;
let isPostTestActive = false;
let preTestTime = 8 * 60; // 8 minutes
let timerInterval;
let postTestUnlocked = false;

// Global Data Cache (fetched from GAS)
let globalGasData = [];

// Initialize
function init() {
  setupTabs();
  
  // Anti-cheat
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
}

// Utility: Shuffle array
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Data Fetching
async function fetchGasData() {
  try {
    const response = await fetch(GAS_URL);
    const json = await response.json();
    if(json.status === 'success') {
      globalGasData = json.data;
      postTestUnlocked = json.isUnlocked === true;
      if (postTestUnlocked) {
        document.getElementById('tab-post-test').innerHTML = 'หลังเรียน <span class="lock-icon">🔓</span>';
      }
    } else {
      console.error("GAS Error:", json.message);
    }
  } catch(error) {
    console.error("Fetch Error:", error);
  }
}

// Tabs Logic
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const target = tab.getAttribute('data-target');
      
      if(target === 'post-test') {
        // Fetch to check unlock status first
        Swal.fire({ title: 'กำลังตรวจสอบสถานะ', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        await fetchGasData();
        Swal.close();
        if(!isPostTestUnlocked()) {
          Swal.fire('ถูกล็อค', 'กรุณาให้ Admin ปลดล็อคแท็บหลังเรียนก่อน', 'warning');
          return;
        }
      }

      if(tab.id === 'tab-post-test' && !isPostTestUnlocked()) {
        Swal.fire('ถูกล็อค', 'กรุณาให้ Admin ปลดล็อคแท็บหลังเรียนก่อน', 'warning');
        return;
      }
      
      if (isPreTestActive || isPostTestActive) {
        Swal.fire({
          title: 'คุณกำลังทำข้อสอบ',
          text: "การเปลี่ยนแท็บจะทำให้ข้อสอบปัจจุบันถูกยกเลิก คุณแน่ใจหรือไม่?",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'แน่ใจ',
          cancelButtonText: 'ยกเลิก'
        }).then(async (result) => {
          if (result.isConfirmed) {
            endTestEarly();
            await processTabSwitch(tab, target);
          }
        });
      } else {
        await processTabSwitch(tab, target);
      }
    });
  });
}

async function processTabSwitch(tab, targetParam) {
  const target = targetParam || tab.getAttribute('data-target');
  
  if(target === 'results') {
    Swal.fire({ title: 'กำลังโหลดข้อมูล', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    await fetchGasData();
    Swal.close();
  }

  if(target === 'post-test') {
    populatePostTestNames();
  } else if (target === 'results') {
    updateResultsDisplay();
  }

  tabs.forEach(t => t.classList.remove('active'));
  contents.forEach(c => c.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(target).classList.add('active');
}

// Admin logic
const unlockBtn = document.getElementById('unlock-btn');
unlockBtn.addEventListener('click', async () => {
  const pwd = document.getElementById('admin-pwd').value;
  if(pwd === 'admin1234') { 
    Swal.fire({
      title: 'กำลังปลดล็อค',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
    
    const data = new FormData();
    data.append('action', 'unlock');
    
    try {
      await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: data });
      postTestUnlocked = true;
      document.getElementById('admin-login').classList.add('hidden');
      document.getElementById('admin-dashboard').classList.remove('hidden');
      document.getElementById('tab-post-test').innerHTML = 'หลังเรียน <span class="lock-icon">🔓</span>';
      Swal.fire('สำเร็จ', 'ปลดล็อคแท็บหลังเรียนให้ผู้สอบทุกคนแล้ว!', 'success');
    } catch(err) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  } else {
    Swal.fire('ข้อผิดพลาด', 'รหัสผ่านไม่ถูกต้อง', 'error');
  }
});

const lockBtn = document.getElementById('lock-btn');
if(lockBtn) {
  lockBtn.addEventListener('click', async () => {
    Swal.fire({
      title: 'กำลังล็อคข้อสอบ',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
    
    const data = new FormData();
    data.append('action', 'lock');
    
    try {
      await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: data });
      postTestUnlocked = false;
      document.getElementById('admin-login').classList.remove('hidden');
      document.getElementById('admin-dashboard').classList.add('hidden');
      document.getElementById('admin-pwd').value = '';
      document.getElementById('tab-post-test').innerHTML = 'หลังเรียน <span class="lock-icon">🔒</span>';
      Swal.fire('สำเร็จ', 'ล็อคแท็บหลังเรียนเรียบร้อยแล้ว!', 'success');
    } catch(err) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  });
}

function isPostTestUnlocked() {
  return postTestUnlocked;
}

// Load names into dropdown
function populatePostTestNames() {
  // Extract unique names who took Pre-test
  const preTestNames = globalGasData
    .filter(row => row.type === 'Pre-test')
    .map(row => row.name);
  
  const uniqueNames = [...new Set(preTestNames)];
  
  postNameSelect.innerHTML = '<option value="">-- เลือกชื่อของคุณ --</option>';
  uniqueNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    postNameSelect.appendChild(opt);
  });
}

// Render Questions
function renderQuestions(container, prefix) {
  const shuffledQuestions = shuffle([...questionsData]);
  container.innerHTML = '';
  shuffledQuestions.forEach((q, index) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'question-item';
    let html = `<div class="question-text">${index + 1}. ${q.question.replace(/^\d+\.\s*/, '')}</div><div class="options">`;
    const shuffledOptions = shuffle([...q.options]);
    shuffledOptions.forEach(opt => {
      html += `
        <label class="option-label">
          <input type="radio" name="${prefix}_q_${q.id}" value="${opt}" required>
          <span>${opt}</span>
        </label>
      `;
    });
    html += `</div>`;
    qDiv.innerHTML = html;
    container.appendChild(qDiv);
  });
}

// Pre-test
preStartBtn.addEventListener('click', () => {
  const name = document.getElementById('pre-name').value.trim();
  if(!name) {
    Swal.fire('แจ้งเตือน', 'กรุณากรอกชื่อ-นามสกุล', 'warning');
    return;
  }
  preStartBtn.classList.add('hidden');
  document.getElementById('pre-name').readOnly = true;
  preTestContainer.classList.remove('hidden');
  renderQuestions(preQuestionsContainer, 'pre');
  isPreTestActive = true;
  preTestTime = 8 * 60;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    preTestTime--;
    updateTimerDisplay();
    if(preTestTime <= 0) {
      clearInterval(timerInterval);
      Swal.fire('หมดเวลา!', 'ระบบกำลังส่งข้อสอบของคุณ', 'info').then(() => {
        preTestForm.dispatchEvent(new Event('submit'));
      });
    }
  }, 1000);
});

function updateTimerDisplay() {
  const m = Math.floor(preTestTime / 60).toString().padStart(2, '0');
  const s = (preTestTime % 60).toString().padStart(2, '0');
  preTimerDisplay.textContent = `${m}:${s}`;
}

preTestForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearInterval(timerInterval);
  isPreTestActive = false;
  const formData = new FormData(preTestForm);
  const name = document.getElementById('pre-name').value.trim();
  const scoreData = calculateScore(formData, 'pre');
  
  sendDataToGAS('Pre-test', name, scoreData);
  
  Swal.fire('สำเร็จ', `คุณได้คะแนน ${scoreData.total}/10`, 'success').then(async () => {
    preTestForm.reset();
    document.getElementById('pre-name').readOnly = false;
    preStartBtn.classList.remove('hidden');
    preTestContainer.classList.add('hidden');
    
    // Jump to Results tab and load data
    await processTabSwitch(tabs[2]); 
    updateResultsDisplay(name); // show current user detail
  });
});

// Post-test
postStartBtn.addEventListener('click', () => {
  const name = postNameSelect.value;
  if(!name) {
    Swal.fire('แจ้งเตือน', 'กรุณาเลือกชื่อ-นามสกุล', 'warning');
    return;
  }
  postStartBtn.classList.add('hidden');
  postNameSelect.disabled = true;
  postTestContainer.classList.remove('hidden');
  renderQuestions(postQuestionsContainer, 'post');
  isPostTestActive = true;
});

postTestForm.addEventListener('submit', (e) => {
  e.preventDefault();
  isPostTestActive = false;
  const formData = new FormData(postTestForm);
  const name = postNameSelect.value;
  const scoreData = calculateScore(formData, 'post');
  
  sendDataToGAS('Post-test', name, scoreData);
  
  Swal.fire('สำเร็จ', `คุณได้คะแนน ${scoreData.total}/10`, 'success').then(async () => {
    postTestForm.reset();
    postNameSelect.disabled = false;
    postStartBtn.classList.remove('hidden');
    postTestContainer.classList.add('hidden');
    
    // Jump to Results tab and load data
    await processTabSwitch(tabs[2]); 
    updateResultsDisplay(name);
  });
});

// Calculate Detailed Score
function calculateScore(formData, prefix) {
  let score = { total: 0, p1: 0, p2: 0 };
  questionsData.forEach(q => {
    const ans = formData.get(`${prefix}_q_${q.id}`);
    if(ans === q.answer) {
      score.total++;
      if(q.part === 1) score.p1++;
      if(q.part === 2) score.p2++;
    }
  });
  return score;
}

// Development % calc
function calcDev(pre, post) {
  if (pre === '-' || post === '-') return '-';
  if (pre == 0) return post > 0 ? 100 : 0;
  return (((post - pre) / pre) * 100).toFixed(1);
}

// Process data for grouping by name
function getGroupedData() {
  const userMap = {};
  
  globalGasData.forEach(row => {
    if(!userMap[row.name]) {
      userMap[row.name] = { name: row.name, pre: null, post: null };
    }
    // Overwrite if they submitted multiple times, taking the latest one 
    // (since data is sorted chronologically by default in the sheet)
    if(row.type === 'Pre-test') userMap[row.name].pre = row;
    if(row.type === 'Post-test') userMap[row.name].post = row;
  });
  
  return Object.values(userMap);
}

// Update Results and Print Dashboard
function updateResultsDisplay(currentName = null) {
  const groupedData = getGroupedData();
  
  if (groupedData.length === 0) {
    document.getElementById('results-display').innerHTML = '<p>ยังไม่มีผู้เข้าสอบ</p>';
    document.getElementById('overall-dashboard').classList.add('hidden');
    document.getElementById('print-btn').classList.add('hidden');
    return;
  }

  // Current User Individual View
  if (currentName) {
    const userRow = groupedData.find(u => u.name === currentName);
    
    let preObj = userRow?.pre || {total: '-', p1: '-', p2: '-'};
    let postObj = userRow?.post || {total: '-', p1: '-', p2: '-'};
    
    let devPercent = calcDev(preObj.total, postObj.total);
    let devText = devPercent !== '-' ? `${devPercent}%` : '-';
    let devColor = devPercent > 0 ? 'var(--success-color)' : (devPercent < 0 ? 'var(--danger-color)' : 'var(--text-color)');

    document.getElementById('results-display').innerHTML = `
      <h3>ผลการทดสอบล่าสุด: ${currentName}</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr style="border-bottom: 1px solid var(--glass-border);">
          <th style="padding: 8px; text-align: left;">ส่วนข้อสอบ</th>
          <th style="padding: 8px; text-align: center;">ก่อนเรียน</th>
          <th style="padding: 8px; text-align: center;">หลังเรียน</th>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 8px;">ตอนที่ 1: ความรู้ความเข้าใจ</td>
          <td style="padding: 8px; text-align: center;">${preObj.p1} / 5</td>
          <td style="padding: 8px; text-align: center;">${postObj.p1} / 5</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 8px;">ตอนที่ 2: การนำไปใช้</td>
          <td style="padding: 8px; text-align: center;">${preObj.p2} / 5</td>
          <td style="padding: 8px; text-align: center;">${postObj.p2} / 5</td>
        </tr>
        <tr style="font-weight: bold;">
          <td style="padding: 8px; color: var(--primary-color);">รวมทั้งหมด</td>
          <td style="padding: 8px; text-align: center;">${preObj.total} / 10</td>
          <td style="padding: 8px; text-align: center;">${postObj.total} / 10</td>
        </tr>
      </table>
      <div style="margin-top: 15px; font-size: 1.1rem;">
        <strong>การพัฒนา: </strong> <span style="color: ${devColor}; font-weight: bold;">${devText}</span>
      </div>
    `;
  } else {
    document.getElementById('results-display').innerHTML = '<p>เลือกดูผลลัพธ์รายบุคคลจากการส่งข้อสอบ</p>';
  }

  // Overall Dashboard & Print Table
  let sumPre = 0, sumPost = 0;
  let printRowsHTML = '';
  let countPre = 0, countCompleted = 0; 
  
  groupedData.forEach((u, idx) => {
    let preObj = u.pre || {total: '-', p1: '-', p2: '-'};
    let postObj = u.post || {total: '-', p1: '-', p2: '-'};
    
    // Ensure p1, p2, total are numbers or '-'
    let preP1 = preObj.p1 !== undefined && preObj.p1 !== '' ? preObj.p1 : '-';
    let preP2 = preObj.p2 !== undefined && preObj.p2 !== '' ? preObj.p2 : '-';
    let preTotal = preObj.total !== undefined && preObj.total !== '' ? preObj.total : '-';
    let postP1 = postObj.p1 !== undefined && postObj.p1 !== '' ? postObj.p1 : '-';
    let postP2 = postObj.p2 !== undefined && postObj.p2 !== '' ? postObj.p2 : '-';
    let postTotal = postObj.total !== undefined && postObj.total !== '' ? postObj.total : '-';

    let devPercent = calcDev(preTotal, postTotal);
    let devText = devPercent !== '-' ? `${devPercent}%` : '-';
    
    if(preTotal !== '-' && !isNaN(preTotal)) {
      sumPre += parseInt(preTotal) || 0;
      countPre++;
      if(postTotal !== '-' && !isNaN(postTotal)) {
        sumPost += parseInt(postTotal) || 0;
        countCompleted++;
      }
    }

    // Build print table row
    printRowsHTML += `
      <tr>
        <td>${idx + 1}</td>
        <td style="text-align: left;">${u.name}</td>
        <td>${preP1}</td>
        <td>${preP2}</td>
        <td>${preTotal}</td>
        <td>${postP1}</td>
        <td>${postP2}</td>
        <td>${postTotal}</td>
        <td>${devText}</td>
      </tr>
    `;
  });

  document.getElementById('print-table-body').innerHTML = printRowsHTML;
  document.getElementById('print-total-users').textContent = groupedData.length;

  document.getElementById('overall-dashboard').classList.remove('hidden');
  document.getElementById('print-btn').classList.remove('hidden');

  let avgPre = countPre > 0 ? (sumPre / countPre).toFixed(1) : '0.0';
  let avgPost = countCompleted > 0 ? (sumPost / countCompleted).toFixed(1) : '0.0';
  let overallDev = countCompleted > 0 ? calcDev(avgPre, avgPost) : '-';
  
  document.getElementById('stat-total-users').textContent = groupedData.length;
  document.getElementById('stat-avg-pre').textContent = avgPre;
  document.getElementById('stat-avg-post').textContent = avgPost;
  document.getElementById('stat-avg-dev').textContent = overallDev !== '-' ? overallDev + '%' : '-';
  
  document.getElementById('print-avg-dev').textContent = overallDev;
}

// Anti-cheat
function handleVisibilityChange() {
  if (document.hidden && (isPreTestActive || isPostTestActive)) {
    Swal.fire({ icon: 'error', title: 'ทุจริต!', text: 'คุณกำลังออกจากระบบสอบ! ระบบได้บันทึกการกระทำนี้ไว้' });
  }
}
function handleBlur() {
  if (isPreTestActive || isPostTestActive) {
    Swal.fire({ icon: 'error', title: 'แจ้งเตือน!', text: 'คุณกำลังออกจากหน้าจอระบบสอบ!' });
  }
}

function endTestEarly() {
  clearInterval(timerInterval);
  isPreTestActive = false;
  isPostTestActive = false;
  preStartBtn.classList.remove('hidden');
  document.getElementById('pre-name').readOnly = false;
  preTestContainer.classList.add('hidden');
  postStartBtn.classList.remove('hidden');
  postNameSelect.disabled = false;
  postTestContainer.classList.add('hidden');
}

// Send Data to GAS
function sendDataToGAS(type, name, scoreData) {
  const data = new FormData();
  data.append('type', type);
  data.append('name', name);
  data.append('total', scoreData.total);
  data.append('p1', scoreData.p1);
  data.append('p2', scoreData.p2);
  data.append('timestamp', new Date().toISOString());

  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: data
  }).then(() => console.log('Data sent to GAS successfully'))
    .catch(err => console.error('Error sending to GAS', err));
}

init();
