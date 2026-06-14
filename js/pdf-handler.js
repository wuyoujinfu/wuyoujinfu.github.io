/**
 * 无游金服 — PDF 征信报告处理
 * 客户端解析 PDF，自动识别并预填表单字段
 */

(function() {
  const zone = document.getElementById('pdf-upload-zone');
  const input = document.getElementById('pdf-file-input');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') handlePDF(file);
  });
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handlePDF(file);
  });

  async function handlePDF(file) {
    zone.querySelector('.upload-text').textContent = '正在解析征信报告...';
    zone.querySelector('.upload-hint').textContent = '请稍候，处理中...';

    try {
      // Load PDF.js from CDN on demand
      if (typeof pdfjsLib === 'undefined') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }

      // Parse key fields
      const parsed = {};
      const scoreMatch = fullText.match(/信用评分[：:]\s*(\d+)/);
      if (scoreMatch) parsed.creditScore = parseInt(scoreMatch[1]);

      const overdueMatch = fullText.match(/逾期[记纪]*录[：:]*\s*(\d+)\s*[次笔]/);
      if (overdueMatch) parsed.hasDelinquency = parseInt(overdueMatch[1]) > 0;

      const queryMatch = fullText.match(/查询[记纪]*录[：:]*.*?(\d+)\s*次/);
      if (queryMatch) parsed.recentInquiries = parseInt(queryMatch[1]);

      // Prefill form
      if (Object.keys(parsed).length > 0) {
        LoanForm.prefill(parsed);
        zone.querySelector('.upload-text').textContent = '✅ 已识别并预填 ' + Object.keys(parsed).length + ' 项信息';
        zone.querySelector('.upload-hint').textContent = '请核对后修改，识别结果可能有偏差';
      } else {
        zone.querySelector('.upload-text').textContent = '⚠️ 未识别到关键字段，请手动填写';
        zone.querySelector('.upload-hint').textContent = 'Beta 功能 · 支持标准格式征信报告PDF';
      }
    } catch(e) {
      console.error('PDF解析失败:', e);
      zone.querySelector('.upload-text').textContent = '❌ 解析失败，请手动填写表单';
      zone.querySelector('.upload-hint').textContent = '请确认上传的是标准格式的PDF文件';
    }
  }
})();
