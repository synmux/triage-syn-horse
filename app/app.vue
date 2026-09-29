<script lang="ts" setup>
  import { useAppLifecycle } from "~/composables/use-app-lifecycle";

  useAppLifecycle();
</script>

<template>
  <NuxtPwaAssets />
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <ToastHost />
</template>
