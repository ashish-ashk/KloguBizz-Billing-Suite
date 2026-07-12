import {
  AppShellComponent
} from "./chunk-NTKKMEPP.js";
import "./chunk-XXTTC3T3.js";
import "./chunk-D76BFOPY.js";
import {
  EmptyStateComponent,
  ModalComponent,
  PillComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  fmtDate,
  fmtINR
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import "./chunk-AGABJEXX.js";
import {
  CommonModule,
  computed,
  forkJoin,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-KLA3EWNB.js";

// src/app/features/subscription/subscription.component.ts
var _forTrack0 = ($index, $item) => $item.code;
function SubscriptionComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 8);
    \u0275\u0275element(1, "app-skeleton-rows", 9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 10);
    \u0275\u0275element(3, "app-skeleton-rows", 9);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 3);
    \u0275\u0275advance(2);
    \u0275\u0275property("count", 4);
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" \xB7 ", ctx_r1.fmtINR(ctx_r1.bannerPrice(), true), "/", ctx_r1.subCycle() === "yearly" ? "yr" : "mo", "");
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_Conditional_51_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 33);
    \u0275\u0275text(1, "Save 17%");
    \u0275\u0275elementEnd();
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 42);
    \u0275\u0275text(1, "Current Plan");
    \u0275\u0275elementEnd();
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 43);
    \u0275\u0275text(1, "Most Popular");
    \u0275\u0275elementEnd();
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1, "Custom");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const plan_r3 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275styleProp("color", ctx_r1.priceColor(plan_r3.code));
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 54);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const plan_r3 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275styleProp("color", ctx_r1.priceColor(plan_r3.code));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(ctx_r1.priceFor(plan_r3), true));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("/", ctx_r1.cycle() === "yearly" ? "yr" : "mo", "");
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_For_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49)(1, "span", 55);
    \u0275\u0275text(2, "\u2713");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 56);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const f_r4 = ctx.$implicit;
    const plan_r3 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r1.priceColor(plan_r3.code));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(f_r4);
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "button", 50);
    \u0275\u0275text(1, "Active Plan");
    \u0275\u0275elementEnd();
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 57);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_14_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r1.contactSales());
    });
    \u0275\u0275text(1, "Contact Sales");
    \u0275\u0275elementEnd();
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 58);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_15_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const plan_r3 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openUpgrade(plan_r3));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const plan_r3 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("Switch to ", plan_r3.name, "");
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_For_54_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 35);
    \u0275\u0275template(1, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_1_Template, 2, 0, "span", 42)(2, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_2_Template, 2, 0, "span", 43);
    \u0275\u0275elementStart(3, "div", 44);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 45);
    \u0275\u0275template(6, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_6_Template, 2, 2, "span", 46)(7, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_7_Template, 4, 4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 47);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 48);
    \u0275\u0275repeaterCreate(11, SubscriptionComponent_Conditional_2_Conditional_0_For_54_For_12_Template, 5, 3, "div", 49, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275template(13, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_13_Template, 2, 0, "button", 50)(14, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_14_Template, 2, 0, "button", 51)(15, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Conditional_15_Template, 2, 1, "button", 52);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const plan_r3 = ctx.$implicit;
    const u_r7 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275conditional(plan_r3.code === u_r7.plan ? 1 : plan_r3.code === "growth" ? 2 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(plan_r3.name);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.isCustom(plan_r3) ? 6 : 7);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2(" Up to ", plan_r3.userLimit || "Unlimited", " users \xB7 ", plan_r3.invoiceLimit || "Unlimited", " invoices/mo ");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(plan_r3.features);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(plan_r3.code === u_r7.plan ? 13 : plan_r3.code === "enterprise" ? 14 : 15);
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_Conditional_62_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 40)(1, "table", 59)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Description");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Amount");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275element(12, "th");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "tbody")(14, "tr")(15, "td");
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 60);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "td", 61);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "td");
    \u0275\u0275element(22, "app-pill", 62);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "td")(24, "div", 63)(25, "button", 64);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_2_Conditional_0_Conditional_62_Template_button_click_25_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.downloadPdf());
    });
    \u0275\u0275text(26, "\u2B07 PDF");
    \u0275\u0275elementEnd()()()()()()();
  }
  if (rf & 2) {
    const s_r9 = ctx;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(16);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(s_r9.createdAt || s_r9.startDate));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", ctx_r1.historyPlanName(), " \u2014 ", ctx_r1.cycleTitle(s_r9.billingCycle), "");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.historyAmount() === null ? "\u2014" : ctx_r1.fmtINR(ctx_r1.historyAmount(), true));
    \u0275\u0275advance(2);
    \u0275\u0275property("status", s_r9.status)("label", ctx_r1.statusLabel(s_r9.status));
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_Conditional_63_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 41);
  }
}
function SubscriptionComponent_Conditional_2_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 12)(1, "div", 13)(2, "div")(3, "div", 14);
    \u0275\u0275text(4, "Current Plan");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 15)(6, "h2", 16);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span", 17);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 18);
    \u0275\u0275text(11);
    \u0275\u0275template(12, SubscriptionComponent_Conditional_2_Conditional_0_Conditional_12_Template, 2, 2, "span");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 19)(14, "button", 20);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_2_Conditional_0_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cancelOpen.set(true));
    });
    \u0275\u0275text(15, "Cancel Plan");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "button", 21);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_2_Conditional_0_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.scrollToPlans());
    });
    \u0275\u0275text(17, "Upgrade Plan");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 22)(19, "div")(20, "div", 23);
    \u0275\u0275text(21, "Users");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 24);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "div", 25);
    \u0275\u0275element(25, "div", 26);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div")(27, "div", 23);
    \u0275\u0275text(28, "Invoices This Month");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 24);
    \u0275\u0275text(30);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "div", 25);
    \u0275\u0275element(32, "div", 27);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(33, "div")(34, "div", 23);
    \u0275\u0275text(35, "Billing Cycle");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(36, "div", 28);
    \u0275\u0275text(37);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(38, "div")(39, "div", 23);
    \u0275\u0275text(40, "Support");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "div", 28);
    \u0275\u0275text(42);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(43, "div", 29)(44, "h2", 30);
    \u0275\u0275text(45, "Choose a Plan");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(46, "div", 31)(47, "button", 32);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_2_Conditional_0_Template_button_click_47_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cycle.set("monthly"));
    });
    \u0275\u0275text(48, "Monthly");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "button", 32);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_2_Conditional_0_Template_button_click_49_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cycle.set("yearly"));
    });
    \u0275\u0275text(50, "Yearly");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(51, SubscriptionComponent_Conditional_2_Conditional_0_Conditional_51_Template, 2, 0, "span", 33);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(52, "section", 34);
    \u0275\u0275repeaterCreate(53, SubscriptionComponent_Conditional_2_Conditional_0_For_54_Template, 16, 6, "div", 35, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "div", 36)(56, "div", 37)(57, "div")(58, "div", 38);
    \u0275\u0275text(59, "Billing History");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(60, "div", 39);
    \u0275\u0275text(61, "Recent subscription charges");
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(62, SubscriptionComponent_Conditional_2_Conditional_0_Conditional_62_Template, 27, 6, "div", 40)(63, SubscriptionComponent_Conditional_2_Conditional_0_Conditional_63_Template, 1, 0, "app-empty-state", 41);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_3_0;
    let tmp_4_0;
    let tmp_18_0;
    const u_r7 = ctx;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(u_r7.planName || ((tmp_3_0 = ctx_r1.currentPlan()) == null ? null : tmp_3_0.name) || "Free");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.statusLabel(((tmp_4_0 = ctx_r1.sub()) == null ? null : tmp_4_0.status) || "active"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" Billing cycle: ", ctx_r1.cycleTitle(ctx_r1.subCycle()), " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.bannerPrice() !== null ? 12 : -1);
    \u0275\u0275advance(11);
    \u0275\u0275textInterpolate2(" ", u_r7.users, " / ", u_r7.userLimit === null ? "Unlimited" : u_r7.userLimit, " ");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", ctx_r1.userPct(), "%");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate2(" ", u_r7.invoicesThisMonth, " / ", u_r7.invoiceLimit === null ? "Unlimited" : u_r7.invoiceLimit, " ");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("background", ctx_r1.invoiceHot() ? "#fca5a5" : "#fff")("width", ctx_r1.invoicePct(), "%");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.cycleTitle(ctx_r1.subCycle()));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.supportLevel());
    \u0275\u0275advance(5);
    \u0275\u0275classProp("active", ctx_r1.cycle() === "monthly");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.cycle() === "yearly");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.cycle() === "yearly" ? 51 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.plans());
    \u0275\u0275advance(9);
    \u0275\u0275conditional((tmp_18_0 = ctx_r1.sub()) ? 62 : 63, tmp_18_0);
  }
}
function SubscriptionComponent_Conditional_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 11);
  }
}
function SubscriptionComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, SubscriptionComponent_Conditional_2_Conditional_0_Template, 64, 22)(1, SubscriptionComponent_Conditional_2_Conditional_1_Template, 1, 0, "app-empty-state", 11);
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional((tmp_1_0 = ctx_r1.usage()) ? 0 : 1, tmp_1_0);
  }
}
function SubscriptionComponent_Conditional_4_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 67);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r11 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("You save ", ctx_r1.fmtINR(ctx_r1.savings(p_r11), true), " vs monthly");
  }
}
function SubscriptionComponent_Conditional_4_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49)(1, "span", 70);
    \u0275\u0275text(2, "\u2713");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 56);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const f_r12 = ctx.$implicit;
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(f_r12);
  }
}
function SubscriptionComponent_Conditional_4_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 7);
  }
}
function SubscriptionComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 65)(1, "span", 66);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 54);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, SubscriptionComponent_Conditional_4_Conditional_5_Template, 2, 1, "div", 67);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 68);
    \u0275\u0275repeaterCreate(7, SubscriptionComponent_Conditional_4_For_8_Template, 5, 1, "div", 49, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 4)(10, "button", 5);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_4_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.upgradeOpen.set(false));
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 69);
    \u0275\u0275listener("click", function SubscriptionComponent_Conditional_4_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.confirmUpgrade());
    });
    \u0275\u0275template(13, SubscriptionComponent_Conditional_4_Conditional_13_Template, 1, 0, "span", 7);
    \u0275\u0275text(14, " Confirm Upgrade ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const p_r11 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r1.priceColor(p_r11.code));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(ctx_r1.priceFor(p_r11), true));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("/", ctx_r1.cycle() === "yearly" ? "year" : "month", "");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.cycle() === "yearly" && ctx_r1.savings(p_r11) > 0 ? 5 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(p_r11.features);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r1.saving());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.saving() ? 13 : -1);
  }
}
function SubscriptionComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 7);
  }
}
var STATUS_LABELS = {
  trial: "Trial",
  active: "Active",
  past_due: "Past Due",
  cancelled: "Cancelled"
};
var PRICE_COLORS = {
  starter: "var(--blue)",
  growth: "var(--brand)",
  business: "var(--purple)",
  enterprise: "#0f172a"
};
var SubscriptionComponent = class _SubscriptionComponent {
  api;
  toast;
  loading = signal(true);
  saving = signal(false);
  plans = signal([]);
  sub = signal(null);
  usage = signal(null);
  cycle = signal("monthly");
  upgradeOpen = signal(false);
  cancelOpen = signal(false);
  selPlan = signal(null);
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  currentPlan = computed(() => this.plans().find((p) => p.code === this.usage()?.plan) || null);
  subCycle = computed(() => this.sub()?.billingCycle || "monthly");
  bannerPrice = computed(() => {
    const p = this.currentPlan();
    if (!p)
      return null;
    return this.subCycle() === "yearly" ? p.yearlyPrice : p.monthlyPrice;
  });
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    forkJoin({ plans: this.api.plans(), current: this.api.subscription() }).subscribe({
      next: (res) => {
        this.plans.set(res.plans);
        this.sub.set(res.current.subscription);
        this.usage.set(res.current.usage);
        if (res.current.subscription?.billingCycle === "yearly")
          this.cycle.set("yearly");
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  // ── Usage helpers ──────────────────────────────
  userPct() {
    const u = this.usage();
    if (!u)
      return 0;
    if (u.userLimit === null || u.userLimit === void 0)
      return 8;
    return u.userLimit > 0 ? Math.min(100, Math.round(u.users / u.userLimit * 100)) : 0;
  }
  invoicePct() {
    const u = this.usage();
    if (!u)
      return 0;
    if (u.invoiceLimit === null || u.invoiceLimit === void 0)
      return 8;
    return u.invoiceLimit > 0 ? Math.min(100, Math.round(u.invoicesThisMonth / u.invoiceLimit * 100)) : 0;
  }
  invoiceHot() {
    const u = this.usage();
    return !!u && u.invoiceLimit !== null && u.invoiceLimit !== void 0 && this.invoicePct() > 80;
  }
  supportLevel() {
    const plan = this.usage()?.plan || "";
    return ["growth", "business", "enterprise"].includes(plan) ? "Priority" : "Standard";
  }
  // ── Plan helpers ───────────────────────────────
  priceFor(plan) {
    return this.cycle() === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  }
  isCustom(plan) {
    return plan.code === "enterprise" || this.priceFor(plan) === null;
  }
  priceColor(code) {
    return PRICE_COLORS[code] || "var(--text)";
  }
  savings(plan) {
    return (plan.monthlyPrice || 0) * 12 - (plan.yearlyPrice || 0);
  }
  statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }
  cycleTitle(cycle) {
    return cycle === "yearly" ? "Yearly" : "Monthly";
  }
  scrollToPlans() {
    document.getElementById("plans-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  contactSales() {
    this.toast.info("Our sales team will reach out to you shortly.");
  }
  // ── Upgrade ────────────────────────────────────
  openUpgrade(plan) {
    this.selPlan.set(plan);
    this.upgradeOpen.set(true);
  }
  confirmUpgrade() {
    const plan = this.selPlan();
    if (!plan || this.saving())
      return;
    this.saving.set(true);
    this.api.startSubscription({ planCode: plan.code, billingCycle: this.cycle() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.upgradeOpen.set(false);
        this.toast.success("Plan updated to " + plan.name);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  // ── Cancel ─────────────────────────────────────
  confirmCancel() {
    if (this.saving())
      return;
    this.saving.set(true);
    this.api.cancelSubscription().subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelOpen.set(false);
        this.toast.info("Subscription cancelled");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  // ── Billing history ────────────────────────────
  historyPlanName() {
    const s = this.sub();
    if (!s)
      return "";
    return this.plans().find((p) => p.code === s.planCode)?.name || this.usage()?.planName || s.planCode;
  }
  historyAmount() {
    const s = this.sub();
    if (!s)
      return null;
    const plan = this.plans().find((p) => p.code === s.planCode);
    if (!plan)
      return null;
    return s.billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  }
  downloadPdf() {
    this.toast.info("Invoice PDF coming soon");
  }
  static \u0275fac = function SubscriptionComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SubscriptionComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SubscriptionComponent, selectors: [["app-subscription"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 14, vars: 9, consts: [["title", "Subscription", "subtitle", "Manage your plan and billing"], [3, "close", "open", "width", "title"], ["title", "Cancel Subscription", 3, "close", "open", "width"], [1, "info-box", "danger"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "button", 1, "btn", "danger", "solid", 3, "click", "disabled"], [1, "spinner"], [1, "card", 2, "margin-bottom", "16px"], [3, "count"], [1, "card"], ["icon", "\u2B21", "title", "Unable to load subscription", "message", "Please refresh the page to try again."], [1, "card", 2, "background", "linear-gradient(135deg,var(--brand),var(--brand-dark))", "color", "#fff", "border", "0", "margin-bottom", "26px"], [2, "display", "flex", "justify-content", "space-between", "align-items", "flex-start", "gap", "16px", "flex-wrap", "wrap"], [2, "font-size", "11px", "text-transform", "uppercase", "letter-spacing", "1px", "font-weight", "700", "color", "rgba(255,255,255,.7)"], [2, "display", "flex", "align-items", "center", "gap", "12px", "margin-top", "6px", "flex-wrap", "wrap"], [2, "margin", "0", "font-size", "28px", "font-weight", "800", "color", "#fff"], [1, "pill", 2, "background", "rgba(255,255,255,.2)", "color", "#fff"], [2, "font-size", "13px", "color", "rgba(255,255,255,.75)", "margin-top", "8px"], [2, "display", "flex", "gap", "10px", "flex-wrap", "wrap"], ["type", "button", 1, "btn", 2, "background", "transparent", "border", "1px solid rgba(255,255,255,.4)", "color", "#fff", 3, "click"], ["type", "button", 1, "btn", 2, "background", "#fff", "color", "var(--brand)", 3, "click"], [1, "grid", "grid-4", 2, "border-top", "1px solid rgba(255,255,255,.15)", "padding-top", "14px", "margin-top", "20px"], [2, "font-size", "11px", "text-transform", "uppercase", "letter-spacing", ".6px", "font-weight", "600", "color", "rgba(255,255,255,.65)"], [2, "font-weight", "700", "font-size", "15px", "margin", "4px 0 8px"], [1, "progress", 2, "background", "rgba(255,255,255,.25)"], [1, "bar", 2, "background", "#fff"], [1, "bar"], [2, "font-weight", "700", "font-size", "15px", "margin-top", "4px"], [2, "display", "flex", "align-items", "center", "gap", "14px", "flex-wrap", "wrap", "margin-bottom", "20px"], [2, "margin", "0", "font-size", "17px", "font-weight", "800"], [1, "tabs"], ["type", "button", 3, "click"], [1, "pill", "success"], ["id", "plans-grid", 1, "grid", "grid-4", 2, "margin-bottom", "26px"], [1, "card", 2, "position", "relative", "display", "flex", "flex-direction", "column"], [1, "card", "flush"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], [1, "table-wrap"], ["icon", "\u2B21", "title", "No billing history yet", "message", "Charges will appear here once you subscribe to a plan."], [2, "position", "absolute", "top", "-12px", "left", "50%", "transform", "translateX(-50%)", "background", "var(--brand)", "color", "#fff", "font-size", "10.5px", "font-weight", "700", "padding", "4px 12px", "border-radius", "20px", "letter-spacing", ".4px", "white-space", "nowrap"], [2, "position", "absolute", "top", "-12px", "left", "50%", "transform", "translateX(-50%)", "background", "linear-gradient(135deg,#4f46e5,#7c3aed)", "color", "#fff", "font-size", "10.5px", "font-weight", "700", "padding", "4px 12px", "border-radius", "20px", "letter-spacing", ".4px", "white-space", "nowrap"], [2, "font-family", "var(--font-display)", "font-size", "18px", "font-weight", "700"], [2, "margin", "8px 0 4px"], [2, "font-family", "var(--font-display)", "font-size", "28px", "font-weight", "800", 3, "color"], [2, "font-size", "12px", "color", "var(--muted)", "margin-bottom", "12px"], [2, "display", "grid", "gap", "7px", "margin-bottom", "16px"], [2, "display", "flex", "gap", "8px", "align-items", "flex-start"], ["type", "button", "disabled", "", 1, "btn", "block", 2, "margin-top", "auto", "background", "var(--brand-pale)", "color", "var(--brand)", "opacity", "1"], ["type", "button", 1, "btn", "secondary", "block", 2, "margin-top", "auto"], ["type", "button", 1, "btn", "primary", "block", 2, "margin-top", "auto"], [2, "font-family", "var(--font-display)", "font-size", "28px", "font-weight", "800"], [2, "font-size", "13px", "color", "var(--muted)"], [2, "font-weight", "700", "font-size", "12px"], [2, "font-size", "12px", "color", "var(--muted)", "line-height", "1.5"], ["type", "button", 1, "btn", "secondary", "block", 2, "margin-top", "auto", 3, "click"], ["type", "button", 1, "btn", "primary", "block", 2, "margin-top", "auto", 3, "click"], [1, "table"], [1, "strong"], [1, "num"], [3, "status", "label"], [1, "actions"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], [2, "background", "var(--brand-pale)", "border-radius", "12px", "padding", "18px", "text-align", "center", "margin-bottom", "16px"], [2, "font-family", "var(--font-display)", "font-size", "30px", "font-weight", "800"], [2, "font-size", "12px", "color", "var(--green)", "font-weight", "600", "margin-top", "6px"], [2, "display", "grid", "gap", "7px"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [2, "color", "var(--green)", "font-weight", "700", "font-size", "12px"]], template: function SubscriptionComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0);
      \u0275\u0275template(1, SubscriptionComponent_Conditional_1_Template, 4, 2)(2, SubscriptionComponent_Conditional_2_Template, 2, 1);
      \u0275\u0275elementStart(3, "app-modal", 1);
      \u0275\u0275listener("close", function SubscriptionComponent_Template_app_modal_close_3_listener() {
        return ctx.upgradeOpen.set(false);
      });
      \u0275\u0275template(4, SubscriptionComponent_Conditional_4_Template, 15, 7);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "app-modal", 2);
      \u0275\u0275listener("close", function SubscriptionComponent_Template_app_modal_close_5_listener() {
        return ctx.cancelOpen.set(false);
      });
      \u0275\u0275elementStart(6, "div", 3);
      \u0275\u0275text(7, " \u26A0 Are you sure? Your account will remain active until the end of the billing period. After that you'll lose access to paid features. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "div", 4)(9, "button", 5);
      \u0275\u0275listener("click", function SubscriptionComponent_Template_button_click_9_listener() {
        return ctx.cancelOpen.set(false);
      });
      \u0275\u0275text(10, "Keep Plan");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "button", 6);
      \u0275\u0275listener("click", function SubscriptionComponent_Template_button_click_11_listener() {
        return ctx.confirmCancel();
      });
      \u0275\u0275template(12, SubscriptionComponent_Conditional_12_Template, 1, 0, "span", 7);
      \u0275\u0275text(13, " Cancel Subscription ");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_3_0;
      let tmp_4_0;
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading() ? 1 : 2);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.upgradeOpen())("width", 420)("title", "Switch to " + (((tmp_3_0 = ctx.selPlan()) == null ? null : tmp_3_0.name) || ""));
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_4_0 = ctx.selPlan()) ? 4 : -1, tmp_4_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", ctx.cancelOpen())("width", 420);
      \u0275\u0275advance(6);
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 12 : -1);
    }
  }, dependencies: [CommonModule, AppShellComponent, ModalComponent, PillComponent, EmptyStateComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SubscriptionComponent, { className: "SubscriptionComponent", filePath: "src\\app\\features\\subscription\\subscription.component.ts", lineNumber: 231 });
})();
export {
  SubscriptionComponent
};
//# sourceMappingURL=chunk-MP34E6RZ.js.map
