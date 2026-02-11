/**
 * 주어진 객체, 배열 또는 스네이크 케이스 문자열 내부의 모든 스네이크 케이스 키 또는 문자열 자체를 카멜 케이스로 변환합니다.
 * - 입력 문자열이 대문자 스네이크 케이스이더라도, 결과는 표준 카멜 케이스(첫 글자 소문자)가 됩니다.
 *
 * @param {any} obj - 변환할 객체, 배열, 스네이크 케이스 문자열 또는 원시 값
 * @returns {any} 변환된 객체, 배열, 카멜 케이스 문자열 또는 원시 값
 */
export function convertSnakeToCamel(obj) {
  // 1. obj가 배열인 경우, 각 요소를 재귀적으로 변환
  if (Array.isArray(obj)) {
    return obj.map((item) => convertSnakeToCamel(item));
  }
  // 2. obj가 문자열인 경우, 문자열 자체를 변환 (대소문자 무관하게 표준 카멜 케이스로)
  else if (typeof obj === "string") {
    const lowercased = obj.toLowerCase(); // 전체를 소문자로 먼저 변환
    return lowercased.replace(/([_][a-z])/g, ($1) => {
      // 언더스코어 뒤 문자열을 대문자로
      return $1.toUpperCase().replace("_", "");
    });
  }
  // 3. obj가 객체인 경우, 키를 변환하고 값도 재귀적으로 변환
  else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      // 키 자체도 스네이크 케이스일 수 있으므로 변환
      const camelKey = key.replace(/([_][a-z])/gi, ($1) => {
        // 키는 원래 대소문자를 유지하면서 변환
        return $1.toUpperCase().replace("_", "");
      });
      acc[camelKey] = convertSnakeToCamel(obj[key]); // 값도 재귀적으로 변환
      return acc;
    }, {});
  }
  // 4. 그 외의 원시 값(숫자, 불리언, null, undefined)인 경우, 그대로 반환
  return obj;
}
