// 2PL Item Response Theory adaptive testing engine for EMS exams
// Each item has parameters: difficulty (b) and discrimination (a)

export function probabilityCorrect(theta, a, b) {
  const D = 1.7; // scaling constant
  return 1 / (1 + Math.exp(-D * a * (theta - b)));
}

export function itemInformation(theta, a, b) {
  const p = probabilityCorrect(theta, a, b);
  return a * a * p * (1 - p);
}

export function updateTheta(theta, a, b, response, step = 0.01) {
  // Newton-Raphson estimation
  for (let i = 0; i < 5; i++) {
    const p = probabilityCorrect(theta, a, b);
    const q = 1 - p;
    const derivative = a * (response - p);
    const info = a * a * p * q;
    theta = theta + derivative / info;
  }
  return theta;
}

export function selectNextQuestion(theta, bank, asked) {
  let best = null;
  let maxInfo = -Infinity;
  for (const item of bank) {
    if (asked.has(item.id)) continue;
    const info = itemInformation(theta, item.discrimination, item.difficulty);
    if (info > maxInfo) {
      maxInfo = info;
      best = item;
    }
  }
  return best;
}

