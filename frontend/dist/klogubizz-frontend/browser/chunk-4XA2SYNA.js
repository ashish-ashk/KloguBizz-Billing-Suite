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
} from "./chunk-I22U2CHU.js";
import {
  AppShellComponent
} from "./chunk-NTKKMEPP.js";
import "./chunk-XXTTC3T3.js";
import "./chunk-D76BFOPY.js";
import {
  AvatarComponent,
  EmptyStateComponent,
  ModalComponent,
  PillComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  daysBetween,
  downloadBlob,
  fmtDate,
  fmtINR
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  AuthService
} from "./chunk-AGABJEXX.js";
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
} from "./chunk-KLA3EWNB.js";

// src/app/features/payments/payments.component.ts
var _forTrack0 = ($index, $item) => $item._id;
function PaymentsComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function PaymentsComponent_Conditional_56_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 31);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function PaymentsComponent_Conditional_56_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 32);
  }
}
function PaymentsComponent_Conditional_56_Conditional_3_For_21_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 42);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("+", ctx_r2.overdueDays(inv_r2), "d overdue");
  }
}
function PaymentsComponent_Conditional_56_Conditional_3_For_21_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 43);
    \u0275\u0275text(1, "Due today");
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_56_Conditional_3_For_21_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 44);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", -ctx_r2.overdueDays(inv_r2), " days left");
  }
}
function PaymentsComponent_Conditional_56_Conditional_3_For_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td", 36);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td")(4, "div", 37);
    \u0275\u0275element(5, "app-avatar", 38);
    \u0275\u0275elementStart(6, "div")(7, "div", 39);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 40);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(11, "td");
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td");
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td", 39);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td");
    \u0275\u0275element(18, "app-pill", 41);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "td");
    \u0275\u0275template(20, PaymentsComponent_Conditional_56_Conditional_3_For_21_Conditional_20_Template, 2, 1, "span", 42)(21, PaymentsComponent_Conditional_56_Conditional_3_For_21_Conditional_21_Template, 2, 0, "span", 43)(22, PaymentsComponent_Conditional_56_Conditional_3_For_21_Conditional_22_Template, 2, 1, "span", 44);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "td")(24, "div", 45)(25, "button", 46);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_56_Conditional_3_For_21_Template_button_click_25_listener() {
      const inv_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.openPay(inv_r2));
    });
    \u0275\u0275text(26, "Record Payment");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "button", 47);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_56_Conditional_3_For_21_Template_button_click_27_listener() {
      const inv_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.openRemind(inv_r2));
    });
    \u0275\u0275text(28, "\u{1F4E7} Remind");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const inv_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("row-danger", inv_r2.status === "overdue");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(inv_r2.invoiceNumber);
    \u0275\u0275advance(3);
    \u0275\u0275property("name", ctx_r2.clientName(inv_r2.clientId))("size", 30);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.clientName(inv_r2.clientId));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.clientEmail(inv_r2.clientId) || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(inv_r2.date));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(inv_r2.dueDate));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtINR(inv_r2.totals.total));
    \u0275\u0275advance(2);
    \u0275\u0275property("status", inv_r2.status);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.overdueDays(inv_r2) > 0 ? 20 : ctx_r2.overdueDays(inv_r2) === 0 ? 21 : 22);
  }
}
function PaymentsComponent_Conditional_56_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 33)(1, "table", 34)(2, "thead")(3, "tr")(4, "th");
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
    \u0275\u0275repeaterCreate(20, PaymentsComponent_Conditional_56_Conditional_3_For_21_Template, 29, 12, "tr", 35, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(20);
    \u0275\u0275repeater(ctx_r2.dueInvoices());
  }
}
function PaymentsComponent_Conditional_56_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275template(1, PaymentsComponent_Conditional_56_Conditional_1_Template, 1, 1, "app-skeleton-rows", 31)(2, PaymentsComponent_Conditional_56_Conditional_2_Template, 1, 0, "app-empty-state", 32)(3, PaymentsComponent_Conditional_56_Conditional_3_Template, 22, 0, "div", 33);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.loading() ? 1 : ctx_r2.dueInvoices().length === 0 ? 2 : 3);
  }
}
function PaymentsComponent_Conditional_57_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 31);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function PaymentsComponent_Conditional_57_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 48);
  }
}
function PaymentsComponent_Conditional_57_Conditional_3_For_22_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 51);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r4.reference);
  }
}
function PaymentsComponent_Conditional_57_Conditional_3_For_22_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 52);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_57_Conditional_3_For_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 36);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 49);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td")(10, "span", 50);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "td");
    \u0275\u0275template(13, PaymentsComponent_Conditional_57_Conditional_3_For_22_Conditional_13_Template, 2, 1, "span", 51)(14, PaymentsComponent_Conditional_57_Conditional_3_For_22_Conditional_14_Template, 2, 0, "span", 52);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td");
    \u0275\u0275element(16, "app-pill", 41);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 52);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const p_r4 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(p_r4.date));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.invoiceNo(p_r4));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.clientName(p_r4.clientId));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtINR(p_r4.amount));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(p_r4.method);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(p_r4.reference ? 13 : 14);
    \u0275\u0275advance(3);
    \u0275\u0275property("status", p_r4.status);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(p_r4.note || "\u2014");
  }
}
function PaymentsComponent_Conditional_57_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 33)(1, "table", 34)(2, "thead")(3, "tr")(4, "th");
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
    \u0275\u0275repeaterCreate(21, PaymentsComponent_Conditional_57_Conditional_3_For_22_Template, 19, 8, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(21);
    \u0275\u0275repeater(ctx_r2.sortedPayments());
  }
}
function PaymentsComponent_Conditional_57_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275template(1, PaymentsComponent_Conditional_57_Conditional_1_Template, 1, 1, "app-skeleton-rows", 31)(2, PaymentsComponent_Conditional_57_Conditional_2_Template, 1, 0, "app-empty-state", 48)(3, PaymentsComponent_Conditional_57_Conditional_3_Template, 23, 0, "div", 33);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.loading() ? 1 : ctx_r2.payments().length === 0 ? 2 : 3);
  }
}
function PaymentsComponent_Conditional_58_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275element(1, "app-skeleton-rows", 31);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 4);
  }
}
function PaymentsComponent_Conditional_58_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275element(1, "app-empty-state", 53);
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_58_Conditional_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function PaymentsComponent_Conditional_58_Conditional_2_For_6_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r7 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("+", ctx_r2.overdueDays(inv_r7), "d overdue");
  }
}
function PaymentsComponent_Conditional_58_Conditional_2_For_6_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 43);
    \u0275\u0275text(1, "Due today");
    \u0275\u0275elementEnd();
  }
}
function PaymentsComponent_Conditional_58_Conditional_2_For_6_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 66);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const inv_r7 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", -ctx_r2.overdueDays(inv_r7), "d left");
  }
}
function PaymentsComponent_Conditional_58_Conditional_2_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57)(1, "div", 58);
    \u0275\u0275element(2, "app-avatar", 38);
    \u0275\u0275elementStart(3, "div", 59)(4, "div", 60);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 61);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275element(8, "app-pill", 41);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 62)(10, "div")(11, "div", 63);
    \u0275\u0275text(12, "Invoice #");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 64);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div")(16, "div", 63);
    \u0275\u0275text(17, "Amount Due");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 65);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div")(21, "div", 63);
    \u0275\u0275text(22, "Due Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div");
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div")(26, "div", 63);
    \u0275\u0275text(27, "Days");
    \u0275\u0275elementEnd();
    \u0275\u0275template(28, PaymentsComponent_Conditional_58_Conditional_2_For_6_Conditional_28_Template, 2, 1, "div", 42)(29, PaymentsComponent_Conditional_58_Conditional_2_For_6_Conditional_29_Template, 2, 0, "div", 43)(30, PaymentsComponent_Conditional_58_Conditional_2_For_6_Conditional_30_Template, 2, 1, "div", 66);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(31, "div", 67)(32, "button", 68);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_58_Conditional_2_For_6_Template_button_click_32_listener() {
      const inv_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.openRemind(inv_r7));
    });
    \u0275\u0275text(33, "\u{1F4E7} Send Reminder");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "button", 69);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_58_Conditional_2_For_6_Template_button_click_34_listener() {
      const inv_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.openPay(inv_r7));
    });
    \u0275\u0275text(35, "Record Payment");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const inv_r7 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275property("name", ctx_r2.clientName(inv_r7.clientId))("size", 36);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.clientName(inv_r7.clientId));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.clientEmail(inv_r7.clientId) || "No email on file", " ");
    \u0275\u0275advance();
    \u0275\u0275property("status", inv_r7.status);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(inv_r7.invoiceNumber);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.fmtINR(ctx_r2.remainingFor(inv_r7)));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(inv_r7.dueDate));
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r2.overdueDays(inv_r7) > 0 ? 28 : ctx_r2.overdueDays(inv_r7) === 0 ? 29 : 30);
  }
}
function PaymentsComponent_Conditional_58_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 54)(1, "button", 55);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_58_Conditional_2_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.confirmRemindAll.set(true));
    });
    \u0275\u0275template(2, PaymentsComponent_Conditional_58_Conditional_2_Conditional_2_Template, 1, 0, "span", 2);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 56);
    \u0275\u0275repeaterCreate(5, PaymentsComponent_Conditional_58_Conditional_2_For_6_Template, 36, 9, "div", 57, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.remindingAll());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.remindingAll() ? 2 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u{1F4E7} Remind All (", ctx_r2.dueInvoices().length, ") ");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r2.dueInvoices());
  }
}
function PaymentsComponent_Conditional_58_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, PaymentsComponent_Conditional_58_Conditional_0_Template, 2, 1, "div", 22)(1, PaymentsComponent_Conditional_58_Conditional_1_Template, 2, 0, "div", 22)(2, PaymentsComponent_Conditional_58_Conditional_2_Template, 7, 3);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r2.loading() ? 0 : ctx_r2.dueInvoices().length === 0 ? 1 : 2);
  }
}
function PaymentsComponent_Conditional_60_For_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 75);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const m_r9 = ctx.$implicit;
    \u0275\u0275property("value", m_r9);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(m_r9);
  }
}
function PaymentsComponent_Conditional_60_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 70)(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "br");
    \u0275\u0275elementStart(4, "span", 51);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "form", 71);
    \u0275\u0275listener("ngSubmit", function PaymentsComponent_Conditional_60_Template_form_ngSubmit_7_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.savePayment());
    });
    \u0275\u0275elementStart(8, "div", 72)(9, "label");
    \u0275\u0275text(10, "Amount Received (\u20B9)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "input", 73);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_60_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.payAmount, $event) || (ctx_r2.payAmount = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 72)(13, "label");
    \u0275\u0275text(14, "Payment Method");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "select", 74);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_60_Template_select_ngModelChange_15_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.payMethod, $event) || (ctx_r2.payMethod = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(16, PaymentsComponent_Conditional_60_For_17_Template, 2, 2, "option", 75, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 72)(19, "label");
    \u0275\u0275text(20, "Transaction Reference");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "input", 76);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_60_Template_input_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.payReference, $event) || (ctx_r2.payReference = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div", 72)(23, "label");
    \u0275\u0275text(24, "Note");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "textarea", 77);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentsComponent_Conditional_60_Template_textarea_ngModelChange_25_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.payNote, $event) || (ctx_r2.payNote = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 28)(27, "button", 29);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_60_Template_button_click_27_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.payInvoice.set(null));
    });
    \u0275\u0275text(28, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "button", 78);
    \u0275\u0275text(30);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const inv_r10 = ctx;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.clientName(inv_r10.clientId));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(inv_r10.invoiceNumber);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" \xB7 Due ", ctx_r2.fmtDate(inv_r10.dueDate), " \xB7 ", ctx_r2.fmtINR(inv_r10.totals.total), " ");
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.payAmount);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.payMethod);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.methods);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.payReference);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.payNote);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r2.savingPay() || !ctx_r2.payAmount || ctx_r2.payAmount <= 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.savingPay() ? "Saving\u2026" : "Record Payment", " ");
  }
}
function PaymentsComponent_Conditional_62_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " was due on ");
    \u0275\u0275elementStart(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
  }
  if (rf & 2) {
    const inv_r12 = \u0275\u0275nextContext();
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(inv_r12.dueDate));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" and is now ", ctx_r2.overdueDays(inv_r12), " day(s) overdue. ");
  }
}
function PaymentsComponent_Conditional_62_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " is due on ");
    \u0275\u0275elementStart(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, ". ");
  }
  if (rf & 2) {
    const inv_r12 = \u0275\u0275nextContext();
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(inv_r12.dueDate));
  }
}
function PaymentsComponent_Conditional_62_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 79)(1, "div", 80)(2, "strong");
    \u0275\u0275text(3, "To:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 81)(6, "strong");
    \u0275\u0275text(7, "Subject:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 82);
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
    \u0275\u0275template(19, PaymentsComponent_Conditional_62_Conditional_19_Template, 4, 2)(20, PaymentsComponent_Conditional_62_Conditional_20_Template, 4, 1);
    \u0275\u0275element(21, "br")(22, "br");
    \u0275\u0275text(23, " We would appreciate payment at your earliest convenience.");
    \u0275\u0275element(24, "br")(25, "br");
    \u0275\u0275text(26, " Warm regards,");
    \u0275\u0275element(27, "br");
    \u0275\u0275text(28);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "div", 28)(30, "button", 29);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_62_Template_button_click_30_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.remindInvoice.set(null));
    });
    \u0275\u0275text(31, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "button", 30);
    \u0275\u0275listener("click", function PaymentsComponent_Conditional_62_Template_button_click_32_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.sendReminder());
    });
    \u0275\u0275text(33);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const inv_r12 = ctx;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r2.clientEmail(inv_r12.clientId) || "\u2014 no email on file \u2014", " ");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" Payment reminder \u2014 Invoice ", inv_r12.invoiceNumber, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" Dear ", ctx_r2.clientName(inv_r12.clientId), ",");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(inv_r12.invoiceNumber);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.fmtINR(inv_r12.totals.total));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.overdueDays(inv_r12) > 0 ? 19 : 20);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate1("", ctx_r2.orgName(), " ");
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r2.sendingReminder());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.sendingReminder() ? "Sending\u2026" : "Send Reminder", " ");
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
  constructor(api, toast, auth) {
    this.api = api;
    this.toast = toast;
    this.auth = auth;
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
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _PaymentsComponent, selectors: [["app-payments"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 74, vars: 32, consts: [["title", "Payments", "subtitle", "Track collections, reminders and history"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], [1, "spinner"], [1, "grid", "grid-4", 2, "margin-bottom", "20px"], [1, "card", "metric"], [1, "accent", 2, "background", "var(--green)"], [1, "metric-row"], [1, "label"], [1, "m-icon", 2, "background", "var(--green-bg)"], [1, "value", 2, "color", "var(--green)"], [1, "sub"], [1, "accent", 2, "background", "var(--amber)"], [1, "m-icon", 2, "background", "var(--amber-bg)"], [1, "value"], [1, "accent", 2, "background", "var(--red)"], [1, "m-icon", 2, "background", "var(--red-bg)"], [1, "value", 2, "color", "var(--red)"], [1, "accent", 2, "background", "var(--brand)"], [1, "m-icon"], [1, "value", 2, "color", "var(--brand)"], [1, "tabs", 2, "margin-bottom", "16px"], ["type", "button", 3, "click"], [1, "card", "flush"], ["title", "Record Payment", 3, "close", "open", "width"], ["title", "Send Payment Reminder", 3, "close", "open", "width"], ["title", "Remind All", 3, "close", "open"], [2, "margin", "0", "color", "var(--muted)", "line-height", "1.6"], [2, "color", "var(--text)"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [3, "count"], ["icon", "\u2713", "title", "All invoices are paid \u{1F389}", "message", "No pending, partial or overdue invoices right now."], [1, "table-wrap"], [1, "table"], [3, "row-danger"], [1, "num"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [3, "name", "size"], [1, "strong"], [1, "muted", 2, "font-size", "11.5px"], [3, "status"], [2, "color", "var(--red)", "font-weight", "700"], [2, "color", "var(--amber)", "font-weight", "600"], [2, "color", "var(--green)"], [1, "actions"], ["type", "button", 1, "btn", "primary", "sm", 3, "click"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], ["icon", "\u25C8", "title", "No payments recorded yet", "message", "Payments you record will show up here."], [1, "strong", 2, "color", "var(--green)"], [1, "pill"], [1, "mono"], [1, "muted"], ["icon", "\u{1F4E7}", "title", "No pending invoices requiring reminders", "message", "You are all caught up."], [2, "display", "flex", "justify-content", "flex-end", "margin-bottom", "14px"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click", "disabled"], [1, "grid", "grid-2"], [1, "card"], [2, "display", "flex", "align-items", "center", "gap", "10px", "margin-bottom", "14px"], [2, "flex", "1", "min-width", "0"], [2, "font-weight", "700", "overflow", "hidden", "text-overflow", "ellipsis", "white-space", "nowrap"], [2, "font-size", "11.5px", "color", "var(--muted)", "overflow", "hidden", "text-overflow", "ellipsis", "white-space", "nowrap"], [1, "grid", "grid-2", 2, "gap", "10px", "margin-bottom", "16px"], [2, "font-size", "10.5px", "font-weight", "600", "text-transform", "uppercase", "letter-spacing", ".5px", "color", "var(--faint)"], [1, "mono", 2, "font-weight", "600", "color", "var(--brand)"], [2, "font-weight", "700"], [2, "color", "var(--green)", "font-weight", "600"], [2, "display", "flex", "gap", "8px"], ["type", "button", 1, "btn", "primary", "sm", 2, "flex", "1", 3, "click"], ["type", "button", 1, "btn", "success", "sm", 3, "click"], [1, "info-box", 2, "margin-bottom", "16px"], [1, "form", 3, "ngSubmit"], [1, "field"], ["name", "amount", "type", "number", "min", "0", "step", "0.01", 3, "ngModelChange", "ngModel"], ["name", "method", 3, "ngModelChange", "ngModel"], [3, "value"], ["name", "reference", "placeholder", "UTR / transaction ID (optional)", 3, "ngModelChange", "ngModel"], ["name", "note", "rows", "2", "placeholder", "Optional note", 3, "ngModelChange", "ngModel"], ["type", "submit", 1, "btn", "primary", 3, "disabled"], [2, "background", "var(--bg)", "border", "1px solid var(--border)", "border-radius", "10px", "padding", "16px 18px"], [2, "font-size", "12px", "color", "var(--muted)", "margin-bottom", "4px"], [2, "font-size", "12px", "color", "var(--muted)", "margin-bottom", "12px", "padding-bottom", "10px", "border-bottom", "1px solid var(--border)"], [2, "font-family", "Georgia,'Times New Roman',serif", "font-size", "13.5px", "line-height", "1.7", "color", "var(--text)"]], template: function PaymentsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_1_listener() {
        return ctx.exportCsv();
      });
      \u0275\u0275template(2, PaymentsComponent_Conditional_2_Template, 1, 0, "span", 2);
      \u0275\u0275text(3, " \u2B07 Export CSV ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "div", 3)(5, "div", 4);
      \u0275\u0275element(6, "div", 5);
      \u0275\u0275elementStart(7, "div", 6)(8, "span", 7);
      \u0275\u0275text(9, "Total Collected");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(10, "span", 8);
      \u0275\u0275text(11, "\u20B9");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(12, "div", 9);
      \u0275\u0275text(13);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "div", 10);
      \u0275\u0275text(15);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(16, "div", 4);
      \u0275\u0275element(17, "div", 11);
      \u0275\u0275elementStart(18, "div", 6)(19, "span", 7);
      \u0275\u0275text(20, "Pending Amount");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(21, "span", 12);
      \u0275\u0275text(22, "\u25D4");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(23, "div", 13);
      \u0275\u0275text(24);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(25, "div", 10);
      \u0275\u0275text(26);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(27, "div", 4);
      \u0275\u0275element(28, "div", 14);
      \u0275\u0275elementStart(29, "div", 6)(30, "span", 7);
      \u0275\u0275text(31, "Overdue Amount");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(32, "span", 15);
      \u0275\u0275text(33, "\u26A0");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(34, "div", 16);
      \u0275\u0275text(35);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "div", 10);
      \u0275\u0275text(37);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(38, "div", 4);
      \u0275\u0275element(39, "div", 17);
      \u0275\u0275elementStart(40, "div", 6)(41, "span", 7);
      \u0275\u0275text(42, "Avg. Collection");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(43, "span", 18);
      \u0275\u0275text(44, "\u25F7");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(45, "div", 19);
      \u0275\u0275text(46);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(47, "div", 10);
      \u0275\u0275text(48, "Invoice date to payment date");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(49, "div", 20)(50, "button", 21);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_50_listener() {
        return ctx.tab.set("tracker");
      });
      \u0275\u0275text(51, "Payment Tracker");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(52, "button", 21);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_52_listener() {
        return ctx.tab.set("history");
      });
      \u0275\u0275text(53, "Payment History");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(54, "button", 21);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_54_listener() {
        return ctx.tab.set("reminders");
      });
      \u0275\u0275text(55, "Reminders");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(56, PaymentsComponent_Conditional_56_Template, 4, 1, "div", 22)(57, PaymentsComponent_Conditional_57_Template, 4, 1, "div", 22)(58, PaymentsComponent_Conditional_58_Template, 3, 1);
      \u0275\u0275elementStart(59, "app-modal", 23);
      \u0275\u0275listener("close", function PaymentsComponent_Template_app_modal_close_59_listener() {
        return ctx.payInvoice.set(null);
      });
      \u0275\u0275template(60, PaymentsComponent_Conditional_60_Template, 31, 10);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "app-modal", 24);
      \u0275\u0275listener("close", function PaymentsComponent_Template_app_modal_close_61_listener() {
        return ctx.remindInvoice.set(null);
      });
      \u0275\u0275template(62, PaymentsComponent_Conditional_62_Template, 34, 9);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "app-modal", 25);
      \u0275\u0275listener("close", function PaymentsComponent_Template_app_modal_close_63_listener() {
        return ctx.confirmRemindAll.set(false);
      });
      \u0275\u0275elementStart(64, "p", 26);
      \u0275\u0275text(65, " Sends a reminder email to every client with a pending, partial or overdue invoice (");
      \u0275\u0275elementStart(66, "strong", 27);
      \u0275\u0275text(67);
      \u0275\u0275elementEnd();
      \u0275\u0275text(68);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(69, "div", 28)(70, "button", 29);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_70_listener() {
        return ctx.confirmRemindAll.set(false);
      });
      \u0275\u0275text(71, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(72, "button", 30);
      \u0275\u0275listener("click", function PaymentsComponent_Template_button_click_72_listener() {
        return ctx.remindAll();
      });
      \u0275\u0275text(73);
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_17_0;
      let tmp_20_0;
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.exporting());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.exporting() ? 2 : -1);
      \u0275\u0275advance(11);
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.totalCollected()));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate2("", ctx.successCount(), " successful payment", ctx.successCount() === 1 ? "" : "s", "");
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.pendingAmount()));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate2("", ctx.pendingInvoices().length, " open invoice", ctx.pendingInvoices().length === 1 ? "" : "s", "");
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.overdueAmount()));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate2("", ctx.overdueInvoices().length, " invoice", ctx.overdueInvoices().length === 1 ? "" : "s", " past due");
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate1(" ", ctx.avgCollectionDays() === null ? "\u2014" : ctx.avgCollectionDays() + " days", " ");
      \u0275\u0275advance(4);
      \u0275\u0275classProp("active", ctx.tab() === "tracker");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "history");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "reminders");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.tab() === "tracker" ? 56 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.tab() === "history" ? 57 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.tab() === "reminders" ? 58 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.payInvoice())("width", 440);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_17_0 = ctx.payInvoice()) ? 60 : -1, tmp_17_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.remindInvoice())("width", 520);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_20_0 = ctx.remindInvoice()) ? 62 : -1, tmp_20_0);
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
  }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, NgModel, NgForm, AppShellComponent, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PaymentsComponent, { className: "PaymentsComponent", filePath: "src\\app\\features\\payments\\payments.component.ts", lineNumber: 328 });
})();
export {
  PaymentsComponent
};
//# sourceMappingURL=chunk-4XA2SYNA.js.map
