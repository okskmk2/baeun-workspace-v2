<template>
  <main class="store">
    <section class="store-hero">
      <div>
        <p class="store-hero__eyebrow">{{ t("store.hero.eyebrow") }}</p>
        <h1>{{ t("store.hero.title") }}</h1>
        <p class="store-hero__subtitle">{{ t("store.hero.subtitle") }}</p>
      </div>
      <div class="store-hero__actions">
        <router-link class="btn" to="/signup">{{ t("store.hero.primaryCta") }}</router-link>
        <button class="btn btn--secondary" type="button">{{ t("store.hero.secondaryCta") }}</button>
      </div>
    </section>

    <section class="plans">
      <div v-for="group in planGroups" :key="group.id" class="plan-group">
        <div class="plan-group__header">
          <div>
            <h2>{{ group.title }}</h2>
            <p>{{ group.description }}</p>
          </div>
        </div>
        <div class="plan-grid">
          <article v-for="plan in group.plans" :key="plan.name" class="plan-card">
            <div class="plan-card__header">
              <h3>{{ plan.name }}</h3>
              <span v-if="plan.badge" class="plan-badge">{{ plan.badge }}</span>
            </div>
            <p class="plan-card__price">{{ plan.price }}</p>
            <p class="plan-card__period">{{ plan.period }}</p>
            <ul class="plan-card__list">
              <li v-for="item in plan.includes" :key="item">{{ item }}</li>
            </ul>
            <button class="btn btn--secondary" type="button">
              {{ t("store.actions.select") }}
            </button>
          </article>
        </div>
      </div>
    </section>

    <section class="store-details">
      <div class="detail-card">
        <h2>구매 정책 요약</h2>
        <ul class="detail-list">
          <li><strong>판매 라이선스:</strong> 워크스페이스, 프로젝트, 워크스페이스 멤버</li>
          <li><strong>기본 월 요금 (USD):</strong> 워크스페이스 $10 / 프로젝트 $3 / 멤버 $2</li>
          <li><strong>기본 결제:</strong> 모든 라이선스는 월 단위 구매</li>
          <li><strong>연간 결제:</strong> 월 요금 기준 연간 구매 시 <strong>10% 할인</strong></li>
          <li><strong>영구 사용권:</strong> <strong>3년치 금액</strong>을 한 번에 결제</li>
          <li><strong>스토리지:</strong> 종량제 과금 ($1 / 10GB, 사용량 기준)</li>
        </ul>
      </div>

      <div class="detail-card">
        <h2>라이선스 관리</h2>
        <p class="detail-note">
          구매한 라이선스와 스토리지 사용량은 사용자 설정 화면에서 관리할 수 있습니다.
        </p>
        <router-link class="btn" to="/settings">사용자 설정에서 관리하기</router-link>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const planGroups = computed(() => [
  {
    id: "workspace",
    title: "워크스페이스 라이선스",
    description: "워크스페이스 기본 운영 단위",
    plans: [
      {
        name: "월간 (USD)",
        price: "$10",
        period: "워크스페이스 / 월",
        includes: ["기본 운영 단위", "월 단위 자동 갱신", "사용자 설정에서 관리"],
      },
      {
        name: "연간 (USD)",
        price: "$108",
        period: "월 기준 10% 할인 적용",
        badge: "추천",
        includes: ["12개월 선결제", "월 결제 대비 10% 절감", "중앙 결제 관리"],
      },
      {
        name: "영구 (USD)",
        price: "$360",
        period: "3년치 선결제로 영구 사용",
        includes: ["초기 비용 확정", "장기 운영 팀에 유리", "설정 화면에서 상태 확인"],
      },
    ],
  },
  {
    id: "project",
    title: "프로젝트 라이선스",
    description: "프로젝트 단위 확장 비용",
    plans: [
      {
        name: "월간 (USD)",
        price: "$3",
        period: "프로젝트 / 월",
        includes: ["프로젝트별 과금", "필요 수량만 추가", "월 단위 조정 가능"],
      },
      {
        name: "연간 (USD)",
        price: "$32.40",
        period: "월 기준 10% 할인 적용",
        includes: ["12개월 선결제", "예산 계획 수립 용이", "운영비 절감"],
      },
      {
        name: "영구 (USD)",
        price: "$108",
        period: "3년치 선결제로 영구 사용",
        includes: ["장기 프로젝트 최적", "갱신 관리 부담 감소", "설정 화면에서 수량 관리"],
      },
    ],
  },
  {
    id: "member",
    title: "워크스페이스 멤버 라이선스",
    description: "참여 인원 기준 과금",
    plans: [
      {
        name: "월간 (USD)",
        price: "$2",
        period: "멤버 / 월",
        includes: ["활성 멤버 기준", "팀 규모에 맞춰 증감", "월 단위 관리"],
      },
      {
        name: "연간 (USD)",
        price: "$21.60",
        period: "월 기준 10% 할인 적용",
        includes: ["12개월 선결제", "대규모 팀 비용 절감", "회계 처리 단순화"],
      },
      {
        name: "영구 (USD)",
        price: "$72",
        period: "3년치 선결제로 영구 사용",
        includes: ["핵심 멤버 장기 운영", "예산 고정", "설정 화면에서 좌석 관리"],
      },
    ],
  },
]);
</script>

