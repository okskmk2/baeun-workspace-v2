const ko = {
  header: {
    headline: "쓰지 않는 자리에 돈을 내지 마세요.",
    subLines: [
      "대부분의 협업 툴은 사람 수로 값을 매깁니다.",
      "바은은 필요한 슬롯만 조립합니다.",
    ],
  },

  billingToggle: {
    monthlyLabel: "월간",
    yearlyLabel: "연간",
    yearlyBadge: "15% 할인",
    yearlySelectedBadge: "연간 결제 시 15% 할인",
    ariaLabel: "결제 주기 선택",
  },

  slotCards: {
    title: "세 개의 슬롯. 그게 전부입니다.",
    unitLabel: "/ 월",
    items: [
      {
        key: "workspace",
        name: "워크스페이스 슬롯",
        description: "회사나 팀을 담는 독립된 공간 하나.",
      },
      {
        key: "project",
        name: "프로젝트 슬롯",
        description: "위키, 작업보드, 채널, 데이터가 함께 있는 작업 공간 하나.",
      },
      {
        key: "member",
        name: "멤버 슬롯",
        description: "편집 권한을 가진 구성원 한 명. 게스트는 무료입니다.",
      },
    ],
  },

  freeTier: {
    title: "여기까지는 무료입니다.",
    items: [
      "워크스페이스 1개",
      "프로젝트 3개",
      "멤버 5명",
      "게스트 무제한 — 읽기와 댓글은 언제나 무료",
      "저장 공간 2GB",
      "최근 90일 기록 열람",
    ],
    note: "카드 없이 시작합니다. 팀이 커지면 넘은 만큼만 결제됩니다.",
    cta: "무료로 시작하기",
  },

  calculator: {
    title: "필요한 만큼의 값.",
    subtitle: "숨겨진 비용은 없습니다.",
    sliders: {
      workspaces: { label: "워크스페이스 수", unit: "개" },
      projects: { label: "프로젝트 수", unit: "개" },
      members: { label: "멤버 수", unit: "명" },
    },
    directInput: "직접 입력",
    breakdown: {
      workspaceLabel: "워크스페이스",
      projectLabel: "프로젝트",
      memberLabel: "멤버",
      totalLabel: "합계",
      countDetail: (total, billable) => `${total}개 중 ${billable}개 유료`,
      memberDetail: (total, billable) => `${total}명 중 ${billable}명 유료`,
    },
    perMonthSuffix: "/ 월",
    yearlyNote: (yearlyTotal) => `연 ${yearlyTotal} 일시 결제 · 15% 절약`,
    freeState: {
      title: "무료입니다.",
      subtitle: "지금 바로 시작하세요.",
      cta: "무료로 시작하기",
    },
    paidCta: "이 구성으로 시작하기",
    transitionNotice: "무료 한도를 넘었습니다. 넘은 만큼만 청구됩니다.",
  },

  business: {
    title: "조직에서 필요한 기능.",
    pricePrefix: "워크스페이스당 +",
    plans: [
      {
        key: "business",
        name: "Business",
        features: [
          "SSO (SAML · OIDC)",
          "SCIM 자동 계정 관리",
          "감사 로그",
          "데이터 보존 정책 설정",
          "무제한 기록 열람",
          "도메인 통합 관리",
        ],
        cta: "Business 시작하기",
      },
      {
        key: "enterprise",
        name: "Enterprise",
        priceLabel: "별도 협의",
        features: [
          "전용 인스턴스 및 온프레미스 구축",
          "데이터 리전 선택",
          "SLA 보장 및 전담 지원",
          "조직 단위 통합 대시보드",
          "보안 심사 및 계약 지원",
        ],
      },
    ],
  },

  trust: {
    ariaLabel: "데이터 신뢰 안내",
    lines: [
      "문서와 대화는 AI 학습에 쓰이지 않습니다.",
      "데이터는 언제나 당신의 것입니다.",
    ],
  },

  faq: {
    title: "자주 묻는 질문",
    items: [
      {
        q: "무료로 계속 쓸 수 있나요?",
        a: [
          "네. 무료 한도 안에서는 기한 없이 쓸 수 있습니다.",
          "위키, 작업보드, 채널, 데이터 — 핵심 기능은 무료에서도 전부 열려 있습니다.",
        ],
      },
      {
        q: "게스트는 정말 무료인가요?",
        a: [
          "읽기와 댓글 권한을 가진 게스트는 인원 제한 없이 무료입니다.",
          "문서를 만들거나 태스크를 수정하려면 멤버 슬롯이 필요합니다.",
        ],
      },
      {
        q: "한도를 넘으면 어떻게 되나요?",
        a: ["갑자기 잠기지 않습니다. 초과한 슬롯만큼만 다음 결제일에 추가됩니다."],
      },
      {
        q: "슬롯을 줄일 수 있나요?",
        a: ["언제든 가능합니다. 프로젝트가 끝나면 슬롯을 반납하고, 그만큼 청구가 줄어듭니다."],
      },
      {
        q: "저장 공간과 기록은 어떻게 되나요?",
        a: [
          "무료는 저장 공간 2GB, 최근 90일 기록입니다.",
          "Business는 기록을 기한 없이 열람할 수 있습니다.",
        ],
      },
      {
        q: "왜 인당 과금이 아닌가요?",
        a: ["조직마다 필요한 것이 다르기 때문입니다.", "사람은 적고 프로젝트가 많은 팀도, 그 반대인 팀도 있습니다."],
      },
      {
        q: "기존 툴에서 옮겨올 수 있나요?",
        a: ["임포트 도구를 제공합니다. 문서, 태스크, 대화 기록을 그대로 가져옵니다."],
      },
    ],
  },

  close: {
    headline: "필요한 만큼만 시작하세요.",
    cta: "무료로 시작하기",
  },
};

