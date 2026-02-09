<template>
  <div class="DefaultLayout">
    <header>
      <router-link class="brand" to="/">Baeun Workspace</router-link>
      <nav class="mainnav">
        <router-link to="/">Overview</router-link>
        <router-link to="/store">Store</router-link>
      </nav>
      <nav class="utilnav">
        <router-link to="/signup">Sign up</router-link>
        <router-link to="/login">Login</router-link>
        <router-link to="/account">계정</router-link>
      </nav>
    </header>
    <router-view></router-view>
  </div>
</template>
