import {
  EmptyStateComponent
} from "./chunk-OBVHAWX5.js";
import {
  computed,
  input,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-6VNHH65J.js";

// src/app/shared/bar-chart.component.ts
var _forTrack0 = ($index, $item) => $item.label;
function BarChartComponent_Conditional_0_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 2);
    \u0275\u0275element(1, "div", 3);
    \u0275\u0275elementStart(2, "div", 4);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const d_r1 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", ctx_r1.heightFor(d_r1.value), "%");
    \u0275\u0275property("title", ctx_r1.formatValue()(d_r1.value));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(d_r1.label);
  }
}
function BarChartComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 0);
    \u0275\u0275repeaterCreate(1, BarChartComponent_Conditional_0_For_2_Template, 4, 4, "div", 2, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.data());
  }
}
function BarChartComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 1);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("icon", ctx_r1.emptyIcon())("title", ctx_r1.emptyTitle())("message", ctx_r1.emptyMessage());
  }
}
var BarChartComponent = class _BarChartComponent {
  data = input.required();
  formatValue = input((v) => String(v));
  emptyIcon = input("\u25A4");
  emptyTitle = input("No data yet");
  emptyMessage = input("");
  max = computed(() => Math.max(...this.data().map((d) => d.value), 1));
  heightFor(v) {
    return Math.max(3, Math.round(v / this.max() * 100));
  }
  static \u0275fac = function BarChartComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _BarChartComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _BarChartComponent, selectors: [["app-bar-chart"]], inputs: { data: [1, "data"], formatValue: [1, "formatValue"], emptyIcon: [1, "emptyIcon"], emptyTitle: [1, "emptyTitle"], emptyMessage: [1, "emptyMessage"] }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 2, vars: 1, consts: [[1, "bar-chart"], [3, "icon", "title", "message"], [1, "bar-col"], [1, "bar", 3, "title"], [1, "bar-label"]], template: function BarChartComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, BarChartComponent_Conditional_0_Template, 3, 0, "div", 0)(1, BarChartComponent_Conditional_1_Template, 1, 3, "app-empty-state", 1);
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.data().length ? 0 : 1);
    }
  }, dependencies: [EmptyStateComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(BarChartComponent, { className: "BarChartComponent", filePath: "src\\app\\shared\\bar-chart.component.ts", lineNumber: 33 });
})();

export {
  BarChartComponent
};
//# sourceMappingURL=chunk-F3C2B2X2.js.map