<style scoped>
.store {
  display: flex;
  flex-direction: column;
  gap: 40px;
  color: var(--dl-text);
}

.store-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  border-radius: 18px;
  border: 1px solid var(--dl-border);
  background: linear-gradient(135deg, var(--color-accent-soft, rgba(37,99,235,0.12)), transparent 60%);
}

.store-hero__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--dl-text-muted);
}

.store-hero h1 {
  margin: 0 0 10px;
  font-size: clamp(26px, 3.6vw, 38px);
}

.store-hero__subtitle {
  margin: 0;
  color: var(--dl-text-muted);
  max-width: 520px;
}

.store-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.plans {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.plan-group__header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.plan-group__header p {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 14px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.plan-card {
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.plan-card__header h3 {
  margin: 0;
  font-size: 16px;
}

.plan-badge {
  padding: 6px 12px;
  border-radius: 999px;
  background-color: var(--color-accent-soft, rgba(37,99,235,0.12));
  color: var(--color-text);
  font-size: 12px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--color-accent) 10%, #fff);
}

.plan-card__price {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--color-accent);
}

.plan-card__period {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 12px;
}

.plan-card__list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--dl-text);
}

.plan-card{transition:box-shadow .18s ease, transform .12s ease}
.plan-card:hover{transform:translateY(-6px);box-shadow:0 18px 30px color-mix(in srgb,var(--color-accent)8%,#0000)}

.store-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.detail-card {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-surface);
}

.detail-card h2 {
  margin: 0 0 14px;
  font-size: 18px;
}

.detail-steps {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 12px;
  color: var(--dl-text);
}

.detail-steps h3 {
  margin: 0 0 4px;
  font-size: 14px;
}

.detail-steps p {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 13px;
}

.detail-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--dl-text);
  font-size: 13px;
}

.pricing-ex{margin-top:12px;padding:12px;border-radius:10px;background:linear-gradient(180deg,var(--color-accent-soft, rgba(37,99,235,0.06)),transparent);border:1px solid color-mix(in srgb,var(--color-accent)8%,#fff)}
.pricing-ex h3{margin:0 0 8px;font-size:14px}
.pricing-ex p{margin:0 0 8px;color:var(--dl-text-muted)}
.pricing-ex ul{margin:0;padding-left:18px}
.pricing-ex strong{color:var(--color-accent)}

@media (max-width: 720px) {
  .store-hero {
    padding: 20px;
  }
}
</style>
