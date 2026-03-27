<template>
  <main class="store container">
    <section class="store-hero">
      <h1>쉽게 계산하고, 바로 선택하세요</h1>
      <p class="store-hero__subtitle">1. 슬롯 수 입력 2. 플랜 선택 3. 시작하기</p>
      <div class="store-hero__actions">
        <a class="btn" href="#calculator">계산 시작</a>
      </div>
    </section>

    <section id="calculator" class="section-card calculator">
      <div class="section-heading">
        <h2>1단계. 비용 계산</h2>
        <p>조직 규모를 입력하면 금액이 즉시 계산됩니다.</p>
      </div>

      <div class="calculator__body">
        <div class="calculator__controls">
          <label>
            워크스페이스 수
            <CountChip :count="ws" size="lg" />
          </label>
          <input v-model.number="ws" type="range" min="1" max="10" />

          <label>
            프로젝트 수
            <CountChip :count="proj" size="lg" />
          </label>
          <input v-model.number="proj" type="range" min="1" max="20" />

          <label>
            멤버 수
            <CountChip :count="mem" size="lg" />
          </label>
          <input v-model.number="mem" type="range" min="1" max="100" />

          <p class="calculator__hint">기본 단가: Workspace $10 / Project $3 / Member $2 (slot / month)</p>
        </div>

        <aside class="calculator__summary">
          <div class="summary-item">
            <Tag label="월간" variant="info" />
            <strong>${{ formatCurrency(monthlyTotal) }}</strong>
          </div>
          <div class="summary-item">
            <Tag label="연간 15% 할인" variant="success" />
            <strong>${{ formatCurrency(yearlyMonthlyEquivalent) }}/mo</strong>
            <small>연간 일시불 ${{ formatCurrency(yearlyTotal) }}</small>
          </div>
          <div class="summary-item summary-item--lifetime">
            <Tag label="영구 사용권" variant="warning" />
            <strong>${{ formatCurrency(lifetimeTotal) }}</strong>
            <small>월간 대비 36배 (3년치)</small>
          </div>
        </aside>
      </div>
    </section>

    <section class="section-card license">
      <div class="section-heading">
        <h2>2단계. 플랜 선택</h2>
        <p>팀 운영 방식에 맞는 플랜 하나만 고르세요.</p>
      </div>

      <div class="license-grid">
        <article
          v-for="tier in tiers"
          :key="tier.key"
          class="license-card"
          :class="[tier.tone, { 'license-card--active': selectedTier === tier.key }]"
          @click="selectedTier = tier.key"
        >
          <p class="license-card__kicker">{{ tier.kicker }}</p>
          <h3>{{ tier.name }}</h3>
          <p class="license-card__target">{{ tier.target }}</p>
          <ul>
            <li v-for="benefit in tier.benefits" :key="benefit">{{ benefit }}</li>
          </ul>
          <p class="license-card__price">{{ tier.price }}</p>
        </article>
      </div>

      <div class="license-action">
        <p>
          선택 플랜: <strong>{{ selectedTierData.name }}</strong>
        </p>
        <button class="btn" type="button">3단계. {{ selectedTierData.cta }}</button>
      </div>
    </section>

    <section class="section-card faq">
      <h2>FAQ</h2>
      <div class="faq-list">
        <details>
          <summary>슬롯은 매월 자동 조정 가능한가요?</summary>
          <p>월간 플랜은 수량을 언제든 조정할 수 있습니다.</p>
        </details>
        <details>
          <summary>연간 할인은 어디에 적용되나요?</summary>
          <p>워크스페이스, 프로젝트, 멤버 슬롯 라이선스에 15% 할인 적용됩니다.</p>
        </details>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import CountChip from "../../components/CountChip.vue";
import Tag from "../../components/Tag.vue";

const BASE_PRICES = {
  workspace: 10,
  project: 3,
  member: 2,
};

const ws = ref(2);
const proj = ref(14);
const mem = ref(64);

const monthlyTotal = computed(() => ws.value * BASE_PRICES.workspace + proj.value * BASE_PRICES.project + mem.value * BASE_PRICES.member);
const yearlyMonthlyEquivalent = computed(() => monthlyTotal.value * 0.85);
const yearlyTotal = computed(() => yearlyMonthlyEquivalent.value * 12);
const lifetimeTotal = computed(() => monthlyTotal.value * 36);

