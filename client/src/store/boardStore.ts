import { createStore } from "solid-js/store";
import type { Board } from "../lib/types";

interface BoardState {
  boards: { [projectId: string]: Board[] };
}

const [boardState, setBoardState] = createStore<BoardState>({
  boards: {},
});

/**
 * 프로젝트의 보드 목록 설정
 */
export const setBoardsForProject = (projectId: string, boards: Board[]) => {
  setBoardState("boards", projectId, boards);
};

/**
 * 프로젝트에 새 보드 추가
 */
export const addBoard = (projectId: string, board: Board) => {
  setBoardState("boards", projectId, (prev) => (prev ? [...prev, board] : [board]));
};

/**
 * 프로젝트의 보드 목록 조회
 */
export const getBoardsForProject = (projectId: string): Board[] => {
  return boardState.boards[projectId] || [];
};

/**
 * 전체 보드 상태 조회
 */
export const getBoardState = () => boardState;

export default boardState;
