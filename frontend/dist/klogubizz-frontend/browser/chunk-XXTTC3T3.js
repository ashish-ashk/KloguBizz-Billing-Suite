import {
  DomSanitizer
} from "./chunk-AGABJEXX.js";
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
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵqueryAdvance,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵresolveDocument,
  ɵɵrestoreView,
  ɵɵsanitizeHtml,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵviewQuerySignal
} from "./chunk-KLA3EWNB.js";

// src/app/shared/icons.ts
var ICONS = {
  menu: `<path d="M4 6h16M4 12h16M4 18h16"/>`,
  chevronLeft: `<path d="m15 18-6-6 6-6"/>`,
  chevronRight: `<path d="m9 18 6-6-6-6"/>`,
  chevronDown: `<path d="m6 9 6 6 6-6"/>`,
  dashboard: `<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>`,
  invoice: `<path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 15.5h5M8.5 9.5h3"/>`,
  calculator: `<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><circle cx="8" cy="11.5" r="1"/><circle cx="12" cy="11.5" r="1"/><circle cx="16" cy="11.5" r="1"/><circle cx="8" cy="15.5" r="1"/><circle cx="12" cy="15.5" r="1"/><circle cx="16" cy="15.5" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  creditCard: `<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>`,
  chart: `<path d="M3 3v16a2 2 0 0 0 2 2h16"/><rect x="7" y="12" width="3" height="6" rx="0.75"/><rect x="12.5" y="8" width="3" height="10" rx="0.75"/><rect x="18" y="5" width="3" height="13" rx="0.75"/>`,
  shieldUser: `<path d="M12 2 4.5 5v6c0 5 3.15 7.9 7.5 9 4.35-1.1 7.5-4 7.5-9V5L12 2Z"/><circle cx="12" cy="10" r="2"/><path d="M9 15.2a3 3 0 0 1 6 0"/>`,
  package: `<path d="M21 8.5 12 3.5 3 8.5v7l9 5 9-5v-7Z"/><path d="M3 8.5l9 5 9-5"/><path d="M12 21v-7.5"/><path d="M16.5 6 7.5 11"/>`,
  palette: `<path d="M12 2a10 10 0 1 0 3.2 19.5 2.3 2.3 0 0 0 1.2-3.7 1.9 1.9 0 0 1 1.4-3.1H19a3 3 0 0 0 3-3c0-5.2-4.5-9.7-10-9.7Z"/><circle cx="7.3" cy="10.8" r="1.15"/><circle cx="10.6" cy="7.2" r="1.15"/><circle cx="15.2" cy="8.4" r="1.15"/><circle cx="16.6" cy="12.8" r="1.15"/>`,
  template: `<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18"/><path d="M9 21V9"/>`,
  shield: `<path d="M12 2 4.5 5v6c0 5 3.15 7.9 7.5 9 4.35-1.1 7.5-4 7.5-9V5L12 2Z"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>`,
  sun: `<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>`,
  moon: `<path d="M20.5 13.4A8.6 8.6 0 1 1 10.6 3.5a7 7 0 0 0 9.9 9.9Z"/>`,
  user: `<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>`,
  x: `<path d="M18 6 6 18M6 6l12 12"/>`,
  search: `<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>`,
  cornerDownLeft: `<path d="M9 10 4 15l5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>`
};
var IconComponent = class _IconComponent {
  sanitizer = inject(DomSanitizer);
  name = input.required();
  size = input(18);
  strokeWidth = input(2);
  svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] || ""));
  static \u0275fac = function IconComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _IconComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _IconComponent, selectors: [["app-icon"]], inputs: { name: [1, "name"], size: [1, "size"], strokeWidth: [1, "strokeWidth"] }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 1, vars: 4, consts: [["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-linecap", "round", "stroke-linejoin", "round", 3, "innerHTML"]], template: function IconComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275namespaceSVG();
      \u0275\u0275element(0, "svg", 0);
    }
    if (rf & 2) {
      \u0275\u0275property("innerHTML", ctx.svg(), \u0275\u0275sanitizeHtml);
      \u0275\u0275attribute("width", ctx.size())("height", ctx.size())("stroke-width", ctx.strokeWidth());
    }
  }, styles: ["\n\n[_nghost-%COMP%] {\n  display: inline-flex;\n  line-height: 0;\n  flex-shrink: 0;\n}\n/*# sourceMappingURL=icons.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(IconComponent, { className: "IconComponent", filePath: "src\\app\\shared\\icons.ts", lineNumber: 41 });
})();

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
  IconComponent,
  QuickSearchComponent
};
//# sourceMappingURL=chunk-XXTTC3T3.js.map
