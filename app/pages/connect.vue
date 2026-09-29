<script lang="ts" setup>
  import { computed, onMounted, ref } from "vue";
  import { navigateTo } from "#app";
  import { describeError } from "~/lib/linear/errors";
  import { useSessionStore } from "~/stores/session";

  const session = useSessionStore();
  const key = ref("");
  const connecting = ref(false);
  const errorMessage = ref<string | null>(null);
  const canPaste = ref(false);

  const rejected = computed(() => session.status === "invalid");

  onMounted(() => {
    canPaste.value = typeof navigator.clipboard?.readText === "function";
  });

  async function paste() {
    try {
      key.value = (await navigator.clipboard.readText()).trim();
      errorMessage.value = null;
    } catch {
      errorMessage.value =
        "Pasting was blocked. Long-press the field and choose Paste.";
    }
  }

  async function connect() {
    connecting.value = true;
    errorMessage.value = null;
    try {
      await session.connect(key.value);
      key.value = "";
      await navigateTo("/");
    } catch (failure) {
      errorMessage.value = describeError(failure);
    } finally {
      connecting.value = false;
    }
  }
</script>

<template>
  <main class="connect">
    <svg
      aria-hidden="true"
      class="mark"
      height="81"
      viewBox="136 104 240 304"
      width="64"
    >
      <rect class="tag" height="304" rx="30" width="240" x="136" y="104" />
      <circle class="hole" cx="256" cy="148" r="15" />
      <rect class="line" height="16" rx="8" width="152" x="176" y="196" />
      <rect class="line faint" height="16" rx="8" width="118" x="176" y="230" />
      <rect
        fill="var(--colour-decline-fill)"
        height="52"
        rx="9"
        width="36"
        x="156"
        y="334"
      />
      <rect
        fill="var(--colour-duplicate-fill)"
        height="52"
        rx="9"
        width="36"
        x="198"
        y="334"
      />
      <rect
        fill="var(--colour-snooze-fill)"
        height="52"
        rx="9"
        width="36"
        x="240"
        y="334"
      />
      <rect
        fill="var(--colour-accept-fill)"
        height="52"
        rx="9"
        width="74"
        x="282"
        y="334"
      />
    </svg>

    <h1>Connect Linear</h1>
    <p class="lede">
      Triage sorts your Linear triage queue from this phone. It talks to Linear
      directly with a personal API key, and the key never leaves this device.
    </p>

    <p class="notice" role="alert" v-if="rejected">
      Linear no longer accepts the saved key. Paste a new one to carry on.
    </p>

    <ol class="steps">
      <li>
        Open
        <a
          href="https://linear.app/settings/account/security"
          rel="noopener noreferrer"
          target="_blank"
          >Security &amp; access</a
        >
        in Linear's settings to find Personal API keys.
      </li>
      <li>Create a key with Read and Write access, and copy it.</li>
      <li>Paste it below.</li>
    </ol>

    <form class="form" @submit.prevent="connect">
      <label class="field-label" for="api-key">Personal API key</label>
      <div class="field">
        <input
          aria-describedby="key-error"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          enterkeyhint="go"
          id="api-key"
          inputmode="text"
          name="linear-api-key"
          placeholder="lin_api_…"
          spellcheck="false"
          type="password"
          v-model="key"
          :aria-invalid="errorMessage ? 'true' : undefined"
        >
        <button class="paste" type="button" v-if="canPaste" @click="paste">
          <AppIcon name="paste" :size="18" />
          Paste
        </button>
      </div>
      <p aria-live="polite" class="error" id="key-error">{{ errorMessage }}</p>
      <button
        class="connect-button"
        type="submit"
        :disabled="connecting || !key.trim()"
      >
        {{ connecting ? "Checking the key…" : "Connect" }}
      </button>
    </form>

    <p class="footnote">
      Added Triage to your Home Screen? Paste the key in the Home Screen app: it
      keeps its own storage, separate from Safari.
    </p>
  </main>
</template>

<style scoped>
  .connect {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 34rem;
    padding: calc(env(safe-area-inset-top) + var(--space-8)) var(--gutter-end)
      calc(env(safe-area-inset-bottom) + var(--space-8)) var(--gutter);
    margin: 0 auto;
  }
  .tag {
    fill: var(--colour-surface);
    stroke: var(--colour-line);
    stroke-width: 4;
  }
  .hole {
    fill: var(--colour-canvas);
  }
  .line {
    fill: var(--colour-ink-muted);
  }
  .line.faint {
    opacity: 0.5;
  }
  h1 {
    font-size: 2.1rem;
    font-weight: 750;
  }
  .lede {
    max-width: 30rem;
    color: var(--colour-ink-muted);
  }
  .notice {
    padding: var(--space-3) var(--space-4);
    font-weight: 600;
    color: var(--colour-decline);
    background: color-mix(
      in srgb,
      var(--colour-decline-fill) var(--tint-strength),
      var(--colour-surface)
    );
    border-radius: var(--radius-medium);
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-left: 1.4rem;
  }
  .steps a {
    color: var(--colour-focus);
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .field-label {
    font-weight: 650;
  }
  .field {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding: 0 var(--space-2) 0 var(--space-4);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: var(--radius-medium);
  }
  .field:focus-within {
    border-color: var(--colour-focus);
  }
  .field input {
    flex: 1;
    min-width: 0;
    min-height: 3.25rem;
    outline: none;
    background: none;
    border: 0;
  }
  .paste {
    display: inline-flex;
    gap: var(--space-1);
    align-items: center;
    min-height: 2.4rem;
    padding: 0 var(--space-3);
    font-size: 0.94rem;
    font-weight: 600;
    background: var(--colour-surface-raised);
    border-radius: var(--radius-small);
  }
  .error {
    min-height: 1.4em;
    font-size: 0.94rem;
    color: var(--colour-decline);
  }
  .connect-button {
    min-height: 3.25rem;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--colour-accept-on-fill);
    background: var(--colour-accept-fill);
    border-radius: var(--radius-medium);
  }
  .connect-button:disabled {
    color: var(--colour-ink-muted);
    background: var(--colour-surface-raised);
    opacity: 1;
  }
  .footnote {
    font-size: 0.88rem;
    color: var(--colour-ink-muted);
  }
</style>
