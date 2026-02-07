<template>
	<main class="board-home">
		<section class="summary">
			<div class="summary-card">
				<div class="summary-title">내 작업</div>
				<div class="summary-metrics">
					<div class="metric">
						<span class="metric-label">담당</span>
						<strong class="metric-value">8</strong>
					</div>
					<div class="metric">
						<span class="metric-label">리뷰</span>
						<strong class="metric-value">3</strong>
					</div>
					<div class="metric">
						<span class="metric-label">감시</span>
						<strong class="metric-value">12</strong>
					</div>
				</div>
			</div>
			<div class="summary-card sprint">
				<div class="summary-title">진행중 스프린트</div>
				<div class="sprint-name">Sprint 12 - Stability</div>
				<div class="sprint-meta">2026.02.03 - 2026.02.16</div>
				<button type="button" class="btn btn--secondary btn--sm">스프린트로 이동</button>
			</div>
		</section>

		<section class="activity">
			<header class="section-header">
				<h2>활동 피드</h2>
				<div class="section-actions">
					<button type="button" class="btn btn--ghost btn--sm">필터</button>
				</div>
			</header>

			<div class="feed">
				<div class="feed-group">
					<div class="feed-date">오늘</div>
					<article class="feed-item">
						<div class="feed-icon">S</div>
						<div class="feed-body">
							<div class="feed-title">"로그인 오류" 상태가 진행중으로 변경됨</div>
							<div class="feed-meta">이은성 · 10:32</div>
						</div>
					</article>
					<article class="feed-item">
						<div class="feed-icon">C</div>
						<div class="feed-body">
							<div class="feed-title">"권한 정책"에 새 코멘트</div>
							<div class="feed-meta">jojo · 09:10</div>
						</div>
					</article>
				</div>

				<div class="feed-group">
					<div class="feed-date">어제</div>
					<article class="feed-item">
						<div class="feed-icon">S</div>
						<div class="feed-body">
							<div class="feed-title">"알림 배치" 상태가 검토중으로 변경됨</div>
							<div class="feed-meta">mira · 18:42</div>
						</div>
					</article>
					<article class="feed-item">
						<div class="feed-icon">C</div>
						<div class="feed-body">
							<div class="feed-title">"빌드 파이프라인"에 새 코멘트</div>
							<div class="feed-meta">sojin · 15:20</div>
						</div>
					</article>
				</div>
			</div>
		</section>
	</main>
</template>

<style scoped>
.board-home {
	display: flex;
	flex-direction: column;
	gap: 24px;
	padding: 8px 0;
}

.summary {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;
}

.summary-card {
	border-radius: 16px;
	padding: 18px 20px;
	background: linear-gradient(135deg, #fef3c7, #fef9e7);
	border: 1px solid #fde68a;
}

.summary-card.sprint {
	background: linear-gradient(135deg, #e0f2fe, #f0f9ff);
	border-color: #bae6fd;
}

.summary-title {
	font-size: 13px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: #6b7280;
	margin-bottom: 10px;
}

.summary-metrics {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.metric {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px;
	border-radius: 12px;
	background: #ffffff;
	border: 1px solid #f3f4f6;
}

.metric-label {
	font-size: 12px;
	color: #6b7280;
}

.metric-value {
	font-size: 20px;
	color: #111827;
}

.sprint-name {
	font-size: 18px;
	font-weight: 600;
	color: #0f172a;
	margin-bottom: 4px;
}

.sprint-meta {
	font-size: 13px;
	color: #64748b;
	margin-bottom: 12px;
}

.activity {
	border-radius: 16px;
	background: #ffffff;
	border: 1px solid #e5e7eb;
	padding: 18px 20px;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.section-header h2 {
	margin: 0;
	font-size: 18px;
}

.feed {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.feed-group {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.feed-date {
	font-size: 12px;
	color: #6b7280;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.feed-item {
	display: grid;
	grid-template-columns: 28px 1fr;
	gap: 12px;
	padding: 12px;
	border-radius: 12px;
	background: #f9fafb;
	border: 1px solid #f3f4f6;
}

.feed-icon {
	width: 28px;
	height: 28px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #111827;
	color: #fff;
	font-size: 12px;
	font-weight: 700;
}

.feed-title {
	font-size: 14px;
	font-weight: 600;
	color: #111827;
}

.feed-meta {
	font-size: 12px;
	color: #6b7280;
	margin-top: 4px;
}

@media (max-width: 900px) {
	.summary {
		grid-template-columns: 1fr;
	}
}
</style>
