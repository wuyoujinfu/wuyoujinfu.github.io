/**
 * 无游金服 — PDF 征信报告处理
 * 使用事件委托，支持动态生成的 PDF 上传区域
 */

(function() {
  // 使用事件委托监听动态生成的 PDF 上传区域
  document.body.addEventListener('click', function(e) {
    const zone = e.target.closest('#pdf-upload-zone');
    if (!zone) return;
    const input = zone.querySelector('#pdf-file-input');
    if (input && !e.target.closest('input')) input.click();
  });

  document.body.addEventListener('dragover', function(e) {
    const zone = e.target.closest('#pdf-upload-zone');
    if (zone) { e.preventDefault(); zone.classList.add('drag-over'); }
  });

  document.body.addEventListener('dragleave', function(e) {
    const zone = e.target.closest('#pdf-upload-zone');
    if (zone) zone.classList.remove('drag-over');
  });

  document.body.addEventListener('drop', function(e) {
    const zone = e.target.closest('#pdf-upload-zone');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') handlePDF(file, zone);
  });

  document.body.addEventListener('change', function(e) {
    if (e.target.id === 'pdf-file-input' && e.target.files[0]) {
      const zone = e.target.closest('#pdf-upload-zone');
      if (zone) handlePDF(e.target.files[0], zone);
    }
  });

  async function handlePDF(file, zone) {
    zone.querySelector('.upload-text').textContent = '正在解析征信报告...';
    zone.querySelector('.upload-hint').textContent = '请稍候，处理中...';

    try {
      if (typeof pdfjsLib === 'undefined') {
        await new Promise(function(resolve, reject) {
          var script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      var arrayBuffer = await file.arrayBuffer();
      var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      var fullText = '';
      for (var i = 1; i <= pdf.numPages; i++) {
        var page = await pdf.getPage(i);
        var textContent = await page.getTextContent();
        fullText += textContent.items.map(function(item) { return item.str; }).join(' ') + '\n';
      }

      var parsed = {};
      var scoreMatch = fullText.match(/信用评分[：:]\s*(\d+)/);
      if (scoreMatch) parsed.creditScore = parseInt(scoreMatch[1]);

      var overdueMatch = fullText.match(/逾期[记纪]*录[：:]*\s*(\d+)\s*[次笔]/);
      if (overdueMatch) parsed.hasDelinquency = parseInt(overdueMatch[1]) > 0;

      var queryMatch = fullText.match(/查询[记纪]*录[：:]*.*?(\d+)\s*次/);
      if (queryMatch) parsed.recentInquiries = parseInt(queryMatch[1]);

      if (Object.keys(parsed).length > 0) {
        if (typeof LoanForm !== 'undefined' && LoanForm.prefill) {
          LoanForm.prefill(parsed);
          zone.querySelector('.upload-text').textContent = '✅ 已识别并预填 ' + Object.keys(parsed).length + ' 项信息';
          zone.querySelector('.upload-hint').textContent = '请核对后修改，识别结果可能有偏差';
        }
      } else {
        zone.querySelector('.upload-text').textContent = '⚠️ 未识别到关键字段，请手动填写';
        zone.querySelector('.upload-hint').textContent = 'Beta 功能 · 支持标准格式征信报告PDF';
      }
    } catch(err) {
      console.error('PDF解析失败:', err);
      zone.querySelector('.upload-text').textContent = '❌ 解析失败，请手动填写表单';
      zone.querySelector('.upload-hint').textContent = '请确认上传的是标准格式的PDF文件';
    }
  }
})();
