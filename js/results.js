/**
 * 智贷匹配 — 结果展示
 * 渲染匹配产品卡片、详情弹窗、筛选排序
 */

const Results = (function() {

  let allResults = [];
  let filteredResults = [];
  let currentFilter = 'all';   // 'all' | 'eligible' | 'ineligible'
  let currentSort = 'score';   // 'score' | 'rate' | 'amount'

  // --- 渲染结果面板 ---
  function render(matchResults) {
    allResults = matchResults;
    applyFilters();

    const section = document.getElementById('results-section');
    const listEl = document.getElementById('results-list');
    const summaryEl = document.getElementById('results-summary');

    if (!section || !listEl) return;

    section.style.display = 'block';

    const eligibleCount = allResults.filter(r => r.isEligible).length;
    const totalCount = allResults.length;

    // Summary
    if (summaryEl) {
      summaryEl.innerHTML = eligibleCount > 0
        ? `🎯 为您匹配到 <strong>${eligibleCount}</strong> 款合适产品（共分析 ${totalCount} 款）`
        : `🔍 未找到完全匹配的产品。以下是分析的全部 ${totalCount} 款产品，可调整条件后重新匹配。`;
    }

    // Results list
    if (filteredResults.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <h3>暂无匹配产品</h3>
          <p>尝试调整贷款金额、期限或用途，扩大匹配范围</p>
          <button class="btn btn-outline" onclick="LoanForm.reset(); document.getElementById('match-section').scrollIntoView({behavior:'smooth'});">重新填写</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filteredResults.map((result, idx) => {
      const p = result.product;
      const scoreColor = result.score >= 80 ? '#059669' : result.score >= 60 ? '#d97706' : '#dc2626';
      const tagBg = result.isEligible ? '#d1fae5' : '#fee2e2';
      const tagColor = result.isEligible ? '#059669' : '#dc2626';
      const tagText = result.isEligible ? '✓ 推荐' : '✗ 不匹配';

      return `
      <div class="product-card ${result.isEligible ? 'eligible' : 'ineligible'} animate-in"
           style="animation-delay:${idx * 0.08}s" id="card-${p.id}">

        <div class="card-header">
          <div class="bank-info">
            <div class="bank-logo-circle">${p.bankShort.charAt(0)}</div>
            <div>
              <div class="bank-name">${p.bankName}</div>
              <div class="product-name">${p.productName}</div>
            </div>
          </div>
          <div class="card-badges">
            <span class="product-type-badge">${p.productType}</span>
            <span class="match-badge" style="background:${tagBg};color:${tagColor}">${tagText}</span>
          </div>
        </div>

        <div class="card-score-section">
          <div class="score-ring-container">
            <svg class="score-ring" viewBox="0 0 80 80">
              <circle class="ring-bg" cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" stroke-width="6"/>
              <circle class="ring-fill" cx="40" cy="40" r="34" fill="none"
                      stroke="${scoreColor}" stroke-width="6" stroke-linecap="round"
                      stroke-dasharray="${result.score * 2.14} 214"
                      transform="rotate(-90 40 40)"/>
            </svg>
            <div class="score-text">
              <span class="score-number" style="color:${scoreColor}">${result.score}</span>
              <span class="score-unit">分</span>
            </div>
          </div>
          <div class="score-breakdown">
            <div class="breakdown-row"><span>信用匹配</span><span class="bar"><span style="width:${result.matchDetails.creditMatch}%"></span></span><span>${result.matchDetails.creditMatch}</span></div>
            <div class="breakdown-row"><span>收入匹配</span><span class="bar"><span style="width:${result.matchDetails.incomeMatch}%"></span></span><span>${result.matchDetails.incomeMatch}</span></div>
            <div class="breakdown-row"><span>用途匹配</span><span class="bar"><span style="width:${result.matchDetails.purposeMatch}%"></span></span><span>${result.matchDetails.purposeMatch}</span></div>
          </div>
        </div>

        <div class="card-numbers">
          <div class="number-item">
            <span class="number-value">${p.interestRate}%</span>
            <span class="number-label">年化利率</span>
          </div>
          <div class="number-item">
            <span class="number-value">${(p.maxAmount / 10000).toFixed(0)}万</span>
            <span class="number-label">最高额度</span>
          </div>
          <div class="number-item">
            <span class="number-value">¥${result.estimatedMonthlyPayment.toLocaleString()}</span>
            <span class="number-label">预估月供</span>
          </div>
          <div class="number-item">
            <span class="number-value">${p.approvalTime}</span>
            <span class="number-label">审批时效</span>
          </div>
        </div>

        <div class="card-tags">
          ${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>

        ${!result.isEligible ? `
        <div class="disqualify-reasons">
          ${result.disqualifiers.map(d => `<span class="dq-reason">⚠ ${d}</span>`).join('')}
        </div>
        ` : ''}

        <div class="card-actions">
          <button class="btn btn-primary btn-sm" onclick="Results.showDetail('${p.id}')">📋 查看详情</button>
          <a href="${p.applyUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">🔗 前往官网</a>
          <span class="card-phone">📞 ${p.contactPhone}</span>
        </div>
      </div>
      `;
    }).join('');

    // Scroll to results
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- 产品详情弹窗 ---
  function showDetail(productId) {
    const result = allResults.find(r => r.productId === productId);
    if (!result) return;
    const p = result.product;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content animate-in">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <div class="modal-header">
          <div class="bank-logo-circle large">${p.bankShort.charAt(0)}</div>
          <div>
            <h2>${p.bankName} — ${p.productName}</h2>
            <span class="product-type-badge">${p.productType}</span>
          </div>
        </div>
        <p class="modal-desc">${p.description}</p>

        <div class="modal-numbers">
          <div class="modal-num"><span class="mn-label">年化利率</span><span class="mn-value">${p.interestRate}%</span></div>
          <div class="modal-num"><span class="mn-label">额度范围</span><span class="mn-value">¥${(p.minAmount/10000).toFixed(1)}万 - ¥${(p.maxAmount/10000).toFixed(1)}万</span></div>
          <div class="modal-num"><span class="mn-label">期限范围</span><span class="mn-value">${p.minTerm}-${p.maxTerm}个月</span></div>
          <div class="modal-num"><span class="mn-label">审批时效</span><span class="mn-value">${p.approvalTime}</span></div>
        </div>

        <div class="modal-req">
          <h4>📌 申请条件</h4>
          <div class="req-list">
            ${[
              { label: '最低信用评分', value: p.minCreditScore + '分', met: result.matchDetails.creditMatch >= 50 },
              { label: '就业要求', value: p.acceptedEmployment.join('、'), met: result.matchDetails.employMatch >= 50 },
              { label: '支持用途', value: p.supportedPurposes.join('、'), met: result.matchDetails.purposeMatch >= 50 },
              { label: '社保要求', value: p.requiresSocialSecurity ? '需要' : '不要求', met: !p.requiresSocialSecurity || true },
              { label: '公积金要求', value: p.requiresHousingFund ? '需要' : '不要求', met: !p.requiresHousingFund || true },
              { label: '抵押要求', value: p.collateralRequired ? '需要抵押' : '纯信用无抵押', met: true },
            ].map(req => `
              <div class="req-item">
                <span class="req-check ${req.met ? 'met' : 'unmet'}">${req.met ? '✓' : '✗'}</span>
                <span class="req-label">${req.label}</span>
                <span class="req-value">${req.value}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="modal-note">
          <p><strong>特别说明：</strong>${p.requirements}</p>
          <p><strong>利率说明：</strong>${p.rateNote}</p>
        </div>

        <div class="modal-disclaimer">
          ⚠️ 匹配结果仅供参考，最终审批以银行实际审核为准。建议直接联系银行咨询。
        </div>

        <div class="modal-actions">
          <a href="${p.applyUrl}" target="_blank" rel="noopener" class="btn btn-primary">🔗 前往银行官方申请</a>
          <span class="card-phone">📞 ${p.contactPhone}</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.modal-close').addEventListener('click', function() {
      document.body.style.overflow = '';
    });
    // Also restore scroll on overlay click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        document.body.style.overflow = '';
        overlay.remove();
      }
    });
  }

  // --- 筛选和排序 ---
  function applyFilters() {
    let results = [...allResults];

    if (currentFilter === 'eligible') {
      results = results.filter(r => r.isEligible);
    } else if (currentFilter === 'ineligible') {
      results = results.filter(r => !r.isEligible);
    }

    results.sort((a, b) => {
      switch(currentSort) {
        case 'rate':  return a.product.interestRate - b.product.interestRate;
        case 'amount': return b.product.maxAmount - a.product.maxAmount;
        default:      return b.score - a.score; // 'score'
      }
    });

    filteredResults = results;
  }

  function setFilter(filter) {
    currentFilter = filter;
    if (allResults.length > 0) reRender();
  }

  function setSort(sort) {
    currentSort = sort;
    if (allResults.length > 0) reRender();
  }

  function reRender() {
    applyFilters();
    render(allResults);
  }

  // --- 导出公共 API ---
  return {
    render, showDetail,
    setFilter, setSort,
    getResults: () => allResults,
    getFiltered: () => filteredResults
  };

})();
