<template>
  <main class="store container">
    <header class="store-header">
      <h1 class="store-header__title">슬롯 스토어</h1>
      <p class="store-header__sub">필요한 만큼 슬롯을 추가하여 조직의 규모를 확장하세요.</p>
      <p class="store-header__link">
        슬롯 단가와 무료 한도가 궁금하신가요?
        <router-link to="/pricing">요금제 안내 보기</router-link>
      </p>
    </header>

    <div class="store-billing">
      <BillingCycleToggle v-model="billingCycle" />
      <p v-if="billingCycle === 'yearly'" class="store-billing__badge">
        {{ copy.billingToggle.yearlySelectedBadge }}
      </p>
    </div>

    <section class="slot-grid" aria-label="상품 결제 선택">
      <article v-for="item in slotItems" :key="item.key" class="slot-card">
        <h2 class="slot-card__name">{{ item.name }}</h2>
        <p class="slot-card__desc">{{ item.description }}</p>

        <p class="slot-card__price">
          <strong class="slot-card__amount">{{ item.formattedPrice }}</strong>
          <span class="slot-card__unit">/ {{ periodLabel }}</span>
        </p>

        <button type="button" class="btn slot-card__button" @click="goToCart(item)">결제하기</button>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { PRICE, YEARLY_DISCOUNT } from "../../constants/pricing";
import { usePricingCopy } from "../../composables/usePricingCopy";
import { formatSlotPrice } from "../../utils/currency";
import BillingCycleToggle from "./pricing/BillingCycleToggle.vue";

const router = useRouter();
const { copy } = usePricingCopy();

const CODE_NAMES = {
  workspace: "WORKSPACE",
  project: "PROJECT",
  member: "WORKSPACEMEMBER",
};

const billingCycle = ref("monthly");

const periodLabel = computed(() => (billingCycle.value === "yearly" ? "월 (연간 결제)" : "월"));

const slotItems = computed(() => {
  const multiplier = billingCycle.value === "yearly" ? 1 - YEARLY_DISCOUNT : 1;

  return copy.value.slotCards.items.map((item) => ({
    ...item,
    codeName: CODE_NAMES[item.key],
    formattedPrice: formatSlotPrice(PRICE[item.key] * multiplier),
  }));
});

const buildProductCode = (item) => {
  const billingCode = billingCycle.value.toUpperCase();
  const year = new Date().getFullYear();
  return `${item.codeName}_${billingCode}_${year}`;
};

const goToCart = (item) => {
  router.push({
    path: "/store/cart",
    query: {
      productCode: buildProductCode(item),
    },
  });
};
</script>

<style scoped>
.store {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding-block: var(--space-8);
}

.store-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}

.store-header__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.store-header__sub {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.store-header__link {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.store-header__link a {
  color: var(--color-accent);
}

.store-billing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.store-billing > :deep(.billing-toggle) {
  width: min(100%, 360px);
}

.store-billing__badge {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-accent);
}

.slot-grid {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
}

.slot-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-7) var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.slot-card__name {
  margin: 0;
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-text);
}

.slot-card__desc {
  margin: 0;
  flex: 1;
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.slot-card__price {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.slot-card__amount {
  font-size: var(--text-price);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.slot-card__unit {
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.slot-card__button {
  margin-top: var(--space-1);
  width: 100%;
  min-height: 44px;
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  font-weight: 600;
}

@media (max-width: 1023px) {
  .slot-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .store-header__title {
    font-size: var(--text-h2);
  }
}
</style>
