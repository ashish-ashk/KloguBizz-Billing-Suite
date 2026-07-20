import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import "./chunk-FOTQGH3M.js";
import {
  AvatarComponent,
  EmptyStateComponent,
  ModalComponent,
  PagerComponent,
  PillComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-OBVHAWX5.js";
import {
  daysBetween,
  downloadBlob,
  fmtDate,
  fmtINR
} from "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import {
  DefaultValueAccessor,
  FormsModule,
  MinValidator,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
  SelectControlValueAccessor,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
} from "./chunk-XAFCZYPI.js";
import {
  AuthService
} from "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
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
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-6VNHH65J.js";

// src/app/features/payments/payments.component.ts
var _forTrack0 = ($index, $item) => $item._id;
function PaymentsComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function PaymentsComponent_Conditional_57_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 36);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function PaymentsComponent_Conditional_57_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 37);
  }
}
function PaymentsComponent_Conditional_57_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 38);
  }
}
function PaymentsComponent_Conditional_57_Conditional_9_For_21_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 55);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("+", ctx_r1.overdueDays(inv_r5), "d overdue");
  }
}
function PaymentsComponent_Conditional_57_Conditional_9_For_21_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 56);
    \u0275\u0275text(1, "Due today");
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_57_Conditional_9_For_21_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 57);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", -ctx_r1.overdueDays(inv_r5), " days left");
  }
}
function PaymentsComponent_Conditional_57_Conditional_9_For_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td", 43);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 44)(4, "div", 45);
    \u0275\u0275element(5, "app-avatar", 46);
    \u0275\u0275elementStart(6, "div")(7, "div", 47);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 48);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(11, "td", 49);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td", 50);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td", 51);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 52);
    \u0275\u0275element(18, "app-pill", 53);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "td", 54);
    \u0275\u0275template(20, PaymentsComponent_Conditional_57_Conditional_9_For_21_Conditional_20_Template, 2, 1, "span", 55)(21, PaymentsComponent_Conditional_57_Conditional_9_For_21_Conditional_21_Template, 2, 0, "span", 56)(22, PaymentsComponent_Conditional_57_Conditional_9_For_21_Conditional_22_Template, 2, 1, "span", 57);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "td", 58)(24, "div", 59)(25, "button", 60);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_57_Conditional_9_For_21_Template_button_click_25_listener() {
      const inv_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openPay(inv_r5));
    });
    \u0275\u0275text(26, "Record Payment");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "button", 61);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_57_Conditional_9_For_21_Template_button_click_27_listener() {
      const inv_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openRemind(inv_r5));
    });
    \u0275\u0275element(28, "app-icon", 62);
    \u0275\u0275text(29, " Remind");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const inv_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("row-danger", inv_r5.status === "overdue");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(inv_r5.invoiceNumber);
    \u0275\u0275advance(3);
    \u0275\u0275property("name", ctx_r1.clientName(inv_r5.clientId))("size", 30);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.clientName(inv_r5.clientId));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.clientEmail(inv_r5.clientId) || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(inv_r5.date));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(inv_r5.dueDate));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(inv_r5.totals.total));
    \u0275\u0275advance(2);
    \u0275\u0275property("status", inv_r5.status);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.overdueDays(inv_r5) > 0 ? 20 : ctx_r1.overdueDays(inv_r5) === 0 ? 21 : 22);
    \u0275\u0275advance(8);
    \u0275\u0275property("size", 13);
  }
}
function PaymentsComponent_Conditional_57_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 39)(1, "table", 40)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Invoice #");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Client");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Invoice Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Due Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Amount");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "th");
    \u0275\u0275text(17, "Days Due");
    \u0275\u0275elementEnd();
    \u0275\u0275element(18, "th");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "tbody");
    \u0275\u0275repeaterCreate(20, PaymentsComponent_Conditional_57_Conditional_9_For_21_Template, 30, 13, "tr", 41, _forTrack0);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(22, "app-pager", 42);
    \u0275\u0275listener("pageChange", function PaymentsComponent_Conditional_57_Conditional_9_Template_app_pager_pageChange_22_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.trackerPage.set($event));
    })("pageSizeChange", function PaymentsComponent_Conditional_57_Conditional_9_Template_app_pager_pageSizeChange_22_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onTrackerPageSize($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(20);
    \u0275\u0275repeater(ctx_r1.pagedDue());
    \u0275\u0275advance(2);
    \u0275\u0275property("page", ctx_r1.trackerPage())("pageSize", ctx_r1.trackerPageSize())("total", ctx_r1.filteredDue().length);
  }
}
function PaymentsComponent_Conditional_57_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 31)(1, "div", 32)(2, "span", 33);
    \u0275\u0275text(3, "\u2315");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 34);
    \u0275\u0275listener("ngModelChange", function PaymentsComponent_Conditional_57_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onTrackerSearch($event));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(5, "div", 35);
    \u0275\u0275template(6, PaymentsComponent_Conditional_57_Conditional_6_Template, 1, 1, "app-skeleton-rows", 36)(7, PaymentsComponent_Conditional_57_Conditional_7_Template, 1, 0, "app-empty-state", 37)(8, PaymentsComponent_Conditional_57_Conditional_8_Template, 1, 0, "app-empty-state", 38)(9, PaymentsComponent_Conditional_57_Conditional_9_Template, 23, 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275property("ngModel", ctx_r1.trackerQuery());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.loading() ? 6 : ctx_r1.dueInvoices().length === 0 ? 7 : ctx_r1.filteredDue().length === 0 ? 8 : 9);
  }
}
function PaymentsComponent_Conditional_58_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 36);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function PaymentsComponent_Conditional_58_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 64);
  }
}
function PaymentsComponent_Conditional_58_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 65);
  }
}
function PaymentsComponent_Conditional_58_Conditional_9_For_22_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 71);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r8 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r8.reference);
  }
}
function PaymentsComponent_Conditional_58_Conditional_9_For_22_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 72);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_58_Conditional_9_For_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 66);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 43);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 44);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 67);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td", 68)(10, "span", 69);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "td", 70);
    \u0275\u0275template(13, PaymentsComponent_Conditional_58_Conditional_9_For_22_Conditional_13_Template, 2, 1, "span", 71)(14, PaymentsComponent_Conditional_58_Conditional_9_For_22_Conditional_14_Template, 2, 0, "span", 72);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td", 52);
    \u0275\u0275element(16, "app-pill", 53);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 73);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const p_r8 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(p_r8.date));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.invoiceNo(p_r8));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.clientName(p_r8.clientId));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(p_r8.amount));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(p_r8.method);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(p_r8.reference ? 13 : 14);
    \u0275\u0275advance(3);
    \u0275\u0275property("status", p_r8.status);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(p_r8.note || "\u2014");
  }
}
function PaymentsComponent_Conditional_58_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 39)(1, "table", 40)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Invoice #");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Client");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Amount");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Method");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "Reference");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "th");
    \u0275\u0275text(17, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "th");
    \u0275\u0275text(19, "Note");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(20, "tbody");
    \u0275\u0275repeaterCreate(21, PaymentsComponent_Conditional_58_Conditional_9_For_22_Template, 19, 8, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(23, "app-pager", 42);
    \u0275\u0275listener("pageChange", function PaymentsComponent_Conditional_58_Conditional_9_Template_app_pager_pageChange_23_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.historyPage.set($event));
    })("pageSizeChange", function PaymentsComponent_Conditional_58_Conditional_9_Template_app_pager_pageSizeChange_23_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onHistoryPageSize($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(21);
    \u0275\u0275repeater(ctx_r1.pagedPayments());
    \u0275\u0275advance(2);
    \u0275\u0275property("page", ctx_r1.historyPage())("pageSize", ctx_r1.historyPageSize())("total", ctx_r1.filteredPayments().length);
  }
}
function PaymentsComponent_Conditional_58_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 31)(1, "div", 32)(2, "span", 33);
    \u0275\u0275text(3, "\u2315");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 63);
    \u0275\u0275listener("ngModelChange", function PaymentsComponent_Conditional_58_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onHistorySearch($event));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(5, "div", 35);
    \u0275\u0275template(6, PaymentsComponent_Conditional_58_Conditional_6_Template, 1, 1, "app-skeleton-rows", 36)(7, PaymentsComponent_Conditional_58_Conditional_7_Template, 1, 0, "app-empty-state", 64)(8, PaymentsComponent_Conditional_58_Conditional_8_Template, 1, 0, "app-empty-state", 65)(9, PaymentsComponent_Conditional_58_Conditional_9_Template, 24, 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275property("ngModel", ctx_r1.historyQuery());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.loading() ? 6 : ctx_r1.payments().length === 0 ? 7 : ctx_r1.filteredPayments().length === 0 ? 8 : 9);
  }
}
function PaymentsComponent_Conditional_59_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 35);
    \u0275\u0275element(1, "app-skeleton-rows", 36);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 4);
  }
}
function PaymentsComponent_Conditional_59_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 35);
    \u0275\u0275element(1, "app-empty-state", 74);
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_59_Conditional_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function PaymentsComponent_Conditional_59_Conditional_2_For_7_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 88);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r11 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("+", ctx_r1.overdueDays(inv_r11), "d overdue");
  }
}
function PaymentsComponent_Conditional_59_Conditional_2_For_7_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 89);
    \u0275\u0275text(1, "Due today");
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_59_Conditional_2_For_7_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 90);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r11 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", -ctx_r1.overdueDays(inv_r11), "d left");
  }
}
function PaymentsComponent_Conditional_59_Conditional_2_For_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 78)(1, "div", 79);
    \u0275\u0275element(2, "app-avatar", 46);
    \u0275\u0275elementStart(3, "div", 80)(4, "div", 81);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 82);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275element(8, "app-pill", 53);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 83)(10, "div", 84)(11, "div", 85);
    \u0275\u0275text(12, "Invoice #");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 86);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 84)(16, "div", 85);
    \u0275\u0275text(17, "Amount Due");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 87);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 84)(21, "div", 85);
    \u0275\u0275text(22, "Due Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 87);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 84)(26, "div", 85);
    \u0275\u0275text(27, "Days");
    \u0275\u0275elementEnd();
    \u0275\u0275template(28, PaymentsComponent_Conditional_59_Conditional_2_For_7_Conditional_28_Template, 2, 1, "div", 88)(29, PaymentsComponent_Conditional_59_Conditional_2_For_7_Conditional_29_Template, 2, 0, "div", 89)(30, PaymentsComponent_Conditional_59_Conditional_2_For_7_Conditional_30_Template, 2, 1, "div", 90);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(31, "div", 91)(32, "button", 92);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_59_Conditional_2_For_7_Template_button_click_32_listener() {
      const inv_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openRemind(inv_r11));
    });
    \u0275\u0275element(33, "app-icon", 62);
    \u0275\u0275text(34, " Send Reminder");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "button", 93);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_59_Conditional_2_For_7_Template_button_click_35_listener() {
      const inv_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openPay(inv_r11));
    });
    \u0275\u0275text(36, "Record Payment");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const inv_r11 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275property("name", ctx_r1.clientName(inv_r11.clientId))("size", 36);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.clientName(inv_r11.clientId));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.clientEmail(inv_r11.clientId) || "No email on file", " ");
    \u0275\u0275advance();
    \u0275\u0275property("status", inv_r11.status);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(inv_r11.invoiceNumber);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(ctx_r1.remainingFor(inv_r11)));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(inv_r11.dueDate));
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.overdueDays(inv_r11) > 0 ? 28 : ctx_r1.overdueDays(inv_r11) === 0 ? 29 : 30);
    \u0275\u0275advance(5);
    \u0275\u0275property("size", 13);
  }
}
function PaymentsComponent_Conditional_59_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 75)(1, "button", 76);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_59_Conditional_2_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.confirmRemindAll.set(true));
    });
    \u0275\u0275template(2, PaymentsComponent_Conditional_59_Conditional_2_Conditional_2_Template, 1, 0, "span", 2);
    \u0275\u0275element(3, "app-icon", 62);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 77);
    \u0275\u0275repeaterCreate(6, PaymentsComponent_Conditional_59_Conditional_2_For_7_Template, 37, 10, "div", 78, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.remindingAll());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.remindingAll() ? 2 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("size", 13);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" Remind All (", ctx_r1.dueInvoices().length, ") ");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.dueInvoices());
  }
}
function PaymentsComponent_Conditional_59_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, PaymentsComponent_Conditional_59_Conditional_0_Template, 2, 1, "div", 35)(1, PaymentsComponent_Conditional_59_Conditional_1_Template, 2, 0, "div", 35)(2, PaymentsComponent_Conditional_59_Conditional_2_Template, 8, 4);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r1.loading() ? 0 : ctx_r1.dueInvoices().length === 0 ? 1 : 2);
  }
}
function PaymentsComponent_Conditional_61_For_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 99);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const m_r13 = ctx.$implicit;
    \u0275\u0275property("value", m_r13);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(m_r13);
  }
}
function PaymentsComponent_Conditional_61_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 94)(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "br");
    \u0275\u0275elementStart(4, "span", 71);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "form", 95);
    \u0275\u0275listener("ngSubmit", function PaymentsComponent_Conditional_61_Template_form_ngSubmit_7_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.savePayment());
    });
    \u0275\u0275elementStart(8, "div", 96)(9, "label");
    \u0275\u0275text(10, "Amount Received (\u20B9)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "input", 97);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_61_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.payAmount, $event) || (ctx_r1.payAmount = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 96)(13, "label");
    \u0275\u0275text(14, "Payment Method");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "select", 98);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_61_Template_select_ngModelChange_15_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.payMethod, $event) || (ctx_r1.payMethod = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(16, PaymentsComponent_Conditional_61_For_17_Template, 2, 2, "option", 99, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 96)(19, "label");
    \u0275\u0275text(20, "Transaction Reference");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "input", 100);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_61_Template_input_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.payReference, $event) || (ctx_r1.payReference = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div", 96)(23, "label");
    \u0275\u0275text(24, "Note");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "textarea", 101);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_61_Template_textarea_ngModelChange_25_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.payNote, $event) || (ctx_r1.payNote = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 28)(27, "button", 29);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_61_Template_button_click_27_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.payInvoice.set(null));
    });
    \u0275\u0275text(28, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "button", 102);
    \u0275\u0275text(30);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const inv_r14 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.clientName(inv_r14.clientId));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(inv_r14.invoiceNumber);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" \xB7 Due ", ctx_r1.fmtDate(inv_r14.dueDate), " \xB7 ", ctx_r1.fmtINR(inv_r14.totals.total), " ");
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.payAmount);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.payMethod);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.methods);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.payReference);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.payNote);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.savingPay() || !ctx_r1.payAmount || ctx_r1.payAmount <= 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.savingPay() ? "Saving\u2026" : "Record Payment", " ");
  }
}
function PaymentsComponent_Conditional_63_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " was due on ");
    \u0275\u0275elementStart(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
  }
  if (rf & 2) {
    const inv_r16 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(inv_r16.dueDate));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" and is now ", ctx_r1.overdueDays(inv_r16), " day(s) overdue. ");
  }
}
function PaymentsComponent_Conditional_63_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " is due on ");
    \u0275\u0275elementStart(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, ". ");
  }
  if (rf & 2) {
    const inv_r16 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(inv_r16.dueDate));
  }
}
function PaymentsComponent_Conditional_63_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 78)(1, "div", 103)(2, "strong");
    \u0275\u0275text(3, "To:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 104)(6, "strong");
    \u0275\u0275text(7, "Subject:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 105);
    \u0275\u0275text(10);
    \u0275\u0275element(11, "br")(12, "br");
    \u0275\u0275text(13, " This is a friendly reminder that invoice ");
    \u0275\u0275elementStart(14, "strong");
    \u0275\u0275text(15);
    \u0275\u0275elementEnd();
    \u0275\u0275text(16, " for ");
    \u0275\u0275elementStart(17, "strong");
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275template(19, PaymentsComponent_Conditional_63_Conditional_19_Template, 4, 2)(20, PaymentsComponent_Conditional_63_Conditional_20_Template, 4, 1);
    \u0275\u0275element(21, "br")(22, "br");
    \u0275\u0275text(23, " We would appreciate payment at your earliest convenience.");
    \u0275\u0275element(24, "br")(25, "br");
    \u0275\u0275text(26, " Warm regards,");
    \u0275\u0275element(27, "br");
    \u0275\u0275text(28);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "div", 28)(30, "button", 29);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_63_Template_button_click_30_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.remindInvoice.set(null));
    });
    \u0275\u0275text(31, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "button", 30);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_63_Template_button_click_32_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.sendReminder());
    });
    \u0275\u0275text(33);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const inv_r16 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r1.clientEmail(inv_r16.clientId) || "\u2014 no email on file \u2014", " ");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" Payment reminder \u2014 Invoice ", inv_r16.invoiceNumber, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" Dear ", ctx_r1.clientName(inv_r16.clientId), ",");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(inv_r16.invoiceNumber);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(inv_r16.totals.total));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.overdueDays(inv_r16) > 0 ? 19 : 20);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate1("", ctx_r1.orgName(), " ");
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.sendingReminder());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.sendingReminder() ? "Sending\u2026" : "Send Reminder", " ");
  }
}
var PaymentsComponent = class _PaymentsComponent {
  api;
  toast;
  auth;
  loading = signal(true);
  invoices = signal([]);
  payments = signal([]);
  tab = signal("tracker");
  // Record Payment modal
  payInvoice = signal(null);
  savingPay = signal(false);
  payAmount = null;
  payMethod = "Bank Transfer";
  payReference = "";
  payNote = "";
  // Reminder modal
  remindInvoice = signal(null);
  sendingReminder = signal(false);
  confirmRemindAll = signal(false);
  remindingAll = signal(false);
  exporting = signal(false);
  methods = ["Bank Transfer", "UPI", "NEFT", "RTGS", "Razorpay", "Cheque", "Cash"];
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  dueInvoices = computed(() => this.invoices().filter((i) => i.status === "pending" || i.status === "partial" || i.status === "overdue").sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  pendingInvoices = computed(() => this.invoices().filter((i) => i.status === "pending" || i.status === "partial"));
  overdueInvoices = computed(() => this.invoices().filter((i) => i.status === "overdue"));
  totalCollected = computed(() => this.payments().filter((p) => p.status === "success").reduce((s, p) => s + (p.amount || 0), 0));
  successCount = computed(() => this.payments().filter((p) => p.status === "success").length);
  pendingAmount = computed(() => this.pendingInvoices().reduce((s, i) => s + (i.totals?.total || 0), 0));
  overdueAmount = computed(() => this.overdueInvoices().reduce((s, i) => s + (i.totals?.total || 0), 0));
  avgCollectionDays = computed(() => {
    const paid = this.invoices().filter((i) => i.status === "paid" && !!i.paidDate);
    if (paid.length === 0)
      return null;
    const sum = paid.reduce((s, i) => s + daysBetween(i.date, i.paidDate), 0);
    return Math.round(sum / paid.length);
  });
  sortedPayments = computed(() => [...this.payments()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  // ── Tracker search/pagination ─────────────────
  trackerQuery = signal("");
  trackerPage = signal(1);
  trackerPageSize = signal(10);
  filteredDue = computed(() => {
    const q = this.trackerQuery().trim().toLowerCase();
    if (!q)
      return this.dueInvoices();
    return this.dueInvoices().filter((inv) => `${inv.invoiceNumber} ${this.clientName(inv.clientId)}`.toLowerCase().includes(q));
  });
  pagedDue = computed(() => {
    const start = (this.trackerPage() - 1) * this.trackerPageSize();
    return this.filteredDue().slice(start, start + this.trackerPageSize());
  });
  // ── History search/pagination ─────────────────
  historyQuery = signal("");
  historyPage = signal(1);
  historyPageSize = signal(10);
  filteredPayments = computed(() => {
    const q = this.historyQuery().trim().toLowerCase();
    if (!q)
      return this.sortedPayments();
    return this.sortedPayments().filter((p) => `${this.invoiceNo(p)} ${this.clientName(p.clientId)} ${p.method} ${p.reference || ""}`.toLowerCase().includes(q));
  });
  pagedPayments = computed(() => {
    const start = (this.historyPage() - 1) * this.historyPageSize();
    return this.filteredPayments().slice(start, start + this.historyPageSize());
  });
  constructor(api, toast, auth) {
    this.api = api;
    this.toast = toast;
    this.auth = auth;
  }
  onTrackerSearch(v) {
    this.trackerQuery.set(v);
    this.trackerPage.set(1);
  }
  onTrackerPageSize(v) {
    this.trackerPageSize.set(v);
    this.trackerPage.set(1);
  }
  onHistorySearch(v) {
    this.historyQuery.set(v);
    this.historyPage.set(1);
  }
  onHistoryPageSize(v) {
    this.historyPageSize.set(v);
    this.historyPage.set(1);
  }
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    forkJoin({ payments: this.api.payments(), invoices: this.api.invoices() }).subscribe({
      next: (res) => {
        this.payments.set(res.payments);
        this.invoices.set(res.invoices);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  // ── Helpers ──────────────────────────────────
  clientOf(c) {
    return c && typeof c === "object" ? c : null;
  }
  clientName(c) {
    return this.clientOf(c)?.companyName || "Unknown client";
  }
  clientEmail(c) {
    return this.clientOf(c)?.email || "";
  }
  invoiceNo(p) {
    return typeof p.invoiceId === "object" && p.invoiceId ? p.invoiceId.invoiceNumber : "\u2014";
  }
  invoiceIdOf(p) {
    return typeof p.invoiceId === "object" && p.invoiceId ? p.invoiceId._id : p.invoiceId;
  }
  overdueDays(inv) {
    return daysBetween(inv.dueDate);
  }
  remainingFor(inv) {
    const paid = this.payments().filter((p) => p.status === "success" && this.invoiceIdOf(p) === inv._id).reduce((s, p) => s + (p.amount || 0), 0);
    return Math.max(0, Math.round(((inv.totals?.total || 0) - paid) * 100) / 100);
  }
  orgName() {
    return this.auth.organisation()?.name || "The Accounts Team";
  }
  // ── Record payment ───────────────────────────
  openPay(inv) {
    this.payAmount = this.remainingFor(inv);
    this.payMethod = "Bank Transfer";
    this.payReference = "";
    this.payNote = "";
    this.payInvoice.set(inv);
  }
  savePayment() {
    const inv = this.payInvoice();
    if (!inv || !this.payAmount || this.payAmount <= 0)
      return;
    this.savingPay.set(true);
    this.api.createPayment({
      invoiceId: inv._id,
      amount: this.payAmount,
      method: this.payMethod,
      reference: this.payReference.trim(),
      note: this.payNote.trim()
    }).subscribe({
      next: () => {
        this.savingPay.set(false);
        this.payInvoice.set(null);
        this.toast.success("Payment recorded");
        this.load();
      },
      error: (err) => {
        this.savingPay.set(false);
        this.toast.httpError(err);
      }
    });
  }
  // ── Reminders ────────────────────────────────
  openRemind(inv) {
    this.remindInvoice.set(inv);
  }
  sendReminder() {
    const inv = this.remindInvoice();
    if (!inv)
      return;
    this.sendingReminder.set(true);
    this.api.sendReminder(inv._id).subscribe({
      next: () => {
        this.sendingReminder.set(false);
        this.remindInvoice.set(null);
        this.toast.success("Reminder sent");
      },
      error: (err) => {
        this.sendingReminder.set(false);
        this.toast.httpError(err);
      }
    });
  }
  remindAll() {
    this.remindingAll.set(true);
    this.api.remindAll().subscribe({
      next: (res) => {
        this.remindingAll.set(false);
        this.confirmRemindAll.set(false);
        this.toast.success(`${res.sent} reminder${res.sent === 1 ? "" : "s"} sent${res.skipped ? `, ${res.skipped} skipped (no email on file)` : ""}`);
      },
      error: (err) => {
        this.remindingAll.set(false);
        this.toast.httpError(err);
      }
    });
  }
  exportCsv() {
    this.exporting.set(true);
    this.api.exportPaymentsCsv().subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, "payments.csv");
      },
      error: (err) => {
        this.exporting.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function PaymentsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PaymentsComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService), \u0275\u0275directiveInject(AuthService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _PaymentsComponent, selectors: [["app-payments"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 75, vars: 37, consts: [["title", "Payments", "subtitle", "Track collections, reminders and history"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], [1, "spinner"], ["name", "download", 3, "size"], [1, "grid", "grid-4", 2, "margin-bottom", "20px"], [1, "card", "metric", "success"], [1, "accent"], [1, "metric-row"], [1, "label"], [1, "m-icon"], ["name", "rupee", 3, "size"], [1, "value", 2, "color", "var(--green)"], [1, "sub"], [1, "card", "metric", "warning"], ["name", "clock", 3, "size"], [1, "value"], [1, "card", "metric", "danger"], ["name", "alertTriangle", 3, "size"], [1, "value", 2, "color", "var(--red)"], [1, "card", "metric", "indigo"], [1, "value", 2, "color", "var(--brand)"], [1, "tabs", 2, "margin-bottom", "16px"], ["type", "button", 3, "click"], ["title", "Record Payment", 3, "close", "open", "width"], ["title", "Send Payment Reminder", 3, "close", "open", "width"], ["title", "Remind All", 3, "close", "open"], [2, "margin", "0", "color", "var(--muted)", "line-height", "1.6"], [2, "color", "var(--text)"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "toolbar"], [1, "search-box"], [1, "search-icon"], ["type", "search", "placeholder", "Search invoice or client\u2026", 1, "input", 3, "ngModelChange", "ngModel"], [1, "card", "flush"], [3, "count"], ["icon", "\u2713", "title", "All invoices are paid", "message", "No pending, partial or overdue invoices right now."], ["icon", "\u2315", "title", "No matching invoices", "message", "Try a different search term."], [1, "table-wrap"], [1, "table", "stack-mobile"], [3, "row-danger"], [3, "pageChange", "pageSizeChange", "page", "pageSize", "total"], ["data-label", "Invoice #", 1, "num"], ["data-label", "Client"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [3, "name", "size"], [1, "strong"], [1, "muted", 2, "font-size", "11.5px"], ["data-label", "Invoice Date"], ["data-label", "Due Date"], ["data-label", "Amount", 1, "strong"], ["data-label", "Status"], [3, "status"], ["data-label", "Days Due"], [2, "color", "var(--red)", "font-weight", "700"], [2, "color", "var(--amber)", "font-weight", "600"], [2, "color", "var(--green)"], ["data-label", ""], [1, "actions"], ["type", "button", 1, "btn", "primary", "sm", 3, "click"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], ["name", "mail", 3, "size"], ["type", "search", "placeholder", "Search invoice, client, method or reference\u2026", 1, "input", 3, "ngModelChange", "ngModel"], ["icon", "\u25C8", "title", "No payments recorded yet", "message", "Payments you record will show up here."], ["icon", "\u2315", "title", "No matching payments", "message", "Try a different search term."], ["data-label", "Date"], ["data-label", "Amount", 1, "strong", 2, "color", "var(--green)"], ["data-label", "Method"], [1, "pill"], ["data-label", "Reference"], [1, "mono"], [1, "muted"], ["data-label", "Note", 1, "muted"], ["icon", "\u{1F4E7}", "title", "No pending invoices requiring reminders", "message", "You are all caught up."], [2, "display", "flex", "justify-content", "flex-end", "margin-bottom", "14px"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click", "disabled"], [1, "grid", "grid-2"], [1, "card"], [2, "display", "flex", "align-items", "center", "gap", "10px", "margin-bottom", "14px"], [2, "flex", "1", "min-width", "0"], [2, "font-weight", "700", "overflow", "hidden", "text-overflow", "ellipsis", "white-space", "nowrap"], [2, "font-size", "11.5px", "color", "var(--muted)", "overflow", "hidden", "text-overflow", "ellipsis", "white-space", "nowrap"], [1, "grid", "grid-2", 2, "gap", "10px", "margin-bottom", "16px"], [1, "stat-block"], [1, "sb-label"], [1, "sb-value", "mono", 2, "color", "var(--brand)"], [1, "sb-value"], [1, "sb-value", 2, "color", "var(--red)"], [1, "sb-value", 2, "color", "var(--amber)"], [1, "sb-value", 2, "color", "var(--green)"], [2, "display", "flex", "gap", "8px"], ["type", "button", 1, "btn", "primary", "sm", 2, "flex", "1", 3, "click"], ["type", "button", 1, "btn", "success", "sm", 3, "click"], [1, "info-box", 2, "margin-bottom", "16px"], [1, "form", 3, "ngSubmit"], [1, "field"], ["name", "amount", "type", "number", "min", "0", "step", "0.01", 3, "ngModelChange", "ngModel"], ["name", "method", 3, "ngModelChange", "ngModel"], [3, "value"], ["name", "reference", "placeholder", "UTR / transaction ID (optional)", 3, "ngModelChange", "ngModel"], ["name", "note", "rows", "2", "placeholder", "Optional note", 3, "ngModelChange", "ngModel"], ["type", "submit", 1, "btn", "primary", 3, "disabled"], [2, "font-size", "12px", "color", "var(--muted)", "margin-bottom", "4px"], [2, "font-size", "12px", "color", "var(--muted)", "margin-bottom", "12px", "padding-bottom", "10px", "border-bottom", "1px solid var(--border)"], [2, "font-family", "Georgia,'Times New Roman',serif", "font-size", "13.5px", "line-height", "1.7", "color", "var(--text)"]], template: function PaymentsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_1_listener() {
        return ctx.exportCsv();
      });
      \u0275\u0275template(2, PaymentsComponent_Conditional_2_Template, 1, 0, "span", 2);
      \u0275\u0275element(3, "app-icon", 3);
      \u0275\u0275text(4, " Export CSV ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "div", 4)(6, "div", 5);
      \u0275\u0275element(7, "div", 6);
      \u0275\u0275elementStart(8, "div", 7)(9, "span", 8);
      \u0275\u0275text(10, "Total Collected");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "span", 9);
      \u0275\u0275element(12, "app-icon", 10);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(13, "div", 11);
      \u0275\u0275text(14);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "div", 12);
      \u0275\u0275text(16);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(17, "div", 13);
      \u0275\u0275element(18, "div", 6);
      \u0275\u0275elementStart(19, "div", 7)(20, "span", 8);
      \u0275\u0275text(21, "Pending Amount");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(22, "span", 9);
      \u0275\u0275element(23, "app-icon", 14);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(24, "div", 15);
      \u0275\u0275text(25);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "div", 12);
      \u0275\u0275text(27);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(28, "div", 16);
      \u0275\u0275element(29, "div", 6);
      \u0275\u0275elementStart(30, "div", 7)(31, "span", 8);
      \u0275\u0275text(32, "Overdue Amount");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "span", 9);
      \u0275\u0275element(34, "app-icon", 17);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(35, "div", 18);
      \u0275\u0275text(36);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(37, "div", 12);
      \u0275\u0275text(38);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(39, "div", 19);
      \u0275\u0275element(40, "div", 6);
      \u0275\u0275elementStart(41, "div", 7)(42, "span", 8);
      \u0275\u0275text(43, "Avg. Collection");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(44, "span", 9);
      \u0275\u0275element(45, "app-icon", 14);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(46, "div", 20);
      \u0275\u0275text(47);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(48, "div", 12);
      \u0275\u0275text(49, "Invoice date to payment date");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(50, "div", 21)(51, "button", 22);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_51_listener() {
        return ctx.tab.set("tracker");
      });
      \u0275\u0275text(52, "Payment Tracker");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(53, "button", 22);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_53_listener() {
        return ctx.tab.set("history");
      });
      \u0275\u0275text(54, "Payment History");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(55, "button", 22);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_55_listener() {
        return ctx.tab.set("reminders");
      });
      \u0275\u0275text(56, "Reminders");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(57, PaymentsComponent_Conditional_57_Template, 10, 2)(58, PaymentsComponent_Conditional_58_Template, 10, 2)(59, PaymentsComponent_Conditional_59_Template, 3, 1);
      \u0275\u0275elementStart(60, "app-modal", 23);
      \u0275\u0275listener("close", function PaymentsComponent_Template_app_modal_close_60_listener() {
        return ctx.payInvoice.set(null);
      });
      \u0275\u0275template(61, PaymentsComponent_Conditional_61_Template, 31, 10);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(62, "app-modal", 24);
      \u0275\u0275listener("close", function PaymentsComponent_Template_app_modal_close_62_listener() {
        return ctx.remindInvoice.set(null);
      });
      \u0275\u0275template(63, PaymentsComponent_Conditional_63_Template, 34, 9);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(64, "app-modal", 25);
      \u0275\u0275listener("close", function PaymentsComponent_Template_app_modal_close_64_listener() {
        return ctx.confirmRemindAll.set(false);
      });
      \u0275\u0275elementStart(65, "p", 26);
      \u0275\u0275text(66, " Sends a reminder email to every client with a pending, partial or overdue invoice (");
      \u0275\u0275elementStart(67, "strong", 27);
      \u0275\u0275text(68);
      \u0275\u0275elementEnd();
      \u0275\u0275text(69);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(70, "div", 28)(71, "button", 29);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_71_listener() {
        return ctx.confirmRemindAll.set(false);
      });
      \u0275\u0275text(72, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(73, "button", 30);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_73_listener() {
        return ctx.remindAll();
      });
      \u0275\u0275text(74);
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_22_0;
      let tmp_25_0;
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.exporting());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.exporting() ? 2 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("size", 13);
      \u0275\u0275advance(9);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.totalCollected()));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate2("", ctx.successCount(), " successful payment", ctx.successCount() === 1 ? "" : "s", "");
      \u0275\u0275advance(7);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.pendingAmount()));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate2("", ctx.pendingInvoices().length, " open invoice", ctx.pendingInvoices().length === 1 ? "" : "s", "");
      \u0275\u0275advance(7);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.overdueAmount()));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate2("", ctx.overdueInvoices().length, " invoice", ctx.overdueInvoices().length === 1 ? "" : "s", " past due");
      \u0275\u0275advance(7);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", ctx.avgCollectionDays() === null ? "\u2014" : ctx.avgCollectionDays() + " days", " ");
      \u0275\u0275advance(4);
      \u0275\u0275classProp("active", ctx.tab() === "tracker");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "history");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "reminders");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.tab() === "tracker" ? 57 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.tab() === "history" ? 58 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.tab() === "reminders" ? 59 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.payInvoice())("width", 440);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_22_0 = ctx.payInvoice()) ? 61 : -1, tmp_22_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.remindInvoice())("width", 520);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_25_0 = ctx.remindInvoice()) ? 63 : -1, tmp_25_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", ctx.confirmRemindAll());
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(ctx.dueInvoices().length);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" invoice", ctx.dueInvoices().length === 1 ? "" : "s", "). Invoices without a client email on file are skipped. ");
      \u0275\u0275advance(4);
      \u0275\u0275property("disabled", ctx.remindingAll());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.remindingAll() ? "Sending\u2026" : "Send Reminders", " ");
    }
  }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, NgModel, NgForm, AppShellComponent, IconComponent, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PaymentsComponent, { className: "PaymentsComponent", filePath: "src\\app\\features\\payments\\payments.component.ts", lineNumber: 351 });
})();
export {
  PaymentsComponent
};
//# sourceMappingURL=chunk-WN54YA6J.js.map
