/**
 * @desc    로그인 여부를 확인하는 미들웨어
 */
export const isAuth = (req, res, next) => {
  // 세션에 userId가 저장되어 있는지 확인
  if (req.session && req.session.userId) {
    next(); // 인증 성공: 다음 미들웨어나 컨트롤러로 이동
  } else {
    res.status(401).json({
      success: false,
      message: "로그인이 필요한 서비스입니다.",
    });
  }
};

/**
 * @desc    이미 로그인한 사용자인지 확인 (로그인/회원가입 페이지 접근 제한용)
 */
export const isGuest = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    next();
  } else {
    res.status(400).json({
      success: false,
      message: "이미 로그인된 상태입니다.",
    });
  }
};
