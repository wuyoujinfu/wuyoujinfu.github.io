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
    loanTarget: '个人',
    // 个人字段
    creditScore: 0,
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
    hasDelinquency: false,
    // 企业字段
    annualRevenue: 100,
    yearsInBusiness: 3,
    taxRating: 'B',
    hasBusinessProperty: false
  };

  // --- 企业默认值 ---
  const BUSINESS_DEFAULTS = {
    employmentType: '自雇人士',
    loanPurpose: '经营周转',
    loanAmount: 500000,
    loanTerm: 12
  };

  // --- 贷款对象用途映射 ---
  const PURPOSES_BY_TARGET = {
    '个人': [
      { value: '个人消费', label: '个人消费', icon: '🛒' },
      { value: '购房',     label: '购房',     icon: '🏠' },
      { value: '购车',     label: '购车',     icon: '🚗' },
      { value: '教育',     label: '教育',     icon: '📚' },
      { value: '装修',     label: '装修',     icon: '🔨' }
    ],
    '企业': [
      { value: '经营周转', label: '经营周转', icon: '💼' },
      { value: '设备采购', label: '设备采购', icon: '⚙️' },
      { value: '扩大经营', label: '扩大经营', icon: '📈' },
      { value: '库存备货', label: '库存备货', icon: '📦' },
      { value: '工资发放', label: '工资发放', icon: '👥' },
      { value: '供应链融资', label: '供应链融资', icon: '🔗' }
    ]
  };

  function getPurposesForTarget(target) {
    return PURPOSES_BY_TARGET[target] || PURPOSES_BY_TARGET['个人'];
  }

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
    if (!score || score <= 0) return { min: 0, max: 0, label: '待评估', color: '#94a3b8', desc: '上传征信报告后自动生成信用评分' };
    for (let level of CREDIT_LEVELS) {
      if (score >= level.min && score <= level.max) return level;
    }
    return CREDIT_LEVELS[0];
  }

  // --- 表单内切换贷款类型 ---
  function switchLoanType(target) {
    if (formData.loanTarget === target) return;
    if (target === '企业') {
      formData.loanTarget = '企业';
      Object.assign(formData, BUSINESS_DEFAULTS);
    } else {
      formData.loanTarget = '个人';
      formData.employmentType = DEFAULT_DATA.employmentType;
      formData.loanPurpose = DEFAULT_DATA.loanPurpose;
    }
    saveData();
    renderStep(currentStep);
    renderSteps();
  }

  // --- 设置贷款对象 ---
  function setTarget(target) {
    if (target === '企业') {
      formData.loanTarget = '企业';
      Object.assign(formData, BUSINESS_DEFAULTS);
    } else {
      formData.loanTarget = '个人';
      formData.employmentType = DEFAULT_DATA.employmentType;
      formData.loanPurpose = DEFAULT_DATA.loanPurpose;
    }
    currentStep = 1;
    saveData();
    renderSteps();
    renderStep(currentStep);
    updateNavigation();
  }

  // --- 初始化 ---
  function init() {
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
    const isBusiness = formData.loanTarget === '企业';
    // 企业专用的就业类型
    const businessEmployTypes = [
      { value: '自雇人士', label: '自雇人士（个体户/法人）', desc: '个体工商户、企业法人' },
      { value: '企业合伙人', label: '企业合伙人', desc: '公司合伙人、股东' }
    ];
    const employOptions = isBusiness ? businessEmployTypes : EMPLOYMENT_TYPES;

    container.innerHTML = `
      <!-- 当前通道标识 -->
      <div class="channel-badge ${isBusiness ? 'channel-business' : 'channel-personal'}">
        ${isBusiness ? '🏢 企业贷款资料填报' : '👤 个人贷款资料填报'}
        <span style="font-weight:400;margin-left:8px;opacity:0.7;font-size:0.82rem;">（可返回上一步重新选择）</span>
      </div>

      <div class="form-group">
        <label class="form-label">
          信用评分
          <span class="form-tooltip" title="上传征信报告后由系统自动解析生成，无需手动填写">ⓘ</span>
        </label>
        <div class="credit-score-display credit-score-readonly">
          <span class="credit-score-value" style="color:var(--text-muted)">${formData.creditScore > 0 ? formData.creditScore : '--'}</span>
          <span class="credit-score-badge" style="background:var(--bg);color:var(--text-muted)">${formData.creditScore > 0 ? level.label : '待评估'}</span>
        </div>
        <p class="form-hint" style="color:var(--text-muted);">📄 上传征信报告后由系统自动解析并生成信用评分</p>
      </div>

      ${isBusiness ? `
      <!-- 企业专用字段 -->
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">年营业额（万元）</label>
          <input type="number" class="form-input" value="${formData.annualRevenue}"
                 data-field="annualRevenue" onchange="LoanForm.updateField(this)"
                 placeholder="企业年营业额" min="0" step="10">
        </div>
        <div class="form-group">
          <label class="form-label">经营年限</label>
          <select class="form-select" data-field="yearsInBusiness" onchange="LoanForm.updateField(this)">
            <option value="1" ${formData.yearsInBusiness === 1 ? 'selected' : ''}>不满1年</option>
            <option value="2" ${formData.yearsInBusiness === 2 ? 'selected' : ''}>1-2年</option>
            <option value="3" ${formData.yearsInBusiness === 3 ? 'selected' : ''}>2-3年</option>
            <option value="5" ${formData.yearsInBusiness >= 5 ? 'selected' : ''}>3-5年</option>
            <option value="10" ${formData.yearsInBusiness >= 10 ? 'selected' : ''}>5年以上</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">纳税评级</label>
        <select class="form-select" data-field="taxRating" onchange="LoanForm.updateField(this)">
          <option value="A" ${formData.taxRating === 'A' ? 'selected' : ''}>A 级（优秀）</option>
          <option value="B" ${formData.taxRating === 'B' ? 'selected' : ''}>B 级（良好）</option>
          <option value="C" ${formData.taxRating === 'C' ? 'selected' : ''}>C 级（一般）</option>
          <option value="无" ${formData.taxRating === '无' ? 'selected' : ''}>暂无评级</option>
        </select>
      </div>
      ` : `
      <!-- 个人专用字段 -->
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
      `}

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${isBusiness ? '企业信用历史（月）' : '信用历史（月）'}</label>
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
        <label for="hasDelinquency">${isBusiness ? '企业/个人征信有逾期记录' : '征信有逾期记录'}</label>
      </div>
    `;
  }

  // --- Step 2: 资产与负债 ---
  function renderAssets(container) {
    const isBusiness = formData.loanTarget === '企业';
    const checks = isBusiness ? [
      { key: 'hasProperty',       label: '企业房产', icon: '🏭' },
      { key: 'hasCar',            label: '企业车辆', icon: '🚛' },
      { key: 'hasBusinessProperty', label: '经营场所', icon: '🏢' },
    ] : [
      { key: 'hasSocialSecurity', label: '缴纳社保', icon: '🏦' },
      { key: 'hasHousingFund',    label: '缴纳公积金', icon: '🏡' },
      { key: 'hasProperty',       label: '名下房产', icon: '🏠' },
      { key: 'hasCar',            label: '名下车辆', icon: '🚗' }
    ];

    container.innerHTML = `
      <div class="asset-cards ${isBusiness ? 'asset-cards-3' : ''}">
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
          ${isBusiness ? '现有月负债（元，含经营贷月供）' : '现有月负债（元）'}
          <span class="form-tooltip" title="${isBusiness ? '包括经营贷款月供、信用卡还款等' : '包括房贷月供、车贷月供、信用卡最低还款等'}">ⓘ</span>
        </label>
        <input type="number" class="form-input" value="${formData.existingDebtMonthly}"
               data-field="existingDebtMonthly" onchange="LoanForm.updateField(this)" min="0" step="100" placeholder="当前每月需还的其他贷款">
        <p class="form-hint">${isBusiness ? '银行会综合评估企业经营负债与收入比' : '银行会综合评估您的总负债与收入比（DTI）'}</p>
      </div>
    `;
  }

  // --- Step 3: 贷款需求 ---
  function renderLoanNeeds(container) {
    const purposes = getPurposesForTarget(formData.loanTarget);
    // 确保当前用途在目标允许范围内
    if (!purposes.find(p => p.value === formData.loanPurpose)) {
      formData.loanPurpose = purposes[0].value;
    }
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">贷款用途</label>
        <div class="purpose-grid">
          ${purposes.map(p => `
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
    const isBusiness = formData.loanTarget === '企业';
    const employLabel = (isBusiness
      ? (formData.employmentType === '自雇人士' ? '自雇人士（个体户/法人）' : '企业合伙人')
      : EMPLOYMENT_TYPES.find(t => t.value === formData.employmentType)?.label) || formData.employmentType;
    const purposes = getPurposesForTarget(formData.loanTarget);
    const purposeLabel = purposes.find(p => p.value === formData.loanPurpose)?.label || formData.loanPurpose;

    const businessReview = isBusiness ? `
      <div class="review-item">
        <span class="review-label">年营业额</span>
        <span class="review-value">¥${Number(formData.annualRevenue).toLocaleString()}万</span>
      </div>
      <div class="review-item">
        <span class="review-label">经营年限</span>
        <span class="review-value">${formData.yearsInBusiness >= 5 ? '5年以上' : formData.yearsInBusiness + '年'}</span>
      </div>
      <div class="review-item">
        <span class="review-label">纳税评级</span>
        <span class="review-value">${formData.taxRating} 级</span>
      </div>
      <div class="review-item">
        <span class="review-label">企业资产</span>
        <span class="review-value">${formData.hasProperty ? '有房产' : '无房产'} · ${formData.hasCar ? '有车辆' : '无车辆'} · ${formData.hasBusinessProperty ? '有经营场所' : '无经营场所'}</span>
      </div>
    ` : `
      <div class="review-item">
        <span class="review-label">月收入</span>
        <span class="review-value">¥${Number(formData.monthlyIncome).toLocaleString()}</span>
      </div>
      <div class="review-item">
        <span class="review-label">社保/公积金</span>
        <span class="review-value">${formData.hasSocialSecurity ? '有社保' : '无社保'} · ${formData.hasHousingFund ? '有公积金' : '无公积金'}</span>
      </div>
      <div class="review-item">
        <span class="review-label">资产</span>
        <span class="review-value">${formData.hasProperty ? '有房' : '无房'} · ${formData.hasCar ? '有车' : '无车'}</span>
      </div>
    `;

    container.innerHTML = `
      <div class="review-card">
        <h3>📋 信息确认</h3>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-label">贷款对象</span>
            <span class="review-value">${isBusiness ? '🏢 企业贷款' : '👤 个人贷款'}</span>
          </div>
          <div class="review-item">
            <span class="review-label">信用评分</span>
            <span class="review-value" style="color:${level.color}">${formData.creditScore}（${level.label}）</span>
          </div>
          ${businessReview}
          <div class="review-item">
            <span class="review-label">就业类型</span>
            <span class="review-value">${employLabel}</span>
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

        <!-- PDF 征信报告上传（可选） -->
        <div class="pdf-upload-zone" id="pdf-upload-zone" style="margin-bottom:20px;">
          <div class="upload-icon">📄</div>
          <div class="upload-text">上传征信报告（PDF格式）— 自动识别填写</div>
          <div class="upload-hint">可选 · 所有处理在您的设备上完成 · 系统将自动解析关键字段</div>
          <input type="file" accept=".pdf" id="pdf-file-input">
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

    if (prevBtn) {
      if (currentStep > 1) {
        prevBtn.style.display = '';
        prevBtn.textContent = '← 上一步';
      } else if (currentStep === 1) {
        prevBtn.style.display = '';
        prevBtn.textContent = '← 返回选择';
      } else {
        prevBtn.style.display = 'none';
      }
    }
    if (nextBtn) {
      if (currentStep < 4) {
        nextBtn.style.display = '';
        nextBtn.textContent = '下一步 →';
      } else {
        nextBtn.style.display = 'none';
      }
    }
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
    if (currentStep === 1) {
      // 返回入口页
      var gate = document.getElementById('form-gate');
      var body = document.getElementById('form-body');
      var indicator = document.getElementById('step-indicator');
      var prevBtn = document.getElementById('btn-prev');
      var nextBtn = document.getElementById('btn-next');
      if (gate) gate.style.display = '';
      if (body) body.style.display = 'none';
      if (indicator) indicator.style.display = 'none';
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) { nextBtn.style.display = ''; nextBtn.textContent = '开始填报 →'; }
      document.getElementById('match-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
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

  function selectTarget(el) {
    document.querySelectorAll('.target-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    const newTarget = el.dataset.target;
    if (formData.loanTarget !== newTarget) {
      formData.loanTarget = newTarget;
      // 切换对象时重置用途为第一个
      const purposes = getPurposesForTarget(newTarget);
      formData.loanPurpose = purposes[0].value;
    }
    saveData();
    renderStep(currentStep);
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
    // 回到入口页
    var gate = document.getElementById('form-gate');
    var body = document.getElementById('form-body');
    if (gate) gate.style.display = '';
    if (body) body.style.display = 'none';
    // 重置按钮
    var prevBtn = document.getElementById('btn-prev');
    var nextBtn = document.getElementById('btn-next');
    var indicator = document.getElementById('step-indicator');
    if (indicator) indicator.style.display = 'none';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) { nextBtn.style.display = ''; nextBtn.textContent = '开始填报 →'; }
  }

  // --- 导出公共 API ---
  return {
    STEPS, EMPLOYMENT_TYPES, CREDIT_LEVELS, PURPOSES_BY_TARGET,
    init, getData, prefill, reset, setTarget, switchLoanType,
    nextStep, prevStep, goToStep,
    updateField, updateRange, updateCheckbox, toggleAsset, selectTarget, selectPurpose,
    submitMatch, getCreditLevel, getPurposesForTarget,
    DEFAULT_DATA, BUSINESS_DEFAULTS
  };

})();
