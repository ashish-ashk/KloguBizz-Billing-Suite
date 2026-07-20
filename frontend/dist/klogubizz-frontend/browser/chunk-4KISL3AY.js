import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import {
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
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
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵviewQuerySignal
} from "./chunk-6VNHH65J.js";

// src/app/shared/quick-search.component.ts
var _c0 = ["inputEl"];
var _forTrack0 = ($index, $item) => $item.route;
function QuickSearchComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 4);
    \u0275\u0275text(1, "Ctrl K");
    \u0275\u0275elementEnd();
  }
}
function QuickSearchComponent_Conditional_5_For_2_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-icon", 12);
  }
  if (rf & 2) {
    \u0275\u0275property("size", 14);
  }
}
function QuickSearchComponent_Conditional_5_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 8);
    \u0275\u0275listener("click", function QuickSearchComponent_Conditional_5_For_2_Template_button_click_0_listener() {
      const item_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.go(item_r4));
    })("mouseenter", function QuickSearchComponent_Conditional_5_For_2_Template_button_mouseenter_0_listener() {
      const \u0275$index_14_r5 = \u0275\u0275restoreView(_r3).$index;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.activeIndex.set(\u0275$index_14_r5));
    });
    \u0275\u0275elementStart(1, "span", 9);
    \u0275\u0275element(2, "app-icon", 10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 11);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, QuickSearchComponent_Conditional_5_For_2_Conditional_5_Template, 1, 1, "app-icon", 12);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r4 = ctx.$implicit;
    const \u0275$index_14_r5 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("active", \u0275$index_14_r5 === ctx_r1.activeIndex());
    \u0275\u0275advance(2);
    \u0275\u0275property("name", item_r4.icon)("size", 16);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r4.label);
    \u0275\u0275advance();
    \u0275\u0275conditional(\u0275$index_14_r5 === ctx_r1.activeIndex() ? 5 : -1);
  }
}
function QuickSearchComponent_Conditional_5_ForEmpty_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 7);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1('No matching pages for "', ctx_r1.query(), '"');
  }
}
function QuickSearchComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5);
    \u0275\u0275repeaterCreate(1, QuickSearchComponent_Conditional_5_For_2_Template, 6, 6, "button", 6, _forTrack0, false, QuickSearchComponent_Conditional_5_ForEmpty_3_Template, 2, 1, "div", 7);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.filtered());
  }
}
var QuickSearchComponent = class _QuickSearchComponent {
  items = input.required();
  navigate = output();
  host = inject(ElementRef);
  query = signal("");
  activeIndex = signal(0);
  dropdownOpen = signal(false);
  inputRef = viewChild("inputEl");
  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const list = this.items();
    if (!q)
      return list;
    return list.filter((i) => i.label.toLowerCase().includes(q));
  });
  focusInput() {
    this.inputRef()?.nativeElement.focus();
  }
  onFocus() {
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
  }
  onInput(e) {
    this.query.set(e.target.value);
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
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
      e.preventDefault();
      const item = this.filtered()[this.activeIndex()];
      if (item)
        this.go(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      this.inputRef()?.nativeElement.blur();
    }
  }
  go(item) {
    this.navigate.emit(item.route);
    this.close();
    this.inputRef()?.nativeElement.blur();
  }
  close() {
    this.dropdownOpen.set(false);
    this.query.set("");
  }
  onDocClick(e) {
    if (!this.host.nativeElement.contains(e.target))
      this.close();
  }
  static \u0275fac = function QuickSearchComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _QuickSearchComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _QuickSearchComponent, selectors: [["app-quick-search"]], viewQuery: function QuickSearchComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuerySignal(ctx.inputRef, _c0, 5);
    }
    if (rf & 2) {
      \u0275\u0275queryAdvance();
    }
  }, hostBindings: function QuickSearchComponent_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("click", function QuickSearchComponent_click_HostBindingHandler($event) {
        return ctx.onDocClick($event);
      }, false, \u0275\u0275resolveDocument);
    }
  }, inputs: { items: [1, "items"] }, outputs: { navigate: "navigate" }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 6, vars: 6, consts: [["inputEl", ""], [1, "qsearch"], ["name", "search", 1, "qsearch-icon", 3, "size"], ["type", "text", "placeholder", "Search or jump to\u2026", "autocomplete", "off", 1, "qsearch-input", 3, "input", "focus", "keydown", "value"], [1, "kbd", "qsearch-kbd"], [1, "qsearch-dropdown"], ["type", "button", 1, "cmdk-item", 3, "active"], [1, "cmdk-empty"], ["type", "button", 1, "cmdk-item", 3, "click", "mouseenter"], [1, "cmdk-item-icon"], [3, "name", "size"], [1, "cmdk-item-label"], ["name", "cornerDownLeft", 1, "cmdk-item-enter", 3, "size"]], template: function QuickSearchComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1);
      \u0275\u0275element(1, "app-icon", 2);
      \u0275\u0275elementStart(2, "input", 3, 0);
      \u0275\u0275listener("input", function QuickSearchComponent_Template_input_input_2_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onInput($event));
      })("focus", function QuickSearchComponent_Template_input_focus_2_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onFocus());
      })("keydown", function QuickSearchComponent_Template_input_keydown_2_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onKeydown($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(4, QuickSearchComponent_Conditional_4_Template, 2, 0, "span", 4)(5, QuickSearchComponent_Conditional_5_Template, 4, 1, "div", 5);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classProp("open", ctx.dropdownOpen());
      \u0275\u0275advance();
      \u0275\u0275property("size", 15);
      \u0275\u0275advance();
      \u0275\u0275property("value", ctx.query());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(!ctx.dropdownOpen() || !ctx.query() ? 4 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.dropdownOpen() ? 5 : -1);
    }
  }, dependencies: [IconComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(QuickSearchComponent, { className: "QuickSearchComponent", filePath: "src\\app\\shared\\quick-search.component.ts", lineNumber: 43 });
})();

export {
  QuickSearchComponent
};
//# sourceMappingURL=chunk-4KISL3AY.js.map
