<template>
  <div class="DefaultLayout">
    <header>
      <router-link class="brand" to="/">Baeun Workspace</router-link>
      <nav class="mainnav">
        <router-link to="/">소개</router-link>
        <router-link to="/store">스토어</router-link>
      </nav>
      <nav class="utilnav">
        <router-link to="/signup">회원가입</router-link>
        <router-link to="/login">로그인</router-link>
        <router-link to="/account">계정</router-link>
      </nav>
    </header>
    <router-view></router-view>
  </div>
</template>
