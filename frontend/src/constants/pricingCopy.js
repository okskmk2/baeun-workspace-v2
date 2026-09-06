const ko = {
  header: {
    headline: "사용한 만큼만 매달 결제합니다.",
    subLines: [
      "정해진 요금제는 없습니다.",
      "워크스페이스마다 저장 공간 5GB가 포함되며, 초과분은 1GB당 월 $0.10입니다.",
    ],
    cta: "시작하기",
  },

  slotCards: {
    title: "추가할 수 있는 항목입니다.",
    unitLabel: "/ 월",
    buy: "결제하기",
    items: [
      {
        key: "workspace",
        name: "워크스페이스",
        description: "팀 공간을 하나 엽니다. 게시판과 멤버 관리가 포함됩니다.",
      },
      {
        key: "project",
        name: "프로젝트",
        description: "업무 공간을 하나 엽니다. 위키, 칸반, 채널, 데이터를 사용합니다.",
      },
      {
        key: "member",
        name: "멤버",
        description: "해당 워크스페이스에 구성원 한 명을 초대합니다.",
      },
    ],
  },

  storage: {
    name: "저장 공간",
    description: "워크스페이스마다 5GB가 포함됩니다. 초과분은 1GB당 월 $0.10입니다.",
    included: "기본 5GB / 워크스페이스",
  },

  calculator: {
    title: "예상 금액을 계산해 보세요.",
    subtitle: "실제 결제는 장바구니에서 확정됩니다.",
    sliders: {
      workspaces: { label: "워크스페이스 수", unit: "개" },
      projects: { label: "프로젝트 수", unit: "개" },
      members: { label: "멤버 수", unit: "명" },
      storage: { label: "워크스페이스당 사용량", unit: "GB" },
    },
    directInput: "직접 입력",
    breakdown: {
      workspaceLabel: "워크스페이스",
      projectLabel: "프로젝트",
      memberLabel: "멤버",
      storageLabel: "저장 공간",
      totalLabel: "합계",
      countDetail: (total, billable) => `${total}개 중 ${billable}개 결제`,
      memberDetail: (total, billable) => `${total}명 중 ${billable}명 결제`,
      storageDetail: (extraGb) => `초과 ${extraGb}GB`,
    },
    perMonthSuffix: "/ 월",
    withinAllowance: {
      title: "시작 한도 안입니다.",
      subtitle: "지금은 결제하지 않습니다.",
    },
    cta: "시작하기",
    transitionNotice: "시작 한도를 넘었습니다. 넘는 항목만 결제됩니다.",
  },

  faq: {
    title: "자주 묻는 질문",
    items: [
      {
        q: "정해진 요금제가 있나요?",
        a: ["없습니다. 필요한 항목만 매달 결제합니다."],
      },
      {
        q: "멤버는 계정 전체에 적용되나요?",
        a: ["아닙니다. 워크스페이스마다 따로 필요합니다."],
      },
      {
        q: "저장 공간 5GB는 모든 팀을 합친 용량인가요?",
        a: ["아닙니다. 워크스페이스마다 5GB입니다. 남은 용량을 다른 팀으로 옮길 수 없습니다."],
      },
      {
        q: "한도를 넘으면 파일이 삭제되나요?",
        a: ["삭제하지 않습니다. 새로 만드는 작업만 제한됩니다."],
      },
      {
        q: "다른 날에 슬롯을 더 사면 결제일이 합쳐지나요?",
        a: [
          "아닙니다. 나중에 산 자리는 새 구독이라 결제일이 따로 갑니다.",
          "같은 장바구니에서 한 번에 산 수량만 결제일이 같습니다.",
        ],
      },
      {
        q: "Polar 포털에서 구독 수량을 바꿔도 되나요?",
        a: [
          "카드와 영수증만 쓰세요. 슬롯을 늘리려면 스토어에서 새로 구매하세요.",
          "Polar에서 기존 구독 수량을 올리면 결제일이 합쳐져 남은 날짜를 잃을 수 있습니다.",
        ],
      },
      {
        q: "가입하면 바로 결제하나요?",
        a: ["시작 한도 안이면 결제하지 않습니다. 워크스페이스 1개, 프로젝트 3개, 멤버 5명까지는 바로 시작할 수 있습니다."],
      },
    ],
  },
};

const en = {
  header: {
    headline: "Pay each month only for what you use.",
    subLines: [
      "There is no fixed plan.",
      "Each workspace includes 5 GB. Extra storage is $0.10 per GB each month.",
    ],
    cta: "Get started",
  },

  slotCards: {
    title: "These are the items you can add.",
    unitLabel: "/ mo",
    buy: "Buy",
    items: [
      {
        key: "workspace",
        name: "Workspace",
        description: "Opens one team space, including boards and member management.",
      },
      {
        key: "project",
        name: "Project",
        description: "Opens one work space for wiki, kanban, channel, and data.",
      },
      {
        key: "member",
        name: "Member",
        description: "Invites one person to that workspace.",
      },
    ],
  },

  storage: {
    name: "Storage",
    description: "Each workspace includes 5 GB. Extra storage is $0.10 per GB each month.",
    included: "5 GB included per workspace",
  },

  calculator: {
    title: "Estimate this month’s amount.",
    subtitle: "Checkout is confirmed in the cart.",
    sliders: {
      workspaces: { label: "Workspaces", unit: "" },
      projects: { label: "Projects", unit: "" },
      members: { label: "Members", unit: "" },
      storage: { label: "Usage per workspace", unit: "GB" },
    },
    directInput: "Type a number",
    breakdown: {
      workspaceLabel: "Workspaces",
      projectLabel: "Projects",
      memberLabel: "Members",
      storageLabel: "Storage",
      totalLabel: "Total",
      countDetail: (total, billable) => `${billable} of ${total} billed`,
      memberDetail: (total, billable) => `${billable} of ${total} billed`,
      storageDetail: (extraGb) => `${extraGb} GB extra`,
    },
    perMonthSuffix: "/ mo",
    withinAllowance: {
      title: "You are inside the starting allowance.",
      subtitle: "Nothing is billed yet.",
    },
    cta: "Get started",
    transitionNotice: "You crossed the starting allowance. Only extra items are billed.",
  },

  faq: {
    title: "Questions",
    items: [
      {
        q: "Is there a fixed plan?",
        a: ["No. You pay each month only for the items you need."],
      },
      {
        q: "Does a member seat apply to the whole account?",
        a: ["No. Each workspace needs its own seats."],
      },
      {
        q: "Is the 5 GB shared across every team?",
        a: ["No. Each workspace has 5 GB. Unused space cannot move to another team."],
      },
      {
        q: "If I go over, are files deleted?",
        a: ["No. Existing files stay. New creates are limited."],
      },
      {
        q: "If I buy more slots on another day, do billing dates merge?",
        a: [
          "No. Slots you buy later start a new subscription with its own billing date.",
          "Only quantity bought in the same checkout shares a billing date.",
        ],
      },
      {
        q: "Can I change subscription quantity on Polar?",
        a: [
          "Use Polar for cards and receipts only. To add slots, buy a new subscription in the store.",
          "Raising quantity on an existing Polar subscription can merge billing dates and you may lose remaining days.",
        ],
      },
      {
        q: "Do I pay as soon as I sign up?",
        a: ["Not if you stay inside the starting allowance: 1 workspace, 3 projects, and 5 members."],
      },
    ],
  },
};

export const pricingCopyByLocale = { ko, en };

export function getPricingCopy(locale) {
  return pricingCopyByLocale[locale] ?? ko;
}

export const pricingCopy = ko;
