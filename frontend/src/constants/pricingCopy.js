export const pricingCopy = {
  header: {
    headline: "쓰지 않는 자리에 돈을 내지 마세요.",
    subLines: [
      "대부분의 협업 툴은 사람 수로 값을 매깁니다.",
      "바은 워크스페이스는 필요한 만큼의 슬롯만 조립합니다.",
      "5명까지는, 무료입니다.",
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
    unitLabel: "per month",
    items: [
      {
        key: "workspace",
        name: "워크스페이스 슬롯",
        description: "독립된 조직 공간 하나. 회사, 팀, 또는 하나의 세계.",
      },
      {
        key: "project",
        name: "프로젝트 슬롯",
        description: "워크스페이스 안의 작업 공간 하나. 위키·작업보드·채널·데이터가 함께 들어옵니다.",
      },
      {
        key: "member",
        name: "멤버 슬롯",
        description: "편집 권한을 가진 구성원 한 명. 외부 게스트는 몇 명이든 무료입니다.",
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
    note: "신용카드 없이 시작합니다. 팀이 커지면, 그때 넘은 만큼만 결제됩니다.",
    cta: "무료로 시작하기",
  },

  calculator: {
    title: "우리 팀은 얼마일까요?",
    subtitle: "슬라이더를 움직여 보세요. 숨겨진 비용은 없습니다.",
    sliders: {
      workspaces: { label: "워크스페이스 수", unit: "개" },
      projects: { label: "프로젝트 수", unit: "개" },
      members: { label: "멤버 수", unit: "명" },
    },
    businessToggle: {
      label: "Business 애드온",
      description: "SSO · 감사 로그 등 조직 기능 추가",
    },
    breakdown: {
      workspaceLabel: "워크스페이스",
      projectLabel: "프로젝트",
      memberLabel: "멤버",
      businessLabel: "Business",
      totalLabel: "합계",
      countDetail: (total, billable) => `${total}개 중 ${billable}개 유료`,
      memberDetail: (total, billable) => `${total}명 중 ${billable}명 유료`,
      businessDetail: (workspaces) => `워크스페이스 ${workspaces}개`,
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
    title: "조직이 요구하는 것들",
    plans: [
      {
        key: "business",
        name: "Business",
        priceLabel: "워크스페이스당 +$50 per month",
        features: [
          "SSO (SAML · OIDC)",
          "SCIM 자동 계정 관리",
          "감사 로그(Audit Log)",
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
        cta: "영업팀에 문의하기",
      },
    ],
  },

  trust: {
    lines: ["귀사의 문서와 대화는 AI 학습에 사용되지 않습니다.", "데이터의 소유권은 언제나 고객에게 있습니다."],
  },

  faq: {
    title: "자주 묻는 질문",
    items: [
      {
        q: "무료로 계속 쓸 수 있나요?",
        a: [
          "네. 무료 한도 안에서는 기간 제한 없이 사용할 수 있습니다.",
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
        q: "왜 인당 과금이 아닌가요?",
        a: ["조직마다 필요한 것이 다르기 때문입니다.", "사람은 적고 프로젝트가 많은 팀도, 그 반대인 팀도 있습니다."],
      },
      {
        q: "기존 툴에서 옮겨올 수 있나요?",
        a: ["임포트 도구를 제공합니다. 문서, 태스크, 대화 기록을 그대로 가져옵니다."],
      },
    ],
  },
};
