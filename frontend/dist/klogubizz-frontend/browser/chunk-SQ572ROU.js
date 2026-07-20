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
  STATES,
  fmtDate,
  fmtINR,
  isValidEmail,
  stateName
} from "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-XAFCZYPI.js";
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
  ɵɵclassMap,
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

// src/app/features/super-admin/organisations.component.ts
var _forTrack0 = ($index, $item) => $item.code;
var _forTrack1 = ($index, $item) => $item._id;
function SuperOrganisationsComponent_Conditional_70_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 26);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function SuperOrganisationsComponent_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 27);
  }
}
function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 86);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_31_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const o_r3 = \u0275\u0275nextContext().$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.askStatus(o_r3, "suspend"));
    });
    \u0275\u0275text(1, "Suspend");
    \u0275\u0275elementEnd();
  }
}
function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 87);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_32_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const o_r3 = \u0275\u0275nextContext().$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.askStatus(o_r3, "activate"));
    });
    \u0275\u0275text(1, "Activate");
    \u0275\u0275elementEnd();
  }
}
function SuperOrganisationsComponent_Conditional_72_For_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td", 66)(2, "div", 67);
    \u0275\u0275element(3, "app-avatar", 68);
    \u0275\u0275elementStart(4, "div")(5, "div", 69);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 70);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(9, "td", 71)(10, "div");
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 72);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "td", 73)(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "td", 74);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "td", 75);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "td", 76);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "td", 77);
    \u0275\u0275element(24, "app-pill", 78);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "td", 79)(26, "div", 80)(27, "button", 81);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Template_button_click_27_listener() {
      const o_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.openView(o_r3));
    });
    \u0275\u0275text(28, "View");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "button", 82);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Template_button_click_29_listener() {
      const o_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.openEdit(o_r3));
    });
    \u0275\u0275text(30, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275template(31, SuperOrganisationsComponent_Conditional_72_For_22_Conditional_31_Template, 2, 0, "button", 83)(32, SuperOrganisationsComponent_Conditional_72_For_22_Conditional_32_Template, 2, 0, "button", 84);
    \u0275\u0275elementStart(33, "button", 85);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Template_button_click_33_listener() {
      const o_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.askDelete(o_r3));
    });
    \u0275\u0275text(34, "\u2715");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const o_r3 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275property("name", o_r3.name)("size", 32);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r3.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r3.gstin || "\u2014");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((o_r3.admin == null ? null : o_r3.admin.name) || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((o_r3.admin == null ? null : o_r3.admin.email) || o_r3.adminEmail);
    \u0275\u0275advance(2);
    \u0275\u0275classMap("pill " + ctx_r3.planClass(o_r3.plan));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r3.planLabel(o_r3.plan));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r3.userCount);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r3.invoiceCount);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.fmtDate(o_r3.createdAt));
    \u0275\u0275advance(2);
    \u0275\u0275property("status", o_r3.status);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(o_r3.status !== "suspended" ? 31 : 32);
  }
}
function SuperOrganisationsComponent_Conditional_72_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 62)(1, "table", 63)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Organization");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Plan");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Users");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "Created");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "th");
    \u0275\u0275text(17, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "th", 64);
    \u0275\u0275text(19, "Actions");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(20, "tbody");
    \u0275\u0275repeaterCreate(21, SuperOrganisationsComponent_Conditional_72_For_22_Template, 35, 14, "tr", null, _forTrack1);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(23, "app-pager", 65);
    \u0275\u0275listener("pageChange", function SuperOrganisationsComponent_Conditional_72_Template_app_pager_pageChange_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.page.set($event));
    })("pageSizeChange", function SuperOrganisationsComponent_Conditional_72_Template_app_pager_pageSizeChange_23_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onPageSize($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance(21);
    \u0275\u0275repeater(ctx_r3.paged());
    \u0275\u0275advance(2);
    \u0275\u0275property("page", ctx_r3.page())("pageSize", ctx_r3.pageSize())("total", ctx_r3.filtered().length);
  }
}
function SuperOrganisationsComponent_Conditional_98_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275text(1, "Enter a valid email address");
    \u0275\u0275elementEnd();
  }
}
function SuperOrganisationsComponent_For_114_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 41);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r7 = ctx.$implicit;
    \u0275\u0275property("value", s_r7.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", s_r7.name, " (", s_r7.code, ")");
  }
}
function SuperOrganisationsComponent_For_120_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 41);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r8 = ctx.$implicit;
    \u0275\u0275property("value", p_r8.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r8.name);
  }
}
function SuperOrganisationsComponent_Conditional_129_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 46);
  }
}
function SuperOrganisationsComponent_For_178_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 41);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r9 = ctx.$implicit;
    \u0275\u0275property("value", s_r9.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", s_r9.name, " (", s_r9.code, ")");
  }
}
function SuperOrganisationsComponent_For_192_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 41);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r10 = ctx.$implicit;
    \u0275\u0275property("value", p_r10.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r10.name);
  }
}
function SuperOrganisationsComponent_Conditional_207_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 46);
  }
}
function SuperOrganisationsComponent_Conditional_210_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 88);
    \u0275\u0275element(1, "app-avatar", 68);
    \u0275\u0275elementStart(2, "div", 89)(3, "div", 90);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 91);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 92);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 50)(10, "div", 51)(11, "div", 52);
    \u0275\u0275text(12, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 93);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 51)(16, "div", 52);
    \u0275\u0275text(17, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 94);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 51)(21, "div", 52);
    \u0275\u0275text(22, "Phone");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 93);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 51)(26, "div", 52);
    \u0275\u0275text(27, "Plan");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 93);
    \u0275\u0275text(29);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 51)(31, "div", 52);
    \u0275\u0275text(32, "Users");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "div", 93);
    \u0275\u0275text(34);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(35, "div", 51)(36, "div", 52);
    \u0275\u0275text(37, "Invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "div", 93);
    \u0275\u0275text(39);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(40, "div", 51)(41, "div", 52);
    \u0275\u0275text(42, "Joined");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "div", 93);
    \u0275\u0275text(44);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(45, "div", 51)(46, "div", 52);
    \u0275\u0275text(47, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(48, "div", 95);
    \u0275\u0275element(49, "app-pill", 78);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(50, "div", 43)(51, "button", 44);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_210_Template_button_click_51_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.showView.set(false));
    });
    \u0275\u0275text(52, "Close");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const o_r12 = ctx;
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("name", o_r12.name)("size", 52);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r12.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r12.gstin || "No GSTIN");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r12.address || "\u2014");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate((o_r12.admin == null ? null : o_r12.admin.name) || "\u2014");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate((o_r12.admin == null ? null : o_r12.admin.email) || o_r12.adminEmail);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(o_r12.phone || "\u2014");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r3.planLabel(o_r12.plan));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(o_r12.userCount);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(o_r12.invoiceCount);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r3.fmtDate(o_r12.createdAt));
    \u0275\u0275advance(5);
    \u0275\u0275property("status", o_r12.status);
  }
}
function SuperOrganisationsComponent_Conditional_212_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 96);
    \u0275\u0275text(1, "Suspend ");
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, "? Their users will lose access until the organization is reactivated.");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const o_r14 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r14.name);
  }
}
function SuperOrganisationsComponent_Conditional_212_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 96);
    \u0275\u0275text(1, "Activate ");
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, "? Their users will regain full access.");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const o_r14 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r14.name);
  }
}
function SuperOrganisationsComponent_Conditional_212_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 99);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_212_Conditional_5_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.confirmStatus());
    });
    \u0275\u0275text(1, "Suspend");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", ctx_r3.saving());
  }
}
function SuperOrganisationsComponent_Conditional_212_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 100);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_212_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.confirmStatus());
    });
    \u0275\u0275text(1, "Activate");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", ctx_r3.saving());
  }
}
function SuperOrganisationsComponent_Conditional_212_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275template(0, SuperOrganisationsComponent_Conditional_212_Conditional_0_Template, 5, 1, "p", 96)(1, SuperOrganisationsComponent_Conditional_212_Conditional_1_Template, 5, 1, "p", 96);
    \u0275\u0275elementStart(2, "div", 43)(3, "button", 44);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_212_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.statusTarget.set(null));
    });
    \u0275\u0275text(4, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, SuperOrganisationsComponent_Conditional_212_Conditional_5_Template, 2, 1, "button", 97)(6, SuperOrganisationsComponent_Conditional_212_Conditional_6_Template, 2, 1, "button", 98);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r3.statusAction() === "suspend" ? 0 : 1);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r3.statusAction() === "suspend" ? 5 : 6);
  }
}
function SuperOrganisationsComponent_Conditional_214_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 101);
    \u0275\u0275element(1, "app-icon", 102);
    \u0275\u0275elementStart(2, "span")(3, "strong");
    \u0275\u0275text(4, "Permanent deletion");
    \u0275\u0275elementEnd();
    \u0275\u0275text(5, " \u2014 All data, invoices, and user accounts for this organization will be permanently deleted.");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "p", 103);
    \u0275\u0275text(7, "Are you sure you want to delete ");
    \u0275\u0275elementStart(8, "strong");
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275text(10, "?");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 43)(12, "button", 44);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_214_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.deleteTarget.set(null));
    });
    \u0275\u0275text(13, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 99);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_214_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.confirmDelete());
    });
    \u0275\u0275text(15, "Delete Permanently");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("size", 15);
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx.name);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r3.saving());
  }
}
var SuperOrganisationsComponent = class _SuperOrganisationsComponent {
  api;
  toast;
  loading = signal(true);
  saving = signal(false);
  overview = signal(null);
  orgs = signal([]);
  plans = signal([]);
  tab = signal("all");
  search = signal("");
  showAdd = signal(false);
  showEdit = signal(false);
  showView = signal(false);
  showCreds = signal(false);
  viewOrg = signal(null);
  statusTarget = signal(null);
  statusAction = signal("suspend");
  deleteTarget = signal(null);
  credEmail = signal("");
  credPassword = signal("");
  addForm = this.blankAddForm();
  editForm = { name: "", gstin: "", phone: "", stateCode: "", address: "", plan: "starter", status: "active" };
  editId = "";
  states = STATES;
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  isValidEmail = isValidEmail;
  filtered = computed(() => {
    const t = this.tab();
    const q = this.search().trim().toLowerCase();
    return this.orgs().filter((o) => {
      if (t !== "all" && o.status !== t)
        return false;
      if (!q)
        return true;
      return o.name.toLowerCase().includes(q) || (o.adminEmail || "").toLowerCase().includes(q) || (o.admin?.email || "").toLowerCase().includes(q) || (o.gstin || "").toLowerCase().includes(q);
    });
  });
  page = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  planOptions = computed(() => {
    const loaded = this.plans();
    if (loaded.length)
      return loaded.map((p) => ({ code: p.code, name: p.name }));
    return [
      { code: "starter", name: "Starter" },
      { code: "growth", name: "Growth" },
      { code: "business", name: "Business" },
      { code: "enterprise", name: "Enterprise" }
    ];
  });
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.load();
    this.api.superPlans().subscribe({ next: (p) => this.plans.set(p), error: () => {
    } });
  }
  load() {
    this.loading.set(true);
    forkJoin({ overview: this.api.superOverview(), orgs: this.api.superOrganisations() }).subscribe({
      next: (res) => {
        this.overview.set(res.overview);
        this.orgs.set(res.orgs);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  countOf(status) {
    return this.orgs().filter((o) => o.status === status).length;
  }
  onSearch(v) {
    this.search.set(v);
    this.page.set(1);
  }
  onTab(t) {
    this.tab.set(t);
    this.page.set(1);
  }
  onPageSize(v) {
    this.pageSize.set(v);
    this.page.set(1);
  }
  planClass(plan) {
    const map = { starter: "partial", growth: "", business: "purple", enterprise: "draft" };
    return map[plan] ?? "";
  }
  planLabel(plan) {
    const found = this.plans().find((p) => p.code === plan);
    if (found)
      return found.name;
    return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "\u2014";
  }
  blankAddForm() {
    return { name: "", gstin: "", adminName: "", adminEmail: "", phone: "", stateCode: "", address: "", plan: "starter" };
  }
  openAdd() {
    this.addForm = this.blankAddForm();
    this.showAdd.set(true);
  }
  canCreate() {
    return !!this.addForm.name.trim() && isValidEmail(this.addForm.adminEmail);
  }
  create() {
    if (!this.canCreate())
      return;
    this.saving.set(true);
    const f = this.addForm;
    const payload = {
      name: f.name.trim(),
      gstin: f.gstin.trim().toUpperCase(),
      adminName: f.adminName.trim(),
      adminEmail: f.adminEmail.trim().toLowerCase(),
      phone: f.phone.trim(),
      stateCode: f.stateCode,
      state: f.stateCode ? stateName(f.stateCode) : "",
      address: f.address.trim(),
      plan: f.plan
    };
    this.api.superCreateOrganisation(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.showAdd.set(false);
        this.credEmail.set(res.admin?.email || f.adminEmail.trim().toLowerCase());
        this.credPassword.set(res.tempPassword);
        this.showCreds.set(true);
        this.toast.success("Organization created");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  openEdit(o) {
    this.editId = o._id;
    this.editForm = {
      name: o.name,
      gstin: o.gstin || "",
      phone: o.phone || "",
      stateCode: o.stateCode || "",
      address: o.address || "",
      plan: o.plan,
      status: o.status
    };
    this.showEdit.set(true);
  }
  saveEdit() {
    if (!this.editForm.name.trim())
      return;
    this.saving.set(true);
    const f = this.editForm;
    this.api.superUpdateOrganisation(this.editId, {
      name: f.name.trim(),
      gstin: f.gstin.trim().toUpperCase(),
      phone: f.phone.trim(),
      stateCode: f.stateCode,
      state: f.stateCode ? stateName(f.stateCode) : "",
      address: f.address.trim(),
      plan: f.plan,
      status: f.status
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showEdit.set(false);
        this.toast.success("Organization updated");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  openView(o) {
    this.viewOrg.set(o);
    this.showView.set(true);
  }
  askStatus(o, action) {
    this.statusAction.set(action);
    this.statusTarget.set(o);
  }
  confirmStatus() {
    const o = this.statusTarget();
    if (!o)
      return;
    const next = this.statusAction() === "suspend" ? "suspended" : "active";
    this.saving.set(true);
    this.api.superUpdateOrganisation(o._id, { status: next }).subscribe({
      next: () => {
        this.saving.set(false);
        this.statusTarget.set(null);
        this.toast.success(next === "suspended" ? o.name + " suspended" : o.name + " activated");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  askDelete(o) {
    this.deleteTarget.set(o);
  }
  confirmDelete() {
    const o = this.deleteTarget();
    if (!o)
      return;
    this.saving.set(true);
    this.api.superDeleteOrganisation(o._id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.toast.info("Organization deleted");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function SuperOrganisationsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperOrganisationsComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperOrganisationsComponent, selectors: [["app-super-organisations"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 215, vars: 63, consts: [[1, "page-head"], [1, "page-actions"], ["type", "button", 1, "btn", "primary", 3, "click"], [1, "grid", "grid-5", 2, "margin-bottom", "20px"], [1, "card", "metric", "indigo"], [1, "accent"], [1, "metric-row"], [1, "label"], [1, "m-icon"], ["name", "package", 3, "size"], [1, "value"], [1, "card", "metric", "success"], ["name", "checkCircle", 3, "size"], [1, "card", "metric", "warning"], ["name", "clock", 3, "size"], [1, "card", "metric", "danger"], ["name", "ban", 3, "size"], [1, "card", "metric", "purple"], ["name", "rupee", 3, "size"], [1, "toolbar"], [1, "tabs"], ["type", "button", 3, "click"], [1, "search-box"], [1, "search-icon"], ["placeholder", "Search name, email or GSTIN", 1, "input", 3, "ngModelChange", "ngModel"], [1, "card", "flush"], [3, "count"], ["icon", "\u{1F3E2}", "title", "No organizations found", "message", "Try a different filter or add a new organization."], ["title", "Add Organization", 3, "close", "open", "width"], [1, "form-section"], [1, "form-section-title"], [1, "grid", "grid-2"], [1, "field"], ["placeholder", "Acme Traders Pvt Ltd", 3, "ngModelChange", "ngModel"], ["placeholder", "27AAAAA0000A1Z5", 1, "mono", 3, "ngModelChange", "ngModel"], ["placeholder", "Full name", 3, "ngModelChange", "ngModel"], ["type", "email", "placeholder", "admin@company.com", 3, "ngModelChange", "ngModel"], [1, "error"], ["placeholder", "+91 98xxxxxx00", 3, "ngModelChange", "ngModel"], [3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["placeholder", "Registered address", 3, "ngModelChange", "ngModel"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], ["title", "Organization Created", 3, "close", "open", "width"], [1, "info-box", "ok", 2, "margin-bottom", "14px", "display", "flex", "gap", "8px", "align-items", "flex-start"], ["name", "checkCircle", 2, "flex-shrink", "0", "margin-top", "1px", 3, "size"], [1, "grid", "grid-2", 2, "gap", "10px"], [1, "stat-block"], [1, "sb-label"], [1, "sb-value", "mono"], ["title", "Edit Organization", 3, "close", "open", "width"], [1, "mono", 3, "ngModelChange", "ngModel"], ["value", "active"], ["value", "trial"], ["value", "suspended"], ["title", "Organization Details", 3, "close", "open", "width"], [3, "close", "open", "title"], ["title", "Delete Organization", 3, "close", "open"], [1, "table-wrap"], [1, "table", "stack-mobile"], [2, "text-align", "right"], [3, "pageChange", "pageSizeChange", "page", "pageSize", "total"], ["data-label", "Organization"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [3, "name", "size"], [1, "strong"], [1, "muted", "mono", 2, "font-size", "11px"], ["data-label", "Admin"], [1, "muted", 2, "font-size", "11px"], ["data-label", "Plan"], ["data-label", "Users", 1, "num"], ["data-label", "Invoices", 1, "num"], ["data-label", "Created", 1, "muted"], ["data-label", "Status"], [3, "status"], ["data-label", ""], [1, "actions"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm"], ["type", "button", 1, "btn", "success", "sm"], ["type", "button", "aria-label", "Delete", 1, "btn", "danger", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"], ["type", "button", 1, "btn", "success", "sm", 3, "click"], [2, "background", "var(--brand-pale)", "border-radius", "12px", "padding", "16px", "display", "flex", "align-items", "center", "gap", "14px", "margin-bottom", "16px"], [2, "min-width", "0"], [2, "font-weight", "800", "font-size", "16px"], [1, "mono", 2, "font-size", "11px", "color", "var(--text-mid)"], [2, "font-size", "12px", "color", "var(--muted)", "margin-top", "2px"], [1, "sb-value"], [1, "sb-value", 2, "overflow", "hidden", "text-overflow", "ellipsis"], [2, "margin-top", "4px"], [2, "margin", "0 0 6px"], ["type", "button", 1, "btn", "danger", "solid", 3, "disabled"], ["type", "button", 1, "btn", "success", 3, "disabled"], ["type", "button", 1, "btn", "danger", "solid", 3, "click", "disabled"], ["type", "button", 1, "btn", "success", 3, "click", "disabled"], [1, "info-box", "danger", 2, "margin-bottom", "12px", "display", "flex", "gap", "8px", "align-items", "flex-start"], ["name", "alertTriangle", 2, "flex-shrink", "0", "margin-top", "1px", 3, "size"], [2, "margin", "0"]], template: function SuperOrganisationsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div")(2, "h1");
      \u0275\u0275text(3, "Organizations");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "p");
      \u0275\u0275text(5);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(6, "div", 1)(7, "button", 2);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_7_listener() {
        return ctx.openAdd();
      });
      \u0275\u0275text(8, "+ Add Organization");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(9, "section", 3)(10, "div", 4);
      \u0275\u0275element(11, "div", 5);
      \u0275\u0275elementStart(12, "div", 6)(13, "span", 7);
      \u0275\u0275text(14, "Total Orgs");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "span", 8);
      \u0275\u0275element(16, "app-icon", 9);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(17, "div", 10);
      \u0275\u0275text(18);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(19, "div", 11);
      \u0275\u0275element(20, "div", 5);
      \u0275\u0275elementStart(21, "div", 6)(22, "span", 7);
      \u0275\u0275text(23, "Active");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "span", 8);
      \u0275\u0275element(25, "app-icon", 12);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(26, "div", 10);
      \u0275\u0275text(27);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(28, "div", 13);
      \u0275\u0275element(29, "div", 5);
      \u0275\u0275elementStart(30, "div", 6)(31, "span", 7);
      \u0275\u0275text(32, "Trial");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "span", 8);
      \u0275\u0275element(34, "app-icon", 14);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(35, "div", 10);
      \u0275\u0275text(36);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(37, "div", 15);
      \u0275\u0275element(38, "div", 5);
      \u0275\u0275elementStart(39, "div", 6)(40, "span", 7);
      \u0275\u0275text(41, "Suspended");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "span", 8);
      \u0275\u0275element(43, "app-icon", 16);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(44, "div", 10);
      \u0275\u0275text(45);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(46, "div", 17);
      \u0275\u0275element(47, "div", 5);
      \u0275\u0275elementStart(48, "div", 6)(49, "span", 7);
      \u0275\u0275text(50, "Platform Revenue");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "span", 8);
      \u0275\u0275element(52, "app-icon", 18);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(53, "div", 10);
      \u0275\u0275text(54);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(55, "div", 19)(56, "div", 20)(57, "button", 21);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_57_listener() {
        return ctx.onTab("all");
      });
      \u0275\u0275text(58);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "button", 21);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_59_listener() {
        return ctx.onTab("active");
      });
      \u0275\u0275text(60);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "button", 21);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_61_listener() {
        return ctx.onTab("trial");
      });
      \u0275\u0275text(62);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "button", 21);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_63_listener() {
        return ctx.onTab("suspended");
      });
      \u0275\u0275text(64);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(65, "div", 22)(66, "span", 23);
      \u0275\u0275text(67, "\u2315");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(68, "input", 24);
      \u0275\u0275listener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_68_listener($event) {
        return ctx.onSearch($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(69, "div", 25);
      \u0275\u0275template(70, SuperOrganisationsComponent_Conditional_70_Template, 1, 1, "app-skeleton-rows", 26)(71, SuperOrganisationsComponent_Conditional_71_Template, 1, 0, "app-empty-state", 27)(72, SuperOrganisationsComponent_Conditional_72_Template, 24, 3);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(73, "app-modal", 28);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_73_listener() {
        return ctx.showAdd.set(false);
      });
      \u0275\u0275elementStart(74, "div", 29)(75, "div", 30);
      \u0275\u0275text(76, "Organization Details");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(77, "div", 31)(78, "div", 32)(79, "label");
      \u0275\u0275text(80, "Organization Name *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(81, "input", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_81_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.name, $event) || (ctx.addForm.name = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(82, "div", 32)(83, "label");
      \u0275\u0275text(84, "GSTIN");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(85, "input", 34);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_85_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.gstin, $event) || (ctx.addForm.gstin = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(86, "div", 29)(87, "div", 30);
      \u0275\u0275text(88, "Admin Contact");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(89, "div", 31)(90, "div", 32)(91, "label");
      \u0275\u0275text(92, "Admin Name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(93, "input", 35);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_93_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.adminName, $event) || (ctx.addForm.adminName = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(94, "div", 32)(95, "label");
      \u0275\u0275text(96, "Admin Email *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(97, "input", 36);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_97_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.adminEmail, $event) || (ctx.addForm.adminEmail = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(98, SuperOrganisationsComponent_Conditional_98_Template, 2, 0, "div", 37);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(99, "div", 32)(100, "label");
      \u0275\u0275text(101, "Phone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(102, "input", 38);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_102_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.phone, $event) || (ctx.addForm.phone = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(103, "div", 29)(104, "div", 30);
      \u0275\u0275text(105, "Location & Plan");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(106, "div", 31)(107, "div", 32)(108, "label");
      \u0275\u0275text(109, "State");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(110, "select", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_110_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.stateCode, $event) || (ctx.addForm.stateCode = $event);
        return $event;
      });
      \u0275\u0275elementStart(111, "option", 40);
      \u0275\u0275text(112, "Select state");
      \u0275\u0275elementEnd();
      \u0275\u0275repeaterCreate(113, SuperOrganisationsComponent_For_114_Template, 2, 3, "option", 41, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(115, "div", 32)(116, "label");
      \u0275\u0275text(117, "Plan");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(118, "select", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_118_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.plan, $event) || (ctx.addForm.plan = $event);
        return $event;
      });
      \u0275\u0275repeaterCreate(119, SuperOrganisationsComponent_For_120_Template, 2, 2, "option", 41, _forTrack0);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(121, "div", 32)(122, "label");
      \u0275\u0275text(123, "Address");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(124, "input", 42);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_124_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.address, $event) || (ctx.addForm.address = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(125, "div", 43)(126, "button", 44);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_126_listener() {
        return ctx.showAdd.set(false);
      });
      \u0275\u0275text(127, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(128, "button", 45);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_128_listener() {
        return ctx.create();
      });
      \u0275\u0275template(129, SuperOrganisationsComponent_Conditional_129_Template, 1, 0, "span", 46);
      \u0275\u0275text(130, " Create Organization ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(131, "app-modal", 47);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_131_listener() {
        return ctx.showCreds.set(false);
      });
      \u0275\u0275elementStart(132, "div", 48);
      \u0275\u0275element(133, "app-icon", 49);
      \u0275\u0275elementStart(134, "span");
      \u0275\u0275text(135, "Organization created. Share these credentials securely with the admin.");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(136, "div", 50)(137, "div", 51)(138, "div", 52);
      \u0275\u0275text(139, "Login Email");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(140, "div", 53);
      \u0275\u0275text(141);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(142, "div", 51)(143, "div", 52);
      \u0275\u0275text(144, "Temporary Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(145, "div", 53);
      \u0275\u0275text(146);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(147, "div", 43)(148, "button", 2);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_148_listener() {
        return ctx.showCreds.set(false);
      });
      \u0275\u0275text(149, "Done");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(150, "app-modal", 54);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_150_listener() {
        return ctx.showEdit.set(false);
      });
      \u0275\u0275elementStart(151, "div", 29)(152, "div", 30);
      \u0275\u0275text(153, "Organization Details");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(154, "div", 31)(155, "div", 32)(156, "label");
      \u0275\u0275text(157, "Organization Name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(158, "input", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_158_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.name, $event) || (ctx.editForm.name = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(159, "div", 32)(160, "label");
      \u0275\u0275text(161, "GSTIN");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(162, "input", 55);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_162_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.gstin, $event) || (ctx.editForm.gstin = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(163, "div", 32)(164, "label");
      \u0275\u0275text(165, "Phone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(166, "input", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_166_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.phone, $event) || (ctx.editForm.phone = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(167, "div", 29)(168, "div", 30);
      \u0275\u0275text(169, "Location");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(170, "div", 31)(171, "div", 32)(172, "label");
      \u0275\u0275text(173, "State");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(174, "select", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_174_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.stateCode, $event) || (ctx.editForm.stateCode = $event);
        return $event;
      });
      \u0275\u0275elementStart(175, "option", 40);
      \u0275\u0275text(176, "Select state");
      \u0275\u0275elementEnd();
      \u0275\u0275repeaterCreate(177, SuperOrganisationsComponent_For_178_Template, 2, 3, "option", 41, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(179, "div", 32)(180, "label");
      \u0275\u0275text(181, "Address");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(182, "input", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_182_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.address, $event) || (ctx.editForm.address = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(183, "div", 29)(184, "div", 30);
      \u0275\u0275text(185, "Plan & Status");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(186, "div", 31)(187, "div", 32)(188, "label");
      \u0275\u0275text(189, "Plan");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(190, "select", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_190_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.plan, $event) || (ctx.editForm.plan = $event);
        return $event;
      });
      \u0275\u0275repeaterCreate(191, SuperOrganisationsComponent_For_192_Template, 2, 2, "option", 41, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(193, "div", 32)(194, "label");
      \u0275\u0275text(195, "Status");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(196, "select", 39);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_196_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.status, $event) || (ctx.editForm.status = $event);
        return $event;
      });
      \u0275\u0275elementStart(197, "option", 56);
      \u0275\u0275text(198, "Active");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(199, "option", 57);
      \u0275\u0275text(200, "Trial");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(201, "option", 58);
      \u0275\u0275text(202, "Suspended");
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementStart(203, "div", 43)(204, "button", 44);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_204_listener() {
        return ctx.showEdit.set(false);
      });
      \u0275\u0275text(205, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(206, "button", 45);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_206_listener() {
        return ctx.saveEdit();
      });
      \u0275\u0275template(207, SuperOrganisationsComponent_Conditional_207_Template, 1, 0, "span", 46);
      \u0275\u0275text(208, " Save Changes ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(209, "app-modal", 59);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_209_listener() {
        return ctx.showView.set(false);
      });
      \u0275\u0275template(210, SuperOrganisationsComponent_Conditional_210_Template, 53, 13);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(211, "app-modal", 60);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_211_listener() {
        return ctx.statusTarget.set(null);
      });
      \u0275\u0275template(212, SuperOrganisationsComponent_Conditional_212_Template, 7, 2, "div", 43);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(213, "app-modal", 61);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_213_listener() {
        return ctx.deleteTarget.set(null);
      });
      \u0275\u0275template(214, SuperOrganisationsComponent_Conditional_214_Template, 16, 3);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_0_0;
      let tmp_2_0;
      let tmp_4_0;
      let tmp_6_0;
      let tmp_8_0;
      let tmp_10_0;
      let tmp_56_0;
      let tmp_59_0;
      let tmp_61_0;
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate2("", ((tmp_0_0 = ctx.overview()) == null ? null : tmp_0_0.organisations) || 0, " registered organizations \xB7 ", ((tmp_0_0 = ctx.overview()) == null ? null : tmp_0_0.active) || 0, " active");
      \u0275\u0275advance(11);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_2_0 = ctx.overview()) == null ? null : tmp_2_0.organisations) || 0);
      \u0275\u0275advance(7);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_4_0 = ctx.overview()) == null ? null : tmp_4_0.active) || 0);
      \u0275\u0275advance(7);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_6_0 = ctx.overview()) == null ? null : tmp_6_0.trial) || 0);
      \u0275\u0275advance(7);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_8_0 = ctx.overview()) == null ? null : tmp_8_0.suspended) || 0);
      \u0275\u0275advance(7);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.fmtINR(((tmp_10_0 = ctx.overview()) == null ? null : tmp_10_0.totalRevenue) || 0, true));
      \u0275\u0275advance(3);
      \u0275\u0275classProp("active", ctx.tab() === "all");
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1("All (", ctx.orgs().length, ")");
      \u0275\u0275advance();
      \u0275\u0275classProp("active", ctx.tab() === "active");
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1("Active (", ctx.countOf("active"), ")");
      \u0275\u0275advance();
      \u0275\u0275classProp("active", ctx.tab() === "trial");
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1("Trial (", ctx.countOf("trial"), ")");
      \u0275\u0275advance();
      \u0275\u0275classProp("active", ctx.tab() === "suspended");
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1("Suspended (", ctx.countOf("suspended"), ")");
      \u0275\u0275advance(4);
      \u0275\u0275property("ngModel", ctx.search());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 70 : !ctx.filtered().length ? 71 : 72);
      \u0275\u0275advance(3);
      \u0275\u0275property("open", ctx.showAdd())("width", 580);
      \u0275\u0275advance(8);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.name);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.gstin);
      \u0275\u0275advance(8);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.adminName);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.adminEmail);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.addForm.adminEmail && !ctx.isValidEmail(ctx.addForm.adminEmail) ? 98 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.phone);
      \u0275\u0275advance(8);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.stateCode);
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.states);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.plan);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.planOptions());
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.address);
      \u0275\u0275advance(4);
      \u0275\u0275property("disabled", ctx.saving() || !ctx.canCreate());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 129 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.showCreds())("width", 480);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(8);
      \u0275\u0275textInterpolate(ctx.credEmail());
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(ctx.credPassword());
      \u0275\u0275advance(4);
      \u0275\u0275property("open", ctx.showEdit())("width", 580);
      \u0275\u0275advance(8);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.name);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.gstin);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.phone);
      \u0275\u0275advance(8);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.stateCode);
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.states);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.address);
      \u0275\u0275advance(8);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.plan);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.planOptions());
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.status);
      \u0275\u0275advance(10);
      \u0275\u0275property("disabled", ctx.saving() || !ctx.editForm.name.trim());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 207 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.showView())("width", 520);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_56_0 = ctx.viewOrg()) ? 210 : -1, tmp_56_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.statusTarget())("title", ctx.statusAction() === "suspend" ? "Suspend Organization" : "Activate Organization");
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_59_0 = ctx.statusTarget()) ? 212 : -1, tmp_59_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.deleteTarget());
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_61_0 = ctx.deleteTarget()) ? 214 : -1, tmp_61_0);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, IconComponent, PagerComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperOrganisationsComponent, { className: "SuperOrganisationsComponent", filePath: "src\\app\\features\\super-admin\\organisations.component.ts", lineNumber: 370 });
})();
export {
  SuperOrganisationsComponent
};
//# sourceMappingURL=chunk-SQ572ROU.js.map
