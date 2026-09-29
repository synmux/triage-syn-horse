/**
 * Without a working key, everything except Connect redirects there; with
 * one, Connect redirects to the queue.
 */
import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useSessionStore } from "~/stores/session";

export default defineNuxtRouteMiddleware((to) => {
  const connected = useSessionStore().status === "connected";
  if (to.path === "/connect") {
    return connected ? navigateTo("/") : undefined;
  }
  return connected ? undefined : navigateTo("/connect");
});
