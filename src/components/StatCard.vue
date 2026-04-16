<template>
  <article class="stat-card">
    <span class="stat-card__eyebrow">{{ eyebrow }}</span>
    <strong class="stat-card__value">{{ value }}</strong>
    <p class="stat-card__label">{{ label }}</p>
  </article>
</template>

<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: "Metric"
  },
  value: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  }
});
</script>
