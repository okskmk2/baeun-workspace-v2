<template>
  <main class="cart container">
    <hgroup>
      <div>
        <h1>장바구니</h1>
        <p class="subtitle">선택한 상품이 담겼습니다. 수량을 정한 뒤 결제를 진행해 주세요.</p>
      </div>
    </hgroup>

    <section class="cart-card" aria-label="선택 상품">
      <figure class="cart-card__media" aria-hidden="true">
        <img :src="selectedProduct.image" :alt="selectedProduct.name" loading="lazy" />
      </figure>

      <div class="cart-card__body">
        <header class="cart-card__head">
          <h2>{{ selectedProduct.name }}</h2>
          <span class="billing-badge">{{ billingPlan.label }}</span>
        </header>

        <div class="quantity-box" role="group" aria-label="수량 조절">
          <p>수량</p>
          <div class="qty-stepper">
            <button type="button" class="qty-btn" @click="decrease" :disabled="quantity <= 1">
              -
            </button>
            <strong class="qty-value">{{ quantity }}</strong>
            <button type="button" class="qty-btn" @click="increase">+</button>
          </div>
        </div>

        <dl class="summary-list">
          <div class="summary-row">
            <dt>상품 코드</dt>
            <dd>{{ productCode }}</dd>
          </div>
          <div class="summary-row">
            <dt>단가</dt>
            <dd>{{ formatAmount(unitPrice) }}</dd>
          </div>
          <div class="summary-row summary-row--total">
            <dt>결제 금액</dt>
            <dd>{{ formatAmount(totalAmount) }}</dd>
          </div>
        </dl>

        <button type="button" class="btn checkout-btn" @click="checkout">결제하기</button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { addToast } from "../../lib/toast";

const route = useRoute();

const productCatalog = {
  WORKSPACE: {
    name: "워크스페이스 슬롯",
    price: 10,
    image: "/assets/card_office.png",
  },
  WORKSPACEMEMBER: {
    name: "멤버 슬롯",
    price: 1,
    image: "/assets/card_member.png",
  },
  PROJECT: {
    name: "프로젝트 슬롯",
    price: 3,
    image: "/assets/card_team.png",
  },
};

const billingCatalog = {
  MONTHLY: { label: "월간 구독", multiplier: 1 },
  YEARLY: { label: "연간 구독", multiplier: 0.85 },
  LIFETIME: { label: "영구 사용권", multiplier: 36 },
};

const rawProductCode = computed(() => {
  const code = route.query.productCode;
  return Array.isArray(code) ? code[0] : code;
});

const parsedProductCode = computed(() => {
  const fallback = {
    productKey: "WORKSPACE",
    billingKey: "MONTHLY",
    year: new Date().getFullYear(),
  };

  if (!rawProductCode.value || typeof rawProductCode.value !== "string") return fallback;

  const parts = rawProductCode.value.split("_");
  if (parts.length < 3) return fallback;

  const yearPart = parts.at(-1);
  const billingPart = parts.at(-2);
  const productPart = parts.slice(0, -2).join("_");

  const parsedYear = Number(yearPart);
  const resolvedYear = Number.isNaN(parsedYear) ? fallback.year : parsedYear;

  return {
    productKey: productCatalog[productPart] ? productPart : fallback.productKey,
    billingKey: billingCatalog[billingPart] ? billingPart : fallback.billingKey,
    year: resolvedYear,
  };
});

const quantity = ref(1);

const selectedProduct = computed(() => productCatalog[parsedProductCode.value.productKey]);
const billingPlan = computed(() => billingCatalog[parsedProductCode.value.billingKey]);

const unitPrice = computed(() => selectedProduct.value.price * billingPlan.value.multiplier);
const totalAmount = computed(() => unitPrice.value * quantity.value);

const productCode = computed(() => {
  const { productKey, billingKey, year } = parsedProductCode.value;
  return `${productKey}_${billingKey}_${year}`;
});

const increase = () => {
  quantity.value += 1;
};

const decrease = () => {
  if (quantity.value <= 1) return;
  quantity.value -= 1;
};

const checkout = () => {
  addToast({
    message: `${selectedProduct.value.name} ${quantity.value}개 결제는 와이어프레임입니다.`,
    type: "info",
  });
};

const formatAmount = (value) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
</script>

<style scoped>
.cart {
  display: grid;
  gap: 18px;
}

.cart-hero {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-card-bg);
  padding: 18px;
}

.cart-hero h1 {
  margin: 0;
  font-size: clamp(var(--font-size-title-md), 3vw, var(--font-size-title-lg));
  line-height: var(--line-height-tight);
}

.cart-hero p {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-body);
}

.cart-card {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-card-bg);
  padding: 16px;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}

.cart-card__media {
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
}

.cart-card__media img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 220px;
  object-fit: cover;
}

.cart-card__body {
  display: grid;
  gap: 14px;
  align-content: start;
}

.cart-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cart-card__head h2 {
  margin: 0;
  font-size: var(--font-size-title-md);
}

.billing-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  padding: 0 12px;
  font-size: var(--font-size-caption);
  font-weight: 700;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-page-bg));
}

.quantity-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quantity-box p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-label);
}

.qty-stepper {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.qty-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.qty-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.qty-value {
  min-width: 24px;
  text-align: center;
  font-size: var(--font-size-title-sm);
  line-height: 1;
}

.summary-list {
  margin: 0;
  display: grid;
  gap: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.summary-row dt,
.summary-row dd {
  margin: 0;
  font-size: var(--font-size-label);
}

.summary-row dt {
  color: var(--color-text-muted);
}

.summary-row dd {
  font-weight: 600;
}

.summary-row--total {
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}

.summary-row--total dd {
  font-size: var(--font-size-title-sm);
}

.checkout-btn {
  width: fit-content;
  min-width: 168px;
  min-height: 38px;
  padding-inline: 20px;
  align-self: end;
  background: var(--color-accent);
  color: var(--color-text-inverse);
}

@media (max-width: 840px) {
  .cart-card {
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .cart-card__media img {
    min-height: 180px;
  }

  .checkout-btn {
    width: 100%;
    align-self: stretch;
  }
}
</style>