const en = {
  header: {
    headline: "Don't pay for a seat you don't use.",
    subLines: [
      "Most collaboration tools charge by headcount.",
      "Baeun assembles only the slots you need.",
    ],
  },

  billingToggle: {
    monthlyLabel: "Monthly",
    yearlyLabel: "Yearly",
    yearlyBadge: "15% off",
    yearlySelectedBadge: "15% off with yearly billing",
    ariaLabel: "Billing cycle",
  },

  slotCards: {
    title: "Three slots. That is all.",
    unitLabel: "/ mo",
    items: [
      {
        key: "workspace",
        name: "Workspace slot",
        description: "One independent space for a company or a team.",
      },
      {
        key: "project",
        name: "Project slot",
        description: "One place for wiki, board, channel, and data.",
      },
      {
        key: "member",
        name: "Member slot",
        description: "One member with edit rights. Guests are free.",
      },
    ],
  },

  freeTier: {
    title: "This far is free.",
    items: [
      "1 workspace",
      "3 projects",
      "5 members",
      "Unlimited guests — read and comment stay free",
      "2 GB storage",
      "90 days of history",
    ],
    note: "Start without a card. When the team grows, you pay only for what you cross.",
    cta: "Start for free",
  },

  calculator: {
    title: "The price of what you need.",
    subtitle: "There are no hidden costs.",
    sliders: {
      workspaces: { label: "Workspaces", unit: "" },
      projects: { label: "Projects", unit: "" },
      members: { label: "Members", unit: "" },
    },
    directInput: "Type a number",
    breakdown: {
      workspaceLabel: "Workspaces",
      projectLabel: "Projects",
      memberLabel: "Members",
      totalLabel: "Total",
      countDetail: (total, billable) => `${billable} of ${total} paid`,
      memberDetail: (total, billable) => `${billable} of ${total} paid`,
    },
    perMonthSuffix: "/ mo",
    yearlyNote: (yearlyTotal) => `${yearlyTotal} billed yearly · 15% off`,
    freeState: {
      title: "It's free.",
      subtitle: "Start now.",
      cta: "Start for free",
    },
    paidCta: "Start with this setup",
    transitionNotice: "You've crossed the free limit. Only the extra slots are billed.",
  },

  business: {
    title: "Features an organization needs.",
    pricePrefix: "+",
    priceSuffix: " per workspace",
    plans: [
      {
        key: "business",
        name: "Business",
        features: [
          "SSO (SAML · OIDC)",
          "SCIM provisioning",
          "Audit log",
          "Retention policy",
          "Unlimited history",
          "Domain management",
        ],
        cta: "Start Business",
      },
      {
        key: "enterprise",
        name: "Enterprise",
        priceLabel: "Let's talk",
        features: [
          "Dedicated instance or on-prem",
          "Data region choice",
          "SLA and dedicated support",
          "Org-wide dashboard",
          "Security review and contracting",
        ],
      },
    ],
  },

  trust: {
    ariaLabel: "Data trust",
    lines: [
      "Documents and conversations are not used to train AI.",
      "The data is always yours.",
    ],
  },

  faq: {
    title: "Questions",
    items: [
      {
        q: "Can I stay on the free plan?",
        a: [
          "Yes. Inside the free limits, there is no time cap.",
          "Wiki, board, channel, data — the core is open on free.",
        ],
      },
      {
        q: "Are guests really free?",
        a: [
          "Guests who can read and comment are free, with no seat limit.",
          "Creating pages or editing tasks needs a member slot.",
        ],
      },
      {
        q: "What happens if I go over?",
        a: ["Nothing locks. Only the extra slots are added on the next bill."],
      },
      {
        q: "Can I drop slots?",
        a: ["Whenever you want. When a project ends, return the slot. The bill shrinks with it."],
      },
      {
        q: "What about storage and history?",
        a: [
          "Free includes 2 GB and 90 days of history.",
          "Business can read history with no time cap.",
        ],
      },
      {
        q: "Why not charge per person?",
        a: [
          "Teams need different things.",
          "Some have few people and many projects. Some, the reverse.",
        ],
      },
      {
        q: "Can I bring work from other tools?",
        a: ["Import tools are available. Docs, tasks, and talk come over as they are."],
      },
    ],
  },

  close: {
    headline: "Start with only what you need.",
    cta: "Start for free",
  },
};

export const pricingCopyByLocale = { ko, en };

export function getPricingCopy(locale) {
  return pricingCopyByLocale[locale] ?? ko;
}

export const pricingCopy = ko;
