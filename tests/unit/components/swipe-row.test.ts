import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import SwipeRow from "~/components/swipe-row.vue";

const rowWidth = 390;

/** A row wrapping a button, with a real width (happy-dom has no layout). */
function mountRow(onClick = vi.fn()) {
  const wrapper = mount(SwipeRow, {
    attachTo: document.body,
    props: {
      leftAction: { label: "Decline", tone: "decline" },
      rightAction: { label: "Accept", tone: "accept" },
    },
    slots: {
      default: defineComponent({
        render: () => h("button", { onClick, type: "button" }, "Open"),
      }),
    },
  });
  // The suppression comments make the template root a fragment in
  // development, so find the row element rather than using wrapper.element.
  const row = wrapper.find(".swipe-row").element;
  Object.defineProperty(row, "offsetWidth", { value: rowWidth });
  return { onClick, row, wrapper };
}

const pointer = (type: string, clientX: number, clientY = 20) =>
  new PointerEvent(type, {
    bubbles: true,
    button: 0,
    clientX,
    clientY,
    isPrimary: true,
    pointerId: 1,
    pointerType: "touch",
  });

function drag(element: Element, fromX: number, toX: number) {
  element.dispatchEvent(pointer("pointerdown", fromX));
  for (let x = fromX; x !== toX; x += Math.sign(toX - fromX) * 10) {
    element.dispatchEvent(pointer("pointermove", x));
  }
  element.dispatchEvent(pointer("pointermove", toX));
  element.dispatchEvent(pointer("pointerup", toX));
}

beforeEach(() => {
  vi.useFakeTimers();
  // happy-dom lacks pointer capture; the component only needs it to exist.
  Element.prototype.setPointerCapture ??= () => undefined;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("SwipeRow", () => {
  it("commits a swipe that travels past 40% of the row", () => {
    const { row, wrapper } = mountRow();

    drag(row, 100, 300);
    vi.advanceTimersByTime(200);

    expect(wrapper.emitted("commit")).toEqual([["right"]]);
  });

  it("snaps back from a short drag without acting", () => {
    const { row, wrapper } = mountRow();

    drag(row, 100, 150);
    vi.advanceTimersByTime(1000);

    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("ignores swipes that start at the screen edge", () => {
    const { row, wrapper } = mountRow();

    drag(row, 10, 300);
    vi.advanceTimersByTime(200);

    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("does not swallow the next real tap after a drag that snapped back", async () => {
    const { onClick, row, wrapper } = mountRow();

    drag(row, 100, 150);
    const button = wrapper.find("button");
    button.element.dispatchEvent(pointer("pointerdown", 120));
    button.element.dispatchEvent(pointer("pointerup", 120));
    await button.trigger("click");

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
