import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { getPricingCopy } from "../constants/pricingCopy";

export function usePricingCopy() {
  const { locale } = useI18n();
  const copy = computed(() => getPricingCopy(locale.value));
  return { copy };
}
