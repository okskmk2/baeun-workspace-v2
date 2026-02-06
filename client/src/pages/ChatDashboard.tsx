import { useParams } from "@solidjs/router";

function ChatDashboard() {
  const params = useParams();

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1 class="page-header-info">💬 Chat</h1>
          <p>좌측의 대화방을 선택하세요.</p>
        </div>
      </header>

      <section class="empty-state-container">
        <div class="empty-state">
          <p>대화방을 선택하여 채팅을 시작하세요.</p>
          <p class="text-light">또는 좌측 "대화방 생성" 버튼으로 새 대화방을 만들 수 있습니다.</p>
        </div>
      </section>
    </div>
  );
}

export default ChatDashboard;
