<template>
  <main class="store container">
    <hgroup>
      <div>
        <h1>슬롯 스토어</h1>
        <p class="subtitle">필요한 만큼 슬롯을 추가하여 조직의 규모를 확장하세요.</p>
      </div>
    </hgroup>

    <nav class="billing-switch" aria-label="결제 주기 선택">
      <button
        v-for="option in billingOptions"
        :key="option.key"
        type="button"
        class="billing-switch__item"
        :class="{ 'billing-switch__item--active': selectedBilling === option.key }"
        @click="selectedBilling = option.key"
      >
        <span>{{ option.label }}</span>
        <small v-if="option.badge">{{ option.badge }}</small>
      </button>
    </nav>

    <section class="slot-grid" aria-label="상품 결제 선택">
      <article v-for="item in slotItems" :key="item.key" class="slot-card">
        <figure class="slot-card__media" aria-hidden="true">
          <img :src="item.image" :alt="item.name" loading="lazy" />
        </figure>

        <h2>{{ item.name }}</h2>
        <p class="slot-card__desc">{{ item.description }}</p>

        <p class="slot-card__price">
          <strong>${{ formatAmount(unitPrice(item.price)) }}</strong>
          <span>/ {{ selectedBillingData.unit }}</span>
        </p>

        <button type="button" class="btn slot-card__button" @click="goToCart(item)">
          결제하기
        </button>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const slotItems = [
  {
    key: "workspace",
    name: "워크스페이스 슬롯",
    description: "독립된 조직 공간 생성",
    price: 10,
    image: "/assets/card_office2.png",
    codeName: "WORKSPACE",
  },
  {
    key: "member",
    name: "멤버 슬롯",
    description: "워크스페이스 멤버 초대",
    price: 1,
    image: "/assets/card_member2.png",
    codeName: "WORKSPACEMEMBER",
  },
  {
    key: "project",
    name: "프로젝트 슬롯",
    description: "협업 프로젝트 생성",
    price: 3,
    image: "/assets/card_team2.png",
    codeName: "PROJECT",
  },
];

const billingOptions = [
  { key: "monthly", label: "월간 구독", badge: "", multiplier: 1, unit: "월" },
  { key: "yearly", label: "연간 구독", badge: "15% 할인", multiplier: 0.85, unit: "월" },
  { key: "lifetime", label: "영구 사용권", badge: "3년치 일시불", multiplier: 36, unit: "일시불" },
];

const selectedBilling = ref("monthly");

const selectedBillingData = computed(
  () => billingOptions.find((option) => option.key === selectedBilling.value) || billingOptions[0]
);

const unitPrice = (basePrice) => basePrice * selectedBillingData.value.multiplier;

const buildProductCode = (item) => {
  const billingCode = selectedBilling.value.toUpperCase();
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

const formatAmount = (value) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
</script>

<style scoped>
.store {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.store-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.store-header h1 {
  margin: 0;
  font-size: clamp(var(--font-size-title-md), 3vw, var(--font-size-title-lg));
  line-height: var(--line-height-tight);
  letter-spacing: -0.01em;
  font-weight: 800;
}

.store-header p {
  margin: 0;
  font-size: var(--font-size-body);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-muted);
}

.billing-switch {
  width: min(100%, 560px);
  margin-inline: auto;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 999px;
  padding: 4px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.billing-switch__item {
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text);
  min-height: 40px;
  font-weight: 600;
  font-size: var(--font-size-label);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.billing-switch__item small {
  font-size: var(--font-size-caption);
  font-weight: 600;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-page-bg));
  border-radius: 999px;
  padding: 2px 9px;
}

/* .billing-switch__item:hover {
  background: var(--color-surface-alt);
} */

.billing-switch__item--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-text-inverse);
}

.billing-switch__item--active small {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-page-bg) 92%, white 8%);
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.slot-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-text) 8%, transparent);
  display: grid;
  gap: 10px;
}

.slot-card h2,
.slot-card__desc,
.slot-card__price {
  margin: 0;
}

.slot-card__media {
  margin: -8px -4px 2px;
  border-radius: 10px;
  overflow: hidden;
  /* background: color-mix(in srgb, var(--color-surface) 88%, white 12%); */
}

.slot-card__media img {
  display: block;
  width: 100%;
  object-fit: cover;
}

.slot-card h2 {
  font-size: var(--font-size-title-md);
  line-height: var(--line-height-tight);
  letter-spacing: -0.01em;
}

.slot-card__desc {
  font-size: var(--font-size-label);
  line-height: var(--line-height-body);
  color: var(--color-text-muted);
}

.slot-card__price {
  display: inline-flex;
  justify-content: center;
  align-items: flex-end;
  gap: 6px;
}

.slot-card__price strong {
  font-size: clamp(var(--font-size-title-md), 2.4vw, var(--font-size-title-lg));
  line-height: 1;
  color: var(--color-text);
}

.slot-card__price span {
  font-size: var(--font-size-label);
  color: var(--color-text-muted);
}

.slot-card__button {
  margin-top: 6px;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  width: 100%;
  min-height: 38px;
  border-radius: 8px;
  font-size: var(--font-size-label);
  font-weight: 600;
  letter-spacing: -0.01em;
  padding: 8px 14px;
}

@media (max-width: 980px) {
  .slot-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .store {
    padding-block: 8px 20px;
    gap: 16px;
  }

  .store-header p {
    font-size: var(--font-size-label);
  }

  .store-header h1 {
    font-size: var(--font-size-title-md);
  }

  .billing-switch {
    grid-template-columns: 1fr;
    border-radius: 12px;
    width: 100%;
  }

  .billing-switch__item {
    justify-content: space-between;
    padding: 0 12px;
    border-radius: 10px;
  }

  .slot-card {
    padding: 16px 14px;
  }

  .slot-card__media img {
    height: 136px;
  }

  .slot-card h2 {
    font-size: var(--font-size-title-sm);
  }

  .slot-card__price strong {
    font-size: clamp(var(--font-size-title-sm), 8vw, var(--font-size-title-md));
  }

  .slot-card__button {
    min-height: 36px;
    font-size: var(--font-size-label);
  }
}
</style>
