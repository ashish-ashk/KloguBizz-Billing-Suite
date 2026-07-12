import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-I22U2CHU.js";
import {
  AvatarComponent,
  EmptyStateComponent,
  ModalComponent,
  PillComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  STATES,
  fmtDate,
  fmtINR,
  isValidEmail,
  stateName
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
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
} from "./chunk-KLA3EWNB.js";

// src/app/features/super-admin/organisations.component.ts
var _forTrack0 = ($index, $item) => $item.code;
var _forTrack1 = ($index, $item) => $item._id;
function SuperOrganisationsComponent_Conditional_70_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 21);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function SuperOrganisationsComponent_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 22);
  }
}
function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 72);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_31_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const o_r2 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.askStatus(o_r2, "suspend"));
    });
    \u0275\u0275text(1, "Suspend");
    \u0275\u0275elementEnd();
  }
}
function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 73);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Conditional_32_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const o_r2 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.askStatus(o_r2, "activate"));
    });
    \u0275\u0275text(1, "Activate");
    \u0275\u0275elementEnd();
  }
}
function SuperOrganisationsComponent_Conditional_72_For_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td")(2, "div", 58);
    \u0275\u0275element(3, "app-avatar", 59);
    \u0275\u0275elementStart(4, "div")(5, "div", 60);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 61);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(9, "td")(10, "div");
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 62);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "td")(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "td", 63);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "td", 63);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "td", 64);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "td");
    \u0275\u0275element(24, "app-pill", 65);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "td")(26, "div", 66)(27, "button", 67);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Template_button_click_27_listener() {
      const o_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openView(o_r2));
    });
    \u0275\u0275text(28, "View");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "button", 68);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Template_button_click_29_listener() {
      const o_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openEdit(o_r2));
    });
    \u0275\u0275text(30, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275template(31, SuperOrganisationsComponent_Conditional_72_For_22_Conditional_31_Template, 2, 0, "button", 69)(32, SuperOrganisationsComponent_Conditional_72_For_22_Conditional_32_Template, 2, 0, "button", 70);
    \u0275\u0275elementStart(33, "button", 71);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_72_For_22_Template_button_click_33_listener() {
      const o_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.askDelete(o_r2));
    });
    \u0275\u0275text(34, "\u2715");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const o_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275property("name", o_r2.name)("size", 32);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r2.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r2.gstin || "\u2014");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((o_r2.admin == null ? null : o_r2.admin.name) || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((o_r2.admin == null ? null : o_r2.admin.email) || o_r2.adminEmail);
    \u0275\u0275advance(2);
    \u0275\u0275classMap("pill " + ctx_r2.planClass(o_r2.plan));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r2.planLabel(o_r2.plan));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r2.userCount);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r2.invoiceCount);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(o_r2.createdAt));
    \u0275\u0275advance(2);
    \u0275\u0275property("status", o_r2.status);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(o_r2.status !== "suspended" ? 31 : 32);
  }
}
function SuperOrganisationsComponent_Conditional_72_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23)(1, "table", 56)(2, "thead")(3, "tr")(4, "th");
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
    \u0275\u0275elementStart(18, "th", 57);
    \u0275\u0275text(19, "Actions");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(20, "tbody");
    \u0275\u0275repeaterCreate(21, SuperOrganisationsComponent_Conditional_72_For_22_Template, 35, 14, "tr", null, _forTrack1);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(21);
    \u0275\u0275repeater(ctx_r2.filtered());
  }
}
function SuperOrganisationsComponent_Conditional_91_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31);
    \u0275\u0275text(1, "Enter a valid email address");
    \u0275\u0275elementEnd();
  }
}
function SuperOrganisationsComponent_For_103_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r6 = ctx.$implicit;
    \u0275\u0275property("value", s_r6.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", s_r6.name, " (", s_r6.code, ")");
  }
}
function SuperOrganisationsComponent_For_113_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r7 = ctx.$implicit;
    \u0275\u0275property("value", p_r7.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r7.name);
  }
}
function SuperOrganisationsComponent_Conditional_118_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 41);
  }
}
function SuperOrganisationsComponent_For_156_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r8 = ctx.$implicit;
    \u0275\u0275property("value", s_r8.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", s_r8.name, " (", s_r8.code, ")");
  }
}
function SuperOrganisationsComponent_For_166_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r9 = ctx.$implicit;
    \u0275\u0275property("value", p_r9.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r9.name);
  }
}
function SuperOrganisationsComponent_Conditional_181_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 41);
  }
}
function SuperOrganisationsComponent_Conditional_184_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 74);
    \u0275\u0275element(1, "app-avatar", 59);
    \u0275\u0275elementStart(2, "div", 75)(3, "div", 76);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 77);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 78);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 79)(10, "div", 80)(11, "div", 45);
    \u0275\u0275text(12, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 81);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 80)(16, "div", 45);
    \u0275\u0275text(17, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 82);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 80)(21, "div", 45);
    \u0275\u0275text(22, "Phone");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 81);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 80)(26, "div", 45);
    \u0275\u0275text(27, "Plan");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 81);
    \u0275\u0275text(29);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 80)(31, "div", 45);
    \u0275\u0275text(32, "Users");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "div", 81);
    \u0275\u0275text(34);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(35, "div", 80)(36, "div", 45);
    \u0275\u0275text(37, "Invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "div", 81);
    \u0275\u0275text(39);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(40, "div", 80)(41, "div", 45);
    \u0275\u0275text(42, "Joined");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "div", 81);
    \u0275\u0275text(44);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(45, "div", 80)(46, "div", 45);
    \u0275\u0275text(47, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(48, "div", 83);
    \u0275\u0275element(49, "app-pill", 65);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(50, "div", 38)(51, "button", 39);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_184_Template_button_click_51_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showView.set(false));
    });
    \u0275\u0275text(52, "Close");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const o_r11 = ctx;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("name", o_r11.name)("size", 52);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r11.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r11.gstin || "No GSTIN");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(o_r11.address || "\u2014");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate((o_r11.admin == null ? null : o_r11.admin.name) || "\u2014");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate((o_r11.admin == null ? null : o_r11.admin.email) || o_r11.adminEmail);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(o_r11.phone || "\u2014");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.planLabel(o_r11.plan));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(o_r11.userCount);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(o_r11.invoiceCount);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(o_r11.createdAt));
    \u0275\u0275advance(5);
    \u0275\u0275property("status", o_r11.status);
  }
}
function SuperOrganisationsComponent_Conditional_186_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 84);
    \u0275\u0275text(1, "Suspend ");
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, "? Their users will lose access until the organization is reactivated.");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const o_r13 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r13.name);
  }
}
function SuperOrganisationsComponent_Conditional_186_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 84);
    \u0275\u0275text(1, "Activate ");
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, "? Their users will regain full access.");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const o_r13 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r13.name);
  }
}
function SuperOrganisationsComponent_Conditional_186_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 87);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_186_Conditional_5_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.confirmStatus());
    });
    \u0275\u0275text(1, "Suspend");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", ctx_r2.saving());
  }
}
function SuperOrganisationsComponent_Conditional_186_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 88);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_186_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.confirmStatus());
    });
    \u0275\u0275text(1, "Activate");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", ctx_r2.saving());
  }
}
function SuperOrganisationsComponent_Conditional_186_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275template(0, SuperOrganisationsComponent_Conditional_186_Conditional_0_Template, 5, 1, "p", 84)(1, SuperOrganisationsComponent_Conditional_186_Conditional_1_Template, 5, 1, "p", 84);
    \u0275\u0275elementStart(2, "div", 38)(3, "button", 39);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_186_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.statusTarget.set(null));
    });
    \u0275\u0275text(4, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, SuperOrganisationsComponent_Conditional_186_Conditional_5_Template, 2, 1, "button", 85)(6, SuperOrganisationsComponent_Conditional_186_Conditional_6_Template, 2, 1, "button", 86);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r2.statusAction() === "suspend" ? 0 : 1);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r2.statusAction() === "suspend" ? 5 : 6);
  }
}
function SuperOrganisationsComponent_Conditional_188_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 89);
    \u0275\u0275text(1, "\u26A0 Permanent deletion \u2014 All data, invoices, and user accounts for this organization will be permanently deleted.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "p", 90);
    \u0275\u0275text(3, "Are you sure you want to delete ");
    \u0275\u0275elementStart(4, "strong");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275text(6, "?");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 38)(8, "button", 39);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_188_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.deleteTarget.set(null));
    });
    \u0275\u0275text(9, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 87);
    \u0275\u0275listener("click", function SuperOrganisationsComponent_Conditional_188_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.confirmDelete());
    });
    \u0275\u0275text(11, "Delete Permanently");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx.name);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r2.saving());
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
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperOrganisationsComponent, selectors: [["app-super-organisations"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 189, vars: 57, consts: [[1, "page-head"], [1, "page-actions"], ["type", "button", 1, "btn", "primary", 3, "click"], [1, "grid", "grid-5", 2, "margin-bottom", "20px"], [1, "card", "metric"], [1, "accent", 2, "background", "var(--brand)"], [1, "metric-row"], [1, "label"], [1, "m-icon"], [1, "value"], [1, "accent", 2, "background", "var(--green)"], [1, "accent", 2, "background", "#f59e0b"], [1, "accent", 2, "background", "var(--red)"], [1, "accent", 2, "background", "var(--purple)"], [1, "toolbar"], [1, "tabs"], ["type", "button", 3, "click"], [1, "search-box"], [1, "search-icon"], ["placeholder", "Search name, email or GSTIN", 1, "input", 3, "ngModelChange", "ngModel"], [1, "card", "flush"], [3, "count"], ["icon", "\u{1F3E2}", "title", "No organizations found", "message", "Try a different filter or add a new organization."], [1, "table-wrap"], ["title", "Add Organization", 3, "close", "open", "width"], [1, "grid", "grid-2", 2, "gap", "14px"], [1, "field"], ["placeholder", "Acme Traders Pvt Ltd", 3, "ngModelChange", "ngModel"], ["placeholder", "27AAAAA0000A1Z5", 1, "mono", 3, "ngModelChange", "ngModel"], ["placeholder", "Full name", 3, "ngModelChange", "ngModel"], ["type", "email", "placeholder", "admin@company.com", 3, "ngModelChange", "ngModel"], [1, "error"], ["placeholder", "+91 98xxxxxx00", 3, "ngModelChange", "ngModel"], [3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], [1, "field", 2, "grid-column", "1/-1"], ["placeholder", "Registered address", 3, "ngModelChange", "ngModel"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], ["title", "Organization Created", 3, "close", "open", "width"], [1, "info-box", "ok", 2, "margin-bottom", "14px"], [2, "background", "var(--bg)", "border", "1px solid var(--border)", "border-radius", "10px", "padding", "14px 16px"], [2, "font-size", "10px", "color", "var(--faint)", "font-weight", "600", "text-transform", "uppercase", "letter-spacing", ".5px"], [1, "mono", 2, "font-weight", "700", "margin", "2px 0 12px"], [1, "mono", 2, "font-weight", "700", "margin-top", "2px"], ["title", "Edit Organization", 3, "close", "open", "width"], [1, "mono", 3, "ngModelChange", "ngModel"], ["value", "active"], ["value", "trial"], ["value", "suspended"], ["title", "Organization Details", 3, "close", "open", "width"], [3, "close", "open", "title"], ["title", "Delete Organization", 3, "close", "open"], [1, "table"], [2, "text-align", "right"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [3, "name", "size"], [1, "strong"], [1, "muted", "mono", 2, "font-size", "11px"], [1, "muted", 2, "font-size", "11px"], [1, "num"], [1, "muted"], [3, "status"], [1, "actions"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm"], ["type", "button", 1, "btn", "success", "sm"], ["type", "button", "aria-label", "Delete", 1, "btn", "danger", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"], ["type", "button", 1, "btn", "success", "sm", 3, "click"], [2, "background", "var(--brand-pale)", "border-radius", "12px", "padding", "16px", "display", "flex", "align-items", "center", "gap", "14px", "margin-bottom", "16px"], [2, "min-width", "0"], [2, "font-weight", "800", "font-size", "16px"], [1, "mono", 2, "font-size", "11px", "color", "var(--text-mid)"], [2, "font-size", "12px", "color", "var(--muted)", "margin-top", "2px"], [1, "grid", "grid-2", 2, "gap", "10px"], [2, "background", "var(--bg)", "border-radius", "10px", "padding", "10px 12px"], [2, "font-size", "13px", "font-weight", "600", "margin-top", "2px"], [2, "font-size", "13px", "font-weight", "600", "margin-top", "2px", "overflow", "hidden", "text-overflow", "ellipsis"], [2, "margin-top", "4px"], [2, "margin", "0 0 6px"], ["type", "button", 1, "btn", "danger", "solid", 3, "disabled"], ["type", "button", 1, "btn", "success", 3, "disabled"], ["type", "button", 1, "btn", "danger", "solid", 3, "click", "disabled"], ["type", "button", 1, "btn", "success", 3, "click", "disabled"], [1, "info-box", "danger", 2, "margin-bottom", "12px"], [2, "margin", "0"]], template: function SuperOrganisationsComponent_Template(rf, ctx) {
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
      \u0275\u0275text(16, "\u{1F3E2}");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(17, "div", 9);
      \u0275\u0275text(18);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(19, "div", 4);
      \u0275\u0275element(20, "div", 10);
      \u0275\u0275elementStart(21, "div", 6)(22, "span", 7);
      \u0275\u0275text(23, "Active");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "span", 8);
      \u0275\u0275text(25, "\u2713");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(26, "div", 9);
      \u0275\u0275text(27);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(28, "div", 4);
      \u0275\u0275element(29, "div", 11);
      \u0275\u0275elementStart(30, "div", 6)(31, "span", 7);
      \u0275\u0275text(32, "Trial");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "span", 8);
      \u0275\u0275text(34, "\u25D4");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(35, "div", 9);
      \u0275\u0275text(36);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(37, "div", 4);
      \u0275\u0275element(38, "div", 12);
      \u0275\u0275elementStart(39, "div", 6)(40, "span", 7);
      \u0275\u0275text(41, "Suspended");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "span", 8);
      \u0275\u0275text(43, "\u2298");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(44, "div", 9);
      \u0275\u0275text(45);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(46, "div", 4);
      \u0275\u0275element(47, "div", 13);
      \u0275\u0275elementStart(48, "div", 6)(49, "span", 7);
      \u0275\u0275text(50, "Platform Revenue");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "span", 8);
      \u0275\u0275text(52, "\u20B9");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(53, "div", 9);
      \u0275\u0275text(54);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(55, "div", 14)(56, "div", 15)(57, "button", 16);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_57_listener() {
        return ctx.tab.set("all");
      });
      \u0275\u0275text(58);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "button", 16);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_59_listener() {
        return ctx.tab.set("active");
      });
      \u0275\u0275text(60);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "button", 16);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_61_listener() {
        return ctx.tab.set("trial");
      });
      \u0275\u0275text(62);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "button", 16);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_63_listener() {
        return ctx.tab.set("suspended");
      });
      \u0275\u0275text(64);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(65, "div", 17)(66, "span", 18);
      \u0275\u0275text(67, "\u2315");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(68, "input", 19);
      \u0275\u0275listener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_68_listener($event) {
        return ctx.search.set($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(69, "div", 20);
      \u0275\u0275template(70, SuperOrganisationsComponent_Conditional_70_Template, 1, 1, "app-skeleton-rows", 21)(71, SuperOrganisationsComponent_Conditional_71_Template, 1, 0, "app-empty-state", 22)(72, SuperOrganisationsComponent_Conditional_72_Template, 23, 0, "div", 23);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(73, "app-modal", 24);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_73_listener() {
        return ctx.showAdd.set(false);
      });
      \u0275\u0275elementStart(74, "div", 25)(75, "div", 26)(76, "label");
      \u0275\u0275text(77, "Organization Name *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(78, "input", 27);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_78_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.name, $event) || (ctx.addForm.name = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(79, "div", 26)(80, "label");
      \u0275\u0275text(81, "GSTIN");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(82, "input", 28);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_82_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.gstin, $event) || (ctx.addForm.gstin = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(83, "div", 26)(84, "label");
      \u0275\u0275text(85, "Admin Name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(86, "input", 29);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_86_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.adminName, $event) || (ctx.addForm.adminName = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(87, "div", 26)(88, "label");
      \u0275\u0275text(89, "Admin Email *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(90, "input", 30);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_90_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.adminEmail, $event) || (ctx.addForm.adminEmail = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(91, SuperOrganisationsComponent_Conditional_91_Template, 2, 0, "div", 31);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(92, "div", 26)(93, "label");
      \u0275\u0275text(94, "Phone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(95, "input", 32);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_95_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.phone, $event) || (ctx.addForm.phone = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(96, "div", 26)(97, "label");
      \u0275\u0275text(98, "State");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(99, "select", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_99_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.stateCode, $event) || (ctx.addForm.stateCode = $event);
        return $event;
      });
      \u0275\u0275elementStart(100, "option", 34);
      \u0275\u0275text(101, "Select state");
      \u0275\u0275elementEnd();
      \u0275\u0275repeaterCreate(102, SuperOrganisationsComponent_For_103_Template, 2, 3, "option", 35, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(104, "div", 36)(105, "label");
      \u0275\u0275text(106, "Address");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(107, "input", 37);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_107_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.address, $event) || (ctx.addForm.address = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(108, "div", 26)(109, "label");
      \u0275\u0275text(110, "Plan");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(111, "select", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_111_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.addForm.plan, $event) || (ctx.addForm.plan = $event);
        return $event;
      });
      \u0275\u0275repeaterCreate(112, SuperOrganisationsComponent_For_113_Template, 2, 2, "option", 35, _forTrack0);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(114, "div", 38)(115, "button", 39);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_115_listener() {
        return ctx.showAdd.set(false);
      });
      \u0275\u0275text(116, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(117, "button", 40);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_117_listener() {
        return ctx.create();
      });
      \u0275\u0275template(118, SuperOrganisationsComponent_Conditional_118_Template, 1, 0, "span", 41);
      \u0275\u0275text(119, " Create Organization ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(120, "app-modal", 42);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_120_listener() {
        return ctx.showCreds.set(false);
      });
      \u0275\u0275elementStart(121, "div", 43);
      \u0275\u0275text(122, "\u2713 Organization created. Share these credentials securely with the admin.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(123, "div", 44)(124, "div", 45);
      \u0275\u0275text(125, "Login Email");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(126, "div", 46);
      \u0275\u0275text(127);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(128, "div", 45);
      \u0275\u0275text(129, "Temporary Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(130, "div", 47);
      \u0275\u0275text(131);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(132, "div", 38)(133, "button", 2);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_133_listener() {
        return ctx.showCreds.set(false);
      });
      \u0275\u0275text(134, "Done");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(135, "app-modal", 48);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_135_listener() {
        return ctx.showEdit.set(false);
      });
      \u0275\u0275elementStart(136, "div", 25)(137, "div", 26)(138, "label");
      \u0275\u0275text(139, "Organization Name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(140, "input", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_140_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.name, $event) || (ctx.editForm.name = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(141, "div", 26)(142, "label");
      \u0275\u0275text(143, "GSTIN");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(144, "input", 49);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_144_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.gstin, $event) || (ctx.editForm.gstin = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(145, "div", 26)(146, "label");
      \u0275\u0275text(147, "Phone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(148, "input", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_148_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.phone, $event) || (ctx.editForm.phone = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(149, "div", 26)(150, "label");
      \u0275\u0275text(151, "State");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(152, "select", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_152_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.stateCode, $event) || (ctx.editForm.stateCode = $event);
        return $event;
      });
      \u0275\u0275elementStart(153, "option", 34);
      \u0275\u0275text(154, "Select state");
      \u0275\u0275elementEnd();
      \u0275\u0275repeaterCreate(155, SuperOrganisationsComponent_For_156_Template, 2, 3, "option", 35, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(157, "div", 36)(158, "label");
      \u0275\u0275text(159, "Address");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(160, "input", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_input_ngModelChange_160_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.address, $event) || (ctx.editForm.address = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(161, "div", 26)(162, "label");
      \u0275\u0275text(163, "Plan");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(164, "select", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_164_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.plan, $event) || (ctx.editForm.plan = $event);
        return $event;
      });
      \u0275\u0275repeaterCreate(165, SuperOrganisationsComponent_For_166_Template, 2, 2, "option", 35, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(167, "div", 26)(168, "label");
      \u0275\u0275text(169, "Status");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(170, "select", 33);
      \u0275\u0275twoWayListener("ngModelChange", function SuperOrganisationsComponent_Template_select_ngModelChange_170_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.editForm.status, $event) || (ctx.editForm.status = $event);
        return $event;
      });
      \u0275\u0275elementStart(171, "option", 50);
      \u0275\u0275text(172, "Active");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(173, "option", 51);
      \u0275\u0275text(174, "Trial");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(175, "option", 52);
      \u0275\u0275text(176, "Suspended");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(177, "div", 38)(178, "button", 39);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_178_listener() {
        return ctx.showEdit.set(false);
      });
      \u0275\u0275text(179, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(180, "button", 40);
      \u0275\u0275listener("click", function SuperOrganisationsComponent_Template_button_click_180_listener() {
        return ctx.saveEdit();
      });
      \u0275\u0275template(181, SuperOrganisationsComponent_Conditional_181_Template, 1, 0, "span", 41);
      \u0275\u0275text(182, " Save Changes ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(183, "app-modal", 53);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_183_listener() {
        return ctx.showView.set(false);
      });
      \u0275\u0275template(184, SuperOrganisationsComponent_Conditional_184_Template, 53, 13);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(185, "app-modal", 54);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_185_listener() {
        return ctx.statusTarget.set(null);
      });
      \u0275\u0275template(186, SuperOrganisationsComponent_Conditional_186_Template, 7, 2, "div", 38);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(187, "app-modal", 55);
      \u0275\u0275listener("close", function SuperOrganisationsComponent_Template_app_modal_close_187_listener() {
        return ctx.deleteTarget.set(null);
      });
      \u0275\u0275template(188, SuperOrganisationsComponent_Conditional_188_Template, 12, 2);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_0_0;
      let tmp_1_0;
      let tmp_2_0;
      let tmp_3_0;
      let tmp_4_0;
      let tmp_5_0;
      let tmp_50_0;
      let tmp_53_0;
      let tmp_55_0;
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate2("", ((tmp_0_0 = ctx.overview()) == null ? null : tmp_0_0.organisations) || 0, " registered organizations \xB7 ", ((tmp_0_0 = ctx.overview()) == null ? null : tmp_0_0.active) || 0, " active");
      \u0275\u0275advance(13);
      \u0275\u0275textInterpolate(((tmp_1_0 = ctx.overview()) == null ? null : tmp_1_0.organisations) || 0);
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate(((tmp_2_0 = ctx.overview()) == null ? null : tmp_2_0.active) || 0);
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate(((tmp_3_0 = ctx.overview()) == null ? null : tmp_3_0.trial) || 0);
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate(((tmp_4_0 = ctx.overview()) == null ? null : tmp_4_0.suspended) || 0);
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate(ctx.fmtINR(((tmp_5_0 = ctx.overview()) == null ? null : tmp_5_0.totalRevenue) || 0, true));
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
      \u0275\u0275property("open", ctx.showAdd())("width", 560);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.name);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.gstin);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.adminName);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.adminEmail);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.addForm.adminEmail && !ctx.isValidEmail(ctx.addForm.adminEmail) ? 91 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.phone);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.stateCode);
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.states);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.address);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.addForm.plan);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.planOptions());
      \u0275\u0275advance(5);
      \u0275\u0275property("disabled", ctx.saving() || !ctx.canCreate());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 118 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.showCreds())("width", 480);
      \u0275\u0275advance(7);
      \u0275\u0275textInterpolate(ctx.credEmail());
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(ctx.credPassword());
      \u0275\u0275advance(4);
      \u0275\u0275property("open", ctx.showEdit())("width", 560);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.name);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.gstin);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.phone);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.stateCode);
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.states);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.address);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.plan);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.planOptions());
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.editForm.status);
      \u0275\u0275advance(10);
      \u0275\u0275property("disabled", ctx.saving() || !ctx.editForm.name.trim());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 181 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.showView())("width", 520);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_50_0 = ctx.viewOrg()) ? 184 : -1, tmp_50_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.statusTarget())("title", ctx.statusAction() === "suspend" ? "Suspend Organization" : "Activate Organization");
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_53_0 = ctx.statusTarget()) ? 186 : -1, tmp_53_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.deleteTarget());
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_55_0 = ctx.deleteTarget()) ? 188 : -1, tmp_55_0);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperOrganisationsComponent, { className: "SuperOrganisationsComponent", filePath: "src\\app\\features\\super-admin\\organisations.component.ts", lineNumber: 327 });
})();
export {
  SuperOrganisationsComponent
};
//# sourceMappingURL=chunk-BK6WOUC3.js.map
