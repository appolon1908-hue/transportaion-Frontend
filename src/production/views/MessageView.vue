<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    message: string;
    actionLabel?: string;
    actionTo?: string;
  }>(),
  {
    eyebrow: "Freight platform",
    actionLabel: "Return to dashboard",
    actionTo: "/",
  },
);
</script>

<template>
  <section class="page page-narrow message-page">
    <div class="message-icon" aria-hidden="true">!</div>
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1>{{ title }}</h1>
    <p class="page-intro">{{ message }}</p>
    <RouterLink class="button button-primary" :to="actionTo">
      {{ actionLabel }}
    </RouterLink>
  </section>
</template>
