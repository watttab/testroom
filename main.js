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

// Initialize
function init() {
  setupTabs();
  loadPostTestNames();
  
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

// Tabs Logic
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if(tab.id === 'tab-post-test' && !isPostTestUnlocked()) {
        Swal.fire('ถูกล็อค', 'กรุณาให้ Admin ปลดล็อคแท็บหลังเรียนก่อน', 'warning');
        return;
      }
      
      // Warn if leaving active test
      if (isPreTestActive || isPostTestActive) {
        Swal.fire({
          title: 'คุณกำลังทำข้อสอบ',
          text: "การเปลี่ยนแท็บจะทำให้ข้อสอบปัจจุบันถูกยกเลิก คุณแน่ใจหรือไม่?",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'แน่ใจ',
          cancelButtonText: 'ยกเลิก'
        }).then((result) => {
          if (result.isConfirmed) {
            endTestEarly();
            switchTab(tab);
          }
        });
      } else {
        switchTab(tab);
      }
    });
  });
}

function switchTab(selectedTab) {
  tabs.forEach(t => t.classList.remove('active'));
  contents.forEach(c => c.classList.remove('active'));
  
  selectedTab.classList.add('active');
  const target = selectedTab.getAttribute('data-target');
  document.getElementById(target).classList.add('active');
}

// Admin unlock logic
const unlockBtn = document.getElementById('unlock-btn');
unlockBtn.addEventListener('click', () => {
  const pwd = document.getElementById('admin-pwd').value;
  if(pwd === 'admin1234') { // Simple password for demo
    localStorage.setItem('post_test_unlocked', 'true');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    document.getElementById('tab-post-test').innerHTML = 'หลังเรียน <span class="lock-icon">🔓</span>';
    Swal.fire('สำเร็จ', 'ปลดล็อคแท็บหลังเรียนเรียบร้อยแล้ว', 'success');
  } else {
    Swal.fire('ข้อผิดพลาด', 'รหัสผ่านไม่ถูกต้อง', 'error');
  }
});

function isPostTestUnlocked() {
  return localStorage.getItem('post_test_unlocked') === 'true';
}

// Check on load if unlocked
if(isPostTestUnlocked()) {
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('admin-dashboard').classList.remove('hidden');
  document.getElementById('tab-post-test').innerHTML = 'หลังเรียน <span class="lock-icon">🔓</span>';
}

// Load names from LocalStorage for Post-test dropdown
function loadPostTestNames() {
  const names = JSON.parse(localStorage.getItem('pre_test_names') || '[]');
  postNameSelect.innerHTML = '<option value="">-- เลือกชื่อของคุณ --</option>';
  names.forEach(name => {
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
    
    // Shuffle options
    const shuffledOptions = shuffle([...q.options]);
    shuffledOptions.forEach(opt => {
      const optValue = opt.charAt(0); // ก, ข, ค, ง
      html += `
        <label class="option-label">
          <input type="radio" name="${prefix}_q_${q.id}" value="${optValue}" required>
          <span>${opt}</span>
        </label>
      `;
    });
    
    html += `</div>`;
    qDiv.innerHTML = html;
    container.appendChild(qDiv);
  });
}

// Pre-test Logic
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

// Submit Pre-test
preTestForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearInterval(timerInterval);
  isPreTestActive = false;
  
  const formData = new FormData(preTestForm);
  const name = formData.get('name');
  const score = calculateScore(formData, 'pre');
  
  // Save to LocalStorage for Post-Test dropdown
  const names = JSON.parse(localStorage.getItem('pre_test_names') || '[]');
  if(!names.includes(name)) {
    names.push(name);
    localStorage.setItem('pre_test_names', JSON.stringify(names));
    loadPostTestNames();
  }
  
  // Save Score
  localStorage.setItem(`pre_score_${name}`, score);
  document.getElementById('print-name').textContent = name;
  document.getElementById('print-pre-score').textContent = score;
  
  sendDataToGAS('Pre-test', name, score);
  
  Swal.fire('สำเร็จ', `คุณได้คะแนน ${score}/10`, 'success').then(() => {
    preTestForm.reset();
    document.getElementById('pre-name').readOnly = false;
    preStartBtn.classList.remove('hidden');
    preTestContainer.classList.add('hidden');
    switchTab(tabs[2]); // Go to Results
    updateResultsDisplay(name);
  });
});

// Post-test Logic
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

// Submit Post-test
postTestForm.addEventListener('submit', (e) => {
  e.preventDefault();
  isPostTestActive = false;
  
  const formData = new FormData(postTestForm);
  const name = postNameSelect.value;
  const score = calculateScore(formData, 'post');
  
  // Save Score
  localStorage.setItem(`post_score_${name}`, score);
  document.getElementById('print-post-score').textContent = score;
  
  sendDataToGAS('Post-test', name, score);
  
  Swal.fire('สำเร็จ', `คุณได้คะแนน ${score}/10`, 'success').then(() => {
    postTestForm.reset();
    postNameSelect.disabled = false;
    postStartBtn.classList.remove('hidden');
    postTestContainer.classList.add('hidden');
    switchTab(tabs[2]); // Go to Results
    updateResultsDisplay(name);
  });
});

// Calculate Score
function calculateScore(formData, prefix) {
  let score = 0;
  questionsData.forEach(q => {
    const ans = formData.get(`${prefix}_q_${q.id}`);
    if(ans === q.answer) {
      score++;
    }
  });
  return score;
}

// Update Results Display
function updateResultsDisplay(name) {
  const preScore = localStorage.getItem(`pre_score_${name}`) || '-';
  const postScore = localStorage.getItem(`post_score_${name}`) || '-';
  
  document.getElementById('results-display').innerHTML = `
    <h3>ชื่อ-สกุล: ${name}</h3>
    <p>คะแนนก่อนเรียน: ${preScore} / 10</p>
    <p>คะแนนหลังเรียน: ${postScore} / 10</p>
  `;
  document.getElementById('print-btn').classList.remove('hidden');
  
  document.getElementById('print-name').textContent = name;
  document.getElementById('print-pre-score').textContent = preScore;
  document.getElementById('print-post-score').textContent = postScore;
}

// Anti-cheat
function handleVisibilityChange() {
  if (document.hidden && (isPreTestActive || isPostTestActive)) {
    Swal.fire({
      icon: 'error',
      title: 'ทุจริต!',
      text: 'คุณกำลังออกจากระบบสอบ! ระบบได้บันทึกการกระทำนี้ไว้'
    });
  }
}

function handleBlur() {
  if (isPreTestActive || isPostTestActive) {
    Swal.fire({
      icon: 'error',
      title: 'แจ้งเตือน!',
      text: 'คุณกำลังออกจากหน้าจอระบบสอบ!'
    });
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
function sendDataToGAS(type, name, score) {
  const data = new FormData();
  data.append('type', type);
  data.append('name', name);
  data.append('score', score);
  data.append('timestamp', new Date().toISOString());

  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: data
  }).then(() => {
    console.log('Data sent to GAS successfully');
  }).catch(err => {
    console.error('Error sending to GAS', err);
  });
}

init();
