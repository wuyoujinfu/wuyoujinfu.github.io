/**
 * 智贷匹配 — 应用主控
 * 初始化、路由、全局事件、产品数据加载
 */

const App = (function() {

  let products = [];
  let isReady = false;

  // --- 初始化 ---
  async function init() {
    await loadProducts();
    LoanForm.init();
    setupNavigation();
    setupSmoothScroll();
    renderTrustBar();
    setupFilterListeners();
    isReady = true;
    console.log('✅ 智贷匹配平台就绪，已加载 ' + products.length + ' 款金融产品');
  }

  // --- 匹配流程 ---
  function runMatching(userProfile) {
    if (!products.length) {
      alert('产品数据加载中，请稍后再试。');
      return;
    }

    // 显示加载态
    const resultsSection = document.getElementById('results-section');
    const resultsList = document.getElementById('results-list');
    if (resultsList) {
      resultsList.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>正在为您匹配最优贷款产品...</p>
        </div>
      `;
    }
    if (resultsSection) resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 延迟渲染，让用户感知匹配过程
    setTimeout(() => {
      const matchResults = Matcher.match(userProfile, products);

      // 保存匹配结果
      localStorage.setItem('loandata_results', JSON.stringify({
        timestamp: Date.now(),
        profile: userProfile,
        results: matchResults.map(r => ({
          productId: r.productId,
          score: r.score,
          isEligible: r.isEligible
        }))
      }));

      Results.render(matchResults);
    }, 600);
  }

  // --- 导航 ---
  function setupNavigation() {
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // 关闭移动端菜单
          document.getElementById('nav-menu')?.classList.remove('open');
        }
      });
    });

    // Mobile menu toggle
    const menuBtn = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    if (menuBtn && menu) {
      menuBtn.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', isOpen);
        menuBtn.setAttribute('aria-label', isOpen ? '关闭菜单' : '打开菜单');
        menuBtn.textContent = isOpen ? '✕' : '☰';
      });
    }

    // CTA buttons
    document.querySelectorAll('[data-scroll-to="match"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('match-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Form navigation
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.addEventListener('click', LoanForm.prevStep);
    if (nextBtn) nextBtn.addEventListener('click', LoanForm.nextStep);
  }

  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // --- 信任栏 ---
  function renderTrustBar() {
    const bar = document.getElementById('trust-bar');
    if (!bar) return;
    // 银行名称与对应 emoji 图标
    const bankIcons = {
      '中国工商银行': '🏦', '中国建设银行': '🏗️', '中国农业银行': '🌾',
      '中国银行': '🏛️', '交通银行': '🚢', '招商银行': '💼',
      '兴业银行': '🌟', '浦发银行': '🏙️', '平安银行': '🛡️',
      '微众银行': '📱', '网商银行': '💻'
    };
    // 优先从已加载的产品数据中提取银行列表
    let banks;
    if (products.length) {
      const seen = new Set();
      banks = products
        .map(p => p.bankName)
        .filter(name => { const keep = !seen.has(name); seen.add(name); return keep; });
    } else {
      banks = Object.keys(bankIcons);
    }
    bar.innerHTML = `
      <span class="trust-label">合作银行与金融机构</span>
      <div class="trust-logos">
        ${banks.map(b => `<span class="trust-bank-item"><span class="trust-bank-icon">${bankIcons[b] || '🏦'}</span> ${b}</span>`).join('')}
      </div>
    `;
  }

  // --- 动态更新 Hero 推荐产品 ---
  function updateHeroProduct() {
    const heroCard = document.querySelector('.hero-card');
    if (!heroCard || !products.length) return;
    // 选择评分最高的产品作为推荐
    const featured = [...products].sort((a, b) => b.rating - a.rating)[0];
    if (!featured) return;
    heroCard.querySelector('.hc-rate').textContent = featured.interestRate + '%';
    heroCard.querySelector('.hc-header > div > div:last-child').textContent =
      featured.bankShort + ' · ' + featured.productName;
    const features = heroCard.querySelectorAll('.hc-feat');
    if (features.length >= 4) {
      features[0].querySelector('.check').nextSibling.textContent = ' 最高额度 ' + (featured.maxAmount / 10000).toFixed(0) + '万元';
      features[1].querySelector('.check').nextSibling.textContent = featured.collateralRequired ? ' 抵押贷款' : ' 纯信用，无抵押';
      features[2].querySelector('.check').nextSibling.textContent = ' ' + featured.approvalTime;
      features[3].querySelector('.check').nextSibling.textContent = ' ' + featured.tags.slice(0, 2).join('，');
    }
  }

  // --- 加载产品后更新 Hero ---
  async function loadProducts() {
    try {
      const resp = await fetch('data/products.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      products = data.products || [];
      if (data.updatedAt) {
        const el = document.getElementById('data-update-date');
        if (el) el.textContent = data.updatedAt;
      }
      // 数据加载完成后渲染信任栏（使用真实银行列表）
      renderTrustBar();
      updateHeroProduct();
    } catch(e) {
      console.error('加载产品数据失败:', e);
      products = [];
      const notice = document.getElementById('data-error-notice');
      if (notice) notice.style.display = 'block';
    }
  }

  // --- 筛选器 ---
  function setupFilterListeners() {
    const filterBtns = document.querySelectorAll('[data-filter]');
    const sortSelect = document.getElementById('sort-select');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        Results.setFilter(this.dataset.filter);
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        Results.setSort(this.value);
      });
    }
  }

  // --- 跳转到材料清单 ---
  App.goToChecklist = goToChecklist;

  // --- 导出 ---
  return {
    init, runMatching, resetAll, goToChecklist,
    getProducts: () => products,
    isReady: () => isReady
  };

})();

// --- 全局导航函数 ---
function goToChecklist(type) {
  document.querySelectorAll('.hero-choice-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.target === type);
  });
  switchChecklist(type);
  setTimeout(function() {
    document.getElementById('checklist').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function switchChecklist(type) {
  var tabs = document.querySelectorAll('.checklist-tab');
  var contents = document.querySelectorAll('.checklist-content');
  tabs.forEach(function(t) { t.classList.remove('active'); });
  contents.forEach(function(c) { c.style.display = 'none'; });
  if (type === 'business') {
    tabs[1] && tabs[1].classList.add('active');
    var biz = document.getElementById('checklist-business');
    if (biz) biz.style.display = 'block';
  } else {
    tabs[0] && tabs[0].classList.add('active');
    var per = document.getElementById('checklist-personal');
    if (per) per.style.display = 'block';
  }
}

// --- 页面加载完成后初始化 ---
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
