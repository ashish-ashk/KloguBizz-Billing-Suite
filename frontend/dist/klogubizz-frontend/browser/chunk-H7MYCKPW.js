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
  fmtDate,
  isValidEmail
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
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-KLA3EWNB.js";

// src/app/features/users/users.component.ts
var _forTrack0 = ($index, $item) => $item.name;
var _forTrack1 = ($index, $item) => $item._id;
function UsersComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275element(1, "app-skeleton-rows", 23);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 24);
    \u0275\u0275element(3, "app-skeleton-rows", 23);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 3);
    \u0275\u0275advance(2);
    \u0275\u0275property("count", 4);
  }
}
function UsersComponent_Conditional_4_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24);
    \u0275\u0275element(1, "app-pill", 35);
    \u0275\u0275elementStart(2, "div", 36);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 37);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const r_r1 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("status", r_r1);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r1.roleColor(r_r1));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.roleCount(r_r1), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.roleDescriptions[r_r1]);
  }
}
function UsersComponent_Conditional_4_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 31);
  }
}
function UsersComponent_Conditional_4_Conditional_12_For_1_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-pill", 46);
  }
}
function UsersComponent_Conditional_4_Conditional_12_For_1_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 49);
    \u0275\u0275listener("click", function UsersComponent_Conditional_4_Conditional_12_For_1_Conditional_14_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const u_r4 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openRemove(u_r4));
    });
    \u0275\u0275text(1, "Remove");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_4_Conditional_12_For_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 39);
    \u0275\u0275element(1, "app-avatar", 40);
    \u0275\u0275elementStart(2, "div", 41)(3, "div", 42);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 43);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 44);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 45);
    \u0275\u0275element(10, "app-pill", 35);
    \u0275\u0275template(11, UsersComponent_Conditional_4_Conditional_12_For_1_Conditional_11_Template, 1, 0, "app-pill", 46);
    \u0275\u0275elementStart(12, "button", 47);
    \u0275\u0275listener("click", function UsersComponent_Conditional_4_Conditional_12_For_1_Template_button_click_12_listener() {
      const u_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openEdit(u_r4));
    });
    \u0275\u0275text(13, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275template(14, UsersComponent_Conditional_4_Conditional_12_For_1_Conditional_14_Template, 2, 0, "button", 48);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const u_r4 = ctx.$implicit;
    const \u0275$index_47_r6 = ctx.$index;
    const \u0275$count_47_r7 = ctx.$count;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275styleProp("border-bottom", \u0275$index_47_r6 === \u0275$count_47_r7 - 1 ? "none" : "1px solid var(--border)");
    \u0275\u0275advance();
    \u0275\u0275property("name", u_r4.name)("size", 40);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(u_r4.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(u_r4.email);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", u_r4.status === "invited" ? "Invite pending" : "Last active " + ctx_r1.fmtDate(u_r4.lastLoginAt), " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("status", u_r4.role);
    \u0275\u0275advance();
    \u0275\u0275conditional(u_r4.status === "invited" ? 11 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(!ctx_r1.isSelf(u_r4) ? 14 : -1);
  }
}
function UsersComponent_Conditional_4_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275repeaterCreate(0, UsersComponent_Conditional_4_Conditional_12_For_1_Template, 15, 10, "div", 38, _forTrack1);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275repeater(ctx_r1.visibleUsers());
  }
}
function UsersComponent_Conditional_4_For_34_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 50);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_4_For_34_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 51);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_4_For_34_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 50);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_4_For_34_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 51);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_4_For_34_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 50);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_4_For_34_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 51);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_4_For_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 34);
    \u0275\u0275template(4, UsersComponent_Conditional_4_For_34_Conditional_4_Template, 2, 0, "span", 50)(5, UsersComponent_Conditional_4_For_34_Conditional_5_Template, 2, 0, "span", 51);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "td", 34);
    \u0275\u0275template(7, UsersComponent_Conditional_4_For_34_Conditional_7_Template, 2, 0, "span", 50)(8, UsersComponent_Conditional_4_For_34_Conditional_8_Template, 2, 0, "span", 51);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td", 34);
    \u0275\u0275template(10, UsersComponent_Conditional_4_For_34_Conditional_10_Template, 2, 0, "span", 50)(11, UsersComponent_Conditional_4_For_34_Conditional_11_Template, 2, 0, "span", 51);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const p_r8 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(p_r8.name);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(p_r8.admin ? 4 : 5);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(p_r8.accountant ? 7 : 8);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(p_r8.viewer ? 10 : 11);
  }
}
function UsersComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 25);
    \u0275\u0275repeaterCreate(1, UsersComponent_Conditional_4_For_2_Template, 6, 5, "div", 24, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "section", 26)(4, "div", 27)(5, "div", 28)(6, "div")(7, "div", 29);
    \u0275\u0275text(8, "Team Members");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 30);
    \u0275\u0275text(10, "People with access to this organisation");
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(11, UsersComponent_Conditional_4_Conditional_11_Template, 1, 0, "app-empty-state", 31)(12, UsersComponent_Conditional_4_Conditional_12_Template, 2, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 27)(14, "div", 28)(15, "div")(16, "div", 29);
    \u0275\u0275text(17, "Permissions Matrix");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 30);
    \u0275\u0275text(19, "What each role can do in Klogu Bizz");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(20, "div", 32)(21, "table", 33)(22, "thead")(23, "tr")(24, "th");
    \u0275\u0275text(25, "Permission");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "th", 34);
    \u0275\u0275text(27, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "th", 34);
    \u0275\u0275text(29, "Accountant");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "th", 34);
    \u0275\u0275text(31, "Viewer");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(32, "tbody");
    \u0275\u0275repeaterCreate(33, UsersComponent_Conditional_4_For_34_Template, 12, 4, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.roles);
    \u0275\u0275advance(10);
    \u0275\u0275conditional(ctx_r1.visibleUsers().length === 0 ? 11 : 12);
    \u0275\u0275advance(22);
    \u0275\u0275repeater(ctx_r1.permissions);
  }
}
function UsersComponent_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 7);
    \u0275\u0275text(1, "Enter a valid email address.");
    \u0275\u0275elementEnd();
  }
}
function UsersComponent_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 16);
  }
}
function UsersComponent_Conditional_37_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 16);
  }
}
function UsersComponent_Conditional_37_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 52);
    \u0275\u0275element(1, "app-avatar", 40);
    \u0275\u0275elementStart(2, "div", 53)(3, "div", 42);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 43);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(7, "div", 3)(8, "div", 4)(9, "label");
    \u0275\u0275text(10, "Role");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "select", 8);
    \u0275\u0275twoWayListener("ngModelChange", function UsersComponent_Conditional_37_Template_select_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editRole, $event) || (ctx_r1.editRole = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(12, "option", 9);
    \u0275\u0275text(13, "Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "option", 10);
    \u0275\u0275text(15, "Accountant");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "option", 11);
    \u0275\u0275text(17, "Viewer");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 4)(19, "label");
    \u0275\u0275text(20, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "select", 8);
    \u0275\u0275twoWayListener("ngModelChange", function UsersComponent_Conditional_37_Template_select_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editStatus, $event) || (ctx_r1.editStatus = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(22, "option", 54);
    \u0275\u0275text(23, "Active");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "option", 55);
    \u0275\u0275text(25, "Invited");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "option", 56);
    \u0275\u0275text(27, "Disabled");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(28, "div", 13)(29, "button", 14);
    \u0275\u0275listener("click", function UsersComponent_Conditional_37_Template_button_click_29_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.editOpen.set(false));
    });
    \u0275\u0275text(30, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "button", 15);
    \u0275\u0275listener("click", function UsersComponent_Conditional_37_Template_button_click_31_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.saveEdit());
    });
    \u0275\u0275template(32, UsersComponent_Conditional_37_Conditional_32_Template, 1, 0, "span", 16);
    \u0275\u0275text(33, " Save Changes ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const u_r10 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("name", u_r10.name)("size", 44);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(u_r10.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(u_r10.email);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editRole);
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editStatus);
    \u0275\u0275advance(10);
    \u0275\u0275property("disabled", ctx_r1.saving());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.saving() ? 32 : -1);
  }
}
function UsersComponent_Conditional_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 20);
    \u0275\u0275text(1);
    \u0275\u0275elementStart(2, "span", 57);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const u_r11 = ctx;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", u_r11.name, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\xB7 ", u_r11.email, "");
  }
}
function UsersComponent_Conditional_46_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 16);
  }
}
var ROLE_DESCRIPTIONS = {
  admin: "Full access to all modules, can manage users and billing settings.",
  accountant: "Can create and edit invoices, record payments and view reports. Cannot manage users.",
  viewer: "Read-only access. Can view invoices and reports but cannot edit anything."
};
var UsersComponent = class _UsersComponent {
  api;
  toast;
  auth;
  loading = signal(true);
  saving = signal(false);
  users = signal([]);
  inviteOpen = signal(false);
  editOpen = signal(false);
  removeOpen = signal(false);
  editTarget = signal(null);
  removeTarget = signal(null);
  inviteName = "";
  inviteEmail = "";
  inviteRole = "accountant";
  editRole = "accountant";
  editStatus = "active";
  roles = ["admin", "accountant", "viewer"];
  roleDescriptions = ROLE_DESCRIPTIONS;
  permissions = [
    { name: "View Dashboard", admin: true, accountant: true, viewer: true },
    { name: "View Invoices", admin: true, accountant: true, viewer: true },
    { name: "Create/Edit Invoices", admin: true, accountant: true, viewer: false },
    { name: "Payment Tracking", admin: true, accountant: true, viewer: false },
    { name: "View Reports", admin: true, accountant: true, viewer: true },
    { name: "Manage Users", admin: true, accountant: false, viewer: false },
    { name: "App Settings", admin: true, accountant: false, viewer: false },
    { name: "Billing & Subscription", admin: true, accountant: false, viewer: false }
  ];
  fmtDate = fmtDate;
  isValidEmail = isValidEmail;
  visibleUsers = computed(() => this.users().filter((u) => u.status !== "disabled"));
  subtitleText = computed(() => {
    if (this.loading())
      return "Loading team\u2026";
    const list = this.visibleUsers();
    const active = list.filter((u) => u.status === "active").length;
    return list.length + " team members \xB7 " + active + " active";
  });
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
    this.api.users().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  roleCount(role) {
    return this.visibleUsers().filter((u) => u.role === role).length;
  }
  roleColor(role) {
    if (role === "admin")
      return "var(--brand)";
    if (role === "accountant")
      return "var(--blue)";
    return "var(--slate)";
  }
  roleLabel(role) {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
  isSelf(u) {
    const myEmail = this.auth.user()?.email;
    return !!myEmail && u.email.toLowerCase() === myEmail.toLowerCase();
  }
  // ── Invite ─────────────────────────────────────
  openInvite() {
    this.inviteName = "";
    this.inviteEmail = "";
    this.inviteRole = "accountant";
    this.inviteOpen.set(true);
  }
  inviteValid() {
    return this.inviteName.trim().length > 0 && isValidEmail(this.inviteEmail);
  }
  sendInvite() {
    if (!this.inviteValid() || this.saving())
      return;
    this.saving.set(true);
    const email = this.inviteEmail.trim();
    this.api.inviteUser({ name: this.inviteName.trim(), email, role: this.inviteRole }).subscribe({
      next: () => {
        this.saving.set(false);
        this.inviteOpen.set(false);
        this.toast.success("Invitation sent to " + email);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  // ── Edit ───────────────────────────────────────
  openEdit(u) {
    this.editTarget.set(u);
    this.editRole = u.role;
    this.editStatus = u.status;
    this.editOpen.set(true);
  }
  saveEdit() {
    const u = this.editTarget();
    if (!u || this.saving())
      return;
    this.saving.set(true);
    this.api.updateUser(u._id, { role: this.editRole, status: this.editStatus }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editOpen.set(false);
        this.toast.success("User updated");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  // ── Remove ─────────────────────────────────────
  openRemove(u) {
    this.removeTarget.set(u);
    this.removeOpen.set(true);
  }
  confirmRemove() {
    const u = this.removeTarget();
    if (!u || this.saving())
      return;
    this.saving.set(true);
    this.api.removeUser(u._id).subscribe({
      next: () => {
        this.saving.set(false);
        this.removeOpen.set(false);
        this.toast.info("User removed");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function UsersComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _UsersComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService), \u0275\u0275directiveInject(AuthService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _UsersComponent, selectors: [["app-users"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 48, vars: 20, consts: [["title", "Users & Roles", 3, "subtitle"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click"], ["title", "Invite User", 3, "close", "open"], [1, "form"], [1, "field"], ["placeholder", "e.g. Priya Sharma", 3, "ngModelChange", "ngModel"], ["type", "email", "placeholder", "name@company.com", 3, "ngModelChange", "ngModel"], [1, "error"], [3, "ngModelChange", "ngModel"], ["value", "admin"], ["value", "accountant"], ["value", "viewer"], [1, "info-box"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], ["title", "Edit User", 3, "close", "open"], ["title", "Remove User", 3, "close", "open", "width"], [2, "margin", "0", "font-size", "13px", "color", "var(--muted)", "line-height", "1.6"], [2, "margin-top", "12px", "font-weight", "700", "font-size", "13px"], ["type", "button", 1, "btn", "danger", "solid", 3, "click", "disabled"], [1, "card", 2, "margin-bottom", "16px"], [3, "count"], [1, "card"], [1, "grid", "grid-3", 2, "margin-bottom", "16px"], [1, "grid", "grid-2", 2, "align-items", "start"], [1, "card", "flush"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], ["icon", "\u25C9", "title", "No team members yet", "message", "Invite your accountant or a viewer to start collaborating."], [1, "table-wrap"], [1, "table"], [2, "text-align", "center"], [3, "status"], [2, "font-family", "var(--font-display)", "font-size", "26px", "font-weight", "800", "margin", "10px 0 6px"], [2, "font-size", "12px", "color", "var(--muted)", "line-height", "1.55"], [2, "display", "flex", "align-items", "center", "gap", "12px", "padding", "14px 20px", 3, "borderBottom"], [2, "display", "flex", "align-items", "center", "gap", "12px", "padding", "14px 20px"], [3, "name", "size"], [2, "flex", "1", "min-width", "0"], [2, "font-weight", "700", "font-size", "14px"], [2, "font-size", "12px", "color", "var(--muted)", "overflow", "hidden", "text-overflow", "ellipsis", "white-space", "nowrap"], [2, "font-size", "11px", "color", "var(--faint)", "margin-top", "2px"], [2, "display", "flex", "align-items", "center", "gap", "8px", "flex-wrap", "wrap", "justify-content", "flex-end"], ["status", "invited"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"], [2, "color", "var(--green)", "font-weight", "700"], [2, "color", "var(--faint)"], [2, "display", "flex", "align-items", "center", "gap", "12px", "background", "var(--brand-pale)", "border-radius", "10px", "padding", "12px 14px", "margin-bottom", "16px"], [2, "min-width", "0"], ["value", "active"], ["value", "invited"], ["value", "disabled"], [2, "color", "var(--muted)", "font-weight", "500"]], template: function UsersComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function UsersComponent_Template_button_click_1_listener() {
        return ctx.openInvite();
      });
      \u0275\u0275text(2, "+ Invite User");
      \u0275\u0275elementEnd();
      \u0275\u0275template(3, UsersComponent_Conditional_3_Template, 4, 2)(4, UsersComponent_Conditional_4_Template, 35, 1);
      \u0275\u0275elementStart(5, "app-modal", 2);
      \u0275\u0275listener("close", function UsersComponent_Template_app_modal_close_5_listener() {
        return ctx.inviteOpen.set(false);
      });
      \u0275\u0275elementStart(6, "div", 3)(7, "div", 4)(8, "label");
      \u0275\u0275text(9, "Full Name *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(10, "input", 5);
      \u0275\u0275twoWayListener("ngModelChange", function UsersComponent_Template_input_ngModelChange_10_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.inviteName, $event) || (ctx.inviteName = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(11, "div", 4)(12, "label");
      \u0275\u0275text(13, "Work Email *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "input", 6);
      \u0275\u0275twoWayListener("ngModelChange", function UsersComponent_Template_input_ngModelChange_14_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.inviteEmail, $event) || (ctx.inviteEmail = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(15, UsersComponent_Conditional_15_Template, 2, 0, "div", 7);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(16, "div", 4)(17, "label");
      \u0275\u0275text(18, "Role");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "select", 8);
      \u0275\u0275twoWayListener("ngModelChange", function UsersComponent_Template_select_ngModelChange_19_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.inviteRole, $event) || (ctx.inviteRole = $event);
        return $event;
      });
      \u0275\u0275elementStart(20, "option", 9);
      \u0275\u0275text(21, "Admin");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(22, "option", 10);
      \u0275\u0275text(23, "Accountant");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "option", 11);
      \u0275\u0275text(25, "Viewer");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(26, "div", 12)(27, "strong");
      \u0275\u0275text(28);
      \u0275\u0275elementEnd();
      \u0275\u0275text(29);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(30, "div", 13)(31, "button", 14);
      \u0275\u0275listener("click", function UsersComponent_Template_button_click_31_listener() {
        return ctx.inviteOpen.set(false);
      });
      \u0275\u0275text(32, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "button", 15);
      \u0275\u0275listener("click", function UsersComponent_Template_button_click_33_listener() {
        return ctx.sendInvite();
      });
      \u0275\u0275template(34, UsersComponent_Conditional_34_Template, 1, 0, "span", 16);
      \u0275\u0275text(35, " Send Invite ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(36, "app-modal", 17);
      \u0275\u0275listener("close", function UsersComponent_Template_app_modal_close_36_listener() {
        return ctx.editOpen.set(false);
      });
      \u0275\u0275template(37, UsersComponent_Conditional_37_Template, 34, 8);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(38, "app-modal", 18);
      \u0275\u0275listener("close", function UsersComponent_Template_app_modal_close_38_listener() {
        return ctx.removeOpen.set(false);
      });
      \u0275\u0275elementStart(39, "p", 19);
      \u0275\u0275text(40, " This user will lose access to Klogu Bizz immediately. You can re-invite them later. ");
      \u0275\u0275elementEnd();
      \u0275\u0275template(41, UsersComponent_Conditional_41_Template, 4, 2, "div", 20);
      \u0275\u0275elementStart(42, "div", 13)(43, "button", 14);
      \u0275\u0275listener("click", function UsersComponent_Template_button_click_43_listener() {
        return ctx.removeOpen.set(false);
      });
      \u0275\u0275text(44, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(45, "button", 21);
      \u0275\u0275listener("click", function UsersComponent_Template_button_click_45_listener() {
        return ctx.confirmRemove();
      });
      \u0275\u0275template(46, UsersComponent_Conditional_46_Template, 1, 0, "span", 16);
      \u0275\u0275text(47, " Remove User ");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_13_0;
      let tmp_16_0;
      \u0275\u0275property("subtitle", ctx.subtitleText());
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.loading() ? 3 : 4);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.inviteOpen());
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.inviteName);
      \u0275\u0275advance(4);
      \u0275\u0275classProp("invalid", ctx.inviteEmail.length > 0 && !ctx.isValidEmail(ctx.inviteEmail));
      \u0275\u0275twoWayProperty("ngModel", ctx.inviteEmail);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.inviteEmail.length > 0 && !ctx.isValidEmail(ctx.inviteEmail) ? 15 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.inviteRole);
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate(ctx.roleLabel(ctx.inviteRole));
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" role includes: ", ctx.roleDescriptions[ctx.inviteRole], " ");
      \u0275\u0275advance(4);
      \u0275\u0275property("disabled", ctx.saving() || !ctx.inviteValid());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 34 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("open", ctx.editOpen());
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_13_0 = ctx.editTarget()) ? 37 : -1, tmp_13_0);
      \u0275\u0275advance();
      \u0275\u0275property("open", ctx.removeOpen())("width", 420);
      \u0275\u0275advance(3);
      \u0275\u0275conditional((tmp_16_0 = ctx.removeTarget()) ? 41 : -1, tmp_16_0);
      \u0275\u0275advance(4);
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 46 : -1);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, AppShellComponent, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(UsersComponent, { className: "UsersComponent", filePath: "src\\app\\features\\users\\users.component.ts", lineNumber: 226 });
})();
export {
  UsersComponent
};
//# sourceMappingURL=chunk-H7MYCKPW.js.map
