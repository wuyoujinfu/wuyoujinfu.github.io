/**
 * 智贷匹配 — 表单逻辑
 * 多步骤表单、字段验证、数据收集
 */

const LoanForm = (function() {

  // --- 表单步骤配置 ---
  const STEPS = [
    { id: 1, title: '基本信息',    icon: '👤' },
    { id: 2, title: '资产与负债',  icon: '🏠' },
    { id: 3, title: '贷款需求',    icon: '🎯' },
    { id: 4, title: '确认并匹配',  icon: '✅' }
  ];

  let currentStep = 1;
  let formData = {};

  // --- 默认表单数据 ---
  const DEFAULT_DATA = {
    creditScore: 650,
    monthlyIncome: 15000,
    employmentType: '受薪雇员',
    hasSocialSecurity: true,
    hasHousingFund: true,
    hasProperty: false,
    hasCar: false,
    existingDebtMonthly: 0,
    loanPurpose: '个人消费',
    loanAmount: 100000,
    loanTerm: 12,
    creditHistoryMonths: 24,
    recentInquiries: 0,
    hasDelinquency: false
  };

  // --- 就业类型选项 ---
  const EMPLOYMENT_TYPES = [
    { value: '受薪雇员',    label: '受薪雇员',     desc: '企业/公司正式员工' },
    { value: '公务员事业编', label: '公务员/事业编', desc: '政府机关、事业单位' },
    { value: '自雇人士',    label: '自雇人士',     desc: '个体户、自由职业' },
    { value: '退休',        label: '退休人员',     desc: '已退休领取养老金' }
  ];

  // --- 贷款用途选项 ---
  const LOAN_PURPOSES = [
    { value: '个人消费', label: '个人消费', icon: '🛒' },
    { value: '购房',     label: '购房',     icon: '🏠' },
    { value: '购车',     label: '购车',     icon: '🚗' },
    { value: '经营周转', label: '经营周转', icon: '💼' },
    { value: '教育',     label: '教育',     icon: '📚' },
    { value: '装修',     label: '装修',     icon: '🔨' }
  ];

  // --- 信用评分档位 ---
  const CREDIT_LEVELS = [
    { min: 300, max: 500, label: '较差', color: '#dc2626', desc: '征信有逾期或查询过多' },
    { min: 500, max: 600, label: '一般', color: '#d97706', desc: '征信基本良好，部分瑕疵' },
    { min: 600, max: 700, label: '良好', color: '#059669', desc: '征信记录良好，适合多数产品' },
    { min: 700, max: 900, label: '优秀', color: '#1a56db', desc: '征信优秀，可申请最优利率' }
  ];

  function getCreditLevel(score) {
    for (let level of CREDIT_LEVELS) {
      if (score >= level.min && score <= level.max) return level;
    }
    return CREDIT_LEVELS[0];
  }

  // --- 初始化 ---
  function init() {
    // 从 localStorage 恢复数据
    const saved = localStorage.getItem('loandata_form');
    if (saved) {
      try {
        formData = { ...DEFAULT_DATA, ...JSON.parse(saved) };
      } catch(e) {
        formData = { ...DEFAULT_DATA };
      }
    } else {
      formData = { ...DEFAULT_DATA };
    }
    currentStep = 1;
    renderSteps();
    renderStep(currentStep);
    updateNavigation();
  }

  // --- 渲染步骤指示器 ---
  function renderSteps() {
    const indicator = document.getElementById('step-indicator');
    if (!indicator) return;
    indicator.innerHTML = STEPS.map((step, idx) => `
      <div class="step-dot ${step.id === currentStep ? 'active' : ''} ${step.id < currentStep ? 'done' : ''}"
           data-step="${step.id}">
        <span class="step-num">${step.id < currentStep ? '✓' : step.id}</span>
        <span class="step-label">${step.title}</span>
      </div>
      ${idx < STEPS.length - 1 ? '<div class="step-line ' + (step.id < currentStep ? 'done' : '') + '"></div>' : ''}
    `).join('');
  }

  // --- 渲染当前步骤 ---
  function renderStep(step) {
    const container = document.getElementById('form-container');
    if (!container) return;

    switch(step) {
      case 1: renderBasicInfo(container); break;
      case 2: renderAssets(container); break;
      case 3: renderLoanNeeds(container); break;
      case 4: renderReview(container); break;
    }
  }

  // --- Step 1: 基本信息 ---
  function renderBasicInfo(container) {
    const level = getCreditLevel(formData.creditScore);
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">
          信用评分
          <span class="form-tooltip" title="根据征信报告综合评估的信用分数，范围300-900分">ⓘ</span>
        </label>
        <div class="credit-score-display">
          <span class="credit-score-value" style="color:${level.color}">${formData.creditScore}</span>
          <span class="credit-score-badge" style="background:${level.color}15;color:${level.color}">${level.label}</span>
        </div>
        <input type="range" class="form-range" min="300" max="900" step="10" value="${formData.creditScore}"
               data-field="creditScore" oninput="LoanForm.updateRange(this)">
        <div class="range-labels">
          ${CREDIT_LEVELS.map(l => `<span style="color:${l.color}">${l.label}<br>${l.min}</span>`).join('')}
        </div>
        <p class="form-hint">${level.desc}</p>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月收入（元）</label>
          <input type="number" class="form-input" value="${formData.monthlyIncome}"
                 data-field="monthlyIncome" onchange="LoanForm.updateField(this)"
                 placeholder="税后月收入" min="0" step="500">
        </div>
        <div class="form-group">
          <label class="form-label">就业类型</label>
          <select class="form-select" data-field="employmentType" onchange="LoanForm.updateField(this)">
            ${EMPLOYMENT_TYPES.map(t => `<option value="${t.value}" ${formData.employmentType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">信用历史（月）</label>
          <input type="number" class="form-input" value="${formData.creditHistoryMonths}"
                 data-field="creditHistoryMonths" onchange="LoanForm.updateField(this)" min="0" placeholder="使用信贷的月数">
        </div>
        <div class="form-group">
          <label class="form-label">近6月查询次数</label>
          <input type="number" class="form-input" value="${formData.recentInquiries}"
                 data-field="recentInquiries" onchange="LoanForm.updateField(this)" min="0" max="20" placeholder="征信被查询次数">
        </div>
      </div>

      <div class="form-checkbox">
        <input type="checkbox" id="hasDelinquency" ${formData.hasDelinquency ? 'checked' : ''}
               onchange="LoanForm.updateCheckbox(this)" data-field="hasDelinquency">
        <label for="hasDelinquency">征信有逾期记录</label>
      </div>
    `;
  }

  // --- Step 2: 资产与负债 ---
  function renderAssets(container) {
    const checks = [
      { key: 'hasSocialSecurity', label: '缴纳社保', icon: '🏦' },
      { key: 'hasHousingFund',    label: '缴纳公积金', icon: '🏡' },
      { key: 'hasProperty',       label: '名下房产', icon: '🏠' },
      { key: 'hasCar',            label: '名下车辆', icon: '🚗' }
    ];

    container.innerHTML = `
      <div class="asset-cards">
        ${checks.map(c => `
          <div class="asset-card ${formData[c.key] ? 'selected' : ''}"
               data-field="${c.key}" onclick="LoanForm.toggleAsset(this)">
            <span class="asset-icon">${c.icon}</span>
            <span class="asset-label">${c.label}</span>
            <span class="asset-check">${formData[c.key] ? '✓' : ''}</span>
          </div>
        `).join('')}
      </div>

      <div class="form-group" style="margin-top:24px;">
        <label class="form-label">
          现有月负债（元）
          <span class="form-tooltip" title="包括房贷月供、车贷月供、信用卡最低还款等">ⓘ</span>
        </label>
        <input type="number" class="form-input" value="${formData.existingDebtMonthly}"
               data-field="existingDebtMonthly" onchange="LoanForm.updateField(this)" min="0" step="100" placeholder="当前每月需还的其他贷款">
        <p class="form-hint">银行会综合评估您的总负债与收入比（DTI）</p>
      </div>
    `;
  }

  // --- Step 3: 贷款需求 ---
  function renderLoanNeeds(container) {
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">贷款用途</label>
        <div class="purpose-grid">
          ${LOAN_PURPOSES.map(p => `
            <div class="purpose-card ${formData.loanPurpose === p.value ? 'selected' : ''}"
                 data-purpose="${p.value}" onclick="LoanForm.selectPurpose(this)">
              <span class="purpose-icon">${p.icon}</span>
              <span class="purpose-label">${p.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">
          期望贷款金额
          <span class="form-value-tag">¥${(formData.loanAmount / 10000).toFixed(1)}万</span>
        </label>
        <input type="range" class="form-range" min="5000" max="5000000" step="5000" value="${formData.loanAmount}"
               data-field="loanAmount" oninput="LoanForm.updateRange(this)">
        <div class="range-labels">
          <span>5千</span><span>50万</span><span>100万</span><span>300万</span><span>500万</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">
          期望贷款期限
          <span class="form-value-tag">${formData.loanTerm}个月</span>
        </label>
        <input type="range" class="form-range" min="1" max="360" step="1" value="${formData.loanTerm}"
               data-field="loanTerm" oninput="LoanForm.updateRange(this)">
        <div class="range-labels">
          <span>1月</span><span>6月</span><span>12月</span><span>36月</span><span>60月</span><span>360月</span>
        </div>
      </div>
    `;
  }

  // --- Step 4: 确认信息 ---
  function renderReview(container) {
    const level = getCreditLevel(formData.creditScore);
    const employLabel = EMPLOYMENT_TYPES.find(t => t.value === formData.employmentType)?.label || formData.employmentType;
    const purposeLabel = LOAN_PURPOSES.find(p => p.value === formData.loanPurpose)?.label || formData.loanPurpose;

    container.innerHTML = `
      <div class="review-card">
        <h3>📋 信息确认</h3>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">信用评分</span>
            <span class="review-value" style="color:${level.color}">${formData.creditScore}（${level.label}）</span>
          </div>
          <div class="review-item">
            <span class="review-label">月收入</span>
            <span class="review-value">¥${Number(formData.monthlyIncome).toLocaleString()}</span>
          </div>
          <div class="review-item">
            <span class="review-label">就业类型</span>
            <span class="review-value">${employLabel}</span>
          </div>
          <div class="review-item">
            <span class="review-label">社保/公积金</span>
            <span class="review-value">${formData.hasSocialSecurity ? '有社保' : '无社保'} · ${formData.hasHousingFund ? '有公积金' : '无公积金'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">资产</span>
            <span class="review-value">${formData.hasProperty ? '有房' : '无房'} · ${formData.hasCar ? '有车' : '无车'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">现有月负债</span>
            <span class="review-value">¥${Number(formData.existingDebtMonthly).toLocaleString()}</span>
          </div>
          <div class="review-item">
            <span class="review-label">贷款用途</span>
            <span class="review-value">${purposeLabel}</span>
          </div>
          <div class="review-item">
            <span class="review-label">期望金额</span>
            <span class="review-value">¥${(formData.loanAmount / 10000).toFixed(1)}万</span>
          </div>
          <div class="review-item">
            <span class="review-label">期望期限</span>
            <span class="review-value">${formData.loanTerm}个月</span>
          </div>
          <div class="review-item">
            <span class="review-label">逾期记录</span>
            <span class="review-value">${formData.hasDelinquency ? '⚠️ 有' : '✅ 无'}</span>
          </div>
        </div>

        <div class="privacy-notice">
          🔒 您的数据仅在本地浏览器中处理，不会上传至任何服务器。
        </div>

        <button class="btn-match" onclick="LoanForm.submitMatch()">
          🔍 开始智能匹配
        </button>
      </div>
    `;
  }

  // --- 更新导航按钮 ---
  function updateNavigation() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const matchBtn = document.getElementById('btn-start-match');

    if (prevBtn) prevBtn.style.display = currentStep > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = currentStep < 4 ? '' : 'none';
    if (matchBtn) matchBtn.style.display = 'none'; // step 4 has inline button
  }

  // --- 导航 ---
  function nextStep() {
    if (currentStep < 4) {
      currentStep++;
      renderSteps();
      renderStep(currentStep);
      updateNavigation();
      document.getElementById('match-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      renderSteps();
      renderStep(currentStep);
      updateNavigation();
    }
  }

  function goToStep(step) {
    if (step >= 1 && step <= 4 && step <= currentStep) {
      currentStep = step;
      renderSteps();
      renderStep(currentStep);
      updateNavigation();
    }
  }

  // --- 字段更新 ---
  function updateField(input) {
    const field = input.dataset.field;
    const value = input.type === 'number' ? Number(input.value) : input.value;
    formData[field] = value;
    saveData();
  }

  function updateRange(input) {
    const field = input.dataset.field;
    formData[field] = Number(input.value);
    saveData();
    // 重新渲染当前步骤以及时更新显示值
    renderStep(currentStep);
  }

  function updateCheckbox(checkbox) {
    const field = checkbox.dataset.field;
    formData[field] = checkbox.checked;
    saveData();
  }

  function toggleAsset(el) {
    const field = el.dataset.field;
    formData[field] = !formData[field];
    el.classList.toggle('selected', formData[field]);
    el.querySelector('.asset-check').textContent = formData[field] ? '✓' : '';
    saveData();
  }

  function selectPurpose(el) {
    document.querySelectorAll('.purpose-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    formData.loanPurpose = el.dataset.purpose;
    saveData();
  }

  // --- 数据持久化 ---
  function saveData() {
    localStorage.setItem('loandata_form', JSON.stringify(formData));
  }

  function getData() {
    return { ...formData };
  }

  // --- 提交匹配 ---
  function submitMatch() {
    // 触发 App 层级的匹配流程
    if (typeof App !== 'undefined' && App.runMatching) {
      App.runMatching(formData);
    }
  }

  // --- 从 PDF 解析数据预填 ---
  function prefill(data) {
    Object.keys(data).forEach(key => {
      if (key in formData && data[key] !== undefined && data[key] !== null) {
        formData[key] = data[key];
      }
    });
    saveData();
    renderStep(currentStep);
    renderSteps();
  }

  // --- 重置 ---
  function reset() {
    formData = { ...DEFAULT_DATA };
    localStorage.removeItem('loandata_form');
    currentStep = 1;
    renderSteps();
    renderStep(currentStep);
    updateNavigation();
  }

  // --- 导出公共 API ---
  return {
    STEPS, EMPLOYMENT_TYPES, LOAN_PURPOSES, CREDIT_LEVELS,
    init, getData, prefill, reset,
    nextStep, prevStep, goToStep,
    updateField, updateRange, updateCheckbox, toggleAsset, selectPurpose,
    submitMatch, getCreditLevel,
    DEFAULT_DATA
  };

})();
