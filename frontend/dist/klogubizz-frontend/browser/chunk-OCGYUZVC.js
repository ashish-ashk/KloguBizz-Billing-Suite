import {
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵqueryAdvance,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵresolveDocument,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵviewQuerySignal
} from "./chunk-6VNHH65J.js";

// src/app/shared/item-picker.component.ts
var _c0 = ["inputEl"];
var _forTrack0 = ($index, $item) => $item._id;
function ItemPickerComponent_Conditional_3_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 7);
    \u0275\u0275listener("click", function ItemPickerComponent_Conditional_3_For_2_Template_button_click_0_listener() {
      const it_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.pick(it_r3));
    })("mouseenter", function ItemPickerComponent_Conditional_3_For_2_Template_button_mouseenter_0_listener() {
      const \u0275$index_8_r5 = \u0275\u0275restoreView(_r2).$index;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.activeIndex.set(\u0275$index_8_r5));
    });
    \u0275\u0275elementStart(1, "span", 8)(2, "span", 9);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 10);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "span", 11);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const it_r3 = ctx.$implicit;
    const \u0275$index_8_r5 = ctx.$index;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("active", \u0275$index_8_r5 === ctx_r3.activeIndex());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(it_r3.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(it_r3.itemCode || it_r3.hsn || "");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.fmtRate(it_r3));
  }
}
function ItemPickerComponent_Conditional_3_ForEmpty_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 6);
    \u0275\u0275text(1, "No matching items \u2014 keep typing to enter free text.");
    \u0275\u0275elementEnd();
  }
}
function ItemPickerComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275repeaterCreate(1, ItemPickerComponent_Conditional_3_For_2_Template, 8, 5, "button", 5, _forTrack0, false, ItemPickerComponent_Conditional_3_ForEmpty_3_Template, 2, 0, "div", 6);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const pos_r6 = ctx;
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("top", pos_r6.top, "px")("left", pos_r6.left, "px")("width", pos_r6.width, "px");
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r3.filtered());
  }
}
var ItemPickerComponent = class _ItemPickerComponent {
  items = input.required();
  placeholder = input("Service or product description");
  value = model("");
  picked = output();
  host = inject(ElementRef);
  activeIndex = signal(0);
  dropdownOpen = signal(false);
  dropdownPos = signal(null);
  inputRef = viewChild("inputEl");
  reposition = () => {
    const el = this.inputRef()?.nativeElement;
    if (!el)
      return;
    const rect = el.getBoundingClientRect();
    this.dropdownPos.set({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260) });
  };
  constructor() {
    window.addEventListener("scroll", this.reposition, true);
    window.addEventListener("resize", this.reposition);
  }
  ngOnDestroy() {
    window.removeEventListener("scroll", this.reposition, true);
    window.removeEventListener("resize", this.reposition);
  }
  filtered = computed(() => {
    const q = this.value().toLowerCase().trim();
    const list = this.items();
    const matches = !q ? list : list.filter((it) => (it.name || "").toLowerCase().includes(q) || (it.itemCode || "").toLowerCase().includes(q) || (it.hsn || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q));
    return matches.slice(0, 8);
  });
  fmtRate(it) {
    return "\u20B9" + (it.sellingPrice ?? 0);
  }
  onFocus() {
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
    this.reposition();
  }
  onInput(e) {
    this.value.set(e.target.value);
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
    this.reposition();
  }
  onKeydown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.dropdownOpen.set(true);
      this.activeIndex.update((i) => Math.min(i + 1, this.filtered().length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activeIndex.update((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const it = this.filtered()[this.activeIndex()];
      if (it) {
        e.preventDefault();
        this.pick(it);
      }
    } else if (e.key === "Escape") {
      this.close();
    }
  }
  pick(it) {
    this.value.set(it.name);
    this.picked.emit(it);
    this.close();
  }
  close() {
    this.dropdownOpen.set(false);
  }
  onDocClick(e) {
    if (!this.host.nativeElement.contains(e.target))
      this.close();
  }
  static \u0275fac = function ItemPickerComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ItemPickerComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ItemPickerComponent, selectors: [["app-item-picker"]], viewQuery: function ItemPickerComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuerySignal(ctx.inputRef, _c0, 5);
    }
    if (rf & 2) {
      \u0275\u0275queryAdvance();
    }
  }, hostBindings: function ItemPickerComponent_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("click", function ItemPickerComponent_click_HostBindingHandler($event) {
        return ctx.onDocClick($event);
      }, false, \u0275\u0275resolveDocument);
    }
  }, inputs: { items: [1, "items"], placeholder: [1, "placeholder"], value: [1, "value"] }, outputs: { value: "valueChange", picked: "picked" }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 4, vars: 5, consts: [["inputEl", ""], [1, "item-picker"], ["type", "text", "autocomplete", "off", 1, "input", 3, "input", "focus", "keydown", "placeholder", "value"], [1, "item-picker-dropdown", 3, "top", "left", "width"], [1, "item-picker-dropdown"], ["type", "button", 1, "cmdk-item", 3, "active"], [1, "cmdk-empty"], ["type", "button", 1, "cmdk-item", 3, "click", "mouseenter"], [1, "cmdk-item-label"], [2, "font-weight", "600"], [1, "muted", 2, "margin-left", "6px", "font-size", "11.5px"], [1, "muted", 2, "font-size", "11.5px"]], template: function ItemPickerComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1)(1, "input", 2, 0);
      \u0275\u0275listener("input", function ItemPickerComponent_Template_input_input_1_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onInput($event));
      })("focus", function ItemPickerComponent_Template_input_focus_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onFocus());
      })("keydown", function ItemPickerComponent_Template_input_keydown_1_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onKeydown($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(3, ItemPickerComponent_Conditional_3_Template, 4, 7, "div", 3);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_4_0;
      \u0275\u0275classProp("open", ctx.dropdownOpen());
      \u0275\u0275advance();
      \u0275\u0275property("placeholder", ctx.placeholder())("value", ctx.value());
      \u0275\u0275advance(2);
      \u0275\u0275conditional((tmp_4_0 = ctx.dropdownOpen() && ctx.dropdownPos()) ? 3 : -1, tmp_4_0);
    }
  }, styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  width: 100%;\n}\n.item-picker[_ngcontent-%COMP%] {\n  position: relative;\n}\n.item-picker-dropdown[_ngcontent-%COMP%] {\n  position: fixed;\n  min-width: 260px;\n  max-width: 420px;\n  max-height: 300px;\n  overflow-y: auto;\n  background: var(--card);\n  border: 1px solid var(--border);\n  border-radius: 12px;\n  box-shadow: var(--shadow-lg);\n  padding: 6px;\n  z-index: 1000;\n}\n.item-picker-dropdown[_ngcontent-%COMP%]   .cmdk-item[_ngcontent-%COMP%] {\n  width: 100%;\n  justify-content: space-between;\n}\n/*# sourceMappingURL=item-picker.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ItemPickerComponent, { className: "ItemPickerComponent", filePath: "src\\app\\shared\\item-picker.component.ts", lineNumber: 53 });
})();

export {
  ItemPickerComponent
};
//# sourceMappingURL=chunk-OCGYUZVC.js.map
