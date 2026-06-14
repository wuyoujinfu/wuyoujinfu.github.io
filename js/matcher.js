/**
 * 智贷匹配 — 匹配引擎核心算法
 * 加权多因子评分模型，根据用户征信画像匹配最优银行贷款产品
 */

const Matcher = (function() {

  // --- 评分权重 ---
  const WEIGHTS = {
    creditScore: 0.25,
    income:      0.20,
    employment:  0.15,
    loanAmount:  0.15,
    loanPurpose: 0.10,
    debtBurden:  0.10,
    extras:      0.05
  };

  // --- 月供计算（等额本息） ---
  function calcMonthlyPayment(principal, annualRate, months) {
    if (months <= 0 || annualRate <= 0) return principal / (months || 1);
    const monthlyRate = annualRate / 100 / 12;
    const n = months;
    const pow = Math.pow(1 + monthlyRate, n);
    return principal * monthlyRate * pow / (pow - 1);
  }

  // --- 信用评分映射 ---
  const CREDIT_TIERS = {
    'poor':     { min: 300, max: 500, label: '较差' },
    'fair':     { min: 500, max: 600, label: '一般' },
    'good':     { min: 600, max: 700, label: '良好' },
    'excellent':{ min: 700, max: 900, label: '优秀' }
  };

  function getCreditTier(score) {
    if (score < 500) return 'poor';
    if (score < 600) return 'fair';
    if (score < 700) return 'good';
    return 'excellent';
  }

  // --- 核心匹配函数 ---
  function match(userProfile, products) {
    if (!userProfile || !products || !products.length) return [];

    // 按贷款对象类型过滤（个人/企业）
    const targetProducts = userProfile.loanTarget
      ? products.filter(p => p.targetType === userProfile.loanTarget)
      : products;

    const results = targetProducts.map(product => {
      return computeMatch(userProfile, product);
    });

    // 排序：eligible 在前，按分数降序；ineligible 在后，也按分数降序
    results.sort((a, b) => {
      if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
      return b.score - a.score;
    });

    return results;
  }

  function computeMatch(user, product) {
    let scoreCredit = 0, scoreIncome = 0, scoreEmploy = 0;
    let scoreAmount = 0, scorePurpose = 0, scoreDebt = 0, scoreExtras = 0;
    const disqualifiers = [];

    // --- 1. 信用评分匹配 (25%) ---
    const effectiveScore = user.creditScore || 0;
    if (effectiveScore <= 0) {
      // 未上传征信报告，信用分中性处理
      scoreCredit = 50;
      disqualifiers.push('未检测到信用评分，建议上传征信报告获取更精准匹配');
    } else if (effectiveScore >= product.minCreditScore) {
      const range = product.prefCreditScore - product.minCreditScore || 1;
      const ratio = Math.min(1, (effectiveScore - product.minCreditScore) / range);
      scoreCredit = 60 + ratio * 40;
    } else {
      scoreCredit = Math.max(0, (effectiveScore / product.minCreditScore) * 40);
      disqualifiers.push('信用评分低于产品最低要求（' + product.minCreditScore + '分）');
    }

    // --- 2. 收入匹配 (20%) ---
    // 企业用户用年营业额折算月均收入，个人用户直接用月收入
    const userMonthlyIncome = user.loanTarget === '企业'
      ? (user.annualRevenue || 0) * 10000 / 12
      : (user.monthlyIncome || 0);
    const estimatedMonthly = calcMonthlyPayment(user.loanAmount, product.interestRate, user.loanTerm);
    const requiredIncome = estimatedMonthly / product.maxDTI;
    if (userMonthlyIncome >= requiredIncome) {
      const ratio = Math.min(1, userMonthlyIncome / requiredIncome);
      scoreIncome = 70 + ratio * 30;
    } else {
      scoreIncome = Math.max(0, (userMonthlyIncome / requiredIncome) * 70);
    }

    // --- 3. 就业类型匹配 (15%) ---
    if (product.acceptedEmployment.includes(user.employmentType)) {
      scoreEmploy = 100;
    } else {
      scoreEmploy = 20;
      disqualifiers.push('就业类型不符合产品要求');
    }

    // --- 4. 金额匹配 (15%) ---
    if (user.loanAmount >= product.minAmount && user.loanAmount <= product.maxAmount) {
      scoreAmount = 100;
    } else if (user.loanAmount < product.minAmount) {
      const ratio = user.loanAmount / product.minAmount;
      scoreAmount = Math.max(0, ratio * 80);
      disqualifiers.push('贷款金额低于产品最低额度（¥' + (product.minAmount / 10000).toFixed(1) + '万）');
    } else {
      const ratio = product.maxAmount / user.loanAmount;
      scoreAmount = Math.max(0, ratio * 80);
      disqualifiers.push('贷款金额超出产品最高额度（¥' + (product.maxAmount / 10000).toFixed(1) + '万）');
    }

    // --- 5. 贷款用途匹配 (10%) ---
    if (product.supportedPurposes.includes(user.loanPurpose)) {
      scorePurpose = 100;
    } else {
      scorePurpose = 0;
      disqualifiers.push('该产品不支持「' + user.loanPurpose + '」用途');
    }

    // --- 6. 负债率检查 (10%) ---
    const projectedPayment = calcMonthlyPayment(user.loanAmount, product.interestRate, user.loanTerm);
    const totalDebt = (user.existingDebtMonthly || 0) + projectedPayment;
    const dti = userMonthlyIncome > 0 ? totalDebt / userMonthlyIncome : 1;
    if (dti <= product.maxDTI) {
      scoreDebt = 100;
    } else {
      scoreDebt = Math.max(0, 100 - (dti - product.maxDTI) * 200);
      if (dti > 0.7) {
        disqualifiers.push('月还款负担过重，建议降低贷款金额或延长期限');
      }
    }

    // --- 7. 加分项 (5%) ---
    if (user.hasSocialSecurity)  scoreExtras += 25;
    if (user.hasHousingFund)     scoreExtras += 30;
    if (user.hasProperty)        scoreExtras += 25;
    if (user.hasCar)             scoreExtras += 20;

    // --- 8. 特殊条件检查 ---
    if (product.requiresSocialSecurity && !user.hasSocialSecurity) {
      disqualifiers.push('该产品要求缴纳社保');
    }
    if (product.requiresHousingFund && !user.hasHousingFund) {
      disqualifiers.push('该产品要求缴纳公积金');
    }

    // --- 加权计算 ---
    const finalScore = Math.round(
      scoreCredit * WEIGHTS.creditScore +
      scoreIncome * WEIGHTS.income +
      scoreEmploy * WEIGHTS.employment +
      scoreAmount * WEIGHTS.loanAmount +
      scorePurpose * WEIGHTS.loanPurpose +
      scoreDebt   * WEIGHTS.debtBurden +
      scoreExtras * WEIGHTS.extras
    );

    return {
      productId: product.id,
      score: finalScore,
      isEligible: disqualifiers.length === 0,
      disqualifiers: disqualifiers,
      estimatedMonthlyPayment: Math.round(projectedPayment),
      matchDetails: {
        creditMatch: Math.round(scoreCredit),
        incomeMatch: Math.round(scoreIncome),
        employMatch: Math.round(scoreEmploy),
        amountMatch: Math.round(scoreAmount),
        purposeMatch: Math.round(scorePurpose),
        debtMatch: Math.round(scoreDebt)
      },
      product: product
    };
  }

  // --- 更新权重（高级用户可调整） ---
  function updateWeights(newWeights) {
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > 0.01) {
      console.warn('权重总和应为1，当前:', total);
    }
    Object.assign(WEIGHTS, newWeights);
  }

  // --- 导出 ---
  return {
    match: match,
    calcMonthlyPayment: calcMonthlyPayment,
    getCreditTier: getCreditTier,
    CREDIT_TIERS: CREDIT_TIERS,
    updateWeights: updateWeights
  };

})();
