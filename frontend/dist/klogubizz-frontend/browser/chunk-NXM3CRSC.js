import {
  QuickSearchComponent
} from "./chunk-4KISL3AY.js";
import {
  AvatarComponent,
  ToastsComponent
} from "./chunk-OBVHAWX5.js";
import "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import "./chunk-XAFCZYPI.js";
import {
  AuthService,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  signal,
  viewChild,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵattribute,
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
  ɵɵqueryAdvance,
  ɵɵresetView,
  ɵɵresolveDocument,
  ɵɵresolveWindow,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵviewQuerySignal
} from "./chunk-6VNHH65J.js";

// src/app/features/super-admin/super-admin-layout.component.ts
function SuperAdminLayoutComponent_Conditional_91_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57);
    \u0275\u0275listener("click", function SuperAdminLayoutComponent_Conditional_91_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r1);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(1, "div", 58);
    \u0275\u0275element(2, "app-avatar", 36);
    \u0275\u0275elementStart(3, "div", 59)(4, "div", 60);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 61);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
    \u0275\u0275element(8, "div", 62);
    \u0275\u0275elementStart(9, "button", 63);
    \u0275\u0275listener("click", function SuperAdminLayoutComponent_Conditional_91_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.auth.logout());
    });
    \u0275\u0275element(10, "app-icon", 41);
    \u0275\u0275text(11, " Sign Out");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_1_0;
    let tmp_3_0;
    let tmp_4_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275property("name", ((tmp_1_0 = ctx_r1.auth.user()) == null ? null : tmp_1_0.name) || "?")("size", 32);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((tmp_3_0 = ctx_r1.auth.user()) == null ? null : tmp_3_0.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((tmp_4_0 = ctx_r1.auth.user()) == null ? null : tmp_4_0.email);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 14);
  }
}
var COLLAPSE_KEY = "klogubizz_sidebar_collapsed";
var SUPER_ADMIN_COMMANDS = [
  { label: "Organizations", route: "/super-admin/organisations", icon: "package" },
  { label: "Masters", route: "/super-admin/masters", icon: "template" },
  { label: "Invoice Templates", route: "/super-admin/templates", icon: "invoice" },
  { label: "Reminders & Receipts", route: "/super-admin/reminders", icon: "creditCard" },
  { label: "Subscription Plans", route: "/super-admin/plans", icon: "chart" },
  { label: "Branding & Logo", route: "/super-admin/branding", icon: "palette" },
  { label: "Profile & Security", route: "/super-admin/profile", icon: "user" },
  { label: "Tenant App", route: "/dashboard", icon: "chevronLeft" }
];
var SuperAdminLayoutComponent = class _SuperAdminLayoutComponent {
  auth;
  router;
  menuOpen = signal(false);
  userMenuOpen = signal(false);
  collapsed = signal(localStorage.getItem(COLLAPSE_KEY) === "1");
  commandItems = SUPER_ADMIN_COMMANDS;
  quickSearch = viewChild(QuickSearchComponent);
  constructor(auth, router) {
    this.auth = auth;
    this.router = router;
  }
  toggleCollapse() {
    this.collapsed.update((v) => !v);
    localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? "1" : "0");
  }
  toggleUserMenu(event) {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
  }
  closeUserMenu() {
    this.userMenuOpen.set(false);
  }
  onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      this.quickSearch()?.focusInput();
    }
  }
  static \u0275fac = function SuperAdminLayoutComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperAdminLayoutComponent)(\u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(Router));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperAdminLayoutComponent, selectors: [["app-super-admin-layout"]], viewQuery: function SuperAdminLayoutComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuerySignal(ctx.quickSearch, QuickSearchComponent, 5);
    }
    if (rf & 2) {
      \u0275\u0275queryAdvance();
    }
  }, hostBindings: function SuperAdminLayoutComponent_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("click", function SuperAdminLayoutComponent_click_HostBindingHandler() {
        return ctx.closeUserMenu();
      }, false, \u0275\u0275resolveDocument)("keydown", function SuperAdminLayoutComponent_keydown_HostBindingHandler($event) {
        return ctx.onKeydown($event);
      }, false, \u0275\u0275resolveWindow);
    }
  }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 95, vars: 26, consts: [["type", "button", "aria-label", "Toggle menu", 1, "menu-toggle", "no-print", 3, "click"], ["name", "menu", 3, "size"], [1, "shell"], [1, "sidebar", "super", "no-print"], [1, "sidebar-logo"], [1, "brand"], [1, "brand-mark"], ["name", "shield", 3, "size"], [1, "brand-text"], [1, "brand-name"], [1, "owner-badge"], [1, "nav-label"], [1, "sidebar-scroll"], [1, "nav", 3, "click"], [1, "nav-section"], ["routerLink", "/super-admin/organisations", "routerLinkActive", "active", "title", "Organizations"], [1, "nav-icon"], ["name", "package"], ["routerLink", "/super-admin/masters", "routerLinkActive", "active", "title", "Masters"], ["name", "template"], ["routerLink", "/super-admin/templates", "routerLinkActive", "active", "title", "Invoice Templates"], ["name", "invoice"], ["routerLink", "/super-admin/reminders", "routerLinkActive", "active", "title", "Reminders & Receipts"], ["name", "creditCard"], ["routerLink", "/super-admin/plans", "routerLinkActive", "active", "title", "Subscription Plans"], ["name", "chart"], ["routerLink", "/super-admin/branding", "routerLinkActive", "active", "title", "Branding & Logo"], ["name", "palette"], ["routerLink", "/super-admin/profile", "routerLinkActive", "active", "title", "Profile & Security"], ["name", "user"], [1, "nav-divider"], ["routerLink", "/dashboard", "title", "Tenant App"], ["name", "chevronLeft"], [1, "sidebar-foot"], [1, "sidebar-user-row"], [1, "sidebar-org"], [3, "name", "size"], [1, "org-info"], [1, "org-name"], [1, "org-plan"], ["type", "button", "title", "Sign Out", "aria-label", "Sign Out", 1, "sidebar-icon-btn", "nav-label", 3, "click"], ["name", "logout", 3, "size"], [1, "main"], [1, "topbar", "no-print"], ["type", "button", 1, "icon-btn", "sidebar-toggle-btn", 3, "click", "title"], [1, "topbar-crumb"], [1, "crumb-org"], ["name", "chevronRight", 1, "crumb-sep", 3, "size"], [1, "crumb-page"], [1, "no-print", 3, "navigate", "items"], [1, "topbar-right"], [1, "topbar-user", 3, "click"], [1, "topbar-user-info"], [1, "topbar-user-name"], ["name", "chevronDown", 1, "chevron", 3, "size"], [1, "user-dropdown"], [1, "page", "page-enter"], [1, "user-dropdown", 3, "click"], [1, "user-dropdown-head"], [1, "user-dropdown-id"], [1, "user-dropdown-name"], [1, "user-dropdown-email"], [1, "user-dropdown-divider"], ["type", "button", 3, "click"]], template: function SuperAdminLayoutComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "button", 0);
      \u0275\u0275listener("click", function SuperAdminLayoutComponent_Template_button_click_0_listener() {
        return ctx.menuOpen.set(!ctx.menuOpen());
      });
      \u0275\u0275element(1, "app-icon", 1);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(2, "div", 2)(3, "aside", 3)(4, "div", 4)(5, "div", 5)(6, "div", 6);
      \u0275\u0275element(7, "app-icon", 7);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "div", 8)(9, "div", 9);
      \u0275\u0275text(10, "Klogu Bizz");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "div", 10);
      \u0275\u0275element(12, "app-icon", 7);
      \u0275\u0275elementStart(13, "span", 11);
      \u0275\u0275text(14, "Owner Panel");
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementStart(15, "div", 12)(16, "nav", 13);
      \u0275\u0275listener("click", function SuperAdminLayoutComponent_Template_nav_click_16_listener() {
        return ctx.menuOpen.set(false);
      });
      \u0275\u0275elementStart(17, "div", 14);
      \u0275\u0275text(18, "Core Management");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "a", 15)(20, "span", 16);
      \u0275\u0275element(21, "app-icon", 17);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(22, "span", 11);
      \u0275\u0275text(23, "Organizations");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(24, "a", 18)(25, "span", 16);
      \u0275\u0275element(26, "app-icon", 19);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "span", 11);
      \u0275\u0275text(28, "Masters");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(29, "div", 14);
      \u0275\u0275text(30, "Global Settings");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "a", 20)(32, "span", 16);
      \u0275\u0275element(33, "app-icon", 21);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(34, "span", 11);
      \u0275\u0275text(35, "Invoice Templates");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(36, "a", 22)(37, "span", 16);
      \u0275\u0275element(38, "app-icon", 23);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "span", 11);
      \u0275\u0275text(40, "Reminders & Receipts");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(41, "a", 24)(42, "span", 16);
      \u0275\u0275element(43, "app-icon", 25);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(44, "span", 11);
      \u0275\u0275text(45, "Subscription Plans");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(46, "a", 26)(47, "span", 16);
      \u0275\u0275element(48, "app-icon", 27);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "span", 11);
      \u0275\u0275text(50, "Branding & Logo");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(51, "a", 28)(52, "span", 16);
      \u0275\u0275element(53, "app-icon", 29);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(54, "span", 11);
      \u0275\u0275text(55, "Profile & Security");
      \u0275\u0275elementEnd()();
      \u0275\u0275element(56, "div", 30);
      \u0275\u0275elementStart(57, "a", 31)(58, "span", 16);
      \u0275\u0275element(59, "app-icon", 32);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(60, "span", 11);
      \u0275\u0275text(61, "Tenant App");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(62, "div", 33)(63, "div", 34)(64, "div", 35);
      \u0275\u0275element(65, "app-avatar", 36);
      \u0275\u0275elementStart(66, "div", 37)(67, "div", 38);
      \u0275\u0275text(68);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(69, "div", 39);
      \u0275\u0275text(70);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(71, "button", 40);
      \u0275\u0275listener("click", function SuperAdminLayoutComponent_Template_button_click_71_listener() {
        return ctx.auth.logout();
      });
      \u0275\u0275element(72, "app-icon", 41);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(73, "main", 42)(74, "div", 43)(75, "button", 44);
      \u0275\u0275listener("click", function SuperAdminLayoutComponent_Template_button_click_75_listener() {
        return ctx.toggleCollapse();
      });
      \u0275\u0275element(76, "app-icon", 1);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(77, "div", 45)(78, "span", 46);
      \u0275\u0275text(79, "Owner Panel");
      \u0275\u0275elementEnd();
      \u0275\u0275element(80, "app-icon", 47);
      \u0275\u0275elementStart(81, "span", 48);
      \u0275\u0275text(82, "Platform Control");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(83, "app-quick-search", 49);
      \u0275\u0275listener("navigate", function SuperAdminLayoutComponent_Template_app_quick_search_navigate_83_listener($event) {
        return ctx.router.navigateByUrl($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(84, "div", 50)(85, "div", 51);
      \u0275\u0275listener("click", function SuperAdminLayoutComponent_Template_div_click_85_listener($event) {
        return ctx.toggleUserMenu($event);
      });
      \u0275\u0275element(86, "app-avatar", 36);
      \u0275\u0275elementStart(87, "div", 52)(88, "div", 53);
      \u0275\u0275text(89);
      \u0275\u0275elementEnd()();
      \u0275\u0275element(90, "app-icon", 54);
      \u0275\u0275template(91, SuperAdminLayoutComponent_Conditional_91_Template, 12, 5, "div", 55);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(92, "div", 56);
      \u0275\u0275element(93, "router-outlet");
      \u0275\u0275elementEnd()()();
      \u0275\u0275element(94, "app-toasts");
    }
    if (rf & 2) {
      let tmp_6_0;
      let tmp_8_0;
      let tmp_9_0;
      let tmp_16_0;
      let tmp_18_0;
      \u0275\u0275advance();
      \u0275\u0275property("size", 17);
      \u0275\u0275advance();
      \u0275\u0275classProp("sidebar-collapsed", ctx.collapsed());
      \u0275\u0275advance();
      \u0275\u0275classProp("open", ctx.menuOpen())("collapsed", ctx.collapsed());
      \u0275\u0275advance(4);
      \u0275\u0275property("size", 16);
      \u0275\u0275advance(5);
      \u0275\u0275property("size", 9);
      \u0275\u0275advance(53);
      \u0275\u0275property("name", ((tmp_6_0 = ctx.auth.user()) == null ? null : tmp_6_0.name) || "?")("size", 28);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(((tmp_8_0 = ctx.auth.user()) == null ? null : tmp_8_0.name) || "\u2014");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate((tmp_9_0 = ctx.auth.user()) == null ? null : tmp_9_0.email);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(3);
      \u0275\u0275property("title", ctx.collapsed() ? "Expand sidebar" : "Collapse sidebar");
      \u0275\u0275attribute("aria-label", ctx.collapsed() ? "Expand sidebar" : "Collapse sidebar");
      \u0275\u0275advance();
      \u0275\u0275property("size", 17);
      \u0275\u0275advance(4);
      \u0275\u0275property("size", 12);
      \u0275\u0275advance(3);
      \u0275\u0275property("items", ctx.commandItems);
      \u0275\u0275advance(3);
      \u0275\u0275property("name", ((tmp_16_0 = ctx.auth.user()) == null ? null : tmp_16_0.name) || "?")("size", 30);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate((tmp_18_0 = ctx.auth.user()) == null ? null : tmp_18_0.name);
      \u0275\u0275advance();
      \u0275\u0275classProp("open", ctx.userMenuOpen());
      \u0275\u0275property("size", 13);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.userMenuOpen() ? 91 : -1);
    }
  }, dependencies: [RouterLink, RouterLinkActive, RouterOutlet, ToastsComponent, AvatarComponent, IconComponent, QuickSearchComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperAdminLayoutComponent, { className: "SuperAdminLayoutComponent", filePath: "src\\app\\features\\super-admin\\super-admin-layout.component.ts", lineNumber: 113 });
})();
export {
  SuperAdminLayoutComponent
};
//# sourceMappingURL=chunk-NXM3CRSC.js.map
