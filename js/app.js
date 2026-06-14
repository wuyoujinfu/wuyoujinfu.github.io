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

  // --- 加载产品数据 ---
  async function loadProducts() {
    try {
      const resp = await fetch('data/products.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      products = data.products || [];
      // 同时存储版本信息
      if (data.updatedAt) {
        document.getElementById('data-update-date') && (document.getElementById('data-update-date').textContent = data.updatedAt);
      }
    } catch(e) {
      console.error('加载产品数据失败:', e);
      products = [];
      // 显示错误提示
      const notice = document.getElementById('data-error-notice');
      if (notice) notice.style.display = 'block';
    }
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
        menu.classList.toggle('open');
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
    const banks = ['中国工商银行', '中国建设银行', '中国农业银行', '中国银行',
                   '交通银行', '招商银行', '兴业银行', '浦发银行',
                   '平安银行', '微众银行', '网商银行'];
    bar.innerHTML = `
      <span class="trust-label">合作银行与金融机构</span>
      <div class="trust-logos">
        ${banks.map(b => `<span class="trust-bank-item">${b}</span>`).join('')}
      </div>
    `;
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

  // --- 重置 ---
  function resetAll() {
    LoanForm.reset();
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) resultsSection.style.display = 'none';
    document.getElementById('match-section').scrollIntoView({ behavior: 'smooth' });
  }

  // --- 导出 ---
  return {
    init, runMatching, resetAll,
    getProducts: () => products,
    isReady: () => isReady
  };

})();

// --- 页面加载完成后初始化 ---
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