const tiers = [
  {
    key: "monthly",
    kicker: "Monthly",
    name: "월간 결제",
    target: "유연한 운영이 필요한 팀",
    benefits: ["언제든 해지 가능", "실시간 수량 조정", "단기 대응 최적"],
    price: "슬롯당 정가",
    cta: "바로 시작하기",
    tone: "license-card--monthly",
  },
  {
    key: "yearly",
    kicker: "Yearly",
    name: "연간 결제",
    target: "안정적 성장을 원하는 조직",
    benefits: ["15% 할인", "예산 계획 고정", "회계 단순화"],
    price: "슬롯당 15% DC",
    cta: "할인받고 시작하기",
    tone: "license-card--yearly",
  },
  {
    key: "lifetime",
    kicker: "Lifetime",
    name: "영구 사용권",
    target: "장기 운영에 유리",
    benefits: ["단 한 번 결제", "36배(3년치)", "장기 총비용 절감"],
    price: "월간 대비 36배",
    cta: "한정 수량 구매하기",
    tone: "license-card--lifetime",
  },
];

const selectedTier = ref("yearly");
const selectedTierData = computed(() => tiers.find((tier) => tier.key === selectedTier.value) || tiers[0]);

const formatCurrency = (value) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
</script>

<style scoped>
.store {
  display: flex;
  flex-direction: column;
  gap: 28px;
  color: var(--color-text);
}

.store-hero,
.section-card {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-card-bg);
}

.store-hero {
  padding: 32px;
  display: grid;
  gap: 16px;
  background: var(--color-card-bg);
}

.store-hero h1 {
  margin: 0;
  font-size: clamp(var(--font-size-title-lg), 5vw, var(--font-size-display));
  line-height: var(--line-height-tight);
}

.store-hero__subtitle {
  margin: 0;
  font-size: var(--font-size-body);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-muted);
}

.store-hero__actions {
  display: flex;
  gap: 12px;
}

.section-card {
  padding: 28px;
}

.section-heading h2 {
  margin: 0 0 8px;
  font-size: clamp(var(--font-size-title-md), 3vw, var(--font-size-title-lg));
}

.section-heading p {
  margin: 0;
  font-size: var(--font-size-body);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-muted);
}

.calculator {
  display: grid;
  gap: 20px;
}

.calculator__body {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 20px;
}

.calculator__controls {
  display: grid;
  gap: 14px;
}

.calculator__controls label {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  color: var(--color-text-muted);
}

.calculator__controls input[type="range"] {
  width: 100%;
}

.calculator__hint {
  margin: 10px 0 0;
  font-size: var(--font-size-label);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-muted);
}

.calculator__summary {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 14px;
  display: grid;
  gap: 12px;
  background: var(--color-card-bg);
}

.summary-item {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 14px;
  display: grid;
  gap: 4px;
}

.summary-item small {
  font-size: var(--font-size-label);
  line-height: var(--line-height-body);
  color: var(--color-text-muted);
}

.summary-item :deep(.tag) {
  width: fit-content;
  font-size: var(--font-size-label);
  line-height: var(--line-height-body);
}

.summary-item strong {
  font-size: clamp(var(--font-size-title-lg), 3.5vw, var(--font-size-display));
  line-height: var(--line-height-tight);
}

.summary-item--lifetime strong {
  color: var(--color-accent);
}

.license-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.license-card {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 18px;
  background: var(--color-card-bg);
  cursor: pointer;
}

.license-card--active {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.license-card__kicker,
.license-card__target,
.license-card__price,
.license-card h3,
.license-card ul {
  margin: 0;
}

.license-card__kicker {
  font-size: var(--font-size-label);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.license-card h3 {
  margin-top: 8px;
  font-size: var(--font-size-title-md);
  line-height: var(--line-height-tight);
}

.license-card__target {
  margin-top: 8px;
  font-size: var(--font-size-label);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-muted);
}

.license-card ul {
  margin-top: 14px;
  padding-left: 20px;
  font-size: var(--font-size-label);
  line-height: var(--line-height-relaxed);
  display: grid;
  gap: 6px;
}

.license-card__price {
  margin-top: 14px;
  font-size: var(--font-size-body);
  font-weight: 700;
}

.license-action {
  margin-top: 16px;
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.license-action p {
  margin: 0;
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}

.faq h2 {
  margin: 0 0 14px;
  font-size: var(--font-size-title-md);
}

.faq-list {
  display: grid;
  gap: 12px;
}

.faq-list details {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
}

.faq-list summary {
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}

.faq-list p {
  margin: 10px 0 0;
  font-size: var(--font-size-label);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-muted);
}

@media (max-width: 980px) {
  .calculator__body,
  .license-grid {
    grid-template-columns: 1fr;
  }

  .license-action {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .store {
    gap: 20px;
  }

  .store-hero,
  .section-card {
    padding: 20px;
  }

  .store-hero h1 {
    font-size: clamp(var(--font-size-title-md), 8vw, var(--font-size-display));
  }

  .section-heading h2,
  .faq h2 {
    font-size: var(--font-size-title-md);
  }
}
</style>
