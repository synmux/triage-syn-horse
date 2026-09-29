<script lang="ts" setup>
  import { useAppLifecycle } from "~/composables/use-app-lifecycle";

  useAppLifecycle();
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <ToastHost />
</template>
